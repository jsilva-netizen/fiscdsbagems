# Idea Research: Sistema novo e próprio em Django, organizado em apps, sem o SISREG

- **Slug**: novo-sistema-django-apps
- **Created**: 2026-09-28
- **Evidence confidence (overall)**: medium — o lado do sistema atual foi medido diretamente no
  repositório (alta confiança); as decisões de contexto (descarte do SISREG, prazo, equipe,
  ausência de fila pendente na virada) vêm do relato do usuário e não foram verificadas em
  documento; volumes de dados de produção não foram medidos.

Fontes de contexto usadas: respostas do usuário às 11 perguntas do `intake.md`, dadas na
chamada deste comando (2026-09-28), citadas como **[usuário, 2026-09-28]**; e o repositório na
branch `migracao-sisreg` em `2f015a6`…`9a9a6b0`, citado por caminho.

## Users & Demand

- **Decisão tomada, não pedido de usuário final.** O descarte do SISREG é "definitivo, registrado"
  e abrange o SISREG inteiro, não só a integração — [usuário, 2026-09-28] (confidence: medium —
  o registro formal não foi visto nesta pesquisa).
- **Quem usa o sistema hoje:** perfis admin, coordenador, fiscal e prestador —
  [tests/e2e/fixtures/auth.ts, comentário de cabeçalho; src/pages/GerenciarUsuarios.jsx] (confidence: high).
- **Três diretorias e dez câmaras técnicas modeladas:** DSB (CATESA, CATERS, CRES), DTR (CATRANSP,
  CATERF, CATEFIS, CRET) e DGE (CATEGAS, CATENE, CREG) — [src/lib/camaras.js] (confidence: high).
- **Pedido explícito do usuário:** levantar e especificar *todo* o comportamento atual, a começar
  pelo banco, "nos mínimos detalhes, passo a passo", para replicar no sistema novo; exemplos citados:
  cadastro de unidades, motor de checklists, numeração automática de C, NC, R e D, geração de
  relatórios — [usuário, 2026-09-28] (confidence: high quanto ao pedido).
- Não há, nesta pesquisa, sinal de demanda dos usuários finais (fiscais, coordenadores,
  prestadores) sobre o sistema novo — ver Gaps.

## Prior Art

- **Avaliação anterior `django-refactor` (2026-09-17 → 2026-09-18), verdict "go" condicionado:**
  migrar o fiscdsbagems para app Django *dentro* do SISREG, com banco compartilhado. Motivação
  registrada: requisito externo do SISREG ("exige Django/Python e banco compartilhado para admitir
  o fiscdsbagems como app") e o risco de o sistema não ser implantado oficialmente sem isso —
  [.specify/assessments/django-refactor/decision.md, Scorecard]. Essa premissa externa deixa de
  existir com o descarte do SISREG [usuário, 2026-09-28].
- **A constituição v1.0.0 (2026-09-18) deriva daquela decisão** uma seção inteira ("Restrições
  Tecnológicas e de Integração"): banco compartilhado com o SISREG, `Entidade`/`Instrumento` do
  SISREG como fonte única, câmara técnica = `Subunidade`, referência opcional a `Acao` —
  [.specify/memory/constitution.md, linhas 79–104]. **Parte dela continua compatível com a ideia
  nova**: Django + DRF com JWT, PostgreSQL self-hosted, Celery + Redis, `django-storages`, SPA
  React/Vite separada com Dexie/IndexedDB, UUID gerado no cliente — [mesma seção] (confidence: high).
  A emenda será aprovada pelo usuário [usuário, 2026-09-28].
- **Spec 001 (camada de abstração de acesso a dados), agora parada** [usuário, 2026-09-28]:
  31 de 97 tarefas concluídas até a T031; T032 (motor de sync) com 3 de 5 partes migradas —
  [specs/001-data-access-abstraction/tasks.md]. O objetivo dela era trocar o backend do SPA atual
  sem reescrevê-lo; com um frontend novo [usuário, 2026-09-28], esse objetivo perde o consumidor.
  **O que ela produziu e continua servindo como insumo de levantamento:**
  - `inventario-acoplamento.md` (1133 linhas): leitura arquivo a arquivo dos pontos de acesso a dados;
  - `debitos-tecnicos-e-inconsistencias.md` (261 linhas): 10+ débitos com recomendação, entre eles
    numeração de TN/AM/auto não atômica, duas implementações independentes da geração de
    NC/D/R, `itens_checklist` append-only por design, máquinas de estado dentro de componentes de UI;
  - `rpcs-funcoes-e-triggers-postgres.md` (344 linhas): leitura das funções e triggers do banco,
    com `gerar_ncs_unidade` descrita como "a peça mais complexa do sistema" e triggers ainda
    "não lidos em profundidade";
  - suíte de testes: 4 e2e offline (ciclo completo com foto, fila pré-existente, reconciliação de
    exclusão remota, renovação de sessão) e 103 testes unitários — [tests/].
  (confidence: high)
- **A correção de reordenação de fotos (spec 002)** está em produção desde 2026-09-25 (PR #1) e
  documenta regras de ordem e identidade de fotos — [specs/002-fix-photo-drag-reorder/data-model.md].

## Market & Context

- **Custo de não fazer (relatado):** com o SISREG descartado, o caminho da avaliação anterior
  (app dentro do SISREG) deixa de existir; o sistema atual segue em Supabase —
  [usuário, 2026-09-28; decision.md do django-refactor] (confidence: medium).
- **O que os usuários usam hoje:** o fiscdsbagems em produção (branch `main`, deploy automático),
  SPA React + Supabase, com operação offline — [constituição, "Isolamento"; src/lib/offline/].
- **Origem do sistema atual:** gerado inicialmente na plataforma Base44 (`package.json` "name":
  "base44-app", dependência `@base44/sdk`, `src/lib/NavigationTracker.jsx`) e evoluído
  manualmente desde então — [package.json] (confidence: high). Primeiro commit em 2026-03-13;
  436 commits em todas as branches, 418 na `main` — [git log] (confidence: high).

## Data & Constraints

**Banco atual (medido nas migrations em `supabase/migrations/`):**
- 120 migrations, 10.477 linhas de SQL — (confidence: high)
- 37 tabelas criadas nas migrations, em grupos: fiscalização de campo (`fiscalizacoes`,
  `unidades_fiscalizadas`, `respostas_checklist`, `nao_conformidades`, `constatacoes_manuais`,
  `determinacoes`, `recomendacoes`, `respostas_determinacao`, `fotos_evidencia`), cadastros
  (`municipios`, `prestadores_servico`, `contratos`, `tipos_unidade`, `itens_checklist`,
  `tipos_ocorrencia_dtr`, `diretorias`, `camaras_tecnicas`, `profiles`), processo sancionador
  (`autos_infracao`, `manifestacoes_auto`, `pareceres_tecnicos`, `julgamentos`,
  `termos_notificacao`, `remessas_ai`, `remessas_ai_itens`), CATERS (7 tabelas `caters_*`),
  CATESA (`catesa_ai_jobs`), relatórios (`relatorios_jobs`) e auditoria (`audit_logs`) — (confidence: high)
- 165 `CREATE POLICY` e 261 `DROP POLICY` ao longo do histórico (o total de policies vigentes
  exige leitura do estado final, não a soma) — (confidence: high quanto às contagens; medium
  quanto ao estado vigente)
- 34 funções e 33 triggers distintos — (confidence: high)
- 9 edge functions (4.148 linhas), todas de processamento assíncrono: `caters_ai_*`,
  `catesa_ai_*`, `relatorios_*` (enqueue / status / worker) — [supabase/functions/] (confidence: high)
- 6 buckets de arquivos usados pelo código: `relatorios_fiscalizacao`, `logos-entidades`,
  `documentos-prestadores`, `kml-rodovias`, `fotos_fiscalizacao`, `evidencias-determinacoes` —
  [grep `storage.from` em src/ e supabase/functions/] (confidence: high)
- **As migrations não reconstruíam o banco sozinhas até 2026-09-23:** foram corrigidos "6 bugs
  pré-existentes na pasta de migrations, achados ao reconstruir o schema do zero" — [commit
  `54cd4b3`] (confidence: high). Implicação: o schema de produção pode divergir das migrations em
  pontos ainda não encontrados — ASSUMPTION (confidence: medium).
- O código usa duas coleções sem `CREATE TABLE` nas migrations: `caters_fiscalizacoes_disponiveis`
  (provável view) e `unidades` — ver Gaps. `fotos_evidencia` existe nas migrations e não é usada
  pelo código — [comparação migrations × `.from()` no código] (confidence: high quanto ao fato).

**Frontend atual:**
- 170 arquivos, 42.815 linhas em `src/`; 44 páginas (23.646 linhas); 45 componentes fora de `ui/` —
  (confidence: high)
- Núcleo offline: 6.532 linhas em `src/lib/offline/`, com `syncEngine.ts` (2.862) e
  `repository.ts` (2.460) como os dois maiores arquivos do projeto — (confidence: high)
- Maiores telas: `VistoriarUnidade.jsx` (2.275), `GerenciarTermos.jsx` (1.780),
  `CatersProcessoDetalhe.jsx` (1.501), `VistoriarOcorrenciaDTR.jsx` (1.494), `Relatorios.jsx` (1.021)
  — (confidence: high)

**Maturidade funcional por câmara técnica:**
- Com funcionalidade real: fiscalização DSB (telas compartilhadas `Fiscalizacoes`,
  `ExecutarFiscalizacao`, `VistoriarUnidade`), CATERS (painel de 488 linhas + processos,
  recomendações, detalhe), CATESA (191 linhas), CATERF/DTR (110 linhas + fluxo DTR próprio de
  ocorrências, mapa e KML) — [src/pages/] (confidence: high).
- **Sem funcionalidade: 7 das 10 câmaras** (CRES, CATRANSP, CATEFIS, CRET, CATEGAS, CATENE, CREG).
  Os painéis delas são o mesmo esqueleto de 57 linhas, com uma lista estática de "Funcionalidades
  previstas" em cartões desabilitados (ex.: CREG: revisões tarifárias, análise de manifestação,
  pareceres econômicos, câmara de julgamento) — [src/pages/CregDashboard.jsx, diff contra
  CateneDashboard.jsx] (confidence: high). **Para essas, não há lógica atual a levantar.**

**Numeração automática (exemplo citado pelo usuário), onde vive hoje:**
- No banco: `gerar_ncs_unidade`, redefinida em 11 migrations; `gerar_numero_auto`,
  `gerar_numero_am` — [supabase/migrations/] (confidence: high).
- No frontend online: `numerationHelper.jsx` (`gerarNumeroConstatacao`, `gerarNumeroNC`,
  `gerarNumeroRecomendacao`, `gerarNumeroDeterminacao`, `calcularProximaNumeracao`) —
  [src/components/utils/numerationHelper.jsx] (confidence: high).
- No frontend offline: `recomputeConstatacoesNumeracao`, `recomputeRecomendacoesNumeracao`,
  `recomputeDeterminacoesNumeracao` — [src/lib/offline/repository.ts] (confidence: high).
- Já documentado como débito: numeração de TN/AM/auto não atômica; `finalizar_fiscalizacao` gera
  o número do termo por ranking; duas implementações independentes da geração de NC/D/R —
  [debitos-tecnicos-e-inconsistencias.md, itens 1, 2 e 4] (confidence: high).

**Restrições declaradas para o sistema novo** [usuário, 2026-09-28]:
- Prazo de 90 dias; equipe de desenvolvimento da AGEMS; sistema oficial, mantido pelo time.
- Banco próprio em PostgreSQL. Core com autenticação, entidades e instrumentos.
- Apps previstos: core; checklists (motor comum); um por diretoria/câmara técnica com suas
  especificidades (ex.: DTR com mapa e KML), cada um com layout próprio de relatórios; autos de
  infração + termos de notificação + análise da manifestação + pareceres técnicos; portal do
  prestador; tramitação de documentos/dados; análises com IA embutidas nos demais.
- Frontend React novo, no mesmo modelo offline (IndexedDB e sincronização como hoje).
- Migração completa dos dados de produção depois; nenhum dispositivo terá fila local não
  sincronizada na virada.
- Ordem de trabalho: primeiro a estrutura do banco atual; depois, sequencialmente, specs
  detalhadas de cada módulo.

## Evidence Against the Idea

Esta seção registra o que pesa contra, ou contra a forma proposta — não é veredito.

- **Prazo versus tamanho medido.** O sistema atual levou ~6,5 meses (2026-03-13 → hoje, 436 commits)
  para chegar ao ponto em que está, partindo de código gerado por plataforma — [git log;
  package.json]. O plano novo reescreve backend e frontend, especifica "tudo nos mínimos detalhes"
  antes, e acrescenta 7 câmaras que hoje não têm funcionalidade, em 90 dias
  [usuário, 2026-09-28]. Não há, nesta pesquisa, estimativa do time que sustente o prazo —
  ASSUMPTION de risco (confidence: medium).
- **"Replicar tudo" inclui replicar defeitos conhecidos.** Parte do comportamento atual está
  documentada como débito ou inconsistência (numeração não atômica, lógica duplicada entre banco e
  cliente, controles de segurança fora da RLS, máquinas de estado dentro de componentes de UI) —
  [debitos-tecnicos-e-inconsistencias.md]. Uma especificação que descreva o *como* atual sem
  separar regra de negócio de acidente de implementação levaria esses defeitos ao sistema novo —
  ASSUMPTION (confidence: medium).
- **O código não é fonte completa da verdade.** As migrations tinham 6 defeitos que impediam
  reconstruir o schema até 2026-09-23 [commit `54cd4b3`]; há comportamento em triggers ainda não
  lido em profundidade [rpcs-funcoes-e-triggers-postgres.md, seção 8]; e 7 câmaras só existem como
  lista de intenções. Levantar a partir do código cobre o que existe, não o que as câmaras
  precisam — (confidence: high quanto aos fatos).
- **A garantia de "nenhuma fila local pendente na virada" depende de procedimento, não de
  código.** O modelo offline atual mantém dado de produção só no dispositivo até sincronizar
  (outbox em Dexie) — [src/lib/offline/syncEngine.ts; constituição, Princípio II]. A constituição
  exige um "plano verificável de drenagem dos dispositivos em campo" antes de qualquer virada —
  [constituição, "Portões antes de mudança irreversível", item 2]. A afirmação do usuário é uma
  meta; nesta pesquisa não foi encontrado mecanismo que a garanta — (confidence: medium).
- **Trabalho descartado.** A spec 001 tinha 31 tarefas concluídas e uma suíte de testes construída
  para validar a troca de backend do SPA atual; com frontend novo, o valor dela passa a ser de
  levantamento, não de código reaproveitado — [specs/001-data-access-abstraction/tasks.md]
  (confidence: high quanto ao fato; a perda é parcial, ver Prior Art).

## Gaps & Open Questions

- [NEEDS CLARIFICATION: documento ou ato que registra a decisão de descartar o SISREG — para citar
  na emenda da constituição]
- [NEEDS CLARIFICATION: volumes de produção — registros por tabela, quantidade e tamanho de
  arquivos por bucket, usuários ativos, dispositivos em campo. Necessário para dimensionar a
  migração de dados e a janela de virada]
- [NEEDS CLARIFICATION: o schema de produção coincide com o das migrations? Só um inventário
  direto do banco de produção responde — é também o "primeiro passo" pedido pelo usuário]
- [NEEDS CLARIFICATION: `unidades` e `caters_fiscalizacoes_disponiveis` — o que são no banco
  (view, tabela criada fora das migrations, nome de tabela local do Dexie)?]
- [NEEDS CLARIFICATION: para as 7 câmaras sem funcionalidade, de onde vêm os requisitos — quem
  são os interlocutores de cada uma?]
- [NEEDS CLARIFICATION: o que os usuários atuais (fiscais, coordenadores, prestadores) esperam do
  sistema novo — continuidade exata ou oportunidade de mudar fluxos?]
- [NEEDS CLARIFICATION: tamanho do time e dedicação — base para testar o prazo de 90 dias]
- [NEEDS CLARIFICATION: o sistema atual continua recebendo correções em produção durante os 90
  dias? Se sim, o levantamento precisa acompanhar essas mudanças]
- [NEEDS CLARIFICATION: as specs do levantamento descrevem o comportamento atual (como é) ou já
  o comportamento desejado no sistema novo (como deve ser), com os débitos resolvidos?]
- [NEEDS CLARIFICATION: o que fazer com a branch `migracao-sisreg` e os 7 commits locais sem push
  da spec 001 — arquivar, publicar para referência, descartar]

## Sources

Todas as fontes são internas (repositório e relato do usuário); nenhuma URL foi consultada.

- Relato do usuário, respostas às 11 perguntas do intake — 2026-09-28
- `.specify/assessments/django-refactor/decision.md`, `intake.md`, `research.md`
- `.specify/memory/constitution.md` (v1.0.0)
- `specs/001-data-access-abstraction/tasks.md`, `inventario-acoplamento.md`,
  `debitos-tecnicos-e-inconsistencias.md`, `rpcs-funcoes-e-triggers-postgres.md`
- `specs/002-fix-photo-drag-reorder/data-model.md`
- `supabase/migrations/*.sql`, `supabase/functions/`
- `src/` (páginas, `src/lib/camaras.js`, `src/lib/offline/`, `src/components/utils/numerationHelper.jsx`)
- `package.json`; `git log` (todas as branches)
