---
description: "Tarefas do módulo core do sistema novo da AGEMS"
---

# Tasks: Módulo core

**Input**: Design documents from `specs/004-modulo-core/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: incluídos e obrigatórios. A spec exige teste automatizado para toda regra de acesso
(FR-009, SC-001) e a constituição, Princípio III, exige teste que falhe quando a regra for violada.
Escreva os testes de cada história antes da implementação e confirme que falham.

**Organization**: tarefas agrupadas pelas histórias da spec (US1 a US7); a US8 (central de avisos) fica
na Phase 10, com as demais peças comuns que outros apps usam.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história da spec (US1…US7)

## Convenções para quem executar

- **Repositório**: todas as tarefas são no **repositório novo** do sistema (research R1), não no
  `fiscdsbagems`. Caminhos relativos à raiz dele: `backend/` (Django) e `frontend/` (React).
- **App do core**: `backend/apps/core/`, abreviado `C/` abaixo. Testes em `backend/tests/core/`,
  abreviado `T/`.
- **Pontos de entrada**: outros apps só importam `C/consultas.py` (leitura). Escrita só em
  `C/servicos.py` e views do próprio core (research R3). Todo serviço de escrita chama a
  auditoria (research R10).
- **Acesso**: toda rota declara o escopo e a entrada da matriz (research R7, R8); rota sem os dois
  reprova a varredura de rotas.
- **Referências**: regras `R-core-NNN` da [spec](./spec.md); campos e restrições do
  [data-model](./data-model.md); rotas de [contracts/api-core.md](./contracts/api-core.md); quem
  pode o quê em [contracts/matriz-acesso.md](./contracts/matriz-acesso.md).
- **Dados**: nenhuma tarefa acessa o banco ou o armazenamento de produção do sistema atual
  (Princípio IV). A migração lê um dump (Phase 11).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: esqueleto do repositório novo, ambiente local e ferramentas

- [ ] T001 Criar a estrutura do repositório novo conforme o plan.md: `backend/config/`, `backend/apps/core/` (com `models/`, `acesso/`, `autenticacao/`, `sincronizacao/`, `arquivos/`, `auditoria/`, `api/`, `management/commands/`), `backend/tests/core/`, `frontend/src/core/`, `frontend/src/offline/`, `frontend/src/shared/`, `frontend/tests/`; `README.md` na raiz explicando a organização e apontando para a constituição e as specs
- [ ] T002 Criar `compose.yaml` na raiz com PostgreSQL 16, Redis 7, MinIO (com dois buckets, `privado` e `publico`, este com leitura pública) e Mailpit (porta web 8025); `.env.example` com as variáveis de todos eles
- [ ] T003 Inicializar o projeto Django em `backend/` com Python 3.12 e Django 5.2 LTS: `backend/pyproject.toml` com as dependências do plan.md (djangorestframework 3.16, djangorestframework-simplejwt, celery 5.4, redis, django-storages[s3], psycopg, pytest, pytest-django, factory_boy, import-linter); settings em `backend/config/settings.py` lidas do ambiente, `TIME_ZONE = "America/Campo_Grande"`, `USE_TZ = True`, idioma `pt-br`
- [ ] T004 [P] Configurar o Celery em `backend/config/celery.py` com Redis e registrar em `backend/config/__init__.py`
- [ ] T005 [P] Configurar o django-storages em `backend/config/settings.py` com dois armazenamentos nomeados, `privado` e `publico`, apontando para o MinIO do `compose.yaml` (research R9)
- [ ] T006 [P] Configurar o pytest em `backend/pyproject.toml` (`DJANGO_SETTINGS_MODULE`, banco de teste) e criar `backend/tests/conftest.py` vazio
- [ ] T007 [P] Criar `backend/.importlinter` com o contrato inicial: `apps.core` não importa nenhum outro app de `apps.*` (constituição v2.5.0; research R3); documentar no topo do arquivo como cada app novo acrescenta o seu contrato
- [ ] T008 [P] Inicializar o frontend em `frontend/` com Vite, React 18, TypeScript, Dexie 4 e Vitest (`frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`)
- [ ] T009 [P] Configurar formatação e lint: ruff em `backend/pyproject.toml`, eslint e prettier em `frontend/`; script único `scripts/verificar.sh` que roda ruff, `lint-imports`, pytest, eslint e vitest

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: modelos que precisam existir antes da primeira migração, o arcabouço de acesso,
auditoria e sincronização, e a base do cliente offline. Nenhuma história começa antes.

**⚠️ CRITICAL**: `AUTH_USER_MODEL` precisa estar definido na primeira migração do projeto.

### Modelos de base (primeira migração)

- [ ] T010 Criar `Diretoria` e `CamaraTecnica` em `C/models/estrutura.py`: `Diretoria.id` texto (sigla), `nome` obrigatório; `CamaraTecnica.id` texto (sigla), `nome` obrigatório, `diretoria` FK obrigatória com `on_delete=PROTECT` ("não pode ser removida enquanto tiver câmara")
- [ ] T011 Criar `Servico` em `C/models/estrutura.py`: `codigo` texto (chave), `nome`, `diretoria` FK obrigatória, `camara` FK opcional ("câmara técnica responsável pelo serviço, da mesma diretoria")
- [ ] T012 Criar `Papel` em `C/models/papel.py`: `codigo` texto (chave), `nome`, `app` texto, e `vinculo_diretoria`, `vinculo_camara`, `vinculo_entidade` com os valores `obrigatorio`, `opcional`, `proibido` (research R4)
- [ ] T013 Criar `Entidade` mínima em `C/models/entidade.py` com `id` UUID (aceita o id enviado pelo aparelho), `nome`, `ativa` (padrão verdadeiro), `criado_em`, `atualizado_em`; os demais campos entram na US4 (T062)
- [ ] T014 Criar `Usuario` em `C/models/usuario.py` como `AUTH_USER_MODEL` (em `backend/config/settings.py`): `id` UUID, `email` único sem diferenciar maiúsculas (restrição com `Lower`) e usado como login, `nome` obrigatório, `papel` FK obrigatória sem padrão, `diretoria`, `camara` e `entidade` FKs opcionais, `ativo` (padrão verdadeiro), `desativado_em` opcional, `criado_em`, `atualizado_em`; gerenciador com `create_user`/`create_superuser` por e-mail
- [ ] T015 Gerar a primeira migração em `C/migrations/0001_initial.py` e conferir que `Usuario` é o modelo de usuário desde ela

### Acesso (research R7, R8)

- [ ] T016 Criar `C/acesso/escopos.py` com o tipo de escopo que cada rota declara (`referencia`, `camara`, `diretoria_leitura`, `entidade`, `proprio`, `admin`) e a função que aplica o escopo a um queryset a partir do usuário da requisição, antes de qualquer outra lógica; registro fora do escopo não aparece (a view responde 404)
- [ ] T017 Criar `C/acesso/matriz.py`: estrutura declarativa por rota e operação com o resultado esperado por papel (a mesma legenda de [matriz-acesso.md](./contracts/matriz-acesso.md)) e a classe de permissão do DRF que lê essa declaração; rota sem declaração recusa tudo
- [ ] T018 Criar `T/test_varredura_rotas.py`: percorre todas as rotas do projeto e falha se alguma não tiver escopo e entrada na matriz, e se alguma responder a requisição sem login além de `auth/entrar`, `auth/verificar`, `auth/reenviar-codigo`, `auth/primeiro-acesso`, `auth/recuperar` e `auth/redefinir` (SC-003)
- [ ] T019 Criar o gerador de casos da matriz em `backend/tests/matriz.py`: para uma rota declarada, produz os casos parametrizados papel × câmara (própria, outra) × operação, mais "sem login" (401), e compara com a declaração (usado por todos os testes de acesso)
- [ ] T020 [P] Criar fábricas em `backend/tests/fabricas.py` (factory_boy) para `Diretoria`, `CamaraTecnica`, `Servico`, `Papel`, `Entidade` e `Usuario` de cada papel, e fixtures de usuários por papel e câmara em `backend/tests/conftest.py`

### Auditoria (research R10)

- [ ] T021 Criar `RegistroAuditoria` em `C/models/auditoria.py`: `id` UUID, `tabela`, `registro_id` UUID, `operacao` (inclusão/alteração/exclusão), `autor` FK opcional, `credencial` FK opcional (criada na Phase 10; deixar o campo previsto como texto até lá ou criar o modelo vazio agora), `autor_nome`, `autor_email`, `dados_antes` e `dados_depois` JSON, `camara` FK opcional, `criado_em`
- [ ] T022 Criar a migração com gatilho do PostgreSQL que recusa `UPDATE` e `DELETE` em `RegistroAuditoria` (`C/migrations/`), e `T/test_auditoria_imutavel.py` provando que alterar ou apagar um registro falha
- [ ] T023 Criar `C/auditoria/registro.py` com `auditar(operacao, instancia, antes, depois, autor, credencial=None)`, que congela nome e e-mail do autor e a câmara do registro; nas tarefas internas o autor é quem pediu (R-core-022)

### Pontos de entrada, erros e referência

- [ ] T024 Criar `C/consultas.py` e `C/servicos.py` vazios com a documentação do papel de cada um (research R3)
- [ ] T025 [P] Configurar o formato de erro `{"erro", "mensagem", "campos"}` em `C/api/erros.py` (manipulador de exceções do DRF em `backend/config/settings.py`) e o prefixo `/api/v1/` em `backend/config/urls.py`
- [ ] T026 Criar o comando `carregar_referencias` em `C/management/commands/carregar_referencias.py`, idempotente: 3 diretorias (`dsb`, `dtr`, `dge`), as 10 câmaras (`catesa`, `caters`, `cres` na DSB; `catransp`, `caterf`, `catefis`, `cret` na DTR; `categas`, `catene`, `creg` na DGE; sem `caterm` e `catesg`), os 9 serviços com diretoria (DSB: Abastecimento de Água, Esgotamento Sanitário, Limpeza Urbana, Manejo de Resíduos Sólidos, Drenagem Urbana; DTR: Rodovias; DGE: Energia Elétrica, Gás Canalizado, Iluminação Pública; câmara: água, esgoto e drenagem urbana → `catesa`, limpeza urbana e resíduos sólidos → `caters`, as demais conforme o responsável indicar), os 5 papéis com as regras de vínculo do data-model e os 79 municípios de MS
- [ ] T027 [P] Criar `C/fixtures/municipios_ms.json` com os 79 municípios de MS (nome e código IBGE de 7 dígitos) e `C/models/municipio.py` com `Municipio` (`id` UUID, `nome` único, `codigo_ibge` único de 7 dígitos)

### Sincronização (research R11)

- [ ] T028 Criar `RemocaoSincronizavel` em `C/models/sincronizacao.py` (`modelo`, `registro_id`, `removido_em`) e o registro de modelos sincronizáveis em `C/sincronizacao/registro.py`, onde cada app declara modelo, serializador, escopo e serviço de escrita
- [ ] T029 Criar em `C/sincronizacao/protocolo.py` o baixar (`desde` = marca do servidor; devolve alterados e remoções só do escopo) e o enviar (lote de operações com UUID do aparelho, idempotente, cada uma pelo serviço do app dono, resultado `aceita` ou `recusada` com `erro` por operação)
- [ ] T030 Criar `T/test_sincronizacao_protocolo.py` com um modelo de teste: repetir a mesma operação não duplica; alteração fora do escopo é recusada; baixar só traz o escopo; remoção aparece em `remocoes`

### Cliente offline (base)

- [ ] T031 [P] Criar o banco local em `frontend/src/offline/db.ts` (Dexie) com as tabelas dos cadastros do core, a fila de envio e a marca da última sincronização
- [ ] T032 [P] Criar o cliente da API em `frontend/src/shared/api.ts`: token de acesso em memória, renovação automática, e, se a renovação for recusada, encerrar a sessão **sem apagar** a fila local (research R6)
- [ ] T033 Criar o motor de sincronização em `frontend/src/offline/sincronizacao.ts`: envia a fila pelo `POST sync/<app>`, marca cada operação conforme o resultado, e baixa pelo `GET sync/<app>?desde=`

**Checkpoint**: base pronta; as histórias podem começar.

---

## Phase 3: User Story 1 - Administrador cadastra e mantém os usuários (Priority: P1) 🎯 MVP

**Goal**: só o administrador cria, altera, desativa e reativa usuários, com papel e vínculos
válidos (R-core-001, 002, 003, 004, 007, 008, 009).

**Independent Test**: com usuários autenticados à força nos testes, o administrador cria um fiscal
da CATESA, um diretor da DSB e dois prestadores da mesma entidade; o coordenador é recusado em
toda operação de gestão; desativar um usuário com registros preserva a autoria.

### Tests for User Story 1 ⚠️

- [ ] T034 [P] [US1] Testes da matriz das rotas `usuarios*` e `eu` em `T/test_usuarios_acesso.py`, gerados por `backend/tests/matriz.py` a partir de [matriz-acesso.md](./contracts/matriz-acesso.md)
- [ ] T035 [P] [US1] Testes de validação em `T/test_usuarios_validacao.py`: papel obrigatório e só dos existentes; vínculos conforme as regras do papel (prestador sem entidade é recusado; fiscal com câmara de outra diretoria é recusado; diretor sem diretoria é recusado); e-mail repetido é recusado mesmo com o outro desativado; o último administrador ativo não é desativado nem perde o papel; o administrador não se desativa; duas contas de prestador na mesma entidade são aceitas (R-core-004)
- [ ] T036 [P] [US1] Testes de ciclo de vida em `T/test_usuarios_ciclo.py`: desativar bloqueia os tokens de renovação e revoga os aparelhos; excluir usuário com registro responde 409; o usuário altera o próprio nome e não altera e-mail, papel nem vínculos (R-core-008); a equipe lista usuários só com nome, papel e câmara e o prestador não lista (R-core-009); cada operação gera registro de auditoria

### Implementation for User Story 1

- [ ] T037 [US1] Implementar a validação de vínculos em `C/models/usuario.py` (método `clean` lendo as regras do `Papel`, câmara da mesma diretoria) e as proteções do último administrador
- [ ] T038 [US1] Implementar em `C/servicos.py` os serviços `criar_usuario`, `alterar_usuario`, `desativar_usuario`, `reativar_usuario` e `excluir_usuario` (409 com registro vinculado), cada um auditado (T023)
- [ ] T039 [US1] Implementar a tarefa `enviar_primeiro_acesso` em `C/tasks.py` (link de uso único com o gerador de tokens do Django; e-mail pelo backend SMTP, research R14) e chamá-la em `criar_usuario` e na rota de reenvio
- [ ] T040 [US1] Implementar serializadores e views de `usuarios`, `usuarios/{id}/desativar`, `reativar`, `reenviar-primeiro-acesso` e `eu` (GET e PATCH só de `nome`) em `C/api/usuarios.py`, com os campos reduzidos para a equipe, escopo e matriz declarados
- [ ] T041 [US1] Implementar em `C/consultas.py` a consulta de usuários para outros apps (nome, papel, câmara; nunca e-mail)
- [ ] T042 [P] [US1] Criar as telas de usuários do administrador em `frontend/src/core/usuarios/` (lista com filtros, formulário com vínculos conforme o papel escolhido, desativar e reativar)

**Checkpoint**: gestão de usuários completa e testada.

---

## Phase 4: User Story 2 - Usuário entra com verificação em duas etapas (Priority: P1)

**Goal**: entrada por e-mail e senha, com código no e-mail no primeiro acesso e em aparelho novo,
e aparelho confirmado para os acessos seguintes e o uso sem rede (R-core-005, R-core-006).

**Independent Test**: o roteiro do [quickstart](./quickstart.md), passo 3.

### Tests for User Story 2 ⚠️

- [ ] T043 [P] [US2] Testes de entrada em `T/test_autenticacao_entrada.py`: senha certa e aparelho confirmado emite tokens; sem aparelho, cria desafio e envia código; resposta idêntica para e-mail inexistente e senha errada; usuário desativado é recusado sem revelar que existe; limite de tentativas responde 429
- [ ] T044 [P] [US2] Testes do código em `T/test_autenticacao_codigo.py`: código de 6 dígitos guardado só como hash; vence em 10 minutos; após 5 tentativas o desafio é encerrado; pedir novo código invalida o anterior; código certo cria o aparelho confirmado e devolve `aparelho_token`; o código nunca aparece em log
- [ ] T045 [P] [US2] Testes de sessão e aparelhos em `T/test_autenticacao_sessao.py`: renovação com rotação; renovação recusada depois de desativar o usuário, revogar o aparelho ou trocar a senha; `auth/sair` bloqueia o token; primeiro acesso e redefinição de senha por link de uso único; `auth/recuperar` responde 202 sempre

### Implementation for User Story 2

- [ ] T046 [P] [US2] Criar `AparelhoConfirmado` em `C/models/autenticacao.py`: `usuario`, `rotulo`, `segredo_hash` (o segredo não é guardado), `confirmado_em`, `ultimo_uso_em`, `revogado_em`
- [ ] T047 [P] [US2] Criar `DesafioVerificacao` em `C/models/autenticacao.py`: `usuario`, `codigo_hash` ("6 dígitos, só o hash"), `expira_em` ("criação + 10 minutos"), `tentativas` ("até 5"), `usado_em`, `substituido_em`
- [ ] T048 [US2] Implementar em `C/autenticacao/fluxo.py` entrar, verificar, reenviar código, primeiro acesso, recuperar e redefinir (research R5), com código por gerador criptográfico e envio pela tarefa `enviar_codigo` em `C/tasks.py`
- [ ] T049 [US2] Configurar o SimpleJWT em `backend/config/settings.py`: acesso de 15 minutos, renovação de 30 dias, rotação e lista de bloqueio; ligar a revogação de aparelhos e o bloqueio de tokens à desativação e à troca de senha
- [ ] T050 [US2] Configurar o throttling do DRF para `auth/entrar`, `auth/verificar` e `auth/recuperar` por conta e por endereço em `backend/config/settings.py`
- [ ] T051 [US2] Implementar as views `auth/*`, `eu/senha`, `eu/aparelhos` e `usuarios/{id}/aparelhos` em `C/api/autenticacao.py` e `C/api/usuarios.py`, com matriz declarada
- [ ] T052 [P] [US2] Criar as telas de entrada, código, primeiro acesso, recuperação e "meus aparelhos" em `frontend/src/core/acesso/`, guardando o `aparelho_token` no banco local e mantendo o app utilizável sem rede com a sessão existente

**Checkpoint**: entrada completa; com a US1, o MVP de acesso funciona de ponta a ponta.

---

## Phase 5: User Story 3 - Cada usuário só alcança os dados da sua área (Priority: P1)

**Goal**: isolamento por câmara, alcance do diretor, do prestador e negação por padrão, provados
por teste (R-core-010 a R-core-013).

**Independent Test**: usuários de duas câmaras não alcançam registros um do outro por nenhuma rota
nem pela sincronização; o diretor lê a diretoria e não escreve; sem login, nada responde além da
entrada.

### Tests for User Story 3 ⚠️

- [ ] T053 [P] [US3] Criar um app de teste com um modelo operacional com `camara` em `backend/tests/apps/operacional_teste/` e testes em `T/test_isolamento_camara.py`: fiscal e coordenador leem e alteram só a própria câmara (outra responde 404, inclusive para escrita); administrador alcança todas; registro sem câmara só o administrador vê (edge case de dados legados)
- [ ] T054 [P] [US3] Testes do diretor em `T/test_escopo_diretor.py`: lê qualquer registro das câmaras da sua diretoria, não escreve (403/404), não vê outras diretorias
- [ ] T055 [P] [US3] Testes do prestador em `T/test_escopo_prestador.py`: só registros da própria entidade; dois prestadores da mesma entidade veem o mesmo; nada de outra entidade
- [ ] T056 [P] [US3] Teste de sincronização em `T/test_sincronizacao_escopo.py`: `GET sync/...` de um fiscal não traz registros de outra câmara; `POST sync/...` com registro de outra câmara é recusado

### Implementation for User Story 3

- [ ] T057 [US3] Implementar em `C/acesso/escopos.py` as regras por papel: administrador tudo; coordenador e fiscal a própria câmara; diretor as câmaras da diretoria só leitura, com gancho para aprovações que outros apps declararem (R-core-012); prestador a própria entidade; papéis de outros apps pelo que o app declarar (R-core-023)
- [ ] T058 [US3] Aplicar o escopo também em `C/sincronizacao/protocolo.py` (baixar e enviar) e na emissão de endereços de arquivo
- [ ] T059 [US3] Expor em `C/consultas.py` a função de escopo para os apps seguintes (`escopo_do_usuario(usuario, tipo)`) e documentar o uso

**Checkpoint**: fronteiras de acesso provadas; todas as histórias seguintes herdam os escopos.

---

## Phase 6: User Story 4 - Equipe mantém o cadastro das entidades reguladas (Priority: P2)

**Goal**: cadastro completo das entidades, inclusive sem rede, com documentos privados, logotipo
público e desativação em vez de exclusão (R-core-016 a R-core-019, R-core-021).

**Independent Test**: [quickstart](./quickstart.md), passo 5, itens 1 a 4.

### Tests for User Story 4 ⚠️

- [ ] T060 [P] [US4] Testes da matriz das rotas `entidades*` em `T/test_entidades_acesso.py`
- [ ] T061 [P] [US4] Testes de regras em `T/test_entidades_regras.py`: CNPJ obrigatório com dígitos verificadores válidos e único (409 no repetido); excluir entidade com registro vinculado responde 409 e desativar mantém tudo consultável; documento só por endereço assinado de 5 minutos e só para quem alcança a entidade; logotipo só PNG ou JPEG até 2 MB, documento só PDF, PNG ou JPEG até 20 MB, tipo conferido pelo conteúdo; falha no envio do logotipo não grava imagem no cadastro; sincronização cria a entidade com o UUID do aparelho; toda operação auditada

### Implementation for User Story 4

- [ ] T062 [US4] Completar `Entidade` em `C/models/entidade.py`: `razao_social` obrigatória, `cnpj` obrigatório "14 dígitos com dígitos verificadores válidos, único", `natureza` (concessionária / órgão ou entidade pública), `servicos` M2M com `Servico`, `endereco`, `cidade`, `estado` (padrão `MS`), `cep`, `responsavel`, `cargo`, `email_contato`, `telefone`, `website`, `observacoes`, `logotipo` (chave no repositório público), `criado_por`
- [ ] T063 [P] [US4] Criar `DocumentoEntidade` em `C/models/entidade.py`: `entidade` FK protegida, `nome`, `tipo_mime` ("PDF, PNG ou JPEG, conferido pelo conteúdo"), `tamanho` ("até 20 MB"), `arquivo`, `enviado_por`, `enviado_em`
- [ ] T064 [US4] Implementar em `C/arquivos/` o envio com checagem de tipo pelo conteúdo e de tamanho, os repositórios `privado` e `publico`, chaves aleatórias e o endereço assinado de 5 minutos (research R9)
- [ ] T065 [US4] Implementar em `C/servicos.py` criar, alterar, desativar, reativar e excluir entidade (409 com registro vinculado, consultando os apps registrados), logotipo e documentos, todos auditados, e registrar `Entidade` no registro de sincronização (T028)
- [ ] T066 [US4] Implementar as views `entidades*` em `C/api/entidades.py` com escopo (equipe lê todas; prestador só a própria) e matriz declarada
- [ ] T067 [US4] Expor em `C/consultas.py` a consulta de entidades para outros apps (dados de exibição, serviços, situação)
- [ ] T068 [P] [US4] Criar as telas de entidades em `frontend/src/core/entidades/` (lista por diretoria e serviço, detalhe, formulário, logotipo, documentos), gravando pela fila offline

**Checkpoint**: entidades completas, inclusive offline.

---

## Phase 7: User Story 5 - Equipe mantém os contratos das entidades (Priority: P2)

**Goal**: contratos com número, entidade e vigência, inclusive sem rede, estendíveis por apps de
diretoria (R-core-020).

**Independent Test**: [quickstart](./quickstart.md), passo 5, item 1 (contrato) e item 4.

### Tests for User Story 5 ⚠️

- [ ] T069 [P] [US5] Testes em `T/test_contratos.py`: matriz das rotas `contratos*` (prestador recebe lista vazia); número obrigatório; desativar a entidade não apaga o contrato; excluir contrato referenciado por outro app responde 409; sincronização com UUID do aparelho; auditoria

### Implementation for User Story 5

- [ ] T070 [US5] Criar `Contrato` em `C/models/contrato.py`: `id` UUID (do aparelho), `entidade` FK protegida, `numero` obrigatório, `vigente`, `criado_em`, `atualizado_em`
- [ ] T071 [US5] Implementar os serviços de contrato em `C/servicos.py` (auditados, registrados na sincronização) e as views em `C/api/contratos.py` com matriz declarada
- [ ] T072 [US5] Expor em `C/consultas.py` a consulta de contratos e documentar em `C/consultas.py` como um app de câmara estende o contrato com registro próprio ligado a ele (o da CATERF, com rodovia e traçado)
- [ ] T073 [P] [US5] Criar as telas de contratos em `frontend/src/core/contratos/`

**Checkpoint**: contratos prontos para o app da CATERF estender.

---

## Phase 8: User Story 6 - Todos usam os mesmos dados de referência (Priority: P3)

**Goal**: diretorias, câmaras, serviços, municípios e papéis servidos pelo servidor, mantidos só
pelo administrador (R-core-014, R-core-015).

**Independent Test**: [quickstart](./quickstart.md), passo 6, item 2.

### Tests for User Story 6 ⚠️

- [ ] T074 [P] [US6] Testes em `T/test_referencia.py`: matriz das rotas `diretorias`, `camaras`, `servicos`, `municipios`, `papeis`; 10 câmaras sem `caterm` e `catesg`; coordenador não altera município; `carregar_referencias` é idempotente

### Implementation for User Story 6

- [ ] T075 [US6] Implementar as views de referência em `C/api/referencia.py` (leitura para usuário ativo; escrita e `papeis` só administrador) e registrar diretorias, câmaras, serviços e municípios na sincronização
- [ ] T076 [P] [US6] Criar a tela de municípios (lista e busca) e as listas de escolha lidas do banco local em `frontend/src/core/referencia/`, sem lista de câmaras fixa no código

**Checkpoint**: referência servida pelo servidor, sem cópia no código.

---

## Phase 9: User Story 7 - Consultar quem mudou o quê (Priority: P3)

**Goal**: histórico imutável consultável dentro do escopo (R-core-022).

**Independent Test**: um fiscal altera uma entidade e vê a alteração no histórico; um fiscal de
outra câmara não vê o histórico de registros da primeira.

### Tests for User Story 7 ⚠️

- [ ] T077 [P] [US7] Testes em `T/test_auditoria_consulta.py`: matriz de `auditoria` (diretor e prestador recusados); fiscal só vê auditoria de registros da própria câmara; cadastros comuns (entidades, contratos) visíveis à equipe; alterações de usuário (troca de papel, desativação) registradas e visíveis ao administrador; nome e e-mail do autor continuam depois de desativado

### Implementation for User Story 7

- [ ] T078 [US7] Implementar a consulta de auditoria com escopo e filtros `tabela`, `registro`, `desde`, `ate` em `C/api/auditoria.py`
- [ ] T079 [P] [US7] Criar o componente de histórico reutilizável em `frontend/src/shared/historico/`

**Checkpoint**: todas as histórias entregues.

---

## Phase 10: Extensão para outras áreas e integrações

**Purpose**: provar que o core aceita apps novos sem mudar (R-core-023, R-core-024, R-core-025, R-core-026; constituição
v2.4.0 e v2.5.0)

- [ ] T080 Criar `CredencialSistema` em `C/models/credencial.py` (`nome`, `prefixo`, `chave_hash`, `escopos` lista, `criada_por`, `criada_em`, `ultimo_uso_em`, `revogada_em`) e ligar `RegistroAuditoria.credencial` a ela
- [ ] T081 Implementar a autenticação `Authorization: Api-Key <chave>` em `C/acesso/credenciais.py`, aceita só em rotas marcadas "integração", com escopos só de leitura por padrão e auditoria com a credencial como autor; views `credenciais*` só para administrador em `C/api/credenciais.py`
- [ ] T082 Testes em `T/test_credenciais.py`: chave mostrada uma vez; credencial revogada é recusada; credencial não alcança rota não marcada nem escreve; chamada auditada
- [ ] T083 Teste de extensão em `T/test_extensao_apps.py` com um app de teste `backend/tests/apps/area_teste/` que acrescenta um papel por migração de dados e lê entidades por `C/consultas.py`: o papel novo é cadastrado com as regras de vínculo dele; os papéis existentes continuam com o mesmo alcance (a matriz do core passa igual); o papel novo não consegue escrever em entidade (constituição v2.4.0)
- [ ] T084 Acrescentar em `backend/.importlinter` o contrato do app de teste e um teste em `T/test_dependencias.py` que falha se `apps.core` importar qualquer app posterior
- [ ] T093 Criar o registro de contribuições de tela em `frontend/src/shared/extensoes.ts`: cada app do frontend registra itens de menu, painéis do início por papel, contadores da lista de entidades, abas do detalhe da entidade e entradas das Definições, cada um com os papéis que o veem; o menu e as telas `frontend/src/core/inicio/`, `frontend/src/core/entidades/` e `frontend/src/core/definicoes/` montam só o que está registrado, sem importar nenhum app (R-core-025)
- [ ] T095 [US8] Criar `Aviso` (`usuario`, `tipo`, `app`, `titulo` obrigatório, `texto`, `referencia_app`, `referencia_modelo`, `referencia_id`, `criado_em`, `lido_em`, `email_enviado_em`) e `PreferenciaAviso` (`usuario`, `tipo`, `email`; único por usuário e tipo) em `C/avisos/models.py`, e o registro de tipos em `C/avisos/registro.py` (`registrar_tipo(codigo, nome, app, email_padrao, email_obrigatorio)`; código único, prefixado pelo app) (R-core-026)
- [ ] T096 [US8] Implementar `enviar_aviso(tipo, destinatarios, titulo, texto, referencia)` em `C/servicos.py`: resolve usuários, `(papel, camara)` e `(papel, diretoria)` só entre ativos; cria um aviso por destinatário numa transação; agenda o e-mail em `C/tasks.py` depois do commit, respeitando a preferência e o `email_obrigatorio`; tarefa diária que apaga avisos lidos há mais de um ano
- [ ] T097 [US8] Views `avisos`, `avisos/{id}/lido`, `avisos/lidos`, `avisos/tipos` e `eu/preferencias-avisos` em `C/api/avisos.py`, com a matriz declarada (só o próprio usuário); incluir os avisos do usuário no `GET sync/core` e a marcação de lido no `POST sync/core` em `C/sincronizacao/`
- [ ] T098 [P] [US8] Testes em `T/test_avisos.py`: app de teste registra um tipo e manda aviso para os coordenadores de uma câmara; só eles veem; marcar como lido não afeta o outro; administrador não lê aviso alheio; e-mail respeita preferência e tipo obrigatório (Mailpit); aviso de registro fora do alcance abre como 404; marcação de lido sem rede chega pela sincronização (SC-011)
- [ ] T099 [P] [US8] Criar a central de avisos e o contador de não lidos no cabeçalho em `frontend/src/core/avisos/`, lendo do banco local, com a tela de preferências
- [ ] T094 Testes em `frontend/src/shared/extensoes.test.ts` e regra de importação do lint do frontend: um app de teste registra uma aba no detalhe da entidade e uma entrada nas Definições, que aparecem só para os papéis declarados; retirá-lo não quebra as telas do core; `frontend/src/core/` importar `frontend/src/<app posterior>/` reprova o lint (SC-010)

---

## Phase 11: Migração dos dados do core (SC-007)

**Purpose**: carregar os dados de produção a partir de um dump, preservando identificadores, com
conferência registro a registro (Princípio I; research R13)

- [ ] T085 Criar o comando `migrar_core` em `C/management/commands/migrar_core.py`, que lê um dump de produção (nunca a produção) e carrega, preservando UUIDs: diretorias, as 10 câmaras em uso, os 79 municípios, as 9 entidades (`ativo`/`status` viram `ativa`; `tipo` não é levado; `tipo_servico` vira `servicos`; logotipos copiados para o repositório público; logotipo gravado como imagem embutida é convertido em arquivo), os 2 contratos (parte do core), os usuários (sem senha; vínculo do prestador só no usuário; papel e câmara conforme a tabela de ajustes do responsável) e os 19.966 registros de auditoria
- [ ] T086 Criar a tabela de ajustes em `backend/migracao/ajustes_core.toml` para o responsável preencher antes da carga: câmara dos coordenadores e fiscais sem câmara, destino da conta de autenticação sem perfil (produção tem 8 contas e 7 perfis) e ids dos registros de teste do A-002 a não migrar
- [ ] T087 Implementar a opção `--conferir` do `migrar_core`, com relatório registro a registro por identificador (carregado, carregado como legado com o motivo, ignorado com motivo, pendente) e falha se houver pendência. A conferência cobre:
  - valores: compara, campo a campo, a origem transformada pelo mapa (`specs/003-base-dados-producao/anotacoes/migracao/core.toml`) com o que foi gravado (MIG-2);
  - arquivos: checksum de cada arquivo copiado e ligação à mesma entidade (MIG-3);
  - volumes descartados (MIG-5).
- [ ] T088 Testes em `T/test_migrar_core.py` com um dump sintético pequeno (sem dado real): identificadores preservados; `caterm` e `catesg` ignorados com motivo; usuário sem senha e com e-mail de primeiro acesso não enviado automaticamente; auditoria importada imutável; conferência acusa registro faltando, valor alterado e arquivo com checksum diferente; CNPJ repetido carregado como legado, não recusado

---

## Phase 12: Polish & Cross-Cutting Concerns

- [ ] T089 [P] Documentar em `README.md` do repositório novo como rodar, testar e acrescentar um app (contrato no import-linter, `consultas`, `servicos`, matriz de acesso, registro na sincronização)
- [ ] T090 [P] Revisar mensagens de erro e textos das telas em português, sem revelar existência de e-mail ou de registro fora do escopo
- [ ] T091 Rodar o [quickstart](./quickstart.md) completo (passos 1 a 7) e registrar o resultado ao final dele
- [ ] T092 Rodar `scripts/verificar.sh` (ruff, `lint-imports`, pytest, eslint, vitest) com retorno 0 e conferir SC-001 a SC-008 da spec

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependência.
- **Foundational (Phase 2)**: depende da Setup; bloqueia todas as histórias. T014 e T015 antes de
  qualquer outra migração.
- **US1, US2, US3 (P1)**: dependem da Foundational. US1 e US2 podem andar em paralelo; o teste de
  ponta a ponta de US1 ("cada um consegue entrar") usa a US2. US3 usa os usuários da US1 nas
  fixtures, mas pode começar junto com fixtures próprias.
- **US4 (P2)**: depende da US3 (escopos) e da sincronização da Foundational.
- **US5 (P2)**: depende da US4 (contrato aponta para entidade).
- **US6 (P3)**: depende só da Foundational; pode andar em paralelo com US4 e US5.
- **US7 (P3)**: depende da auditoria da Foundational e dos serviços das histórias que geram
  registros (US1, US4, US5).
- **Phase 10**: depende da US3 e da US4. A central de avisos (T095 a T099) depende da US1 (usuários e
  papéis) e da sincronização da Foundational, e vem antes do planejamento, que é o primeiro app a
  usá-la.
- **Phase 11 (migração)**: depende de US1, US4, US5, US6 e US7 (todos os modelos).
- **Polish**: depois de tudo.

### Within Each User Story

- Testes primeiro, falhando; depois modelos, serviços, views e telas.
- Toda view nova entra na matriz e passa na varredura de rotas (T018).

## Parallel Execution Examples

- **Setup**: T004, T005, T006, T007, T008 e T009 juntos, depois de T003.
- **Foundational**: T020, T025, T027, T031 e T032 em paralelo com os modelos; T016 e T017 antes de
  T018 e T019.
- **US1**: T034, T035 e T036 juntos; T042 (tela) em paralelo com T037–T041.
- **US2**: T043, T044 e T045 juntos; T046 e T047 juntos; T052 em paralelo com T048–T051.
- **US3**: T053, T054, T055 e T056 juntos.
- **US4**: T060 e T061 juntos; T063 em paralelo com T062; T068 em paralelo com T064–T067.
- **Entre histórias**: US6 em paralelo com US4 e US5.

## Implementation Strategy

### MVP (P1)

1. Setup e Foundational.
2. US1 (usuários), US2 (entrada com código) e US3 (isolamento).
3. **Parar e validar**: quickstart passos 2, 3, 4 e 6.1. Nesse ponto o sistema novo tem acesso
   seguro de ponta a ponta, e os apps seguintes (checklists, planejamento, fiscalização) já podem
   começar sobre ele.

### Incremental

- US4 e US5 (entidades e contratos) liberam o planejamento e a fiscalização, que apontam para eles.
- US6 e US7 completam referência e histórico.
- Phase 10 prova a extensão para outras áreas antes do primeiro app de área.
- Phase 11 só é executada perto da virada, com o dump de produção mais recente.
