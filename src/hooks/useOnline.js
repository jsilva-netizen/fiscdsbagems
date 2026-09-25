import { useEffect, useMemo, useRef, useState } from 'react'
import { getProvider } from '@/lib/data'

// Sondagem do backend pela camada de dados (T031). Só a sondagem saiu daqui: debounce,
// polling e histerese abaixo continuam sendo os deste hook, com os parâmetros de cada
// chamada. Timeout de 6000ms = padrão de alcancabilidade.verificar().
const headReachable = () => getProvider().alcancabilidade.verificar()

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
