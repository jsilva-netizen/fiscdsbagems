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

  const prevOnlineRef = useRef(online)
  const prevOutboxCountRef = useRef(outboxCount)
  const lastSyncAttemptRef = useRef(0)

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

  useEffect(() => {
    if (online && sessionValid && outboxCount > 0) {
      const wentOnline = !prevOnlineRef.current && online
      const countIncreased = outboxCount > prevOutboxCountRef.current
      const nowMs = Date.now()
      const cooldownPassed = nowMs - lastSyncAttemptRef.current > 30000 // 30s cooldown

      if ((wentOnline || countIncreased) && cooldownPassed && !isSyncing) {
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
    }

    prevOnlineRef.current = online
    prevOutboxCountRef.current = outboxCount
  }, [online, outboxCount, sessionValid, isSyncing, refresh])

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
