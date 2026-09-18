// T023 — cobre a tradução de Filtro→PostgREST e o mapeamento de erro Supabase→Erro neutro
// implementados em src/lib/data/providers/supabase/registros.ts (contracts/provider.md #1).

import { describe, expect, it } from 'vitest'
import { __internoParaTeste } from '@/lib/data/providers/supabase/registros'

const { mapearErro, aplicarCriterio, aplicarFiltro } = __internoParaTeste

// Espião mínimo do query builder do PostgREST: cada método registra a chamada e retorna
// `this`, exatamente como o builder real permite encadeamento.
function criarQuerySpy() {
  const chamadas: { metodo: string; args: unknown[] }[] = []
  const query: Record<string, (...args: unknown[]) => unknown> = {}
  for (const metodo of ['eq', 'neq', 'in', 'not', 'gt', 'gte', 'lt', 'lte', 'ilike', 'order', 'range']) {
    query[metodo] = (...args: unknown[]) => {
      chamadas.push({ metodo, args })
      return query
    }
  }
  return { query, chamadas }
}

describe('aplicarCriterio', () => {
  it('traduz igualdade para .eq', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarCriterio(query, { campo: 'status', op: 'igual', valor: 'ativo' })
    expect(chamadas).toEqual([{ metodo: 'eq', args: ['status', 'ativo'] }])
  })

  it('traduz diferença para .neq', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarCriterio(query, { campo: 'status', op: 'diferente', valor: 'ativo' })
    expect(chamadas).toEqual([{ metodo: 'neq', args: ['status', 'ativo'] }])
  })

  it('traduz pertencimento para .in', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarCriterio(query, { campo: 'id', op: 'em', valores: [1, 2, 3] })
    expect(chamadas).toEqual([{ metodo: 'in', args: ['id', [1, 2, 3]] }])
  })

  it('traduz não-pertencimento para .not(in)', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarCriterio(query, { campo: 'id', op: 'nao_em', valores: [1, 2] })
    expect(chamadas).toEqual([{ metodo: 'not', args: ['id', 'in', '(1,2)'] }])
  })

  it.each([
    ['maior', 'gt'],
    ['maior_ou_igual', 'gte'],
    ['menor', 'lt'],
    ['menor_ou_igual', 'lte'],
  ] as const)('traduz intervalo %s para .%s', (op, metodoEsperado) => {
    const { query, chamadas } = criarQuerySpy()
    aplicarCriterio(query, { campo: 'data', op, valor: '2026-01-01' })
    expect(chamadas).toEqual([{ metodo: metodoEsperado, args: ['data', '2026-01-01'] }])
  })

  it('traduz busca textual para .ilike com curingas', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarCriterio(query, { campo: 'nome', op: 'contem_texto', valor: 'agua' })
    expect(chamadas).toEqual([{ metodo: 'ilike', args: ['nome', '%agua%'] }])
  })
})

describe('aplicarFiltro', () => {
  it('retorna a query inalterada quando não há filtro', () => {
    const { query, chamadas } = criarQuerySpy()
    expect(aplicarFiltro(query)).toBe(query)
    expect(chamadas).toHaveLength(0)
  })

  it('aplica critérios na ordem de entrada (ordenação determinística)', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarFiltro(query, {
      criterios: [
        { campo: 'status', op: 'igual', valor: 'ativo' },
        { campo: 'prioridade', op: 'maior', valor: 1 },
      ],
    })
    expect(chamadas.map((c) => c.metodo)).toEqual(['eq', 'gt'])
  })

  it('aplica ordenação traduzindo asc/desc para ascending boolean', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarFiltro(query, {
      ordenacao: [
        { campo: 'criado_em', direcao: 'desc' },
        { campo: 'nome', direcao: 'asc' },
      ],
    })
    expect(chamadas).toEqual([
      { metodo: 'order', args: ['criado_em', { ascending: false }] },
      { metodo: 'order', args: ['nome', { ascending: true }] },
    ])
  })

  it('aplica paginação via .range a partir de limite e deslocamento', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarFiltro(query, { limite: 20, deslocamento: 40 })
    expect(chamadas).toEqual([{ metodo: 'range', args: [40, 59] }])
  })

  it('assume deslocamento zero quando omitido', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarFiltro(query, { limite: 10 })
    expect(chamadas).toEqual([{ metodo: 'range', args: [0, 9] }])
  })

  it('combina critérios, ordenação e paginação na ordem: critérios, ordenação, paginação', () => {
    const { query, chamadas } = criarQuerySpy()
    aplicarFiltro(query, {
      criterios: [{ campo: 'status', op: 'igual', valor: 'ativo' }],
      ordenacao: [{ campo: 'nome', direcao: 'asc' }],
      limite: 5,
    })
    expect(chamadas.map((c) => c.metodo)).toEqual(['eq', 'order', 'range'])
  })
})

describe('mapearErro', () => {
  it('mapeia PGRST116 (PostgREST not found) para nao_encontrado', () => {
    expect(mapearErro({ code: 'PGRST116' }).tipo).toBe('nao_encontrado')
  })

  it('mapeia status 404 para nao_encontrado', () => {
    expect(mapearErro({ status: 404 }).tipo).toBe('nao_encontrado')
  })

  it('mapeia status 401 para sem_permissao', () => {
    expect(mapearErro({ status: 401 }).tipo).toBe('sem_permissao')
  })

  it('mapeia status 403 para sem_permissao', () => {
    expect(mapearErro({ status: 403 }).tipo).toBe('sem_permissao')
  })

  it('mapeia código Postgres 42501 (RLS) para sem_permissao', () => {
    expect(mapearErro({ code: '42501' }).tipo).toBe('sem_permissao')
  })

  it('mapeia violação de unicidade (23505) para conflito', () => {
    expect(mapearErro({ code: '23505' }).tipo).toBe('conflito')
  })

  it.each(['23503', '23502', '22P02'])('mapeia código Postgres %s para invalido', (code) => {
    expect(mapearErro({ code }).tipo).toBe('invalido')
  })

  it('mapeia status >= 500 para falha_servidor', () => {
    expect(mapearErro({ status: 500 }).tipo).toBe('falha_servidor')
    expect(mapearErro({ status: 503 }).tipo).toBe('falha_servidor')
  })

  it('mapeia mensagens de rede/timeout para rede_indisponivel', () => {
    expect(mapearErro({ message: 'Failed to fetch' }).tipo).toBe('rede_indisponivel')
    expect(mapearErro({ message: 'Network error' }).tipo).toBe('rede_indisponivel')
    expect(mapearErro({ message: 'Request timeout' }).tipo).toBe('rede_indisponivel')
  })

  it('usa falha_servidor como fallback para erro não classificado', () => {
    const erro = mapearErro({ message: 'algo inesperado' })
    expect(erro.tipo).toBe('falha_servidor')
    expect(erro.mensagem).toBe('algo inesperado')
  })

  it('preserva o erro original em `origem` para diagnóstico', () => {
    const original = { code: '23505', message: 'duplicate key' }
    expect(mapearErro(original).origem).toBe(original)
  })

  it('nunca vaza a mensagem bruta do provedor nos casos classificados (FR-004)', () => {
    const erro = mapearErro({ code: '23505', message: 'duplicate key value violates unique constraint "fiscalizacoes_pkey"' })
    expect(erro.mensagem).not.toContain('constraint')
  })
})
