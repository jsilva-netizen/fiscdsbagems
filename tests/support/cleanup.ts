// Limpeza automática de dado de teste (FR-015, FR-016, FR-017; decisão D6 de research.md).
//
// Duas rotinas complementares:
//   - sweepBefore(): roda no início de cada execução, remove resíduo de uma execução
//     anterior que tenha sido interrompida (FR-016 exige que a limpeza funcione mesmo
//     quando a execução falha no meio — por definição, execução interrompida não chega ao
//     "final" para se autolimpar).
//   - cleanupAfter(): roda ao final de cada execução (caminho normal).
//
// As duas usam o MESMO critério, porque a garantia de FR-017 ("MUST NOT remover nem alterar
// qualquer dado que não tenha criado") não pode depender de qual das duas rodou.
//
// Escopo por dois critérios combinados (data-model.md, "Registro rastreado"):
//   1. autoria — created_by = usuário de teste
//   2. marcador — identificador da execução gravado num campo de texto já existente
//
// Onde created_by não existir na tabela, o critério de autoria fica de fora e SÓ o marcador
// vale — e a tabela precisa estar registrada explicitamente em TABLE_CLEANUP_REGISTRY antes
// de a suíte escrever nela. Tabela não registrada = suíte não deve gravar lá (FR-017).
//
// NOTA DE IMPLEMENTAÇÃO: o registro abaixo começa vazio de propósito. Cada tarefa de
// migração que passa a exercitar escrita numa tabela (Fase 3 em diante, tasks.md) MUST
// adicionar a entrada correspondente aqui antes de o teste daquele domínio gravar dado —
// é o mesmo raciocínio de FR-017 aplicado ao processo de implementação, não só ao runtime.

import { targetHost } from './guard'

export type TableCleanupConfig = {
  /** Nome da coleção/tabela, no vocabulário do provedor ativo. */
  table: string
  /** Coluna de autoria, quando a tabela tiver uma. `null` = só o marcador vale. */
  createdByColumn: string | null
  /** Coluna de texto existente usada para gravar o marcador da execução. */
  markerColumn: string
}

// Vazio até a primeira tarefa de migração que grava dado (Fase 3, tasks.md T026+).
export const TABLE_CLEANUP_REGISTRY: TableCleanupConfig[] = []

const RUN_MARKER_PREFIX = 'e2e-run:'

let currentRunId: string | null = null

/** Marcador único desta execução, para gravar no campo de texto de cada registro criado. */
export function getRunMarker(): string {
  if (!currentRunId) {
    currentRunId = `${RUN_MARKER_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
  return currentRunId
}

/**
 * Remove, de uma única tabela registrada, tudo que corresponda aos dois critérios (autoria
 * quando existir, marcador sempre). Isolado por tabela para que uma falha numa não impeça a
 * limpeza das demais — a garantia de FR-016 é "nenhum resíduo ao final", não "tudo ou nada".
 */
async function purgeTable(
  config: TableCleanupConfig,
  testUserId: string,
  matchAnyRunMarker: boolean
): Promise<{ table: string; removed: number; error?: string }> {
  // Implementação real conectada ao provedor ativo entra junto com a primeira tarefa de
  // domínio que popula TABLE_CLEANUP_REGISTRY (ver nota de implementação acima) — a função
  // fica pronta para uso mas não faz nada com o registro vazio.
  void config
  void testUserId
  void matchAnyRunMarker
  return { table: config.table, removed: 0 }
}

async function purgeAll(matchAnyRunMarker: boolean): Promise<void> {
  const testUserId = process.env.E2E_TEST_USER_ID
  if (!testUserId) {
    throw new Error(
      '[cleanup] E2E_TEST_USER_ID ausente. Sem o id do usuário de teste, não há como ' +
        'delimitar a limpeza por autoria — abortando antes de tocar em qualquer registro.'
    )
  }

  const results = await Promise.all(
    TABLE_CLEANUP_REGISTRY.map((config) => purgeTable(config, testUserId, matchAnyRunMarker))
  )

  const failed = results.filter((r) => r.error)
  if (failed.length > 0) {
    throw new Error(
      `[cleanup] Falha ao limpar ${failed.length} tabela(s): ` +
        failed.map((f) => `${f.table} (${f.error})`).join(', ')
    )
  }
}

/**
 * Roda no início da execução. Remove resíduo de qualquer execução anterior — por isso
 * `matchAnyRunMarker: true`, não apenas o marcador desta execução (que ainda nem existia).
 */
export async function sweepBefore(): Promise<void> {
  await purgeAll(true)
}

/**
 * Roda ao final da execução normal. Remove só o que esta execução específica criou —
 * suficiente porque sweepBefore() já cobre o resíduo de execuções anteriores.
 */
export async function cleanupAfter(): Promise<void> {
  await purgeAll(false)
}

// Reexportado por conveniência: scripts de limpeza manual (quickstart.md, "Validar que a
// limpeza funcionou") podem reportar contra qual base rodaram.
export { targetHost }
