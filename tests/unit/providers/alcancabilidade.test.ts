// T023 — cobre a preservação exata dos tempos e da histerese da categoria Alcançabilidade
// (src/lib/data/providers/supabase/alcancabilidade.ts), referência de comportamento:
// src/hooks/useOnline.js (debounce 1500ms, polling 5000ms, histerese de 2 falhas, FR-021).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Evita subir um client Supabase real (createClient lança sem URL/chave válidas) — a
// categoria só usa supabaseUrl/supabaseAnonKey para montar os endpoints de sondagem.
vi.mock('@/lib/supabase', () => ({
  supabase: {},
  supabaseUrl: 'https://exemplo-teste.supabase.co',
  supabaseAnonKey: 'anon-key-de-teste',
}))

// Estado do módulo (debounce/polling/máquina iniciada) é module-level — cada teste precisa
// de uma instância fresca para não herdar histerese/timers de um teste anterior.
async function carregarModuloFresco() {
  vi.resetModules()
  return import('@/lib/data/providers/supabase/alcancabilidade')
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('constantes de tempo (preservação de useOnline.js)', () => {
  it('mantém debounce 1500ms, polling 5000ms e histerese de 2 falhas', async () => {
    const { __internoParaTeste } = await carregarModuloFresco()
    expect(__internoParaTeste.DEBOUNCE_MS).toBe(1500)
    expect(__internoParaTeste.INTERVALO_POLLING_MS).toBe(5000)
    expect(__internoParaTeste.FALHAS_PARA_HISTERESE).toBe(2)
  })
})

describe('sondar — qualquer resposta HTTP conta como alcançável (FR-021)', () => {
  it('retorna true mesmo para status de erro (4xx/5xx) — não corrige o comportamento atual', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 500 }))
    const { __internoParaTeste } = await carregarModuloFresco()
    await expect(__internoParaTeste.sondar(1000)).resolves.toBe(true)
  })

  it('retorna false quando todos os endpoints falham (erro de rede)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')))
    const { __internoParaTeste } = await carregarModuloFresco()
    await expect(__internoParaTeste.sondar(1000)).resolves.toBe(false)
  })

  it('tenta o próximo endpoint quando o primeiro lança', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('primeiro endpoint falhou'))
      .mockResolvedValueOnce({ status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    const { __internoParaTeste } = await carregarModuloFresco()
    await expect(__internoParaTeste.sondar(1000)).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('checar — histerese de 2 falhas consecutivas', () => {
  it('uma única falha de sondagem não derruba alcancavel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('falhou')))
    const { __internoParaTeste } = await carregarModuloFresco()
    __internoParaTeste.estado.navigatorOnline = true
    __internoParaTeste.estado.alcancavel = true
    __internoParaTeste.estado.falhasConsecutivas = 0

    await __internoParaTeste.checar()

    expect(__internoParaTeste.estado.falhasConsecutivas).toBe(1)
    expect(__internoParaTeste.estado.alcancavel).toBe(true)
  })

  it('a segunda falha consecutiva derruba alcancavel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('falhou')))
    const { __internoParaTeste } = await carregarModuloFresco()
    __internoParaTeste.estado.navigatorOnline = true
    __internoParaTeste.estado.alcancavel = true
    __internoParaTeste.estado.falhasConsecutivas = 1

    await __internoParaTeste.checar()

    expect(__internoParaTeste.estado.falhasConsecutivas).toBe(2)
    expect(__internoParaTeste.estado.alcancavel).toBe(false)
  })

  it('uma sondagem bem-sucedida zera o contador de falhas e restaura alcancavel', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))
    const { __internoParaTeste } = await carregarModuloFresco()
    __internoParaTeste.estado.navigatorOnline = true
    __internoParaTeste.estado.alcancavel = false
    __internoParaTeste.estado.falhasConsecutivas = 2

    await __internoParaTeste.checar()

    expect(__internoParaTeste.estado.falhasConsecutivas).toBe(0)
    expect(__internoParaTeste.estado.alcancavel).toBe(true)
  })

  it('navigator.onLine falso declara indisponível de imediato, sem sondar', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { __internoParaTeste } = await carregarModuloFresco()
    __internoParaTeste.estado.navigatorOnline = false
    __internoParaTeste.estado.alcancavel = true
    __internoParaTeste.estado.falhasConsecutivas = 0

    await __internoParaTeste.checar()

    expect(__internoParaTeste.estado.alcancavel).toBe(false)
    expect(__internoParaTeste.estado.falhasConsecutivas).toBe(0)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('resultado final = navigator.onLine && alcançável', () => {
  it('observar() notifica os ouvintes só quando o resultado combinado muda', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('falhou')))
    const { alcancabilidadeProvider, __internoParaTeste } = await carregarModuloFresco()
    __internoParaTeste.estado.navigatorOnline = true
    __internoParaTeste.estado.alcancavel = true
    __internoParaTeste.estado.falhasConsecutivas = 0

    const ouvinte = vi.fn()
    const cancelar = alcancabilidadeProvider.observar(ouvinte)

    await __internoParaTeste.checar() // 1ª falha: falhasConsecutivas=1, ainda alcançável — sem notificação
    expect(ouvinte).not.toHaveBeenCalled()

    await __internoParaTeste.checar() // 2ª falha: derruba alcancavel — notifica uma vez, com false
    expect(ouvinte).toHaveBeenCalledTimes(1)
    expect(ouvinte).toHaveBeenLastCalledWith(false)

    cancelar()
  })

  it('para de notificar após cancelar a observação', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('falhou')))
    const { alcancabilidadeProvider, __internoParaTeste } = await carregarModuloFresco()
    __internoParaTeste.estado.navigatorOnline = true
    __internoParaTeste.estado.alcancavel = true
    __internoParaTeste.estado.falhasConsecutivas = 1 // uma falha de distância da histerese

    const ouvinte = vi.fn()
    const cancelar = alcancabilidadeProvider.observar(ouvinte)
    cancelar()

    await __internoParaTeste.checar() // completaria a histerese, mas o ouvinte já foi removido
    expect(ouvinte).not.toHaveBeenCalled()
  })
})

describe('verificar — timeout configurável por chamador (contracts/provider.md #7)', () => {
  it('usa o timeout padrão de referência quando nenhum é informado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200 })
    vi.stubGlobal('fetch', fetchMock)
    const { alcancabilidadeProvider } = await carregarModuloFresco()

    await expect(alcancabilidadeProvider.verificar()).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalled()
  })

  it('aceita timeout explícito (ex.: 8000ms do motor de sync) sem alterar o resultado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))
    const { alcancabilidadeProvider } = await carregarModuloFresco()

    await expect(alcancabilidadeProvider.verificar(8000)).resolves.toBe(true)
  })
})
