// T032 parte 2 — extensões de leitura da categoria Registros usadas pelo sync-down do motor:
// colunas escolhidas, critério "qualquer" (OU) e buscarTodos (todas as páginas).
//
// Referência de comportamento: selectAllPages/safeSelect/safeSelectSince de syncEngine.ts —
// páginas de 1000 via range até uma página incompleta, sem ordenação acrescentada, e erro de
// qualquer página interrompe a leitura (o motor depende do erro para as cascatas de recuo).

import { beforeEach, describe, expect, it, vi } from 'vitest'

type Chamada = { metodo: string; args: unknown[] }
const estado: { linhas: unknown[]; erroNaPagina?: number; chamadas: Chamada[] } = { linhas: [], chamadas: [] }

function criarBuilder(colecao: string) {
  let intervalo: [number, number] | null = null
  const builder: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'or', 'order', 'range']) {
    builder[metodo] = (...args: unknown[]) => {
      estado.chamadas.push({ metodo, args })
      if (metodo === 'range') intervalo = [args[0] as number, args[1] as number]
      return builder
    }
  }
  builder.then = (resolve: (v: unknown) => void) => {
    const [de, ate] = intervalo ?? [0, estado.linhas.length - 1]
    const pagina = Math.floor(de / 1000)
    if (estado.erroNaPagina === pagina) {
      resolve({ data: null, error: { code: '42703', message: `column "x" of relation "${colecao}" does not exist` } })
      return
    }
    resolve({ data: estado.linhas.slice(de, ate + 1), error: null, count: null })
  }
  return builder
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (colecao: string) => {
      estado.chamadas.push({ metodo: 'from', args: [colecao] })
      return criarBuilder(colecao)
    },
  },
}))

import { registrosProvider, __internoParaTeste } from '@/lib/data/providers/supabase/registros'

const linhas = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `r${i}` }))
const metodos = () => estado.chamadas.map((c) => c.metodo)

beforeEach(() => {
  estado.linhas = []
  estado.erroNaPagina = undefined
  estado.chamadas = []
})

describe('critério "qualquer" (OU)', () => {
  it('gera exatamente o filtro OR que o motor usa hoje', () => {
    const builder = criarBuilder('fiscalizacoes')
    __internoParaTeste.aplicarCriterio(builder, {
      op: 'qualquer',
      criterios: [
        { campo: 'updated_at', op: 'maior_ou_igual', valor: '2026-09-01T00:00:00.000Z' },
        { campo: 'created_at', op: 'maior_ou_igual', valor: '2026-09-01T00:00:00.000Z' },
      ],
    })
    expect(estado.chamadas).toEqual([
      { metodo: 'or', args: ['updated_at.gte.2026-09-01T00:00:00.000Z,created_at.gte.2026-09-01T00:00:00.000Z'] },
    ])
  })

  it('traduz os demais comparadores simples', () => {
    const builder = criarBuilder('x')
    __internoParaTeste.aplicarCriterio(builder, {
      op: 'qualquer',
      criterios: [
        { campo: 'a', op: 'igual', valor: 1 },
        { campo: 'b', op: 'diferente', valor: 2 },
        { campo: 'c', op: 'maior', valor: 3 },
        { campo: 'd', op: 'menor', valor: 4 },
        { campo: 'e', op: 'menor_ou_igual', valor: 5 },
      ],
    })
    expect(estado.chamadas[0].args[0]).toBe('a.eq.1,b.neq.2,c.gt.3,d.lt.4,e.lte.5')
  })
})

describe('colunas escolhidas', () => {
  it('buscarMuitos seleciona só as colunas pedidas', async () => {
    estado.linhas = linhas(2)
    await registrosProvider.buscarMuitos('municipios', { colunas: ['id', 'nome'] })
    expect(estado.chamadas.find((c) => c.metodo === 'select')?.args[0]).toBe('id,nome')
  })

  it('sem colunas, seleciona tudo', async () => {
    await registrosProvider.buscarMuitos('municipios')
    expect(estado.chamadas.find((c) => c.metodo === 'select')?.args[0]).toBe('*')
  })
})

describe('buscarTodos', () => {
  it('lê de 1000 em 1000 até uma página incompleta', async () => {
    estado.linhas = linhas(2500)
    const r = await registrosProvider.buscarTodos<{ id: string }>('respostas_checklist')
    expect(r.ok && r.dado.length).toBe(2500)
    expect(estado.chamadas.filter((c) => c.metodo === 'range').map((c) => c.args)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('página exatamente cheia pede mais uma, que volta vazia', async () => {
    estado.linhas = linhas(1000)
    const r = await registrosProvider.buscarTodos('respostas_checklist')
    expect(r.ok && r.dado.length).toBe(1000)
    expect(estado.chamadas.filter((c) => c.metodo === 'range')).toHaveLength(2)
  })

  it('não acrescenta ordenação', async () => {
    estado.linhas = linhas(3)
    await registrosProvider.buscarTodos('respostas_checklist')
    expect(metodos()).not.toContain('order')
  })

  it('aplica colunas e critérios', async () => {
    estado.linhas = linhas(1)
    await registrosProvider.buscarTodos('municipios', {
      colunas: ['id', 'nome'],
      criterios: [{ campo: 'updated_at', op: 'maior_ou_igual', valor: 'T' }],
    })
    expect(estado.chamadas.slice(0, 3)).toEqual([
      { metodo: 'from', args: ['municipios'] },
      { metodo: 'select', args: ['id,nome'] },
      { metodo: 'gte', args: ['updated_at', 'T'] },
    ])
  })

  it('erro em qualquer página interrompe e preserva o erro bruto em origem', async () => {
    estado.linhas = linhas(2500)
    estado.erroNaPagina = 1
    const r = await registrosProvider.buscarTodos('municipios')
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.erro.origem).toMatchObject({ code: '42703' })
    expect(estado.chamadas.filter((c) => c.metodo === 'range')).toHaveLength(2)
  })
})
