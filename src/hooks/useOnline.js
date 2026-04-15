import { useEffect, useMemo, useRef, useState } from 'react'

const headReachable = async () => {
  try {
    const base = import.meta.env.VITE_SUPABASE_URL
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!base) return false
    const apikeyParam = key ? `?apikey=${encodeURIComponent(String(key))}` : ''
    const urls = [`${base}/auth/v1/health${apikeyParam}`, `${base}/rest/v1/${apikeyParam}`]
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    for (const url of urls) {
      try {
        const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl.signal })
        clearTimeout(t)
        return !!res
      } catch {
      }
    }
    clearTimeout(t)
    return false
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
  const failStreak = useRef(0)

  const doCheck = useMemo(() => {
    return async () => {
      setChecking(true)
      if (!navigatorOnline) {
        failStreak.current = 0
        setReachable(false)
        setChecking(false)
        setLastCheckAt(Date.now())
        return
      }
      const ok = await headReachable()
      if (ok) {
        failStreak.current = 0
        setReachable(true)
      } else {
        failStreak.current = (failStreak.current || 0) + 1
        if (failStreak.current >= 2) setReachable(false)
      }
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
