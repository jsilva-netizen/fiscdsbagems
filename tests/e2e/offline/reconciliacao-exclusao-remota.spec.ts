// T028 (specs/001-data-access-abstraction/tasks.md) — fiscalização excluída no servidor por
// OUTRO dispositivo enquanto ESTE tem trabalho offline pendente nela (uma unidade recém
// criada, ainda não sincronizada). Verifica que a reconciliação
// (pruneLocalByServerIds -> hasUnsyncedWorkForFiscalizacao -> recreateFiscalizacaoLocally,
// syncEngine.ts:731) preserva o levantamento de campo — recria a fiscalização e a unidade
// com IDs novos — em vez de simplesmente perder o trabalho por a fiscalização "não existir
// mais". Documentado em inventario-acoplamento.md, lote 3a.
//
// Estratégia: monta o cenário nos dois lados diretamente — servidor via client autenticado,
// Dexie local via IndexedDB nativo — sem passar pela UI. O ponto do teste é o mecanismo de
// reconciliação em si, não o fluxo de criação (já coberto por T026/T027):
//   1. Cria uma fiscalização "de verdade" no servidor (client) e replica o mesmo registro no
//      Dexie local, SEM mutação pendente para ela própria — é exatamente o estado de uma
//      fiscalização já sincronizada antes.
//   2. Grava uma unidade só localmente + a mutação de fila correspondente — trabalho offline
//      genuinamente pendente, ainda não visto pelo servidor.
//   3. Apaga a fiscalização no servidor (simulando o outro dispositivo).
//   4. Recarrega a página (bootstrap normal) e confirma: o par antigo (fiscalização+unidade)
//      não sobra órfão localmente, e um par novo (IDs diferentes) chega íntegro ao servidor.

import '../../support/guard'
import { test, expect } from '../fixtures/auth'
import { aguardarFilaVaziaIndexedDB } from '../fixtures/offline'
import { getAuthenticatedTestClient } from '../../support/cleanup'

const DEXIE_DB_NAME = 'agems_fiscalizacao_offline'

/** Grava a fiscalização "já sincronizada" e a unidade "ainda pendente" via IndexedDB nativo. */
async function popularCenarioReconciliacao(
  page: import('@playwright/test').Page,
  fiscalizacao: Record<string, unknown>,
  unidade: Record<string, unknown>,
  mutacaoUnidadeId: string
): Promise<void> {
  await page.evaluate(
    ({ dbName, fiscalizacao, unidade, mutacaoUnidadeId }) => {
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction(['fiscalizacoes', 'unidades', 'fila_mutacoes'], 'readwrite')
          tx.objectStore('fiscalizacoes').put(fiscalizacao)
          tx.objectStore('unidades').put(unidade)
          tx.objectStore('fila_mutacoes').put({
            id: mutacaoUnidadeId,
            tipo: 'insert',
            entity: 'unidades',
            payload: unidade,
            status: 'pending',
            attempts: 0,
            lastError: '',
            nextRetryAt: undefined,
            created_at: (unidade as any).created_at
          })
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => {
            db.close()
            reject(tx.error)
          }
        }
      })
    },
    { dbName: DEXIE_DB_NAME, fiscalizacao, unidade, mutacaoUnidadeId }
  )
}

/**
 * Todas as fiscalizações atualmente no Dexie local. A base de teste tem dado de referência
 * genérico não relacionado (ex.: migration 042_seed_test_data.sql semeia uma fiscalização
 * fixa com created_by nulo, nunca limpa por cleanupAfter porque o filtro de limpeza exige
 * created_by = usuário de teste) — visível a qualquer fiscal via RLS e por isso puxada pelo
 * syncDown() normal. Retornar os registros completos (não só ids) permite ao teste filtrar
 * pelo dado que ele mesmo plantou, em vez de assumir "só existe o que este teste criou"
 * (achado ao escrever T028, 2026-09-23).
 */
async function fiscalizacoesLocais(page: import('@playwright/test').Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate((dbName) => {
    return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const req = indexedDB.open(dbName)
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('fiscalizacoes', 'readonly')
        const getAllReq = tx.objectStore('fiscalizacoes').getAll()
        getAllReq.onsuccess = () => {
          resolve(getAllReq.result as Array<Record<string, unknown>>)
          db.close()
        }
        getAllReq.onerror = () => {
          reject(getAllReq.error)
          db.close()
        }
      }
    })
  }, DEXIE_DB_NAME)
}

test('fiscalização excluída no servidor com trabalho offline pendente é recriada, não perdida', async ({ paginaFiscal: page }) => {
  const client = await getAuthenticatedTestClient()

  const { data: municipio, error: erroMunicipio } = await client.from('municipios').select('id, nome').limit(1).single()
  expect(erroMunicipio, 'erro ao buscar município de referência para o teste').toBeNull()
  const { data: prestador, error: erroPrestador } = await client.from('prestadores_servico').select('id, nome').limit(1).single()
  expect(erroPrestador, 'erro ao buscar prestador de referência para o teste').toBeNull()
  const { data: tipoUnidade, error: erroTipoUnidade } = await client.from('tipos_unidade').select('id, nome').limit(1).single()
  expect(erroTipoUnidade, 'erro ao buscar tipo de unidade de referência para o teste').toBeNull()

  const agora = new Date().toISOString()
  const fiscalizacaoIdAntiga = crypto.randomUUID()
  // Marcador único desta execução — sobrevive ao recreateFiscalizacaoLocally (que copia todos
  // os campos do registro antigo para o novo, ver syncEngine.ts:742) e é enviado ao servidor
  // (numero_termo está na whitelist de serializePayload). Necessário porque município/
  // prestador sozinhos não bastam: T026/T027 usam a mesma query `.limit(1)` e, quando os três
  // testes rodam juntos no mesmo processo, a limpeza só acontece no teardown global — as
  // fiscalizações delas ainda existem no servidor (e chegam via syncDown) quando T028 roda
  // (achado ao rodar a suíte `offline` inteira, 2026-09-23).
  const marcador = `T028-${fiscalizacaoIdAntiga}`

  // 1. Fiscalização "já sincronizada": existe de verdade no servidor...
  const { error: erroInsertFiscalizacao } = await client.from('fiscalizacoes').insert({
    id: fiscalizacaoIdAntiga,
    municipio_id: municipio!.id,
    prestador_servico_id: prestador!.id,
    servicos: ['Abastecimento de Água'],
    status: 'em_andamento',
    fiscal_email: 'e2e-test@test.com',
    data_inicio: agora,
    numero_termo: marcador
  })
  expect(erroInsertFiscalizacao, 'erro ao preparar a fiscalização "já sincronizada" no servidor').toBeNull()

  // ...e também existe local, no mesmo estado "já sincronizada" — sem mutação pendente para
  // ela própria, o que hasUnsyncedWorkForFiscalizacao (syncEngine.ts:671) exige pra tratar
  // isto como "fiscalização sumiu do servidor", não "insert ainda não enviado".
  const fiscalizacaoLocalAntiga = {
    id: fiscalizacaoIdAntiga,
    municipio_id: municipio!.id,
    municipio_nome: municipio!.nome,
    prestador_servico_id: prestador!.id,
    prestador_servico_nome: prestador!.nome,
    servico: 'Abastecimento de Água',
    status: 'em_andamento',
    data_inicio: agora,
    fiscal_email: 'e2e-test@test.com',
    tipo_modulo: 'saneamento_dsb',
    created_at: agora,
    updated_at: agora,
    numero_termo: marcador
  }

  // Unidade criada offline por cima da fiscalização acima — o trabalho de campo que
  // recreateFiscalizacaoLocally precisa preservar, não descartar.
  const unidadeIdAntiga = crypto.randomUUID()
  const unidadeLocalPendente = {
    id: unidadeIdAntiga,
    fiscalizacao_id: fiscalizacaoIdAntiga,
    tipo_unidade_id: tipoUnidade!.id,
    status: 'em_andamento',
    ordem: 0,
    codigo_unidade: 'ETA-001',
    nome_unidade: tipoUnidade!.nome,
    created_at: agora,
    updated_at: agora
  }

  // A fixture entrega a página ainda em about:blank — acesso a IndexedDB exige origem real.
  await page.goto('/')
  await popularCenarioReconciliacao(page, fiscalizacaoLocalAntiga, unidadeLocalPendente, crypto.randomUUID())

  // 2. Outro dispositivo exclui a fiscalização no servidor enquanto isto acontece.
  const { error: erroDelete } = await client.from('fiscalizacoes').delete().eq('id', fiscalizacaoIdAntiga)
  expect(erroDelete, 'erro ao simular a exclusão remota da fiscalização').toBeNull()

  // 3. Reinicia o app (bootstrap normal) — pruneLocalByServerIds deve notar que a
  // fiscalização sumiu do servidor, ver a unidade pendente, e recriar tudo com IDs novos.
  await page.reload()
  await aguardarFilaVaziaIndexedDB(page, 30_000)

  const locaisAtuais = await fiscalizacoesLocais(page)
  const idsLocaisAtuais = locaisAtuais.map((f) => String(f.id))
  expect(
    idsLocaisAtuais,
    'a fiscalização antiga deveria ter sido substituída localmente, não deixada como estava'
  ).not.toContain(fiscalizacaoIdAntiga)

  // Filtra pelo marcador único desta execução — não assume que a fiscalização recriada é a
  // única local, porque não é (ver fiscalizacoesLocais acima e comentário do `marcador`).
  const candidatas = locaisAtuais.filter((f) => f.id !== fiscalizacaoIdAntiga && f.numero_termo === marcador)
  expect(
    candidatas.length,
    'deveria existir exatamente uma fiscalização local recriada com os dados plantados por este teste'
  ).toBe(1)
  const fiscalizacaoIdNova = String(candidatas[0].id)

  const { data: fiscalizacaoAntigaNoServidor } = await client
    .from('fiscalizacoes')
    .select('id')
    .eq('id', fiscalizacaoIdAntiga)
    .maybeSingle()
  expect(fiscalizacaoAntigaNoServidor, 'a fiscalização antiga não deveria voltar a existir no servidor').toBeNull()

  const { data: fiscalizacaoNova, error: erroFiscalizacaoNova } = await client
    .from('fiscalizacoes')
    .select('id, status, servicos, municipio_id')
    .eq('id', fiscalizacaoIdNova)
    .maybeSingle()
  expect(erroFiscalizacaoNova, 'erro ao consultar a fiscalização recriada').toBeNull()
  expect(
    fiscalizacaoNova,
    'a fiscalização recriada (com id novo) não chegou ao servidor — o trabalho offline foi perdido na reconciliação'
  ).toBeTruthy()
  expect(fiscalizacaoNova?.municipio_id).toBe(municipio!.id)
  expect(fiscalizacaoNova?.servicos).toContain('Abastecimento de Água')

  const { data: unidadeNova, error: erroUnidadeNova } = await client
    .from('unidades_fiscalizadas')
    .select('id, fiscalizacao_id, codigo_unidade')
    .eq('fiscalizacao_id', fiscalizacaoIdNova)
    .maybeSingle()
  expect(erroUnidadeNova, 'erro ao consultar a unidade recriada').toBeNull()
  expect(
    unidadeNova,
    'a unidade criada offline (trabalho de campo) foi perdida na reconciliação, não apenas a fiscalização'
  ).toBeTruthy()
  expect(unidadeNova?.codigo_unidade).toBe('ETA-001')
})
