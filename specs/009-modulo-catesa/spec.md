# Feature Specification: Módulo CATESA — app da câmara de saneamento (água, esgoto e drenagem)

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec do módulo `catesa` da spec 003, o **app da CATESA**, câmara técnica da DSB que
fiscaliza abastecimento de água, esgotamento sanitário e drenagem urbana (R-core-014). Escrita no
molde `specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes: o catálogo da spec 003 (o
módulo `catesa` não tem objeto próprio; a fila de IA da CATESA está fora do escopo, A-039), as telas
do sistema atual (painel da CATESA, títulos das telas de termos e autos), as specs 004 a 007 e a
constituição v2.6.2.

## Contexto

A CATESA é a câmara que mais fiscaliza hoje: das 26 fiscalizações de produção, 18 são de água e
esgoto. Ela fiscaliza por **vistoria de unidades** (estações de tratamento, poços, reservatórios,
elevatórias, gestão administrativa), com o checklist de cada tipo de unidade, e o resultado vai no
relatório "TERMO DE VISTORIA AGEMS/DSB". Depois da fiscalização vêm o termo de notificação, a
resposta do prestador, a análise da manifestação e, quando cabe, o auto de infração.

No banco atual, a CATESA não tem tabela própria: tudo o que ela usa é comum (fiscalização,
checklists, processo sancionador). O que é dela está espalhado em código:
- os tipos de unidade de água e esgoto no cadastro único de checklists;
- o layout do relatório e a marca d'água da DSB fixos no código da fiscalização;
- o painel da CATESA, que conta termos e autos;
- "CATESA" fixo como título das telas de termos, autos e análise;
- a análise da resposta ao termo por IA, que não será refeita (A-039).

No sistema novo, a CATESA é um **app de câmara pequeno** (constituição v2.6.0 a v2.6.2): a vistoria
por unidade é do app de fiscalização comum (spec 007), e o app da CATESA só **pluga e configura** o
que é dela:

| App comum | O que a CATESA pluga ou configura |
|---|---|
| checklists | o modelo "Checklist por tipo de unidade" da CATESA e os catálogos (tipos de unidade) de água, esgoto e drenagem (spec 005, "Modelos de hoje") |
| fiscalização | a configuração da câmara: layout genérico "vistoria por registro de campo" com o título "TERMO DE VISTORIA AGEMS/DSB", marca d'água da DSB, limite de imprecisão (R-fiscalizacao-025) |
| planejamento | a configuração da câmara: tipos de atividade e marcação das mudanças (R-planejamento-018) |
| core | o painel da CATESA no início (R-core-025) |

A CATERS, a outra câmara da DSB que fiscaliza, tem o próprio app (spec da CATERS), com a mesma
forma de vistoria e o fluxo próprio de processos e recomendações.

Fica fora desta spec: a vistoria, o relatório, a numeração e tudo o que é comum (spec 007); o
termo, a resposta, a análise e o auto (spec do processo sancionador); o motor de checklists
(spec 005).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A CATESA nasce configurada como hoje (Priority: P1)

Na implantação, a CATESA já tem o modelo de checklist, os tipos de unidade de água, esgoto e
drenagem com os itens de hoje, o relatório "TERMO DE VISTORIA AGEMS/DSB" e a marca d'água
"<código>, <município> - MS", de modo que o primeiro fiscal a vistoriar encontra tudo como no
sistema atual.

**Why this priority**: preserva a funcionalidade atual sem nada chumbado nos apps comuns
(Princípio I; constituição v2.6.0).

**Independent Test**: num ambiente recém-implantado, um fiscal da CATESA inicia uma fiscalização de
água e esgoto, adiciona uma "Estação de Tratamento de Água", responde o checklist com os mesmos
itens de hoje, tira uma foto com a marca d'água da DSB e gera o relatório com o título "TERMO DE
VISTORIA AGEMS/DSB Nº ...", tudo sem nenhuma configuração manual.

**Acceptance Scenarios**:

1. **Given** a implantação, **When** o coordenador da CATESA abre as configurações da câmara,
   **Then** vê o modelo "Checklist por tipo de unidade", os tipos de unidade dos serviços dela e a
   configuração de relatório e marca d'água da DSB.
2. **Given** a configuração inicial, **When** o coordenador a altera na tela, **Then** a mudança vale
   só para a CATESA (a CATERS não muda).

---

### User Story 2 - Painel da CATESA (Priority: P2)

O coordenador, o fiscal e o diretor da DSB veem no início o painel da CATESA: fiscalizações (em
andamento e finalizadas), termos de notificação por situação (pendentes de emissão, aguardando
assinatura, aguardando resposta, prazo vencido, respondidos com análise pendente) e autos de
infração por situação (gerados, enviados, em análise, finalizados), cada número abrindo a lista
filtrada.

**Why this priority**: é a tela de entrada da câmara hoje.

**Independent Test**: com 3 termos aguardando resposta e 1 com prazo vencido, o painel mostra 3 e 1,
e tocar em "Prazo vencido" abre a lista de termos filtrada; um fiscal da CATERS não vê o painel da
CATESA.

**Acceptance Scenarios**:

1. **Given** termos de várias câmaras, **When** o painel da CATESA é aberto, **Then** conta só os da
   CATESA.
2. **Given** o diretor da DSB, **When** abre o início, **Then** vê o painel da CATESA junto com o da
   CATERS.

---

### Edge Cases

- Tipo de unidade com água e esgoto juntos (3 em produção): é da CATESA (os dois serviços são dela).
- Tipo de unidade de drenagem urbana: da CATESA (R-core-014, com a correção do A-021).
- Fiscalização com serviços de água e de resíduos (não há em produção): cada câmara tem a sua
  fiscalização (R-fiscalizacao-001; viagem conjunta no planejamento).
- Processo sancionador ainda não implantado: o painel mostra só as fiscalizações, e os blocos de
  termos e autos aparecem quando o app do processo sancionador existir.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app da CATESA MUST entregar como configuração inicial o modelo "Checklist por tipo de
  unidade" da CATESA e os catálogos dos tipos de unidade dos serviços dela, com os itens migrados
  (R-catesa-002).
- **FR-002**: O app MUST entregar a configuração inicial de fiscalização da CATESA: layout, título do
  documento, marca d'água e limite de imprecisão iguais aos de hoje (R-catesa-003).
- **FR-003**: O app MUST entregar a configuração inicial de planejamento da CATESA (R-catesa-004).
- **FR-004**: O app MUST registrar o painel da CATESA nas telas do core, contando só o alcance do
  usuário (R-catesa-005).
- **FR-005**: O app MUST NOT ter tabela, tela ou regra que repita os apps comuns, nem gravar em
  modelos de outros apps (R-catesa-001, R-catesa-007).
- **FR-006**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Configuração inicial da CATESA**: o pacote de configuração que o app entrega na implantação —
  modelo de catálogo, catálogos, configuração de fiscalização e de planejamento. Depois da
  implantação, cada peça é mantida em CATESA › Configuração, nas telas dos apps comuns que aparecem
  ali (R-core-025).
- **Painel da CATESA**: contribuição de tela registrada no core, que lê as consultas da
  fiscalização e do processo sancionador.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. O módulo `catesa` não tem objeto
próprio no catálogo; as regras citam os objetos de outros módulos que descrevem o comportamento de
hoje, e a fila de IA fora do escopo.

### R-catesa-001 — O app da CATESA

- **Comportamento desejado**: o módulo `catesa` é o app da CATESA. Não tem modelo de dados próprio
  além do registro das peças: entrega configuração inicial aos apps comuns (R-catesa-002 a
  R-catesa-004) e registra o painel (R-catesa-005). A vistoria, o relatório e o fluxo do termo e do
  auto são dos apps comuns. Se a CATESA vier a precisar de algo que os apps comuns não oferecem, a
  peça entra neste app ou, se for útil a outras câmaras, de forma genérica no app comum
  (constituição v2.6.0).
- **Comportamento atual**: a CATESA não existe como parte separada: seus tipos de unidade estão no
  cadastro único, o relatório e a marca d'água da DSB estão no código da fiscalização, e o nome
  "CATESA" está fixo nas telas de termos e autos.
- **Motivo da diferença**: um app por câmara, apps comuns sem nada de câmara (constituição v2.6.0 a
  v2.6.2; decisão do responsável, 2026-09-30).
- **Objetos do catálogo**: `coluna:fiscalizacoes.tipo_modulo`
- **Origem**: constituição v2.6.2; decisão do responsável, 2026-09-30.

### R-catesa-002 — Modelo e catálogos de checklist da CATESA

- **Comportamento desejado**: o app entrega, como configuração inicial do motor de checklists, o
  modelo "Checklist por tipo de unidade" da CATESA (campos, respostas Sim, Não e Não se aplica, saídas e planilha
  descritos na spec 005, "Modelos de hoje") e os catálogos dos tipos de unidade cujos serviços são
  da CATESA (água, esgoto, drenagem urbana), com os itens migrados. Em produção, são 25 dos 33 tipos
  (14 de água, 8 de esgoto e 3 de água e esgoto). A CATESA mantém o modelo e os catálogos na tela do
  motor (R-checklists-015), independentemente da CATERS.
- **Comportamento atual**: os 33 tipos estão num cadastro único, sem câmara, separados só pelo texto
  dos serviços; o formulário e a regra das saídas são os mesmos para todas as câmaras, no código.
- **Motivo da diferença**: catálogos por câmara (A-026) e modelo como configuração (spec 005).
- **Objetos do catálogo**: `tabela:tipos_unidade`, `coluna:tipos_unidade.servicos_aplicaveis`,
  `tabela:itens_checklist`
- **Origem**: spec 005 (R-checklists-015, "Modelos de hoje"); A-026 (decidido).

### R-catesa-003 — Configuração de fiscalização da CATESA

- **Comportamento desejado**: o app entrega a configuração inicial de fiscalização da CATESA
  (R-fiscalizacao-025, research F13 da spec 007):
  - layout: o genérico do app de fiscalização ("vistoria por registro de campo"), que reproduz o
    relatório de hoje (informações da fiscalização, resumo executivo, uma seção por unidade com
    constatações, NCs, determinações com prazo, recomendações e registros fotográficos);
  - título do documento: "TERMO DE VISTORIA AGEMS/DSB";
  - marca d'água: "{codigo}, {municipio} - {uf}", "{data} {hora}", "{coordenadas}";
  - limite de imprecisão do GPS: 20 m.

  O coordenador da CATESA mantém a configuração na tela da fiscalização.
- **Comportamento atual**: o relatório da DSB, com o título "TERMO DE VISTORIA AGEMS/DSB Nº", e a
  marca d'água "<código da unidade>, <município> - MS" estão fixos no código, escolhidos pelo tipo
  de módulo da fiscalização.
- **Motivo da diferença**: layout e marca d'água como configuração da câmara (R-fiscalizacao-011,
  R-fiscalizacao-016, R-fiscalizacao-025).
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.fotos_unidade`, `tabela:relatorios_jobs`
- **Origem**: R-fiscalizacao-025.

### R-catesa-004 — Configuração de planejamento da CATESA

- **Comportamento desejado**: o app entrega a configuração inicial de planejamento da CATESA
  (R-planejamento-018): os tipos de atividade "Fiscalização" (é fiscalização de campo),
  "Apresentação" (como a apresentação de proposta de revisão tarifária) e "Educação ambiental", a
  marcação padrão dos tipos de mudança e o layout do cronograma do Anexo I.
- **Comportamento atual**: o cronograma da DSB é uma planilha (Anexo I), que junta viagens da CATESA
  e da CATERS.
- **Motivo da diferença**: spec 006 (planejamento por câmara, com viagem conjunta).
- **Objetos do catálogo**: — (o planejamento não existe no sistema atual)
- **Origem**: spec 006.

### R-catesa-005 — Painel da CATESA

- **Comportamento desejado**: o app registra no início (R-core-025), para os usuários da CATESA e o
  diretor da DSB, o painel da CATESA:
  - **fiscalizações**: em andamento e finalizadas (consultas da fiscalização);
  - **termos de notificação**: total emitido, pendentes de emissão, aguardando assinatura do
    prestador, aguardando resposta, prazo vencido, respondidos com análise pendente;
  - **autos de infração**: total, gerados (pendentes de remessa), enviados, em análise,
    finalizados.

  Cada número abre a lista correspondente, filtrada. Os blocos de termos e autos leem as consultas
  do processo sancionador e aparecem quando esse app existir. Só entram registros que o usuário
  alcança.
- **Comportamento atual**: o painel da CATESA lê todos os termos e autos e filtra no navegador pelo
  texto "CATESA" da câmara do termo e pela câmara do auto; os links abrem as telas de termos, autos
  e análise de manifestação.
- **Motivo da diferença**: painel registrado pelo app da câmara (R-core-025); filtro no servidor, pelo
  alcance (A-026).
- **Objetos do catálogo**: `tabela:termos_notificacao`, `tabela:autos_infracao`
- **Origem**: R-core-025; A-026 (decidido).

### R-catesa-006 — Análise por IA não é refeita

- **Comportamento desejado**: o sistema novo não tem a análise da resposta ao termo por IA da CATESA
  (botão "Analisar com IA" na análise da resposta, fila de trabalhos, resultado para revisão).
- **Comportamento atual**: a análise da resposta ao termo pode pedir uma análise por IA, processada
  por funções externas, com o resultado mostrado para revisão.
- **Motivo da diferença**: decisão do responsável (2026-09-30): a IA não é migrada nem refeita
  (A-039; constituição, "Inteligência artificial").
- **Objetos do catálogo**: `tabela:catesa_ai_jobs`, `funcao:claim_catesa_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`,
  `funcao:catesa_ai_jobs_set_updated_at()`
- **Origem**: A-039 (decidido).

### R-catesa-007 — O app da CATESA não escreve nos apps comuns

- **Comportamento desejado**: a configuração inicial é entregue pelas funções de configuração de
  cada app comum (carga na implantação), e o painel só lê. O app não grava em modelos de outros apps
  por nenhum outro caminho; um teste falha se gravar.
- **Comportamento atual**: não se aplica (não há app separado).
- **Motivo da diferença**: constituição, "Todo dado tem um app dono".
- **Objetos do catálogo**: —
- **Origem**: constituição v2.5.0 e v2.6.0.

## Telas do sistema atual

| Tela | Ação | Regra |
|---|---|---|
| Painel da CATESA (`src/pages/CatesaDashboard.jsx`) | Contadores de termos e autos por situação, com links para termos, autos e análise de manifestação | R-catesa-005 |
| Análise da resposta (`src/pages/AnalisarResposta.jsx`) | "Analisar com IA" (`CatesaAiAnalysisDialog`) | R-catesa-006 (retirada) |
| Termos, autos e análise (`GerenciarTermos.jsx`, `GestaoAutos.jsx`, `AnalisarResposta.jsx`) | Título "CATESA — Câmara Técnica de Saneamento Básico" fixo; câmara "CATESA" como padrão | fora: processo_sancionador (o título vem da câmara do usuário, pelo core) |
| Seletor de câmara do administrador (`src/lib/camaras.js`) | CATESA como câmara padrão da DSB | fora: core (R-core-025, início por papel) |

## Migração

Não há dados próprios da CATESA a migrar: o módulo não tem objeto no catálogo. Os tipos de unidade
e itens da CATESA migram pelos checklists (spec 005, que os coloca nos catálogos da CATESA pelos
serviços), e as fiscalizações, termos e autos pelos apps donos. A fila de IA (`catesa_ai_jobs`, 0
linhas em produção) está fora do escopo (A-039). Não há mapa de migração para este módulo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Num ambiente recém-implantado, um fiscal da CATESA faz uma vistoria completa e gera o
  relatório com o mesmo título, marca d'água e itens de checklist de hoje, com 0 configurações
  manuais.
- **SC-002**: Os 25 tipos de unidade de água, esgoto e drenagem ficam nos catálogos da CATESA, e 0 nos
  da CATERS.
- **SC-003**: Alterar a configuração da CATESA muda 0 configurações da CATERS.
- **SC-004**: O painel da CATESA conta 0 registros de outras câmaras.
- **SC-005**: O app da CATESA grava 0 vezes direto em modelos de outros apps (verificado por teste).

## Assumptions

- **Processo sancionador comum**: termo, resposta, análise e auto são do app comum do processo
  sancionador, usado pela CATESA e por outras câmaras; o que for específico da CATESA nesse fluxo,
  se houver, entra neste app pelos pontos de extensão que aquela spec definir.
- **Configuração idêntica à da CATERS**: a configuração inicial de fiscalização e o modelo de
  checklist das duas câmaras da DSB são iguais hoje; cada app entrega a sua cópia, que pode
  divergir depois (constituição v2.6.1).
- **CRES**: a terceira câmara da DSB não fiscaliza no sistema hoje; terá app próprio se vier a
  fiscalizar.
