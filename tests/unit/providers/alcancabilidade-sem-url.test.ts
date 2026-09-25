// T032 parte 1 — sem URL do backend configurada, a sondagem responde "inalcançável" sem
// fazer requisição, como faziam os dois consumidores originais (useOnline.js e o motor de
// sync). Arquivo separado porque o mock do módulo do cliente é por arquivo.

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {}, supabaseUrl: '', supabaseAnonKey: '' }))

import { alcancabilidadeProvider } from '@/lib/data/providers/supabase/alcancabilidade'

afterEach(() => vi.unstubAllGlobals())

describe('alcancabilidade.verificar sem URL configurada', () => {
  it('responde inalcançável sem sondar', async () => {
    const fetchEspiao = vi.fn(async () => new Response('ok'))
    vi.stubGlobal('fetch', fetchEspiao)
    expect(await alcancabilidadeProvider.verificar(8000)).toBe(false)
    expect(fetchEspiao).not.toHaveBeenCalled()
  })
})
