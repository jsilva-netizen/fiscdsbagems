import { useEffect, useMemo, useRef, useState } from 'react'

const headReachable = async () => {
  try {
    const base = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!base) return false
    const url = `${base}/auth/v1/health`
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(url, { method: 'GET', cache: 'no-store', headers: key ? { apikey: key } : {}, signal: ctrl.signal })
    clearTimeout(t)
    return !!res && res.ok
  } catch {
    return false
  }
}

export function useOnline(debounceMs = 1500, intervalMs = 5000) {
  const [navigatorOnline, setNavigatorOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [reachable, setReachable] = useState(true)
  const [checking, setChecking] = useState(false)
  const [lastCheckAt, setLastCheckAt] = useState(null)
  const timer = useRef(null)
  const poller = useRef(null)

  const doCheck = useMemo(() => {
    return async () => {
      setChecking(true)
      if (!navigatorOnline) {
        setReachable(false)
        setChecking(false)
        setLastCheckAt(Date.now())
        return
      }
      const ok = await headReachable()
      setReachable(ok)
      setChecking(false)
      setLastCheckAt(Date.now())
    }
  }, [navigatorOnline])

  useEffect(() => {
    const onOnline = () => setNavigatorOnline(true)
    const onOffline = () => setNavigatorOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      doCheck()
    }, debounceMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [navigatorOnline, debounceMs, doCheck])

  useEffect(() => {
    if (!navigatorOnline) {
      if (poller.current) clearInterval(poller.current)
      return
    }
    poller.current = setInterval(() => {
      doCheck()
    }, intervalMs)
    return () => {
      if (poller.current) clearInterval(poller.current)
    }
  }, [intervalMs, doCheck, navigatorOnline])

  const online = navigatorOnline && reachable
  return { online, navigatorOnline, reachable, checking, lastCheckAt }
}
