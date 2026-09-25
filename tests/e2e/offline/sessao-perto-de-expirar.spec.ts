// T032, parte 1 (specs/001-data-access-abstraction/tasks.md) — caracterização do caminho em
// que o motor de sync renova a sessão antes de sincronizar.
//
// Os demais testes offline rodam com a sessão recém-criada, e com sessão válida por mais de
// 5 minutos o motor PULA a sondagem do servidor e a renovação (runFullSyncInternal,
// syncEngine.ts). Este teste força esse caminho: marca a sessão salva para expirar em 200s,
// dentro da janela em que o motor renova (< 300s) e fora da janela em que a biblioteca de
// autenticação renovaria sozinha ao carregar (< 90s, EXPIRY_MARGIN_MS do auth-js). Só o
// `expires_at` do lado do cliente muda — o token continua válido no servidor.
//
// Rodado contra o código ANTES da migração da parte 1, como referência (decisão D10).

import '../../support/guard'
import { test, expect } from '../fixtures/auth'
import {
  aguardarFilaVaziaIndexedDB,
  popularFilaPreexistente,
  type FiscalizacaoPreexistente
} from '../fixtures/offline'
import { getAuthenticatedTestClient } from '../../support/cleanup'

const SEGUNDOS_ATE_EXPIRAR = 200

/** Muda o expires_at da sessão salva pela biblioteca de autenticação; devolve o valor antigo. */
async function forcarExpiracaoProxima(page: import('@playwright/test').Page, segundos: number): Promise<number> {
  return page.evaluate((segundos) => {
    const chave = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    if (!chave) throw new Error('sessão não encontrada no localStorage')
    const sessao = JSON.parse(localStorage.getItem(chave) as string)
    const anterior = sessao.expires_at
    sessao.expires_at = Math.floor(Date.now() / 1000) + segundos
    localStorage.setItem(chave, JSON.stringify(sessao))
    return anterior
  }, segundos)
}

async function expiracaoAtual(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => {
    const chave = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    return chave ? JSON.parse(localStorage.getItem(chave) as string).expires_at : 0
  })
}

test('sessão perto de expirar: o motor renova a sessão e processa a fila', async ({ paginaFiscalSessaoPropria: page }) => {
  const client = await getAuthenticatedTestClient()

  const { data: municipio, error: erroMunicipio } = await client.from('municipios').select('id, nome').limit(1).single()
  expect(erroMunicipio, 'erro ao buscar município de referência para o teste').toBeNull()
  const { data: prestador, error: erroPrestador } = await client
    .from('prestadores_servico')
    .select('id, nome')
    .limit(1)
    .single()
  expect(erroPrestador, 'erro ao buscar prestador de referência para o teste').toBeNull()

  const agora = new Date().toISOString()
  const fiscalizacaoId = crypto.randomUUID()
  const fiscalizacao: FiscalizacaoPreexistente = {
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

  const renovacoes: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/auth/v1/token') && req.url().includes('grant_type=refresh_token')) renovacoes.push(req.url())
  })

  await page.goto('/')
  // Sessão própria (login novo, fixture paginaFiscalSessaoPropria): este teste faz o motor
  // renovar a sessão, e fazer isso sobre a sessão em cache revogaria a dos outros testes.
  // Espera a sessão do login estar gravada (> 30 min) antes de forçar a expiração, para a
  // gravação não chegar depois e sobrescrever o valor forçado.
  await page.waitForFunction(() => {
    const chave = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))
    const s = chave ? JSON.parse(localStorage.getItem(chave) as string) : null
    return !!s && s.expires_at - Date.now() / 1000 > 1800
  })
  await popularFilaPreexistente(page, fiscalizacao, crypto.randomUUID())
  const expiracaoOriginal = await forcarExpiracaoProxima(page, SEGUNDOS_ATE_EXPIRAR)
  const limiteForcado = Math.floor(Date.now() / 1000) + SEGUNDOS_ATE_EXPIRAR

  // Só conta a partir daqui: renovação anterior ao recarregamento não é do motor.
  renovacoes.length = 0
  await page.reload()
  await aguardarFilaVaziaIndexedDB(page, 30_000)

  expect(renovacoes.length, 'o motor não renovou a sessão perto de expirar').toBeGreaterThan(0)
  const expiracaoNova = await expiracaoAtual(page)
  expect(expiracaoNova, 'a sessão salva continua com a expiração forçada').toBeGreaterThan(limiteForcado + 60)
  expect(expiracaoOriginal).toBeGreaterThan(0)

  const { data: noServidor, error } = await client
    .from('fiscalizacoes')
    .select('id, status, municipio_id')
    .eq('id', fiscalizacaoId)
    .maybeSingle()
  expect(error, 'erro ao consultar a fiscalização sincronizada').toBeNull()
  expect(noServidor, 'a fila não chegou ao servidor depois da renovação da sessão').toBeTruthy()
  expect(noServidor?.status).toBe('em_andamento')
  expect(noServidor?.municipio_id).toBe(municipio!.id)
})
