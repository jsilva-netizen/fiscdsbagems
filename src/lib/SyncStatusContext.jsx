import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useOnlineStatus } from '@/lib/OnlineStatusContext.jsx'
import { supabase } from '@/lib/supabase'
import { getOutboxCount, getLastSync } from '@/lib/offline/syncEngine'

const SyncStatusContext = createContext({ online: true, sessionValid: false, outboxCount: 0, lastSyncAt: undefined, refetchSyncStatus: async () => {} })

export function SyncStatusProvider({ children }) {
  const { online } = useOnlineStatus()
  const [sessionValid, setSessionValid] = useState(false)
  const [outboxCount, setOutboxCount] = useState(0)
  const [lastSyncAt, setLastSyncAt] = useState(undefined)

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

  const value = { online, sessionValid, outboxCount, lastSyncAt, refetchSyncStatus: refresh }
  return <SyncStatusContext.Provider value={value}>{children}</SyncStatusContext.Provider>
}

export function useSyncStatus() {
  return useContext(SyncStatusContext)
}
