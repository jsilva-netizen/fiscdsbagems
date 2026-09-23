// T027 (specs/001-data-access-abstraction/tasks.md) — cobre FR-006/FR-013 explicitamente:
// uma fila de sincronização criada ANTES de qualquer mudança de código MUST continuar
// processável depois, sem intervenção do usuário e sem perda de registro.
//
// Estratégia: gravar diretamente no IndexedDB (Dexie), via indexedDB nativo — sem chamar
// nenhuma função do app (Repository.createFiscalizacao, enqueueMutation, etc.) — simulando
// uma fila que já existia no dispositivo antes da sessão atual começar (ex.: versão anterior
// do app, ou uma sincronização anterior interrompida). Isso prova que o mecanismo de
// sincronização funciona sobre QUALQUER dado corretamente formado na fila, não só sobre o
// que o código atual produz — a garantia que continua valendo mesmo depois que a fase 2
// (T030+) trocar o código que hoje enfileira mutações.
//
// O par (fiscalizacoes + fila_mutacoes + pending_entities) abaixo replica exatamente o shape
// que Repository.createFiscalizacao/enqueueMutation produzem hoje (repository.ts:489-520),
// conferido por leitura direta do código — não é um shape inventado.

import '../../support/guard'
import { test, expect } from '../fixtures/auth'
import { aguardarFilaVaziaIndexedDB } from '../fixtures/offline'
import { getAuthenticatedTestClient } from '../../support/cleanup'

const DEXIE_DB_NAME = 'agems_fiscalizacao_offline'

type FiscalizacaoPreexistente = {
  id: string
  municipio_id: string
  municipio_nome: string
  prestador_servico_id: string
  prestador_servico_nome: string
  servico: string
  status: string
  data_inicio: string
  fiscal_email: string
  tipo_modulo: string
  created_at: string
  updated_at: string
  numero_termo: string
}

/**
 * Grava a fiscalização e a mutação de fila diretamente via IndexedDB nativo, sem passar por
 * nenhum código do app — é o ponto central do teste (ver cabeçalho do arquivo).
 */
async function popularFilaPreexistente(
  page: import('@playwright/test').Page,
  fiscalizacao: FiscalizacaoPreexistente,
  mutacaoId: string
): Promise<void> {
  await page.evaluate(
    ({ dbName, fiscalizacao, mutacaoId }) => {
      return new Promise<void>((resolve, reject) => {
        const req = indexedDB.open(dbName)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction(['fiscalizacoes', 'fila_mutacoes', 'pending_entities'], 'readwrite')
          tx.objectStore('fiscalizacoes').put(fiscalizacao)
          tx.objectStore('fila_mutacoes').put({
            id: mutacaoId,
            tipo: 'insert',
            entity: 'fiscalizacoes',
            payload: fiscalizacao,
            status: 'pending',
            attempts: 0,
            lastError: '',
            nextRetryAt: undefined,
            created_at: fiscalizacao.created_at
          })
          tx.objectStore('pending_entities').put({
            id: `fiscalizacoes:${fiscalizacao.id}`,
            entity: 'fiscalizacoes',
            local_id: fiscalizacao.id,
            created_at: fiscalizacao.created_at
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
    { dbName: DEXIE_DB_NAME, fiscalizacao, mutacaoId }
  )
}

test('fila de sincronização criada antes da mudança é processada normalmente', async ({ paginaFiscal: page }) => {
  const client = await getAuthenticatedTestClient()

  // Referências reais já semeadas na base — a fiscalização "pré-existente" precisa apontar
  // para dado que realmente existe no servidor, como qualquer fiscalização legítima apontaria.
  const { data: municipio, error: erroMunicipio } = await client
    .from('municipios')
    .select('id, nome')
    .limit(1)
    .single()
  expect(erroMunicipio, 'erro ao buscar município de referência para o teste').toBeNull()

  const { data: prestador, error: erroPrestador } = await client
    .from('prestadores_servico')
    .select('id, nome')
    .limit(1)
    .single()
  expect(erroPrestador, 'erro ao buscar prestador de referência para o teste').toBeNull()

  const agora = new Date().toISOString()
  const fiscalizacaoId = crypto.randomUUID()
  const mutacaoId = crypto.randomUUID()

  const fiscalizacaoPreexistente: FiscalizacaoPreexistente = {
    id: fiscalizacaoId,
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
    numero_termo: ''
  }

  // A fixture entrega a página ainda em about:blank (nunca navegada) — acesso a IndexedDB
  // exige uma origem real primeiro.
  await page.goto('/')

  await popularFilaPreexistente(page, fiscalizacaoPreexistente, mutacaoId)

  // Recarrega a página: simula o app "iniciando" já com uma fila local pré-existente (ex.:
  // dispositivo religado, ou versão anterior do app) — o bootstrap normal de
  // AuthContext/SyncStatusContext deve detectar sessão válida + fila pendente e sincronizar
  // sozinho, sem nenhuma ação adicional do teste.
  await page.reload()

  await aguardarFilaVaziaIndexedDB(page, 30_000)

  const { data: fiscalizacao, error: erroFiscalizacao } = await client
    .from('fiscalizacoes')
    .select('id, status, servicos, municipio_id, prestador_servico_id, fiscal_email')
    .eq('id', fiscalizacaoId)
    .maybeSingle()
  expect(erroFiscalizacao, 'erro ao consultar a fiscalização sincronizada').toBeNull()
  expect(
    fiscalizacao,
    'fiscalização enfileirada antes da sessão atual não chegou ao servidor — a sincronização não processou a fila pré-existente'
  ).toBeTruthy()
  expect(fiscalizacao?.status).toBe('em_andamento')
  expect(fiscalizacao?.servicos).toContain('Abastecimento de Água')
  expect(fiscalizacao?.municipio_id).toBe(municipio!.id)
  expect(fiscalizacao?.prestador_servico_id).toBe(prestador!.id)
})
