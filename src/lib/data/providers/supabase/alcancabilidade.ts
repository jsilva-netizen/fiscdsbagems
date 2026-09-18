// Categoria Alcançabilidade (contracts/provider.md #7) — implementação Supabase.
//
// Consolida as duas implementações hoje divergentes (inventario-acoplamento.md, lote 1 e
// 3a): src/hooks/useOnline.js (a máquina de estado completa — debounce, polling, histerese
// — é a que a UI usa e vira a referência de comportamento desta implementação) e
// src/lib/offline/syncEngine.ts ("reachability", checagem pontual com timeout 8000ms).
//
// Regras preservadas exatamente (contracts/provider.md #7, FR-021):
//   - qualquer resposta HTTP conta como "alcançável" — inclusive erro 4xx/5xx;
//   - debounce de 1500ms após mudança de navigator.onLine antes de checar;
//   - polling a cada 5000ms, suspenso quando navigator.onLine é falso;
//   - histerese: só declara indisponível após 2 falhas consecutivas de sondagem;
//   - resultado final = navigator.onLine && alcançável (não apenas alcançável).

import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase'
import type { AlcancabilidadeProvider } from '../../contract'

const TIMEOUT_PADRAO_MS = 6000 // valor de referência: o que useOnline.js usa hoje
const DEBOUNCE_MS = 1500
const INTERVALO_POLLING_MS = 5000
const FALHAS_PARA_HISTERESE = 2

function endpointsDeSaude(): string[] {
  const apikeyParam = supabaseAnonKey
    ? `?apikey=${encodeURIComponent(String(supabaseAnonKey))}`
    : ''
  return [`${supabaseUrl}/auth/v1/health${apikeyParam}`, `${supabaseUrl}/rest/v1/${apikeyParam}`]
}

async function sondar(timeoutMs: number): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      for (const url of endpointsDeSaude()) {
        try {
          const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl.signal })
          return !!res // qualquer resposta conta — comportamento preservado, não corrigido
        } catch {
          // tenta o próximo endpoint
        }
      }
      return false
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return false
  }
}

// --- Máquina de estado contínua (equivalente a useOnline.js) ---------------------------

type EstadoAlcancabilidade = {
  navigatorOnline: boolean
  alcancavel: boolean
  falhasConsecutivas: number
}

const estado: EstadoAlcancabilidade = {
  navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  alcancavel: true,
  falhasConsecutivas: 0,
}

const ouvintes = new Set<(alcancavel: boolean) => void>()
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pollingTimer: ReturnType<typeof setInterval> | null = null
let maquinaIniciada = false

function online(): boolean {
  return estado.navigatorOnline && estado.alcancavel
}

function notificarSeMudou(anterior: boolean) {
  const atual = online()
  if (atual !== anterior) {
    for (const ouvinte of ouvintes) ouvinte(atual)
  }
}

async function checar() {
  const anterior = online()
  if (!estado.navigatorOnline) {
    estado.falhasConsecutivas = 0
    estado.alcancavel = false
    notificarSeMudou(anterior)
    return
  }
  const ok = await sondar(TIMEOUT_PADRAO_MS)
  if (ok) {
    estado.falhasConsecutivas = 0
    estado.alcancavel = true
  } else {
    estado.falhasConsecutivas += 1
    if (estado.falhasConsecutivas >= FALHAS_PARA_HISTERESE) estado.alcancavel = false
  }
  notificarSeMudou(anterior)
}

function reiniciarPolling() {
  if (pollingTimer) clearInterval(pollingTimer)
  if (!estado.navigatorOnline) {
    pollingTimer = null
    return
  }
  pollingTimer = setInterval(checar, INTERVALO_POLLING_MS)
}

function agendarChecagemComDebounce() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(checar, DEBOUNCE_MS)
}

function iniciarMaquinaSeNecessario() {
  if (maquinaIniciada || typeof window === 'undefined') return
  maquinaIniciada = true

  window.addEventListener('online', () => {
    estado.navigatorOnline = true
    agendarChecagemComDebounce()
    reiniciarPolling()
  })
  window.addEventListener('offline', () => {
    estado.navigatorOnline = false
    agendarChecagemComDebounce()
    reiniciarPolling()
  })

  agendarChecagemComDebounce()
  reiniciarPolling()
}

// --- Contrato exposto --------------------------------------------------------------------

export const alcancabilidadeProvider: AlcancabilidadeProvider = {
  verificar: (timeoutMs: number = TIMEOUT_PADRAO_MS) => sondar(timeoutMs),
  observar(ouvinte) {
    iniciarMaquinaSeNecessario()
    ouvintes.add(ouvinte)
    return () => ouvintes.delete(ouvinte)
  },
}

/** Só para teste (T023) — acesso direto ao estado sem passar pela assinatura pública. */
export const __internoParaTeste = { estado, checar, sondar, DEBOUNCE_MS, INTERVALO_POLLING_MS, FALHAS_PARA_HISTERESE }
