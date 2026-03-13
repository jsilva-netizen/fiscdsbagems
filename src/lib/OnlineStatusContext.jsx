import React, { createContext, useContext } from 'react'
import { useOnline } from '@/hooks/useOnline'

const OnlineStatusContext = createContext({ online: true })

export function OnlineStatusProvider({ children }) {
  const value = useOnline()
  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  )
}

export function useOnlineStatus() {
  return useContext(OnlineStatusContext)
}
