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

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { targetHost } from './guard'

export type TableCleanupConfig = {
  /** Nome da coleção/tabela, no vocabulário do provedor ativo. */
  table: string
  /** Coluna de autoria, quando a tabela tiver uma. `null` = só o marcador vale. */
  createdByColumn: string | null
  /**
   * Coluna de texto existente usada para gravar o marcador da execução. `null` quando
   * `createdByColumn` sozinho já delimita o dado com segurança (ver nota abaixo sobre
   * `fiscalizacoes`) — nesse caso o critério de escopo é só autoria.
   */
  markerColumn: string | null
}

// T026 (specs/001-data-access-abstraction/tasks.md): primeira tarefa a gravar dado.
//
// Só `fiscalizacoes` está registrada aqui, de propósito. Achado ao preparar T026 (2026-09-21):
// unidades_fiscalizadas, respostas_checklist, constatacoes_manuais, determinacoes e
// recomendacoes não têm coluna created_by (confirmado em 001_initial_schema.sql) e, pior,
// nenhuma delas tem um campo de texto livre alcançável pela UI normal do fiscal onde um
// marcador pudesse ser gravado sem alterar o significado do dado (ex.: ChecklistItem.jsx
// sempre grava observacao = '', nunca texto arbitrário). Tentar mapeá-las individualmente
// aqui exigiria escrever fora do fluxo real da UI — o que a própria suíte caracterizadora não
// deveria fazer.
//
// A saída real está no schema: toda essa árvore referencia fiscalizacao_id direta ou
// transitivamente com ON DELETE CASCADE (unidades_fiscalizadas -> fiscalizacoes; as demais
// -> unidades_fiscalizadas). Apagar a fiscalização raiz apaga a árvore inteira. Por isso a
// migration 136 (supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)
// protege essas tabelas por cadeia de posse até fiscalizacoes.created_by, em vez de marcador
// — e a limpeza aqui segue a mesma lógica.
//
// `fiscalizacoes.created_by` sozinho (sem marcador) é seguro como critério de limpeza porque
// o UUID do usuário de teste (5cdf15b9-4b87-4163-8ee7-6eaecd354f67, migration 135) é
// exclusivo dessa conta dedicada — nenhum fiscal real jamais terá esse UUID. sweepBefore() e
// cleanupAfter() são portanto idênticos para esta tabela: apagar toda fiscalização de autoria
// do usuário de teste é sempre seguro, run atual ou anterior.
export const TABLE_CLEANUP_REGISTRY: TableCleanupConfig[] = [
  { table: 'fiscalizacoes', createdByColumn: 'created_by', markerColumn: null }
]

const RUN_MARKER_PREFIX = 'e2e-run:'

let currentRunId: string | null = null

/** Marcador único desta execução, para gravar no campo de texto de cada registro criado. */
export function getRunMarker(): string {
  if (!currentRunId) {
    currentRunId = `${RUN_MARKER_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
  return currentRunId
}

// Cliente autenticado como o usuário de teste — não o service role. A limpeza deve rodar
// sob a mesma RLS que qualquer execução real da UI, incluindo a política RESTRICTIVE das
// migrations 135/136: se algum dia essa política ficar mais estrita do que o esperado, a
// limpeza falha visivelmente (erro do PostgREST) em vez de mascarar o problema com
// privilégio elevado.
let cachedClient: SupabaseClient | null = null

/**
 * Exportado para reuso: specs de escrita (tests/e2e/escrita/**, tests/e2e/offline/**)
 * também precisam consultar a base real como o usuário de teste, para verificar que o que
 * foi gravado offline realmente chegou ao servidor — não só que a fila local esvaziou.
 */
export async function getAuthenticatedTestClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient

  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD
  if (!url || !anonKey) {
    throw new Error('[cleanup] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY ausentes.')
  }
  if (!email || !password) {
    throw new Error(
      '[cleanup] E2E_TEST_USER_EMAIL/E2E_TEST_USER_PASSWORD ausentes — necessários para ' +
        'autenticar como o usuário de teste antes de apagar qualquer registro (a limpeza ' +
        'roda sob RLS, nunca com privilégio elevado).'
    )
  }

  const client = createClient(url, anonKey)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    throw new Error(`[cleanup] Falha ao autenticar o usuário de teste: ${error.message}`)
  }
  cachedClient = client
  return client
}

/**
 * Remove, de uma única tabela registrada, tudo que corresponda aos critérios configurados
 * (autoria quando existir, marcador quando existir — ver TableCleanupConfig). Isolado por
 * tabela para que uma falha numa não impeça a limpeza das demais — a garantia de FR-016 é
 * "nenhum resíduo ao final", não "tudo ou nada".
 */
async function purgeTable(
  config: TableCleanupConfig,
  testUserId: string,
  matchAnyRunMarker: boolean
): Promise<{ table: string; removed: number; error?: string }> {
  try {
    const client = await getAuthenticatedTestClient()
    let query = client.from(config.table).delete().select('id')

    if (config.createdByColumn) {
      query = query.eq(config.createdByColumn, testUserId)
    }
    if (config.markerColumn) {
      query = matchAnyRunMarker
        ? query.like(config.markerColumn, `${RUN_MARKER_PREFIX}%`)
        : query.eq(config.markerColumn, getRunMarker())
    }
    if (!config.createdByColumn && !config.markerColumn) {
      // Não deveria existir na prática — os dois campos nulos significa "delete tudo",
      // o oposto do que FR-017 exige. Recusar explicitamente em vez de executar.
      throw new Error(`tabela "${config.table}" registrada sem createdByColumn nem markerColumn`)
    }

    const { data, error } = await query
    if (error) throw error
    return { table: config.table, removed: data?.length ?? 0 }
  } catch (err) {
    return { table: config.table, removed: 0, error: err instanceof Error ? err.message : String(err) }
  }
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
