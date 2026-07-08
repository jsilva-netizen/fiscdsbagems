import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { registerSW } from 'virtual:pwa-register'
import { OnlineStatusProvider } from '@/lib/OnlineStatusContext.jsx'
import { SyncStatusProvider } from '@/lib/SyncStatusContext.jsx'
import { markOfflineReady } from '@/lib/offlineReady'

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

let swRegistration = null

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    swRegistration = registration
  },
  onNeedRefresh() {
    updateSW(true)
  },
  onOfflineReady() {
    markOfflineReady()
  },
  onRegisterError() {
    // Falhou ao registrar o SW — não faz sentido bloquear o app por isso.
    markOfflineReady()
  }
})

// registerSW só checa por uma versão nova uma vez, no carregamento inicial. Sem isso,
// uma aba deixada aberta (ou só minimizada/restaurada — "fechar e abrir") podia nunca
// perceber um novo deploy até um reload manual. registration.update() força o navegador
// a reconsultar o service worker; quando há versão nova, onNeedRefresh (acima) já
// aplica e recarrega sozinho — aqui só adiantamos a checagem, não mudamos como aplica.
const checkForAppUpdate = () => { swRegistration?.update().catch(() => {}) }

setInterval(checkForAppUpdate, 60 * 60 * 1000)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForAppUpdate()
})
window.addEventListener('focus', checkForAppUpdate)
