# Feature Specification: Módulo CATERS — app da câmara de resíduos sólidos e limpeza urbana

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec do módulo `caters` da spec 003, o **app da CATERS**, câmara técnica da DSB que
fiscaliza manejo de resíduos sólidos e limpeza urbana (R-core-014). Escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes: o catálogo da spec 003 (módulo
`caters`: 7 tabelas, 1 view, 2 funções, 3 gatilhos, 26 políticas, 4 tipos), os achados A-004,
A-031, A-032, A-033 e A-039, as telas da CATERS do sistema atual, as specs 004 a 007 e 009
(CATESA), e a constituição v2.6.2. Depende só de core e fiscalização (ordem da spec 003).

## Contexto

A CATERS fiscaliza os municípios como titulares dos serviços de limpeza urbana e manejo de
resíduos sólidos. A vistoria é igual à da CATESA: unidades (aterro, unidade de triagem, transbordo,
coleta) com o checklist de cada tipo e o relatório "TERMO DE VISTORIA AGEMS/DSB". Em produção, as
fiscalizações da CATERS têm o mesmo módulo de origem das da CATESA, porque ele segue a diretoria.

Depois da fiscalização, a CATERS tem um fluxo próprio, o **processo de acompanhamento**:
1. abre um processo administrativo para o município, ligado à fiscalização;
2. importa as recomendações e determinações da fiscalização;
3. envia o relatório e o termo pelos Correios, com aviso de recebimento (AR);
4. registra a resposta do município e o cronograma de adequação;
5. concede dilações de prazo;
6. acompanha o cumprimento de cada recomendação, com prazo, evidência e resposta do titular;
7. encerra o processo.

Tudo com linha do tempo e documentos.

Produção tem 2 processos (Alcinópolis e Três Lagoas) e 27 recomendações acompanhadas. As demais
tabelas estão vazias. O sistema atual tem defeitos nesse fluxo:
- a dilação grava uma situação inexistente e não atualiza o prazo (A-031);
- "excluir" evento do histórico não tem efeito (A-032);
- qualquer usuário ativo mexe nas dilações;
- os avisos do painel são calculados na tela.

No sistema novo, o app da CATERS **pluga e configura** nos apps comuns o mesmo que a CATESA (spec
009), com a sua própria cópia, e é **dono do processo de acompanhamento**, que só a CATERS usa hoje:

| App comum | O que a CATERS pluga, configura ou lê |
|---|---|
| checklists | modelo "Checklist por tipo de unidade" da CATERS e os catálogos de resíduos e limpeza urbana |
| fiscalização | configuração da câmara (relatório "TERMO DE VISTORIA AGEMS/DSB", marca d'água da DSB); lê fiscalizações finalizadas, recomendações, determinações e relatório vigente pelas consultas |
| planejamento | configuração da câmara |
| core | painel da CATERS; tipos de aviso na central de avisos; município e entidade |

Fica fora desta spec: a vistoria e o relatório (spec 007); o termo de notificação e o auto do
processo sancionador (a CATERS também emite termos, contados no painel); a análise por IA
(A-039).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Abrir o processo e importar as recomendações da fiscalização (Priority: P1)

A equipe da CATERS abre o processo de acompanhamento com o número do processo administrativo, o
município titular, o objeto e o técnico responsável, e o liga a uma fiscalização finalizada da
CATERS. As recomendações e determinações da fiscalização entram no processo com prazo, sem
duplicar.

**Why this priority**: é o início do acompanhamento, e o elo com a fiscalização.

**Independent Test**: com uma fiscalização finalizada da CATERS que tem 10 recomendações e 3
determinações, o técnico abre um processo de teste para Três Lagoas e liga a fiscalização:
entram 13 itens com prazo; ligar de novo não duplica.

**Acceptance Scenarios**:

1. **Given** uma fiscalização finalizada da CATERS, **When** o técnico a liga ao processo, **Then**
   as recomendações entram com prazo igual ao fim da fiscalização mais os dias informados (padrão
   30), e as determinações com a data-limite delas.
2. **Given** um número de processo já usado, **When** alguém tenta cadastrá-lo de novo, **Then** o
   sistema recusa.
3. **Given** uma fiscalização de outra câmara, **When** o técnico procura fiscalizações para ligar,
   **Then** ela não aparece.

---

### User Story 2 - Envio, resposta e dilações (Priority: P1)

A equipe registra:
- o envio do relatório e do AR, com código de rastreio e protocolo;
- o recebimento do AR, que define o prazo de resposta (informado ou 30 dias do recebimento);
- a resposta do município, com protocolo e cronograma de adequação (aprovar, pedir adequação ou
  dispensar);
- as dilações de prazo, aprovadas ou negadas. A dilação aprovada muda o prazo na hora e fica na
  linha do tempo.

**Why this priority**: é o controle de prazo que a lei exige; hoje a dilação não atualiza o prazo
(A-031).

**Independent Test**: com o AR recebido em 01/03 sem prazo informado, o prazo é 31/03. Uma dilação de
15 dias a partir de 31/03 é aprovada: o prazo passa a 15/04, e a linha do tempo mostra "Dilação
aprovada: +15 dias → 15/04". Uma dilação negada não muda o prazo.

**Acceptance Scenarios**:

1. **Given** um processo com AR recebido e sem prazo informado, **When** alguém o consulta, **Then** o
   prazo de resposta é o recebimento mais 30 dias.
2. **Given** uma dilação aprovada, **When** é gravada, **Then** o prazo do processo, a situação e a
   linha do tempo mudam na mesma operação.
3. **Given** um usuário de outra câmara, **When** tenta registrar dilação, **Then** o sistema recusa.

---

### User Story 3 - Acompanhar o cumprimento das recomendações (Priority: P1)

Para cada recomendação ou determinação acompanhada, a equipe registra:
- a resposta do titular e a evidência (arquivo);
- a data de cumprimento ("marcar como cumprida" usa a data de hoje);
- a prioridade, a categoria, o código do item e observações.

A situação (pendente, em andamento, vencida, cumprida) é calculada pelo prazo e pelo cumprimento. A
lista geral mostra, de todos os processos, o total em aberto, as vencidas e as no prazo.

**Why this priority**: é o objetivo do processo.

**Independent Test**: uma recomendação com prazo ontem e sem cumprimento aparece como vencida, sem
ninguém gravar nada. Marcar como cumprida hoje a torna cumprida. A lista geral mostra 1 a menos em
vencidas.

**Acceptance Scenarios**:

1. **Given** uma recomendação pendente com prazo vencido, **When** qualquer tela a mostra, **Then**
   aparece como vencida.
2. **Given** a marcação de cumprimento, **When** é gravada, **Then** a data é a de hoje no fuso de MS.
3. **Given** uma recomendação cadastrada à mão, **When** é gravada, **Then** fica no processo sem
   vínculo com a fiscalização.

---

### User Story 4 - Linha do tempo e documentos (Priority: P2)

Cada processo tem uma linha do tempo imutável, com criação, mudança de situação, resposta recebida,
prazo estendido, documento anexado, encerramento e observações registradas pela equipe. Ele tem
também os documentos padrão (relatório, termo, AR digitalizado, ofício de resposta, cronograma) e
os documentos extras.

**Why this priority**: rastro do acompanhamento; hoje excluir evento não funciona (A-032).

**Independent Test**: registrar uma observação a coloca no topo da linha do tempo, que não oferece
excluir. Anexar o ofício de resposta gera o evento "documento anexado". Um usuário da CATESA não
abre o documento.

**Acceptance Scenarios**:

1. **Given** um evento da linha do tempo, **When** alguém tenta alterá-lo ou excluí-lo, **Then** o
   sistema não permite.
2. **Given** a fiscalização ligada tem relatório vigente, **When** o processo é aberto, **Then** o
   relatório aparece entre os documentos padrão, sem novo envio.

---

### User Story 5 - Painel e avisos da CATERS (Priority: P2)

O painel da CATERS mostra:
- os processos em acompanhamento;
- as respostas atrasadas;
- as recomendações vencidas;
- os processos aguardando análise;
- os termos de notificação da CATERS por situação.

Os avisos (resposta atrasada, recomendação vencida, processo aguardando análise) chegam pela
central de avisos do core.

**Why this priority**: acompanhamento diário da câmara.

**Independent Test**: um processo cujo prazo de resposta venceu ontem gera um aviso "resposta
atrasada" para a equipe da CATERS e aparece no painel. Se o prazo é prorrogado, o aviso não se
repete para o prazo antigo.

**Acceptance Scenarios**:

1. **Given** um prazo de resposta vencido, **When** a rotina diária roda, **Then** a equipe da
   CATERS recebe um aviso, uma vez por prazo.
2. **Given** um usuário da CATESA, **When** abre o início, **Then** não vê o painel da CATERS.

---

### User Story 6 - A CATERS nasce configurada como hoje (Priority: P2)

Na implantação, a CATERS já tem o modelo de checklist, os tipos de unidade de resíduos e limpeza
urbana, o relatório "TERMO DE VISTORIA AGEMS/DSB" e a marca d'água da DSB, como a CATESA, mas com a
sua própria cópia.

**Why this priority**: preserva a vistoria de hoje (Princípio I).

**Independent Test**: um fiscal da CATERS vistoria um aterro com os itens de hoje e gera o relatório
com o mesmo título, sem configuração manual. Alterar a configuração da CATERS não muda a da CATESA.

**Acceptance Scenarios**:

1. **Given** a implantação, **When** o coordenador da CATERS abre a configuração, **Then** vê os 8
   tipos de unidade de resíduos e limpeza urbana e a configuração da DSB.

---

### Edge Cases

- **Processo sem fiscalização ligada**: permitido (processos antigos); as recomendações são
  cadastradas à mão.
- **Fiscalização reaberta depois de importada**: as recomendações acompanhadas continuam; uma nova
  importação traz só o que é novo e avisa o que deixou de existir na fiscalização, sem apagar.
- **Duas dilações seguidas**: o novo prazo parte da data de referência informada; a última aprovada
  vale.
- **Recomendação cumprida depois do prazo**: fica cumprida, e o relatório mostra que foi fora do
  prazo.
- **Município do processo diferente do da fiscalização**: permitido com aviso; o titular é o
  município do processo.
- **Processo encerrado**: só leitura; reabrir é um evento da linha do tempo com motivo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app MUST entregar a configuração inicial da CATERS nos apps comuns, com cópia própria
  (R-caters-002).
- **FR-002**: O app MUST manter processos de acompanhamento com número único, município titular (do
  core), objeto, técnico responsável e fiscalização finalizada da CATERS ligada (R-caters-003).
- **FR-003**: Ligar a fiscalização MUST importar as recomendações e as determinações dela sem
  duplicar (R-caters-004).
- **FR-004**: O prazo de resposta MUST ser o informado ou, na falta dele, o recebimento do AR (ou o
  envio do relatório) mais 30 dias (R-caters-005).
- **FR-005**: A dilação aprovada MUST atualizar o prazo, a situação e a linha do tempo na mesma
  operação (R-caters-007).
- **FR-006**: A situação da recomendação MUST ser calculada pelo prazo e pelo cumprimento
  (R-caters-009).
- **FR-007**: A linha do tempo MUST ser imutável (R-caters-011).
- **FR-008**: Os documentos MUST ser entregues só a quem alcança o processo (R-caters-010).
- **FR-009**: Os avisos MUST ir pela central de avisos do core (R-caters-012).
- **FR-010**: Só a equipe da CATERS e o administrador MUST alcançar os processos; o diretor da DSB,
  só leitura (R-caters-013).
- **FR-011**: O app MUST NOT gravar em modelos de outros apps (R-caters-016).
- **FR-012**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Processo de acompanhamento**:
  - número do processo administrativo, município titular, objeto, técnico responsável;
  - fiscalização ligada;
  - datas de envio do relatório, de envio e de recebimento do AR, código de rastreio e protocolo;
  - prazo de resposta e data fatal;
  - situação e observações.
- **Recomendação acompanhada**:
  - origem (recomendação ou determinação da fiscalização, ou manual), código do item, descrição,
    categoria;
  - prioridade, prazo, data de cumprimento, situação calculada;
  - evidência, resposta do titular, observações.
- **Resposta do município**: uma por processo; recebimento, protocolo, situação do cronograma de
  adequação, observações.
- **Dilação**: data de referência, dias, novo prazo, pedido e protocolo do município, decisão,
  observações.
- **Evento da linha do tempo**: tipo, descrição, novo prazo, documento relacionado, autor, data.
- **Documento do processo**: tipo (relatório, termo, AR digitalizado, ofício de resposta,
  cronograma, extra), título, descrição, arquivo, quem anexou, data.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. As chaves citadas estão no catálogo
da spec 003.

### R-caters-001 — O app da CATERS

- **Comportamento desejado**: o módulo `caters` é o app da CATERS. Como a CATESA (spec 009), ele
  entrega configuração inicial aos apps comuns e registra o painel. Diferente dela, é dono de um
  fluxo próprio, o processo de acompanhamento junto ao município titular, com os modelos das
  R-caters-003 a R-caters-011. Se outra câmara precisar desse fluxo, ele passa a peça genérica de um
  app comum, e não é copiado (constituição v2.6.0).
- **Comportamento atual**: o módulo CATERS tem tabelas, telas e regras próprias, e usa a fiscalização
  e os termos comuns; a identificação do usuário da câmara é uma função do banco.
- **Motivo da diferença**: um app por câmara (constituição v2.6.0 a v2.6.2).
- **Objetos do catálogo**: `funcao:caters_set_updated_at()`
- **Origem**: constituição v2.6.2.

### R-caters-002 — Configuração inicial da CATERS nos apps comuns

- **Comportamento desejado**: o app entrega, com cópia própria (constituição v2.6.1), a mesma
  configuração inicial da CATESA (R-catesa-002 a R-catesa-004):
  - o modelo "Checklist por tipo de unidade" da CATERS;
  - os catálogos dos tipos de unidade cujos serviços são da CATERS (resíduos sólidos e limpeza
    urbana: 8 dos 33 tipos de produção);
  - a configuração de fiscalização (título "TERMO DE VISTORIA AGEMS/DSB", marca d'água da DSB,
    limite de 20 m);
  - a configuração de planejamento.
- **Comportamento atual**: os tipos de resíduos estão no cadastro único; relatório e marca d'água da
  DSB estão no código da fiscalização.
- **Motivo da diferença**: configuração por câmara (spec 005, spec 007).
- **Objetos do catálogo**: `tabela:tipos_unidade`, `coluna:tipos_unidade.servicos_aplicaveis`
- **Origem**: specs 005, 007 e 009.

### R-caters-003 — Processo de acompanhamento

- **Comportamento desejado**: a equipe da CATERS cadastra o processo com:
  - número do processo administrativo (obrigatório, único);
  - município titular (obrigatório, do cadastro do core);
  - objeto (obrigatório);
  - técnico responsável (usuário da CATERS);
  - fiscalização finalizada da CATERS ligada (opcional);
  - observações.

  A lista de processos filtra por município, situação e datas, e mostra a quantidade de
  recomendações. A situação do processo é escolhida pela equipe entre:
  - aguardando análise, em análise, respondido;
  - no prazo, crítico, resposta atrasada;
  - dilação solicitada;
  - encerrado.

  O painel e a tela mostram ainda o prazo remanescente e os dias restantes (ou de atraso),
  calculados, enquanto o processo não está respondido, em análise nem encerrado; nessas situações o
  prazo deixa de contar.
- **Comportamento atual**:
  - o município é texto livre;
  - o técnico é texto livre;
  - a situação tem 7 valores no banco, e a tela oferece também "dilação solicitada", cuja gravação
    falha;
  - só o administrador exclui processos, em cascata.
- **Motivo da diferença**:
  - município e técnico dos cadastros do core evitam grafias diferentes (A-037, por analogia);
  - a situação da dilação existe (A-031);
  - processo com registros não é apagado (A-020, por analogia): só o administrador exclui, e só
    processo sem recomendação, documento ou evento além da criação.
- **Objetos do catálogo**: `tabela:caters_processes`, `coluna:caters_processes.id`,
  `coluna:caters_processes.process_number`, `coluna:caters_processes.municipality`,
  `coluna:caters_processes.object`, `coluna:caters_processes.technician_name`,
  `coluna:caters_processes.status`, `coluna:caters_processes.observations`,
  `coluna:caters_processes.created_by`, `coluna:caters_processes.created_at`,
  `coluna:caters_processes.updated_at`, `tipo:caters_process_status`,
  `gatilho:public.caters_processes.trg_caters_processes_updated_at`
- **Origem**: A-031 (decidido); A-020, A-037 (por analogia).

### R-caters-004 — Ligar a fiscalização e importar as recomendações

- **Comportamento desejado**: o técnico escolhe uma fiscalização finalizada da CATERS, pela consulta
  da fiscalização, que respeita o alcance dele (R-fiscalizacao-022). O app importa:
  - cada **recomendação**, com prazo igual à data de fim da fiscalização mais os dias informados
    (padrão 30), e prioridade média;
  - cada **determinação**, com prazo igual à data-limite dela (R-fiscalizacao-009).

  No cadastro do processo, escolher a fiscalização preenche o município e o técnico com os dela,
  sugere como prazo de resposta a data de fim da fiscalização mais 30 dias (editável) e põe a
  situação inicial em "em análise"; a importação roda junto com a criação.

  Um item importado guarda o identificador de origem e não entra duas vezes. Uma nova importação
  traz só o que é novo e lista o que deixou de existir na fiscalização, sem apagar. A importação
  entra na linha do tempo.
- **Comportamento atual**:
  - uma função do banco com permissão elevada importa, sem duplicar;
  - as determinações entram com o prazo de uma coluna antiga que está sempre vazia, e ficam sem
    prazo;
  - a lista de fiscalizações vem de uma view;
  - o cadastro sugere o número "CATERS-<número da fiscalização>", que não é o do processo
    administrativo;
  - o filtro por datas da lista é feito no navegador.
- **Motivo da diferença**:
  - as determinações ganham prazo, porque a fiscalização guarda a data-limite;
  - nenhuma regra de negócio em função do banco (A-005);
  - a consulta respeita o alcance (A-004).
- **Objetos do catálogo**: `funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)`,
  `coluna:caters_processes.fiscalizacao_id`, `tabela:caters_fiscalizacoes_disponiveis`,
  `coluna:caters_fiscalizacoes_disponiveis.id`,
  `coluna:caters_fiscalizacoes_disponiveis.numero_termo`,
  `coluna:caters_fiscalizacoes_disponiveis.camara_tecnica_id`,
  `coluna:caters_fiscalizacoes_disponiveis.municipio_nome`,
  `coluna:caters_fiscalizacoes_disponiveis.prestador_servico_nome`,
  `coluna:caters_fiscalizacoes_disponiveis.servicos`,
  `coluna:caters_fiscalizacoes_disponiveis.data_inicio`,
  `coluna:caters_fiscalizacoes_disponiveis.data_fim`,
  `coluna:caters_fiscalizacoes_disponiveis.status`,
  `coluna:caters_recommendations.recomendacao_id`, `coluna:caters_recommendations.determinacao_id`
- **Origem**: A-004, A-005 (decididos).

### R-caters-005 — Envio, AR e prazo de resposta

- **Comportamento desejado**: a equipe registra:
  - a data de envio do relatório;
  - a data de envio do AR, o código de rastreio e o protocolo;
  - a data de recebimento do AR;
  - a data fatal, só informativa;
  - o prazo de resposta, informado.

  Sem prazo informado, o prazo de resposta é o recebimento do AR mais 30 dias ou, sem recebimento,
  o envio do relatório mais 30 dias, calculado no servidor e mostrado como calculado. Cada registro
  entra na linha do tempo.
- **Comportamento atual**: os mesmos campos; o prazo calculado é feito na tela, com a mesma regra, e
  a data fatal é só mostrada.
- **Motivo da diferença**: cálculo único no servidor (o painel e os avisos usam o mesmo prazo).
- **Objetos do catálogo**: `coluna:caters_processes.report_sent_at`, `coluna:caters_processes.ar_sent_at`,
  `coluna:caters_processes.ar_received_at`, `coluna:caters_processes.ar_tracking_code`,
  `coluna:caters_processes.ar_protocol_number`, `coluna:caters_processes.fatal_date`,
  `coluna:caters_processes.titular_response_due_at`
- **Origem**: —

### R-caters-006 — Resposta do município

- **Comportamento desejado**: cada processo tem no máximo uma resposta do município, com:
  - data de recebimento (obrigatória);
  - protocolo;
  - situação do cronograma de adequação: pendente, aprovado, adequação solicitada ou dispensado,
    com as ações "Aprovar cronograma", "Solicitar adequação" e "Dispensar";
  - observações.

  Registrar ou mudar a resposta entra na linha do tempo ("resposta recebida"). A situação do
  processo, se não estiver encerrado, passa a:
  - "em análise", com adequação solicitada (a CATERS aguarda o cronograma ajustado);
  - "respondido", nos demais casos.
- **Comportamento atual**:
  - a mesma resposta única, gravada ou substituída pela tela, com a mesma mudança de situação;
  - a mudança não gera evento no histórico;
  - "Marcar hoje" preenche a data de recebimento com a data UTC do aparelho.
- **Motivo da diferença**: rastro da resposta na linha do tempo.
- **Objetos do catálogo**: `tabela:caters_municipality_responses`,
  `coluna:caters_municipality_responses.id`, `coluna:caters_municipality_responses.process_id`,
  `coluna:caters_municipality_responses.received_at`, `coluna:caters_municipality_responses.protocol_number`,
  `coluna:caters_municipality_responses.cronograma_status`, `coluna:caters_municipality_responses.notes`,
  `coluna:caters_municipality_responses.created_by`, `coluna:caters_municipality_responses.created_at`,
  `coluna:caters_municipality_responses.updated_at`,
  `gatilho:public.caters_municipality_responses.trg_caters_municipality_responses_updated_at`
- **Origem**: —

### R-caters-007 — Dilação de prazo

- **Comportamento desejado**: a equipe da CATERS registra uma dilação com:
  - data de referência;
  - dias concedidos (inteiro positivo, padrão 30);
  - data do pedido e protocolo do município;
  - decisão (aprovada ou negada);
  - observações.

  O novo prazo (referência mais dias) é calculado no servidor e mostrado antes de gravar. A dilação
  **aprovada**, na mesma operação:
  - muda o prazo de resposta do processo;
  - põe a situação em "dilação solicitada", ou mantém a atual, se a equipe preferir;
  - registra na linha do tempo "Dilação aprovada: +N dias → novo prazo".

  A negada fica registrada, sem mudar o prazo. Dilação não é alterada nem excluída depois de
  gravada.
- **Comportamento atual**:
  - a tela grava a dilação e tenta atualizar o processo com uma situação inexistente; a segunda
    gravação falha, e o prazo e o histórico não mudam;
  - qualquer usuário com perfil ativo, de qualquer câmara, lê, cria, altera e exclui dilações;
  - o novo prazo é calculado no navegador.
- **Motivo da diferença**: A-031 (situação incluída e prazo atualizado na mesma operação); isolamento
  por câmara (A-026).
- **Objetos do catálogo**: `tabela:caters_deadline_extensions`, `coluna:caters_deadline_extensions.id`,
  `coluna:caters_deadline_extensions.process_id`, `coluna:caters_deadline_extensions.reference_date`,
  `coluna:caters_deadline_extensions.extension_days`, `coluna:caters_deadline_extensions.calculated_date`,
  `coluna:caters_deadline_extensions.municipality_request_at`,
  `coluna:caters_deadline_extensions.municipality_protocol`, `coluna:caters_deadline_extensions.status`,
  `coluna:caters_deadline_extensions.notes`, `coluna:caters_deadline_extensions.created_by`,
  `coluna:caters_deadline_extensions.created_at`, `coluna:caters_deadline_extensions.updated_at`,
  `politica:public.caters_deadline_extensions.authenticated users can manage deadline extensions`
- **Origem**: A-031, A-026 (decididos).

### R-caters-008 — Resposta do titular por recomendação

- **Comportamento desejado**: em cada recomendação acompanhada, a equipe registra a resposta do
  município titular sobre ela e a evidência do cumprimento (arquivo do processo, R-caters-010).
- **Comportamento atual**: a resposta do titular é texto, que a IA podia preencher ao cruzar o ofício;
  a evidência é um endereço.
- **Motivo da diferença**: sem IA (A-039); evidência como documento do processo, com acesso
  controlado (A-016).
- **Objetos do catálogo**: `coluna:caters_recommendations.titular_response`,
  `coluna:caters_recommendations.evidence_url`
- **Origem**: A-039, A-016 (decididos).

### R-caters-009 — Recomendações acompanhadas

- **Comportamento desejado**: cada recomendação acompanhada tem:
  - origem (importada da fiscalização ou manual);
  - código do item, descrição (obrigatória) e categoria (texto, ex.: UTR municipal, transbordo,
    coleta seletiva);
  - prioridade (baixa, média, alta, crítica);
  - prazo prometido;
  - data de cumprimento ("marcar como cumprida" usa a data de hoje no fuso de MS);
  - observações.

  A **situação é calculada** sempre que lida:
  - **cumprida**: com data de cumprimento;
  - **vencida**: prazo passado sem cumprimento;
  - **em andamento**: marcada pela equipe;
  - **pendente**: nos demais casos.

  A lista geral de recomendações, de todos os processos que o usuário alcança, mostra o total em
  aberto, as vencidas e as no prazo, com o link para o processo. Recomendação importada não é
  excluída enquanto a origem existir; a manual pode ser excluída pela equipe, com registro na linha
  do tempo.
- **Comportamento atual**:
  - a situação é derivada na tela ao gravar, sem rotina que a atualize, então uma recomendação vencida
    depois da última gravação continua "pendente" no banco;
  - "marcar como cumprida" grava a data UTC do aparelho, o que depois das 20h em MS registra o dia
    seguinte;
  - qualquer recomendação pode ser excluída pela equipe.
- **Motivo da diferença**: situação sempre certa, data correta no fuso de MS, rastro da exclusão.
- **Objetos do catálogo**: `tabela:caters_recommendations`, `coluna:caters_recommendations.id`,
  `coluna:caters_recommendations.process_id`, `coluna:caters_recommendations.item_code`,
  `coluna:caters_recommendations.description`, `coluna:caters_recommendations.category`,
  `coluna:caters_recommendations.priority`, `coluna:caters_recommendations.promised_due_at`,
  `coluna:caters_recommendations.status`, `coluna:caters_recommendations.fulfilled_at`,
  `coluna:caters_recommendations.notes`, `coluna:caters_recommendations.created_by`,
  `coluna:caters_recommendations.created_at`, `coluna:caters_recommendations.updated_at`,
  `tipo:caters_recommendation_priority`, `tipo:caters_recommendation_status`,
  `gatilho:public.caters_recommendations.trg_caters_recommendations_updated_at`
- **Origem**: —

### R-caters-010 — Documentos do processo

- **Comportamento desejado**: o processo tem os documentos padrão (relatório de fiscalização, termo
  de notificação, AR digitalizado, ofício de resposta do município, cronograma de adequação) e
  documentos extras (título, descrição, arquivo). Os arquivos:
  - são PDF ou imagem, com tamanho máximo definido no plano;
  - ficam no repositório privado;
  - são entregues só a quem alcança o processo, por endereço temporário (A-016).

  O relatório vigente da fiscalização ligada aparece entre os documentos padrão, sem novo envio, pela
  consulta da fiscalização. Anexar gera o evento "documento anexado". A exclusão de documento extra
  fica na linha do tempo.
- **Comportamento atual**:
  - os documentos padrão são endereços em colunas do processo;
  - os extras ficam numa tabela;
  - os arquivos ficam no repositório de documentos de entidades, que qualquer usuário ativo lê;
  - a tela grava o endereço público do arquivo e, ao abrir, o converte em endereço assinado.
- **Motivo da diferença**: A-016 (arquivo só para quem alcança o registro); um só modelo de documento
  com tipo.
- **Objetos do catálogo**: `coluna:caters_processes.relatorio_url`, `coluna:caters_processes.termo_notificacao_url`,
  `coluna:caters_processes.ar_digitalizado_url`, `coluna:caters_processes.oficio_resposta_url`,
  `coluna:caters_processes.cronograma_url`, `tabela:caters_extra_documents`,
  `coluna:caters_extra_documents.id`, `coluna:caters_extra_documents.process_id`,
  `coluna:caters_extra_documents.title`, `coluna:caters_extra_documents.description`,
  `coluna:caters_extra_documents.file_url`, `coluna:caters_extra_documents.created_by`,
  `coluna:caters_extra_documents.created_at`, `bucket:documentos-prestadores`
- **Origem**: A-016 (decidido).

### R-caters-011 — Linha do tempo

- **Comportamento desejado**: a linha do tempo do processo é **imutável** (A-032). Ela tem eventos
  automáticos (criação, mudança de situação, importação, envio e recebimento do AR, resposta
  recebida, dilação, documento anexado ou excluído, encerramento e reabertura) e eventos registrados
  pela equipe ("registrar evento", "observação"). Cada evento tem tipo, descrição, novo prazo e
  documento relacionado quando houver, autor e data, e a lista mostra o mais recente primeiro.
- **Comportamento atual**:
  - o histórico existe, com os tipos de evento de hoje, mas os eventos dependem de a tela gravá-los;
  - a dilação não chega a gravar o dela;
  - excluir evento não tem efeito e não mostra erro;
  - o histórico está vazio em produção.
- **Motivo da diferença**: A-032 (histórico imutável); eventos automáticos não dependem da tela.
- **Objetos do catálogo**: `tabela:caters_analysis_history`, `coluna:caters_analysis_history.id`,
  `coluna:caters_analysis_history.process_id`, `coluna:caters_analysis_history.action_type`,
  `coluna:caters_analysis_history.description`, `coluna:caters_analysis_history.new_fatal_date`,
  `coluna:caters_analysis_history.related_document_url`, `coluna:caters_analysis_history.performed_by`,
  `coluna:caters_analysis_history.created_at`, `tipo:caters_analysis_action_type`,
  `politica:public.caters_analysis_history.CATERS historico: inserir`,
  `politica:public.caters_analysis_history.CATERS historico: leitura`
- **Origem**: A-032 (decidido).

### R-caters-012 — Painel e avisos

- **Comportamento desejado**: o app registra no início (R-core-025), para os usuários da CATERS e o
  diretor da DSB, o painel da CATERS:
  - processos ativos (não encerrados);
  - processos em acompanhamento: não encerrados nem aguardando análise, com recomendação em aberto,
    com as vencidas e as no prazo de cada um, os com mais vencidas primeiro;
  - respostas atrasadas: prazo de resposta vencido, com o processo fora de "respondido", "em análise"
    e "encerrado";
  - recomendações vencidas, com o processo e o município;
  - processos aguardando análise;
  - termos de notificação da CATERS por situação, pelas consultas do processo sancionador, quando
    ele existir.

  Os avisos vão pela central de avisos do core (R-core-026), com tipos registrados pelo app:
  - `caters.resposta_atrasada`;
  - `caters.recomendacao_vencida`;
  - `caters.aguardando_analise`.

  Uma rotina diária os envia à equipe da CATERS **uma vez por prazo**: um prazo prorrogado gera
  aviso novo quando vencer.
- **Comportamento atual**: o painel lê até 1.000 processos e 2.000 recomendações, mostra as 10
  primeiras de cada lista, calcula os avisos na tela e guarda, por usuário, as chaves dos avisos
  lidos (com o prazo na chave, para o aviso voltar quando o prazo muda); ele também conta os
  termos da CATERS.
- **Motivo da diferença**: central de avisos comum (R-core-026).
- **Objetos do catálogo**: `tabela:caters_notification_reads`, `coluna:caters_notification_reads.id`,
  `coluna:caters_notification_reads.user_id`, `coluna:caters_notification_reads.key`,
  `coluna:caters_notification_reads.read_at`, `coluna:caters_notification_reads.created_at`,
  `politica:public.caters_notification_reads.CATERS notif reads: proprias`
- **Origem**: R-core-025, R-core-026.

### R-caters-013 — Quem alcança o quê

- **Comportamento desejado**:
  - **Coordenador e fiscal da CATERS**: leem e alteram processos, recomendações, respostas,
    dilações, documentos e eventos.
  - **Diretor da DSB**: lê tudo da CATERS.
  - **Administrador**: tudo, e é o único que exclui processo, nas condições da R-caters-003.
  - **Demais câmaras e o prestador**: não alcançam nada deste app. O que o município vê, se vier a
    ver, é da spec do portal.

  A verificação vale para qualquer caminho, inclusive documentos e painel.
- **Comportamento atual**:
  - processos, recomendações, histórico, documentos, respostas e leituras de aviso ficam com os
    usuários da CATERS e o administrador;
  - as dilações ficam com qualquer usuário ativo;
  - a exclusão de processo é só do administrador;
  - há políticas do usuário de teste automatizado.
- **Motivo da diferença**: isolamento por câmara (A-026); testes fora de produção (A-001).
- **Objetos do catálogo**: `politica:public.caters_processes.CATERS processos: leitura`,
  `politica:public.caters_processes.CATERS processos: inserir`,
  `politica:public.caters_processes.CATERS processos: atualizar`,
  `politica:public.caters_processes.CATERS processos: deletar`,
  `politica:public.caters_processes.e2e_test_user_own_rows_only`,
  `politica:public.caters_processes.e2e_test_user_own_rows_only_delete`,
  `politica:public.caters_recommendations.CATERS recomendacoes: leitura`,
  `politica:public.caters_recommendations.CATERS recomendacoes: inserir`,
  `politica:public.caters_recommendations.CATERS recomendacoes: atualizar`,
  `politica:public.caters_recommendations.CATERS recomendacoes: deletar`,
  `politica:public.caters_recommendations.e2e_test_user_own_rows_only`,
  `politica:public.caters_recommendations.e2e_test_user_own_rows_only_delete`,
  `politica:public.caters_extra_documents.CATERS documentos: leitura`,
  `politica:public.caters_extra_documents.CATERS documentos: inserir`,
  `politica:public.caters_extra_documents.CATERS documentos: deletar`,
  `politica:public.caters_extra_documents.e2e_test_user_own_rows_only`,
  `politica:public.caters_extra_documents.e2e_test_user_own_rows_only_delete`,
  `politica:public.caters_municipality_responses.CATERS respostas: gestao`,
  `politica:public.caters_municipality_responses.e2e_test_user_own_rows_only`,
  `politica:public.caters_municipality_responses.e2e_test_user_own_rows_only_delete`,
  `politica:public.caters_deadline_extensions.e2e_test_user_own_rows_only`,
  `politica:public.caters_deadline_extensions.e2e_test_user_own_rows_only_delete`
- **Origem**: A-026, A-001 (decididos).

### R-caters-014 — Análise por IA não é refeita

- **Comportamento desejado**: o sistema novo não tem os botões de IA do processo:
  - ler o relatório para sugerir recomendações;
  - cruzar o ofício de resposta com as recomendações;
  - revisar as sugestões.

  As recomendações são cadastradas pela importação da fiscalização ou à mão.
- **Comportamento atual**: o detalhe do processo pede à fila de IA a leitura do relatório e o
  cruzamento do ofício, e mostra as sugestões para revisão. Em produção, nenhuma análise foi
  processada (A-033).
- **Motivo da diferença**: A-039 (a IA não é migrada nem refeita).
- **Objetos do catálogo**: `tabela:caters_ai_jobs`, `tipo:caters_ai_job_type`
- **Origem**: A-039, A-033 (decididos).

### R-caters-015 — O que não é levado

- **Comportamento desejado**: o sistema novo não tem:
  - a função do banco de importação (vira serviço do app);
  - a função e os gatilhos genéricos de data de alteração;
  - a view de fiscalizações disponíveis (vira consulta da fiscalização);
  - as colunas de endereço de documento (viram documentos do processo);
  - a tabela de leituras de aviso (vira a central de avisos);
  - as políticas do usuário de teste.
- **Comportamento atual**: esses objetos existem no banco.
- **Motivo da diferença**: A-005 (regra em serviço, não em função do banco), A-001, R-core-026,
  R-caters-010.
- **Objetos do catálogo**: `funcao:caters_set_updated_at()`, `tabela:caters_fiscalizacoes_disponiveis`,
  `tabela:caters_notification_reads`
- **Origem**: A-001, A-005 (decididos).

### R-caters-016 — O app da CATERS não escreve nos apps comuns

- **Comportamento desejado**: o app grava só os próprios modelos. Lê a fiscalização pelas consultas
  dela, e a configuração inicial vai pelas funções de configuração de cada app comum. Um teste falha
  se gravar direto em modelo de outro app.
- **Comportamento atual**: a importação lê as tabelas da fiscalização direto, com permissão elevada.
- **Motivo da diferença**: constituição, "Todo dado tem um app dono".
- **Objetos do catálogo**: `funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)`
- **Origem**: constituição v2.5.0 e v2.6.0.

## Telas do sistema atual

### Painel da CATERS (`src/pages/CatersDashboard.jsx`)

| Ação | Regra |
|---|---|
| Processos em acompanhamento, respostas atrasadas, recomendações vencidas, aguardando análise, "Ver todos" | R-caters-012 |
| Avisos, com marcar como lido | R-caters-012 (pela central de avisos) |
| Termos de notificação da CATERS por situação | R-caters-012 (consultas do processo sancionador) |

### Processos (`src/pages/CatersProcessos.jsx`)

| Ação | Regra |
|---|---|
| Listar e filtrar processos; paginação; "Ver detalhes" | R-caters-003 |
| Novo processo: número, município, objeto, técnico, datas, rastreio, protocolo, prazo, observações | R-caters-003, R-caters-005 |
| Escolher a fiscalização a ligar | R-caters-004 |

### Detalhe do processo (`src/pages/CatersProcessoDetalhe.jsx`)

| Ação | Regra |
|---|---|
| Editar dados, situação, datas de envio e AR, rastreio, protocolo, data fatal, prazo | R-caters-003, R-caters-005 |
| Cálculo do prazo, prazo remanescente, dias restantes, "Progresso legal" | R-caters-005 |
| Recomendações: adicionar, editar, excluir, prioridade, categoria, prazo, marcar como cumprida, evidência, resposta do titular | R-caters-008, R-caters-009 |
| "Vinculado à fiscalização do app" (importação) | R-caters-004 |
| Resposta do município: recebimento ("Marcar hoje"), protocolo, aprovar cronograma, solicitar adequação, dispensar | R-caters-006 |
| Dilações: registrar, aprovar, negar | R-caters-007 |
| Documentos padrão e extras: anexar, abrir | R-caters-010 |
| Linha do tempo: registrar evento | R-caters-011 |
| Analisar relatório e ofício com IA; revisar sugestões (`AiSuggestionReviewDialog`) | R-caters-014 (retirada) |

### Recomendações (`src/pages/CatersRecomendacoes.jsx`)

| Ação | Regra |
|---|---|
| Total em aberto, vencidas, no prazo, por processo e município; "Ver processo" | R-caters-009 |

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Reabrir processo encerrado, com motivo | R-caters-003, R-caters-011 |
| Nova importação da fiscalização, com a lista do que deixou de existir | R-caters-004 |

## Migração

Mapa: `specs/003-base-dados-producao/anotacoes/migracao/caters.toml` (81 itens: 75 com destino e 6
descartados; 0 pendentes), conferido contra o data-model do plano.

### Volumes de produção

| Origem | Registros | Destino |
|---|---:|---|
| `tabela:caters_processes` | 2 | Processo de acompanhamento; as colunas de documento viram documentos do processo |
| `tabela:caters_recommendations` | 27 | Recomendação acompanhada |
| `tabela:caters_analysis_history`, `caters_deadline_extensions`, `caters_extra_documents`, `caters_municipality_responses`, `caters_notification_reads` | 0 | Modelos do app (sem dado) |
| arquivos do CATERS em `bucket:documentos-prestadores` | 4 arquivos | Documentos do processo |
| `tabela:caters_ai_jobs` | 7 | não levada (A-039) |

### Critérios

| Critério | Meta |
|---|---|
| MIG-1 Registros | Os 2 processos e as 27 recomendações chegam com os mesmos identificadores |
| MIG-2 Valores | Campos iguais depois da transformação do mapa; município e técnico ligados aos cadastros do core pelo nome, com o texto original guardado |
| MIG-3 Arquivos | Os 4 arquivos chegam como documentos dos processos, com o mesmo checksum |
| MIG-4 Legados | Município ou técnico sem correspondência, e recomendação ligada a recomendação ou determinação inexistente, carregados e listados |
| MIG-5 Descartes | Fila de IA (7 trabalhos) e os objetos da R-caters-015, com o volume listado |
| MIG-6 Mapa | 0 pendentes em `caters.toml` |

### Casos conhecidos

- **Situação das recomendações**: a migração guarda a situação gravada, e o sistema novo passa a
  calcular; a diferença (vencidas que estavam como pendentes) vai para o relatório de conferência.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ligar a mesma fiscalização duas vezes a um processo cria 0 recomendações repetidas.
- **SC-002**: 100% das dilações aprovadas mudam o prazo do processo e geram o evento na mesma
  operação.
- **SC-003**: 100% das recomendações com prazo vencido e sem cumprimento aparecem como vencidas em
  todas as telas, sem gravação manual.
- **SC-004**: 0 eventos da linha do tempo podem ser alterados ou excluídos.
- **SC-005**: Em teste com usuários da CATERS, da CATESA, um diretor da DSB e um prestador, 0
  processos, documentos ou dilações fora do alcance são alcançados.
- **SC-006**: Cada prazo vencido gera exatamente 1 aviso à equipe da CATERS.
- **SC-007**: O app grava 0 vezes direto em modelos de outros apps (verificado por teste).
- **SC-008**: 100% das regras de acesso deste módulo têm teste automatizado.

## Assumptions

- **Fluxo só da CATERS**: o processo de acompanhamento junto ao município titular é específico da
  CATERS hoje. Se outra câmara precisar dele, vira peça genérica de um app comum (constituição
  v2.6.0), e não cópia.
- **Termos da CATERS**: a CATERS também emite termos de notificação pelo processo sancionador comum;
  o painel só os conta.
- **Prazo padrão**: 30 dias, como hoje, para a resposta sem prazo informado e para as recomendações
  importadas.
- **Fuso**: datas de cumprimento e prazos no fuso de Mato Grosso do Sul.
- **Sem uso sem rede**: o acompanhamento é trabalho de escritório; exige rede.
