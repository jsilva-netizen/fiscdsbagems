import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'
import { OnlineStatusProvider } from '@/lib/OnlineStatusContext.jsx'
import { SyncStatusProvider } from '@/lib/SyncStatusContext.jsx'

;(async () => {
  try {
    const persisted = await navigator.storage?.persisted?.()
    if (!persisted && navigator.storage?.persist) {
      await navigator.storage.persist()
    }
  } catch {}
})()

ReactDOM.createRoot(document.getElementById('root')).render(
  <OnlineStatusProvider>
    <SyncStatusProvider>
      <App />
    </SyncStatusProvider>
  </OnlineStatusProvider>
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}

registerSW({ immediate: true })
