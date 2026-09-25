# Tasks: Camada de Abstração de Acesso a Dados

**Input**: Design documents from `/specs/001-data-access-abstraction/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/,
inventario-acoplamento.md, rpcs-funcoes-e-triggers-postgres.md,
debitos-tecnicos-e-inconsistencias.md

**Tests**: Incluídos e obrigatórios — FR-010/FR-012 exigem suíte automatizada como critério
de aceite da própria fase, não um extra opcional.

**Organização**: tarefas agrupadas por user story (US1, US2, US3), na ordem de prioridade de
`spec.md`. Dentro de cada fase, a sequência interna segue a decisão D10 de `research.md`
("caracterizar antes de migrar"; módulos simples antes do caminho offline crítico). Ver
**Implementation Strategy** ao final para como as fases se entrelaçam na prática.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: US1, US2 ou US3 — obrigatório em Setup/Foundational/Polish, ausente
- Caminhos de arquivo são sempre relativos à raiz do repositório

---

## Phase 1: Setup (Infraestrutura Compartilhada)

**Purpose**: preparar as ferramentas que toda a fase depende — nenhuma delas existe hoje.

- [X] T001 Instalar Playwright e criar `playwright.config.ts` (webServer apontando para
  `npm run dev`, timeout adequado ao ciclo offline, projeto único desktop) — decisão D1 de
  `research.md`
- [X] T002 [P] Instalar Vitest e criar `vitest.config.ts` reaproveitando aliases de
  `vite.config.js` — decisão D2 de `research.md`
- [X] T003 [P] Criar a estrutura `tests/e2e/{offline,escrita,leitura,permissoes}/`,
  `tests/unit/` e `tests/support/` (diretórios vazios, `.gitkeep` onde necessário)
- [X] T004 Adicionar ao `eslint.config.js` as três regras de fronteira da decisão D5
  (`research.md`): proibir importar `src/lib/supabase`, proibir ler
  `import.meta.env.VITE_SUPABASE_*`, proibir literal de caminho Supabase
  (`/rest/v1/`, `/auth/v1/`, `/storage/v1/`, `/functions/v1/`) fora de
  `src/lib/data/providers/supabase/**`. Adicionar uma lista de exceção temporária cobrindo
  os 49 arquivos ainda não migrados (ver `inventario-acoplamento.md`), a ser reduzida tarefa
  a tarefa nas fases seguintes e removida por completo em T088
  > **Correção (2026-09-25)**: a regra de caminho literal só inspecionava strings e
  > templates, e deixava passar o caminho dentro de expressão regular (`/\/storage\/v1\/.../`).
  > Isso foi achado quando `src/lib/fotosOrdem.js` (spec 002) passou pelo lint sem aviso. Foi
  > acrescentado o seletor `Literal[regex.pattern=...]`. O lint do projeto não acusou nenhum
  > outro arquivo fora do allowlist.
- [X] T005 [P] Implementar `tests/support/guard.ts` — trava de execução (FR-018): aborta
  antes de qualquer requisição se a variável de ambiente de confirmação da base não
  corresponder ao identificador esperado
- [X] T006 [P] Implementar `tests/support/cleanup.ts` — duas rotinas (decisão D6): varredura
  no início (remove resíduo de execução anterior interrompida, FR-016) e limpeza ao final
  (FR-015), ambas restritas a registros com `created_by` do usuário de teste **e** marcador
  textual da execução (FR-017, sem alteração de schema)
- [X] T007 Escrever e revisar a migration Postgres para a política aditiva de FR-019
  (decisão D8 de `research.md`; usuário confirmou aplicação em 2026-09-18) — política de
  acesso restrita ao usuário de teste, limitando alteração/remoção aos registros de sua
  própria autoria, sem afetar nenhuma política existente. Numerar como próxima migration
  sequencial em `supabase/migrations/` (após 134). **Não aplicar sem revisão explícita antes
  do merge** — mudança em base de produção
- [X] T008 [P] Documentar em `tests/README.md` as variáveis de ambiente exigidas para rodar a
  suíte (confirmação de base para o guard, credenciais do usuário de teste), e o comando de
  varredura manual (`npm run test:sweep`) descrito em `quickstart.md`

**Checkpoint**: ferramentas de teste operacionais; nenhuma delas depende da camada de dados
ainda inexistente.

---

## Phase 2: Foundational (Bloqueante para as 3 User Stories)

**Purpose**: o esqueleto da camada de abstração e as 8 categorias do provedor
(`contracts/provider.md`). Nenhuma user story pode ser implementada sem isto — é o "ponto
único de troca" que as três dependem.

**⚠️ CRITICAL**: nenhuma tarefa de US1/US2/US3 pode começar antes desta fase terminar.

- [X] T009 Criar `src/lib/data/index.ts` — superfície pública vazia (reexporta os domínios,
  ainda sem implementação)
- [X] T010 Criar `src/lib/data/provider.ts` — o ponto único de seleção do provedor ativo
  (decisão de "Transições de estado" em `data-model.md`): lê configuração, expõe o provedor
  escolhido, imutável durante a execução
- [X] T011 [P] Criar `src/lib/data/types.ts` — formas compartilhadas de `data-model.md`:
  `Resultado` (sucesso/falha), `Erro` (`tipo`: `nao_encontrado | sem_permissao | conflito |
  invalido | rede_indisponivel | falha_servidor`, `mensagem`, `origem`), `Filtro`
  (igualdade, pertencimento, intervalo, busca textual, ordenação, limite, deslocamento),
  `ReferenciaArquivo` (repositório lógico + caminho, sem expor URL)
- [X] T012 Criar `src/lib/data/providers/supabase/index.ts` — ponto de entrada do provedor
  Supabase, importando `src/lib/supabase.js` (única exceção permitida à regra de lint)
- [X] T013 [P] Implementar categoria **Alcançabilidade** em
  `src/lib/data/providers/supabase/alcancabilidade.ts` — consolida as duas implementações
  divergentes hoje existentes (`src/hooks/useOnline.js`: debounce 1500ms, intervalo 5000ms,
  timeout 6000ms, histerese de 2 falhas; `src/lib/offline/syncEngine.ts` `reachability()`:
  timeout 8000ms) em uma única fonte. Preservar o comportamento de `useOnline.js` como
  referência (é o que a UI usa), mas expor timeout configurável para que o motor de sync
  continue podendo usar 8000ms se essa diferença for intencional — documentar a escolha
  explicitamente no código, não silenciá-la
- [X] T014 [P] Implementar categoria **Registros** em
  `src/lib/data/providers/supabase/registros.ts` (`contracts/provider.md` categoria 1):
  buscar muitos, buscar um, criar, atualizar, remover, lote — traduzindo `Filtro` para
  sintaxe PostgREST, preservando ordenação determinística
- [X] T015 [P] Implementar operação `buscarHistoricoAlteracoes` (caso especial de Auditoria,
  `contracts/provider.md` categoria 1) em `registros.ts`, reproduzindo o filtro `.or()`
  complexo hoje usado por `HistoricoFiscalizacao.jsx` sobre `audit_logs`
- [X] T016 [P] Implementar categoria **Arquivos** em
  `src/lib/data/providers/supabase/arquivos.ts` (categoria 2): enviar, obter endereço de
  acesso (assinado com expiração de 30 min, preservando o valor atual), remover, listar.
  Aceitar conteúdo binário vindo de base64 (caminho offline)
- [X] T017 [P] Implementar categoria **Identidade e sessão** em
  `src/lib/data/providers/supabase/identidade.ts` (categoria 3): autenticar (login e
  `signUp` com metadados), encerrar sessão, obter usuário corrente, observar mudança de
  sessão, renovar credencial. Traduzir eventos `SIGNED_OUT`/`USER_DELETED` para eventos
  neutros do contrato
- [X] T018 Implementar categoria **Procedimentos remotos** em
  `src/lib/data/providers/supabase/procedimentos.ts` (categoria 4) com os 7 nomes lógicos da
  decisão D11: `finalizarFiscalizacao`, `reabrirFiscalizacao`, `gerarNumeroAuto`,
  `gerarNumeroAm`, `excluirUsuarioAdmin`, `obterResumoIndicadores`, `importarDoCaters`.
  **Transportar `gerarNumeroAuto`/`gerarNumeroAm` fielmente, incluindo a fragilidade de
  corrida conhecida — decisão do usuário foi deferir a correção para a fase Django, nenhuma
  trava deve ser introduzida aqui**
- [X] T019 [P] Implementar categoria **Processamento assíncrono** em
  `src/lib/data/providers/supabase/assincrono.ts` (categoria 5), absorvendo
  `src/lib/edgeFunctions.js` por completo: solicitar, consultar situação, cancelar quando
  aplicável. Preservar o retry único em 401 com renovação de sessão
- [X] T020 Implementar categoria **Sincronização offline** em
  `src/lib/data/providers/supabase/sincronizacao.ts` (categoria 6) — a mais sensível da
  fase: enviar item da fila, confirmar persistência, relatar falha classificada
  (temporário vs. definitivo, preservando a distinção de `isRetryableError` do
  `syncEngine.ts`, incluindo o caso `23503`/violação de FK como não-retryable)
- [X] T021 [P] Implementar **Registro de operações** em `src/lib/data/logging.ts`
  (FR-023/024): desligado por padrão, ativável por configuração, emite tipo/domínio/alvo/
  duração/resultado, nunca valores trafegados
- [X] T022 [P] Criar esqueletos vazios dos 7 módulos de domínio em `src/lib/data/domains/`:
  `fiscalizacoes.ts`, `autos.ts`, `termos.ts`, `cadastros.ts`, `caters.ts`, `catesa.ts`,
  `relatorios.ts` (apenas a assinatura das operações, implementação nas fases seguintes)
- [X] T023 [P] Testes de unidade (Vitest) em `tests/unit/providers/` cobrindo a tradução de
  `Filtro`→PostgREST, o mapeamento de erro Supabase→`Erro` neutro, e a preservação exata dos
  tempos/histerese de Alcançabilidade (T013) — primeira verificação real de FR-010 (parte de
  unidade)
- [X] T024 [P] Fixture Playwright em `tests/e2e/fixtures/auth.ts` — sessão autenticada por
  perfil (admin, coordenador, fiscal, prestador), reaproveitável em todos os testes e2e
- [X] T025 Fixture Playwright em `tests/e2e/fixtures/offline.ts` — simulação de rede
  (`context.setOffline`), geolocalização (`context.setGeolocation`) e injeção de arquivo em
  campo de captura, conforme decisão D1 e FR-020

**Checkpoint**: a camada existe, todas as 8 categorias têm implementação Supabase, e há
infraestrutura de teste pronta para caracterizar comportamento. Nenhuma tela foi tocada
ainda — o app continua chamando `supabase`/`Repository` diretamente.

---

## Phase 3: User Story 1 — Fiscal em campo não percebe diferença alguma (Priority: P1) 🎯 MVP

**Goal**: o ciclo offline completo (registrar fiscalização sem conectividade, sincronizar ao
reconectar) funciona de forma idêntica ao atual, com o motor de sync e o app de campo
consumindo a camada nova em vez do Supabase direto.

**Independent Test**: rodar `tests/e2e/offline/ciclo-completo.spec.ts` com o dispositivo
offline do início ao fim do roteiro, reconectar, e confirmar que fiscalização, unidades,
respostas, fotos e a fila pré-existente sincronizam sem perda, duplicação ou mudança de
ordem.

### Caracterização (antes de qualquer migração de código — referência de comportamento atual)

- [X] T026 [US1] Escrever `tests/e2e/offline/ciclo-completo.spec.ts`: dispositivo offline →
  criar fiscalização → adicionar unidade → responder checklist completo → capturar foto
  (simulada) com GPS → encerrar unidade → reconectar → verificar sincronização íntegra,
  **rodando contra o código atual** (ainda sem a camada) como linha de base
- [X] T027 [US1] Escrever `tests/e2e/offline/fila-preexistente.spec.ts`: popular a fila local
  (Dexie) como se fosse uma versão anterior do app, sem passar pela camada nova, e verificar
  que a sincronização a processa normalmente — cobre FR-006/FR-013 explicitamente
- [X] T028 [US1] Escrever `tests/e2e/offline/reconciliacao-exclusao-remota.spec.ts`:
  fiscalização excluída no servidor enquanto o dispositivo tem trabalho offline pendente —
  verificar que é recriada com novos IDs (não perdida), conforme
  `recreateFiscalizacaoLocally` documentado em `inventario-acoplamento.md` lote 3a
- [X] T029 [US1] Rodar T026-T028 contra o código atual e confirmar que todos passam —
  **esta é a referência de paridade que a migração seguinte não pode quebrar**

### Migração — domínio `fiscalizacoes` (núcleo de campo, o de maior risco da fase)

- [ ] T030 [US1] Implementar `src/lib/data/domains/fiscalizacoes.ts` — operações de leitura
  (listar, obter por id) e criação de fiscalização/unidade, consumindo
  `providers/supabase/registros.ts`
- [ ] T031 [US1] Migrar `src/hooks/useOnline.js` para consumir
  `src/lib/data/providers/supabase/alcancabilidade.ts` (T013) em vez de montar a URL do
  Supabase diretamente. Remover do allowlist de exceção do lint (T004)
- [ ] T032 [US1] Migrar `src/lib/offline/syncEngine.ts` — a peça de maior risco do
  inventário. Substituir cada chamada `supabase.from(...)`/`supabase.rpc(...)`/
  `supabase.storage...` pelas operações correspondentes de
  `src/lib/data/domains/fiscalizacoes.ts` e `providers/supabase/sincronizacao.ts`,
  preservando **exatamente**: a ordem de `orderForSyncUp`, a indireção `id_map`
  local↔servidor, a deduplicação pré-insert por `codigo_unidade`/`numero_recomendacao`/
  `origem`, a reconciliação de exclusão remota (`recreateFiscalizacaoLocally`/
  `cascadeDeleteFiscalizacaoLocally`), a compactação de outbox, e a classificação de erro
  retryable/definitivo. **Não tentar reimplementar o parsing de mensagem de erro do
  PostgREST de forma diferente** — transportar fielmente (FR-021), decisão registrada em
  `research.md` D12
- [ ] T033 [US1] Migrar `src/lib/offline/repository.ts` (parte offline-first: CRUD local +
  `enqueueMutation`) — trocar as chamadas diretas de leitura auxiliar (ex.:
  `tipos_ocorrencia_dtr`, KML) pelos domínios correspondentes, preservando o padrão
  "grava local primeiro, enfileira depois" em toda operação de escrita
- [ ] T034 [US1] Migrar as ~35 funções "Online" de `repository.ts` (autos, termos,
  pareceres, julgamentos, remessas — sem fila offline) para os domínios `autos`/`termos`
  criados nesta fase ou na Fase 4, conforme o domínio de cada uma; as que pertencem a
  `fiscalizacoes` (ex.: leitura de determinações/unidades por fiscalização) migram aqui
- [ ] T035 [US1] Migrar `src/lib/offline/storageCleanup.js` para consumir
  `providers/supabase/arquivos.ts` e `domains/fiscalizacoes.ts` — preservar a ordem
  "arquivos antes do registro" e a tolerância a falha parcial (`try {} catch {}`)
  documentada em `inventario-acoplamento.md` lote 4
- [ ] T036 [US1] Migrar `src/components/utils/numerationHelper.jsx` para consumir
  `domains/fiscalizacoes.ts` — **preservar o comportamento online-only tal como está**
  (não convertê-lo para offline-first; é inconsistência existente documentada, não defeito
  a corrigir nesta fase)
- [ ] T037 [US1] Migrar `src/components/fiscalizacao/PhotoGrid.jsx` — trocar
  `import.meta.env.VITE_SUPABASE_URL` e `Repository.getSignedUrlFromBucket` pela operação
  "obter endereço de acesso" de `providers/supabase/arquivos.ts`. Documentar explicitamente
  se o bucket `fotos_fiscalizacao` é público ou privado (achado 7 de
  `debitos-tecnicos-e-inconsistencias.md`) e unificar a forma de acesso
  > **Escopo ampliado (2026-09-25)**: a correção das fotos (spec 002, entregue direto na
  > `main`) criou `src/lib/fotosOrdem.js`. A função `chaveDeArmazenamento` dele interpreta o
  > formato de URL do armazenamento (`storage://`, `/storage/v1/object/public|sign/`), e o
  > arquivo entrou no allowlist do lint (T004) como exceção explícita. Nesta tarefa, também:
  > (a) acrescentar ao `ArquivosProvider` (`src/lib/data/contract.ts`) uma operação síncrona
  > que converte endereço gravado em `ReferenciaArquivo`, ou `null`, implementada em
  > `providers/supabase/arquivos.ts`; (b) fazer `chaveDeArmazenamento` e
  > `Repository.parseStorageUrl` usarem essa operação; (c) tirar `src/lib/fotosOrdem.js` do
  > allowlist. Os 29 testes de `tests/unit/fotos/` precisam continuar passando sem alteração.
- [ ] T038 [US1] Migrar `src/lib/offline/db.ts` e `src/lib/offline/image.ts` se necessário —
  confirmar que nenhum dos dois faz chamada de rede direta (uso esperado: só Dexie/canvas)
- [ ] T039 [US1] Remover T031-T038 do allowlist de exceção do lint (T004)

### Verificação de paridade (FR-010 para US1)

- [ ] T040 [US1] Rodar T026-T028 contra o código migrado e confirmar paridade byte-a-byte
  com a referência de T029 — nenhuma diferença de comportamento observável
- [ ] T041 [US1] Escrever e rodar um teste de regressão deliberada (SC-008): introduzir uma
  quebra proposital na ordem de `orderForSyncUp` ou na invariante de confirmação antes de
  limpar a fila, confirmar que `tests/e2e/offline/ciclo-completo.spec.ts` **falha**, depois
  reverter

**Checkpoint**: US1 entregável e testável de forma independente. O caminho offline — o caso
de uso mais crítico do sistema — está migrado e verificado. Este é o MVP da fase.

---

## Phase 4: User Story 2 — Fluxos online continuam idênticos (Priority: P2)

**Goal**: todo fluxo conectado (autos, termos, relatórios, IA, cadastros, permissões) se
comporta de forma idêntica ao atual, consumindo a camada nova.

**Independent Test**: percorrer cada módulo do sistema conectado (`tests/e2e/escrita/*` e
`tests/e2e/leitura/*`), comparando resultado, permissões e tratamento de erro com o
comportamento atual capturado na caracterização.

**Nota de sequenciamento** (decisão D10 de `research.md`): dentro desta fase, migrar
primeiro os domínios de superfície grande e risco baixo (`cadastros`, `termos`) para validar
o formato do contrato em terreno barato, antes dos domínios de maior complexidade de estado
(`autos`, `caters`).

### Caracterização

- [ ] T042 [US2] Escrever `tests/e2e/permissoes/isolamento-camara-tecnica.spec.ts`: usuário
  de uma câmara técnica não acessa dado de outra — cobre FR-009, US2 cenário 2
- [ ] T043 [US2] Escrever `tests/e2e/permissoes/auto-promocao-admin.spec.ts`: usuário
  não-admin tenta se cadastrar com `role: 'admin'` e `ativo: true` — confirmar que o sistema
  rebaixa silenciosamente para `fiscal`/`false` (comportamento do trigger
  `enforce_profile_security`, achado 3 de `debitos-tecnicos-e-inconsistencias.md`,
  adicionado ao Constitution Check do plano)
- [ ] T044 [P] [US2] Escrever `tests/e2e/escrita/cadastros.spec.ts` — CRUD de prestadores,
  municípios, contratos, tipos de unidade (incluindo o comportamento **append-only** de
  `itens_checklist`: editar/remover insere linha nova, nunca altera em lugar — achado 5 de
  `debitos-tecnicos-e-inconsistencias.md`), perfis de usuário
- [ ] T045 [P] [US2] Escrever `tests/e2e/escrita/termos.spec.ts` — emissão, upload de
  arquivo (cobrindo a busca por múltiplos nomes de bucket hoje existente), atualização de
  situação, resposta do prestador
- [ ] T046 [P] [US2] Escrever `tests/e2e/escrita/autos.spec.ts` — emissão de auto,
  manifestação, parecer técnico, julgamento, remessa de IA, cobrindo as transições de
  estado hoje implícitas (`gerado`→`enviado`→`em_análise`→`finalizado`)
- [ ] T047 [P] [US2] Escrever `tests/e2e/escrita/caters-catesa.spec.ts` — processos,
  recomendações, histórico, documentos extras, prorrogações, tarefas de IA (polling)
- [ ] T048 [P] [US2] Escrever `tests/e2e/escrita/relatorios.spec.ts` — solicitação,
  acompanhamento de progresso, download (incluindo remontagem de PDF multi-parte)
- [ ] T049 [P] [US2] Escrever um teste de leitura por módulo em `tests/e2e/leitura/`
  (`cadastros.spec.ts`, `termos.spec.ts`, `autos.spec.ts`, `caters.spec.ts`,
  `relatorios.spec.ts`, `dashboards.spec.ts`) — cobertura mínima exigida por FR-010
- [ ] T050 [US2] Rodar T042-T049 contra o código atual e confirmar que todos passam —
  referência de paridade desta fase

### Migração — Identidade e sessão (convergência das 4 fontes independentes)

- [ ] T051 [US2] Migrar `src/lib/AuthContext.jsx` para consumir
  `providers/supabase/identidade.ts` — preservar o cache versionado (`agms_auth_cache_v1`,
  30 dias), a janela de intenção de logout (60s), o timeout de busca de perfil (4000ms), a
  regra "nunca desloga offline", e a mesclagem de perfil do cache quando a busca falha.
  **Manter os comentários que documentam os dois incidentes de produção corrigidos**
  (trava no logout, restauração indevida de sessão)
- [ ] T052 [US2] Migrar `src/lib/SyncStatusContext.jsx` para consumir a sessão de
  `AuthContext`/`identidade.ts` em vez de manter fonte própria — elimina uma das 4 noções
  independentes de sessão (achado 18 de `debitos-tecnicos-e-inconsistencias.md`)
- [ ] T053 [US2] Migrar `src/lib/PageNotFound.jsx` para consumir `identidade.ts` em vez de
  `React Query` próprio sobre `supabase.auth.getUser()`
- [ ] T054 [US2] Migrar `src/pages/Register.jsx` para usar a operação `autenticar` (signUp)
  de `identidade.ts`, preservando os metadados de cadastro
- [ ] T055 [US2] Migrar `src/pages/GerenciarUsuarios.jsx` para usar
  `excluirUsuarioAdmin` (T018) em vez de `supabase.rpc` direto
- [ ] T056 [US2] Remover T051-T055 do allowlist de exceção do lint (T004)

### Migração — domínio `cadastros` (superfície grande, risco baixo — validar o contrato aqui primeiro)

- [ ] T057 [P] [US2] Implementar `src/lib/data/domains/cadastros.ts` — prestadores,
  municípios, contratos, tipos de unidade, itens de checklist (**respeitando a semântica
  append-only** — operação de domínio própria, não `Atualizar` genérica), perfis, diretorias,
  câmaras técnicas
- [ ] T058 [P] [US2] Migrar `src/pages/TiposUnidade.jsx` para `domains/cadastros.ts` —
  preservar exclusão sempre lógica (`ativo: false`) e reativação
- [ ] T059 [P] [US2] Migrar `src/pages/Checklists.jsx` para `domains/cadastros.ts` —
  preservar o comportamento append-only exatamente (insere nova linha ativa +
  tombstone opcional em vez de `update`/`delete`)
- [ ] T060 [P] [US2] Migrar `src/pages/PrestadoresServico.jsx` e
  `src/pages/DetalhePrestador.jsx` para `domains/cadastros.ts` — preservar
  `logos-entidades` como bucket público (`getPublicUrl`, não assinado)
- [ ] T061 [US2] Remover T057-T060 do allowlist de exceção do lint (T004)

### Migração — domínio `termos`

- [ ] T062 [US2] Implementar `src/lib/data/domains/termos.ts` — emitir, listar, consultar,
  atualizar situação, registrar resposta, anexar arquivo
- [ ] T063 [US2] Migrar `src/pages/GerenciarTermos.jsx` para `domains/termos.ts` — a maior
  página com acoplamento direto (1780 linhas). Preservar `calcularNumeroAM` sem RPC atômica
  (defeito conhecido, deferido — não corrigir aqui) e a busca por múltiplos candidatos de
  bucket até um funcionar
- [ ] T064 [US2] Migrar `src/pages/ResponderTermo.jsx` para `domains/termos.ts` — preservar
  o uso de `getPublicUrl` direto sobre `fotos_fiscalizacao` (achado 7 do catálogo de
  débitos — não unificar aqui, só transportar)
- [ ] T065 [US2] Remover T062-T064 do allowlist de exceção do lint (T004)

### Migração — domínio `autos`

- [ ] T066 [US2] Implementar `src/lib/data/domains/autos.ts` — emitir e listar autos,
  manifestações, pareceres, julgamentos, remessas, com as operações
  `finalizarFiscalizacao`/`reabrirFiscalizacao` de `procedimentos.ts` acessíveis via
  `fiscalizacoes.ts` (não `autos.ts` — pertencem ao domínio da fiscalização, não do auto)
- [ ] T067 [US2] Migrar `src/pages/GestaoAutos.jsx` para `domains/autos.ts` — preservar a
  investigação dinâmica de nome de coluna (`pena_base_rs` e variantes) tal como está;
  **não fixar um nome único** sem confirmar contra o schema real de produção primeiro
- [ ] T068 [US2] Migrar `src/pages/AnalisarResposta.jsx` e
  `src/pages/AnaliseManifestacao.jsx` para `domains/autos.ts` — preservar
  `calcularProximoNumeroTN` sem RPC atômica (mesmo defeito conhecido de T063, deferido) e a
  reversão manual em cascata de `excluirAnalise`
- [ ] T069 [US2] Migrar `src/components/autos/FluxoUploadDocumentos.jsx` para
  `domains/autos.ts` — preservar a máquina de estado do auto tal como está codificada hoje
- [ ] T070 [US2] Migrar `src/pages/AcompanhamentoDeterminacoes.jsx` e
  `src/pages/PareceresTecnicos.jsx` para `domains/autos.ts`
- [ ] T071 [US2] Remover T066-T070 do allowlist de exceção do lint (T004)

### Migração — domínio `caters`/`catesa`

- [ ] T072 [P] [US2] Implementar `src/lib/data/domains/caters.ts`, reaproveitando a
  organização já existente em `src/lib/caters/*` (9 arquivos) — migrar
  `processes.js`, `recommendations.js`, `dashboard.js`, `aiJobs.js`, `history.js`,
  `documents.js`, `deadlineExtensions.js`, `notificationReads.js`,
  `municipalityResponses.js`. Preservar os `.limit()` fixos (1000/2000/5000) tal como
  estão, e a duplicação de `computeResponseDueAt` (unificação é oportunidade futura, não
  desta fase)
- [ ] T073 [P] [US2] Implementar `src/lib/data/domains/catesa.ts`, migrando
  `src/lib/catesa/aiJobs.js` (cópia de `caters/aiJobs.js` — pode importar de `caters.ts`
  internamente para não duplicar código novo, desde que o comportamento observável não
  mude)
- [ ] T074 [P] [US2] Migrar `src/pages/CatersDashboard.jsx`, `CatersProcessos.jsx`,
  `CatersProcessoDetalhe.jsx`, `CatersRecomendacoes.jsx`, `CatefisDashboard.jsx` e demais
  dashboards vazios para `domains/caters.ts`
- [ ] T075 [P] [US2] Migrar `src/pages/CatesaDashboard.jsx` para `domains/catesa.ts`
- [ ] T076 [US2] Remover T072-T075 do allowlist de exceção do lint (T004)

### Migração — domínio `relatorios` e utilitários restantes

- [ ] T077 [US2] Implementar `src/lib/data/domains/relatorios.ts` — solicitar, acompanhar
  progresso, obter resultado, consumindo `providers/supabase/assincrono.ts`
- [ ] T078 [US2] Migrar `src/components/fiscalizacao/RelatorioFiscalizacao.jsx` para
  `domains/relatorios.ts` — **substituir o `STORAGE_NAMESPACE` derivado de
  `VITE_SUPABASE_URL`** (usado como prefixo de cache local) por um identificador neutro de
  versão do backend, preservando a finalidade (invalidar cache antigo ao trocar de backend)
  sem reintroduzir acoplamento
- [ ] T079 [US2] Migrar `src/pages/Relatorios.jsx` para `domains/relatorios.ts`, incluindo
  `obterResumoIndicadores` (T018)
- [ ] T080 [US2] Migrar `src/components/fiscalizacao/ExportarPDFConsolidado.jsx` e
  `src/components/fiscalizacao/HistoricoFiscalizacao.jsx` (consumindo
  `buscarHistoricoAlteracoes` de T015) para os domínios correspondentes
- [ ] T081 [US2] Migrar `src/components/prestador/HistoricoFiscalizacoes.jsx` para
  `domains/fiscalizacoes.ts`
- [ ] T082 [US2] Migrar `src/pages/ExportarImportar.jsx` — a ferramenta de
  exportação/reimportação entre instâncias. Requer uma operação de domínio própria
  ("importar lote com regeneração de ID e reescrita de referência entre 7 entidades") já
  que nenhuma categoria existente cobre esse padrão — ver achado 8 de
  `debitos-tecnicos-e-inconsistencias.md`
- [ ] T083 [US2] Migrar `src/pages/FiscalizacoesDTR.jsx` (exportação em lote para ZIP) e
  `src/pages/VistoriarOcorrenciaDTR.jsx` (ferramenta de reprocessamento de fotos DTR) para
  `providers/supabase/arquivos.ts`
- [ ] T084 [US2] Remover T077-T083 do allowlist de exceção do lint (T004)

### Verificação de paridade (FR-010 para US2)

- [ ] T085 [US2] Rodar T042-T049 contra o código migrado e confirmar paridade com a
  referência de T050, incluindo o caso de teste de `enforce_profile_security` (T043)
- [ ] T086 [US2] Teste de regressão deliberada (SC-008) num fluxo de escrita crítico
  (ex.: emissão de auto de infração) — confirmar que a suíte detecta, depois reverter

**Checkpoint**: US2 entregável e testável de forma independente. Toda a superfície online do
sistema está migrada e verificada.

---

## Phase 5: User Story 3 — A origem dos dados passa a ter um único ponto de troca (Priority: P3)

**Goal**: nenhum módulo fora da camada referencia a origem dos dados; trocar a
implementação do provedor não exige tocar em nenhuma tela.

**Independent Test**: `tests/e2e/permissoes` e `tests/unit` passam com uma implementação
alternativa mínima do provedor ativada; a regra de lint acusa zero violações.

- [ ] T087 [US3] Auditar os arquivos remanescentes fora de `src/` (T-lista de
  `plan.md` "Fora de `src/`"): `scripts/check_supabase_schema.mjs`,
  `scripts/fix_photo_paths.mjs` — decidir se migram para consumir a camada ou são
  descontinuados como ferramentas ad hoc (fora do escopo de FR-001, que cobre "a
  aplicação", mas vale registrar a decisão)
- [ ] T088 [US3] Remover por completo a lista de exceção temporária da regra de lint
  (T004) — a partir daqui, `no-restricted-imports`/variável de ambiente/literal de caminho
  são um gate rígido sem exceção fora de `providers/supabase/**`
- [ ] T089 [US3] Rodar a regra de lint no repositório inteiro e confirmar **zero**
  violações fora de `src/lib/data/providers/supabase/` — evidência direta de SC-002 e
  SC-005
- [ ] T090 [US3] Implementar um provedor de teste mínimo alternativo em
  `tests/support/fake-provider.ts` (implementa o contrato de `provider.md` com dados em
  memória, não precisa ser completo) e demonstrar, via `src/lib/data/provider.ts` (T010),
  que ativá-lo no lugar do Supabase não exige alterar nenhuma tela, componente ou fluxo —
  evidência direta de SC-004 e da User Story 3, cenário 2
- [ ] T091 [US3] Escrever `src/lib/data/README.md` — documentação de "onde vêm os dados de
  qualquer tela", apontando para `contracts/provider.md` e `contracts/domains.md` como
  fonte normativa — evidência de SC-006
- [ ] T092 [US3] Confirmar que `package.json` mantém `@supabase/supabase-js` como
  dependência (só sai quando o último consumidor migrar — ainda é o caso, pois o provedor
  Supabase continua ativo) e que nenhum outro pacote foi afetado

**Checkpoint**: as três user stories entregues. A fase está completa e pronta para o
`/speckit-plan` da fase Django (fase 2), que consome os documentos de referência
(`rpcs-funcoes-e-triggers-postgres.md`, `debitos-tecnicos-e-inconsistencias.md`) como
material de entrada.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: itens que atravessam as três histórias e só fazem sentido depois delas
completas.

- [ ] T093 [P] Revisar todos os comentários/mensagens de erro visíveis ao usuário que
  mencionam infraestrutura específica do Supabase (ex.: "verifique se as edge functions
  foram implantadas" em `caters/aiJobs.js`/`catesa/aiJobs.js`) — atualizar texto para
  linguagem neutra de backend, já que a mensagem ainda é tecnicamente válida mas cita
  implementação (achado 20 de `debitos-tecnicos-e-inconsistencias.md`)
- [ ] T094 [P] Remover andaime de desenvolvimento remanescente em
  `src/lib/PageNotFound.jsx` (texto em inglês sobre implementação por IA) — achado 22
- [ ] T095 Rodar a suíte completa (`npm run test:unit && npm run test:e2e`) uma última vez
  de ponta a ponta, incluindo a verificação de resíduo zero na base após a execução
  (`quickstart.md`, "Definição de pronto da fase")
- [ ] T096 Atualizar `quickstart.md` se qualquer comando ou caminho de arquivo tiver mudado
  durante a implementação
- [ ] T097 Preparar o handoff para a fase 2: confirmar que
  `rpcs-funcoes-e-triggers-postgres.md` (seção "Ação Pendente" — 8 triggers/funções ainda
  não lidos) e `debitos-tecnicos-e-inconsistencias.md` (itens 🟡, decisões de fase 2) estão
  íntegros e acessíveis como entrada do próximo `/speckit-plan`

---

## Dependencies & Execution Order

### Ordem entre fases

1. **Setup (Phase 1)** — sem dependências, pode começar imediatamente
2. **Foundational (Phase 2)** — depende de Phase 1 (precisa das ferramentas de teste para
   T023); bloqueia todas as user stories
3. **User Story 1 (Phase 3)** — depende de Phase 2. **Nenhuma dependência de US2 ou US3.**
   É o MVP e pode ser entregue sozinho
4. **User Story 2 (Phase 4)** — depende de Phase 2. Pode começar em paralelo com a Phase 3
   por outra pessoa/sessão, já que os domínios não se sobrepõem (US1 = `fiscalizacoes`
   offline; US2 = todo o resto) — mas T004 (allowlist do lint) é recurso compartilhado e
   precisa de coordenação nas remoções incrementais (T039, T056, T061, T065, T071, T076,
   T084)
5. **User Story 3 (Phase 5)** — depende de **Phase 3 E Phase 4 completas** (só faz sentido
   remover a exceção do lint por completo quando não sobrar arquivo migrado pendente)
6. **Polish (Phase 6)** — depende de Phase 5

### Dentro de cada user story

- Caracterização (testes contra o código atual) sempre antes da migração de código —
  decisão D10, não é negociável: sem a referência de comportamento atual capturada, não há
  como provar paridade depois
- Migração de arquivo individual pode ser paralela **entre domínios diferentes**, nunca
  dentro do mesmo domínio (risco de conflito na mesma seção do módulo de domínio)
- Remoção do allowlist do lint (ex.: T039, T056) só depois que todos os arquivos daquele
  lote estiverem migrados e com testes passando

### Marcado [P] — pode rodar em paralelo

Tarefas [P] tocam arquivos diferentes e não têm dependência entre si dentro da mesma seção.
Exemplo concreto na Fase 2: T013-T021 são todas [P] entre si (categorias diferentes do
provedor, arquivos diferentes) — podem ser distribuídas entre desenvolvedores diferentes.

---

## Implementation Strategy

### MVP primeiro (recomendado)

1. Completar **Phase 1** (Setup) e **Phase 2** (Foundational) — nenhuma delas entrega valor
   sozinha, mas ambas são pré-requisito
2. Completar **Phase 3** (US1 — offline) por inteiro, incluindo verificação de paridade
3. **PARAR e validar**: rodar o roteiro de campo real com um fiscal, se possível, antes de
   prosseguir — é o caso de uso que, se quebrado, invalida a fase inteira
4. Só então avançar para Phase 4 (US2)

### Entrega incremental

Cada fase de user story, uma vez completa e com paridade verificada, é um estado
consistente do sistema — o app continua funcionando sobre o Supabase o tempo todo, com uma
fatia a mais passando pela camada nova a cada fase concluída. Isso é compatível com o
Princípio IV da constituição (produção intocada e reversível): cada fase é revertível
isoladamente sem afetar as anteriores.

### Nota sobre a ordem interna de US2 (decisão D10)

A Phase 4 está desenhada para que, dentro dela, `cadastros`/`termos` sejam migrados antes
de `autos`/`caters`/`catesa`/`relatorios` — não porque a prioridade P2 exige essa ordem, mas
porque valida o formato do contrato de domínio numa superfície barata antes de comprometer
os domínios de maior complexidade de estado. Se a equipe preferir priorizar de forma
diferente dentro da Phase 4 (por exemplo, por urgência de negócio), isso não viola nenhuma
regra desta lista — só perde a vantagem de "errar barato primeiro" que motivou D10.

### Escopo explicitamente fora desta lista de tarefas

Por decisão registrada em `plan.md` (Constitution Check, reavaliação pós-fase-1):

- **Não** corrigir a numeração não atômica de TN/AM/auto de infração (deferido para a fase
  Django, decisão do usuário em 2026-09-18).
- **Não** reimplementar nenhum trigger Postgres (`propagate_modification_to_parent`,
  `set_fiscalizacao_cache_fields`, `enforce_profile_security`) — eles continuam disparando
  no banco inalterados; a única ação desta lista relacionada a eles é o caso de teste T043.
- **Não** resolver a duplicação entre `gerar_ncs_unidade` (PL/pgSQL) e
  `syncDeterminacoesFromChecklist`/`syncRecomendacoesFromChecklist` (TypeScript) — ambas
  são transportadas fielmente, cada uma para seu lugar na camada nova, sem tentativa de
  unificação nesta fase.
