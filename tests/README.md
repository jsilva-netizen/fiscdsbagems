# Suíte de testes — Camada de Abstração de Acesso a Dados

Guia operacional. Para o desenho e as decisões por trás desta suíte, ver
`specs/001-data-access-abstraction/quickstart.md` e `research.md` (decisões D1, D2, D6-D8).

## Antes de rodar

A suíte escreve e apaga na base real (é uma decisão explícita, registrada em `spec.md`
"Assumptions"). As variáveis abaixo são obrigatórias e a suíte se recusa a rodar sem elas —
isso é intencional (`tests/support/guard.ts`, FR-018).

| Variável | Obrigatória para | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Sempre | Já usada pela aplicação (`.env.local`); o guard extrai o host dela para saber qual é a base alvo |
| `E2E_CONFIRM_BASE` | Sempre | Você declara explicitamente qual host espera atingir. **Nunca copie de outro ambiente** — o guard falha se não bater com o host de `VITE_SUPABASE_URL` |
| `E2E_TEST_USER_ID` | Testes de escrita | UUID do usuário dedicado de teste em `auth.users`, usado por `tests/support/cleanup.ts` para delimitar a limpeza por autoria |
| `E2E_TEST_USER_EMAIL` / `E2E_TEST_USER_PASSWORD` | Testes de escrita | Credenciais do usuário de teste, para os fixtures de autenticação (`tests/e2e/fixtures/auth.ts`) |

Nenhuma dessas variáveis é commitada. Use um `.env.test` local (fora do controle de versão)
ou exporte no shell antes de rodar.

## Comandos

```bash
npm run test:unit       # Vitest — contratos da camada, sem navegador
npm run test:e2e        # Playwright — suíte completa
npm run test:sweep      # varredura manual de resíduo (fora de uma execução normal)
```

Scripts equivalentes a adicionar em `package.json` conforme os testes forem escritos:

```json
{
  "scripts": {
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:sweep": "node --import tsx tests/support/run-sweep.ts"
  }
}
```

## Se o guard abortar

A mensagem de erro já diz exatamente o que fazer — ela mostra o host esperado e o valor de
`E2E_CONFIRM_BASE` que faltou ou não bateu. Não contorne isso definindo o valor "para
funcionar": o guard existir é o ponto (FR-018) — se você não sabe contra qual base está
rodando, é exatamente quando ele deve parar você.

## Se sobrar resíduo após uma execução

Rode `npm run test:sweep` — é a mesma rotina que roda automaticamente no início de toda
execução (`sweepBefore`, FR-016), disponível também sob demanda. Se o resíduo persistir
depois disso, **pare e investigue antes de rodar de novo**: é sinal de que alguma tabela
sendo exercitada ainda não está mapeada em `tests/support/cleanup.ts` — ver o comentário no
topo daquele arquivo.

## Onde cada coisa vive

```text
tests/
├── e2e/
│   ├── offline/       # US1 — ciclo de campo completo
│   ├── escrita/       # US2 — todo fluxo que grava dado
│   ├── leitura/       # US2 — um caminho de leitura por módulo
│   ├── permissoes/    # US2 — isolamento entre câmaras, autorização
│   └── fixtures/       # sessão autenticada por perfil, simulação offline/GPS/câmera
├── unit/
│   └── providers/      # tradução de filtro/erro da camada, sem navegador
└── support/
    ├── guard.ts         # trava de execução (FR-018)
    └── cleanup.ts       # varredura + limpeza automática (FR-015/016/017)
```
