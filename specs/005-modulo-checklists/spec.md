# Feature Specification: Módulo checklists — motor genérico de verificação

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec de módulo dos checklists do sistema novo da AGEMS, segundo módulo da ordem da spec
003 (`specs/003-base-dados-producao/ordem-modulos.md`), escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes: o catálogo do banco de produção
(objetos do módulo `checklists` no `mapa-rastreabilidade.md`), os achados decididos e as
divergências classificadas da spec 003, a spec do core (004) e as telas do sistema atual. Revisões de
2026-09-30 (decisões do responsável): o módulo é o motor de verificação de qualquer câmara, e é
genérico como um "lego": não tem nada de nenhuma câmara; o app de fiscalização de cada câmara monta
o seu uso com as peças do motor.

## Contexto

Toda fiscalização compara o que o fiscal encontra com uma lista de verificação definida pela câmara.
Hoje há duas listas, feitas de formas diferentes e cada uma com tabela, tela e regras próprias:

- **DSB (saneamento)**: um checklist por tipo de unidade (aterro sanitário, estação de tratamento de
  esgoto...). Para cada unidade vistoriada, o fiscal responde Sim ou Não a todas as perguntas, e
  cada resposta gera a constatação, a não conformidade (NC), a determinação com prazo ou a
  recomendação. Produção tem 33 tipos e 768 linhas de itens (525 vigentes e 243 versões antigas).
- **DTR (rodovias)**: um catálogo de tipos de ocorrência derivado do Programa de Exploração da
  Rodovia (PER). Percorrendo a rodovia, o fiscal registra ocorrências em pontos, escolhe o tipo
  navegando por frente e item do PER e diz se é constatação ou NC; o tipo traz a cláusula não
  atendida e o prazo. Produção tem 79 tipos.

As duas são o mesmo mecanismo. Este módulo é esse mecanismo, construído como um **motor genérico
feito de peças**:

- **Peças do motor** (este módulo): catálogo, item, versões com vigência, campos de item, respostas,
  saídas por resposta, papéis de campo na aplicação, importação por planilha com prévia, cópia
  offline, acesso por câmara, auditoria.
- **Montagem** (a câmara, pela tela): um **modelo de catálogo** que diz quais campos o item tem,
  quais respostas existem, o que cada resposta gera, como os campos organizam a escolha do item e
  qual é o formato da planilha. O coordenador da câmara monta o modelo na tela do motor, escolhendo
  as peças, ou copia o modelo de outra câmara e o ajusta (a CATERS pode partir do modelo da CATESA).
  A DSB e a DTR de hoje são dois modelos; uma câmara nova monta o seu sem mudar o motor.
- **Peças trazidas pelos apps**: o que o motor não sabe fazer sozinho vem dos apps que aplicam os
  catálogos, e aparece na tela de montagem como peça disponível: as saídas (constatação, NC,
  determinação, recomendação, registradas pela fiscalização), os valores de contexto usados para
  filtrar itens (a rodovia da fiscalização, registrada pelo app da CATERF) e os modos de aplicação.

O módulo **não tem tabela, coluna, tela, formato de planilha, texto nem regra de nenhuma câmara**.
Os modelos de hoje estão descritos na seção "Modelos de hoje", como a configuração inicial das
câmaras, carregada na implantação para preservar o que o sistema atual faz.

**O que fica no app de cada câmara**: tudo o que não é catálogo. O app da CATERF, por exemplo, faz o
registro de ocorrência na rodovia (GPS, KM pelo traçado KML, sentido, fotos com marca d'água, mapa e
relatório no layout da câmara) e, para escolher o tipo de ocorrência, pede ao motor os itens vigentes
filtrados pela rodovia e organizados por frente e item do PER, e guarda a versão escolhida. Câmaras
que trabalham quase igual (CATESA e CATERS) podem ter apps pequenos: o fluxo de vistoria por unidade
é do app de fiscalização comum, e o app da câmara acrescenta só o que for dela.

A característica central do motor é o **versionamento**: um item nunca é alterado nem apagado,
porque as vistorias já feitas precisam continuar mostrando o texto da época. Na DSB isso é feito hoje
de forma implícita, o que gerou versões duplicadas por reimportação; na DTR não há versionamento. O
achado A-024 decidiu o versionamento explícito, que o motor aplica a qualquer catálogo.

Fica fora desta spec: a execução da vistoria e do registro de ocorrências (unidades, pontos, fotos,
KM, respostas) e a geração dos registros a partir das saídas (módulo fiscalização e apps das
câmaras), que usam as peças definidas aqui.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A câmara monta o seu modelo com as peças do motor (Priority: P1)

O coordenador da câmara monta na tela o modelo de catálogo dela, escolhendo as peças: campos do
item, respostas, saídas de cada resposta, papéis dos campos na escolha do item e formato da
planilha. Pode também copiar o modelo de outra câmara e ajustá-lo. O motor passa a oferecer, para os
catálogos desse modelo, cadastro, versionamento, importação, cópia offline e controle de acesso, sem
nenhuma alteração de código.

**Why this priority**: é o que torna o motor comum a todas as câmaras; sem isso, cada câmara
exigiria mudar o módulo (constituição v2.6.0, "Apps comuns como motores genéricos").

**Independent Test**: o coordenador da CATERS copia o modelo da CATESA, acrescenta um campo e troca
uma resposta para Sim / Não / Não se aplica; a equipe cadastra e importa itens, e uma fiscalização de
teste os aplica. Nenhum código muda, e o modelo da CATESA continua igual.

**Acceptance Scenarios**:

1. **Given** um modelo montado na tela, **When** a equipe da câmara abre o cadastro, **Then** vê o
   formulário de item com os campos do modelo.
2. **Given** um modelo com um campo obrigatório, **When** alguém grava um item sem ele, **Then** o
   motor recusa, pela regra declarada no modelo.
3. **Given** um modelo inválido (saída que cita campo inexistente, papel de campo incompatível com o
   tipo), **When** o coordenador tenta salvá-lo, **Then** o motor recusa e mostra o motivo.
4. **Given** o modelo da CATESA, **When** o coordenador da CATERS o copia e altera a cópia, **Then** o
   modelo da CATESA não muda, e a cópia registra de onde veio.
5. **Given** a tela de montagem, **When** o coordenador escolhe uma saída ou um valor de contexto,
   **Then** só vê as peças que os apps instalados oferecem.
6. **Given** a CATESA com o modelo "Checklist por tipo de unidade" (Sim/Não), **When** o coordenador
   monta um segundo modelo com outra forma de resposta (ex.: Sim / Não / Não se aplica, ou uma nota
   de 1 a 5), **Then** os dois modelos convivem na câmara, cada catálogo usa um deles, e uma mesma
   fiscalização pode ter unidades de catálogos de modelos diferentes.
7. **Given** o código do motor, **When** é inspecionado, **Then** não contém identificador, campo,
   formato ou texto de nenhuma câmara.

---

### User Story 2 - A equipe mantém os catálogos da câmara (Priority: P1)

A equipe da câmara cria catálogos de um modelo (na DSB, um por tipo de unidade; na DTR, o catálogo de
ocorrências) e mantém os itens pelo formulário gerado a partir do modelo. Editar ou retirar um item
nunca muda o que vistorias passadas registraram.

**Why this priority**: sem catálogo não há vistoria; é o conteúdo que a fiscalização executa.

**Independent Test**: um responsável da CATESA cria o tipo "Estação de Tratamento de Água" com três
itens, edita um e retira outro: a lista atual mostra dois itens, o editado com o texto novo, e o
histórico mostra as versões. Um responsável da câmara da DTR edita o prazo de um tipo de ocorrência:
a lista atual mostra o prazo novo, e o histórico, o anterior.

**Acceptance Scenarios**:

1. **Given** um catálogo com itens, **When** o responsável edita um item, **Then** passa a valer uma
   nova versão, e a anterior continua ligada aos registros que a usaram.
2. **Given** um item, **When** o responsável muda só a ordem dele, **Then** o item continua o mesmo e
   nenhuma versão é criada.
3. **Given** um item, **When** o responsável o retira, **Then** ele some da lista atual e continua
   existindo para os registros que o usaram.
4. **Given** um catálogo usado em alguma fiscalização, **When** alguém tenta apagá-lo, **Then** o
   motor recusa e oferece desativar.

---

### User Story 3 - A fiscalização usa a versão certa (Priority: P1)

O app que aplica o catálogo pede ao motor os itens vigentes numa data e guarda, em cada resposta ou
ocorrência, a versão usada. Relatórios antigos continuam mostrando o texto da época.

**Why this priority**: é a garantia jurídica de que o relatório e a notificação refletem o texto em
vigor na vistoria (Princípio I).

**Independent Test**: uma unidade é criada; um item é editado depois; a unidade continua mostrando o
texto antigo, e uma unidade criada depois mostra o novo. Uma ocorrência da DTR é registrada; o prazo
do tipo muda; a ocorrência continua com o prazo da época.

**Acceptance Scenarios**:

1. **Given** uma unidade criada em 10/03 e um item editado em 15/03, **When** o fiscal abre a
   unidade, **Then** vê a versão vigente em 10/03.
2. **Given** um registro ligado a uma versão, **When** o item muda, **Then** o registro continua
   ligado à versão usada.
3. **Given** o fiscal sem rede, **When** abre uma unidade ou registra uma ocorrência da sua câmara,
   **Then** o catálogo certo está no aparelho.

---

### User Story 4 - Importar um catálogo de planilha (Priority: P2)

O responsável baixa o modelo de planilha do catálogo, preenche e importa. Antes de gravar, vê o que
será criado, alterado, mantido, retirado ou recusado. Reimportar a mesma planilha não cria nada. O
formato de cada planilha vem do modelo do catálogo; os formatos de hoje (DSB e DTR) continuam aceitos.

**Why this priority**: é como os catálogos foram carregados e são revisados em lote.

**Independent Test**: importar uma planilha da DSB com 10 itens mostra a prévia e grava; reimportá-la
informa "nada a alterar"; alterar uma linha e reimportar cria só a versão nova daquele item. Importar
a planilha da DTR com um tipo a menos mostra o tipo como ausente e só o retira se o responsável
marcar.

**Acceptance Scenarios**:

1. **Given** uma planilha válida, **When** o responsável a envia, **Then** vê a prévia por linha
   (criar, nova versão, sem mudança, erro) antes de confirmar.
2. **Given** a mesma planilha já importada, **When** é importada de novo, **Then** nenhuma versão é
   criada.
3. **Given** uma linha que não cumpre o modelo, **When** a planilha é importada, **Then** a linha
   aparece como erro com o motivo, e as demais seguem.
4. **Given** itens vigentes ausentes da planilha, **When** o responsável importa, **Then** a prévia os
   mostra, e eles só são retirados se o responsável marcar.

---

### User Story 5 - Cada câmara vê e usa só os seus catálogos (Priority: P2)

Os catálogos pertencem à câmara dos serviços a que se aplicam; a fiscalização só oferece catálogos da
câmara e dos serviços da fiscalização.

**Why this priority**: o isolamento por câmara é requisito (A-026); hoje tipo sem serviço aparece para
todas as câmaras, e o catálogo da DTR é alterável por qualquer usuário ativo, inclusive o prestador.

**Independent Test**: um fiscal da CATERS não vê nem altera catálogos da CATESA nem da DTR; um
prestador não alcança nenhum catálogo.

**Acceptance Scenarios**:

1. **Given** um fiscal da CATERS, **When** lista os catálogos, **Then** vê só os da CATERS.
2. **Given** um catálogo sem serviço aplicável, **When** alguém tenta salvá-lo, **Then** o motor
   recusa.

---

### Edge Cases

- Dois responsáveis editam o mesmo item ao mesmo tempo: cada gravação cria uma versão; vale a mais
  recente, e as duas ficam no histórico.
- Item editado enquanto um fiscal está sem rede: o registro feito no aparelho fica com a versão que o
  aparelho tinha; a versão nova chega na próxima sincronização.
- O coordenador muda o modelo (campo novo, resposta nova): as versões existentes não mudam; o que o
  modelo novo exige vale a partir da próxima versão de cada item (R-checklists-017).
- Um app que oferecia uma peça usada num modelo é retirado (ex.: o contexto "rodovia"): o modelo fica
  marcado como incompleto, os catálogos dele não são oferecidos para registros novos até o ajuste, e
  os registros já feitos continuam legíveis (R-checklists-019).
- Modelo copiado de outra câmara que depois muda na origem: a cópia não muda; as duas seguem
  independentes (R-checklists-018).
- Catálogo que precisa passar para outro modelo: o modelo de um catálogo não muda depois que ele tem
  itens, porque as versões dependem dos campos do modelo; cria-se um catálogo novo com o outro modelo
  (a importação ou a cópia de itens ajuda), e o antigo é desativado (R-checklists-015).
- Catálogo desativado com fiscalização em andamento: os registros já feitos continuam válidos.
- Catálogo sem itens (produção tem 3 tipos de unidade assim): existe, mas não é oferecido para
  registro novo até ter um item vigente.
- Aparelho sem catálogo baixado: o app avisa e pede sincronização; nunca usa lista fixa no código.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O motor MUST NOT conter tabela, coluna, tela, formato de planilha, texto ou regra de
  nenhuma câmara; tudo o que é de uma câmara MUST vir do modelo dela (R-checklists-015,
  R-checklists-016).
- **FR-002**: O coordenador da câmara e o administrador MUST poder montar e alterar na tela os modelos
  de catálogo da câmara, com validação ao salvar; uma câmara MUST poder ter quantos modelos quiser,
  cada um com a sua forma de resposta (R-checklists-015).
- **FR-003**: O motor MUST manter catálogos com nome e código únicos, modelo, serviços aplicáveis e
  situação; todo catálogo MUST pertencer à câmara dos seus serviços (R-checklists-001,
  R-checklists-002).
- **FR-004**: O conteúdo de cada item MUST ser os valores dos campos do modelo, validados pelo modelo
  (R-checklists-003).
- **FR-005**: O motor MUST manter os itens com versões explícitas, nunca alterando nem apagando uma
  versão; mudar a ordem MUST NOT criar item nem versão (R-checklists-004).
- **FR-006**: O motor MUST informar as versões vigentes numa data e a versão por identificador
  (R-checklists-005).
- **FR-007**: A importação MUST seguir o formato do modelo, oferecer o modelo para baixar, mostrar a
  prévia, criar versão só quando o conteúdo mudou e ser repetível sem efeito (R-checklists-006).
- **FR-008**: Coordenador e fiscal MUST poder manter catálogos só da própria câmara; o administrador,
  de todas; o prestador MUST NOT alcançá-los (R-checklists-007).
- **FR-009**: Catálogos e itens MUST estar no aparelho para uso sem rede, no escopo da câmara do
  usuário (R-checklists-008).
- **FR-010**: Catálogo usado MUST NOT ser apagado; MUST poder ser desativado; não há operação de
  apagar todos os itens (R-checklists-009).
- **FR-011**: Cada versão MUST registrar autor e data; as alterações de catálogos e as importações
  MUST ser auditadas (R-checklists-010).
- **FR-012**: O motor MUST oferecer os modos de aplicação "lista por unidade" e "registro avulso"
  (R-checklists-012).
- **FR-013**: O modelo MUST poder declarar as respostas e as saídas de cada resposta, com condições
  sobre os campos do item; o motor MUST guardar essas declarações sem interpretar as saídas
  (R-checklists-013).
- **FR-014**: O modelo MUST poder atribuir a campos os papéis de agrupamento, aplicabilidade e escolha
  complementar (R-checklists-014).
- **FR-015**: Mudanças de modelo MUST valer só para versões novas (R-checklists-017).
- **FR-016**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).
- **FR-017**: O coordenador MUST poder copiar para a sua câmara o modelo de outra câmara, gerando uma
  cópia independente; o administrador MUST poder copiar também os catálogos com os itens vigentes
  (R-checklists-018).
- **FR-018**: As saídas, os valores de contexto e os modos de aplicação oferecidos na montagem MUST
  ser os registrados pelos apps instalados (R-checklists-019).

### Key Entities

- **Modelo de catálogo**: a montagem de uma câmara: câmara dona, modo de aplicação, campos do item,
  respostas, saídas por resposta, papéis dos campos, formato da planilha e, se veio de cópia, o
  modelo e a versão de origem. Tem versões (R-checklists-017). Um modelo serve a vários catálogos
  (os tipos de unidade da CATESA usam o mesmo modelo).
- **Peça registrada por app**: saída, valor de contexto ou modo de aplicação que um app instalado
  oferece para a montagem, com o app que a oferece.
- **Campo do item**: peça declarada no modelo: nome, rótulo, tipo de valor (texto curto, texto longo,
  número inteiro, sim/não, lista de valores, lista de linhas), obrigatoriedade, valor padrão e papel
  opcional.
- **Resposta e saída**: as respostas possíveis de um modelo e, para cada uma, as saídas (identificador
  definido pelo app que aplica o catálogo), a condição sobre campos do item e os campos que alimentam
  cada saída.
- **Formato de planilha**: colunas → campos, herança de células vazias, junção de linhas, chave de
  importação e o arquivo modelo.
- **Catálogo**: instância de um modelo mantida por uma câmara: nome, código, modelo, serviços, câmara
  (derivada), situação.
- **Item** e **versão do item**: identidade estável e ordem; a versão guarda os valores dos campos,
  a versão do modelo em que foi criada, vigência e autor.
- **Importação de planilha**: o lote importado, com a prévia por linha e o resultado.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. As chaves citadas estão no catálogo
da spec 003. As regras descrevem só peças genéricas; o que cada câmara faz hoje aparece em
"comportamento atual" e na seção "Modelos de hoje".

### R-checklists-001 — Catálogos

- **Comportamento desejado**: o catálogo é uma instância de um modelo mantida por uma câmara. Tem
  nome (obrigatório, único sem diferenciar maiúsculas), código curto (obrigatório, único sem
  diferenciar maiúsculas; o app que aplica pode usá-lo, como a DSB usa para o código da unidade),
  modelo, serviços aplicáveis (pelo menos um, da lista de serviços do core) e situação (ativo ou
  desativado). "Excluir" na tela desativa; reativar é possível.
- **Comportamento atual**: são dois cadastros sem relação. Tipos de unidade (DSB): nome obrigatório;
  código obrigatório na tela, mas opcional e não único no banco; serviços como texto livre, e tipo
  sem serviço aparece para todas as câmaras; produção tem 33 tipos, todos ativos. DTR: não há
  cadastro de catálogo; a tabela de tipos de ocorrência é a lista única da diretoria, sem serviço nem
  câmara.
- **Motivo da diferença**: um só cadastro de catálogos para qualquer câmara (decisão do responsável,
  2026-09-30); nome ou código repetido faz a importação escolher o catálogo errado; serviço como texto
  livre diverge da lista do core; catálogo sem serviço fura o isolamento por câmara.
- **Objetos do catálogo**: `tabela:tipos_unidade`, `coluna:tipos_unidade.nome`,
  `coluna:tipos_unidade.codigo`, `coluna:tipos_unidade.servicos_aplicaveis`,
  `coluna:tipos_unidade.ativo`, `coluna:tipos_unidade.created_at`, `coluna:tipos_unidade.id`,
  `restricao:tipos_unidade.tipos_unidade_pkey`, `indice:tipos_unidade_pkey`,
  `tabela:tipos_ocorrencia_dtr`
- **Origem**: A-026 (decidido); divergência `coluna:tipos_unidade.codigo` (comentário só em produção,
  producao_vale).

### R-checklists-002 — O catálogo pertence à câmara dos seus serviços

- **Comportamento desejado**: a câmara de um catálogo é a câmara dos serviços aplicáveis dele, pelo
  vínculo serviço → câmara do core (R-core-014). Todos os serviços de um catálogo são da mesma câmara;
  catálogo com serviços de câmaras diferentes é recusado. O motor oferece para registro novo só
  catálogos ativos, com pelo menos um item vigente, da câmara pedida e com algum serviço em comum com
  os informados pelo app que aplica.
- **Comportamento atual**: não há câmara no tipo de unidade; a fiscalização filtra os tipos ativos
  por serviço em comum e mostra os sem serviço para todas. Três tipos juntam água e esgoto (ambos da
  CATESA). O catálogo da DTR não tem serviço nem câmara.
- **Motivo da diferença**: isolamento por câmara (A-026) e fim do catálogo "para todas".
- **Objetos do catálogo**: `coluna:tipos_unidade.servicos_aplicaveis`,
  `funcao:camara_from_servicos(p_servicos text[])`
- **Origem**: A-026 (decidido), A-021 (decidido).

### R-checklists-003 — Conteúdo de um item: os campos do modelo

- **Comportamento desejado**: o conteúdo de cada versão de item são os valores dos campos declarados
  no modelo do catálogo, mais a ordem do item. O motor valida tipo, obrigatoriedade e valores
  permitidos e aplica os padrões do modelo, tanto no formulário quanto na importação. O formulário de
  item é gerado a partir do modelo: todo campo do modelo é editável nele. O motor não tem campo fixo
  de conteúdo, nem mesmo "pergunta", "prazo" ou "gera NC": esses são campos dos modelos de hoje.
- **Comportamento atual**: os campos são colunas fixas, diferentes em cada tabela:
  - DSB: pergunta, constatação Sim e Não, gera NC, dispositivo normativo, texto da NC, determinação,
    prazo (30 dias em todos os itens de produção) e recomendação. O formulário começa com "gera NC"
    desligado, enquanto a importação marca todo item como gerador de NC.
  - DSB, prazo e texto da NC no formulário: **a confirmar**. O responsável informa que o formulário
    permite editar os dois; o formulário deste repositório
    (`src/components/admin/ItemChecklistForm.jsx`) não tem esses campos e, na edição, mantém os
    valores anteriores sem mostrá-los. Pode ser diferença entre o código implantado e o deste
    repositório; conferir na tela de produção. O comportamento desejado não muda.
  - DTR: nome, descrição, gera NC (marcado quando a planilha traz a cláusula; 51 tipos), cláusula não
    atendida, prazo padrão (1, 5, 15 ou 30 dias; vazio em 32 tipos), observação-padrão (sem coluna na
    planilha modelo) e os campos da rodovia (R-checklists-014). Não há formulário; só planilha.
- **Motivo da diferença**: campo fixo de uma câmara no motor obrigaria a mudar o motor para cada
  câmara (decisão do responsável, 2026-09-30: motor como "lego").
- **Objetos do catálogo**: `coluna:itens_checklist.pergunta`, `coluna:itens_checklist.texto_constatacao_sim`,
  `coluna:itens_checklist.texto_constatacao_nao`, `coluna:itens_checklist.gera_nc`,
  `coluna:itens_checklist.artigo_portaria`, `coluna:itens_checklist.texto_nc`,
  `coluna:itens_checklist.texto_determinacao`, `coluna:itens_checklist.prazo_dias`,
  `coluna:itens_checklist.texto_recomendacao`, `coluna:tipos_ocorrencia_dtr.nome`,
  `coluna:tipos_ocorrencia_dtr.descricao`, `coluna:tipos_ocorrencia_dtr.gera_nc`,
  `coluna:tipos_ocorrencia_dtr.nao_atendimento`, `coluna:tipos_ocorrencia_dtr.prazo_dias_padrao`,
  `coluna:tipos_ocorrencia_dtr.observacoes`
- **Origem**: decisão do responsável, 2026-09-30.

### R-checklists-004 — Versionamento explícito

- **Comportamento desejado**: em qualquer catálogo, o item tem identidade estável e versões
  numeradas. Criar um item cria a versão 1. Editar cria a versão seguinte, com início de vigência na
  data da gravação, e encerra a anterior. Retirar encerra a vigência da versão atual sem criar outra.
  A ordem é um atributo do item: mudá-la não cria item nem versão. Nenhuma versão é alterada nem
  apagada depois de criada. A lista atual mostra, em ordem, a versão vigente de cada item não
  retirado; o histórico mostra todas as versões com autor e data.
- **Comportamento atual**:
  - DSB: não há item estável; a "chave" é o tipo mais a ordem (ou a pergunta), a linha mais recente
    de cada chave vale, e `ativo = false` marca exclusão. Mudar a ordem cria um item "novo". As 768
    linhas estão com `ativo = true`, sendo 243 versões antigas; 82 chaves têm 2 a 5 versões, 81 delas
    com a pergunta idêntica (reimportação).
  - DTR: sem versionamento; a importação altera o tipo no próprio registro, e a ocorrência preserva o
    texto copiando campos do tipo.
- **Motivo da diferença**: a regra implícita da DSB é difícil de manter e quebra o item quando a
  ordem muda; na DTR, a cópia preserva só parte do conteúdo e não diz qual versão foi usada.
- **Objetos do catálogo**: `tabela:itens_checklist`, `coluna:itens_checklist.id`,
  `coluna:itens_checklist.ordem`, `coluna:itens_checklist.ativo`, `coluna:itens_checklist.created_at`,
  `coluna:itens_checklist.tipo_unidade_id`, `restricao:itens_checklist.itens_checklist_pkey`,
  `indice:itens_checklist_pkey`, `politica:public.itens_checklist.Operadores gerenciam itens de checklist`,
  `coluna:tipos_ocorrencia_dtr.id`, `coluna:tipos_ocorrencia_dtr.ativo`,
  `coluna:tipos_ocorrencia_dtr.created_at`, `coluna:tipos_ocorrencia_dtr.updated_at`,
  `gatilho:public.tipos_ocorrencia_dtr.update_tipos_ocorrencia_dtr_updated_at`,
  `restricao:tipos_ocorrencia_dtr.tipos_ocorrencia_dtr_pkey`, `indice:tipos_ocorrencia_dtr_pkey`
- **Origem**: A-024 (decidido), estendido a qualquer catálogo (decisão do responsável, 2026-09-30).

### R-checklists-005 — Versão usada num registro

- **Comportamento desejado**: o motor responde, para um catálogo e uma data, as versões vigentes
  nela, e responde uma versão pelo identificador. Quem aplica o catálogo escolhe a data de referência
  e guarda, em cada registro, a versão usada (nos modelos de hoje: a DSB usa a data de criação da
  unidade, e a vistoria reaberta mostra as versões já respondidas; a DTR guarda a versão escolhida no
  registro da ocorrência).
- **Comportamento atual**: na DSB, o aplicativo escolhe, para cada chave, a versão mais recente até a
  criação da unidade, preferindo as já respondidas; a resposta aponta para a linha respondida. Na
  DTR, a ocorrência não aponta para o tipo; guarda cópias de campos dele.
- **Motivo da diferença**: com versões explícitas, a escolha não depende da regra de chave, e todo
  registro diz de que versão veio; o efeito para o fiscal é o mesmo.
- **Objetos do catálogo**: `coluna:itens_checklist.id`, `coluna:itens_checklist.created_at`,
  `coluna:unidades_fiscalizadas.tipo_unidade_id`, `coluna:respostas_checklist.item_checklist_id`
- **Origem**: A-024 (decidido).

### R-checklists-006 — Importação por planilha

- **Comportamento desejado**: o motor importa qualquer catálogo pelo formato de planilha do modelo
  dele (R-checklists-015), com as peças:
  - colunas → campos do modelo (e, quando o modelo cria catálogos pela planilha, colunas → dados do
    catálogo, como nome, código e serviços);
  - herança de células vazias da linha de cima (células mescladas), por coluna;
  - junção de linhas com a mesma chave, acumulando os valores num campo "lista de linhas";
  - chave de importação (campos que identificam o item) e arquivo modelo para baixar.

  Em qualquer formato, o motor mostra a prévia por linha — item novo, nova versão (conteúdo mudou),
  sem mudança, erro com motivo — e os itens vigentes ausentes da planilha, que só são retirados se o
  responsável marcar; grava só depois da confirmação; cria versão só quando o conteúdo mudou;
  recusa linhas de catálogos fora da câmara de quem importa; funciona só com rede.
- **Comportamento atual**:
  - DSB: grava direto, sem prévia; cria uma versão nova para toda linha, mesmo igual à vigente (origem
    das 81 chaves duplicadas); marca todo item como gerador de NC; ignora linhas sem pergunta ou
    tipo; não há modelo para baixar.
  - DTR: há modelo para baixar e prévia com confirmação; altera no próprio registro o tipo que casa
    com a chave, ou insere; tipos ausentes continuam, e para tirá-los o caminho é "Limpar base" e
    reimportar.
  - Os dois formatos estão fixos no código das telas.
- **Motivo da diferença**: formato fixo no motor o prenderia às câmaras de hoje; reimportar duplicava
  o checklist da DSB; sem prévia, um erro só aparecia depois de gravado; apagar a base da DTR para
  reimportar perde o vínculo das ocorrências.
- **Objetos do catálogo**: `tabela:itens_checklist`, `tabela:tipos_unidade`, `tabela:tipos_ocorrencia_dtr`
- **Origem**: A-024 (decidido).

### R-checklists-007 — Quem mantém os catálogos

- **Comportamento desejado**: coordenador e fiscal da câmara criam e alteram catálogos e itens, só da
  própria câmara; o administrador, de todas (decisão do responsável, 2026-09-30); o diretor lê os da
  sua diretoria; o prestador não acessa os catálogos (vê só os textos que chegam a ele nos documentos
  da fiscalização). Montar e alterar o modelo de catálogo da câmara e copiar modelo de outra câmara
  cabem ao coordenador da câmara e ao administrador; o fiscal usa o modelo, mas não o altera
  (R-checklists-015, R-checklists-018).
- **Comportamento atual**: na DSB, administrador, coordenador e fiscal ativos criam, alteram e
  excluem tipos e itens de qualquer câmara, e qualquer usuário ativo, inclusive o prestador, lê
  todos. Na DTR, qualquer usuário com perfil ativo, inclusive o prestador, lê, cria, altera e apaga
  tipos, inclusive pelo "Limpar base" (a regra chama-se "Escrita admin", mas não verifica o papel).
- **Motivo da diferença**: isolamento por câmara (A-026); o prestador não pode alterar o que é usado
  para fiscalizá-lo.
- **Objetos do catálogo**: `politica:public.itens_checklist.Operadores gerenciam itens de checklist`,
  `politica:public.itens_checklist.Leitura pública de itens de checklist`,
  `politica:public.tipos_unidade.Operadores gerenciam tipos de unidade`,
  `politica:public.tipos_unidade.Leitura pública de tipos de unidade`,
  `politica:public.tipos_ocorrencia_dtr.Escrita admin tipos_ocorrencia_dtr`,
  `politica:public.tipos_ocorrencia_dtr.Leitura autenticada tipos_ocorrencia_dtr`,
  `privilegio:itens_checklist.anon`, `privilegio:itens_checklist.authenticated`,
  `privilegio:itens_checklist.service_role`, `privilegio:tipos_unidade.anon`,
  `privilegio:tipos_unidade.authenticated`, `privilegio:tipos_unidade.service_role`,
  `privilegio:tipos_ocorrencia_dtr.anon`, `privilegio:tipos_ocorrencia_dtr.authenticated`,
  `privilegio:tipos_ocorrencia_dtr.service_role`
- **Origem**: A-026 (decidido); A-005 (decidido, privilégios sem login).

### R-checklists-008 — Catálogo disponível sem rede

- **Comportamento desejado**: o aplicativo baixa os modelos, os catálogos da câmara do usuário e as
  versões dos itens deles (as vigentes e as que registros do seu alcance já usam) e recebe só o que
  mudou nas sincronizações seguintes, pelo protocolo do core (R-core-021); o usuário pode pedir a
  atualização a qualquer momento. Sem catálogo no aparelho, o app avisa e pede sincronização. A
  manutenção de catálogos não é feita offline.
- **Comportamento atual**: na DSB, o aplicativo baixa todos os tipos e todas as linhas de itens, de
  todas as câmaras, inclusive versões antigas. Na DTR, o botão "Sincronizar" substitui a cópia do
  aparelho; sem tipos no aparelho, o registro de ocorrência usa uma lista de 16 tipos fixa no código.
- **Motivo da diferença**: escopo por câmara (A-026), menos dados no aparelho, e nada de lista fixa
  no código.
- **Objetos do catálogo**: `tabela:tipos_unidade`, `tabela:itens_checklist`, `tabela:tipos_ocorrencia_dtr`
- **Origem**: A-026 (decidido).

### R-checklists-009 — Catálogos e itens não são apagados

- **Comportamento desejado**: catálogo não é apagado; só desativado. Catálogo desativado não é
  oferecido para registro novo, e os registros existentes continuam com ele. Versões nunca são
  apagadas (R-checklists-004). Não há operação de apagar todos os itens; a revisão completa é feita
  pela importação, retirando os ausentes quando o responsável marca (R-checklists-006).
- **Comportamento atual**: na DSB, a tela só desativa, mas a regra de acesso permite apagar tipos e
  itens, e apagar um tipo apagaria os itens em cascata. Na DTR, "Limpar base" apaga todos os tipos,
  depois de uma confirmação.
- **Motivo da diferença**: apagar perderia o texto das vistorias e o vínculo das ocorrências
  (Princípio I).
- **Objetos do catálogo**: `restricao:itens_checklist.itens_checklist_tipo_unidade_id_fkey`,
  `politica:public.tipos_unidade.Operadores gerenciam tipos de unidade`,
  `politica:public.tipos_ocorrencia_dtr.Escrita admin tipos_ocorrencia_dtr`
- **Origem**: —

### R-checklists-010 — Autoria das versões e auditoria

- **Comportamento desejado**: cada versão registra quem a criou e quando (é o próprio histórico do
  item). Criação, alteração e desativação de catálogos, cada importação e cada registro ou mudança de
  modelo entram na auditoria do core (R-core-022).
- **Comportamento atual**: as versões não registram autor; os campos de autoria herdados do app de
  origem estão vazios; catálogos não são auditados.
- **Motivo da diferença**: rastrear quem mudou o texto que vai para os relatórios.
- **Objetos do catálogo**: `coluna:itens_checklist.created_by`, `coluna:itens_checklist.created_by_id`
- **Origem**: —

### R-checklists-011 — Campos herdados sem uso não são levados

- **Comportamento desejado**: o sistema novo não tem os campos herdados do app de origem que nenhuma
  parte do sistema usa: marcador de exemplo, datas duplicadas de criação e alteração e os campos de
  autoria vazios (substituídos pela autoria da R-checklists-010).
- **Comportamento atual**: as colunas existem, vazias ou com cópia de `created_at`; nas migrations
  (não em produção) um gatilho as mantinha.
- **Motivo da diferença**: campos sem uso confundem quem mantém.
- **Objetos do catálogo**: `coluna:itens_checklist.is_sample`, `coluna:itens_checklist.created_date`,
  `coluna:itens_checklist.updated_date`, `coluna:itens_checklist.created_by`,
  `coluna:itens_checklist.created_by_id`
- **Origem**: divergência `funcao:sync_dates_columns()`, objeto só nas migrations (residuo_descartar).

### R-checklists-012 — Modos de aplicação

- **Comportamento desejado**: o modelo escolhe um dos modos de aplicação que o motor oferece:
  - **lista por unidade**: cada registro (ex.: a unidade vistoriada) recebe todos os itens vigentes
    do catálogo, na ordem, para serem respondidos um a um;
  - **registro avulso**: cada registro (ex.: a ocorrência num ponto da rodovia) escolhe um item do
    catálogo e a resposta.

  O motor fornece os itens e a versão; não conhece unidade, ponto, KM nem foto, que são do app que
  aplica.
- **Comportamento atual**: os dois modos existem em telas e tabelas separadas (vistoria da DSB e
  registro de ocorrência da DTR); a ocorrência da DTR é gravada como unidade sem tipo.
- **Motivo da diferença**: dois modos genéricos atendem as câmaras de hoje e as que vierem sem
  cadastros paralelos.
- **Objetos do catálogo**: `tabela:tipos_unidade`, `tabela:tipos_ocorrencia_dtr`,
  `coluna:unidades_fiscalizadas.tipo_unidade_id`, `coluna:unidades_fiscalizadas.tipo_ocorrencia`
- **Origem**: decisão do responsável, 2026-09-30.

### R-checklists-013 — Respostas e saídas declaradas no modelo

- **Comportamento desejado**: o modelo declara:
  - as **respostas** possíveis: opções fixas (ex.: Sim/Não, Sim/Não/Não se aplica,
    Constatação/Não conformidade), número ou texto;
  - para cada resposta, as **saídas**: um identificador de saída, uma condição opcional sobre
    campos do item (campo sim/não verdadeiro, campo preenchido, campo vazio) e os campos que
    alimentam a saída.

  Os identificadores de saída (constatação, NC, determinação, recomendação...) são definidos pelo app
  que aplica o catálogo; o motor os guarda e entrega sem interpretar. Assim, o motor não sabe o que é
  uma NC: quem gera os registros é a fiscalização, a partir do que o modelo declarou.
- **Comportamento atual**: as regras estão fixas no código de telas diferentes. Na DSB, as respostas
  são `SIM` e `NAO` (o servidor aceita também `NÃO`), e a regra "Não gera NC se o item gera NC;
  determinação se houver texto, senão recomendação" está no código. Na DTR, a ocorrência grava
  `constatacao` ou `nc`, escolhidos pelo fiscal, e a cláusula e o prazo só são copiados quando é NC;
  "gera NC" do tipo não é consultado.
- **Motivo da diferença**: com as regras no código, cada câmara nova exigiria mudar o motor.
- **Objetos do catálogo**: `coluna:respostas_checklist.resposta`,
  `coluna:unidades_fiscalizadas.tipo_ocorrencia`, `coluna:itens_checklist.gera_nc`,
  `coluna:tipos_ocorrencia_dtr.gera_nc`
- **Origem**: decisão do responsável, 2026-09-30.

### R-checklists-014 — Papéis de campo na aplicação

- **Comportamento desejado**: o modelo pode dar a um campo um papel na aplicação, e o motor entrega
  os itens de acordo:
  - **agrupamento**: o campo organiza a escolha do item em níveis, com ordem própria (fixa, declarada
    no modelo, ou natural);
  - **aplicabilidade**: o item só é oferecido quando o valor do campo combina com um valor informado
    pelo app que aplica; vazio vale para todos; havendo item específico e genérico com o mesmo título,
    vale o específico;
  - **escolha complementar**: ao usar o item, o fiscal escolhe um dos valores de um campo "lista de
    linhas"; o campo só é perguntado quando o item tem valores;
  - **título**: o campo que identifica o item nas listas e relatórios.

  Os valores fazem parte da versão do item. O motor não sabe o que o campo significa.
- **Comportamento atual**: na DTR, frente, item do PER, rodovia e etapas de obra são colunas fixas da
  tabela de tipos, e a navegação por frente (em ordem fixa no código) e PER, o filtro por rodovia e a
  etapa de obra estão fixos no código do registro de ocorrência. Em produção: 35 tipos de
  CONSERVAÇÃO, 31 de RECUPERAÇÃO E MANUTENÇÃO, 7 de SERVIÇOS OPERACIONAIS e 6 de MELHORIAS
  OPERACIONAIS; todos com rodovias "112/306"; 6 com etapas de obra.
- **Motivo da diferença**: constituição v2.5.0, "Independência entre apps": o motor não depende dos
  apps de câmara.
- **Objetos do catálogo**: `coluna:tipos_ocorrencia_dtr.frente`, `coluna:tipos_ocorrencia_dtr.item_contrato`,
  `coluna:tipos_ocorrencia_dtr.rodovia`, `coluna:tipos_ocorrencia_dtr.etapas_obra`,
  `indice:idx_tipos_ocorrencia_dtr_rodovia`
- **Origem**: decisão do responsável, 2026-09-30; constituição v2.5.0.

### R-checklists-015 — Modelo de catálogo montado pela câmara na tela

- **Comportamento desejado**: cada câmara tem um ou mais modelos de catálogo, cada um com: nome,
  câmara dona, modo de aplicação (R-checklists-012), campos do item (R-checklists-003), respostas e
  saídas (R-checklists-013), papéis de campo (R-checklists-014) e formato de planilha
  (R-checklists-006). O coordenador da câmara e o administrador montam e alteram o modelo numa tela
  do motor, escolhendo as peças: acrescentar, ordenar e configurar campos; definir respostas; ligar
  cada resposta às saídas, com condição e campos; dar papéis aos campos; mapear as colunas da
  planilha. A tela mostra uma prévia do formulário de item e da planilha modelo. O motor valida ao
  salvar (campos citados existem, papéis compatíveis com o tipo do campo, chave de importação feita de
  campos obrigatórios, só peças registradas pelos apps, R-checklists-019) e recusa o inválido,
  mostrando o motivo. Uma câmara tem quantos modelos quiser, lado a lado, cada um com os seus campos
  e a sua forma de resposta (ex.: na CATESA, um checklist Sim/Não e outro com Sim / Não / Não se
  aplica ou com nota); cada catálogo escolhe o seu modelo ao ser criado, e o modelo de um catálogo não
  muda depois que ele tem itens. Um modelo serve a vários catálogos da mesma câmara; modelo de uma
  câmara não é usado por outra, que copia (R-checklists-018). O app de uma câmara pode entregar o modelo inicial
  dela como configuração na implantação, e a partir daí ele é mantido na tela; o motor não importa
  código do app.
- **Comportamento atual**: não há modelo; cada lista é uma tabela e uma tela próprias.
- **Motivo da diferença**: é a peça que permite a cada câmara adaptar o motor às suas necessidades
  sem mudá-lo, e sem depender de desenvolvimento para ajustar o próprio checklist (decisão do
  responsável, 2026-09-30; constituição v2.6.0, "Apps comuns como motores genéricos").
- **Objetos do catálogo**: — (conceito novo; não há objeto no banco)
- **Origem**: decisão do responsável, 2026-09-30.

### R-checklists-016 — Nada de câmara dentro do motor

- **Comportamento desejado**: o motor não tem tabela, coluna, tela, formato de planilha, texto,
  identificador ou regra de nenhuma câmara. Suas telas (montagem de modelo, cadastro de catálogos,
  formulário de item, importação, histórico) são genéricas e, fora a montagem, geradas a partir do
  modelo. O app de uma câmara que precise de tela
  própria sobre os catálogos dela a acrescenta pelo registro de telas do core (R-core-025), no app
  dela. Um teste automatizado falha se o motor citar uma câmara, e outro prova que um modelo novo,
  montado pela tela com uma peça de um app de teste, é usado sem mudança no motor.
- **Comportamento atual**: cada câmara tem tabela, tela e regras próprias no código: tipos de unidade
  e itens da DSB, tipos de ocorrência da DTR, aba de tipos nas Definições da DTR.
- **Motivo da diferença**: constituição v2.6.0, "Apps comuns como motores genéricos" (app comum não
  contém nada de uma câmara; a câmara monta o seu uso por configuração), e v2.5.0, "Independência
  entre apps"; decisão do responsável: o motor é um "lego".
- **Objetos do catálogo**: `tabela:tipos_unidade`, `tabela:itens_checklist`, `tabela:tipos_ocorrencia_dtr`
- **Origem**: decisão do responsável, 2026-09-30; constituição v2.6.0.

### R-checklists-017 — Mudança de modelo

- **Comportamento desejado**: o modelo tem versões. Mudar o modelo (campo novo, campo retirado,
  resposta nova, saída mudada, formato de planilha) cria uma versão do modelo e vale só para versões
  de item criadas depois; cada versão de item guarda a versão do modelo em que foi criada, e as
  existentes continuam válidas e legíveis como eram. Campo novo obrigatório é exigido na próxima
  edição de cada item, não de uma vez. Mudar respostas ou saídas vale para registros novos.
- **Comportamento atual**: não há modelo; mudar um campo exige migração de banco e mudança de tela.
- **Motivo da diferença**: a câmara ajusta o seu modelo sem invalidar vistorias passadas
  (Princípio I).
- **Objetos do catálogo**: — (conceito novo)
- **Origem**: decisão do responsável, 2026-09-30.

### R-checklists-018 — Copiar o modelo de outra câmara

- **Comportamento desejado**: o coordenador de uma câmara vê a lista dos modelos de todas as câmaras
  (só a estrutura: campos, respostas, saídas, papéis e planilha; sem itens) e copia um deles para a
  sua câmara. A cópia é um modelo novo da câmara de destino, na versão 1, que registra o modelo e a
  versão de origem; depois disso, as duas seguem independentes, e nenhuma mudança numa chega à
  outra. O administrador pode copiar também os catálogos do modelo com os itens vigentes, que entram
  na câmara de destino como itens novos (versão 1, com a origem registrada), sujeitos às regras de
  serviço e câmara (R-checklists-002). Copiar entra na auditoria (R-checklists-010).
- **Comportamento atual**: não há cópia; a CATESA e a CATERS usam a mesma tabela e o mesmo
  formulário, separadas só pelo serviço dos tipos.
- **Motivo da diferença**: câmaras que trabalham de forma parecida (CATESA e CATERS) partem do mesmo
  modelo sem ficar presas uma à outra (decisão do responsável, 2026-09-30; um app por câmara,
  constituição v2.6.0). A estrutura de um modelo não tem dado de fiscalização; os itens, sim, e por
  isso só o administrador os copia entre câmaras (isolamento, A-026).
- **Objetos do catálogo**: — (conceito novo)
- **Origem**: decisão do responsável, 2026-09-30.

### R-checklists-019 — Peças registradas pelos apps

- **Comportamento desejado**: a tela de montagem oferece as peças do próprio motor (tipos de campo,
  papéis, tipos de resposta, recursos de planilha) e as que os apps instalados registram:
  - **saídas**: o que uma resposta pode gerar e quais dados cada saída recebe (a fiscalização
    registra constatação, NC, determinação e recomendação);
  - **valores de contexto**: o que o app que aplica o catálogo informa para filtrar itens pela
    aplicabilidade (o app da CATERF registra "rodovia da fiscalização");
  - **modos de aplicação**: qual app executa cada modo (a fiscalização executa "lista por unidade";
    o app da CATERF, o registro avulso de ocorrência na rodovia).

  Um modelo só usa peças registradas. Se o app que oferece uma peça usada for retirado, o modelo fica
  marcado como incompleto, os catálogos dele não são oferecidos para registros novos até o ajuste, e
  os registros já feitos continuam legíveis. Registrar peças não altera o motor.
- **Comportamento atual**: não há peças; as saídas, o filtro por rodovia e os dois fluxos estão
  fixos no código das telas.
- **Motivo da diferença**: é o que deixa a câmara montar na tela o que os apps sabem executar, sem o
  motor conhecer os apps (constituição v2.6.0).
- **Objetos do catálogo**: — (conceito novo)
- **Origem**: decisão do responsável, 2026-09-30.

## Modelos de hoje

Configuração inicial que preserva o que o sistema atual faz, carregada na implantação para cada
câmara (R-checklists-015). Não é parte do motor; a spec de cada câmara a confirma. Depois da
implantação, cada câmara a mantém na tela de montagem.

### Modelo "Checklist por tipo de unidade" (CATESA e CATERS, um modelo para cada)

- **Modo**: lista por unidade. Cada tipo de unidade é um catálogo deste modelo (33 em produção).
- **Campos do item**:

| Campo | Tipo | Regras | Papel | Hoje |
|---|---|---|---|---|
| pergunta | texto longo | obrigatório | título | `coluna:itens_checklist.pergunta` |
| constatação Sim | texto longo | — | — | `coluna:itens_checklist.texto_constatacao_sim` |
| constatação Não | texto longo | — | — | `coluna:itens_checklist.texto_constatacao_nao` |
| gera NC | sim/não | padrão sim (como a importação; hoje o formulário começa com não) | — | `coluna:itens_checklist.gera_nc` |
| dispositivo normativo | texto longo | — | — | `coluna:itens_checklist.artigo_portaria` |
| texto da NC | texto longo | — | — | `coluna:itens_checklist.texto_nc` |
| determinação | texto longo | — | — | `coluna:itens_checklist.texto_determinacao` |
| prazo (dias) | número inteiro | positivo; padrão 30 | — | `coluna:itens_checklist.prazo_dias` |
| recomendação | texto longo | — | — | `coluna:itens_checklist.texto_recomendacao` |

- **Respostas e saídas**:
  - Sim → constatação, com "constatação Sim".
  - Não → constatação, com "constatação Não"; NC, se "gera NC", descrita por "dispositivo normativo"
    (ou "artigo aplicável" se vazio); determinação com "determinação" e "prazo", se "determinação"
    preenchida; recomendação com "recomendação", se "determinação" vazia.
- **Planilha**: serviço, código do tipo, nome do tipo, ordem, pergunta, constatação Sim, constatação
  Não, dispositivo normativo, determinação, recomendação, texto da NC, prazo. Cria os catálogos que
  não existem (nome ou código, sem diferenciar maiúsculas, com os serviços da planilha). Chave: catálogo
  + ordem.

### Modelo "Ocorrências do PER" (CATERF)

- **Modo**: registro avulso. Um catálogo em produção (79 tipos).
- **Campos do item**:

| Campo | Tipo | Regras | Papel | Hoje |
|---|---|---|---|---|
| frente | lista de valores | obrigatório | agrupamento, nível 1, ordem fixa | `coluna:tipos_ocorrencia_dtr.frente` |
| item do PER | texto curto | obrigatório | agrupamento, nível 2, ordem natural | `coluna:tipos_ocorrencia_dtr.item_contrato` |
| descrição | texto longo | obrigatório | título | `coluna:tipos_ocorrencia_dtr.descricao`, `coluna:tipos_ocorrencia_dtr.nome` |
| rodovias | texto curto | vazio vale para todas | aplicabilidade (rodovia da fiscalização) | `coluna:tipos_ocorrencia_dtr.rodovia` |
| cláusula não atendida | texto longo | — | — | `coluna:tipos_ocorrencia_dtr.nao_atendimento` |
| prazo padrão (dias) | número inteiro | positivo | — | `coluna:tipos_ocorrencia_dtr.prazo_dias_padrao` |
| observação-padrão | texto longo | — | — | `coluna:tipos_ocorrencia_dtr.observacoes` |
| etapas de obra | lista de linhas | — | escolha complementar | `coluna:tipos_ocorrencia_dtr.etapas_obra` |

  "Gera NC" (`coluna:tipos_ocorrencia_dtr.gera_nc`) não vira campo: hoje é derivado da cláusula e só
  aparece como etiqueta; a lista mostra a etiqueta quando a cláusula está preenchida.
- **Respostas e saídas**: Constatação → constatação, com "descrição" e "observação-padrão"; Não
  conformidade → NC, com "cláusula não atendida", "prazo padrão" e "observação-padrão". As duas
  respostas valem para qualquer item; a cláusula e o prazo aparecem ao fiscal na escolha.
- **Planilha**: rodovia, frente, item do PER, descrição, cláusula não atendida, prazo, etapa de obra.
  Herança de células vazias em rodovia, frente, item do PER e descrição; junção de linhas com a mesma
  chave em "etapas de obra". Chave: rodovias + frente + item do PER + descrição. Arquivo modelo com as
  linhas de exemplo de hoje.

## Telas do sistema atual

Ações das telas atuais que pertencem a este módulo, no molde `formatos/spec-modulo.md` da spec 003.
No sistema novo, as telas de cadastro, formulário, importação e histórico são uma só, gerada pelo
modelo (R-checklists-016).

### Tipos de unidade (`src/pages/TiposUnidade.jsx`)

| Ação | Regra |
|---|---|
| Listar tipos com nome, código, serviços e situação | R-checklists-001 |
| Criar e editar: nome, código, serviços (lista fixa na tela, com "Drenagem") | R-checklists-001, R-checklists-002 |
| "Excluir" digitando "EXCLUIR" (desativa) | R-checklists-001, R-checklists-009 |
| Reativar | R-checklists-001 |
| "Configurar Checklist" (abre os itens do tipo) | R-checklists-004 |
| Só com rede | R-checklists-008 |

### Checklists (`src/pages/Checklists.jsx` e `src/components/admin/ItemChecklistForm.jsx`)

| Ação | Regra |
|---|---|
| Escolher o tipo (também pelo endereço, vindo de Tipos de unidade) | R-checklists-001 |
| Listar os itens atuais do tipo, em ordem | R-checklists-004 |
| Criar e editar item com os campos fixos da DSB | R-checklists-003 (campos do modelo DSB) |
| Prazo e texto da NC no formulário | R-checklists-003 (a confirmar: o responsável informa que o formulário os edita; o código deste repositório não tem os campos) |
| Editar mudando a ordem (cria item "novo" e inativa o antigo) | R-checklists-004 |
| Excluir item digitando "EXCLUIR" (grava versão inativa) | R-checklists-004, R-checklists-009 |
| Importar planilha (só com rede, grava sem prévia) | R-checklists-006 |
| Ver o histórico de versões de um item | R-checklists-004 (nova: não há tela hoje) |

### Definições da DTR, aba Tipos de ocorrência (`src/pages/DefinicoesDTR.jsx`)

| Ação | Regra |
|---|---|
| Listar os tipos com frente, item do PER, descrição, etiqueta NC, cláusula e prazo | R-checklists-003, R-checklists-014 |
| Baixar o modelo da planilha | R-checklists-006 |
| Importar planilha com prévia e confirmação | R-checklists-006 |
| "Sincronizar" (substitui a cópia do aparelho) | R-checklists-008 |
| "Limpar base" (apaga todos os tipos, com confirmação) | R-checklists-009 (retirada: revisão completa pela importação com retirada dos ausentes) |
| Editar ou criar um tipo avulso | R-checklists-003 (nova: formulário gerado pelo modelo) |
| Aba separada nas Definições da DTR | R-checklists-016 (as telas do motor servem a qualquer catálogo; a entrada nas Definições é registrada pelo R-core-025) |
| Aba KML por rodovia | fora: dtr |

### Registro de ocorrência da DTR (`src/pages/VistoriarOcorrenciaDTR.jsx`), só o que usa o catálogo

| Ação | Regra |
|---|---|
| Escolher frente, depois item do PER, depois descrição | R-checklists-014 (agrupamento); fora: dtr (o registro) |
| Tipos filtrados pela rodovia da fiscalização; específico da rodovia vence o genérico | R-checklists-014 (aplicabilidade) |
| Escolher a etapa de obra, quando o tipo tem etapas | R-checklists-014 (escolha complementar) |
| Escolher Constatação ou Não conformidade; ver a cláusula e o prazo | R-checklists-013 |
| Cópia de frente, item do PER, cláusula e prazo para a ocorrência | R-checklists-005 |
| Lista de 16 tipos fixa no código quando o aparelho não tem tipos | R-checklists-008 (retirada) |

### Outras telas que usam o catálogo

| Tela | Ação | Regra |
|---|---|---|
| Definições (`src/pages/Definicoes.jsx`) | Abas Tipos de Unidade e Checklists | R-core-025 (entradas registradas por este módulo) |
| Adicionar unidade (`src/pages/AdicionarUnidade.jsx`) | Oferecer tipos ativos por serviço em comum com a fiscalização | R-checklists-002; fora: fiscalizacao |
| Vistoriar unidade (`src/pages/VistoriarUnidade.jsx`) | Responder Sim ou Não a cada item, com a versão da criação da unidade | R-checklists-005, R-checklists-013; fora: fiscalizacao |

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Montar e alterar o modelo de catálogo da câmara, com prévia do formulário e da planilha | R-checklists-015, R-checklists-017 |
| Copiar o modelo de outra câmara; o administrador, também os catálogos com itens | R-checklists-018 |
| Ver as peças disponíveis (saídas, valores de contexto, modos) e os modelos incompletos | R-checklists-019 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das vistorias migradas mostram exatamente o texto que foi respondido na época
  (conferência de 100% das respostas migradas contra a versão ligada).
- **SC-002**: Reimportar uma planilha já importada, em qualquer formato, cria 0 versões.
- **SC-003**: Mudar a ordem de itens cria 0 itens e 0 versões novos.
- **SC-004**: Em teste com usuários de duas câmaras e um prestador, 0 catálogos ou itens de outra
  câmara são alcançados por qualquer caminho, e o prestador não alcança nenhum.
- **SC-005**: O fiscal abre o checklist de qualquer unidade e registra ocorrência com o catálogo da
  sua câmara sem rede, em 100% dos casos.
- **SC-006**: Os 33 tipos e as 768 versões da DSB e os 79 tipos da DTR chegam ao sistema novo com os
  mesmos identificadores, conferidos registro a registro, nos catálogos dos modelos de hoje.
- **SC-007**: 100% das regras de acesso deste módulo têm teste automatizado.
- **SC-008**: Um coordenador monta pela tela um modelo com respostas, campos, papéis e planilha
  próprios e o usa com 0 alterações de código e 0 mudanças nos modelos das outras câmaras.
- **SC-011**: Copiar o modelo da CATESA para a CATERS e ajustá-lo leva menos de 10 minutos, e 0
  mudanças na cópia chegam à origem.
- **SC-009**: O código do motor cita 0 câmaras, campos ou formatos de câmara (verificado por teste).
- **SC-010**: Toda ação das telas atuais do módulo tem regra ou destino em outro módulo (0 `LACUNA`).

## Assumptions

- **Modelos iniciais**: a implantação carrega o modelo "Checklist por tipo de unidade" duas vezes,
  um da CATESA e um da CATERS (hoje iguais; cada câmara ajusta o seu na tela), e o modelo
  "Ocorrências do PER" da CATERF, que fiscaliza as rodovias (decisão do responsável, 2026-09-30).
  Nenhum modelo fica no código do motor nem no app de fiscalização comum.
- **Quem monta modelos**: coordenador da câmara e administrador. O fiscal mantém os itens
  (R-checklists-007), mas não altera o modelo, porque uma mudança no modelo muda o formulário e a
  vistoria de toda a câmara.
- **Migração da DSB**: cada uma das 768 linhas vira uma versão de item de um catálogo do modelo DSB,
  com o mesmo identificador (as respostas apontam para ele). As linhas são agrupadas em itens estáveis
  pela chave atual (tipo mais ordem, ou pergunta), ordenadas por data; a vigência vai da data da
  linha até a da seguinte. Versões idênticas à anterior são mantidas, porque podem ter respostas
  ligadas, e marcadas como repetição no histórico.
- **Migração da DTR**: os 79 tipos viram itens do catálogo do modelo DTR, cada um com uma versão, com
  o mesmo identificador. As ocorrências já registradas são ligadas ao item pela frente, item do PER e
  descrição (a spec da DTR define o que fazer quando não casar); os textos copiados nelas continuam
  valendo como registro da época.
- **Serviços dos catálogos**: os valores de hoje (textos) são convertidos para os serviços do core; os
  3 tipos com água e esgoto continuam válidos (ambos da CATESA). O catálogo da DTR recebe o serviço de
  rodovias, que pertence à CATERF (R-core-014).
- **Tipos sem itens**: os 3 tipos de produção sem itens são migrados e ficam indisponíveis para
  unidade nova até terem itens.
- **DGE**: não tem catálogo hoje; o app de cada câmara da DGE registra o seu modelo quando vier.
- **Planilhas**: os formatos de hoje (DSB e DTR) são mantidos nos modelos, para a equipe não refazer
  as planilhas; a DSB ganha o arquivo modelo para baixar.
- **Prazo e texto da NC no formulário da DSB**: a divergência entre o relato do responsável e o
  código deste repositório (R-checklists-003) é conferida na tela de produção; não muda o
  comportamento desejado, porque o formulário gerado pelo modelo mostra todos os campos.
