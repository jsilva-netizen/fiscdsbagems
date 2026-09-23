// T025 — simulação de rede, geolocalização e captura de arquivo para o ciclo offline de
// campo (US1, FR-020, decisão D1 de research.md).
//
// FR-020: um fluxo que depende de câmera/localização é considerado plenamente coberto
// quando o teste SIMULA esses recursos — o objeto de verificação é o comportamento da
// aplicação (a foto entra na fila local? as coordenadas chegam certas?), não o hardware.

import type { BrowserContext, Locator, Page } from '@playwright/test'

/** Campo Grande, MS — sede da AGEMS. Coordenada de referência para testes que não têm um
 * cenário geográfico específico (usar setGeolocation com outro valor quando o teste exigir). */
export const COORDENADA_PADRAO = { latitude: -20.4697, longitude: -54.6201 }

/**
 * Derruba a rede da página, no mesmo sentido que `navigator.onLine` passa a reportar —
 * dispara o evento `offline` que `src/hooks/useOnline.js` (e, após a migração, a categoria
 * Alcançabilidade) escuta.
 */
export async function ficarOffline(context: BrowserContext): Promise<void> {
  await context.setOffline(true)
}

/** Restaura a rede — dispara o evento `online`, iniciando o debounce de reconexão. */
export async function ficarOnline(context: BrowserContext): Promise<void> {
  await context.setOffline(false)
}

/**
 * Define a localização simulada usada por `navigator.geolocation`. Chamar antes de qualquer
 * ação que capture coordenadas (registro de fiscalização, foto com geotag) — o Playwright já
 * concede a permissão `geolocation` via `playwright.config.ts`.
 */
export async function definirLocalizacao(
  context: BrowserContext,
  coordenada: { latitude: number; longitude: number } = COORDENADA_PADRAO
): Promise<void> {
  await context.setGeolocation(coordenada)
}

/**
 * Injeta um arquivo no campo de captura de foto (`<input type="file" capture>`), sem
 * depender de câmera real. `locator` deve apontar diretamente para o `<input>` — os
 * componentes de captura hoje (ex.: PhotoGrid.jsx) expõem um input escondido acionado por um
 * botão visível; use `page.locator('input[type="file"]')` com o seletor mais específico
 * disponível na tela sob teste.
 */
export async function injetarFotoCapturada(
  locator: Locator,
  caminhoArquivo: string | { name: string; mimeType: string; buffer: Buffer }
): Promise<void> {
  await locator.setInputFiles(caminhoArquivo)
}

/**
 * PNG 1x1 válido, para testes que só precisam que *algum* arquivo de imagem exista — não
 * testa conteúdo da foto, só o caminho de dados (entra na fila local, sincroniza, aparece
 * depois). Testes que precisam inspecionar o conteúdo devem usar um arquivo de fixture real.
 */
export function pngMinimoDeTeste(nome = 'foto-teste.png'): { name: string; mimeType: string; buffer: Buffer } {
  const PNG_1X1_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  return { name: nome, mimeType: 'image/png', buffer: Buffer.from(PNG_1X1_BASE64, 'base64') }
}

/**
 * Espera a fila de sincronização local esvaziar após a rede voltar — evita a falha
 * intermitente documentada em quickstart.md ("Teste offline falha de forma intermitente"):
 * nunca assumir tempo fixo, sempre esperar o indicador real de fila vazia.
 *
 * `seletorIndicadorFila` deve apontar para o elemento que a UI usa hoje para sinalizar
 * pendência de sincronização (SyncStatusContext.jsx) — passado pelo teste porque o texto/
 * estado exato desse indicador é o que cada spec de US1 vai caracterizar.
 *
 * Achado ao escrever T026: as páginas do fluxo de campo do fiscal (NovaFiscalizacao,
 * ExecutarFiscalizacao, VistoriarUnidade, AdicionarUnidade, Home) estão todas na lista
 * `fullscreenPages` de `src/Layout.jsx` — nelas o `SyncBar` (único indicador visual de fila/
 * sincronização hoje) **não é renderizado**. Não existe, portanto, elemento de UI para este
 * seletor apontar nesse fluxo específico. Use `aguardarFilaVaziaIndexedDB` abaixo nesse caso.
 */
export async function aguardarFilaSincronizada(page: Page, seletorIndicadorFila: string, timeoutMs = 30_000): Promise<void> {
  await page.locator(seletorIndicadorFila).waitFor({ state: 'hidden', timeout: timeoutMs })
}

/** Nome do banco Dexie da aplicação (`src/lib/offline/db.ts`, `super('agems_fiscalizacao_offline')`). */
const DEXIE_DB_NAME = 'agems_fiscalizacao_offline'

/**
 * Conta registros de uma object store do Dexie diretamente via IndexedDB nativo, sem
 * depender de nenhum estado exposto pelo app no `window`. Base para os dois helpers abaixo.
 */
async function contarRegistrosIndexedDB(page: Page, storeName: string): Promise<number> {
  return page.evaluate((store) => {
    return new Promise<number>((resolve, reject) => {
      const req = indexedDB.open('agems_fiscalizacao_offline')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(store)) {
          db.close()
          resolve(0)
          return
        }
        const tx = db.transaction(store, 'readonly')
        const countReq = tx.objectStore(store).count()
        countReq.onsuccess = () => {
          resolve(countReq.result)
          db.close()
        }
        countReq.onerror = () => {
          reject(countReq.error)
          db.close()
        }
      }
    })
  }, storeName)
}

/**
 * Espera dado de referência (municípios, prestadores ou tipos de unidade) existir no Dexie
 * local — usado ONLINE, antes de derrubar a rede, para confirmar que a sincronização
 * automática de login (SyncStatusContext.jsx) já preencheu o que o formulário de campo
 * precisa. Sem isto, `useQuery` de NovaFiscalizacao/AdicionarUnidade pode montar sobre Dexie
 * ainda vazio e nunca refazer a busca sozinho — React Query não sabe que o Dexie mudou por
 * fora dele.
 */
export async function aguardarReferenciasSincronizadas(
  page: Page,
  storeName: 'municipios' | 'prestadores' | 'tipos_unidade',
  timeoutMs = 30_000
): Promise<void> {
  const inicio = Date.now()
  while (Date.now() - inicio < timeoutMs) {
    if ((await contarRegistrosIndexedDB(page, storeName)) > 0) return
    await page.waitForTimeout(500)
  }
  throw new Error(
    `[fixtures/offline] "${storeName}" continua vazio no Dexie após ${timeoutMs}ms — a ` +
      'sincronização de login não preencheu os dados de referência a tempo.'
  )
}

/**
 * Espera `fila_mutacoes` (o outbox local) esvaziar após a rede voltar — a versão desta
 * verificação que funciona nas páginas fullscreen do fluxo de campo, onde não há indicador
 * de UI (ver comentário de `aguardarFilaSincronizada` acima).
 */
export async function aguardarFilaVaziaIndexedDB(page: Page, timeoutMs = 30_000): Promise<void> {
  const inicio = Date.now()
  while (Date.now() - inicio < timeoutMs) {
    if ((await contarRegistrosIndexedDB(page, 'fila_mutacoes')) === 0) return
    await page.waitForTimeout(500)
  }
  throw new Error(`[fixtures/offline] fila_mutacoes ainda não esvaziou após ${timeoutMs}ms.`)
}
