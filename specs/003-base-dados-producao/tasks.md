---
description: "Tarefas da spec 003 — catálogo do banco de produção, divergências, rastreabilidade, ordem dos módulos, achados e formatos"
---

# Tasks: Base de dados do sistema atual — catálogo, divergências, rastreabilidade e ordem dos módulos

**Input**: Design documents from `/specs/003-base-dados-producao/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: incluídos. O plano e o quickstart definem testes `unittest` para as ferramentas (research D2).
Escreva cada teste antes do código correspondente e confirme que ele falha.

**Organization**: tarefas agrupadas pelas histórias da spec. US1 e US2 são P1; US3 e US4, P2; US5, P3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história da spec (US1…US5)

## Convenções para quem executar

- **Pasta de trabalho**: `specs/003-base-dados-producao/`, abreviada `S/` abaixo. Os comandos das
  ferramentas rodam de dentro dela ([contracts/ferramentas-cli.md](./contracts/ferramentas-cli.md)).
- **Inventários de produção**: `.specify/assessments/novo-sistema-django-apps/inventario-producao.csv`
  (parte 1, 29 seções) e `inventario-producao-parte2.csv` (parte 2, 11 seções). É um CSV com as
  colunas `ordem,secao,total,conteudo`, e `conteudo` é JSON. Duas seções da parte 1 vêm como texto
  e não como JSON: `migracoes_aplicadas` ("tabela … não existe") e `agendamentos` ("pg_cron não
  instalado"). Elas contam como seções vazias.
- **Só biblioteca padrão do Python** (research D2). Nada de `pip install`.
- **Nunca conectar em produção.** Nenhuma tarefa altera o banco de produção (FR-018).
- **Nenhum dado pessoal ou valor de segredo** em arquivo nenhum (FR-021). Rode `python -m ferramentas.varredura` antes de cada commit a partir da T010.
- **Toda anotação de significado tem `fonte`** (arquivo:linha do código atual, chave de função
  do banco, ou "comentário do banco"). Sem fonte, a anotação leva `hipotese = true` (research D9).
- **Chaves de objeto**: exatamente os formatos de [data-model.md](./data-model.md#chave-do-objeto).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: estrutura de pastas e fixtures de teste

- [X] T001 Criar a estrutura de pastas do plano:
  - `S/ferramentas/`
  - `S/ferramentas/testes/fixtures/`
  - `S/anotacoes/tabelas/`
  - `S/anotacoes/funcoes/`
  - `S/inventario/`
  - `S/catalogo/tabelas/`
  - `S/catalogo/funcoes/`
  - `S/formatos/`

  Criar também `S/ferramentas/__init__.py` e `S/ferramentas/testes/__init__.py`, ambos vazios.
- [X] T002 [P] Implementar `S/ferramentas/raiz.py` com `raiz_repositorio() -> pathlib.Path`, que sobe a partir de `__file__` até achar a pasta `.specify/`, e `resolver(caminho: str) -> Path`, que resolve caminho relativo a partir da raiz (contracts/ferramentas-cli.md, "Como rodar").
- [X] T003 [P] Criar fixtures pequenas em `S/ferramentas/testes/fixtures/`, no mesmo formato dos CSVs de produção:
  - `parte1-ok.csv`: todas as 29 seções, com 2 tabelas (`pai` e `filho`, este com uma chave estrangeira para `pai`), 1 view, colunas, 1 restrição de cada tipo, 1 índice, 3 funções (uma com duas sobrecargas; uma com `INSERT INTO filho` e chamada a outra; uma usada em política), 1 gatilho em `filho` e 1 em `auth.users`, 2 políticas (uma em `storage.objects` com `bucket_id = 'fotos'`), 1 tipo enum e 1 bucket;
  - `parte2-ok.csv`: as 11 seções, com 1 papel, 1 dependência de view, 1 nome de segredo, 1 coluna categórica e 1 coluna JSON;
  - variantes inválidas: `parte1-sem-secao.csv` (sem `gatilhos`), `parte1-total-errado.csv` (`total` diferente do número de itens) e `parte1-json-quebrado.csv`.

  Nenhum dado real de produção nas fixtures.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: leitura e validação dos inventários, leitura das anotações, esqueleto do gerador e
varredura. Tudo o que as histórias usam.

**⚠️ CRITICAL**: nenhuma história começa antes desta fase.

- [X] T004 [P] Escrever `S/ferramentas/testes/test_inventario.py` cobrindo:
  - `parte1-ok.csv` e `parte2-ok.csv` carregam;
  - seção ausente, total que não bate e JSON quebrado são recusados com `InventarioInvalido`, e a mensagem cita a seção;
  - as seções de texto `migracoes_aplicadas` e `agendamentos` viram listas vazias;
  - as duas sobrecargas de função geram duas chaves distintas no formato `funcao:<nome>(<argumentos>)`;
  - toda chave segue [data-model.md](./data-model.md#chave-do-objeto);
  - colisão de chave é recusada;
  - um TSV do psql (colunas separadas por tab, sem cabeçalho de CSV) carrega igual ao CSV.
- [X] T005 Implementar `S/ferramentas/inventario.py` até a T004 passar.
  - `carregar(parte1, parte2) -> Inventario`: aceita CSV do SQL Editor ou TSV do psql, valida pelas regras de data-model.md, seção "Inventário", e expõe `secoes: dict` e `objetos: dict[chave, Objeto]`.
  - `Objeto` tem `chave`, `tipo`, `atributos` (o dict do inventário) e `pai` (a chave da tabela, para coluna, restrição, índice, gatilho e política).
  - Chaves: `tabela:`, `coluna:`, `restricao:`, `indice:`, `funcao:`, `gatilho:`, `politica:`, `tipo:`, `bucket:`, `papel:`, `privilegio:`, `segredo:`, mais `evento:<nome>` para event triggers e `privilegio_padrao:<dono>.<esquema>.<tipo_objeto>`. Acrescentar essas duas à tabela de chaves de `S/data-model.md`.
- [X] T006 [P] Escrever `S/ferramentas/testes/test_anotacoes.py` cobrindo as regras de [contracts/anotacoes.md](./contracts/anotacoes.md):
  - TOML válido carrega;
  - chave órfã (sem objeto no inventário) → `AnotacaoInvalida` com a lista das órfãs;
  - tabela, view, função ou bucket sem `modulo` e sem `fora_escopo` → erro;
  - coluna sem `significado` → aparece como "sem anotação" (não é erro);
  - `fonte` vazia sem `hipotese = true` → erro;
  - `fora_escopo.classificacao = "descartar"` sem `achado` → erro;
  - coluna sem `modulo` herda o da tabela;
  - `classificacao` fora de `producao_vale | residuo_descartar | defeito_corrigir | aguardando_decisao` → erro;
  - `situacao` fora de `aguardando_decisao | decidido` → erro;
  - `decidido` sem `decisao`, `decidido_por` e `decidido_em` (AAAA-MM-DD) → erro.
- [X] T007 Implementar `S/ferramentas/anotacoes.py` até a T006 passar. `carregar(pasta, inventario) -> Anotacoes` lê os TOMLs de `S/anotacoes/`:
  - `modulos.toml`, `tabelas/*.toml`, `funcoes/*.toml`, `arquivos.toml`, `acesso.toml`, `plataforma.toml`, `divergencias.toml`, `achados.toml`;
  - `externos.toml`, novo: `[[externo]]` com `nome`, `descricao`, `como_obter`, `usado_por`. Documentar esse arquivo em `S/contracts/anotacoes.md`.

  Arquivo ausente conta como vazio.
- [X] T008 [P] Escrever `S/ferramentas/testes/test_gerar.py` cobrindo:
  - `gerar` com as fixtures e anotações vazias → retorno 0, e o resumo de completude na última linha mostra todos os objetos "sem anotação";
  - inventário inválido → retorno 1;
  - anotação inválida → retorno 2;
  - gerar duas vezes seguidas → arquivos idênticos byte a byte;
  - `--verificar` depois de gerar → 0;
  - `--verificar` depois de alterar um arquivo gerado → 3;
  - todo arquivo gerado começa com o aviso `<!-- GERADO por ferramentas/gerar.py ... Não editar. -->` ([contracts/artefatos-gerados.md](./contracts/artefatos-gerados.md)).

  Usar uma pasta temporária como saída.
- [X] T009 Implementar o esqueleto de `S/ferramentas/gerar.py` até a T008 passar.
  - **CLI e retornos:** a CLI e os códigos de retorno de contracts/ferramentas-cli.md; `--saida` (padrão `S/`) para os testes.
  - **Escrita:** determinística (ordenação estável, `\n`, UTF-8, sem data de execução no conteúdo; só a data do inventário).
  - **Modo `--verificar`:** compara o que seria gerado com o disco.
  - **Resumo final:** objetos sem anotação, sem módulo, divergências não classificadas, violações de ordem e achados aguardando decisão.

  Nesta tarefa gera só `S/catalogo/README.md` com as contagens por tipo; as páginas vêm nas histórias.
- [X] T010 [P] Escrever `S/ferramentas/testes/test_varredura.py` e implementar `S/ferramentas/varredura.py` (research D8).
  - **Detecta:** e-mail, CPF e CNPJ (com e sem máscara), JWT, e sequência base64 ou hex com 40 caracteres ou mais fora de blocos de código SQL. O código de função pode ter hash legítimo; nesse caso a regra fica no próprio arquivo, com exceção explícita e justificada.
  - **Colunas pessoais:** falha se alguma coluna cujo nome bata no padrão de dado pessoal da parte 2 (`responsavel`, `razao`, `contato`, `nome`, `email`, `_by$`…) aparecer com valores listados.
  - **Mensagens:** cita arquivo, linha e tipo, **sem repetir o valor** encontrado.
  - **Retornos:** 0 limpo, 1 encontrado.
  - **Testes:** texto limpo passa; cada tipo é detectado.

**Checkpoint**: `python -m unittest discover -s ferramentas/testes` passa. `python -m ferramentas.gerar` sobre os inventários de produção retorna 0, gera `catalogo/README.md` e informa quantos objetos estão sem anotação.

---

## Phase 3: User Story 1 - Consultar qualquer objeto do banco de produção (Priority: P1) 🎯 MVP

**Goal**: catálogo completo e explicado: cada objeto com estrutura, dependências nas duas direções, contagem e módulo (FR-001 a FR-008, FR-023).

**Independent Test**: [quickstart.md](./quickstart.md), passo 6. São 10 objetos sorteados, respondidos só com `catalogo/` e conferidos contra os CSVs. Mais os casos obrigatórios:
- a página de `unidades_fiscalizadas` mostra `fiscalizacoes` como dependência, 8 tabelas dependentes, 3 gatilhos, 7 funções e 7 políticas;
- a página de `gerar_ncs_unidade` mostra as tabelas lidas e escritas e a chamada a `get_my_role`.

### Tests for User Story 1 ⚠️

- [X] T011 [P] [US1] Escrever `S/ferramentas/testes/test_dependencias.py` com as fixtures, cobrindo cada linha da tabela de [research.md D4](./research.md#d4--de-onde-sai-cada-dependência):
  - FK `filho → pai` (natureza `referencia`, origem `catalogo`);
  - view → tabela (`consulta`, `catalogo`);
  - gatilho → função (`dispara`, `catalogo`);
  - política → função (`usa`, `codigo`);
  - função → tabela com `INSERT INTO`/`UPDATE`/`DELETE FROM` (`escreve`) e nos demais casos (`le`);
  - função → função (`chama`);
  - o nome de uma tabela dentro de outro nome (ex.: `pai` em `pai_x`) não conta.

  Garantir também que `dependentes_de(chave)` e `dependencias_de(chave)` são inversas.
- [X] T012 [P] [US1] Escrever `S/ferramentas/testes/test_paginas.py`. Gerar com as fixtures e verificar:
  - a página `catalogo/tabelas/filho.md` tem as 8 seções da "Página de tabela" de contracts/artefatos-gerados.md, na ordem;
  - a coluna com anotação `hipotese = true` aparece marcada como hipótese;
  - a página de função tem uma seção por sobrecarga;
  - `catalogo/arquivos.md` agrupa a política de `storage.objects` no bucket `fotos`, pelo `bucket_id` da condição;
  - `catalogo/acesso.md` lista os privilégios do papel `anon`.

### Implementation for User Story 1

- [X] T013 [US1] Implementar `S/ferramentas/dependencias.py` até a T011 passar. `extrair(inventario) -> Grafo`, com `dependencias_de(chave)` e `dependentes_de(chave)`, e cada aresta com natureza e origem (data-model.md, "Dependência"). Para função → tabela, casar o nome da tabela com borda de palavra, e decidir entre escrita e leitura pelo verbo SQL que precede a menção.
- [X] T014 [US1] Em `S/ferramentas/gerar.py`, gerar `S/catalogo/tabelas/<tabela>.md` para cada tabela e view, com as 8 seções de "Página de tabela" (contracts/artefatos-gerados.md):
  - valores em uso das colunas categóricas: seção `dominio_categorico` da parte 2;
  - estrutura das colunas JSON: seção `estrutura_json`;
  - condição original das políticas: em `<details>`.
- [X] T015 [US1] Em `S/ferramentas/gerar.py`, gerar `S/catalogo/funcoes/<nome>.md` para cada nome de função (37 nomes, 38 funções), com uma seção por sobrecarga: assinatura, retorno, linguagem, permissão elevada, finalidade, tabelas lidas e escritas, funções chamadas, quem a chama (gatilhos, políticas e o campo anotado `chamada_por` com telas e edge functions), regra de negócio e spec, e o código completo em `<details>`. Acrescentar `chamada_por` e `regra_de_negocio` ao contrato de anotação de função em `S/contracts/anotacoes.md`.
- [X] T016 [P] [US1] Em `S/ferramentas/gerar.py`, gerar `S/catalogo/arquivos.md` com os 8 buckets de produção:
  - configuração (`public`, `file_size_limit`, `allowed_mime_types`);
  - arquivos e bytes (seção `arquivos_por_bucket`) e padrões de caminho (seção `padroes_caminho_arquivos` da parte 2);
  - as políticas de `storage.objects` agrupadas pelo `bucket_id` da condição;
  - as colunas e funções que referenciam o bucket: buscar o nome do bucket no código das funções e nos valores padrão de colunas, e acrescentar o que estiver anotado em `anotacoes/arquivos.toml`.
- [X] T017 [P] [US1] Em `S/ferramentas/gerar.py`, gerar `S/catalogo/acesso.md`:
  - papéis (parte 2, `papeis`);
  - privilégios em tabelas e funções por papel, com destaque para `anon` e `PUBLIC` (parte 1, `permissoes_tabelas` e `permissoes_funcoes`);
  - privilégios padrão e privilégios por coluna;
  - nomes de segredos (parte 2, `vault_nomes`), com quem os usa: busca do nome no código das funções mais a anotação.
- [X] T018 [P] [US1] Em `S/ferramentas/gerar.py`, gerar `S/catalogo/externos.md` a partir de `anotacoes/externos.toml`, e criar esse arquivo com pelo menos duas entradas (FR-023):
  - o código publicado das 9 edge functions: `caters_ai_enqueue`, `caters_ai_status`, `caters_ai_worker`, `catesa_ai_enqueue`, `catesa_ai_status`, `catesa_ai_worker`, `relatorios_enqueue`, `relatorios_status`, `relatorios_worker`. Como obter: baixar pelo painel do Supabase. Referência provisória: `supabase/functions/` do repositório;
  - a configuração de autenticação (confirmação de e-mail, validade da sessão, URLs de retorno, envio de e-mail), obtida pelo painel.
- [X] T019 [US1] Completar `S/catalogo/README.md` em `gerar.py`: índice por módulo e por tipo, com links, e completude (anotados/total) por tipo. Rodar `python -m ferramentas.gerar` sobre produção e fazer commit da estrutura gerada, ainda sem anotações.

**Anotações (o grosso do trabalho).** Para cada tabela:
- `finalidade` com `fonte`;
- `significado` de **cada** coluna com `fonte`: buscar o nome da coluna em `src/`, no código das funções do inventário e em `supabase/functions/`;
- efeito de cada gatilho;
- cada política em linguagem simples (quem, operação, condição).

Todas as tarefas abaixo são [P] entre si (arquivos diferentes).

- [X] T020 [P] [US1] Anotar as tabelas do **core** em `S/anotacoes/tabelas/`: `profiles.toml`, `diretorias.toml`, `camaras_tecnicas.toml`, `municipios.toml`, `prestadores_servico.toml`, `contratos.toml` e `audit_logs.toml`, com `modulo = "core"`. Em `camaras_tecnicas`, registrar que produção tem 12 câmaras (inclui `caterm` e `catesg`, ausentes de `src/lib/camaras.js`).
- [X] T021 [P] [US1] Anotar as tabelas de **checklists** em `S/anotacoes/tabelas/`: `tipos_unidade.toml` e `itens_checklist.toml`, com `modulo = "checklists"`. Em `itens_checklist`, registrar a semântica append-only com a fonte (`specs/001-data-access-abstraction/debitos-tecnicos-e-inconsistencias.md`, item 5).
- [X] T022 [P] [US1] Anotar as tabelas de **fiscalização** em `S/anotacoes/tabelas/`, com `modulo = "fiscalizacao"`: `fiscalizacoes.toml`, `unidades_fiscalizadas.toml`, `respostas_checklist.toml`, `nao_conformidades.toml`, `constatacoes_manuais.toml`, `determinacoes.toml`, `recomendacoes.toml`, `fotos_evidencia.toml` e `relatorios_jobs.toml`. Colunas usadas pelo sincronismo offline (ex.: `updated_at`, `fotos_unidade`) citam `src/lib/offline/syncEngine.ts` como fonte.
- [X] T023 [P] [US1] Anotar `S/anotacoes/tabelas/tipos_ocorrencia_dtr.toml`, com `modulo = "dtr"`.
- [X] T024 [P] [US1] Anotar as tabelas do **processo sancionador** em `S/anotacoes/tabelas/`, com `modulo = "processo_sancionador"`: `termos_notificacao.toml`, `respostas_determinacao.toml`, `autos_infracao.toml`, `manifestacoes_auto.toml`, `pareceres_tecnicos.toml`, `julgamentos.toml`, `remessas_ai.toml` e `remessas_ai_itens.toml`.
- [X] T025 [P] [US1] Anotar as tabelas e a view do **CATERS** em `S/anotacoes/tabelas/`, com `modulo = "caters"`: `caters_processes.toml`, `caters_recommendations.toml`, `caters_analysis_history.toml`, `caters_deadline_extensions.toml`, `caters_extra_documents.toml`, `caters_municipality_responses.toml`, `caters_notification_reads.toml`, `caters_ai_jobs.toml` e `caters_fiscalizacoes_disponiveis.toml` (a view).
- [X] T026 [P] [US1] Anotar as funções do **core** (acesso, perfis, auditoria) em `S/anotacoes/funcoes/`, com `modulo = "core"`: `admin_delete_user`, `admin_delete_user_by_email`, `camara_from_servicos`, `can_access_camara`, `can_access_fiscalizacao`, `can_access_unidade`, `current_prestador_servico_id`, `current_role`, `enforce_profile_security`, `get_my_camara_tecnica`, `get_my_diretoria`, `get_my_prestador_id`, `get_my_role`, `handle_new_user`, `is_caters_user`, `is_staff`, `process_audit_log` e `update_updated_at_column` (18). Um arquivo `<nome>.toml` por nome.
- [X] T027 [P] [US1] Anotar as funções da **fiscalização** em `S/anotacoes/funcoes/`, com `modulo = "fiscalizacao"`: `gerar_ncs_unidade`, `finalizar_fiscalizacao`, `reabrir_fiscalizacao`, `propagate_modification_to_parent`, `set_fiscalizacao_cache_fields`, `set_fiscalizacao_last_modified`, `determinacoes_fill_origem`, `obter_resumo_indicadores` (as 2 sobrecargas, e qual está em uso pelo frontend), `claim_relatorios_jobs`, `kick_relatorios_worker`, `trg_fiscalizacao_set_camara` e `trg_auto_set_camara` (12). Usar `specs/001-data-access-abstraction/rpcs-funcoes-e-triggers-postgres.md` como ponto de partida, sempre conferindo contra o código **de produção**.
- [X] T028 [P] [US1] Anotar as funções do **processo sancionador** e do **CATERS** em `S/anotacoes/funcoes/`:
  - `modulo = "processo_sancionador"`: `gerar_numero_am`, `gerar_numero_auto`, `set_termos_notificacao_ano_geracao` e `trg_remessa_set_camara`;
  - `modulo = "caters"`: `caters_import_from_fiscalizacao`, `caters_set_updated_at` e `claim_caters_ai_jobs`.
- [X] T029 [P] [US1] Anotar os 8 buckets em `S/anotacoes/arquivos.toml`: `documentos-autos`, `documentos-prestadores`, `documentos-termos`, `evidencias-determinacoes`, `fotos_fiscalizacao`, `kml-rodovias`, `logos-entidades` (público) e `relatorios_fiscalizacao`. Para cada um: `modulo`, `finalidade` e as colunas ou telas que guardam referência (fonte no código).
- [X] T030 [P] [US1] Anotar `S/anotacoes/acesso.toml` (papéis `anon`, `authenticated` e `service_role`, com o que cada um representa na aplicação; os 2 segredos e quem os usa) e `S/anotacoes/plataforma.toml` (event triggers `issue_*` e `pgrst_*`, papéis `supabase_*`, `authenticator`, `dashboard_user`, `pgbouncer`, `cli_login_postgres`…, com `fora_escopo = { classificacao = "plataforma", motivo = "..." }`).
- [X] T031 [US1] Validar a US1:
  - `python -m ferramentas.gerar`: a última linha mostra **0 objetos sem anotação** (SC-001) e, entre as anotações, 0 sem fonte que não estejam marcadas como hipótese;
  - executar o quickstart, passo 6, com os casos obrigatórios;
  - listar em `S/catalogo/README.md` as anotações marcadas `hipotese = true`, para revisão;
  - fazer commit.
  - **Resultado (2026-09-29, inventário refeito depois das migrations 137 a 141)**: 0 sem anotação e 0
    sem dono; `--verificar` e varredura com retorno 0; 27 anotações marcadas como hipótese. Casos
    obrigatórios conferidos: `unidades_fiscalizadas` mostra `fiscalizacoes`, 8 tabelas dependentes,
    3 gatilhos e 7 políticas; as funções que a usam passaram de 7 para 8 com
    `proteger_resposta_determinacao_prestador` (migration 139). `gerar_ncs_unidade` mostra tabelas
    lidas e escritas e chama `get_my_role`. Amostra de 10 chaves (tabela, coluna, função, política de
    `storage.objects`, bucket, gatilho em `auth.users`, gatilho, política, tipo e papel) conferida
    contra os CSVs: 10 de 10. A leitura por uma pessoa que não conhece o banco fica para a revisão
    do catálogo.

**Checkpoint**: catálogo completo e explicado. Qualquer objeto é consultável sem abrir banco nem código (MVP).

---

## Phase 4: User Story 2 - Saber onde produção e migrations divergem (Priority: P1)

**Goal**: toda diferença entre produção e o banco das migrations listada e classificada (FR-009 a FR-011).

**Independent Test**: [quickstart.md](./quickstart.md), passos 2 e 3. `divergencias.md` tem 0 `nao_classificada`, e toda diferença entre os dois inventários está listada.

### Tests for User Story 2 ⚠️

- [X] T032 [P] [US2] Escrever `S/ferramentas/testes/test_divergencias.py` com dois inventários de fixture que diferem em:
  - um objeto só de um lado e um só do outro;
  - uma função com código diferente só em espaços em branco, que **não** diverge;
  - uma função com código realmente diferente (`codigo_diferente`, com diff);
  - uma coluna com tipo diferente (`estrutura_diferente`).

  Verificar os tipos `so_producao | so_migrations | codigo_diferente | estrutura_diferente`, e que divergência sem anotação sai `nao_classificada`.

### Implementation for User Story 2

- [X] T033 [US2] Implementar `S/ferramentas/divergencias.py` até a T032 passar: `comparar(producao, migrations) -> list[Divergencia]` pela chave estável (research D5), com código normalizado por espaço em branco e diff via `difflib.unified_diff`.
- [X] T034 [US2] Implementar `S/ferramentas/inventario_migrations.py` (contracts/ferramentas-cli.md):
  - roda `.specify/assessments/novo-sistema-django-apps/inventario-producao.sql` e `inventario-producao-parte2.sql` no contêiner `supabase_db_fiscdsbagems`, com `docker exec -i ... psql -U postgres -d postgres -v ON_ERROR_STOP=1 -A -F <tab> -P pager=off -f -`;
  - grava `S/inventario/migrations-parte1.tsv` e `migrations-parte2.tsv`;
  - `--reconstruir` pede confirmação e roda `npx supabase db reset` antes;
  - recusa rodar se o contêiner não for local.
- [X] T035 [US2] Rodar `python -m ferramentas.inventario_migrations --reconstruir` (com o Supabase local no ar) e fazer commit dos dois TSVs. Conferir que as contagens batem com a medição de 2026-09-28:
  - políticas: 66 só em produção e 18 só nas migrations;
  - funções: 8 só em produção e 4 só nas migrations;
  - 27 funções com o mesmo nome e código diferente;
  - também divergem 15 índices, 6 restrições, 11 colunas, 2 buckets e 1 tabela.

  Se não baterem, registrar o motivo em `S/research.md`, D5.
- [X] T036 [US2] Em `S/ferramentas/gerar.py`, gerar `S/divergencias.md` (contracts/artefatos-gerados.md) e incluir, em cada página de catálogo, as divergências do objeto.
- [X] T037 [US2] Classificar **todas** as divergências em `S/anotacoes/divergencias.toml`, com `classificacao` (`producao_vale | residuo_descartar | defeito_corrigir | aguardando_decisao`) e `justificativa`. Para cada uma das 27 funções com código diferente, preencher `resumo_codigo`, dizendo o que muda de comportamento entre as versões (FR-011). Políticas `e2e_test_*` que existem só em produção levam `residuo_descartar` e referência ao achado correspondente da US4.
- [X] T038 [US2] Validar: `python -m ferramentas.gerar` com **0 divergências não classificadas** (SC-003). Fazer commit.
  - **Resultado (2026-09-29)**: 180 divergências, todas classificadas — 124 `producao_vale`, 40
    `residuo_descartar`, 10 `defeito_corrigir` e 6 `aguardando_decisao` (confirmação de e-mail na
    aprovação, que depende da configuração de autenticação). Só 1 função ficou com código
    diferente, e só na forma (research D5). As políticas `e2e_test_*` existem nos dois lados, então
    não são divergência; seguem para o A-001. Destaque: em produção, `Leitura pública de perfis`
    ainda é `USING (true)`, porque essa parte da migration 137 não foi aplicada lá.

**Checkpoint**: ninguém mais precisa consultar as migrations do repositório para saber como é o banco.

---

## Phase 5: User Story 3 - A que módulo cada objeto pertence e em que ordem especificar (Priority: P2)

**Goal**: mapa objeto → módulo e ordem dos módulos derivada das dependências (FR-012 a FR-015).

**Independent Test**: `mapa-rastreabilidade.md` com 0 objetos sem atribuição (SC-002); `ordem-modulos.md` com 0 violações sem justificativa (SC-008).

### Tests for User Story 3 ⚠️

- [X] T039 [P] [US3] Escrever `S/ferramentas/testes/test_modulos.py` cobrindo:
  - objeto com dono;
  - objeto `fora_escopo`;
  - objeto sem nenhum dos dois, que aparece em "sem atribuição";
  - FK de módulo de ordem 1 para módulo de ordem 2, que é violação;
  - violação com `justificativa` anotada, que não conta;
  - módulo sem spec, cujos objetos aparecem como `LACUNA`.

### Implementation for User Story 3

- [X] T040 [US3] Implementar `S/ferramentas/modulos.py` até a T039 passar. Ele atribui dono a cada objeto (anotação direta ou herdada da tabela), calcula as dependências entre módulos a partir de `dependencias.py`, detecta violações de ordem e aceita a justificativa de exceção em `modulos.toml` (`[[excecao]]` com `de`, `para`, `justificativa`; documentar em `S/contracts/anotacoes.md`).
- [X] T041 [US3] Escrever `S/anotacoes/modulos.toml` com os 9 módulos de [research.md D6](./research.md#d6--módulos-organização-da-constituição-v210-ordem-pelas-dependências):
  - na ordem de especificação: `core` (1), `checklists` (2), `fiscalizacao` (3), `dtr` (4), `processo_sancionador` (5), `caters` (6);
  - sem objeto próprio no banco hoje: `catesa`, `portal_prestador` e `tramitacao`, com a `observacao` de cada um.

  Todos com `spec = ""`.
- [X] T042 [US3] Em `S/ferramentas/gerar.py`, gerar `S/mapa-rastreabilidade.md` e `S/ordem-modulos.md` (contracts/artefatos-gerados.md).
- [X] T043 [US3] Rodar o gerador. Para cada violação de ordem que as funções ou políticas revelarem (as FKs sozinhas não têm nenhuma): mover o objeto de módulo **ou** anotar `[[excecao]]` com justificativa. Chegar a 0 sem atribuição (SC-002) e 0 violações sem justificativa (SC-008). Se a ordem mudar, atualizar `S/research.md`, D6. Fazer commit.

**Checkpoint**: a próxima spec a escrever é a do primeiro módulo da ordem, e o mapa mostra o que falta.

---

## Phase 6: User Story 4 - Decidir sobre o que não deve ser herdado (Priority: P2)

**Goal**: achados com evidência, risco, opções, recomendação e decisão registrada (FR-016 a FR-018).

**Independent Test**: `achados.md` cobre toda a lista mínima de FR-016, cada achado com evidência nos inventários. Antes da primeira spec de módulo, 0 aguardando decisão (SC-006).

- [X] T044 [US4] Escrever `S/anotacoes/achados.toml` com, no mínimo, estes achados, todos com `situacao = "aguardando_decisao"`, e cada um com evidência (chaves e números), risco, opções e recomendação:
  - A-001: as 22 políticas `e2e_test_*` em produção;
  - A-002: dados de teste em produção (`respostas_determinacao.manifestacao_prestador` com "a", "aa"…, e outros encontrados no catálogo);
  - A-003: políticas duplicadas e as 2 de nome corrompido;
  - A-004: a view `caters_fiscalizacoes_disponiveis` sem `security_invoker`;
  - A-005: as 33 funções com permissão elevada;
  - A-006: os privilégios de `anon` em todas as tabelas e as 37 funções executáveis por `anon`/`PUBLIC`;
  - A-007: as 12 tabelas vazias (preservar a funcionalidade, sem dado a migrar);
  - A-008: o bucket público `logos-entidades`;
  - A-009: `catesa_ai_jobs` e as 4 funções que existem só nas migrations;
  - A-010: as câmaras `caterm` e `catesg`, sem correspondência no código.

  Incluir os achados que surgirem nas fases 3 a 5. Já levantados na fase 3 (numerar a partir de
  A-011; os detalhes estão nas anotações dos objetos citados):

  - **Corrigidos em produção em 2026-09-29** (registrar como decididos, com a migration):
    escalada de privilégio no cadastro (137); escrita sem login e acesso de conta não aprovada
    (138); prazos e respostas adulteráveis pelo prestador (139); view do CATERS sem login (140,
    complementa A-004); funções sem verificação, finalização pela chave de serviço e fila da
    CATESA ausente (141, complementa A-005, A-006 e A-009).
  - **Arquivos abertos a todo usuário ativo**: as políticas de `storage.objects` só olham o bucket e
    o perfil ativo; o prestador lê, troca e apaga qualquer arquivo dos buckets privados (termos,
    autos, relatórios, fotos, documentos de outras entidades). Decisão do usuário em 2026-09-29:
    registrar, não corrigir agora.
  - Portal da entidade monta endereço público para as fotos de `fotos_fiscalizacao`, que é privado.
  - AI assinado enviado pelo portal fica sem referência (nenhuma coluna candidata existe).
  - Envio de arquivos de termo tenta vários nomes de bucket até um aceitar.
  - Exclusão de usuário falha para quem tem registros (chaves estrangeiras sem `ON DELETE`).
  - "Drenagem" × "Drenagem Urbana" em `camara_from_servicos`.
  - Coordenador pode excluir perfis e alterar nome e e-mail de qualquer um pela API.
  - Vínculo do prestador gravado nos dois lados (perfil e entidade) sem transação.
  - `itens_checklist` versionado por inclusão (525 itens atuais, 243 versões antigas).
  - `latitude_inicio`, `longitude_inicio` e `tipo_unidade_nome` nunca gravados.
  - Políticas da equipe ignoram a câmara nas tabelas filhas.
  - Prestador lê unidades, NCs etc. da fiscalização sem ter termo.
  - Numeração de TN, AM e AI com condição de corrida e "DSB" fixo.
  - Defesa do auto não é salva; colunas `data_envio` e `data_limite_manifestacao` de autos não
    existem; `numero_tn` da remessa sempre vazio.
  - Tabelas sem uso: `julgamentos`, `manifestacoes_auto`, `fotos_evidencia`.
  - Dilação do CATERS grava `dilacao_solicitada`, valor que o tipo não tem (migration 123 supôs
    texto livre).
  - Excluir evento do histórico do CATERS não tem efeito.
  - Trabalhos de IA do CATERS nunca processados em produção.
  - Política "(DEV)" de `remessas_ai` deixa o prestador alterar remessas de outros.
  - `determinacoes.prazo` nunca preenchido, mas lido pela importação do CATERS e pela IA da CATESA.
  - `determinacoes_fill_origem` e a sobrecarga antiga de `obter_resumo_indicadores` sem uso.
  - IA da CATESA: botão aparece em termos de qualquer câmara; workers de IA publicados sem
    verificação de quem chama (`verify_jwt = false`); aplicar o veredito cria resposta com
    `dentro_prazo = true`.
- [X] T045 [US4] Em `S/ferramentas/gerar.py`, gerar `S/achados.md` e incluir, em cada página de catálogo, os achados que citam o objeto.
- [ ] T046 [US4] Apresentar os achados ao responsável pelo projeto e registrar em `S/anotacoes/achados.toml` cada decisão tomada (`situacao = "decidido"`, `decisao`, `decidido_por`, `decidido_em`). **Não alterar nada em produção** (FR-018): decisão de limpar produção vira trabalho separado. Regenerar e fazer commit.

**Checkpoint**: nenhum defeito conhecido será herdado sem decisão.

---

## Phase 7: User Story 5 - Formato padrão das specs de módulo e das jornadas (Priority: P3)

**Goal**: moldes para as specs seguintes (FR-019, FR-020; research D10).

**Independent Test**: um trecho de exemplo em cada molde. Um revisor encontra, para cada regra, o comportamento desejado, o atual, o motivo e as referências. Na jornada, um passo sem regra aparece como `LACUNA`.

- [X] T047 [P] [US5] Escrever `S/formatos/spec-modulo.md`: o molde de spec de módulo sobre o template de spec do Spec Kit. Cada regra é um bloco com:
  - `R-<modulo>-NNN`;
  - Comportamento desejado;
  - Comportamento atual (quando diferente);
  - Motivo da diferença;
  - Objetos do catálogo (chaves);
  - Origem (achado ou divergência).

  Incluir como exemplo uma regra real e curta, tirada do catálogo: a semântica append-only de `itens_checklist`.
- [X] T048 [P] [US5] Escrever `S/formatos/jornada.md`: o molde de jornada por perfil (fiscal, coordenador, administrador, prestador). Cada passo tem ação do usuário, resultado esperado e regras `R-...`. Passo sem regra é marcado `LACUNA`. Incluir como exemplo 3 passos da jornada "fiscal vistoria uma unidade offline", com um passo propositalmente em `LACUNA`.

**Checkpoint**: a primeira spec de módulo pode começar no molde.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T049 Rodar o [quickstart.md](./quickstart.md) completo, passos 1 a 5 e 7. No passo 7, simular um inventário alterado copiando o de produção e removendo um objeto; conferir que a anotação dele fica órfã (retorno 2) e que nenhuma outra se perde. Registrar o resultado em `S/quickstart.md`, seção final "Execução".
- [ ] T050 [P] `python -m ferramentas.varredura` na pasta inteira, com retorno 0 (SC-005).
- [ ] T051 [P] `python -m ferramentas.gerar --verificar`, com retorno 0 (SC-007).
- [ ] T052 Atualizar `S/spec.md` (Status: `Implemented`) e `S/checklists/requirements.md`. Marcar as tarefas concluídas neste arquivo e fazer commit.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)**: sem dependências.
- **Foundational (2)**: depende de T001–T003 e bloqueia todas as histórias.
- **US1 (3)**: depende da fase 2. É o MVP.
- **US2 (4)**: depende da fase 2. Pode andar em paralelo com a US1 (arquivos diferentes). A T036 inclui divergências nas páginas do catálogo, então depende da T014 e da T015.
- **US3 (5)**: depende da T013 (dependências) e das anotações de módulo da US1 (T020–T030).
- **US4 (6)**: depende das fases 3–5, porque os achados usam o catálogo, as divergências e o mapa como evidência.
- **US5 (7)**: independente depois da fase 2. Os exemplos usam trechos do catálogo, então é melhor fazer depois da T021.
- **Polish (8)**: depois de tudo.

### Within Each User Story

- Testes antes do código correspondente, falhando primeiro (T011, T012 → T013–T019; T032 → T033; T039 → T040).
- Em `gerar.py`, as tarefas que editam o mesmo arquivo (T014, T015, T019, T036, T042, T045) são sequenciais entre si. T016, T017 e T018 estão marcadas [P] por gerarem saídas diferentes, mas mexem no mesmo `gerar.py`. Com mais de um executor, cada uma deve ser uma função própria num módulo separado (`ferramentas/paginas_*.py`), chamada por `gerar.py`.
- Anotações (T020–T030) só dependem da T019, para ver o que falta.

### Parallel Opportunities

- Fase 1: T002 ∥ T003.
- Fase 2: T004 ∥ T006 ∥ T008 ∥ T010 (testes em arquivos diferentes).
- US1: T011 ∥ T012; T016 ∥ T017 ∥ T018 (ver nota acima); **T020–T030 todas em paralelo**, 11 frentes de anotação em arquivos distintos.
- US1 ∥ US2: T032–T035 podem andar junto com as anotações da US1.
- US5: T047 ∥ T048.

---

## Parallel Example: User Story 1

```bash
# Depois da T019 (estrutura gerada, sabendo o que falta anotar):
Task: "T020 Anotar tabelas do core em S/anotacoes/tabelas/"
Task: "T021 Anotar tabelas de checklists"
Task: "T022 Anotar tabelas de fiscalização"
Task: "T024 Anotar tabelas do processo sancionador"
Task: "T025 Anotar tabelas e view do CATERS"
Task: "T026 Anotar funções do core em S/anotacoes/funcoes/"
Task: "T027 Anotar funções da fiscalização"
Task: "T029 Anotar buckets em S/anotacoes/arquivos.toml"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Fases 1 e 2 (ferramentas e testes).
2. Fase 3 (US1): catálogo estrutural gerado (T019) e depois as anotações.
3. **STOP and VALIDATE**: quickstart, passo 6 (10 objetos sorteados, 10 de 10).

Com isso, o time já consulta o banco inteiro sem abri-lo.

### Incremental Delivery

1. Ferramentas → catálogo estrutural (retrato fiel do banco, ainda sem explicação).
2. Anotações por módulo (a completude sobe a cada commit).
3. Divergências classificadas (US2).
4. Mapa e ordem (US3).
5. Achados decididos (US4) e formatos (US5): condições para a primeira spec de módulo.

### Notas

- O volume está nas anotações (~600 objetos). As ferramentas são pequenas e existem para que esse
  texto não se perca nem se desalinhe do banco real.
- Cada anotação precisa de fonte. Anotação sem fonte vira `hipotese = true`, e a lista de hipóteses
  vai para revisão (T031).
