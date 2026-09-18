// T024 — sessão autenticada por perfil, reaproveitável em todos os testes e2e.
//
// Estratégia: login real via UI (formulário em src/pages/Login.jsx) uma única vez por
// perfil, depois `storageState` do Playwright salva a sessão (Supabase Auth guarda o token
// no localStorage) para reuso entre specs — evita repetir o fluxo de login em cada teste.
//
// Credenciais vêm de variáveis de ambiente (nunca hardcoded) — quatro perfis reais do
// sistema (src/pages/GerenciarUsuarios.jsx, App.jsx): admin, coordenador, fiscal, prestador.
// A suíte de e2e roda inteira contra o usuário de teste (tests/README.md), então em geral só
// o perfil necessário ao roteiro precisa de credenciais configuradas — os demais ficam
// disponíveis para quando os testes de permissão (tests/e2e/permissoes) precisarem deles.

import { test as base, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export type Perfil = 'admin' | 'coordenador' | 'fiscal' | 'prestador'

type CredenciaisPerfil = { email: string; senha: string }

function credenciaisDe(perfil: Perfil): CredenciaisPerfil {
  const prefixo = `E2E_${perfil.toUpperCase()}`
  const email = process.env[`${prefixo}_EMAIL`]
  const senha = process.env[`${prefixo}_PASSWORD`]
  if (!email || !senha) {
    throw new Error(
      `[fixtures/auth] Credenciais ausentes para o perfil "${perfil}". Defina ` +
        `${prefixo}_EMAIL e ${prefixo}_PASSWORD antes de rodar um teste que use este perfil.`
    )
  }
  return { email, senha }
}

/** Faz login pela UI real e aguarda o redirecionamento pós-autenticação (Login.jsx). */
async function loginViaUI(page: Page, credenciais: CredenciaisPerfil): Promise<void> {
  await page.goto('/login')
  await page.locator('#email').fill(credenciais.email)
  await page.locator('#password').fill(credenciais.senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => url.pathname !== '/login', { timeout: 15_000 })
}

// Cache de storageState em disco, por perfil — evita repetir o login em cada arquivo de
// teste que usa `sessaoAutenticada`. Fica em out-of-repo (scratch), nunca commitado.
const DIRETORIO_STATE = path.join(os.tmpdir(), 'fiscdsbagems-e2e-auth-state')

function caminhoStateDoPerfil(perfil: Perfil): string {
  return path.join(DIRETORIO_STATE, `${perfil}.json`)
}

/**
 * Garante um `storageState` válido para o perfil, criando-o via login real na UI se ainda
 * não existir. Retorna o caminho do arquivo, pronto para `browser.newContext({ storageState })`.
 */
export async function obterStorageStateDoPerfil(
  perfil: Perfil,
  criarPagina: () => Promise<Page>
): Promise<string> {
  fs.mkdirSync(DIRETORIO_STATE, { recursive: true })
  const caminho = caminhoStateDoPerfil(perfil)
  if (fs.existsSync(caminho)) return caminho

  const page = await criarPagina()
  await loginViaUI(page, credenciaisDe(perfil))
  await page.context().storageState({ path: caminho })
  await page.close()
  return caminho
}

type FixturesDeAutenticacao = {
  /** Página já autenticada como perfil "fiscal" — o mais usado (ciclo de campo, US1). */
  paginaFiscal: Page
}

/**
 * Extensão do `test` do Playwright com fixtures de sessão autenticada. Cada teste que
 * precisar de um perfil diferente de "fiscal" pode usar `obterStorageStateDoPerfil`
 * diretamente e montar seu próprio contexto — esta fixture cobre o caso mais comum.
 */
export const test = base.extend<FixturesDeAutenticacao>({
  paginaFiscal: async ({ browser }, use) => {
    const storageState = await obterStorageStateDoPerfil('fiscal', async () => {
      const contextoTemporario = await browser.newContext()
      return contextoTemporario.newPage()
    })
    const context = await browser.newContext({ storageState })
    const page = await context.newPage()
    await use(page)
    await context.close()
  },
})

export { expect } from '@playwright/test'
