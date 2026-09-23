import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react'
import { useOnlineStatus } from '@/lib/OnlineStatusContext.jsx'
import { supabase } from '@/lib/supabase'
import { getOutboxCount, getLastSync, runFullSync } from '@/lib/offline/syncEngine'

const SyncStatusContext = createContext({
  online: true,
  sessionValid: false,
  outboxCount: 0,
  lastSyncAt: undefined,
  isSyncing: false,
  syncProgress: '',
  syncError: null,
  refetchSyncStatus: async () => {}
})

export function SyncStatusProvider({ children }) {
  const { online } = useOnlineStatus()
  const [sessionValid, setSessionValid] = useState(false)
  const [outboxCount, setOutboxCount] = useState(0)
  const [lastSyncAt, setLastSyncAt] = useState(undefined)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState('')
  const [syncError, setSyncError] = useState(null)

  const prevSessionValidRef = useRef(sessionValid)
  const lastSyncAttemptRef = useRef(0)
  // Força reavaliação periódica do gatilho de sync abaixo mesmo quando nenhum outro estado
  // muda — sem isto, uma vez que o cooldown de 30s barra uma tentativa, ele nunca é
  // reconferido (o efeito só roda em resposta a mudança de dependência) e a fila fica presa
  // até o usuário abrir uma tela com SyncBar e forçar manualmente (achado ao rodar T026
  // localmente, 2026-09-23; ver debitos-tecnicos-e-inconsistencias.md).
  const [autoSyncTick, setAutoSyncTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setAutoSyncTick((t) => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let unsub = null
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionValid(!!session?.user)
    })
    const sub = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionValid(!!session?.user)
    })
    unsub = sub?.data?.subscription
    return () => {
      unsub?.unsubscribe?.()
    }
  }, [])

  const refresh = useMemo(() => {
    return async () => {
      const c = await getOutboxCount()
      const s = await getLastSync()
      setOutboxCount(c || 0)
      setLastSyncAt(s?.lastSyncAt)
    }
  }, [])

  useEffect(() => {
    let timer = null
    refresh()
    timer = setInterval(refresh, 4000)
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [refresh])

  // Efeito para sincronizar automaticamente quando o usuário logar (sessionValid se torna true)
  useEffect(() => {
    const justLoggedIn = !prevSessionValidRef.current && sessionValid
    const nowMs = Date.now()
    const cooldownPassed = nowMs - lastSyncAttemptRef.current > 30000 // 30s cooldown

    if (justLoggedIn && online && !isSyncing && cooldownPassed) {
      lastSyncAttemptRef.current = nowMs
      setIsSyncing(true)
      setSyncProgress('Sincronizando dados...')
      setSyncError(null)

      runFullSync((msg, isError) => {
        setSyncProgress(msg)
        if (isError) {
          console.error('[Login Auto Sync Error]', msg)
        }
      })
        .then((res) => {
          setOutboxCount(res.outbox || 0)
          if (res.lastSyncAt) setLastSyncAt(res.lastSyncAt)
          setSyncProgress('')
        })
        .catch((err) => {
          console.error('[Login Auto Sync Failed]', err)
          setSyncError(err?.message || 'Falha na sincronização inicial')
          setSyncProgress('')
        })
        .finally(() => {
          setIsSyncing(false)
          refresh()
        })
    }
    prevSessionValidRef.current = sessionValid
  }, [sessionValid, online, isSyncing, refresh])

  // Sincroniza sempre que houver trabalho pendente, sessão válida, rede disponível e o
  // cooldown já tiver passado — sem depender de detectar a "borda" de transição
  // offline->online ou de aumento de contagem. A versão anterior (baseada em bordas) perdia
  // o disparo quando `online` virava true no mesmo render em que `outboxCount` ainda estava
  // desatualizado (o polling de refresh() roda a cada 4s, independente); uma vez perdida a
  // borda, o cooldown compartilhado com o sync de login podia bloquear a única outra
  // tentativa, e nada disparava de novo depois (achado ao rodar T026 localmente,
  // 2026-09-23; ver debitos-tecnicos-e-inconsistencias.md). Checar a condição diretamente
  // (sem borda) e reavaliar a cada `autoSyncTick` fecha os dois problemas de uma vez.
  useEffect(() => {
    const nowMs = Date.now()
    const cooldownPassed = nowMs - lastSyncAttemptRef.current > 30000 // 30s cooldown

    if (online && sessionValid && outboxCount > 0 && cooldownPassed && !isSyncing) {
      lastSyncAttemptRef.current = nowMs
      setIsSyncing(true)
      setSyncProgress('Sincronizando em segundo plano...')
      setSyncError(null)

      runFullSync((msg, isError) => {
        setSyncProgress(msg)
        if (isError) {
          console.error('[Auto Sync Error]', msg)
        }
      })
        .then((res) => {
          setOutboxCount(res.outbox || 0)
          if (res.lastSyncAt) setLastSyncAt(res.lastSyncAt)
          setSyncProgress('')
        })
        .catch((err) => {
          console.error('[Auto Sync Failed]', err)
          setSyncError(err?.message || 'Falha na sincronização automática')
          setSyncProgress('')
        })
        .finally(() => {
          setIsSyncing(false)
          refresh()
        })
    }
  }, [online, outboxCount, sessionValid, isSyncing, refresh, autoSyncTick])

  const value = {
    online,
    sessionValid,
    outboxCount,
    lastSyncAt,
    isSyncing,
    syncProgress,
    syncError,
    refetchSyncStatus: refresh
  }
  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>
}

export function useSyncStatus() {
  return useContext(SyncStatusContext)
}
