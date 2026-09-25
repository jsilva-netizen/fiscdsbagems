// T030 — domínio `fiscalizacoes`: leitura e criação sobre a categoria Registros.
//
// Cada operação tem de pedir ao provedor exatamente a consulta que o código atual faz
// (coleção, filtro, ordem, limite) — é isso que garante paridade quando os consumidores
// migrarem (T032-T034). O provedor é substituído por um falso que registra as chamadas.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { __setProviderForTests, getProvider } from '@/lib/data/provider'
import type { DataProvider } from '@/lib/data/contract'
import type { Filtro, Resultado } from '@/lib/data/types'
import { sucesso, falha } from '@/lib/data/types'
import { fiscalizacoesDomain } from '@/lib/data/domains/fiscalizacoes'

type Chamada = { operacao: string; args: unknown[] }

function criarProvedorFalso(respostas: Partial<Record<string, Resultado<unknown>>> = {}) {
  const chamadas: Chamada[] = []
  const responder = (operacao: string, padrao: Resultado<unknown>) => (...args: unknown[]) => {
    chamadas.push({ operacao, args })
    return Promise.resolve(respostas[operacao] ?? padrao)
  }
  const registros = {
    buscarMuitos: responder('buscarMuitos', sucesso({ itens: [] })),
    buscarUm: responder('buscarUm', sucesso({ id: 'x' })),
    criar: responder('criar', sucesso({ id: 'novo' })),
    atualizar: responder('atualizar', sucesso({})),
    remover: responder('remover', sucesso(undefined)),
    criarOuAtualizarEmLote: responder('criarOuAtualizarEmLote', sucesso([])),
    buscarHistoricoAlteracoes: responder('buscarHistoricoAlteracoes', sucesso({ itens: [] })),
  }
  return { provedor: { registros } as unknown as DataProvider, chamadas }
}

const provedorOriginal = getProvider()
afterEach(() => __setProviderForTests(provedorOriginal))

describe('fiscalizacoesDomain.listar', () => {
  let chamadas: Chamada[]
  beforeEach(() => {
    const falso = criarProvedorFalso({ buscarMuitos: sucesso({ itens: [{ id: 'f1' }, { id: 'f2' }] }) })
    chamadas = falso.chamadas
    __setProviderForTests(falso.provedor)
  })

  it('filtra por câmara técnica, mais recentes primeiro, até 500 (Fiscalizacoes.jsx)', async () => {
    const r = await fiscalizacoesDomain.listar({ camaraTecnicaId: 'ct-1' })
    expect(r).toEqual(sucesso([{ id: 'f1' }, { id: 'f2' }]))
    expect(chamadas).toEqual([
      {
        operacao: 'buscarMuitos',
        args: [
          'fiscalizacoes',
          {
            criterios: [{ campo: 'camara_tecnica_id', op: 'igual', valor: 'ct-1' }],
            ordenacao: [{ campo: 'data_inicio', direcao: 'desc' }],
            limite: 500,
          } satisfies Filtro,
        ],
      },
    ])
  })

  it('aceita outro limite', async () => {
    await fiscalizacoesDomain.listar({ camaraTecnicaId: 'ct-1', limite: 50 })
    expect((chamadas[0].args[1] as Filtro).limite).toBe(50)
  })

  it('propaga a falha do provedor sem reinterpretar', async () => {
    const erro = { tipo: 'sem_permissao' as const, mensagem: 'Você não tem permissão para esta operação.' }
    __setProviderForTests(criarProvedorFalso({ buscarMuitos: falha(erro) }).provedor)
    expect(await fiscalizacoesDomain.listar({ camaraTecnicaId: 'ct-1' })).toEqual(falha(erro))
  })
})

describe('fiscalizacoesDomain.obterPorId', () => {
  it('lê a fiscalização pelo id', async () => {
    const falso = criarProvedorFalso({ buscarUm: sucesso({ id: 'f1', status: 'em_andamento' }) })
    __setProviderForTests(falso.provedor)
    expect(await fiscalizacoesDomain.obterPorId('f1')).toEqual(sucesso({ id: 'f1', status: 'em_andamento' }))
    expect(falso.chamadas).toEqual([{ operacao: 'buscarUm', args: ['fiscalizacoes', 'f1'] }])
  })

  it('inexistente é sucesso com null, não erro (syncEngine usa maybeSingle e segue)', async () => {
    const falso = criarProvedorFalso({ buscarUm: falha({ tipo: 'nao_encontrado', mensagem: 'Registro não encontrado.' }) })
    __setProviderForTests(falso.provedor)
    expect(await fiscalizacoesDomain.obterPorId('sumiu')).toEqual(sucesso(null))
  })

  it('outras falhas continuam sendo falha', async () => {
    const erro = { tipo: 'rede_indisponivel' as const, mensagem: 'Sem conexão com o servidor.' }
    __setProviderForTests(criarProvedorFalso({ buscarUm: falha(erro) }).provedor)
    expect(await fiscalizacoesDomain.obterPorId('f1')).toEqual(falha(erro))
  })
})

describe('fiscalizacoesDomain.listarUnidades', () => {
  it('unidades da fiscalização em ordem de criação (repository.listUnidadesFiscalizacaoOnline)', async () => {
    const falso = criarProvedorFalso({ buscarMuitos: sucesso({ itens: [{ id: 'u1' }] }) })
    __setProviderForTests(falso.provedor)
    expect(await fiscalizacoesDomain.listarUnidades('f1')).toEqual(sucesso([{ id: 'u1' }]))
    expect(falso.chamadas).toEqual([
      {
        operacao: 'buscarMuitos',
        args: [
          'unidades_fiscalizadas',
          {
            criterios: [{ campo: 'fiscalizacao_id', op: 'igual', valor: 'f1' }],
            ordenacao: [{ campo: 'created_at', direcao: 'asc' }],
          } satisfies Filtro,
        ],
      },
    ])
  })

  it('sem id devolve lista vazia sem consultar', async () => {
    const falso = criarProvedorFalso()
    __setProviderForTests(falso.provedor)
    expect(await fiscalizacoesDomain.listarUnidades('')).toEqual(sucesso([]))
    expect(falso.chamadas).toEqual([])
  })
})

describe('fiscalizacoesDomain.criar / criarUnidade', () => {
  it('cria a fiscalização e devolve o registro com os campos do servidor', async () => {
    const falso = criarProvedorFalso({ criar: sucesso({ id: 'srv-1', numero: 'F-1' }) })
    __setProviderForTests(falso.provedor)
    const dados = { camara_tecnica_id: 'ct-1', status: 'em_andamento' }
    expect(await fiscalizacoesDomain.criar(dados)).toEqual(sucesso({ id: 'srv-1', numero: 'F-1' }))
    expect(falso.chamadas).toEqual([{ operacao: 'criar', args: ['fiscalizacoes', dados] }])
  })

  it('cria a unidade fiscalizada', async () => {
    const falso = criarProvedorFalso({ criar: sucesso({ id: 'u-1' }) })
    __setProviderForTests(falso.provedor)
    const dados = { fiscalizacao_id: 'srv-1', nome_unidade: 'ETA 1' }
    expect(await fiscalizacoesDomain.criarUnidade(dados)).toEqual(sucesso({ id: 'u-1' }))
    expect(falso.chamadas).toEqual([{ operacao: 'criar', args: ['unidades_fiscalizadas', dados] }])
  })

  it('conflito na criação chega ao consumidor como falha classificada', async () => {
    const erro = { tipo: 'conflito' as const, mensagem: 'Já existe um registro com esses dados.' }
    __setProviderForTests(criarProvedorFalso({ criar: falha(erro) }).provedor)
    expect(await fiscalizacoesDomain.criarUnidade({ fiscalizacao_id: 'f' })).toEqual(falha(erro))
  })
})

describe('operações ainda não migradas', () => {
  it('continuam falhando alto, sem tocar o provedor', () => {
    expect(() => fiscalizacoesDomain.responderChecklist({})).toThrow(/ainda não foi migrada/)
  })
})
