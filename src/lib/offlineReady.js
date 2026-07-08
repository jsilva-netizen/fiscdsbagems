import { useEffect, useState } from 'react';

// Numa instalação nova, o service worker leva um tempo pra terminar de baixar
// e cachear todos os chunks de página ainda lazy() — se o usuário for a campo
// sem sinal antes disso terminar, uma página não visitada ainda pode falhar ao
// carregar. `ready` começa true sempre que já existe um SW ativo controlando a
// página (visita normal, nada a esperar) — só fica false na janela real de risco
// da primeira instalação, até `markOfflineReady()` ser chamado pelo callback
// `onOfflineReady` do vite-plugin-pwa em main.jsx.
let ready = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
  ? !!navigator.serviceWorker.controller
  : true;

const listeners = new Set();

export function markOfflineReady() {
  if (ready) return;
  ready = true;
  listeners.forEach((fn) => fn());
}

export function isOfflineReady() {
  return ready;
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Timeout de segurança: nunca travar o usuário numa tela em branco esperando
// indefinidamente (erro de registro do SW, navegador sem suporte, conexão que
// nunca termina o precache). Prioriza liberar o app rápido sobre uma garantia
// perfeita.
const FAIL_OPEN_TIMEOUT_MS = 6000;

export function useOfflineReady() {
  const [state, setState] = useState(isOfflineReady);

  useEffect(() => {
    if (state) return undefined;
    const unsubscribe = subscribe(() => setState(true));
    const timer = setTimeout(() => setState(true), FAIL_OPEN_TIMEOUT_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [state]);

  return state;
}
