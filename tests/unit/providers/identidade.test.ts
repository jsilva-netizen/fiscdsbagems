// T032 parte 1 — identidade.obterSessaoLocal: a sessão guardada no dispositivo, sem ir à
// rede, com a expiração que o motor de sync usa para decidir se renova a credencial.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
const getUser = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: (...a: unknown[]) => getSession(...a), getUser: (...a: unknown[]) => getUser(...a) } },
  supabaseUrl: 'https://exemplo-teste.supabase.co',
  supabaseAnonKey: 'anon-key-de-teste',
}))

import { identidadeProvider } from '@/lib/data/providers/supabase/identidade'

beforeEach(() => {
  getSession.mockReset()
  getUser.mockReset()
})

describe('identidade.obterSessaoLocal', () => {
  it('devolve a sessão com a expiração em segundos, como texto', async () => {
    getSession.mockResolvedValue({
      data: { session: { expires_at: 1790000000, user: { id: 'u1', email: 'f@x.gov.br', role: 'authenticated' } } },
      error: null,
    })
    const r = await identidadeProvider.obterSessaoLocal()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.dado?.expiraEm).toBe('1790000000')
    expect(r.dado?.usuario.id).toBe('u1')
  })

  it('sem sessão devolve null, não erro', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    expect(await identidadeProvider.obterSessaoLocal()).toEqual({ ok: true, dado: null })
  })

  it('erro da biblioteca vira falha classificada', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: { message: 'storage corrompido' } })
    const r = await identidadeProvider.obterSessaoLocal()
    expect(r).toMatchObject({ ok: false, erro: { tipo: 'sem_permissao', mensagem: 'storage corrompido' } })
  })

  it('não vai à rede para validar o usuário', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    await identidadeProvider.obterSessaoLocal()
    expect(getUser).not.toHaveBeenCalled()
  })
})
