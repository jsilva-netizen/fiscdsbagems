// Domínio `fiscalizacoes` (contracts/domains.md) — núcleo de campo, único domínio
// atravessado pelo caminho offline. Implementação: tasks.md Fase 3 (US1), T030-T034.
//
// Cada operação reproduz a consulta que o código atual faz (coleção, filtro, ordem,
// limite), citada ao lado — é o que garante paridade quando o consumidor migrar. Não
// acrescentar filtro ou ordenação sem consumidor (Princípio V): ordem implícita diferente
// é regressão visível (contracts/provider.md #1).
//
// As operações ainda não migradas falham alto: chamá-las antes da tarefa que as implementa
// é erro de programação, não caso de uso válido.

import { getProvider } from '../provider'
import { mapear, sucesso, tipoDoErro, type Resultado } from '../types'

/** Registro como o servidor devolve. O formato das colunas é o atual; não é contrato neutro. */
export type RegistroFiscalizacao = { id: string; [campo: string]: unknown }
export type RegistroUnidadeFiscalizada = { id: string; [campo: string]: unknown }

const FISCALIZACOES = 'fiscalizacoes'
const UNIDADES = 'unidades_fiscalizadas'

function aindaNaoMigrado(operacao: string): never {
  throw new Error(
    `[domains/fiscalizacoes] "${operacao}" ainda não foi migrada (tasks.md Fase 3, US1).`
  )
}

/** Fiscalizações de uma câmara técnica, mais recentes primeiro (Fiscalizacoes.jsx). */
async function listar(opcoes: {
  camaraTecnicaId: string
  limite?: number
}): Promise<Resultado<RegistroFiscalizacao[]>> {
  const r = await getProvider().registros.buscarMuitos<RegistroFiscalizacao>(FISCALIZACOES, {
    criterios: [{ campo: 'camara_tecnica_id', op: 'igual', valor: opcoes.camaraTecnicaId }],
    ordenacao: [{ campo: 'data_inicio', direcao: 'desc' }],
    limite: opcoes.limite ?? 500,
  })
  return mapear(r, (pagina) => pagina.itens)
}

/**
 * Fiscalização pelo id do servidor. Inexistente é `null`, não erro: o motor de sync lê com
 * maybeSingle e segue em frente quando não há linha (syncEngine.ts, reconciliação por id).
 * Consumida pelo motor de sincronização (contracts/domains.md, "Atenção").
 *
 * `colunas`: o motor lê só as colunas que guarda no dispositivo (selectColsForPull) e grava
 * a linha inteira no IndexedDB — ler todas gravaria campos a mais lá.
 */
async function obterPorId(
  id: string,
  opcoes?: { colunas?: string[] }
): Promise<Resultado<RegistroFiscalizacao | null>> {
  const registros = getProvider().registros
  if (opcoes?.colunas?.length) {
    const r = await registros.buscarMuitos<RegistroFiscalizacao>(FISCALIZACOES, {
      colunas: opcoes.colunas,
      criterios: [{ campo: 'id', op: 'igual', valor: id }],
    })
    return mapear(r, (pagina) => pagina.itens[0] ?? null)
  }
  const r = await registros.buscarUm<RegistroFiscalizacao>(FISCALIZACOES, id)
  if (tipoDoErro(r) === 'nao_encontrado') return sucesso(null)
  return r
}

/** Unidades de uma fiscalização em ordem de criação (repository.listUnidadesFiscalizacaoOnline). */
async function listarUnidades(fiscalizacaoId: string): Promise<Resultado<RegistroUnidadeFiscalizada[]>> {
  if (!fiscalizacaoId) return sucesso([])
  const r = await getProvider().registros.buscarMuitos<RegistroUnidadeFiscalizada>(UNIDADES, {
    criterios: [{ campo: 'fiscalizacao_id', op: 'igual', valor: fiscalizacaoId }],
    ordenacao: [{ campo: 'created_at', direcao: 'asc' }],
  })
  return mapear(r, (pagina) => pagina.itens)
}

/**
 * Cria a fiscalização e devolve o registro com os campos preenchidos pelo servidor.
 * Criação direta (insert). O caminho offline NÃO passa por aqui: o motor envia a fila com
 * upsert por id (sincronizacao.enviarItemFila), com as retentativas próprias dele (T032).
 */
function criar(dados: Record<string, unknown>): Promise<Resultado<RegistroFiscalizacao>> {
  return getProvider().registros.criar<RegistroFiscalizacao>(FISCALIZACOES, dados as Partial<RegistroFiscalizacao>)
}

/** Cria a unidade fiscalizada. Mesma observação de `criar` sobre o caminho offline. */
function criarUnidade(dados: Record<string, unknown>): Promise<Resultado<RegistroUnidadeFiscalizada>> {
  return getProvider().registros.criar<RegistroUnidadeFiscalizada>(UNIDADES, dados as Partial<RegistroUnidadeFiscalizada>)
}

export const fiscalizacoesDomain = {
  listar,
  obterPorId,
  listarUnidades,
  criar,
  criarUnidade,
  responderChecklist: (_dados: unknown) => aindaNaoMigrado('responderChecklist'),
  registrarNaoConformidade: (_dados: unknown) => aindaNaoMigrado('registrarNaoConformidade'),
  registrarConstatacaoManual: (_dados: unknown) => aindaNaoMigrado('registrarConstatacaoManual'),
  registrarDeterminacao: (_dados: unknown) => aindaNaoMigrado('registrarDeterminacao'),
  registrarRecomendacao: (_dados: unknown) => aindaNaoMigrado('registrarRecomendacao'),
  anexarFoto: (_dados: unknown) => aindaNaoMigrado('anexarFoto'),
  listarFotos: (_unidadeId: string) => aindaNaoMigrado('listarFotos'),
  listarTiposUnidade: () => aindaNaoMigrado('listarTiposUnidade'),
  listarItensChecklist: (_tipoUnidadeId: string) => aindaNaoMigrado('listarItensChecklist'),
  finalizar: (_fiscalizacaoId: string) => aindaNaoMigrado('finalizar'), // via procedimentos.finalizarFiscalizacao
  reabrir: (_fiscalizacaoId: string) => aindaNaoMigrado('reabrir'), // via procedimentos.reabrirFiscalizacao
  buscarHistoricoAlteracoes: (_fiscalizacaoId: string) => aindaNaoMigrado('buscarHistoricoAlteracoes'),
}
