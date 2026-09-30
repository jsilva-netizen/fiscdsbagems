# Feature Specification: Módulo planejamento — plano anual de fiscalizações

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec de módulo do planejamento de fiscalizações do sistema novo da AGEMS, terceiro módulo da
ordem da spec 003 (depois de core e checklists, antes da fiscalização), escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes:
- o assessment `.specify/assessments/planejamento-fiscalizacoes/` (veredito go, opção B, com a
  revisão depois da planilha real);
- a planilha real da DSB ("Anexo I — Cronograma de Fiscalização",
  `.specify/assessments/planejamento-fiscalizacoes/cronograma-dsb-2026-jul-set.pdf`);
- a constituição v2.6.2 e as specs 004 (core) e 005 (checklists).

## Contexto

Hoje o planejamento anual de fiscalizações é feito fora do sistema. Cada câmara monta uma planilha,
e o diretor aprova por e-mail ou ofício. A planilha da DSB (Anexo I) tem uma linha por **viagem**,
com mês, datas de início e fim, municípios, serviços fiscalizados, distância em KM, autonomia do
veículo, litros e custo de combustível, quantidade de servidores, quantidade e valor das diárias e o
custo total. Ela é revisada por trimestre ("atualização"), e tem erros de conta em 3 das 10
viagens: as duas de agosto estão com os totais de diárias trocados, e o total de junho está
R$ 50,00 acima da soma.

O sistema atual não tem nenhum objeto de planejamento. Este módulo é funcionalidade nova, e suas
regras não citam objetos do catálogo da spec 003, exceto para comparar com a fiscalização atual.

O planejamento é um **app comum**, construído como peças de montar ("lego", constituição v2.6.0 a
v2.6.2), sem nada de câmara chumbado:
- **Peças do app**: plano anual, viagem, participação de câmara, atividade, equipe, custos
  estimados, aprovação, tipos de mudança, liberação de servidores, histórico, cronograma e consulta
  sem rede.
- **Configuração da câmara** (feita na tela): os tipos de atividade, quais tipos de mudança pedem
  aprovação e o layout do cronograma.
- **Peças trazidas por outros apps**: os tipos de destino de uma viagem. O core oferece município e
  entidade regulada; o app da CATERF oferece concessão e rodovia.

Planejamento e execução de campo são conceitos distintos (constituição, "Fronteiras de domínio"). O
planejamento não cria nem conhece a fiscalização. A fiscalização, que vem depois na ordem, é que
aponta para a atividade planejada.

Fica fora desta spec:
- pagar diárias, abastecer ou reservar veículos, lançar ponto: são ações de financeiro, frotas e RH
  nos apps deles, que só leem o plano;
- a execução da fiscalização;
- otimização automática de rotas ou escalas;
- elaborar, alterar ou aprovar o plano sem rede;
- publicação do plano ao público em geral;
- análise por IA.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O coordenador elabora o plano anual da câmara (Priority: P1)

O coordenador da câmara registra as viagens previstas para o ano. Para cada viagem, informa:
- o período;
- os destinos (municípios, entidades, concessões);
- as atividades, com os serviços de cada uma;
- a distância e o veículo, ou a autonomia do veículo;
- a quantidade de servidores e de diárias.

O sistema calcula o custo estimado de combustível e diárias por viagem e o total do plano, e o
coordenador envia o plano para o diretor.

**Why this priority**: sem plano registrado não há aprovação, consulta nem elo com a execução.

**Independent Test**: o coordenador da CATESA registra três viagens iguais às de fevereiro, março e
abril do Anexo I, e os custos calculados batem com a planilha. Exemplo: 700 KM a 8 km/L e R$ 7,00
por litro dão R$ 612,50 de combustível; 10 diárias de R$ 200,00 dão R$ 2.000,00; total R$ 2.612,50.
Depois o coordenador envia o plano.

**Acceptance Scenarios**:

1. **Given** uma viagem com 1.200 KM, autonomia de 8 km/L e litro a R$ 7,00, **When** o coordenador
   salva, **Then** o sistema mostra 150 litros e R$ 1.050,00 de combustível.
2. **Given** uma viagem com 7,5 diárias para um município de R$ 240,00 na tabela, **When** o
   coordenador salva, **Then** o sistema mostra R$ 1.800,00 de diárias.
3. **Given** uma viagem cuja data de fim é anterior à de início, **When** o coordenador salva,
   **Then** o sistema recusa e mostra o motivo.
4. **Given** um plano em rascunho, **When** o coordenador o envia, **Then** o diretor passa a vê-lo
   como pendente de aprovação e o coordenador não o altera mais até a decisão.

---

### User Story 2 - O diretor aprova ou devolve o plano (Priority: P1)

O diretor vê os planos das câmaras da sua diretoria, com os totais, e aprova ou devolve com o motivo.
Aprovado, o plano passa a valer para todos que o consultam.

**Why this priority**: a aprovação é o ato que hoje sai por e-mail ou ofício e é a única escrita do
diretor (R-core-012).

**Independent Test**: o diretor da DSB devolve o plano da CATERS com um motivo; o coordenador ajusta
e reenvia; o diretor aprova. O histórico mostra o envio, a devolução com o motivo, o reenvio e a
aprovação, com autor e data.

**Acceptance Scenarios**:

1. **Given** um plano enviado, **When** o diretor o devolve com um motivo, **Then** o plano volta a
   rascunho e o coordenador vê o motivo.
2. **Given** um plano enviado, **When** o diretor o aprova, **Then** o plano e as viagens dele passam
   a aprovados, e fiscais, RH, financeiro e frotas passam a vê-los.
3. **Given** um diretor da DTR, **When** tenta ver o plano de uma câmara da DSB, **Then** o sistema
   se comporta como se o plano não existisse.

---

### User Story 3 - Mudanças depois da aprovação (Priority: P1)

Depois da aprovação, o plano muda: datas, destinos, diárias, viagens canceladas ou incluídas. Cada
mudança é de um tipo de uma lista fechada, e a câmara define quais tipos pedem nova aprovação do
diretor. Mudança que aumenta o valor das diárias sempre pede. Enquanto a mudança espera, vale a
versão aprovada.

**Why this priority**: é o que o processo atual não registra, e é o que RH, financeiro e frotas
precisam acompanhar.

**Independent Test**:
- o coordenador ajusta a data de uma viagem dentro do mesmo mês, tipo marcado como "não pede
  aprovação": a mudança vale na hora;
- ele aumenta as diárias de outra viagem: a mudança fica pendente, a versão aprovada continua
  valendo, e o diretor aprova;
- o histórico mostra as duas mudanças com o antes e o depois.

**Acceptance Scenarios**:

1. **Given** uma viagem aprovada e o tipo "datas no mesmo mês" marcado como "não pede aprovação",
   **When** o coordenador muda as datas dentro do mês, **Then** a nova versão vale imediatamente e
   fica no histórico.
2. **Given** uma viagem aprovada, **When** o coordenador aumenta a quantidade de diárias, **Then** a
   mudança fica pendente de aprovação, qualquer que seja a configuração da câmara.
3. **Given** uma mudança pendente, **When** alguém consulta a viagem, **Then** vê a versão aprovada,
   e o coordenador e o diretor veem também a proposta.
4. **Given** uma câmara, **When** o coordenador tenta desmarcar "aumento do valor das diárias" como
   "pede aprovação", **Then** o sistema não permite.

---

### User Story 4 - Viagens extras (Priority: P2)

Uma denúncia, uma emergência ou uma fiscalização eventual exige uma viagem fora do plano. O
coordenador a registra como viagem extra, com o motivo, e ela segue para aprovação do diretor.

**Why this priority**: as fiscalizações fora do plano continuam existindo e precisam chegar às áreas
como as demais.

**Independent Test**: o coordenador registra uma viagem extra por denúncia; o diretor aprova; ela
aparece no plano marcada como extra, com o motivo, e entra no cronograma do período.

**Acceptance Scenarios**:

1. **Given** um plano aprovado, **When** o coordenador registra uma viagem extra sem motivo, **Then**
   o sistema recusa.
2. **Given** uma viagem extra enviada, **When** o diretor a aprova, **Then** ela passa a valer como
   as viagens do plano, marcada como extra.

---

### User Story 5 - Equipe nominal e liberação de servidores de outra câmara (Priority: P2)

Depois da aprovação, o coordenador escala nominalmente os servidores da viagem, até a quantidade
aprovada. Servidor da própria câmara entra direto. Servidor de outra câmara só entra depois que o
coordenador dessa câmara libera.

**Why this priority**: RH e financeiro precisam dos nomes, e a liberação é a regra da agência para
usar servidor de outra câmara.

**Independent Test**:
- o coordenador da CATESA escala dois fiscais dele e pede um fiscal da CATERS;
- o coordenador da CATERS recebe o pedido e libera;
- o fiscal da CATERS passa a ver a viagem;
- tentar escalar um quarto servidor, além da quantidade aprovada, é recusado.

**Acceptance Scenarios**:

1. **Given** uma viagem aprovada para 3 servidores, **When** o coordenador tenta escalar o quarto,
   **Then** o sistema recusa e indica que é preciso uma mudança de quantidade.
2. **Given** um pedido de liberação, **When** o coordenador da câmara de origem recusa com motivo,
   **Then** o servidor não entra na equipe, e o coordenador que pediu vê o motivo.
3. **Given** um plano ainda não aprovado, **When** o coordenador tenta pedir a liberação de um
   servidor de outra câmara, **Then** o sistema não permite: a liberação vem depois da aprovação.
4. **Given** um servidor escalado numa viagem, **When** o coordenador tenta escalá-lo em outra viagem
   com período sobreposto, **Then** o sistema recusa e mostra o conflito.

---

### User Story 6 - Viagem conjunta de duas câmaras (Priority: P2)

A CATESA e a CATERS vão aos mesmos municípios na mesma viagem. Cada câmara tem na viagem as suas
atividades, os seus serviços, a sua equipe e as suas diárias, e cada coordenador cuida só da sua
parte. O diretor vê a viagem inteira.

**Why this priority**: é como a DSB viaja hoje ("SAA, SES e RS" na mesma linha do Anexo I).

**Independent Test**:
- o coordenador da CATESA cria a viagem com a sua parte (SAA e SES) e convida a CATERS;
- o coordenador da CATERS acrescenta a parte dela (RS);
- cada plano mostra a sua parte e os seus custos, e o cronograma da diretoria mostra a viagem com
  os três serviços;
- o coordenador da CATERS não consegue mudar a parte da CATESA.

**Acceptance Scenarios**:

1. **Given** uma viagem conjunta, **When** o coordenador da CATERS tenta alterar as diárias da
   CATESA, **Then** o sistema recusa.
2. **Given** uma viagem conjunta, **When** a câmara organizadora muda o período, **Then** a mudança
   segue o tipo "datas" e as outras câmaras participantes são avisadas.
3. **Given** uma câmara de outra diretoria, **When** alguém tenta incluí-la numa viagem conjunta,
   **Then** o sistema recusa.

---

### User Story 7 - Consultar o plano: fiscal, prestador e outras áreas (Priority: P2)

- O fiscal consulta o plano da câmara e, no aparelho, sem rede, as viagens em que está escalado.
- O prestador vê, no portal, o objeto e o período das atividades previstas para a sua entidade,
  depois da aprovação, exceto as que a câmara escondeu.
- RH, financeiro e frotas leem o plano aprovado, sem poder alterá-lo, quando os apps deles existirem.

**Why this priority**: é para isso que o plano existe depois de aprovado.

**Independent Test**:
- um fiscal escalado abre, sem rede, a viagem em que está escalado, com datas, destinos, equipe e
  veículo;
- o prestador da entidade A vê a atividade prevista para ela, com objeto e mês, e não vê equipe,
  veículo, diárias nem atividades de outras entidades;
- uma atividade escondida pela câmara não aparece para o prestador.

**Acceptance Scenarios**:

1. **Given** um fiscal escalado numa viagem aprovada, **When** abre o aplicativo sem rede, **Then**
   vê a viagem.
2. **Given** um plano em rascunho, **When** o prestador consulta o portal, **Then** não vê nada dele.
3. **Given** um papel de outra área (RH), **When** tenta alterar qualquer dado do plano, **Then** o
   sistema recusa.

---

### User Story 8 - Emitir o cronograma (Priority: P3)

O coordenador ou o diretor emite o cronograma de um período, no formato do Anexo I e no layout da
câmara, para anexar ao processo. A "atualização" de um período lista as mudanças aprovadas ou
registradas nele.

**Why this priority**: o cronograma é o documento que hoje circula; o sistema o gera a partir do
plano, sem redigitar.

**Independent Test**: o cronograma de julho a setembro da CATESA, emitido pelo sistema, tem as mesmas
colunas e valores do Anexo I (com as contas certas), e a atualização do trimestre lista as mudanças
do período.

**Acceptance Scenarios**:

1. **Given** um plano aprovado, **When** o coordenador emite o cronograma de um trimestre, **Then**
   recebe um documento com as viagens do período, os totais e a versão aprovada de cada viagem.
2. **Given** mudanças no trimestre, **When** emite a atualização do período, **Then** o documento
   lista cada mudança com o antes, o depois e a aprovação, quando houver.

---

### Edge Cases

- **Viagem que atravessa o fim do ano**: pertence ao plano do ano em que começa.
- **Município de destino sem valor na tabela de diárias**: o coordenador informa o valor unitário,
  com justificativa. Isso fica visível na aprovação, e a viagem é marcada até a tabela ter o valor.
- **Viagem com vários municípios**: a diária de cada lançamento usa o município que o coordenador
  indicar como referência. O padrão é o primeiro destino.
- **Mudança da tabela de diárias ou do preço do litro**: não muda valores já aprovados. Vale para
  viagens criadas ou alteradas depois, e a mudança que aumentar o valor das diárias de uma viagem
  aprovada pede aprovação.
- **Duas mudanças pendentes na mesma viagem**: não é possível; a segunda espera a decisão da
  primeira ou a substitui, se o coordenador a retirar.
- **Coordenador e diretor na mesma pessoa**: não ocorre pelos papéis do core (R-core-002); o
  administrador também não aprova.
- **Servidor desativado com escala futura**: sai da equipe das viagens futuras, e o coordenador é
  avisado. As viagens passadas mantêm o nome (R-core-007).
- **Pedido de liberação sem resposta até o início da viagem**: expira, e o coordenador que pediu é
  avisado.
- **Viagem cancelada com fiscalização já ligada**: o cancelamento é registrado, e a fiscalização
  continua existindo. Quem avisa a inconsistência é o app de fiscalização (R-planejamento-021).
- **Câmara nova sem configuração**: começa com a configuração padrão (R-planejamento-018) e pode
  ajustá-la antes do primeiro envio.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada câmara MUST ter no máximo um plano por ano, com situação rascunho, enviado ou
  aprovado (R-planejamento-001).
- **FR-002**: O plano MUST ser composto de viagens, com período, destinos, atividades, distância,
  veículo ou autonomia, e a quantidade de servidores e de diárias (R-planejamento-002,
  R-planejamento-003, R-planejamento-004).
- **FR-003**: Os tipos de destino MUST ser os oferecidos pelos apps instalados; o planejamento MUST
  NOT conter tipo de destino de uma câmara (R-planejamento-003, R-planejamento-022).
- **FR-004**: Uma viagem MUST poder ser conjunta de câmaras da mesma diretoria, com a parte de cada
  câmara mantida só pelo coordenador dela (R-planejamento-005).
- **FR-005**: O sistema MUST calcular o custo estimado de combustível e de diárias, por viagem, por
  câmara e por plano (R-planejamento-006).
- **FR-006**: Só o diretor da diretoria MUST poder aprovar ou devolver planos, viagens extras e
  mudanças (R-planejamento-007).
- **FR-007**: Mudanças depois da aprovação MUST ser de um tipo de uma lista fechada; a câmara MUST
  poder marcar quais pedem aprovação, e o aumento do valor de diárias MUST sempre pedir
  (R-planejamento-008).
- **FR-008**: Enquanto uma mudança espera aprovação, MUST valer a versão aprovada para todos os
  leitores (R-planejamento-008).
- **FR-009**: Viagens extras MUST ter motivo e aprovação do diretor (R-planejamento-009).
- **FR-010**: Toda versão de plano e de viagem MUST ser guardada, e toda ação MUST ser auditada
  (R-planejamento-010).
- **FR-011**: A equipe nominal MUST ser escalada depois da aprovação, até a quantidade aprovada, só
  com servidores das câmaras, sem sobreposição de períodos (R-planejamento-011).
- **FR-012**: Escalar servidor de outra câmara MUST depender da liberação do coordenador daquela
  câmara, pedida depois da aprovação (R-planejamento-012).
- **FR-013**: O planejamento MUST manter o cadastro de veículos e a tabela de diárias por município
  até os apps de frotas e financeiro existirem (R-planejamento-013, R-planejamento-014).
- **FR-014**: Fiscais e coordenadores MUST alcançar só os planos da própria câmara e as viagens em
  que estão escalados; o diretor, os da sua diretoria (R-planejamento-016).
- **FR-015**: O fiscal MUST ter no aparelho, sem rede, as viagens aprovadas em que está escalado
  (R-planejamento-017).
- **FR-016**: O prestador MUST ver só o objeto e o período das atividades aprovadas previstas para a
  sua entidade e não escondidas (R-planejamento-019).
- **FR-017**: Papéis de outras áreas e credenciais de sistema MUST poder ler o plano aprovado e MUST
  NOT alterá-lo (R-planejamento-020).
- **FR-018**: O sistema MUST emitir o cronograma e a atualização de um período, no layout da câmara
  (R-planejamento-015).
- **FR-019**: O planejamento MUST oferecer à fiscalização as atividades de fiscalização aprovadas
  para ligação, sem depender dela (R-planejamento-021).
- **FR-020**: A câmara MUST configurar na tela os tipos de atividade, a marcação dos tipos de
  mudança e o layout do cronograma (R-planejamento-018).
- **FR-021**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Plano anual**: câmara, ano, situação (rascunho, enviado, aprovado), parâmetros (preço do litro),
  totais, versões.
- **Viagem**: período, destinos, câmara organizadora, participações, distância, veículo ou
  autonomia, origem (planejada ou extra, com motivo), situação (prevista, cancelada), versões.
- **Destino**: referência a um objeto de um tipo oferecido por um app (município, entidade regulada,
  concessão, rodovia).
- **Participação de câmara**: a parte de uma câmara numa viagem: atividades, quantidade de
  servidores, lançamentos de diárias, equipe nominal, custos.
- **Atividade**: tipo (da lista da câmara, com a marca "é fiscalização"), serviços, entidade regulada
  alvo quando houver, "escondida do prestador".
- **Lançamento de diárias**: quantidade (múltiplos de meia diária), município de referência, valor
  unitário e total.
- **Mudança**: tipo (da lista fechada), antes, depois, autor, data, situação (pendente, aprovada,
  devolvida, aplicada sem aprovação).
- **Escala e pedido de liberação**: servidor, viagem, câmara de origem, situação (pedida, liberada,
  recusada, expirada), motivo.
- **Veículo**: identificação, placa, autonomia em km/L, situação.
- **Tabela de diárias**: município, valor unitário, início de vigência.
- **Configuração da câmara**: tipos de atividade, marcação dos tipos de mudança, layout do
  cronograma.
- **Tipo de destino**: peça registrada por um app, com o app que a oferece.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. O planejamento é funcionalidade nova:
as regras não têm comportamento atual no sistema. Quando o processo de hoje (planilha e aprovação por
e-mail ou ofício) é relevante, ele aparece em "Comportamento atual".

### R-planejamento-001 — Plano anual da câmara

- **Comportamento desejado**: cada câmara tem no máximo um plano por ano. O plano nasce em
  rascunho, criado pelo coordenador da câmara. Enviado ao diretor, fica bloqueado para edição até a
  decisão. Devolvido, volta a rascunho, com o motivo. Aprovado, passa a valer, e dali em diante só
  muda pelas mudanças da R-planejamento-008. O plano guarda os totais estimados e o preço do litro
  usado nos cálculos.
- **Comportamento atual**: uma planilha por câmara, sem situação formal; a aprovação sai por e-mail
  ou ofício.
- **Motivo da diferença**: registrar e rastrear o plano e a aprovação (assessment
  planejamento-fiscalizacoes, G1 e G2).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30 (assessment, opção B).

### R-planejamento-002 — Viagem

- **Comportamento desejado**: o item do plano é a viagem. Ela tem:
  - período (data de início e de fim; o fim não antecede o início);
  - um ou mais destinos (R-planejamento-003);
  - uma ou mais atividades (R-planejamento-004);
  - distância prevista em KM;
  - veículo do cadastro ou, se ainda não definido, a autonomia prevista em km/L;
  - câmara organizadora;
  - origem (planejada ou extra, R-planejamento-009) e situação (prevista ou cancelada).

  Viagem cancelada continua no plano e no histórico, marcada. A viagem pertence ao plano do ano em
  que começa. O mês do cronograma é o da data de início.
- **Comportamento atual**: uma linha da planilha por viagem, com mês, datas, municípios, serviços,
  KM e autonomia do veículo (Anexo I).
- **Motivo da diferença**: —
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: planilha real da DSB (Anexo I); decisão do responsável, 2026-09-30.

### R-planejamento-003 — Destinos: tipos oferecidos pelos apps

- **Comportamento desejado**: o destino de uma viagem é uma referência a um objeto de um tipo de
  destino registrado por um app instalado. Tipos iniciais:
  - município e entidade regulada, oferecidos pelo core;
  - concessão e rodovia, oferecidos pelo app da CATERF.

  A viagem pode ter destinos de tipos diferentes. O planejamento guarda a referência e o nome do
  objeto no momento, e não conhece o significado de cada tipo. Se o app que oferece um tipo for
  retirado, os destinos existentes continuam legíveis pelo nome guardado, e o tipo deixa de ser
  oferecido para viagens novas.
- **Comportamento atual**: municípios escritos à mão na planilha, até três por viagem.
- **Motivo da diferença**: constituição v2.6.0, "Apps comuns como motores genéricos": o app comum não
  traz os tipos de destino de uma câmara.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: constituição v2.6.2; decisão do responsável, 2026-09-30.

### R-planejamento-004 — Atividades da viagem

- **Comportamento desejado**: cada participação de câmara numa viagem tem uma ou mais atividades.
  Cada atividade tem:
  - um tipo, da lista de tipos de atividade da câmara (R-planejamento-018);
  - os serviços, da lista de serviços da câmara no core;
  - opcionalmente, a entidade regulada alvo, que é o que o prestador vê (R-planejamento-019);
  - a marca "escondida do prestador".

  O tipo de atividade tem a marca "é fiscalização de campo". Só as atividades desses tipos são
  oferecidas à fiscalização para ligação (R-planejamento-021).
- **Comportamento atual**: a coluna "serviços públicos fiscalizados" mistura serviços ("SAA, SES e
  RS") e atividades que não são fiscalização ("Apresentação de Proposta de Revisão Tarifária",
  "Educação Ambiental").
- **Motivo da diferença**: separar o que é fiscalização (e vai gerar execução) do que é outra
  atividade da viagem.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: planilha real da DSB; decisão do responsável, 2026-09-30.

### R-planejamento-005 — Viagem conjunta de câmaras da mesma diretoria

- **Comportamento desejado**: a câmara organizadora cria a viagem, com período, destinos, distância
  e veículo, e pode convidar outras câmaras da mesma diretoria. O coordenador da câmara convidada
  aceita e acrescenta a parte dela: atividades, serviços, quantidade de servidores, diárias e depois
  a equipe. Cada coordenador altera só a sua parte; período, destinos, distância e veículo são da
  organizadora, e as mudanças neles avisam as participantes.
  - Custos: o combustível fica com a organizadora; as diárias, com cada câmara.
  - Planos: a viagem aparece no plano de cada câmara participante, com a parte dela; o diretor vê
    a viagem inteira.
  - Aprovação: a parte de cada câmara é aprovada com o plano dela.
  - Câmara de outra diretoria não participa.
- **Comportamento atual**: a DSB registra numa linha só viagens que atendem CATESA e CATERS ("SAA,
  SES e RS"), num cronograma único.
- **Motivo da diferença**: um app por câmara e isolamento por câmara (constituição v2.6.0,
  Princípio III), sem obrigar viagens separadas (decisão do responsável, 2026-09-30).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30.

### R-planejamento-006 — Custos estimados

- **Comportamento desejado**: o sistema calcula e mostra, sem digitação dos totais:
  - **combustível**: litros = distância ÷ autonomia (do veículo, ou a prevista), e custo = litros ×
    preço do litro do plano;
  - **diárias**: cada lançamento tem quantidade (múltiplos de meia diária), município de referência
    (padrão: o primeiro destino) e valor unitário da tabela de diárias vigente
    (R-planejamento-014); total = quantidade × valor unitário. Sem valor na tabela, o coordenador
    informa o valor, com justificativa, e a viagem fica marcada;
  - **totais**: por participação, por viagem, por câmara e por plano, separados em combustível e
    diárias.

  Os valores aprovados ficam congelados na versão aprovada; mudar a tabela ou o preço do litro não
  os altera. São estimativas de planejamento: pagar e abastecer continuam com o financeiro e frotas.
- **Comportamento atual**: a planilha calcula à mão e tem erros em 3 das 10 viagens do Anexo I: nas
  duas de agosto, os totais de diárias estão trocados (5 × R$ 200,00 aparece como R$ 1.400,00, e
  7 × R$ 200,00 como R$ 1.000,00); em junho, o total aparece como R$ 2.675,00, e a soma de
  R$ 875,00 com R$ 1.750,00 dá R$ 2.625,00.
- **Motivo da diferença**: eliminar erros de conta e manter o valor aprovado estável.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: planilha real da DSB; decisão do responsável, 2026-09-30.

### R-planejamento-007 — Aprovação pelo diretor

- **Comportamento desejado**: só o diretor da diretoria da câmara aprova ou devolve o plano, as
  viagens extras e as mudanças que pedem aprovação. Devolver exige motivo. O diretor vê cada plano
  com os totais e as viagens, e um painel da diretoria com todos os planos das câmaras dela. Aprovar
  o plano aprova todas as viagens e participações dele. O administrador não aprova. O diretor é
  avisado de cada envio, e o coordenador, de cada decisão.
- **Comportamento atual**: aprovação por e-mail ou ofício, fora do sistema.
- **Motivo da diferença**: é a exceção de escrita do diretor prevista no core (R-core-012) e o ato
  que precisa de registro.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: R-core-012; decisão do responsável, 2026-09-30.

### R-planejamento-008 — Mudanças depois da aprovação

- **Comportamento desejado**: toda mudança num plano aprovado é de um tipo de uma lista fechada:
  - datas no mesmo mês; datas para outro mês;
  - incluir destino; retirar destino;
  - incluir atividade; retirar atividade;
  - trocar veículo; alterar distância;
  - alterar quantidade de servidores;
  - aumentar diárias; reduzir diárias;
  - cancelar viagem;
  - incluir, na viagem conjunta, a participação de outra câmara.

  Uma mudança que se enquadra em mais de um tipo pede aprovação se qualquer um deles pedir.

  **Marcação**: a câmara marca, na configuração (R-planejamento-018), quais tipos pedem aprovação do
  diretor. Toda mudança que aumenta o valor total das diárias de uma viagem pede aprovação, e a
  câmara não pode desmarcar isso. O aumento pode vir da quantidade, da troca de município de
  referência ou da inclusão de servidores. Incluir viagem nova é viagem extra (R-planejamento-009).

  **Aplicação**:
  - mudança que não pede aprovação vale na hora;
  - mudança que pede fica pendente, e a versão aprovada continua valendo para todos os leitores;
  - uma viagem tem no máximo uma mudança pendente;
  - o coordenador pode retirar a mudança pendente;
  - o diretor aprova ou devolve com motivo.

  Toda mudança fica no histórico com o antes, o depois, o autor, a data e a decisão.
- **Comportamento atual**: a planilha é regravada; a "atualização" trimestral republica o
  cronograma, sem registro do que mudou nem de quem aprovou.
- **Motivo da diferença**: rastrear as mudanças e respeitar a regra do responsável (pequenas sem
  aprovação, grandes com; aumento de diárias sempre com), sem virar motor de regras.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30 (assessment, limite "lista fechada").

### R-planejamento-009 — Viagens extras

- **Comportamento desejado**: depois da aprovação do plano, o coordenador registra viagens extras,
  com motivo obrigatório (denúncia, emergência, eventual ou outro, com descrição). A viagem extra
  segue o mesmo conteúdo das demais e é enviada ao diretor, que a aprova ou devolve. Aprovada, ela
  vale como as viagens do plano, marcada como extra. Antes da aprovação do plano, viagens novas são
  simplesmente parte do rascunho.
- **Comportamento atual**: fiscalizações fora do cronograma não têm registro de planejamento.
- **Motivo da diferença**: as fiscalizações fora do plano continuam, e precisam de aprovação e de
  chegar às áreas (decisão do responsável, 2026-09-30).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30.

### R-planejamento-010 — Versões e auditoria

- **Comportamento desejado**: plano e viagens têm versões. Cada envio, aprovação, devolução,
  mudança, escala, liberação e cancelamento cria um registro com autor e data. A versão aprovada
  vigente de cada viagem é a que os leitores veem. O histórico mostra todas as versões, e todas as
  ações entram na auditoria do core (R-core-022).
- **Comportamento atual**: sem histórico.
- **Motivo da diferença**: rastreabilidade de quem planejou, aprovou e mudou (Princípio I).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: —

### R-planejamento-011 — Equipe nominal

- **Comportamento desejado**: o plano é aprovado com a quantidade de servidores de cada
  participação. Depois da aprovação, o coordenador escala nominalmente os servidores, até a
  quantidade aprovada; para escalar mais, é preciso uma mudança "alterar quantidade de servidores".
  Só entram usuários ativos com câmara (fiscais e coordenadores). Não há motorista nem servidor de
  outras áreas. Servidor da própria câmara entra direto; servidor de outra câmara, pela liberação
  (R-planejamento-012). O mesmo servidor não pode estar escalado em duas viagens com períodos
  sobrepostos. Escalar e trocar servidores não é mudança do plano e não pede aprovação do diretor.
  O servidor escalado é avisado. Servidor desativado sai das escalas futuras, e o coordenador é
  avisado.
- **Comportamento atual**: a planilha informa só a quantidade de servidores; a fiscalização atual
  registra um fiscal só (`coluna:fiscalizacoes.fiscal_nome`, `coluna:fiscalizacoes.fiscal_email`).
- **Motivo da diferença**: RH e financeiro precisam dos nomes; a aprovação continua sendo sobre
  quantidade e custo (decisão do responsável, 2026-09-30).
- **Objetos do catálogo**: `coluna:fiscalizacoes.fiscal_nome`, `coluna:fiscalizacoes.fiscal_email`
- **Origem**: decisão do responsável, 2026-09-30.

### R-planejamento-012 — Liberação de servidor de outra câmara

- **Comportamento desejado**: para escalar servidor de outra câmara, o coordenador pede a liberação
  ao coordenador da câmara de origem, que é a chefia dele. Só se pede depois da aprovação da viagem
  pelo diretor. O coordenador de origem libera ou recusa, e recusar exige motivo. Liberado, o
  servidor entra na equipe e passa a ver a viagem. Sem resposta até o início da viagem, o pedido
  expira. Quem pediu pode cancelar o pedido, e cada passo avisa os envolvidos. A liberação vale para
  aquela viagem, e mudança de período depois da liberação pede nova liberação.
- **Comportamento atual**: combinado por fora.
- **Motivo da diferença**: regra da agência (decisão do responsável, 2026-09-30); o coordenador é a
  chefia do servidor da câmara.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30.

### R-planejamento-013 — Cadastro de veículos

- **Comportamento desejado**: o planejamento mantém um cadastro simples de veículos: identificação,
  placa, autonomia em km/L e situação (ativo ou desativado). O administrador mantém o cadastro; todo
  usuário da equipe o lê. Veículo usado em viagem não é apagado, só desativado. O cadastro é
  provisório: quando o app de frotas existir, ele assume os veículos, e o planejamento passa a só
  ler, sem perder o histórico das viagens.
- **Comportamento atual**: a planilha registra só a autonomia do veículo (8 km/L).
- **Motivo da diferença**: frotas ainda não existe; a constituição não quer cópia de dado de outro
  app, por isso a passagem futura de dono fica prevista.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30 (veículos no planejamento até frotas existir).

### R-planejamento-014 — Tabela de diárias por município

- **Comportamento desejado**: o planejamento mantém a tabela de valor unitário da diária por
  município, com início de vigência. O cálculo usa o valor vigente na data da viagem. O
  administrador mantém a tabela, que será carregada depois da implantação (a agência já tem a
  tabela). Todo usuário da equipe a lê. Quando o app do financeiro existir, ele assume a tabela, e o
  planejamento passa a só ler.
- **Comportamento atual**: o valor unitário é digitado na planilha (R$ 200,00, 240,00 ou 250,00,
  conforme a viagem).
- **Motivo da diferença**: um valor oficial por município, sem digitação.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30.

### R-planejamento-015 — Cronograma e atualização do período

- **Comportamento desejado**: o coordenador (para a sua câmara) e o diretor (para a câmara ou a
  diretoria) emitem o cronograma de um período, com as viagens aprovadas vigentes, as colunas do
  layout da câmara e os totais. A **atualização** de um período lista as mudanças aplicadas nele,
  com o antes, o depois e a aprovação quando houve. É o conjunto das mudanças, e não uma nova
  aprovação do plano inteiro. O layout padrão reproduz as colunas do Anexo I:
  - mês, datas de início e fim, municípios, serviços;
  - KM, autonomia, litros, custo por litro e custo de combustível;
  - quantidade de servidores, quantidade e valor unitário das diárias, total das diárias;
  - combustível + diárias.
- **Comportamento atual**: o cronograma é a própria planilha, publicada como anexo e atualizada por
  trimestre.
- **Motivo da diferença**: gerar o documento a partir do plano, sem redigitar.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: planilha real da DSB; decisão do responsável, 2026-09-30 (atualização = conjunto das
  mudanças).

### R-planejamento-016 — Quem alcança o quê

- **Comportamento desejado**:
  - **Coordenador**: elabora, envia e altera o plano da própria câmara, escala e pede liberações,
    responde às liberações pedidas à sua câmara e mantém a configuração da câmara.
  - **Fiscal**: lê o plano da própria câmara e as viagens de outras câmaras em que está escalado.
  - **Diretor**: lê os planos das câmaras da sua diretoria e aprova ou devolve (R-planejamento-007).
  - **Administrador**: lê tudo e mantém veículos e tabela de diárias, mas não aprova nem elabora
    planos.
  - **Prestador**: vê o que diz a R-planejamento-019.
  - **Outras áreas**: veem o que diz a R-planejamento-020.

  Planos de outra câmara (fora das viagens em que o usuário está escalado) e de outra diretoria se
  comportam como inexistentes. A verificação vale para qualquer caminho: tela, sincronização,
  chamada direta e cronograma.
- **Comportamento atual**: a planilha circula por e-mail, sem controle de acesso.
- **Motivo da diferença**: isolamento por câmara (A-026; Princípio III).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: A-026 (decidido); R-core-011; R-core-012.

### R-planejamento-017 — Consulta sem rede

- **Comportamento desejado**: o aplicativo baixa, para o aparelho do fiscal, as viagens aprovadas em
  que ele está escalado: datas, destinos, atividades, equipe e veículo, na versão aprovada vigente. A
  cópia é atualizada nas sincronizações seguintes, pelo protocolo do core (R-core-021). Elaborar,
  alterar, aprovar, escalar e liberar exigem rede.
- **Comportamento atual**: não há consulta no aparelho.
- **Motivo da diferença**: o fiscal em campo precisa saber a viagem sem rede (Princípio II; decisão
  do responsável, 2026-09-30).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30.

### R-planejamento-018 — Configuração do planejamento da câmara

- **Comportamento desejado**: o coordenador da câmara (e o administrador) configura na tela:
  - os tipos de atividade, cada um com nome e a marca "é fiscalização de campo";
  - quais tipos de mudança da lista fechada pedem aprovação (exceto o aumento de diárias, sempre
    marcado);
  - o layout do cronograma (colunas e ordem, a partir das peças disponíveis).

  **Configuração padrão de câmara nova**:
  - tipos de atividade: "Fiscalização" (é fiscalização), "Apresentação" e "Educação ambiental";
  - pedem aprovação: datas para outro mês, incluir ou retirar destino, incluir ou retirar
    atividade, alterar quantidade de servidores, aumentar diárias, cancelar viagem e incluir
    participação;
  - não pedem: datas no mesmo mês, trocar veículo, alterar distância e reduzir diárias;
  - layout: o do Anexo I.

  A câmara pode copiar a configuração de outra câmara, gerando uma cópia independente
  (constituição v2.6.1). Mudar a configuração vale para mudanças e documentos futuros.
- **Comportamento atual**: cada câmara decide na própria planilha.
- **Motivo da diferença**: constituição v2.6.1 e v2.6.2: a câmara monta o seu uso por configuração na
  tela, com cópia independente entre câmaras.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30; constituição v2.6.1.

### R-planejamento-019 — O que o prestador vê

- **Comportamento desejado**: depois da aprovação, o prestador vê, no portal, as atividades
  previstas cuja entidade alvo é a entidade que ele representa (R-core-013), com o objeto (tipo de
  atividade, serviços e destinos) e o período (mês e datas previstas), exceto as atividades marcadas
  como escondidas pela câmara. Não vê equipe, veículo, diárias, custos, outras atividades da viagem,
  planos em rascunho nem mudanças pendentes. Viagem cancelada some da visão do prestador.
- **Comportamento atual**: o prestador não vê nada antes da fiscalização.
- **Motivo da diferença**: decisão do responsável (2026-09-30): o prestador vê o que é dele. A marca
  "escondida" preserva as fiscalizações sem aviso.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-09-30 (assessment, limite "prestador: objeto e
  período").

### R-planejamento-020 — Leitura por outras áreas

- **Comportamento desejado**: papéis de apps de outras áreas (RH, financeiro, frotas), quando
  existirem, e credenciais de sistema com o escopo de leitura do planejamento (R-core-024) leem os
  planos aprovados e as viagens na versão aprovada vigente: datas, destinos, equipe nominal,
  veículo, quantidades e valores estimados. Leem também o histórico das mudanças. Por nenhum caminho
  alteram o plano; as ações delas (ponto, diárias, reserva) são registradas nos apps delas, apontando
  para a viagem (constituição, "Extensão para outras áreas"). Acrescentar esses papéis não muda o
  que os papéis existentes alcançam (R-core-023).
- **Comportamento atual**: as áreas recebem os dados por fora.
- **Motivo da diferença**: fonte única e só leitura para as áreas (decisão do responsável,
  2026-09-30).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: constituição, "Extensão para outras áreas"; R-core-023; R-core-024.

### R-planejamento-021 — Elo com a execução de campo

- **Comportamento desejado**: o planejamento oferece, para consulta, as atividades de fiscalização
  de campo de viagens aprovadas (identificador, câmara, período, destinos, serviços, entidade alvo e
  equipe). O app de fiscalização, que vem depois na ordem, liga a fiscalização executada a uma
  dessas atividades. O planejamento não conhece a fiscalização, não cria fiscalização e não depende
  do app de fiscalização. O painel planejado × executado é registrado nas telas do core
  (R-core-025) pelo app de fiscalização, que lê os dois dados.
- **Comportamento atual**: a fiscalização não tem nenhuma ligação com planejamento;
  `coluna:fiscalizacoes.data_inicio` é o momento em que ela é criada no aparelho.
- **Motivo da diferença**: medir planejado × executado sem acoplar o planejamento à execução
  (constituição, "Fronteiras de domínio" e "Independência entre apps").
- **Objetos do catálogo**: `coluna:fiscalizacoes.data_inicio`
- **Origem**: assessment planejamento-fiscalizacoes (G7).

### R-planejamento-022 — Nada de câmara dentro do planejamento

- **Comportamento desejado**: o planejamento não tem tipo de destino, tipo de atividade, texto,
  layout ou regra de uma câmara específica. Os tipos de destino vêm dos apps; os tipos de atividade,
  a marcação de mudanças e o layout vêm da configuração da câmara. Um teste automatizado falha se o
  planejamento citar uma câmara, e outro prova que um tipo de destino novo, registrado por um app de
  teste, é usado sem mudança no planejamento.
- **Comportamento atual**: não se aplica (o sistema atual não tem planejamento).
- **Motivo da diferença**: constituição v2.6.0 a v2.6.2, "Apps comuns como motores genéricos".
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: constituição v2.6.2.

## Telas do sistema atual

O sistema atual não tem nenhuma tela de planejamento. As ações abaixo são novas e todas têm regra.

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Criar o plano do ano e registrar viagens (período, destinos, atividades, KM, veículo, servidores, diárias) | R-planejamento-001, R-planejamento-002, R-planejamento-003, R-planejamento-004 |
| Ver os custos calculados por viagem, câmara e plano | R-planejamento-006 |
| Convidar outra câmara para a viagem; aceitar e preencher a parte da câmara | R-planejamento-005 |
| Enviar o plano; aprovar ou devolver (diretor) | R-planejamento-001, R-planejamento-007 |
| Propor mudança num plano aprovado; aprovar ou devolver a mudança; retirar mudança pendente | R-planejamento-008 |
| Registrar viagem extra com motivo | R-planejamento-009 |
| Ver o histórico de versões e mudanças | R-planejamento-010 |
| Escalar servidores; pedir, conceder ou recusar liberação | R-planejamento-011, R-planejamento-012 |
| Manter veículos e tabela de diárias (administrador) | R-planejamento-013, R-planejamento-014 |
| Emitir o cronograma e a atualização de um período | R-planejamento-015 |
| Configurar tipos de atividade, marcação de mudanças e layout; copiar de outra câmara | R-planejamento-018 |
| Consultar as viagens em que está escalado, sem rede (fiscal) | R-planejamento-017 |
| Ver as fiscalizações previstas para a entidade (prestador, no portal) | R-planejamento-019 |
| Painel dos planos da diretoria (diretor) | R-planejamento-007; R-core-025 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: As 10 viagens do Anexo I da DSB, registradas no sistema, produzem os mesmos litros,
  custos de combustível e totais de diárias da planilha, com as contas corretas: iguais nas 7
  viagens sem erro, e corrigidos nas duas de agosto e no total de junho.
- **SC-002**: 100% dos planos, viagens extras e mudanças que pedem aprovação têm o registro de
  aprovação ou devolução do diretor, com autor e data.
- **SC-003**: 100% das mudanças em planos aprovados aparecem no histórico com o antes, o depois, o
  autor e a data.
- **SC-004**: 100% das mudanças que aumentam o valor das diárias ficam pendentes de aprovação,
  qualquer que seja a configuração da câmara.
- **SC-005**: Em teste com usuários de duas câmaras, de duas diretorias e um prestador, 0 planos,
  viagens ou atividades fora do alcance de cada um são alcançados por qualquer caminho.
- **SC-006**: 100% das viagens aprovadas em que o fiscal está escalado abrem no aparelho sem rede.
- **SC-007**: O coordenador registra uma viagem com três destinos e duas atividades em menos de 5
  minutos.
- **SC-008**: O cronograma de um trimestre emitido pelo sistema tem as colunas do Anexo I e 0
  divergências de valores em relação ao plano aprovado.
- **SC-009**: Um tipo de destino novo, registrado por um app de teste, é usado numa viagem com 0
  alterações no planejamento.
- **SC-010**: 100% das regras de acesso deste módulo têm teste automatizado.

## Assumptions

- **Papéis**: coordenador e diretor serão cadastrados no sistema novo antes do uso do planejamento.
  Hoje há 0 de cada em produção, e o cadastro é feito pelo administrador (R-core-001).
- **Quem configura**: o coordenador da câmara e o administrador configuram o planejamento da câmara.
  O fiscal consulta e não configura. Diferente do motor de checklists, em que o fiscal também monta
  modelos: aqui a configuração muda a regra de aprovação da câmara.
- **Diretor único por diretoria**: a aprovação é do diretor da diretoria da câmara. Havendo mais de
  um diretor numa diretoria, qualquer um deles aprova.
- **Combustível da viagem conjunta**: fica com a câmara organizadora, que define veículo e distância.
- **Preço do litro**: parâmetro do plano, informado pelo coordenador; o padrão de um plano novo é o
  do plano anterior da câmara.
- **Tabela de diárias**: carregada depois da implantação pelo administrador. Até lá, o coordenador
  informa o valor unitário com justificativa (R-planejamento-006).
- **Veículos e tabela de diárias mudam de dono** quando os apps de frotas e financeiro existirem;
  isso será tratado nas specs deles, sem alterar as viagens já registradas.
- **Avisos**: os avisos a diretor, coordenadores e servidores escalados usam a central de avisos do
  core (R-core-026), na tela e por e-mail.
- **Plano de anos anteriores**: não há dados a migrar; o primeiro plano é criado no sistema novo. Os
  cronogramas de 2026 em planilha podem ser registrados como plano de 2026, se o responsável quiser.
- **Premissa externa**: o que RH, financeiro e frotas precisam ler é provisório até ouvir as áreas
  (constituição, "Premissas externas"). A leitura do plano aprovado como ele é cobre o que se sabe
  hoje.
