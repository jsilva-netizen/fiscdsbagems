# Feature Specification: Módulo DTR — app da CATERF (fiscalização de rodovias)

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec do módulo `dtr` da spec 003, quinto da ordem, que no sistema novo é o **app da
CATERF**, a câmara da DTR que fiscaliza as rodovias (decisão do responsável, 2026-09-30). Escrita no
molde `specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes:
- o catálogo do banco de produção (módulo `dtr` no mapa de rastreabilidade: as colunas da rodovia
  nas tabelas de contratos, fiscalizações, unidades e tipos de ocorrência, e o repositório de KML);
- as telas da DTR do sistema atual e o modelo de relatório da DTR;
- as specs 004 (core), 005 (checklists), 006 (planejamento) e 007 (fiscalização), com os pontos de
  extensão que ela oferece aos apps de câmara;
- a constituição v2.6.2.

## Contexto

A CATERF fiscaliza as concessões rodoviárias. O fiscal percorre a rodovia de carro e, a cada
problema, para, fotografa e registra uma **ocorrência** no ponto. Para cada ocorrência:
- o sistema acha a rodovia e o KM pela posição GPS e pelo traçado da rodovia (arquivo KML do
  contrato), sem rede;
- o fiscal escolhe o tipo no catálogo do Programa de Exploração da Rodovia (PER), navegando por
  frente e item do PER;
- ele diz se é constatação ou não conformidade;
- ele informa o sentido e uma observação.

As fotos recebem a marca d'água com rodovia, KM e sentido. O relatório é um laudo com a tabela de
constatações e a de não conformidades.

Produção tem 2 contratos de concessão, com cerca de 15 mil pontos de KM extraídos dos KML, 2
fiscalizações da DTR, 78 ocorrências (72 constatações e 6 NCs) e 79 tipos de ocorrência.

No sistema novo, a CATERF é um **app de câmara** que pluga as suas peças nos apps comuns, sem que
eles a conheçam (constituição v2.6.0 a v2.6.2):

| App comum | O que a CATERF pluga |
|---|---|
| core | extensão do contrato: rodovia, traçado KML, pontos de KM (R-core-020) |
| checklists | modelo "Ocorrências do PER" (spec 005, "Modelos de hoje") e o valor de contexto "rodovia da fiscalização" |
| planejamento | tipos de destino "concessão" e "rodovia" |
| fiscalização | extensão da fiscalização (contrato e rodovia); registro avulso de ocorrência; enriquecimento do ponto (KM pelo KML); campos da marca d'água; layout do laudo; painéis de indicadores |

O app da CATERF é dono só dos dados dele: a extensão do contrato, a extensão da fiscalização e os
dados da rodovia de cada ocorrência. Fiscalização, registro de campo, fotos, respostas, NCs,
determinações e relatórios são da fiscalização. O catálogo e as versões dos tipos são do motor de
checklists.

Fica fora desta spec:
- o que é comum a qualquer fiscalização (spec 007): vistoria, fotos, finalização, número do termo,
  relatório, sincronização;
- o motor de checklists e a importação da planilha de tipos (spec 005);
- o planejamento das viagens (spec 006).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manter o traçado da rodovia do contrato (Priority: P1)

O coordenador da CATERF envia o arquivo KML do traçado de cada contrato de concessão. O sistema
extrai os pontos de KM e os deixa prontos para os aparelhos usarem sem rede.

**Why this priority**: sem traçado não há KM, e o KM é a identificação da ocorrência no laudo e na
notificação.

**Independent Test**:
- o coordenador envia o KML da MS-112, e o sistema mostra quantos pontos de KM foram lidos e a
  extensão coberta;
- um KML sem pontos de KM é recusado com o motivo;
- um KML novo para o mesmo contrato vira a versão vigente, e o anterior fica guardado;
- as ocorrências já registradas mantêm o KM que tinham.

**Acceptance Scenarios**:

1. **Given** um contrato da CATERF, **When** o coordenador envia um KML válido, **Then** os pontos
   de KM passam a valer para as ocorrências novas e são baixados pelos aparelhos na próxima
   sincronização.
2. **Given** um KML sem nenhum ponto com KM, **When** é enviado, **Then** o sistema recusa e mostra
   o motivo.
3. **Given** um fiscal, **When** tenta enviar ou trocar um KML, **Then** o sistema recusa.

---

### User Story 2 - Registrar ocorrências na rodovia, sem rede (Priority: P1)

Na viagem, o fiscal registra cada ocorrência:
1. fotografa; o KM e a rodovia vêm do GPS e do traçado, ficando mais precisos enquanto o GPS
   converge, e a primeira foto fixa o KM;
2. escolhe frente, item do PER e descrição, e a etapa de obra quando o tipo tem etapas;
3. marca constatação ou não conformidade, vendo a cláusula não atendida e o prazo;
4. informa o sentido e a observação.

**Why this priority**: é a vistoria da CATERF, hoje feita assim em campo.

**Independent Test**: sem rede, num trecho da MS-306, o fiscal registra 3 ocorrências:
- uma constatação de "Vegetação alta";
- uma NC de "Buraco / Panela na pista", com a cláusula e o prazo de 1 dia;
- uma de obra, com a etapa "Pavimentação".

Cada uma tem rodovia, KM e sentido, e as fotos têm a marca "MS-306 KM 42.5 N", a data, a hora e as
coordenadas. Com o GPS ruim, a ocorrência fica com "KM impreciso".

**Acceptance Scenarios**:

1. **Given** o traçado da rodovia no aparelho, **When** o fiscal fotografa uma ocorrência sem rede,
   **Then** o KM mais próximo da posição é calculado no aparelho e fixado pela primeira foto.
2. **Given** um GPS com precisão pior que o limite, **When** a ocorrência é salva, **Then** fica
   marcada "KM impreciso", sem bloquear o registro.
3. **Given** uma fiscalização da MS-306, **When** o fiscal escolhe o tipo, **Then** vê só os tipos
   aplicáveis à MS-306, e o específico da rodovia vence o genérico.
4. **Given** uma ocorrência salva, **When** o fiscal a abre de novo, **Then** edita frente, item,
   tipo, sentido e observação, e o KM só muda se ele recalcular.

---

### User Story 3 - Iniciar a fiscalização da concessão a partir do planejamento (Priority: P1)

O fiscal escalado inicia a fiscalização a partir da atividade planejada, cujo destino é a concessão
ou a rodovia. A concessionária e o contrato vêm do destino, e a rodovia principal, do contrato.

**Why this priority**: a fiscalização rodoviária não tem município; o destino é a concessão
(R-fiscalizacao-001).

**Independent Test**: o fiscal inicia, sem rede, a fiscalização da atividade "Fiscalização da
concessão MS-112/306". Ela nasce com a concessionária, o contrato e a rodovia, e o traçado desse
contrato já está no aparelho.

**Acceptance Scenarios**:

1. **Given** uma atividade com destino do tipo concessão, **When** a fiscalização é iniciada,
   **Then** o contrato e a rodovia principal ficam registrados no app da CATERF, ligados à
   fiscalização.
2. **Given** um contrato sem KML, **When** a fiscalização é iniciada, **Then** o sistema avisa que o
   KM terá de ser digitado.

---

### User Story 4 - Mapa das ocorrências (Priority: P2)

Na fiscalização, o fiscal vê no mapa o traçado da rodovia, os pontos das ocorrências, a posição dele
e abre uma ocorrência a partir do mapa, também sem rede, em tela cheia.

**Why this priority**: orienta o percurso e a revisão das ocorrências.

**Independent Test**: com 10 ocorrências registradas, o mapa mostra o traçado, os 10 pontos e a
posição do fiscal; tocar num ponto abre a ocorrência.

**Acceptance Scenarios**:

1. **Given** ocorrências com ponto, **When** o fiscal abre o mapa sem rede, **Then** vê o traçado e
   os pontos.
2. **Given** uma ocorrência com "KM impreciso", **When** aparece no mapa e na lista, **Then** está
   marcada para revisão.

---

### User Story 5 - Recalcular KM e marcas d'água (Priority: P2)

Na fiscalização reaberta, o fiscal ou o coordenador recalcula o KM de todas as ocorrências a partir
das coordenadas das fotos originais e do traçado vigente, e redesenha as marcas d'água.

**Why this priority**: corrige KMs errados (GPS ruim, traçado trocado). Hoje exige reenviar um ZIP de
fotos e ler a marca d'água antiga por OCR.

**Independent Test**: numa fiscalização reaberta com 5 ocorrências de KM impreciso, o recálculo
mostra, por ocorrência, o KM antigo e o novo antes de confirmar. Ao confirmar, KM e marcas d'água
são atualizados, e o histórico guarda o antes e o depois.

**Acceptance Scenarios**:

1. **Given** uma fiscalização finalizada, **When** alguém tenta recalcular, **Then** o sistema pede
   a reabertura (R-fiscalizacao-014).
2. **Given** fotos com a versão original guardada, **When** o recálculo roda, **Then** usa as
   coordenadas da foto original, sem OCR.

---

### User Story 6 - Laudo e indicadores da rodovia (Priority: P2)

O relatório da fiscalização sai no layout de laudo da CATERF, com:
- a tabela de constatações (item, rodovia, sentido, descrição, observação, fotos);
- a tabela de não conformidades (item, rodovia, sentido, NC, cláusula não atendida, prazo,
  observação);
- as fotos numeradas.

Os indicadores da CATERF mostram NCs por rodovia, ocorrências por frente, principais tipos de
ocorrência e o ranking de rodovias.

**Why this priority**: é o documento enviado à concessionária e a gestão da câmara.

**Independent Test**: o laudo de uma fiscalização com 72 constatações e 6 NCs tem as duas tabelas,
com as colunas acima, e as fotos na ordem. O painel da CATERF conta só as fiscalizações da CATERF.

**Acceptance Scenarios**:

1. **Given** a configuração da CATERF com o layout de laudo, **When** o relatório é gerado, **Then**
   sai no layout de laudo, pelo motor de relatórios da fiscalização.
2. **Given** um coordenador da CATESA, **When** abre os indicadores, **Then** não vê os painéis da
   CATERF.

---

### Edge Cases

- **Posição longe do traçado** (mais de um limite, ex.: 500 m): o KM não é calculado, e o fiscal o
  digita. A ocorrência fica com "KM impreciso".
- **Traçado com várias rodovias** (ex.: "112/306"): a rodovia vem do ponto de KM mais próximo.
- **KML trocado depois de ocorrências registradas**: as ocorrências mantêm o KM; só o recálculo
  (US5) aplica o traçado novo.
- **Ocorrência sem foto**: permitida; o KM vem do GPS no momento de salvar.
- **Tipo desativado depois do registro**: a ocorrência continua com a versão usada.
- **Fotos migradas sem versão original**: o recálculo usa as coordenadas gravadas na ocorrência ou
  na foto; sem nenhuma, a ocorrência é listada como "sem coordenada para recalcular".
- **Contrato encerrado**: o traçado continua para as fiscalizações dele, e o contrato não é
  oferecido como destino novo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app da CATERF MUST estender o contrato do core com rodovia, traçado KML (com
  versões) e pontos de KM, mantidos pelo coordenador da CATERF e pelo administrador (R-dtr-002).
- **FR-002**: O app MUST registrar no planejamento os tipos de destino "concessão" e "rodovia"
  (R-dtr-003).
- **FR-003**: A fiscalização rodoviária MUST ter contrato e rodovia principal no app da CATERF,
  ligados à fiscalização, vindos do destino da atividade (R-dtr-004).
- **FR-004**: O app MUST registrar o modelo "Ocorrências do PER" no motor de checklists e o valor de
  contexto "rodovia da fiscalização" (R-dtr-005).
- **FR-005**: A ocorrência MUST ser um registro avulso da fiscalização, com os dados da rodovia
  (rodovia, trecho, KM, sentido, KM impreciso, etapa de obra) no app da CATERF (R-dtr-006).
- **FR-006**: O KM MUST ser calculado no aparelho, sem rede, pelos pontos de KM ou pelo traçado do
  contrato, sem travar o registro, e MUST ser fixado pela primeira foto (R-dtr-007).
- **FR-007**: As fotos MUST receber a marca d'água com rodovia, KM e sentido, a data, a hora e as
  coordenadas (R-dtr-008).
- **FR-008**: O recálculo de KM e marcas d'água MUST usar as fotos originais, só em fiscalização
  reaberta, com prévia e histórico (R-dtr-009).
- **FR-009**: O mapa MUST mostrar traçado, ocorrências e posição, sem rede (R-dtr-010).
- **FR-010**: O relatório da CATERF MUST sair no layout de laudo registrado (R-dtr-011).
- **FR-011**: Os painéis da CATERF MUST ser registrados nas telas do core e contar só o alcance do
  usuário (R-dtr-012).
- **FR-012**: O app MUST NOT alterar dados da fiscalização, do motor de checklists ou do core fora
  dos pontos de extensão (R-dtr-016).
- **FR-013**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Contrato rodoviário** (extensão do contrato do core): rodovia (ou rodovias) objeto do contrato
  e versões do traçado.
- **Traçado**: arquivo KML, versão, enviado por, data, vigente ou substituído, pontos de KM
  extraídos, extensão coberta.
- **Ponto de KM**: latitude, longitude, KM, rodovia (extraído do traçado).
- **Fiscalização rodoviária** (extensão da fiscalização): contrato e rodovia principal.
- **Ocorrência** (extensão do registro de campo):
  - rodovia, trecho, KM e sentido;
  - KM impreciso;
  - distância ao traçado;
  - etapa de obra escolhida;
  - gravidade;
  - para as ocorrências migradas, os textos copiados na época (frente, item do PER, cláusula,
    prazo).

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. O identificador do módulo é `dtr`
(`anotacoes/modulos.toml`). As chaves citadas estão no catálogo da spec 003.

### R-dtr-001 — O app da CATERF e o que ele pluga

- **Comportamento desejado**: o módulo `dtr` é o app da CATERF. Ele não tem tela nem regra que
  repita o que os apps comuns já fazem. Pluga, pelos pontos de extensão:
  - no core: a extensão do contrato (R-dtr-002);
  - no planejamento: os tipos de destino (R-dtr-003);
  - no motor de checklists: o modelo "Ocorrências do PER" e o valor de contexto (R-dtr-005);
  - na fiscalização: a extensão da fiscalização (R-dtr-004), o registro avulso de ocorrência
    (R-dtr-006), o enriquecimento do ponto (R-dtr-007), os campos da marca d'água (R-dtr-008), o
    layout do laudo (R-dtr-011) e os painéis (R-dtr-012).

  As telas próprias do app (traçados, registro de ocorrência, mapa, recálculo) entram pelo registro
  de telas do core (R-core-025).
- **Comportamento atual**: a DTR é um conjunto de telas e colunas dentro do sistema comum: colunas
  da rodovia nas tabelas de contratos, fiscalizações, unidades e tipos; telas separadas por
  `tipo_modulo`; o modelo do relatório da DTR no mesmo código do relatório da DSB.
- **Motivo da diferença**: um app por câmara e apps comuns sem nada de câmara (constituição v2.6.0
  a v2.6.2; decisão do responsável, 2026-09-30).
- **Objetos do catálogo**: `coluna:fiscalizacoes.tipo_modulo`
- **Origem**: constituição v2.6.2; decisão do responsável, 2026-09-30.

### R-dtr-002 — Contrato rodoviário e traçado KML

- **Comportamento desejado**: o app da CATERF estende o contrato do core (R-core-020) com:
  - a rodovia (ou rodovias) objeto do contrato;
  - o **traçado**, um arquivo KML com versões. Enviar um KML novo cria uma versão vigente, e a
    anterior fica guardada como substituída.

  **Envio**:
  - só o coordenador da CATERF e o administrador enviam;
  - o arquivo é KML até 10 MB, conferido pelo conteúdo;
  - o sistema extrai os **pontos de KM** (marcadores de ponto com o KM no campo `km` dos dados
    estendidos ou, sem ele, no nome; a rodovia, opcional, no campo `rodovia`, para concessões com
    mais de uma rodovia) e os segmentos do traçado, e mostra quantos pontos leu e a extensão coberta;
  - KML sem nenhum ponto de KM e sem traçado é recusado com o motivo;
  - o envio fica na auditoria.

  **Uso**: os pontos e o traçado vigentes são baixados pelos aparelhos dos usuários da CATERF para
  uso sem rede.
- **Comportamento atual**:
  - a rodovia, o endereço do KML e os pontos de KM (cerca de 15 mil, numa lista dentro do contrato)
    são colunas do contrato;
  - o envio fica na aba KML das Definições da DTR;
  - reenviar substitui o arquivo, sem versão;
  - qualquer usuário com perfil ativo envia, troca, lê e apaga KML;
  - o KML é enviado sem passar pela fila offline.
- **Motivo da diferença**:
  - a extensão do contrato é do app da câmara (R-core-020);
  - o traçado anterior explica os KMs já registrados (Princípio I);
  - o isolamento por câmara e o papel valem também aqui (A-026).
- **Objetos do catálogo**: `coluna:contratos.rodovia`, `coluna:contratos.kml_url`,
  `coluna:contratos.km_points`, `bucket:kml-rodovias`,
  `politica:storage.objects.kml_rodovias_authenticated_read`,
  `politica:storage.objects.kml_rodovias_authenticated_insert`,
  `politica:storage.objects.kml_rodovias_authenticated_update`,
  `politica:storage.objects.kml_rodovias_authenticated_delete`
- **Origem**: R-core-020; A-026 (decidido).

### R-dtr-003 — Destinos "concessão" e "rodovia" no planejamento

- **Comportamento desejado**: o app registra no planejamento (R-planejamento-003) dois tipos de
  destino:
  - **concessão**: um contrato rodoviário vigente da CATERF, com a concessionária;
  - **rodovia**: uma rodovia dos contratos.

  A busca respeita o alcance do usuário. A atividade de fiscalização da CATERF tem, em geral, a
  concessão como destino, e a rodovia quando a vistoria é de um trecho específico.
- **Comportamento atual**: não há planejamento; a nova fiscalização da DTR escolhe a rodovia numa
  lista montada a partir dos contratos.
- **Motivo da diferença**: spec 006, destinos oferecidos pelos apps.
- **Objetos do catálogo**: `coluna:contratos.rodovia`
- **Origem**: R-planejamento-003.

### R-dtr-004 — Fiscalização rodoviária

- **Comportamento desejado**: ao iniciar a fiscalização a partir da atividade (R-fiscalizacao-002),
  o app da CATERF grava a **extensão da fiscalização**:
  - o contrato (do destino concessão);
  - a rodovia principal (do destino rodovia ou, sem ele, a primeira do contrato).

  A entidade da fiscalização é a concessionária do contrato, e não há município (R-fiscalizacao-001).
  O início avisa se o contrato não tem traçado vigente. A lista de fiscalizações da CATERF filtra
  por rodovia, além dos filtros comuns.
- **Comportamento atual**:
  - a nova fiscalização da DTR escolhe a rodovia; a concessionária e o contrato vêm do contrato da
    rodovia;
  - a tela espera "sinal estável" de GPS;
  - a fiscalização guarda a rodovia numa coluna própria;
  - a lista da DTR filtra por rodovia e busca por rodovia ou concessionária.
- **Motivo da diferença**: o destino vem do planejamento (spec 006, spec 007), e a rodovia fica no
  app da câmara (constituição v2.6.0). O ponto de início da visita não é mais pedido: a localização é
  de cada ocorrência (R-fiscalizacao-010).
- **Objetos do catálogo**: `coluna:fiscalizacoes.rodovia`
- **Origem**: R-fiscalizacao-001, R-fiscalizacao-002.

### R-dtr-005 — Modelo "Ocorrências do PER" e o contexto da rodovia

- **Comportamento desejado**: o app entrega como configuração inicial da CATERF o modelo de catálogo
  "Ocorrências do PER", descrito na spec 005 ("Modelos de hoje"):
  - modo registro avulso;
  - campos frente (agrupamento, nível 1, em ordem fixa), item do PER (agrupamento, nível 2),
    descrição (título), rodovias (aplicabilidade), cláusula não atendida, prazo padrão,
    observação-padrão e etapas de obra (escolha complementar);
  - respostas Constatação e Não conformidade, com as saídas;
  - a planilha modelo de hoje.

  A CATERF mantém o modelo na tela, como qualquer câmara (R-checklists-015). O app registra no motor
  o valor de contexto **"rodovia da fiscalização"**, que o aplicador informa para filtrar os tipos
  pela aplicabilidade.
- **Comportamento atual**: os campos da DTR são colunas fixas da tabela de tipos; a ordem das frentes
  e o filtro por rodovia estão no código da tela de registro; o registro usa uma lista de 16 tipos
  fixa no código quando o aparelho não tem tipos.
- **Motivo da diferença**: spec 005 (motor genérico), R-checklists-014 e R-checklists-019.
- **Objetos do catálogo**: `coluna:tipos_ocorrencia_dtr.frente`, `coluna:tipos_ocorrencia_dtr.item_contrato`,
  `coluna:tipos_ocorrencia_dtr.rodovia`, `coluna:tipos_ocorrencia_dtr.etapas_obra`,
  `indice:idx_tipos_ocorrencia_dtr_rodovia`
- **Origem**: spec 005; decisão do responsável, 2026-09-30.

### R-dtr-006 — Registro de ocorrência

- **Comportamento desejado**: a ocorrência é um **registro avulso** da fiscalização, criado pelo app
  da CATERF pela escrita que a fiscalização oferece (R-fiscalizacao-004). O assistente de registro,
  que funciona sem rede, segue os passos:
  1. fotos (câmera ou galeria), o que fixa o KM (R-dtr-007);
  2. frente;
  3. item do PER, com a opção "Outros" sempre por último, que deixa o fiscal digitar o item do PER;
  4. descrição (o tipo); com "Outros", a descrição é digitada (item livre, R-fiscalizacao-004), e a
     cláusula e o prazo da NC ficam para o fiscal preencher;
  5. etapa de obra, só quando o tipo tem etapas;
  6. constatação ou não conformidade, mostrando a cláusula não atendida e o prazo;
  7. sentido (N, S, N/S);
  8. observação.

  A fiscalização guarda o registro comum: tipo e versão, resposta, ponto, fotos, observação. Ela
  gera as saídas: NC com a cláusula e determinação com o prazo padrão, na resposta Não conformidade.
  O app da CATERF guarda a **extensão da ocorrência**: rodovia, trecho, KM, sentido, KM impreciso,
  distância ao traçado, etapa de obra escolhida e gravidade (opcional).

  A ocorrência salva é reaberta e editada no mesmo assistente. O KM só muda por recálculo (R-dtr-009).
  A lista da fiscalização mostra as ocorrências com o KM e a marca "KM impreciso", e "Registrar
  imagem" e "Importar da galeria" começam uma ocorrência nova.
- **Comportamento atual**:
  - a ocorrência é uma unidade sem tipo de unidade, com as colunas da rodovia;
  - a frente, o item do PER, a cláusula e o prazo são copiados do tipo, sem guardar a versão;
  - o tipo é escolhido pelo texto;
  - a gravidade existe como coluna e aparece no modelo de relatório, mas o assistente atual não tem
    o passo de gravidade;
  - as fotos de uma ocorrência nova ficam numa pasta provisória até o ponto ser salvo;
  - "Outros" grava o item do PER e a descrição digitados, sem tipo, e a NC sai sem cláusula nem
    prazo.
- **Motivo da diferença**:
  - a ocorrência guarda a versão do tipo (R-checklists-005), e não cópias;
  - os dados da rodovia ficam no app da câmara (constituição v2.6.0);
  - a gravidade é mantida opcional para não perder dado já registrado.
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.rodovia`, `coluna:unidades_fiscalizadas.trecho`,
  `coluna:unidades_fiscalizadas.km`, `coluna:unidades_fiscalizadas.sentido`,
  `coluna:unidades_fiscalizadas.gravidade`, `coluna:unidades_fiscalizadas.tipo_ocorrencia`,
  `coluna:unidades_fiscalizadas.frente`, `coluna:unidades_fiscalizadas.per`,
  `coluna:unidades_fiscalizadas.nao_atendimento`, `coluna:unidades_fiscalizadas.prazo_dias_nc`
- **Origem**: R-fiscalizacao-004; spec 005.

### R-dtr-007 — KM pelo traçado, sem rede

- **Comportamento desejado**: o app pluga na fiscalização o **enriquecedor do ponto** (contrato de
  extensões da spec 007). No aparelho, sem rede, para cada posição:
  1. com pontos de KM, o KM e a rodovia vêm do ponto mais próximo;
  2. sem pontos, mas com traçado em segmentos, vêm da projeção no segmento mais próximo;
  3. sem traçado, ou com a posição mais longe do traçado que o limite (ex.: 500 m), o KM é digitado
     pelo fiscal.

  O GPS continua atualizando o KM enquanto a ocorrência está aberta e converge. A **primeira foto
  fixa** o KM e a rodovia da ocorrência. O KM fica "impreciso" quando a precisão passa do limite da
  câmara (20 m, R-fiscalizacao-010) ou quando foi digitado. O cálculo nunca trava o registro.
- **Comportamento atual**:
  - o aparelho usa os pontos de KM do contrato, depois os segmentos do KML;
  - na falta dos dois, usa traçados simplificados de algumas rodovias fixos no código;
  - a primeira foto fixa o valor;
  - "KM impreciso" acima de 20 m;
  - a precisão fica na ocorrência.
- **Motivo da diferença**: traçado fixo no código diverge do contrato e chumba dado no app; a
  precisão do ponto é comum (R-fiscalizacao-010), e o KM é da CATERF.
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.km_impreciso`, `coluna:contratos.km_points`
- **Origem**: decisão do responsável, 2026-09-30 (localização comum; KM pelo KML na CATERF);
  constituição v2.6.2.

### R-dtr-008 — Marca d'água das fotos da rodovia

- **Comportamento desejado**: o app registra os campos `{rodovia}`, `{km}` e `{sentido}` para as
  linhas da marca d'água. A configuração inicial da CATERF usa:
  - "{rodovia} KM {km} {sentido}";
  - "{data} {hora}";
  - "{coordenadas}".

  A marca é desenhada depois de fixado o KM, a partir da foto original, que fica guardada
  (R-fiscalizacao-011).
- **Comportamento atual**: a marca da DTR tem as mesmas linhas e é desenhada ao salvar a ocorrência,
  depois de calcular o KM; a versão sem marca é guardada só às vezes.
- **Motivo da diferença**: a marca d'água é peça da câmara na fiscalização (constituição v2.6.0).
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.sentido`
- **Origem**: R-fiscalizacao-011.

### R-dtr-009 — Recalcular KM e marcas d'água

- **Comportamento desejado**: numa fiscalização reaberta (R-fiscalizacao-014), o fiscal ou o
  coordenador da CATERF recalcula o KM das ocorrências (todas ou as marcadas como imprecisas):
  - usa as coordenadas gravadas nas fotos originais e o traçado vigente;
  - redesenha as marcas d'água a partir das originais;
  - antes de gravar, mostra por ocorrência o KM antigo e o novo, e as que não têm coordenada;
  - grava só o que o usuário confirma, com o antes e o depois no histórico.
- **Comportamento atual**: a ferramenta "Corrigir KM e Marcas d'Água" recalcula os KMs pelas
  coordenadas das fotos e redesenha as marcas. Quando a foto original não está guardada, ela aceita
  o ZIP de fotos baixado e lê as coordenadas da marca d'água antiga por OCR.
- **Motivo da diferença**: com a foto original sempre guardada, o OCR e o ZIP deixam de ser
  necessários; a prévia e o histórico dão rastro à correção (Princípio I).
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.km`
- **Origem**: R-fiscalizacao-011, R-fiscalizacao-014.

### R-dtr-010 — Mapa da fiscalização

- **Comportamento desejado**: o app acrescenta ao mapa-base da fiscalização (R-fiscalizacao-010) a
  camada do traçado do contrato. O mapa mostra os pontos das ocorrências (com a marca de KM
  impreciso), a posição do fiscal e a tela cheia, e abre a ocorrência ao tocar no ponto, tudo sem
  rede, com o traçado baixado.
- **Comportamento atual**: o mapa da rodovia mostra o traçado, os pontos, a posição e a tela cheia,
  e abre a ocorrência ("Ver / Editar").
- **Motivo da diferença**: —
- **Objetos do catálogo**: `bucket:kml-rodovias`
- **Origem**: R-fiscalizacao-010.

### R-dtr-011 — Laudo de rodovia

- **Comportamento desejado**: o app registra na fiscalização o layout **"laudo de rodovia"**,
  escolhido na configuração da CATERF. Sobre o contexto comum (fiscalização, número do termo, equipe,
  registros, fotos), ele acrescenta rodovia, KM, sentido, frente e item do PER, e monta:
  - as informações da fiscalização, com a concessionária, o contrato e a rodovia;
  - a seção **"Constatações"**, com a tabela: item, rodovia, KM, sentido, descrição, observação e
    referência às fotos;
  - a seção **"Não conformidades"**, com a tabela: item, rodovia, KM, sentido, não conformidade,
    cláusula não atendida, prazo e observação;
  - o "item" de cada tabela é o número da constatação e o da NC na numeração contínua da fiscalização
    (R-fiscalizacao-008), com os registros na ordem que o app registra: item do PER, rodovia e KM;
    o modelo não declara determinação nem recomendação, e o laudo não tem essas seções;
  - os registros fotográficos, "Figura n – legenda";
  - a paginação.

  O título do documento vem da configuração da CATERF.
- **Comportamento atual**: o gerador de relatórios escolhe o modelo da DTR pelo tipo de módulo e
  monta as seções "VIII – Constatações" e "IX – Não conformidades", com as colunas de rodovia,
  sentido, descrição, não conformidade, não atendimento, prazo e observação. Quando a ocorrência não
  tem cláusula ou prazo, busca no tipo pelo texto, e mostra a gravidade quando há. O item é a posição
  na tabela, de 1 a n, ordenada por item do PER, rodovia e KM, e não é gravado.
- **Motivo da diferença**: layout da câmara fora do app comum (R-fiscalizacao-016,
  R-fiscalizacao-025); os dados vêm da versão do tipo, e não da busca pelo texto.
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.nao_atendimento`,
  `coluna:unidades_fiscalizadas.prazo_dias_nc`
- **Origem**: R-fiscalizacao-016.

### R-dtr-012 — Painéis da CATERF

- **Comportamento desejado**: o app registra nas telas do core (R-core-025), para os usuários da
  CATERF e para o diretor da DTR, os painéis:
  - fiscalizações rodoviárias (em andamento e finalizadas);
  - NCs por rodovia;
  - ocorrências por frente;
  - principais tipos de ocorrência;
  - ranking de rodovias (vistorias e NCs).

  Os painéis usam os filtros dos indicadores da fiscalização (R-fiscalizacao-018) e contam só o
  alcance do usuário.
- **Comportamento atual**: esses painéis estão na tela comum de relatórios e indicadores. O painel
  da CATERF lista as fiscalizações rodoviárias.
- **Motivo da diferença**: painéis de câmara registrados pelo app dela (R-core-025).
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.frente`
- **Origem**: R-core-025; R-fiscalizacao-018.

### R-dtr-013 — Quem alcança o quê

- **Comportamento desejado**:
  - **Coordenador da CATERF**: mantém os traçados (e o administrador também).
  - **Coordenador e fiscal da CATERF**: leem os traçados e registram ocorrências nas fiscalizações
    que alcançam (R-fiscalizacao-003); recalculam KM em fiscalização reaberta.
  - **Diretor da DTR**: lê tudo da CATERF e vê os painéis.
  - **Demais câmaras e o prestador**: não alcançam os traçados nem os dados da rodovia por este app.
    O que o prestador vê é da spec do portal.

  Os dados da rodovia de uma ocorrência seguem o alcance da fiscalização dela.
- **Comportamento atual**: qualquer usuário com perfil ativo envia, troca, lê e apaga KML; as
  colunas da rodovia seguem as políticas da fiscalização e das unidades, que ignoram a câmara
  (A-026).
- **Motivo da diferença**: isolamento por câmara (A-026; Princípio III).
- **Objetos do catálogo**: `politica:storage.objects.kml_rodovias_authenticated_insert`,
  `politica:storage.objects.kml_rodovias_authenticated_delete`
- **Origem**: A-026 (decidido).

### R-dtr-014 — Sem rede

- **Comportamento desejado**: o aparelho dos usuários da CATERF baixa, pela sincronização do app:
  - os traçados vigentes e os pontos de KM dos contratos das fiscalizações em que o usuário está na
    equipe, ou das atividades em que está escalado;
  - as extensões das fiscalizações e das ocorrências.

  O assistente de registro, o cálculo do KM, a marca d'água e o mapa funcionam sem rede. Enviar
  traçado e recalcular exigem rede.
- **Comportamento atual**: o aparelho baixa o KML e os pontos de KM na sincronização, e o registro e
  o mapa funcionam sem rede.
- **Motivo da diferença**: só o necessário à equipe (menos dados no aparelho), pelo protocolo do core
  (R-core-021).
- **Objetos do catálogo**: `coluna:contratos.kml_url`
- **Origem**: R-core-021; constituição, Princípio II.

### R-dtr-015 — O que não é levado

- **Comportamento desejado**: o sistema novo não tem:
  - os traçados simplificados fixos no código;
  - a lista de tipos fixa no código (R-checklists-008);
  - o separador `tipo_modulo`;
  - a leitura por OCR da marca d'água antiga e o ZIP como fonte de fotos originais (R-dtr-009);
  - a origem especial de determinação da DTR (as saídas vêm do catálogo, R-fiscalizacao-007);
  - o ponto de início da visita da fiscalização.
- **Comportamento atual**: esses elementos existem no código das telas e do gerador de relatórios.
- **Motivo da diferença**: dado fixo no código, separação por tipo de módulo e contornos da falta da
  foto original (constituição v2.6.0; R-fiscalizacao-011).
- **Objetos do catálogo**: `coluna:fiscalizacoes.tipo_modulo`
- **Origem**: constituição v2.6.2.

### R-dtr-016 — O app da CATERF não escreve nos apps comuns

- **Comportamento desejado**: o app da CATERF grava só os próprios modelos: extensão do contrato,
  traçados, extensão da fiscalização e extensão da ocorrência. Fiscalização, registros, fotos,
  respostas e saídas ele cria e altera só pelas funções de serviço que a fiscalização oferece, e o
  catálogo, pela tela do motor. Um teste falha se o app gravar direto num modelo de outro app.
- **Comportamento atual**: as telas da DTR gravam direto nas tabelas comuns.
- **Motivo da diferença**: constituição, "Todo dado tem um app dono" e "Independência entre apps".
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.tipo_ocorrencia`
- **Origem**: constituição v2.5.0 e v2.6.0.

## Telas do sistema atual

Ações das telas atuais que pertencem ao módulo, no molde `formatos/spec-modulo.md` da spec 003.

### Fiscalizações da DTR (`src/pages/FiscalizacoesDTR.jsx`)

| Ação | Regra |
|---|---|
| Buscar por rodovia ou concessionária; filtrar por rodovia e situação | R-dtr-004 (filtro por rodovia); o resto, fora: fiscalizacao (R-fiscalizacao-003) |
| Nova fiscalização | R-dtr-004; fora: fiscalizacao (R-fiscalizacao-002) |
| Gerar e baixar o relatório | R-dtr-011; fora: fiscalizacao (R-fiscalizacao-016) |
| Baixar fotos (ZIP, com e sem marca d'água) | fora: fiscalizacao (R-fiscalizacao-011) |
| Excluir, digitando "EXCLUIR" | fora: fiscalizacao (R-fiscalizacao-015) |

### Nova fiscalização da DTR (`src/pages/NovaFiscalizacaoDTR.jsx`)

| Ação | Regra |
|---|---|
| Escolher a rodovia; concessionária e contrato vinculados automaticamente | R-dtr-003, R-dtr-004 (vêm do destino da atividade) |
| Aguardar "sinal estável" e recapturar a posição | R-dtr-015 (retirada: sem ponto de início da visita) |
| Inspetor (o usuário) | fora: fiscalizacao (equipe, R-fiscalizacao-001) |

### Executar fiscalização da DTR (`src/pages/ExecutarFiscalizacaoDTR.jsx`)

| Ação | Regra |
|---|---|
| Listar os pontos com KM e "KM impreciso" | R-dtr-006, R-dtr-007 |
| "Registrar imagem" e "Importar da galeria" (começa uma ocorrência) | R-dtr-006 |
| Mapa dos pontos (`RodoviaMap`) | R-dtr-010 |
| Finalizar a fiscalização | fora: fiscalizacao (R-fiscalizacao-012) |

### Registrar ocorrência (`src/pages/VistoriarOcorrenciaDTR.jsx`)

| Ação | Regra |
|---|---|
| Passos: fotos, frente, item do PER, descrição, etapa de obra, tipo, sentido, observação | R-dtr-006 |
| KM e rodovia pelo GPS e pelo traçado, atualizados até a primeira foto | R-dtr-007 |
| Marca d'água com rodovia, KM e sentido, desenhada ao salvar | R-dtr-008 |
| Mostrar a cláusula e o prazo ao marcar NC | R-dtr-006; R-checklists-013 |
| Editar ocorrência salva | R-dtr-006 |
| "Corrigir KM e Marcas d'Água", com ZIP e OCR | R-dtr-009 (com a foto original, sem ZIP nem OCR) |
| Lista de tipos fixa no código sem tipos no aparelho | R-dtr-015 (retirada) |

### Definições da DTR (`src/pages/DefinicoesDTR.jsx`)

| Ação | Regra |
|---|---|
| Aba KML por rodovia: enviar KML de cada contrato, ver "KML ✓" ou "Sem KML", ir para Contratos | R-dtr-002 |
| Aba Tipos de ocorrência | fora: checklists (spec 005) |

### Outras telas

| Tela | Ação | Regra |
|---|---|---|
| Contratos (`src/pages/Contratos.jsx`) | Campo rodovia (obrigatório) | R-dtr-002 (extensão do contrato); o resto, fora: core (R-core-020) |
| Relatórios e indicadores (`src/pages/Relatorios.jsx`) | NCs por rodovia, ocorrências por frente, principais tipos, ranking de rodovias | R-dtr-012 |
| Painel da CATERF (`src/pages/CaterfDashboard.jsx`) | Fiscalizações rodoviárias | R-dtr-012 |

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Ver as versões do traçado (vigente e substituídas), com pontos lidos e extensão | R-dtr-002 |
| Prévia do recálculo de KM (antigo e novo, por ocorrência) | R-dtr-009 |

## Migração

Mapa: `specs/003-base-dados-producao/anotacoes/migracao/dtr.toml` (app `caterf`; 20 colunas e
repositórios com destino, 0 pendentes; destinos conferidos contra os data-models da CATERF e da
fiscalização, e os do motor de checklists a conferir com o data-model da spec 005).

### Volumes de produção

| Origem | Registros ou arquivos | Destino |
|---|---:|---|
| `coluna:contratos.rodovia`, `kml_url`, `km_points` | 2 contratos, cerca de 15 mil pontos de KM | Contrato rodoviário, traçado (versão 1) e pontos de KM |
| `bucket:kml-rodovias` | 2 arquivos | Traçado (versão 1) |
| `coluna:fiscalizacoes.rodovia` | 2 fiscalizações da DTR | Fiscalização rodoviária |
| Colunas da rodovia em `unidades_fiscalizadas` | 78 ocorrências (72 constatações, 6 NCs) | Extensão da ocorrência; tipo e resposta vão ao registro de campo |
| Colunas da DTR em `tipos_ocorrencia_dtr` | 79 tipos | Valores dos campos do modelo "Ocorrências do PER" no motor (spec 005) |

### Critérios

| Critério | Meta |
|---|---|
| MIG-1 Registros | Os 2 contratos, as 2 fiscalizações e as 78 ocorrências chegam com os mesmos identificadores; os 79 tipos, pela spec 005 |
| MIG-2 Valores | Rodovia, trecho, KM, sentido e KM impreciso iguais aos da origem; os pontos de KM extraídos do KML migrado conferem com os gravados no contrato |
| MIG-3 Arquivos | Os 2 KML chegam com o mesmo checksum, como versão 1 do traçado |
| MIG-4 Legados | Ocorrência cujo tipo não casa com a versão do catálogo (frente, item do PER e descrição, com a grafia que varia) é carregada sem versão, com os textos copiados da época, e listada |
| MIG-5 Descartes | `tipo_modulo` e os elementos da R-dtr-015, com o volume listado |
| MIG-6 Mapa | 0 pendentes em `dtr.toml`, com os destinos conferidos |

### Casos conhecidos

- **Ligação das ocorrências ao tipo**: feita pela frente, pelo item do PER e pela descrição (spec 005,
  premissa "Migração da DTR"). A grafia do item do PER varia em produção, então a migração aceita
  correspondência sem diferenciar maiúsculas e espaços e lista o que não casar.
- **Textos da época**: frente, item do PER, cláusula e prazo copiados nas ocorrências migradas ficam
  guardados na extensão da ocorrência, porque são o registro do que foi notificado.
- **Resposta**: `tipo_ocorrencia` (constatação ou NC) vira a resposta do registro de campo, e as NCs e
  determinações das 6 NCs são as migradas pela fiscalização (spec 007).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O fiscal registra uma ocorrência completa (fotos, tipo, constatação ou NC, sentido)
  sem rede em menos de 1 minuto, com KM calculado no aparelho.
- **SC-002**: Em 100% das ocorrências com GPS dentro do limite e traçado vigente, o KM calculado é o
  do ponto de KM mais próximo.
- **SC-003**: Trocar o traçado de um contrato muda 0 KMs de ocorrências já registradas, até um
  recálculo confirmado.
- **SC-004**: O laudo de uma fiscalização tem as tabelas de constatações e de NCs com as colunas da
  R-dtr-011, e as fotos na ordem.
- **SC-005**: Em teste com usuários da CATERF, da CATESA, um diretor da DTR e um prestador, 0
  traçados ou dados de rodovia fora do alcance são alcançados.
- **SC-006**: O app da CATERF grava 0 vezes direto em modelos de outros apps (verificado por teste).
- **SC-007**: 100% das regras de acesso deste módulo têm teste automatizado.
- **SC-008**: Toda ação das telas atuais do módulo tem regra ou destino em outro módulo (0
  `LACUNA`).

## Assumptions

- **Limite de distância ao traçado**: 500 m, acima do qual o KM não é calculado; configurável na
  CATERF.
- **Formato do KML**: o de hoje. Marcadores com KM e rodovia nos dados estendidos ou no nome, e
  linhas do traçado. A CATERF obtém o KML das concessionárias ou do órgão rodoviário.
- **Gravidade**: mantida como campo opcional da extensão da ocorrência, sem passo obrigatório no
  assistente, para preservar o que houver registrado. Se a CATERF quiser o passo de volta, é
  configuração do assistente.
- **Uma câmara**: a CATERF é hoje a única câmara da DTR com fiscalização no sistema; outras câmaras
  da DTR (CATRANSP, CATEFIS, CRET) terão os próprios apps se vierem a fiscalizar.
- **Prestador**: o que a concessionária vê do laudo e das ocorrências é da spec do portal do
  prestador.
