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
 */
export async function aguardarFilaSincronizada(page: Page, seletorIndicadorFila: string, timeoutMs = 30_000): Promise<void> {
  await page.locator(seletorIndicadorFila).waitFor({ state: 'hidden', timeout: timeoutMs })
}
