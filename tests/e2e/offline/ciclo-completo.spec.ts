// T026 (specs/001-data-access-abstraction/tasks.md) — caracterização do ciclo offline
// completo, rodada ANTES de qualquer migração de código (T030+), como referência de
// paridade que a fase seguinte não pode quebrar (T029/T040).
//
// Roteiro: dispositivo offline -> criar fiscalização -> adicionar unidade -> responder
// checklist completo -> capturar foto (simulada) com GPS -> encerrar unidade -> reconectar
// -> verificar que fiscalização, unidade, respostas e foto chegaram íntegros ao servidor.
//
// Decisões de desenho registradas aqui porque não existiam em nenhum outro lugar do
// repositório antes deste teste (ver commit desta tarefa para o raciocínio completo):
//
// 1. Nenhuma navegação de página inteira (`page.goto`/`page.reload`) depois de `ficarOffline`.
//    As páginas do fluxo de campo (NovaFiscalizacao, ExecutarFiscalizacao, VistoriarUnidade,
//    AdicionarUnidade) são importadas de forma eager em `src/pages.config.js` — não lazy —
//    então uma vez que o bundle inicial carregou, navegar entre elas é 100% client-side
//    (React Router), sem nenhuma requisição de rede. Só a PRIMEIRA carga de página, feita
//    ainda online, usa `page.goto`. Isso evita depender de o service worker do PWA estar
//    ativo em modo dev (`npm run dev`, o webServer configurado em playwright.config.ts) para
//    servir uma navegação inteira offline — incerteza que não vale a pena arriscar aqui.
// 2. A sincronização de dado de referência (municípios/prestadores/tipos de unidade) e o
//    esvaziamento da fila offline são esperados via leitura direta do IndexedDB do Dexie
//    (`aguardarReferenciasSincronizadas`/`aguardarFilaVaziaIndexedDB`, tests/e2e/fixtures/
//    offline.ts), não por um indicador de UI. Achado ao escrever este teste: todas as
//    páginas do fluxo do fiscal estão em `fullscreenPages` (src/Layout.jsx) e por isso nunca
//    renderizam o `SyncBar` — não existe indicador visual de sincronização nesse fluxo hoje.
// 3. A verificação final consulta a base real diretamente (mesmo cliente autenticado do
//    usuário de teste usado pela limpeza, `getAuthenticatedTestClient`), em vez de inferir
//    sucesso da UI. É a forma mais direta de provar FR-005/FR-006: o dado saiu do outbox
//    local e chegou ao servidor com os mesmos valores, não só "a fila ficou vazia".

import '../../support/guard'
import { test, expect } from '../fixtures/auth'
import {
  ficarOffline,
  ficarOnline,
  definirLocalizacao,
  injetarFotoCapturada,
  pngMinimoDeTeste,
  aguardarReferenciasSincronizadas,
  aguardarFilaVaziaIndexedDB
} from '../fixtures/offline'
import { getAuthenticatedTestClient } from '../../support/cleanup'

/** Abre um Select (Radix/shadcn) pelo texto do placeholder e escolhe a primeira opção. */
async function escolherPrimeiraOpcao(page: import('@playwright/test').Page, placeholder: string) {
  await page.getByText(placeholder, { exact: true }).click()
  const opcao = page.getByRole('option').first()
  await opcao.waitFor({ state: 'visible' })
  await opcao.click()
}

test.describe.configure({ mode: 'serial' })

test('ciclo offline completo: fiscalização, unidade, checklist e foto sincronizam íntegros', async ({ paginaFiscal: page }) => {
  // Inclui a espera pelo envio da foto (até 60s), além do ciclo em si.
  test.setTimeout(150_000)
  const context = page.context()

  // --- Preparação, ainda online -------------------------------------------------------
  await page.goto('/NovaFiscalizacao')
  await aguardarReferenciasSincronizadas(page, 'municipios')
  await aguardarReferenciasSincronizadas(page, 'prestadores')
  await aguardarReferenciasSincronizadas(page, 'tipos_unidade')
  // tipos_unidade e itens_checklist sincronizam em passos separados do runFullSync — esperar
  // só o primeiro é uma corrida: a suíte pode ir offline antes do checklist do tipo escolhido
  // existir localmente, zerando os itens exibidos sem nenhum erro (achado ao rodar T026
  // localmente pela primeira vez, 2026-09-23).
  await aguardarReferenciasSincronizadas(page, 'itens_checklist')

  await definirLocalizacao(context)
  await ficarOffline(context)

  // --- Offline: criar a fiscalização ---------------------------------------------------
  await escolherPrimeiraOpcao(page, 'Selecione o município...')
  await escolherPrimeiraOpcao(page, 'Selecione o prestador...')
  await page.getByLabel('Abastecimento de Água').check()
  await page.getByRole('button', { name: 'Iniciar Fiscalização' }).click()

  await page.waitForURL(/\/ExecutarFiscalizacao\?id=/)
  const fiscalizacaoId = new URL(page.url()).searchParams.get('id')
  expect(fiscalizacaoId, 'id da fiscalização deveria estar na URL após criação offline').toBeTruthy()

  // --- Offline: adicionar unidade --------------------------------------------------------
  await page.getByRole('button', { name: 'Adicionar Unidade' }).click()
  await page.waitForURL(/\/AdicionarUnidade\?/)
  await escolherPrimeiraOpcao(page, 'Selecione o tipo...')
  await page.getByRole('button', { name: 'Iniciar Vistoria' }).click()

  await page.waitForURL(/\/VistoriarUnidade\?id=/)
  const unidadeId = new URL(page.url()).searchParams.get('id')
  expect(unidadeId, 'id da unidade deveria estar na URL após criação offline').toBeTruthy()

  // --- Offline: responder checklist completo ---------------------------------------------
  const botoesSim = page.getByRole('button', { name: 'SIM', exact: true })
  // O checklist renderiza depois de uma consulta assíncrona ao Dexie (VistoriarUnidade.jsx) —
  // sem esperar o primeiro botão aparecer, `.count()` roda contra o DOM ainda vazio e sempre
  // retorna 0, mascarando um checklist que na verdade existe e renderiza logo em seguida
  // (achado ao rodar T026 localmente pela primeira vez, 2026-09-23).
  await botoesSim.first().waitFor({ state: 'visible' })
  const totalItens = await botoesSim.count()
  expect(
    totalItens,
    'o tipo de unidade escolhido (primeira opção disponível) não tem nenhum item de ' +
      'checklist configurado — a base de teste precisa de ao menos um tipo com checklist ' +
      'para este teste caracterizar "responder checklist completo" de verdade'
  ).toBeGreaterThan(0)
  for (let i = 0; i < totalItens; i++) {
    await botoesSim.nth(i).click()
  }
  // Confere que todas as respostas realmente ficaram marcadas — o botão SIM continua no DOM
  // (mesmo role/nome) só fica `disabled` quando já é a resposta ativa (ChecklistItem.jsx);
  // ele não desaparece, então a checagem precisa ser por estado habilitado, não por contagem
  // (achado ao rodar T026 localmente pela primeira vez, 2026-09-23).
  await expect(page.getByRole('button', { name: 'SIM', exact: true, disabled: false })).toHaveCount(0)

  // --- Offline: capturar foto (simulada) com GPS ------------------------------------------
  await page.getByRole('tab', { name: /fotos/i }).click()
  // Input sem o atributo `capture` = fluxo "escolher da galeria" (PhotoGrid.jsx); o outro
  // input (`capture="environment"`) é a câmera real do dispositivo, fora do escopo de FR-020
  // (a foto simulada testa o caminho de dados, não o hardware de captura).
  const inputGaleria = page.locator('input[type="file"]:not([capture])')
  await injetarFotoCapturada(inputGaleria, pngMinimoDeTeste())
  await expect(page.getByRole('tab', { name: /fotos/i })).not.toHaveText(/!/)

  // --- Offline: encerrar a unidade ---------------------------------------------------------
  await page.getByRole('button', { name: 'Finalizar Vistoria' }).click()
  await page.waitForURL(new RegExp(`/ExecutarFiscalizacao\\?id=${fiscalizacaoId}`))

  // --- Reconectar e esperar a fila esvaziar -------------------------------------------------
  await ficarOnline(context)
  await aguardarFilaVaziaIndexedDB(page, 60_000)

  // --- Verificar integridade direto na base real ---------------------------------------------
  const client = await getAuthenticatedTestClient()

  const { data: fiscalizacao, error: erroFiscalizacao } = await client
    .from('fiscalizacoes')
    .select('id, status, servicos, municipio_id, prestador_servico_id')
    .eq('id', fiscalizacaoId)
    .maybeSingle()
  expect(erroFiscalizacao, 'erro ao consultar a fiscalização sincronizada').toBeNull()
  expect(fiscalizacao, 'fiscalização não chegou ao servidor após a sincronização').toBeTruthy()
  expect(fiscalizacao?.servicos).toContain('Abastecimento de Água')

  const { data: unidade, error: erroUnidade } = await client
    .from('unidades_fiscalizadas')
    .select('id, status, fiscalizacao_id')
    .eq('id', unidadeId)
    .maybeSingle()
  expect(erroUnidade, 'erro ao consultar a unidade sincronizada').toBeNull()
  expect(unidade, 'unidade não chegou ao servidor após a sincronização').toBeTruthy()
  expect(unidade?.status).toBe('finalizada')
  expect(unidade?.fiscalizacao_id).toBe(fiscalizacaoId)

  const { data: respostas, error: erroRespostas } = await client
    .from('respostas_checklist')
    .select('id, resposta')
    .eq('unidade_fiscalizada_id', unidadeId)
  expect(erroRespostas, 'erro ao consultar as respostas sincronizadas').toBeNull()
  expect(
    respostas?.length,
    'nenhuma resposta de checklist chegou ao servidor — deveria ter uma por item respondido offline'
  ).toBe(totalItens)
  expect(respostas?.every((r) => r.resposta === 'SIM')).toBe(true)

  // --- Foto: referenciada na unidade e presente no armazenamento ----------------------------
  // Acrescentado na T032 parte 3 (2026-09-25): até então este teste não verificava a foto, só
  // fiscalização, unidade e respostas. As fotos sobem por fotos_local, não pela fila de
  // mutações — esvaziar a fila não prova que a foto chegou. Rodado primeiro contra o código
  // anterior à migração do envio de arquivos, como referência (decisão D10).
  const referenciaDeArmazenamento = (f: any): { bucket: string; path: string } | null => {
    if (f?.bucket && f?.path) return { bucket: f.bucket, path: f.path }
    const m = /^storage:\/\/([^/]+)\/(.+)$/.exec(String(f?.url || ''))
    return m ? { bucket: m[1], path: m[2] } : null
  }
  let fotosNoServidor: { bucket: string; path: string }[] = []
  await expect
    .poll(
      async () => {
        const { data } = await client.from('unidades_fiscalizadas').select('fotos_unidade').eq('id', unidadeId).maybeSingle()
        const fotos = Array.isArray(data?.fotos_unidade) ? data.fotos_unidade : []
        fotosNoServidor = fotos.map(referenciaDeArmazenamento).filter(Boolean) as { bucket: string; path: string }[]
        return fotosNoServidor.length
      },
      { timeout: 60_000, message: 'a foto capturada offline não foi registrada na unidade no servidor' }
    )
    .toBe(1)
  const { data: arquivo, error: erroArquivo } = await client.storage
    .from(fotosNoServidor[0].bucket)
    .download(fotosNoServidor[0].path)
  expect(erroArquivo, 'a foto está referenciada na unidade mas não existe no armazenamento').toBeNull()
  expect(arquivo?.size ?? 0, 'a foto no armazenamento está vazia').toBeGreaterThan(0)
})
