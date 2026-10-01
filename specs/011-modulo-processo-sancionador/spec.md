# Feature Specification: Módulo processo sancionador — do termo de notificação à deliberação da diretoria executiva

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-10-01

**Status**: Draft

**Input**: Spec do módulo `processo_sancionador` da spec 003, 6º na ordem, escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. As regras usam o prefixo `R-sancionador`.
Fontes:
- o catálogo da spec 003: 8 tabelas, 117 colunas, 7 funções, 5 gatilhos, 44 políticas e 3
  repositórios de arquivos;
- os achados A-001, A-002, A-005, A-007, A-014, A-016, A-018, A-019, A-026, A-028, A-029, A-030,
  A-034, A-036 e A-039;
- as telas do sistema atual;
- as specs 004 a 010;
- a constituição v2.6.2.

Decisões do responsável (2026-10-01):
- o app cobre o processo inteiro, do termo de notificação à deliberação da diretoria executiva, com
  acesso e movimentações por etapa e por perfil;
- a câmara de julgamento é uma só para a agência;
- depois da diretoria executiva não há recurso administrativo, só a via judicial, que fica fora do
  sistema;
- a entidade é notificada da decisão final no portal;
- cobrança e inscrição em dívida serão um módulo próprio, depois;
- fica em aberto como a decisão da câmara de julgamento e a deliberação da diretoria executiva são
  registradas.

## Contexto

O processo sancionador começa quando a fiscalização termina. Ele tem três instâncias, cada uma com
o seu papel:

1. **Câmara técnica** (a câmara que fiscalizou):
   - envia à entidade o **termo de notificação** (TN), com o relatório de fiscalização (RFP, RFE ou
     RAO);
   - recebe a primeira resposta da entidade a cada determinação e a analisa;
   - emite a **Análise da Manifestação** (AM). Cada resposta não acatada gera um **auto de
     infração** (AI);
   - envia os autos à entidade, que apresenta **defesa**;
   - analisa a defesa e emite o **parecer técnico**, com a recomendação para cada auto: manter,
     atenuar a pena ou cancelar;
   - encaminha o parecer à câmara de julgamento.
2. **Câmara de julgamento**, uma só para a agência, decide cada auto.
3. **Diretoria executiva** delibera em definitivo. A entidade é notificada no portal, e o processo
   se encerra no sistema.

**Hoje** o sistema cobre só a câmara técnica: termo, resposta, AM, autos, remessa e parecer. O
julgamento e a deliberação são feitos fora dele.

Produção tem 5 termos e 34 respostas a determinações, que são dados de teste (A-002). Autos,
remessas, pareceres, manifestações e julgamentos estão vazios: o fluxo dos autos nunca foi usado.

O sistema atual tem defeitos neste fluxo:
- a equipe de qualquer câmara alcança todos os termos e autos (A-026);
- qualquer usuário ativo, inclusive o prestador, altera qualquer remessa (A-034);
- os números de TN, AM e AI podem se repetir e trazem "DSB" fixo (A-028);
- a defesa escrita no portal se perde sem erro (A-029);
- o AI assinado pela entidade fica sem registro (A-018);
- "excluir a análise" apaga as respostas da entidade e os autos;
- o prazo de defesa não fica registrado;
- a situação do termo é calculada em cada tela;
- os títulos das telas dizem "CATESA" para qualquer câmara.

No sistema novo, o processo sancionador é um **app comum**, sem nada de nenhuma câmara (constituição
v2.6.2). Ele lê a fiscalização pelas consultas dela e nunca a altera (R-fiscalizacao-009,
R-fiscalizacao-022). O que a entidade vê e faz no portal é da spec do portal; as regras do que ela
pode gravar ficam aqui.

Fica fora desta spec:
- a vistoria, as NCs e as determinações (spec 007);
- as telas do portal do prestador (spec do portal);
- a cobrança, a inscrição em dívida e a via judicial.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Notificar a entidade e receber a resposta (Priority: P1)

A câmara técnica cria o termo de notificação de uma fiscalização finalizada, anexa o TN e o
relatório assinados e o disponibiliza no portal. A entidade assina o TN, responde cada determinação
com manifestação e evidências e conclui a resposta. O prazo e a pontualidade são do servidor. No
fluxo manual, a equipe registra o protocolo e a resposta recebidos em papel.

**Why this priority**: é o início do processo e o único trecho usado hoje em produção.

**Independent Test**: o fiscal da CATESA cria o TN de uma fiscalização com 4 determinações; o número
"TN 001/2027/DSB/AGEMS" é atribuído pelo servidor. A entidade assina em 10/03, e o prazo de 30 dias
vai a 09/04. Ela responde as 4 determinações e conclui em 08/04, e o termo fica "respondido no
prazo". Criar um segundo TN para a mesma fiscalização é recusado.

**Acceptance Scenarios**:

1. **Given** uma fiscalização finalizada sem termo, **When** a equipe cria o TN, **Then** o número é
   o próximo da sequência do tipo, da diretoria e do ano, sem repetição.
2. **Given** o TN assinado pela entidade pela primeira vez, **When** ele chega, **Then** o servidor
   grava o início do prazo e a data-limite pela data de MS; um reenvio não reinicia o prazo.
3. **Given** uma resposta enviada, **When** a entidade tenta alterá-la depois da análise, **Then** o
   sistema recusa.
4. **Given** um termo de outra câmara, **When** o fiscal da CATERS tenta abri-lo, **Then** ele não
   aparece.

---

### User Story 2 - Analisar a resposta e emitir a Análise da Manifestação (Priority: P1)

A câmara técnica analisa cada resposta (acatada ou não acatada, com o texto da análise) e conclui a
AM. O sistema atribui o número, gera o documento da AM e cria um auto de infração para cada
determinação não acatada. Refazer a análise cria uma nova versão e nunca apaga as respostas da
entidade.

**Why this priority**: é a decisão da câmara técnica que abre os autos.

**Independent Test**: com 4 respostas, a equipe acata 3 e não acata 1 e conclui a AM: sai "AM
001/2027/DSB/AGEMS", o PDF da AM, e 1 auto "AI 001/2027/DSB/AGEMS". Ao refazer a análise antes de
enviar os autos, as 4 respostas continuam, a AM anterior fica no histórico e o auto não enviado é
cancelado com motivo.

**Acceptance Scenarios**:

1. **Given** respostas analisadas, **When** a AM é concluída, **Then** cada não acatada gera um
   auto, e nenhuma determinação tem dois autos.
2. **Given** uma AM concluída, **When** a equipe a refaz, **Then** as respostas da entidade não são
   alteradas nem apagadas.
3. **Given** a análise da equipe, **When** é gravada, **Then** a data e a pontualidade da resposta da
   entidade não mudam.

---

### User Story 3 - Autos, remessa e defesa (Priority: P1)

A câmara técnica informa a pena base de cada auto (UFERMS e R$), anexa o AI assinado e monta a
remessa dos autos do termo. A entidade registra no portal o recebimento, com o AI assinado por ela,
e apresenta a defesa de cada auto (texto, anexos e ofício). O prazo de defesa fica registrado.

**Why this priority**: hoje a defesa se perde e o prazo de defesa não existe (A-029).

**Independent Test**: a remessa com 2 autos é enviada; a entidade assina o recebimento em 05/05, e o
prazo de defesa vai a 04/06. Ela envia a defesa do primeiro auto com 2 anexos: a defesa fica
registrada no auto e na linha do tempo. Outra entidade não alcança a remessa.

**Acceptance Scenarios**:

1. **Given** uma remessa enviada, **When** a entidade registra o recebimento, **Then** o AI assinado
   por ela fica no auto (A-018) e o prazo de defesa começa.
2. **Given** uma defesa enviada, **When** a equipe abre o auto, **Then** vê o texto, os anexos e se
   chegou no prazo.
3. **Given** um prestador de outra entidade, **When** tenta registrar recebimento ou defesa, **Then**
   o sistema recusa (A-034).

---

### User Story 4 - Parecer técnico e encaminhamento ao julgamento (Priority: P2)

A câmara técnica escreve o parecer técnico da defesa de cada auto, com a análise e a recomendação
(manter, atenuar a pena com o novo valor, ou cancelar), anexa a versão assinada e encaminha o
processo à câmara de julgamento.

**Why this priority**: fecha a parte da câmara técnica.

**Independent Test**: os 2 autos recebem parecer: um "manter", outro "atenuar para 50 UFERMS". O
encaminhamento só é aceito quando os 2 têm parecer assinado; depois dele, a câmara técnica não
altera mais os pareceres, e o processo aparece para a câmara de julgamento.

**Acceptance Scenarios**:

1. **Given** um auto sem parecer, **When** a equipe tenta encaminhar o processo, **Then** o sistema
   recusa e lista o que falta.
2. **Given** o processo encaminhado, **When** a câmara técnica tenta alterar o parecer, **Then** o
   sistema recusa.

---

### User Story 5 - Câmara de julgamento e diretoria executiva (Priority: P2)

A câmara de julgamento, única na agência, recebe os processos encaminhados e registra a decisão de
cada auto. O processo segue para a diretoria executiva, que registra a deliberação final. A entidade
é notificada no portal, e o processo se encerra.

**Why this priority**: hoje essas etapas ficam fora do sistema; o processo precisa terminar nele
(decisão do responsável, 2026-10-01).

**Independent Test**: com a forma de registro definida (questão em aberto Q1), um processo com 2
autos é decidido pela câmara de julgamento e deliberado pela diretoria executiva; a entidade vê no
portal a decisão final e a multa de cada auto, e o processo fica encerrado, só para leitura.

**Acceptance Scenarios**:

1. **Given** um processo encaminhado, **When** um membro da câmara de julgamento o abre, **Then**
   vê o processo inteiro, só para leitura, e registra apenas a decisão da sua etapa.
2. **Given** a deliberação registrada, **When** a entidade abre o portal, **Then** vê a decisão final
   de cada auto e recebe um aviso.
3. **Given** um processo encerrado, **When** qualquer usuário tenta alterá-lo, **Then** o sistema
   recusa.

---

### User Story 6 - Acompanhar prazos e situação (Priority: P2)

A câmara técnica acompanha as determinações notificadas: vencidas, a vencer em 7 dias, respondidas,
tempo médio de resposta, por município, serviço e entidade. Cada usuário vê os processos da sua
etapa e do seu alcance.

**Why this priority**: o acompanhamento de hoje calcula os prazos no navegador e mistura câmaras.

**Independent Test**: uma determinação de prazo 15 dias, num termo assinado em 01/03, aparece como
"a vencer" em 10/03 e "vencida" em 17/03, igual no painel e na lista; o fiscal da CATERS não a vê.

**Acceptance Scenarios**:

1. **Given** um termo assinado, **When** o acompanhamento é aberto, **Then** o prazo de cada
   determinação conta da ciência do termo, calculado no servidor.
2. **Given** um membro da câmara de julgamento, **When** abre o início, **Then** vê só os processos
   encaminhados à sua etapa.

---

### Edge Cases

- **Fiscalização reaberta depois do termo**: o termo continua; as determinações que mudaram aparecem
  marcadas no processo, e o TN já emitido não muda.
- **Entidade que não responde**: vencido o prazo, as determinações sem resposta são analisadas como
  não atendidas no prazo.
- **Resposta depois do prazo**: é aceita e marcada como fora do prazo.
- **Defesa depois do prazo**: idem; o parecer considera.
- **Auto cancelado pela câmara técnica antes do envio** (análise refeita): fica cancelado, com o
  número, sem reaproveitar a numeração.
- **Câmara de julgamento devolve o processo à câmara técnica** (ex.: parecer incompleto): depende
  da questão em aberto Q1; se houver devolução, ela é uma movimentação com motivo.
- **Termo sem documento emitido**: pode ser excluído pela câmara técnica; emitido, só cancelado
  com motivo.
- **Usuário que é diretor e membro da diretoria executiva**: o papel de diretor continua com o
  alcance dele; a participação na diretoria executiva vem da composição do colegiado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app MUST cobrir o processo da notificação à deliberação final, com etapas, responsável
  por etapa e movimentações registradas (R-sancionador-002).
- **FR-002**: Os números de TN, AM e AI MUST ser atribuídos pelo servidor, únicos por tipo, diretoria
  e ano (R-sancionador-003).
- **FR-003**: Uma fiscalização MUST ter no máximo um termo de notificação ativo (R-sancionador-004).
- **FR-004**: Prazos, datas-limite e pontualidade MUST ser calculados no servidor, no fuso de MS
  (R-sancionador-005, R-sancionador-006, R-sancionador-011).
- **FR-005**: A entidade MUST gravar só o que é dela: TN assinado, respostas, recebimento da remessa,
  AI assinado e defesa, das próprias notificações (R-sancionador-006, R-sancionador-010,
  R-sancionador-011).
- **FR-006**: A análise e a AM MUST nunca alterar nem apagar a resposta da entidade
  (R-sancionador-008).
- **FR-007**: Cada determinação não acatada MUST gerar exatamente um auto (R-sancionador-009).
- **FR-008**: O parecer MUST trazer, para cada auto, a recomendação manter, atenuar ou cancelar
  (R-sancionador-012).
- **FR-009**: A câmara de julgamento e a diretoria executiva MUST registrar as suas decisões no
  processo, só na sua etapa (R-sancionador-013, R-sancionador-014).
- **FR-010**: A entidade MUST ser notificada da decisão final no portal (R-sancionador-015).
- **FR-011**: Documentos emitidos MUST NOT ser apagados; o cancelamento é registrado com motivo
  (R-sancionador-019).
- **FR-012**: Cada usuário MUST alcançar só os processos da sua câmara, etapa ou entidade
  (R-sancionador-018).
- **FR-013**: O app MUST NOT conter nada de câmara e MUST NOT gravar em modelos de outros apps
  (R-sancionador-001, R-sancionador-023).
- **FR-014**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Processo sancionador**: número do processo administrativo, fiscalização, entidade, câmara
  técnica, etapa atual, situação, linha do tempo.
- **Termo de notificação**: número, relatório (tipo e número), documentos, fluxo (portal ou manual),
  prazo, ciência, recebimento da resposta e pontualidade.
- **Resposta à determinação**: determinação, manifestação, evidências, situação (rascunho, enviada),
  data e pontualidade.
- **Análise da resposta** e **Análise da Manifestação**: resultado por determinação (acatada, não
  acatada), texto da análise, número da AM, documento, versão.
- **Auto de infração**: número, determinação, descrição, pena base (UFERMS e R$), documentos (AI
  assinado pela AGEMS e pela entidade, protocolos), prazo de defesa, situação.
- **Remessa**: os autos de um termo enviados juntos, com o recebimento pela entidade.
- **Defesa**: por auto, com texto, anexos, ofício, data e pontualidade.
- **Parecer técnico**: por auto, com análise, recomendação, valor sugerido e documento assinado.
- **Colegiado**: câmara de julgamento ou diretoria executiva, com os membros e a vigência.
- **Decisão** e **deliberação**: por auto, com resultado, multa e documento (forma de registro em
  aberto, Q1).
- **Movimentação**: passagem do processo de uma etapa à outra, com autor, data e motivo.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. As chaves citadas estão no catálogo
da spec 003.

### R-sancionador-001 — App comum, configurado por câmara

- **Comportamento desejado**: o processo sancionador é um app comum, usado por qualquer câmara que
  notifica e autua. Não tem tabela, coluna, tela, texto ou regra de nenhuma câmara. O que varia por
  câmara é configuração mantida na tela pelo coordenador e pelo administrador, com cópia entre
  câmaras (constituição v2.6.1):
  - prazo de resposta ao TN (padrão 30 dias);
  - prazo de defesa ao AI (padrão 30 dias);
  - layouts da AM e da lista de autos da remessa;
  - texto da base legal citada na AM.

  Os títulos das telas vêm da câmara do usuário e do cadastro do core. A sigla da diretoria nos
  números vem do core (R-sancionador-003).
- **Comportamento atual**:
  - as telas de termos, autos, análise e pareceres têm o título "CATESA — Câmara Técnica de
    Saneamento Básico" fixo, e a câmara do termo tem CATESA como padrão;
  - a câmara do termo é texto livre;
  - a câmara dos autos e das remessas é copiada da fiscalização por gatilho;
  - a base legal da AM ("Portaria AGEMS nº 233/2022 e suas alterações") está fixa no código.
- **Motivo da diferença**: constituição v2.6.0 a v2.6.2 (app comum sem nada de câmara); câmara como
  referência ao core.
- **Objetos do catálogo**: `coluna:termos_notificacao.camara_tecnica`,
  `coluna:autos_infracao.camara_tecnica_id`, `coluna:remessas_ai.camara_tecnica_id`,
  `funcao:trg_auto_set_camara()`, `funcao:trg_remessa_set_camara()`,
  `gatilho:public.autos_infracao.tr_camara_autos`, `gatilho:public.remessas_ai.tr_camara_remessas`,
  `indice:idx_autos_infracao_camara`, `indice:idx_remessas_ai_camara`,
  `coluna:termos_notificacao.prazo_resposta_dias`
- **Origem**: constituição v2.6.2.

### R-sancionador-002 — Processo, etapas e movimentações

- **Comportamento desejado**: o **processo sancionador** é o registro que reúne tudo, desde a
  criação do termo até o encerramento. Tem número do processo administrativo, fiscalização,
  entidade, câmara técnica, etapa atual e situação. As etapas, com o responsável de cada uma, são:

  | Etapa | Responsável | Termina quando |
  |---|---|---|
  | notificação | câmara técnica | a entidade conclui a resposta ou o prazo vence |
  | análise da manifestação | câmara técnica | a AM é concluída (sem não acatadas, o processo se encerra) |
  | autos e defesa | câmara técnica; a entidade registra recebimento e defesa | todos os autos têm defesa ou prazo vencido |
  | parecer técnico | câmara técnica | o processo é encaminhado ao julgamento |
  | julgamento | câmara de julgamento | a decisão de todos os autos é registrada |
  | deliberação | diretoria executiva | a deliberação final é registrada |
  | encerrado | — | só leitura |

  A passagem de etapa é uma **movimentação** registrada, com autor, data e motivo quando houver. Ela
  só é aceita quando a etapa está completa, e o sistema lista o que falta. Cada usuário vê, no início,
  os processos que aguardam a sua etapa.
- **Comportamento atual**: não há processo como registro: o termo guarda o número do processo
  digitado, e as etapas são deduzidas em cada tela dos arquivos e datas presentes.
- **Motivo da diferença**: decisão do responsável (2026-10-01): app completo, com acesso e
  movimentações por etapa e por perfil.
- **Objetos do catálogo**: `coluna:termos_notificacao.numero_processo`, `tabela:termos_notificacao`
- **Origem**: decisão do responsável, 2026-10-01.

### R-sancionador-003 — Numeração

- **Comportamento desejado**: os números de TN, AM e AI são atribuídos pelo servidor, no momento da emissão, por uma sequência por tipo, diretoria e ano, com unicidade
  garantida mesmo em pedidos simultâneos. O formato de hoje é mantido, com a sigla da diretoria do
  processo: `TN NNN/AAAA/<diretoria>/AGEMS`, `AM ...`, `AI ...`. O número não é editável, e um
  documento cancelado não devolve o número.

  O número do relatório (RFP, RFE ou RAO) continua digitado pela equipe e único por tipo, câmara e
  ano.
- **Comportamento atual**:
  - **TN**: maior número do ano + 1, calculado no navegador e editável;
  - **AM e AI**: contagem do ano + 1, por função do banco com as permissões de quem chama;
  - pedidos simultâneos ou exclusões repetem números;
  - "DSB" é fixo;
  - o ano do termo vem de um gatilho, para a unicidade do relatório.
- **Motivo da diferença**: A-028.
- **Objetos do catálogo**: `coluna:termos_notificacao.numero_termo_notificacao`,
  `coluna:termos_notificacao.numero_am`, `coluna:autos_infracao.numero_auto`,
  `funcao:gerar_numero_am()`, `funcao:gerar_numero_auto()`,
  `funcao:set_termos_notificacao_ano_geracao()`,
  `gatilho:public.termos_notificacao.trg_termos_notificacao_set_ano_geracao`,
  `coluna:termos_notificacao.ano_geracao`, `coluna:termos_notificacao.numero_rfp`,
  `coluna:termos_notificacao.tipo_relatorio`, `coluna:termos_notificacao.data_geracao`,
  `indice:termos_notificacao_tipo_camara_numero_ano_uniq`,
  `restricao:termos_notificacao.termos_notificacao_tipo_relatorio_check`
- **Origem**: A-028 (decidido).

### R-sancionador-004 — Termo de notificação

- **Comportamento desejado**: a câmara técnica cria o termo a partir de uma **fiscalização
  finalizada da sua câmara**, escolhida pela consulta da fiscalização. Município, entidade e
  determinações vêm da fiscalização. O termo tem:
  - tipo e número do relatório;
  - número do processo administrativo;
  - prazo de resposta (padrão da câmara);
  - observações;
  - fluxo: pelo portal ou manual.

  O TN assinado pela AGEMS e o relatório assinado são anexados (PDF). Com os dois, o termo é
  **emitido**: recebe o número e fica disponível no portal, se o fluxo for pelo portal. Uma
  fiscalização tem no máximo um termo não cancelado, garantido pelo banco. No fluxo manual, a equipe
  registra o protocolo ou AR e o ofício, e o termo não aparece no portal.
- **Comportamento atual**:
  - a unicidade por fiscalização é verificada só pela tela;
  - o número é atribuído na criação, antes dos documentos;
  - em produção: 5 termos (3 da CATESA, 2 da CATERS; 3 manuais, 2 pelo portal; 4 RFP e 1 RFE).
- **Motivo da diferença**: unicidade garantida; numeração na emissão (R-sancionador-003).
- **Objetos do catálogo**: `coluna:termos_notificacao.id`, `coluna:termos_notificacao.fiscalizacao_id`,
  `coluna:termos_notificacao.municipio_id`, `coluna:termos_notificacao.prestador_servico_id`,
  `coluna:termos_notificacao.observacoes`, `coluna:termos_notificacao.fluxo_manual`,
  `coluna:termos_notificacao.arquivo_url`, `coluna:termos_notificacao.arquivo_rfp_url`,
  `coluna:termos_notificacao.arquivo_protocolo_url`, `coluna:termos_notificacao.arquivo_oficio_protocolo`,
  `coluna:termos_notificacao.created_at`, `coluna:termos_notificacao.updated_at`,
  `restricao:termos_notificacao.termos_notificacao_fiscalizacao_id_fkey`,
  `restricao:termos_notificacao.termos_notificacao_municipio_id_fkey`,
  `restricao:termos_notificacao.termos_notificacao_prestador_servico_id_fkey`,
  `restricao:termos_notificacao.termos_notificacao_pkey`, `indice:termos_notificacao_pkey`
- **Origem**: —

### R-sancionador-005 — Ciência, prazo e situação do termo

- **Comportamento desejado**: a **ciência** é registrada assim:
  - **pelo portal**: no primeiro envio do TN assinado pela entidade, o servidor grava a data de
    protocolo e o início do prazo (data de MS), e a data-limite = início + prazo do termo. Um
    reenvio troca o arquivo e não reinicia o prazo. A assinatura é aceita pela equipe, que pode
    recusá-la com motivo;
  - **no fluxo manual**: a equipe informa a data do protocolo ou AR, e o servidor calcula a
    data-limite.

  A **situação** do termo é calculada no servidor a partir desses dados:
  - pendente de emissão;
  - aguardando assinatura da entidade;
  - aguardando resposta;
  - prazo vencido;
  - respondido, no prazo ou fora dele.

  Não é um texto gravado por cada tela.
- **Comportamento atual**:
  - desde a migration 139, um gatilho grava no servidor a ciência, o prazo, o recebimento e a
    pontualidade quando quem altera é o prestador;
  - a equipe ainda edita a data-limite e a validade da assinatura à mão;
  - a situação é calculada em cada tela e gravada como texto livre, e "prazo vencido" só existe na
    tela;
  - não há verificação da assinatura digital;
  - em produção: 2 respondidos, 1 aguardando resposta e 2 aguardando assinatura.
- **Motivo da diferença**: A-014 (prazos no servidor); situação única para telas, painéis e avisos.
- **Objetos do catálogo**: `coluna:termos_notificacao.status`, `coluna:termos_notificacao.data_protocolo`,
  `coluna:termos_notificacao.data_inicio_prazo`, `coluna:termos_notificacao.data_maxima_resposta`,
  `coluna:termos_notificacao.arquivo_tn_prestador_url`,
  `coluna:termos_notificacao.assinatura_prestador_valida`,
  `coluna:termos_notificacao.data_assinatura_prestador`, `funcao:proteger_termo_prestador()`,
  `gatilho:public.termos_notificacao.trg_proteger_termo_prestador`
- **Origem**: A-014 (decidido).

### R-sancionador-006 — Resposta da entidade às determinações

- **Comportamento desejado**: a entidade responde, pelo portal, cada determinação do termo, com
  manifestação escrita e evidências (PDF ou imagem). Pode salvar rascunho e enviar. Ela conclui a
  resposta do termo com o termo de envio, e o servidor grava a data de recebimento e a pontualidade
  (último dia incluído, fuso de MS). Também pelo servidor:
  - a data e a pontualidade de cada resposta enviada;
  - a recusa de alteração depois que a equipe analisou.

  A entidade não grava a análise, a situação analisada nem os vínculos da determinação. No fluxo
  manual, a equipe registra a data de recebimento, o arquivo da resposta e o ofício.
- **Comportamento atual**:
  - desde a migration 139, um gatilho do banco aplica essas restrições ao prestador;
  - a lista de arquivos da resposta e as evidências ficam em listas dentro do termo e da resposta;
  - há colunas sem uso ("resposta", "tipo de resposta");
  - em produção: 34 respostas, todas de teste (A-002).
- **Motivo da diferença**: A-014; regras no serviço do app, não em função do banco (A-005); arquivos
  como documentos do processo (R-sancionador-016).
- **Objetos do catálogo**: `tabela:respostas_determinacao`, `coluna:respostas_determinacao.id`,
  `coluna:respostas_determinacao.determinacao_id`, `coluna:respostas_determinacao.unidade_fiscalizada_id`,
  `coluna:respostas_determinacao.fiscalizacao_id`, `coluna:respostas_determinacao.prestador_servico_id`,
  `coluna:respostas_determinacao.manifestacao_prestador`, `coluna:respostas_determinacao.evidencias`,
  `coluna:respostas_determinacao.dentro_prazo`, `coluna:respostas_determinacao.data_resposta`,
  `coluna:respostas_determinacao.created_at`, `coluna:termos_notificacao.data_recebimento_resposta`,
  `coluna:termos_notificacao.recebida_no_prazo`, `coluna:termos_notificacao.arquivos_resposta`,
  `coluna:termos_notificacao.arquivo_resposta_url`, `coluna:termos_notificacao.arquivo_oficio_resposta`,
  `funcao:proteger_resposta_determinacao_prestador()`,
  `gatilho:public.respostas_determinacao.trg_proteger_resposta_determinacao_prestador`,
  `restricao:respostas_determinacao.respostas_determinacao_determinacao_id_fkey`,
  `restricao:respostas_determinacao.respostas_determinacao_fiscalizacao_id_fkey`,
  `restricao:respostas_determinacao.respostas_determinacao_prestador_servico_id_fkey`,
  `restricao:respostas_determinacao.respostas_determinacao_unidade_fiscalizada_id_fkey`,
  `restricao:respostas_determinacao.respostas_determinacao_pkey`, `indice:respostas_determinacao_pkey`
- **Origem**: A-014, A-005 (decididos).

### R-sancionador-007 — Acompanhamento das determinações

- **Comportamento desejado**: o prazo de cumprimento de cada determinação notificada conta da
  ciência do termo: início do prazo + prazo da determinação, calculado no servidor, sem alterar a
  determinação (premissa da spec 007). O acompanhamento mostra, no alcance do usuário:
  - vencidas e a vencer em 7 dias;
  - respondidas e analisadas;
  - autos gerados;
  - tempo médio de resposta;
  - evolução e distribuição por município.

  Os filtros são município, serviço, entidade e período.
- **Comportamento atual**:
  - a tela calcula o prazo no navegador, a partir da data de protocolo e do prazo, em UTC, com
    recurso à data-limite da fiscalização;
  - lê todos os termos e determinações e filtra na tela;
  - a aba de autos mostra um prazo de defesa de coluna inexistente.
- **Motivo da diferença**: prazos no servidor e iguais em todas as telas; alcance (A-026).
- **Objetos do catálogo**: `coluna:respostas_determinacao.status`, `indice:idx_autos_det`
- **Origem**: A-026 (decidido).

### R-sancionador-008 — Análise da resposta e Análise da Manifestação

- **Comportamento desejado**: a câmara técnica analisa cada resposta: acatada ou não acatada, com o
  texto da análise. A análise é um registro do processo, separado da resposta: nunca altera a
  manifestação, a data nem a pontualidade da entidade. Determinação sem resposta, com prazo vencido, é
  analisada como não atendida no prazo.

  **Concluir a AM** exige todas as determinações analisadas. Ao concluir, o servidor:
  - atribui o número da AM;
  - gera o documento da AM pelo layout da câmara (para cada determinação: NC, constatação, base
    legal, manifestação, análise, resultado e número do AI);
  - cria os autos das não acatadas (R-sancionador-009);
  - registra a movimentação.

  A AM assinada é anexada. **Refazer a análise** é possível enquanto nenhum auto foi enviado: cria
  uma nova versão da AM, a anterior fica no histórico, e os autos não enviados são cancelados com
  motivo. Nada é apagado.
- **Comportamento atual**:
  - a análise grava na própria resposta da entidade e troca a data dela pela data da análise;
  - sem resposta, a equipe cria uma resposta marcada como dentro do prazo;
  - a AM é gerada em PDF no navegador;
  - "excluir a análise" apaga os autos e as respostas da entidade e limpa o número da AM;
  - a tela de análise também gera autos sem número.
- **Motivo da diferença**: a manifestação da entidade é prova do processo e não pode ser alterada
  pela AGEMS (Princípio I); um só caminho de geração de autos.
- **Objetos do catálogo**: `coluna:respostas_determinacao.descricao_atendimento`,
  `coluna:termos_notificacao.am_concluida_em`, `coluna:termos_notificacao.arquivo_am_assinada_url`
- **Origem**: —

### R-sancionador-009 — Auto de infração

- **Comportamento desejado**: a AM concluída cria um auto por determinação não acatada, nunca dois
  para a mesma determinação, garantido pelo banco. O auto tem:
  - número (R-sancionador-003);
  - determinação de origem e descrição ("Determinação D<n> não atendida: <texto>");
  - unidade, fiscalização e entidade;
  - data de emissão;
  - pena base em UFERMS (inteiro positivo) e em R$ (não negativo), informadas pela câmara técnica;
  - AI assinado pela AGEMS;
  - AI assinado pela entidade (campo do auto, A-018);
  - protocolos de envio e de recebimento;
  - prazo de defesa;
  - situação: gerado, enviado, defesa recebida, com parecer, julgado, deliberado ou cancelado.
- **Comportamento atual**:
  - a situação é texto livre;
  - o padrão do banco ("pendente") difere do da tela ("gerado");
  - o envio tenta gravar o prazo de defesa em colunas que não existem, e o prazo se perde;
  - o portal procura o campo do AI assinado entre quatro nomes inexistentes, e o arquivo fica sem
    referência (5 arquivos órfãos em produção);
  - há uma coluna de valor sem uso.
- **Motivo da diferença**: A-018, A-029; prazo de defesa registrado.
- **Objetos do catálogo**: `tabela:autos_infracao`, `coluna:autos_infracao.id`,
  `coluna:autos_infracao.determinacao_id`, `coluna:autos_infracao.unidade_fiscalizada_id`,
  `coluna:autos_infracao.fiscalizacao_id`, `coluna:autos_infracao.prestador_servico_id`,
  `coluna:autos_infracao.descricao`, `coluna:autos_infracao.status`, `coluna:autos_infracao.data_emissao`,
  `coluna:autos_infracao.pena_base_uferms`, `coluna:autos_infracao.pena_base_rs`,
  `coluna:autos_infracao.arquivo_url`, `coluna:autos_infracao.arquivo_protocolo_oficio`,
  `coluna:autos_infracao.arquivo_protocolo_ai_recebido`, `coluna:autos_infracao.created_at`,
  `restricao:autos_infracao.autos_infracao_pena_base_rs_nonneg`,
  `restricao:autos_infracao.autos_infracao_determinacao_id_fkey`,
  `restricao:autos_infracao.autos_infracao_fiscalizacao_id_fkey`,
  `restricao:autos_infracao.autos_infracao_prestador_servico_id_fkey`,
  `restricao:autos_infracao.autos_infracao_unidade_fiscalizada_id_fkey`,
  `restricao:autos_infracao.autos_infracao_pkey`, `indice:autos_infracao_pkey`
- **Origem**: A-018, A-029 (decididos).

### R-sancionador-010 — Remessa dos autos

- **Comportamento desejado**: a câmara técnica monta a remessa com os autos prontos de um termo (pena
  base informada e AI assinado). O servidor gera a lista dos autos em PDF, e a remessa é enviada. Um
  termo tem no máximo uma remessa ativa, garantido pelo banco. A entidade registra, pelo portal e só
  nas próprias remessas, o recebimento, com o AI assinado por ela em cada auto. O servidor grava a
  data de recebimento e o prazo de defesa de cada auto (recebimento + prazo de defesa da câmara). No
  envio manual, a equipe registra os protocolos de envio e de recebimento.
- **Comportamento atual**:
  - a lista em PDF é gerada no navegador;
  - o número do TN na remessa fica sempre vazio, porque a tela lê um campo inexistente;
  - a unicidade é verificada só pela tela;
  - qualquer usuário ativo lê, cria, altera e exclui qualquer remessa;
  - as datas de recebimento e de defesa vêm do relógio do aparelho do prestador.
- **Motivo da diferença**: A-034; datas no servidor (A-014).
- **Objetos do catálogo**: `tabela:remessas_ai`, `coluna:remessas_ai.id`, `coluna:remessas_ai.termo_id`,
  `coluna:remessas_ai.fiscalizacao_id`, `coluna:remessas_ai.prestador_servico_id`,
  `coluna:remessas_ai.numero_rfp`, `coluna:remessas_ai.status`, `coluna:remessas_ai.arquivo_lista_pdf_url`,
  `coluna:remessas_ai.arquivo_recebimento_assinado_url`, `coluna:remessas_ai.criada_em`,
  `coluna:remessas_ai.enviada_em`, `coluna:remessas_ai.recebida_em`, `coluna:remessas_ai.updated_at`,
  `tabela:remessas_ai_itens`, `coluna:remessas_ai_itens.id`, `coluna:remessas_ai_itens.remessa_ai_id`,
  `coluna:remessas_ai_itens.auto_infracao_id`, `coluna:remessas_ai_itens.created_at`,
  `restricao:remessas_ai.remessas_ai_termo_id_fkey`, `restricao:remessas_ai.remessas_ai_fiscalizacao_id_fkey`,
  `restricao:remessas_ai.remessas_ai_prestador_servico_id_fkey`, `restricao:remessas_ai.remessas_ai_pkey`,
  `indice:remessas_ai_pkey`, `restricao:remessas_ai_itens.remessas_ai_itens_auto_infracao_id_fkey`,
  `restricao:remessas_ai_itens.remessas_ai_itens_remessa_ai_id_fkey`,
  `restricao:remessas_ai_itens.remessas_ai_itens_remessa_ai_id_auto_infracao_id_key`,
  `restricao:remessas_ai_itens.remessas_ai_itens_pkey`, `indice:remessas_ai_itens_pkey`,
  `indice:remessas_ai_itens_remessa_ai_id_auto_infracao_id_key`
- **Origem**: A-034 (decidido).

### R-sancionador-011 — Defesa

- **Comportamento desejado**: a defesa é um **registro próprio** do processo, um por auto (A-029). A
  entidade grava pelo portal, só nos próprios autos:
  - texto;
  - anexos (PDF ou imagem);
  - ofício de defesa.

  Pode salvar rascunho e enviar. O servidor grava a data do envio e se chegou no prazo de defesa.
  Depois de enviada, a defesa não é alterada pela entidade. No envio por papel, a equipe registra a
  defesa recebida. A remessa passa a "defesa recebida" quando todos os autos têm defesa ou prazo
  vencido.
- **Comportamento atual**:
  - o portal grava a defesa no auto, onde o prestador não tem permissão de alteração: a gravação
    não afeta nenhuma linha e não dá erro, e a defesa se perde;
  - o ofício de defesa fica na remessa, com a data do aparelho;
  - a tabela de manifestações sobre autos existe e não é usada (A-030).
- **Motivo da diferença**: A-029.
- **Objetos do catálogo**: `coluna:autos_infracao.defesa_texto`, `coluna:autos_infracao.defesa_arquivos`,
  `coluna:autos_infracao.arquivo_defesa`, `coluna:autos_infracao.arquivo_defesa_oficio`,
  `coluna:remessas_ai.arquivo_oficio_defesa_url`, `coluna:remessas_ai.defesa_enviada_em`
- **Origem**: A-029 (decidido).

### R-sancionador-012 — Parecer técnico

- **Comportamento desejado**: a câmara técnica escreve um parecer por auto, com:
  - análise técnica da defesa;
  - **recomendação**: manter, atenuar a pena (com o valor sugerido em UFERMS e em R$) ou cancelar;
  - documento assinado anexado.

  O processo é **encaminhado à câmara de julgamento** quando
  todos os autos não cancelados têm parecer assinado. Depois do encaminhamento, a câmara técnica não
  altera os pareceres. A entidade vê o parecer no portal depois do encaminhamento.
- **Comportamento atual**:
  - a recomendação tem duas opções na tela ("Aplicar multa" e "Arquivar"), sem atenuar;
  - o parecer assinado é enviado à entidade pela remessa ("parecer enviado"), e o processo termina
    aí;
  - em produção: nenhum parecer.
- **Motivo da diferença**: decisão do responsável (2026-10-01): o parecer lista, por auto, se mantém,
  atenua ou cancela, e segue para a câmara de julgamento.
- **Objetos do catálogo**: `tabela:pareceres_tecnicos`, `coluna:pareceres_tecnicos.id`,
  `coluna:pareceres_tecnicos.auto_id`, `coluna:pareceres_tecnicos.analise_tecnica`,
  `coluna:pareceres_tecnicos.recomendacao`, `coluna:pareceres_tecnicos.valor_multa_sugerido`,
  `coluna:pareceres_tecnicos.status`, `coluna:pareceres_tecnicos.arquivo_parecer_assinado_url`,
  `coluna:pareceres_tecnicos.created_at`, `coluna:remessas_ai.arquivo_parecer_assinado_url`,
  `coluna:remessas_ai.parecer_enviado_em`, `restricao:pareceres_tecnicos.pareceres_tecnicos_auto_id_fkey`,
  `restricao:pareceres_tecnicos.pareceres_tecnicos_pkey`, `indice:pareceres_tecnicos_pkey`
- **Origem**: decisão do responsável, 2026-10-01.

### R-sancionador-013 — Câmara de julgamento

- **Comportamento desejado**: a câmara de julgamento é **uma só para a agência** e julga os processos
  de todas as diretorias. É um **colegiado**, cuja composição (membros e vigência) é mantida pelo
  administrador. Um membro que não tenha outro papel entra com o papel "julgador", declarado por este
  app (R-core-023). A câmara:
  - recebe os processos encaminhados;
  - vê o processo inteiro, só para leitura;
  - registra a **decisão** de cada auto: mantém, atenua (com a multa decidida) ou cancela, com a
    fundamentação e o documento da decisão;
  - encaminha o processo à diretoria executiva.

  **Em aberto (Q1)**: se a decisão é registrada como resultado, por uma pessoa da câmara com a ata
  anexada, ou como voto de cada membro, com apuração pelo sistema; e se há devolução à câmara
  técnica.
- **Comportamento atual**: não existe no sistema. A tabela de julgamentos (decisão, multa final,
  justificativa) existe, está vazia, e nenhuma tela a grava (A-030).
- **Motivo da diferença**: decisão do responsável (2026-10-01): o processo vai da câmara técnica à
  câmara de julgamento e termina no sistema.
- **Objetos do catálogo**: `tabela:julgamentos`
- **Origem**: decisão do responsável, 2026-10-01; A-030.

### R-sancionador-014 — Deliberação da diretoria executiva

- **Comportamento desejado**: a diretoria executiva é um colegiado com composição mantida pelo
  administrador. Diretores que fazem parte dela continuam com o alcance de diretor (R-core-012) e
  ganham, pela composição, a ação desta etapa. Ela vê o processo inteiro, só para leitura, e
  registra a **deliberação final** de cada auto (resultado e multa final), com o documento da
  deliberação. Depois dela não há recurso administrativo: a via judicial fica fora do sistema.

  **Em aberto (Q1)**: a forma de registro, como na câmara de julgamento.
- **Comportamento atual**: não existe no sistema.
- **Motivo da diferença**: decisão do responsável (2026-10-01).
- **Objetos do catálogo**: — (etapa nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-sancionador-015 — Notificação da decisão final e encerramento

- **Comportamento desejado**: registrada a deliberação, o processo é **encerrado**. A entidade vê no
  portal a decisão final de cada auto e a multa, e recebe um aviso pela central de avisos do core. O
  processo encerrado é só leitura para todos. As decisões finais com multa ficam disponíveis por
  consulta para o futuro módulo de cobrança e dívida, que terá os registros dele.
- **Comportamento atual**: não existe.
- **Motivo da diferença**: decisão do responsável (2026-10-01).
- **Objetos do catálogo**: — (etapa nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-sancionador-016 — Documentos e arquivos

- **Comportamento desejado**: todo arquivo do processo é um **documento** ligado ao registro dono:
  - TN, relatório, protocolo, ofícios;
  - TN assinado pela entidade, termo de envio e respostas;
  - evidências;
  - AM, AI, lista da remessa;
  - defesa, parecer;
  - decisão e deliberação.

  Cada documento tem tipo, autor, data e checksum. Fica no repositório privado do app, um local fixo
  por tipo (A-019), e é entregue por endereço assinado depois da verificação de alcance (A-016). Os
  documentos gerados pelo sistema (AM, lista da remessa) usam o motor de documentos e o layout da
  câmara. Tamanho máximo e tipos aceitos são definidos no plano.
- **Comportamento atual**:
  - três repositórios privados que qualquer usuário ativo lê, envia, substitui e apaga;
  - o envio de arquivos do termo tenta vários repositórios até um aceitar;
  - as referências ficam em colunas de endereço e em listas;
  - em produção: 28 arquivos de termos (107 MB), 5 de autos (9,8 MB, sem referência) e 20 de
    evidências (31,6 MB, teste).
- **Motivo da diferença**: A-016, A-019.
- **Objetos do catálogo**: `bucket:documentos-termos`, `bucket:documentos-autos`,
  `bucket:evidencias-determinacoes`,
  `politica:storage.objects.documentos-autos authenticated all 1fhxxna_0`,
  `politica:storage.objects.documentos-autos authenticated all 1fhxxna_1`,
  `politica:storage.objects.documentos-autos authenticated all 1fhxxna_2`,
  `politica:storage.objects.documentos-autos authenticated all 1fhxxna_3`,
  `politica:storage.objects.documentos-termos authenticated all 16irk4e_0`,
  `politica:storage.objects.documentos-termos authenticated all 16irk4e_1`,
  `politica:storage.objects.documentos-termos authenticated all 16irk4e_2`,
  `politica:storage.objects.documentos-termos authenticated all 16irk4e_3`,
  `politica:storage.objects.p_evid_write`, `politica:storage.objects.tn_delete_authenticated`,
  `politica:storage.objects.tn_update_authenticated`, `politica:storage.objects.tn_upload_authenticated`
- **Origem**: A-016, A-019 (decididos).

### R-sancionador-017 — Linha do tempo e auditoria

- **Comportamento desejado**: o processo tem uma linha do tempo imutável com cada movimentação,
  emissão, envio, ciência, resposta, análise, defesa, parecer, decisão, deliberação, cancelamento e
  aviso, com autor e data. Toda escrita entra também na auditoria do core.
- **Comportamento atual**: não há histórico do processo; a auditoria do core não cobre estas tabelas.
- **Motivo da diferença**: rastro de um processo administrativo com efeito jurídico (Princípio I).
- **Objetos do catálogo**: — (conceito novo)
- **Origem**: —

### R-sancionador-018 — Quem alcança o quê

- **Comportamento desejado**:

  | Perfil | Alcance |
  |---|---|
  | coordenador e fiscal da câmara técnica | processos da sua câmara, com as ações das etapas da câmara técnica |
  | membro da câmara de julgamento | processos encaminhados ao julgamento ou que já passaram por ele, só leitura, exceto a decisão |
  | membro da diretoria executiva | processos encaminhados à deliberação ou que já passaram por ela, só leitura, exceto a deliberação |
  | diretor | processos das câmaras da sua diretoria, só leitura (R-core-012) |
  | administrador | tudo, inclusive a composição dos colegiados |
  | prestador | pelo portal, os termos emitidos para a sua entidade e o que deriva deles (A-027), e grava só o que é dele (FR-005) |

  A verificação vale para qualquer caminho, inclusive documentos, painéis e consultas de outros
  apps. Não há políticas de usuário de teste em produção (A-001).
- **Comportamento atual**:
  - políticas "acesso total" da equipe anulam a câmara em termos, respostas, autos, manifestações,
    pareceres e julgamentos;
  - nas remessas, qualquer perfil ativo faz tudo;
  - há políticas repetidas por dois conjuntos de funções.
- **Motivo da diferença**: A-026, A-034; decisão do responsável (2026-10-01) sobre os perfis por
  etapa.
- **Objetos do catálogo**: `politica:public.termos_notificacao.Fiscais e Admins: acesso total em termos`,
  `politica:public.termos_notificacao.Prestadores: ler seus termos`,
  `politica:public.termos_notificacao.termos_prestador_select_own`,
  `politica:public.termos_notificacao.termos_prestador_update_own_until_respondido`,
  `politica:public.termos_notificacao.termos_staff_all`,
  `politica:public.respostas_determinacao.Fiscais e Admins: acesso total em respostas determinacoes`,
  `politica:public.respostas_determinacao.Prestadores: ler suas próprias respostas determinacoes`,
  `politica:public.respostas_determinacao.respostas_det_staff_all`,
  `politica:public.autos_infracao.Fiscais e Admins: acesso por camara em autos`,
  `politica:public.autos_infracao.Prestadores: ler seus próprios autos`,
  `politica:public.autos_infracao.autos_prestador_select`, `politica:public.autos_infracao.autos_staff_all`,
  `politica:public.pareceres_tecnicos.Fiscais e Admins: acesso por camara em pareceres`,
  `politica:public.pareceres_tecnicos.Prestadores: ler pareceres de seus autos`,
  `politica:public.pareceres_tecnicos.pareceres_prestador_select`,
  `politica:public.pareceres_tecnicos.pareceres_staff_all`,
  `politica:public.remessas_ai.Acesso total autenticado (DEV)`,
  `politica:public.remessas_ai.Fiscais e Admins: acesso por camara em remessas`,
  `politica:public.remessas_ai.Prestadores: ler suas próprias remessas`,
  `politica:public.remessas_ai_itens.Acesso total autenticado (DEV)`,
  `politica:public.remessas_ai_itens.Fiscais e Admins: acesso por camara em itens de remessas`,
  `politica:public.remessas_ai_itens.Prestadores: ler itens de suas próprias remessas`,
  `politica:public.julgamentos.Fiscais e Admins: acesso total em julgamentos`,
  `politica:public.julgamentos.Prestadores: ler julgamentos de seus autos`,
  `politica:public.julgamentos.julgamentos_prestador_select`, `politica:public.julgamentos.julgamentos_staff_all`,
  `politica:public.manifestacoes_auto.Fiscais e Admins: acesso por camara em manifestacoes`,
  `politica:public.manifestacoes_auto.Prestadores: atualizar suas próprias manifestações`,
  `politica:public.manifestacoes_auto.Prestadores: cadastrar suas próprias manifestações`,
  `politica:public.manifestacoes_auto.Prestadores: ler suas próprias manifestações`,
  `politica:public.manifestacoes_auto.manifestacoes_prestador_select`,
  `politica:public.manifestacoes_auto.manifestacoes_staff_all`,
  e os privilégios sem login e de serviço das tabelas e funções do módulo (A-005), que não existem
  no sistema novo:
  `privilegio:autos_infracao.anon`, `privilegio:autos_infracao.authenticated`,
  `privilegio:autos_infracao.service_role`, `privilegio:gerar_numero_am.PUBLIC`,
  `privilegio:gerar_numero_am.anon`, `privilegio:gerar_numero_am.authenticated`,
  `privilegio:gerar_numero_am.service_role`, `privilegio:gerar_numero_auto.PUBLIC`,
  `privilegio:gerar_numero_auto.anon`, `privilegio:gerar_numero_auto.authenticated`,
  `privilegio:gerar_numero_auto.service_role`, `privilegio:julgamentos.anon`,
  `privilegio:julgamentos.authenticated`, `privilegio:julgamentos.service_role`,
  `privilegio:manifestacoes_auto.anon`, `privilegio:manifestacoes_auto.authenticated`,
  `privilegio:manifestacoes_auto.service_role`, `privilegio:pareceres_tecnicos.anon`,
  `privilegio:pareceres_tecnicos.authenticated`, `privilegio:pareceres_tecnicos.service_role`,
  `privilegio:proteger_resposta_determinacao_prestador.PUBLIC`,
  `privilegio:proteger_resposta_determinacao_prestador.anon`,
  `privilegio:proteger_resposta_determinacao_prestador.authenticated`,
  `privilegio:proteger_resposta_determinacao_prestador.service_role`,
  `privilegio:proteger_termo_prestador.PUBLIC`, `privilegio:proteger_termo_prestador.anon`,
  `privilegio:proteger_termo_prestador.authenticated`,
  `privilegio:proteger_termo_prestador.service_role`, `privilegio:remessas_ai.anon`,
  `privilegio:remessas_ai.authenticated`, `privilegio:remessas_ai.service_role`,
  `privilegio:remessas_ai_itens.anon`, `privilegio:remessas_ai_itens.authenticated`,
  `privilegio:remessas_ai_itens.service_role`, `privilegio:respostas_determinacao.anon`,
  `privilegio:respostas_determinacao.authenticated`,
  `privilegio:respostas_determinacao.service_role`,
  `privilegio:set_termos_notificacao_ano_geracao.PUBLIC`,
  `privilegio:set_termos_notificacao_ano_geracao.anon`,
  `privilegio:set_termos_notificacao_ano_geracao.authenticated`,
  `privilegio:set_termos_notificacao_ano_geracao.service_role`,
  `privilegio:termos_notificacao.anon`, `privilegio:termos_notificacao.authenticated`,
  `privilegio:termos_notificacao.service_role`, `privilegio:trg_auto_set_camara.PUBLIC`,
  `privilegio:trg_auto_set_camara.anon`, `privilegio:trg_auto_set_camara.authenticated`,
  `privilegio:trg_auto_set_camara.service_role`, `privilegio:trg_remessa_set_camara.PUBLIC`,
  `privilegio:trg_remessa_set_camara.anon`, `privilegio:trg_remessa_set_camara.authenticated`,
  `privilegio:trg_remessa_set_camara.service_role`
- **Origem**: A-026, A-034, A-027, A-001, A-005 (decididos); decisão do responsável, 2026-10-01.

### R-sancionador-019 — Cancelamento no lugar de exclusão

- **Comportamento desejado**: termo, AM, auto, remessa e parecer **emitidos** não são apagados: são
  cancelados com motivo, pela câmara técnica, enquanto o processo está na etapa dela. O cancelado
  fica visível e não devolve o número. Só o termo ainda não emitido pode ser excluído. Cancelar o
  termo cancela o processo, com movimentação e aviso à entidade, se ela já tinha sido notificada.
- **Comportamento atual**: excluir o termo (com a palavra "EXCLUIR") apaga em cascata as respostas,
  as evidências da entidade, os autos e os arquivos; excluir a análise apaga respostas e autos.
- **Motivo da diferença**: documentos emitidos e manifestações da entidade são provas do processo
  (Princípio I).
- **Objetos do catálogo**: — (regra nova sobre os registros acima)
- **Origem**: —

### R-sancionador-020 — Consultas para outros apps

- **Comportamento desejado**: o app oferece consultas de leitura, com o alcance aplicado:
  - **apps de câmara** (painéis da CATESA e da CATERS): contagem de termos e de autos da câmara por
    situação (specs 009 e 010);
  - **portal do prestador**: o que a spec do portal definir, a partir dos termos emitidos (A-027);
  - **futuro módulo de cobrança e dívida**: as decisões finais com multa (R-sancionador-015).

  O app também registra na fiscalização a verificação de documento ligado: fiscalização com termo
  não é excluída (R-fiscalizacao-015).
- **Comportamento atual**: os painéis das câmaras leem todas as tabelas e filtram na tela.
- **Motivo da diferença**: constituição, "Todo dado tem um app dono"; A-026.
- **Objetos do catálogo**: — (contrato entre apps)
- **Origem**: specs 009 e 010.

### R-sancionador-021 — Análise por IA não é refeita

- **Comportamento desejado**: o sistema novo não tem a análise da resposta por IA. Se uma análise
  automatizada vier a existir por nova decisão, ela nunca cria resposta nem marca pontualidade.
- **Comportamento atual**: a análise da resposta pede à fila de IA da CATESA um veredito, que pode
  criar resposta marcada como no prazo.
- **Motivo da diferença**: A-039; A-036.
- **Objetos do catálogo**: — (fila da CATESA, R-catesa-006)
- **Origem**: A-036, A-039 (decididos).

### R-sancionador-022 — O que não é levado

- **Comportamento desejado**: o sistema novo não tem:
  - as tabelas de manifestações sobre autos e de julgamentos (A-030); a defesa e o julgamento são os
    registros novos das R-sancionador-011 e R-sancionador-013;
  - as colunas sem uso: resposta e tipo de resposta, valor e resposta de origem do auto, número do TN
    da remessa (sempre vazio);
  - as funções e os gatilhos do banco (as regras vão para os serviços do app, A-005);
  - as políticas repetidas.
- **Comportamento atual**: esses objetos existem, vazios ou sem efeito.
- **Motivo da diferença**: A-030, A-005.
- **Objetos do catálogo**: `tabela:manifestacoes_auto`, `coluna:manifestacoes_auto.id`,
  `coluna:manifestacoes_auto.auto_infracao_id`, `coluna:manifestacoes_auto.descricao`,
  `coluna:manifestacoes_auto.data_manifestacao`, `coluna:manifestacoes_auto.arquivo_url`,
  `coluna:manifestacoes_auto.created_at`, `restricao:manifestacoes_auto.manifestacoes_auto_auto_infracao_id_fkey`,
  `restricao:manifestacoes_auto.manifestacoes_auto_pkey`, `indice:manifestacoes_auto_pkey`,
  `coluna:julgamentos.id`, `coluna:julgamentos.parecer_tecnico_id`, `coluna:julgamentos.auto_id`,
  `coluna:julgamentos.prestador_servico_id`, `coluna:julgamentos.decisao`,
  `coluna:julgamentos.valor_multa_final`, `coluna:julgamentos.justificativa_decisao`,
  `coluna:julgamentos.data_julgamento`, `coluna:julgamentos.status`, `coluna:julgamentos.created_at`,
  `restricao:julgamentos.julgamentos_auto_id_fkey`, `restricao:julgamentos.julgamentos_parecer_tecnico_id_fkey`,
  `restricao:julgamentos.julgamentos_prestador_servico_id_fkey`, `restricao:julgamentos.julgamentos_pkey`,
  `indice:julgamentos_pkey`, `coluna:respostas_determinacao.resposta`,
  `coluna:respostas_determinacao.tipo_resposta`, `coluna:autos_infracao.valor`,
  `coluna:autos_infracao.resposta_determinacao_id`, `coluna:remessas_ai.numero_tn`
- **Origem**: A-030, A-005 (decididos).

### R-sancionador-023 — O app não escreve nos outros apps

- **Comportamento desejado**: o app lê a fiscalização (fiscalização finalizada, unidades, NCs,
  determinações, relatório vigente) pelas consultas dela e nunca altera as determinações: o
  cumprimento e a análise ficam nos registros dele (R-fiscalizacao-009). Um teste falha se o app
  gravar em modelo de outro app.
- **Comportamento atual**: as telas leem as tabelas da fiscalização direto; a exclusão do termo apaga
  arquivos ligados às determinações.
- **Motivo da diferença**: constituição, "Todo dado tem um app dono".
- **Objetos do catálogo**: — (contrato entre apps)
- **Origem**: constituição v2.5.0.

## Telas do sistema atual

### Gerenciar termos (`src/pages/GerenciarTermos.jsx`, `src/components/termos/TermosFiltros.jsx`, `src/components/termos/TermosKPI.jsx`)

| Ação | Regra |
|---|---|
| Listar termos com filtros (número, câmara, situação, período) e indicadores | R-sancionador-005, R-sancionador-018 |
| Criar termo: número, tipo e número do relatório, processo, fiscalização, câmara, prazo, observações | R-sancionador-003, R-sancionador-004 |
| Anexar TN e relatório assinados (AGEMS) | R-sancionador-004, R-sancionador-016 |
| Anexar TN assinado pela entidade; marcar assinatura válida; informar início do prazo | R-sancionador-005 |
| Fluxo manual: registrar protocolo ou AR e ofício; registrar recebimento da resposta e ofício | R-sancionador-004, R-sancionador-006 |
| Excluir termo digitando "EXCLUIR" | R-sancionador-019 (cancelamento) |

### Analisar resposta (`src/pages/AnalisarResposta.jsx`)

| Ação | Regra |
|---|---|
| Ver determinação, NC, constatação, evidências e manifestação | R-sancionador-006, R-sancionador-008 |
| Registrar análise (acatada, não acatada) | R-sancionador-008 |
| Gerar autos das não atendidas, sem número | R-sancionador-008 (um só caminho, pela AM) |
| Analisar com IA e aplicar veredito | R-sancionador-021 (retirada) |

### Análise da manifestação (`src/pages/AnaliseManifestacao.jsx`)

| Ação | Regra |
|---|---|
| Indicadores (termos, aguardando análise, concluídas, autos gerados) e filtros | R-sancionador-002, R-sancionador-018 |
| Concluir AM: número e autos das não acatadas | R-sancionador-003, R-sancionador-008, R-sancionador-009 |
| Baixar o PDF da AM; anexar AM assinada | R-sancionador-008, R-sancionador-016 |
| Excluir análise (apaga respostas e autos) | R-sancionador-008 (refazer em nova versão), R-sancionador-019 |

### Gestão de autos (`src/pages/GestaoAutos.jsx`, `src/components/autos/FluxoUploadDocumentos.jsx`)

| Ação | Regra |
|---|---|
| Indicadores por situação (gerados, enviados, em análise, finalizados) | R-sancionador-009 |
| Informar pena base em UFERMS e R$ | R-sancionador-009 |
| Anexar AI assinado, protocolos (ofício, AI recebido), defesa (ofício e arquivo) | R-sancionador-009, R-sancionador-010, R-sancionador-011 |
| Criar e enviar remessa com a lista em PDF; ver remessas e itens | R-sancionador-010 |
| Ver defesa (texto e anexos); escrever parecer; anexar parecer assinado | R-sancionador-011, R-sancionador-012 |

### Pareceres técnicos (`src/pages/PareceresTecnicos.jsx`)

| Ação | Regra |
|---|---|
| Lotes pendentes e encaminhados | R-sancionador-012 |
| Parecer: recomendação (aplicar multa, arquivar), valor sugerido, análise técnica, assinado | R-sancionador-012 (manter, atenuar ou cancelar) |
| Encaminhar parecer à entidade | R-sancionador-012 (encaminhamento à câmara de julgamento) |

### Acompanhamento de determinações (`src/pages/AcompanhamentoDeterminacoes.jsx`, `src/components/determinacoes/`)

| Ação | Regra |
|---|---|
| Vencidas, a vencer em 7 dias, respondidas, total; filtros | R-sancionador-007 |
| Tempo médio de resposta, evolução, mapa por município | R-sancionador-007 |
| Abas por situação; "Analisar"; aba de autos com prazo de defesa | R-sancionador-007, R-sancionador-008, R-sancionador-009 |

### Portal do prestador (`src/pages/ResponderTermo.jsx`, `src/pages/PortalPrestadorHome.jsx`)

| Ação | Regra |
|---|---|
| Ver termos, assinar o TN | fora: portal_prestador (tela); regra: R-sancionador-005 |
| Responder determinações com manifestação e evidências; termo de envio | fora: portal_prestador (tela); regra: R-sancionador-006 |
| Enviar AI assinado; registrar recebimento da remessa | fora: portal_prestador (tela); regra: R-sancionador-010 |
| Defesa: texto, anexos e ofício | fora: portal_prestador (tela); regra: R-sancionador-011 |

### Painel da CATESA (`src/pages/CatesaDashboard.jsx`)

| Ação | Regra |
|---|---|
| Contadores de termos e autos por situação | fora: catesa (R-catesa-005), pela consulta da R-sancionador-020 |

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Encaminhar o processo à câmara de julgamento; à diretoria executiva | R-sancionador-002, R-sancionador-012, R-sancionador-013 |
| Registrar a decisão da câmara de julgamento | R-sancionador-013 |
| Registrar a deliberação da diretoria executiva | R-sancionador-014 |
| Ver a decisão final no portal | R-sancionador-015 |
| Manter a composição dos colegiados | R-sancionador-013, R-sancionador-014 |
| Cancelar documento emitido, com motivo | R-sancionador-019 |
| Configurar prazos, layouts e base legal da câmara | R-sancionador-001 |

## Migração

Mapa: `specs/003-base-dados-producao/anotacoes/migracao/processo_sancionador.toml`, criado com o
data-model do plano desta spec (passo 7 do molde).

### Volumes de produção

| Origem | Registros | Destino |
|---|---:|---|
| `tabela:termos_notificacao` | 5 | Processo e termo de notificação; as colunas de endereço viram documentos |
| `tabela:respostas_determinacao` | 34 | Respostas; todas de teste (A-002), não migradas se confirmadas na lista |
| `tabela:autos_infracao`, `tabela:remessas_ai`, `tabela:remessas_ai_itens`, `tabela:pareceres_tecnicos` | 0 | Modelos do app (sem dado) |
| `tabela:manifestacoes_auto`, `tabela:julgamentos` | 0 | Não levadas (A-030) |
| `bucket:documentos-termos` | 28 arquivos | Documentos dos termos e das AMs |
| `bucket:documentos-autos` | 5 arquivos | Sem registro que aponte para eles (A-018); listados para decisão |
| `bucket:evidencias-determinacoes` | 20 arquivos | Evidências das respostas de teste (A-002) |

### Critérios

| Critério | Meta |
|---|---|
| MIG-1 Registros | Os termos fora da lista de teste chegam com os mesmos identificadores; cada um vira um processo na etapa correspondente |
| MIG-2 Valores | Números, datas, prazos e pontualidade iguais aos de origem; a situação calculada é conferida contra a gravada |
| MIG-3 Arquivos | Cada arquivo referenciado chega como documento do registro, com o mesmo checksum |
| MIG-4 Legados | Número de TN repetido ou fora do formato, câmara em texto sem correspondência e arquivo sem referência são carregados ou listados, nunca descartados em silêncio |
| MIG-5 Descartes | Registros e arquivos de teste (A-002), tabelas sem uso (A-030) e colunas sem uso, com o volume listado |
| MIG-6 Mapa | 0 pendentes em `processo_sancionador.toml` |

### Casos conhecidos

- **Dados de teste**: as 34 respostas e as 20 evidências são de teste (A-002). A lista final de
  identificadores, inclusive dos termos de teste, é fechada com o responsável antes da carga.
- **Sequências**: a numeração de cada tipo, diretoria e ano começa no maior número migrado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 números repetidos de TN, AM e AI em teste com 50 emissões simultâneas.
- **SC-002**: 100% dos prazos, datas-limite e pontualidades são iguais em todas as telas, painéis e
  avisos, e nenhum é gravado pelo aparelho do prestador.
- **SC-003**: 0 respostas ou defesas da entidade alteradas ou apagadas pela AGEMS em qualquer
  operação, inclusive refazer a análise e cancelar.
- **SC-004**: Toda defesa enviada pelo portal fica registrada (0 perdas, ao contrário de hoje).
- **SC-005**: Em teste com usuários de duas câmaras, um membro da câmara de julgamento, um da
  diretoria executiva, um diretor e dois prestadores, 0 processos, documentos ou ações fora do
  alcance são alcançados.
- **SC-006**: Um processo completo, da emissão do TN à deliberação, passa por todas as etapas no
  sistema, com 100% das movimentações na linha do tempo.
- **SC-007**: O código do app cita 0 câmaras (verificado por teste) e grava 0 vezes em modelos de
  outros apps.
- **SC-008**: 100% das regras de acesso deste módulo têm teste automatizado.

## Assumptions

- **Escopo do portal**: as telas do prestador são da spec do portal; esta spec define o que ele grava
  e quando.
- **Documentos assinados fora do sistema**: TN, AI, AM, parecer, decisão e deliberação são
  assinados fora do sistema e anexados em PDF, como hoje. A assinatura digital não é verificada.
- **Prazos padrão**: 30 dias para a resposta ao TN e para a defesa, configuráveis por câmara.
- **Fuso**: datas e prazos no fuso de Mato Grosso do Sul, contando o último dia.
- **Câmaras técnicas que autuam**: qualquer câmara pode usar o app; hoje só CATESA e CATERS o usam.
- **Sem uso sem rede**: o processo é trabalho de escritório e do portal; exige rede.
- **Questões em aberto** (registradas pelo responsável em 2026-10-01, a resolver antes do plano das
  etapas de julgamento e deliberação):
  - **Q1**: como a decisão da câmara de julgamento e a deliberação da diretoria executiva são
    registradas: resultado com ata, por uma pessoa, ou voto de cada membro com apuração; se a câmara
    de julgamento pode devolver o processo à câmara técnica; quem registra a deliberação.
  - **Q2**: se a entidade é notificada também da decisão da câmara de julgamento, ou só da
    deliberação final.
- **Cobrança e dívida**: módulo próprio futuro, que lê as decisões finais pela consulta da
  R-sancionador-020.
