# Feature Specification: Módulo checklists — motor de verificação comum às câmaras

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec de módulo dos checklists do sistema novo da AGEMS, segundo módulo da ordem da spec
003 (`specs/003-base-dados-producao/ordem-modulos.md`), escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes: o catálogo do banco de produção
(objetos do módulo `checklists` no `mapa-rastreabilidade.md`), os achados decididos e as
divergências classificadas da spec 003, a spec do core (004) e as telas do sistema atual. Revisão de
2026-09-30: o módulo passa a ser o motor de verificação de qualquer câmara, cobrindo os checklists da
DSB e o catálogo de ocorrências da DTR (decisão do responsável).

## Contexto

Toda fiscalização compara o que o fiscal encontra com uma lista de verificação definida pela câmara.
Hoje há duas listas, feitas de formas diferentes:

- **DSB (saneamento)**: um **checklist por tipo de unidade** (aterro sanitário, estação de
  tratamento de esgoto, gestão administrativa...). Para cada unidade vistoriada, o fiscal responde
  Sim ou Não a todas as perguntas do tipo, e cada resposta gera textos: a constatação, a não
  conformidade (NC), a determinação com prazo ou a recomendação. Produção tem 33 tipos e 768 linhas
  de itens, das quais 525 são itens vigentes e 243 versões antigas.
- **DTR (rodovias)**: um **catálogo de tipos de ocorrência** derivado do Programa de Exploração da
  Rodovia (PER) do contrato de concessão. Percorrendo a rodovia, o fiscal registra ocorrências em
  pontos (KM, sentido, fotos), escolhe o tipo no catálogo e diz se é constatação ou NC; o tipo traz
  o item do PER, a cláusula não atendida e o prazo. Produção tem 79 tipos, todos das rodovias
  "112/306".

As duas são a mesma coisa: um catálogo versionável de itens, mantido pela câmara, que a fiscalização
aplica e que gera constatações, NCs, determinações e recomendações. Este módulo é esse **motor de
verificação**, comum a todas as câmaras: DSB e DTR hoje, DGE e outras câmaras quando vierem, sem mudar
o módulo. O que é próprio de uma câmara (na DTR: frente, item do PER, rodovias, etapas de obra) é
declarado pelo app dela como campo de extensão.

A característica central é o **versionamento**: um item nunca é alterado nem apagado, porque as
vistorias já feitas precisam continuar mostrando o texto da época. Na DSB isso é feito hoje de forma
implícita (a linha mais recente de cada "chave" vale), o que gerou versões duplicadas por
reimportação da planilha; na DTR não há versionamento, e a ocorrência copia os textos do tipo. O
achado A-024 decidiu tornar o versionamento explícito; esta revisão o estende à DTR.

Fica fora desta spec: a execução da vistoria e do registro de ocorrências (unidades, pontos, fotos,
KM, respostas) e a geração dos registros a partir das respostas (módulo fiscalização, e módulo DTR
para o que é próprio da rodovia), que usam o que é definido aqui.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manter os catálogos da câmara (Priority: P1)

A equipe da câmara mantém os catálogos de verificação dela: na DSB, os tipos de unidade e o
checklist de cada um; na DTR, o catálogo de tipos de ocorrência. Cada item tem o conteúdo que a
fiscalização aplica e, quando a câmara declara, os campos próprios dela. Editar ou retirar um item
nunca muda o que vistorias passadas registraram.

**Why this priority**: sem catálogo não há vistoria; é o conteúdo que a fiscalização executa.

**Independent Test**: um responsável da CATESA cria o tipo "Estação de Tratamento de Água" com três
itens, edita o texto de um e retira outro: a lista atual mostra dois itens, o editado com o texto
novo, e o histórico mostra as versões. Um responsável da câmara da DTR edita o prazo de um tipo de
ocorrência: a lista atual mostra o prazo novo, e o histórico, o anterior.

**Acceptance Scenarios**:

1. **Given** um catálogo com itens, **When** o responsável edita o conteúdo de um item, **Then**
   passa a valer uma nova versão do item, e a versão anterior continua existindo, ligada às vistorias
   e ocorrências que a usaram.
2. **Given** um item, **When** o responsável muda só a ordem dele, **Then** o item continua o mesmo
   (não vira item novo) e os registros que o usaram continuam ligados a ele.
3. **Given** um item, **When** o responsável o retira, **Then** ele some da lista de itens atuais e
   continua existindo para os registros que o usaram.
4. **Given** um catálogo usado em alguma fiscalização, **When** alguém tenta apagá-lo, **Then** o
   sistema recusa e oferece desativar.
5. **Given** o catálogo da DTR, **When** o responsável abre um item, **Then** vê e edita também os
   campos declarados pela DTR (frente, item do PER, rodovias, etapas de obra).

---

### User Story 2 - A fiscalização usa a versão certa do catálogo (Priority: P1)

Na DSB, quando o fiscal abre uma unidade, o checklist mostrado é o que valia quando a unidade foi
criada. Na DTR, a ocorrência registrada fica ligada à versão do tipo escolhida. O resultado fica
registrado com a versão usada, e relatórios antigos continuam mostrando o texto da época.

**Why this priority**: é a garantia jurídica de que o relatório e a notificação refletem o texto em
vigor na vistoria (Princípio I).

**Independent Test**: uma unidade é criada; o item 3 do checklist é editado depois; a unidade
continua mostrando o texto antigo do item 3, e uma unidade criada depois mostra o novo. Uma
ocorrência da DTR é registrada; o prazo do tipo muda; a ocorrência e o relatório dela continuam com
o prazo da época.

**Acceptance Scenarios**:

1. **Given** uma unidade criada em 10/03 e um item editado em 15/03, **When** o fiscal abre a
   unidade, **Then** vê a versão do item vigente em 10/03.
2. **Given** uma unidade que já tem respostas, **When** o checklist muda, **Then** as respostas
   continuam ligadas às versões respondidas e nada muda no que já foi registrado.
3. **Given** uma ocorrência registrada com um tipo, **When** o tipo é editado, **Then** a ocorrência
   continua ligada à versão usada no registro.
4. **Given** o fiscal sem rede, **When** abre uma unidade ou registra uma ocorrência da sua câmara,
   **Then** o catálogo certo está disponível no aparelho.

---

### User Story 3 - Importar um catálogo de planilha (Priority: P2)

O responsável baixa o modelo de planilha do catálogo, preenche e importa. Antes de gravar, vê o que
será criado, alterado, mantido, retirado ou recusado, com o motivo de cada erro. Reimportar a mesma
planilha não cria nada novo. Os formatos de hoje continuam aceitos: a planilha de checklists da DSB e
o modelo de tipos de ocorrência da DTR.

**Why this priority**: é como os catálogos foram carregados e são revisados em lote; a reimportação
atual duplicou versões na DSB, e na DTR a revisão completa hoje passa por apagar a base inteira.

**Independent Test**: importar uma planilha da DSB com 10 itens (2 tipos novos) mostra a prévia e
grava; reimportá-la informa "nada a alterar"; alterar o texto de uma linha e reimportar cria só a
versão nova daquele item. Importar o modelo da DTR com um tipo a menos mostra esse tipo como
"ausente da planilha" e só o retira se o responsável confirmar.

**Acceptance Scenarios**:

1. **Given** uma planilha válida, **When** o responsável a envia, **Then** vê a prévia por linha
   (criar, nova versão, sem mudança, erro) antes de confirmar.
2. **Given** a mesma planilha já importada, **When** é importada de novo, **Then** nenhuma versão é
   criada.
3. **Given** uma linha sem os campos obrigatórios, **When** a planilha é importada, **Then** a linha
   aparece como erro com o motivo, e as demais seguem.
4. **Given** uma planilha com item de catálogo de outra câmara, **When** o responsável importa,
   **Then** as linhas desse catálogo são recusadas.
5. **Given** itens vigentes que não estão na planilha, **When** o responsável importa, **Then** a
   prévia os mostra como ausentes, e eles só são retirados se o responsável marcar essa opção.

---

### User Story 4 - Cada câmara vê e usa só os seus catálogos (Priority: P2)

Os catálogos pertencem à câmara dos serviços a que se aplicam; a fiscalização só oferece catálogos da
câmara e dos serviços da fiscalização.

**Why this priority**: o isolamento por câmara é requisito (A-026); hoje o separador entre os
checklists das câmaras é só o filtro por serviço, tipo sem serviço aparece para todas, e o catálogo
da DTR é alterável por qualquer usuário ativo, inclusive o prestador.

**Independent Test**: um fiscal da CATERS não vê nem altera tipos da CATESA nem o catálogo da DTR;
uma fiscalização de Abastecimento de Água só oferece tipos com esse serviço.

**Acceptance Scenarios**:

1. **Given** um fiscal da CATERS, **When** lista os catálogos, **Then** vê só os da CATERS.
2. **Given** um catálogo sem serviço aplicável, **When** alguém tenta salvá-lo, **Then** o sistema
   recusa.
3. **Given** um usuário prestador, **When** tenta ler ou alterar qualquer catálogo, **Then** é
   recusado.

---

### User Story 5 - Uma câmara nova usa o motor sem mudar o módulo (Priority: P3)

Uma câmara que ainda não fiscaliza com catálogo (ex.: da DGE) passa a usar o motor: o app dela
declara o modo de aplicação, o tipo de resposta, o que cada resposta gera e os campos próprios, e a
equipe cadastra ou importa os itens.

**Why this priority**: o sistema nasce para receber outras câmaras e áreas sem mexer no que existe
(constituição v2.5.0, "Independência entre apps").

**Independent Test**: um app de teste declara um catálogo com resposta Sim / Não / Não se aplica e
dois campos próprios; a equipe cadastra itens e uma fiscalização de teste os aplica, sem nenhuma
alteração neste módulo e sem mudança no comportamento da DSB e da DTR.

**Acceptance Scenarios**:

1. **Given** um app de câmara que declara campos próprios, **When** a equipe abre o formulário de
   item, **Then** os campos aparecem e são versionados com o item.
2. **Given** um tipo de resposta diferente dos atuais, **When** a fiscalização aplica o catálogo,
   **Then** cada resposta gera o que a declaração do catálogo diz.

---

### Edge Cases

- Dois responsáveis editam o mesmo item ao mesmo tempo: cada gravação cria uma versão; vale a mais
  recente, e as duas ficam no histórico.
- Item editado enquanto um fiscal está em campo sem rede: a vistoria em andamento continua com a
  versão da criação da unidade; a ocorrência registrada sem rede fica com a versão que o aparelho
  tinha; o aparelho recebe a versão nova na próxima sincronização.
- Catálogo desativado com fiscalização em andamento: as unidades e ocorrências já registradas
  continuam válidas; o catálogo só deixa de ser oferecido para registros novos.
- Tipo de unidade sem itens (produção tem 3): pode existir, mas não pode ser escolhido para unidade
  nova até ter pelo menos um item vigente.
- Planilha com o mesmo tipo escrito com maiúsculas diferentes ou pelo código: reconhecido como o
  mesmo tipo.
- Planilha da DTR com células mescladas (frente, PER, descrição) e uma linha por etapa de obra: as
  células vazias herdam o valor de cima e as etapas do mesmo item são juntadas, como hoje.
- Mesma descrição de ocorrência para rodovias diferentes: são itens distintos; na fiscalização de
  uma rodovia, vale o item específico dela, e o genérico (sem rodovia) só quando não houver
  específico.
- Aparelho sem catálogo baixado: o app avisa e pede sincronização; nunca usa lista fixa no código.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST manter catálogos de verificação com nome e código únicos, modo de
  aplicação, serviços aplicáveis e situação (ativo ou desativado); os tipos de unidade da DSB e o
  catálogo de ocorrências da DTR são catálogos (R-checklists-001, R-checklists-012).
- **FR-002**: Todo catálogo MUST pertencer à câmara técnica dos seus serviços (R-checklists-002).
- **FR-003**: O sistema MUST manter os itens de cada catálogo com versões explícitas, nunca alterando
  nem apagando uma versão já criada, para todas as câmaras (R-checklists-003, R-checklists-004).
- **FR-004**: Mudar a ordem de um item MUST NOT criar outro item (R-checklists-004).
- **FR-005**: O módulo MUST informar a versão de cada item vigente numa data e MUST permitir que a
  fiscalização guarde, em cada resposta e ocorrência, a versão usada (R-checklists-005).
- **FR-006**: A importação por planilha MUST oferecer o modelo para baixar, mostrar a prévia por
  linha, criar versão só quando o conteúdo mudou e ser repetível sem efeito (R-checklists-006).
- **FR-007**: Coordenador e fiscal MUST poder criar e alterar catálogos e itens só da própria câmara;
  o administrador, de todas; o prestador MUST NOT alcançá-los (R-checklists-007).
- **FR-008**: Catálogos e itens MUST estar disponíveis no aparelho para uso sem rede, no escopo da
  câmara do usuário (R-checklists-008).
- **FR-009**: Catálogo usado em fiscalização MUST NOT ser apagado; MUST poder ser desativado; não há
  operação de apagar todos os itens (R-checklists-009).
- **FR-010**: Cada versão MUST registrar quem a criou e quando; as alterações de catálogos MUST ser
  auditadas (R-checklists-010).
- **FR-011**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).
- **FR-012**: O motor MUST oferecer os modos de aplicação "lista por unidade" e "registro de
  ocorrências" (R-checklists-012).
- **FR-013**: Cada catálogo MUST declarar o tipo de resposta e o que cada resposta gera; o motor MUST
  aceitar pelo menos Sim/Não, Sim/Não/Não se aplica, Constatação/Não conformidade, escolha numa
  lista, número e texto (R-checklists-013).
- **FR-014**: O app de uma câmara MUST poder declarar campos próprios dos itens do catálogo dela,
  versionados com o item, sem alterar este módulo (R-checklists-014).
- **FR-015**: A equipe MUST poder manter os itens de qualquer catálogo tanto pelo formulário quanto
  pela planilha (R-checklists-003, R-checklists-006).

### Key Entities

- **Catálogo de verificação**: o que a câmara usa para verificar. Nome, código curto, modo de
  aplicação, serviços aplicáveis, câmara (derivada dos serviços), tipo de resposta, situação. Na DSB,
  cada tipo de unidade é um catálogo; na DTR, o catálogo de tipos de ocorrência.
- **Item**: uma pergunta (DSB) ou um tipo de ocorrência (DTR), com identidade estável ao longo das
  versões e a ordem dentro do catálogo.
- **Versão do item**: o conteúdo do item num período: o texto do item, os textos e dados que cada
  resposta gera (constatação, NC, dispositivo normativo ou cláusula não atendida, determinação,
  prazo, recomendação, observação-padrão), os valores dos campos próprios da câmara; início e fim de
  vigência e autor.
- **Tipo de resposta**: as respostas possíveis de um catálogo e o que cada uma gera.
- **Campo próprio da câmara**: campo que o app de uma câmara declara para os itens dos catálogos dela
  (nome, tipo de valor, obrigatoriedade, se agrupa a navegação, se filtra pelo contexto da
  fiscalização).
- **Importação de planilha**: o lote importado, com o formato, a prévia por linha e o resultado.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. As chaves citadas estão no catálogo
da spec 003.

### R-checklists-001 — Catálogos de verificação

- **Comportamento desejado**: o catálogo tem nome (obrigatório, único sem diferenciar maiúsculas),
  código curto (obrigatório, único sem diferenciar maiúsculas; na DSB é a base do código que a
  fiscalização gera para a unidade), modo de aplicação (R-checklists-012), serviços aplicáveis (pelo
  menos um, da lista de serviços do core) e situação (ativo ou desativado). "Excluir" na tela
  desativa; reativar é possível. Na DSB, cada tipo de unidade é um catálogo no modo "lista por
  unidade"; na DTR, o catálogo de tipos de ocorrência é um catálogo no modo "registro de ocorrências".
- **Comportamento atual**: são dois cadastros sem relação. Tipos de unidade: nome obrigatório; código
  obrigatório na tela, mas opcional e não único no banco; serviços aplicáveis como texto livre, e
  tipo sem serviço aparece para todas as câmaras; a importação acha o tipo pelo nome ou pelo código
  sem diferenciar maiúsculas; produção tem 33 tipos, todos ativos. DTR: não há cadastro de catálogo;
  a tabela de tipos de ocorrência é a lista única da diretoria, sem serviço nem câmara.
- **Motivo da diferença**: um motor comum atende qualquer câmara sem cadastro novo por diretoria
  (decisão do responsável, 2026-09-30); nome ou código repetido faz a importação escolher o tipo
  errado; serviço como texto livre diverge da lista do core; tipo sem serviço fura o isolamento por
  câmara.
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
  catálogo com serviços de câmaras diferentes é recusado. A fiscalização oferece para registro novo só
  catálogos ativos, com pelo menos um item vigente, da câmara da fiscalização e com algum serviço em
  comum com ela.
- **Comportamento atual**: não há câmara no tipo de unidade; a fiscalização filtra os tipos ativos
  por serviço em comum e mostra os sem serviço para todas. Em produção, os serviços dos tipos são
  todos da DSB (água, esgoto, resíduos, limpeza urbana), e três tipos juntam água e esgoto (ambos da
  CATESA). O catálogo da DTR não tem serviço nem câmara; é usado por toda fiscalização da DTR.
- **Motivo da diferença**: isolamento por câmara (A-026) e fim do catálogo "para todas".
- **Objetos do catálogo**: `coluna:tipos_unidade.servicos_aplicaveis`,
  `funcao:camara_from_servicos(p_servicos text[])`
- **Origem**: A-026 (decidido), A-021 (decidido).

### R-checklists-003 — Conteúdo de um item

- **Comportamento desejado**: cada versão de item tem o texto do item (obrigatório: a pergunta na
  DSB, a descrição da ocorrência na DTR), a ordem no catálogo e os textos e dados que as respostas
  geram, conforme o tipo de resposta do catálogo (R-checklists-013):
  - texto da constatação (na DSB, um para Sim e um para Não; na DTR, a descrição);
  - se gera NC, e o dispositivo normativo ou a cláusula não atendida que descreve a NC;
  - texto da NC;
  - texto da determinação e prazo em dias (inteiro positivo; na DSB, padrão 30);
  - texto da recomendação;
  - observação-padrão.

  Todos os campos são editáveis no formulário e na planilha, com os mesmos padrões.
- **Comportamento atual**:
  - DSB: em produção todos os itens geram NC e têm prazo de 30 dias; o texto da NC tem só 4 valores
    distintos e, na prática, a NC usa a descrição montada a partir do dispositivo. O formulário começa
    com "gera NC" desligado, enquanto a importação marca todo item como gerador de NC. Excluir item ou
    tipo pede confirmação em dois passos, digitando "EXCLUIR".
  - DSB, prazo e texto da NC no formulário: **a confirmar**. O responsável informa que o formulário
    permite editar os dois; o formulário deste repositório
    (`src/components/admin/ItemChecklistForm.jsx`) não tem esses campos e, na edição, mantém os
    valores anteriores sem mostrá-los. Pode ser diferença entre o código implantado e o deste
    repositório; conferir na tela de produção antes do plano. O comportamento desejado não muda.
  - DTR: não há formulário; os tipos só entram pela planilha. A cláusula não atendida, o prazo
    padrão (1, 5, 15 ou 30 dias; vazio em 32 tipos) e a observação-padrão ficam no tipo; "gera NC"
    é marcado quando a planilha traz a cláusula (51 tipos) e só aparece como etiqueta. A planilha
    modelo não tem coluna para a observação-padrão.
- **Motivo da diferença**: um só conteúdo de item para todas as câmaras; manutenção de um item só,
  sem reimportar a planilha, também na DTR.
- **Objetos do catálogo**: `coluna:itens_checklist.pergunta`, `coluna:itens_checklist.texto_constatacao_sim`,
  `coluna:itens_checklist.texto_constatacao_nao`, `coluna:itens_checklist.gera_nc`,
  `coluna:itens_checklist.artigo_portaria`, `coluna:itens_checklist.texto_nc`,
  `coluna:itens_checklist.texto_determinacao`, `coluna:itens_checklist.prazo_dias`,
  `coluna:itens_checklist.texto_recomendacao`, `coluna:tipos_ocorrencia_dtr.nome`,
  `coluna:tipos_ocorrencia_dtr.descricao`, `coluna:tipos_ocorrencia_dtr.gera_nc`,
  `coluna:tipos_ocorrencia_dtr.nao_atendimento`, `coluna:tipos_ocorrencia_dtr.prazo_dias_padrao`,
  `coluna:tipos_ocorrencia_dtr.observacoes`
- **Origem**: decisão do responsável, 2026-09-30 (motor comum; campos editáveis no formulário).

### R-checklists-004 — Versionamento explícito

- **Comportamento desejado**: em qualquer catálogo, o item tem identidade estável (o mesmo item ao
  longo do tempo) e versões numeradas. Criar um item cria a versão 1. Editar cria a versão seguinte,
  com início de vigência na data da gravação, e encerra a anterior. Retirar encerra a vigência da
  versão atual sem criar outra. A ordem do item no catálogo é um atributo do item: mudá-la não cria
  item nem versão e não mexe nos registros. Nenhuma versão é alterada nem apagada depois de criada. A
  lista de itens atuais mostra, em ordem, a versão vigente de cada item não retirado; o histórico
  mostra todas as versões com autor e data.
- **Comportamento atual**:
  - DSB: não há item estável; a "chave" é o tipo mais a ordem (ou a pergunta, sem ordem), a linha
    mais recente de cada chave vale, e `ativo = false` marca exclusão. Mudar a ordem numa edição cria
    um item "novo" e inativa o da ordem antiga. `ativo` não diz se a linha vale: as 768 linhas estão
    com `true`, sendo 243 versões antigas. São 82 chaves com 2 a 5 versões, 81 delas com a pergunta
    idêntica (reimportação).
  - DTR: sem versionamento. A importação altera o tipo no próprio registro, e a ocorrência preserva o
    texto porque copia frente, item do PER, cláusula e prazo; a data de alteração é gravada por um
    gatilho.
- **Motivo da diferença**: a regra implícita da DSB é difícil de manter, confunde "ativo" com
  "vigente" e quebra o item quando a ordem muda; na DTR, a cópia de campos preserva só parte do
  conteúdo e não diz qual versão do tipo foi usada.
- **Objetos do catálogo**: `tabela:itens_checklist`, `coluna:itens_checklist.id`,
  `coluna:itens_checklist.ordem`, `coluna:itens_checklist.ativo`, `coluna:itens_checklist.created_at`,
  `coluna:itens_checklist.tipo_unidade_id`, `restricao:itens_checklist.itens_checklist_pkey`,
  `indice:itens_checklist_pkey`, `politica:public.itens_checklist.Operadores gerenciam itens de checklist`,
  `coluna:tipos_ocorrencia_dtr.id`, `coluna:tipos_ocorrencia_dtr.ativo`,
  `coluna:tipos_ocorrencia_dtr.created_at`, `coluna:tipos_ocorrencia_dtr.updated_at`,
  `gatilho:public.tipos_ocorrencia_dtr.update_tipos_ocorrencia_dtr_updated_at`,
  `restricao:tipos_ocorrencia_dtr.tipos_ocorrencia_dtr_pkey`, `indice:tipos_ocorrencia_dtr_pkey`
- **Origem**: A-024 (decidido), estendido à DTR por decisão do responsável (2026-09-30).

### R-checklists-005 — Versão usada numa fiscalização

- **Comportamento desejado**: o módulo responde, para um catálogo e uma data, quais versões estavam
  vigentes nela, e responde uma versão pelo identificador, para relatórios e documentos antigos. No
  modo "lista por unidade", a fiscalização usa a data de criação da unidade, e a vistoria reaberta
  mostra as versões já respondidas. No modo "registro de ocorrências", a ocorrência guarda a versão
  do item escolhida no registro.
- **Comportamento atual**: na DSB, o aplicativo escolhe, para cada chave, a versão mais recente até a
  criação da unidade, dando preferência às versões já respondidas; a resposta aponta para a linha
  (versão) respondida. Na DTR, a ocorrência não aponta para o tipo; guarda cópias de campos dele.
- **Motivo da diferença**: com versões explícitas, a escolha deixa de depender da regra de chave, e a
  ocorrência da DTR passa a dizer de que tipo e versão veio; o efeito para o fiscal é o mesmo.
- **Objetos do catálogo**: `coluna:itens_checklist.id`, `coluna:itens_checklist.created_at`,
  `coluna:unidades_fiscalizadas.tipo_unidade_id`, `coluna:respostas_checklist.item_checklist_id`
- **Origem**: A-024 (decidido).

### R-checklists-006 — Importação por planilha

- **Comportamento desejado**: cada catálogo tem um formato de planilha, com um modelo para baixar. Os
  dois formatos de hoje são mantidos:
  - **DSB**: serviço, código do tipo, nome do tipo, ordem, pergunta, constatação Sim, constatação
    Não, dispositivo normativo, determinação, recomendação, texto da NC, prazo em dias. O tipo é
    identificado pelo nome ou pelo código, sem diferenciar maiúsculas, e os tipos que não existem são
    criados com os serviços da planilha; o item, pelo tipo e pela ordem.
  - **DTR**: rodovia, frente, item do PER, descrição, cláusula não atendida, prazo em dias, etapa de
    obra. Células vazias herdam o valor da linha de cima (células mescladas); linhas com a mesma
    rodovia, frente, item do PER e descrição são o mesmo item, e as etapas delas são juntadas. O item
    é identificado por essa combinação.

  Em qualquer formato, o sistema mostra a prévia por linha — item novo, nova versão (conteúdo mudou),
  sem mudança, erro com motivo — e os itens vigentes ausentes da planilha, que só são retirados se o
  responsável marcar essa opção; grava só depois da confirmação; cria versão só quando o conteúdo
  mudou, então reimportar a mesma planilha não cria nada; recusa linhas de catálogos fora da câmara
  de quem importa; funciona só com rede. O app de uma câmara nova declara o formato dela.
- **Comportamento atual**:
  - DSB: grava direto, sem prévia; cria uma versão nova para toda linha, mesmo igual à vigente (origem
    das 81 chaves duplicadas); marca todo item como gerador de NC; ignora linhas sem pergunta ou
    tipo; importa só com rede; não há modelo para baixar.
  - DTR: há modelo para baixar e prévia com confirmação; altera no próprio registro o tipo que casa
    com a chave, ou insere; marca "gera NC" quando a linha traz a cláusula; conta inseridos,
    atualizados e sem alteração. Tipos ausentes da planilha continuam; para tirá-los, o caminho é
    "Limpar base" e reimportar.
- **Motivo da diferença**: reimportar duplicava o checklist da DSB; sem prévia, um erro na planilha só
  aparecia depois de gravado; apagar a base da DTR para reimportar perde o vínculo das ocorrências
  (R-checklists-009).
- **Objetos do catálogo**: `tabela:itens_checklist`, `tabela:tipos_unidade`, `tabela:tipos_ocorrencia_dtr`
- **Origem**: A-024 (decidido).

### R-checklists-007 — Quem mantém os catálogos

- **Comportamento desejado**: coordenador e fiscal da câmara criam e alteram catálogos e itens, só da
  própria câmara; o administrador, de todas (decisão do responsável, 2026-09-30); o diretor lê os da
  sua diretoria; o prestador não acessa os catálogos (vê só os textos que chegam a ele nos documentos
  da fiscalização).
- **Comportamento atual**: na DSB, administrador, coordenador e fiscal ativos criam, alteram e
  excluem tipos e itens de qualquer câmara, e qualquer usuário ativo, inclusive o prestador, lê
  todos. Na DTR, qualquer usuário com perfil ativo, de qualquer papel, inclusive o prestador, lê,
  cria, altera e apaga tipos, inclusive pelo "Limpar base" (a regra chama-se "Escrita admin", mas não
  verifica o papel).
- **Motivo da diferença**: isolamento por câmara (A-026); o prestador não precisa do cadastro e não
  pode alterar o que é usado para fiscalizá-lo.
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

- **Comportamento desejado**: o aplicativo baixa os catálogos da câmara do usuário e as versões dos
  itens deles (as vigentes e as que registros do seu alcance já usam) e recebe só o que mudou nas
  sincronizações seguintes, pelo protocolo do core (R-core-021); o usuário pode pedir a atualização a
  qualquer momento. Sem catálogo no aparelho, o app avisa e pede sincronização. A manutenção de
  catálogos não é feita offline.
- **Comportamento atual**: na DSB, o aplicativo baixa todos os tipos e todas as linhas de itens, de
  todas as câmaras, inclusive as versões antigas. Na DTR, baixa todos os tipos, e o botão
  "Sincronizar" das Definições da DTR substitui a cópia do aparelho; se o aparelho não tem tipos, o
  registro de ocorrência usa uma lista de 16 tipos fixa no código.
- **Motivo da diferença**: escopo por câmara (A-026), menos dados no aparelho, e a lista fixa no
  código diverge do catálogo mantido pela câmara.
- **Objetos do catálogo**: `tabela:tipos_unidade`, `tabela:itens_checklist`, `tabela:tipos_ocorrencia_dtr`
- **Origem**: A-026 (decidido).

### R-checklists-009 — Catálogos e itens não são apagados

- **Comportamento desejado**: catálogo não é apagado; só desativado. Catálogo desativado não é
  oferecido para registro novo, e os registros existentes continuam com ele. Versões de item nunca
  são apagadas (R-checklists-004). Não há operação de apagar todos os itens de um catálogo; a revisão
  completa é feita pela importação, que retira os itens ausentes quando o responsável marca
  (R-checklists-006).
- **Comportamento atual**: na DSB, a tela só desativa, mas a regra de acesso permite apagar tipos e
  itens, e apagar um tipo apagaria todos os itens dele em cascata. Na DTR, "Limpar base" apaga todos
  os tipos, depois de uma confirmação ("Apagar todos os N tipos?").
- **Motivo da diferença**: apagar perderia o texto das vistorias e o vínculo das ocorrências
  (Princípio I).
- **Objetos do catálogo**: `restricao:itens_checklist.itens_checklist_tipo_unidade_id_fkey`,
  `politica:public.tipos_unidade.Operadores gerenciam tipos de unidade`,
  `politica:public.tipos_ocorrencia_dtr.Escrita admin tipos_ocorrencia_dtr`
- **Origem**: —

### R-checklists-010 — Autoria das versões e auditoria

- **Comportamento desejado**: cada versão registra quem a criou e quando (é o próprio histórico do
  item). Criação, alteração e desativação de catálogos e cada importação entram na auditoria do core
  (R-core-022).
- **Comportamento atual**: as versões não registram autor; os campos de autoria herdados do app de
  origem estão vazios em todas as linhas; catálogos não são auditados (nem os da DSB, nem o da DTR).
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

- **Comportamento desejado**: cada catálogo tem um modo de aplicação, que diz à fiscalização como
  usá-lo:
  - **lista por unidade** (DSB): a fiscalização cria unidades de um tipo, e cada unidade recebe todos
    os itens vigentes do catálogo, na ordem, para o fiscal responder um a um;
  - **registro de ocorrências** (DTR): a fiscalização registra ocorrências avulsas, e em cada uma o
    fiscal escolhe um item do catálogo e a resposta.

  O motor não conhece unidade, ponto, KM nem foto; ele fornece os itens e a versão, e a fiscalização
  (e o app da câmara, para o que é próprio dela) faz o registro.
- **Comportamento atual**: os dois modos existem em telas e tabelas separadas: checklist por tipo de
  unidade na vistoria da DSB e catálogo de tipos no registro de ocorrência da DTR; a ocorrência da DTR
  é gravada como unidade sem tipo.
- **Motivo da diferença**: um motor comum com dois modos atende as duas diretorias e as câmaras que
  vierem sem cadastros paralelos (decisão do responsável, 2026-09-30).
- **Objetos do catálogo**: `tabela:tipos_unidade`, `tabela:tipos_ocorrencia_dtr`,
  `coluna:unidades_fiscalizadas.tipo_unidade_id`, `coluna:unidades_fiscalizadas.tipo_ocorrencia`
- **Origem**: decisão do responsável, 2026-09-30.

### R-checklists-013 — Tipos de resposta e o que cada resposta gera

- **Comportamento desejado**: cada catálogo declara as respostas possíveis e o que cada uma gera,
  usando os textos do item (R-checklists-003). O motor aceita Sim/Não, Sim/Não/Não se aplica,
  Constatação/Não conformidade, escolha numa lista, número e texto. Os dois catálogos de hoje ficam
  assim:
  - **DSB (Sim/Não)**: Sim registra a constatação do Sim; Não registra a constatação do Não e, se o
    item gera NC, uma NC descrita pelo dispositivo normativo (ou "artigo aplicável" se vazio); com
    texto de determinação, gera a determinação com o prazo do item; sem ele, gera a recomendação.
  - **DTR (Constatação/Não conformidade)**: o fiscal escolhe; Constatação registra a descrição do
    item; Não conformidade registra a NC com a cláusula não atendida e o prazo padrão do item, que
    aparecem ao fiscal no momento da escolha. As duas respostas valem para qualquer item.

  A fiscalização aplica a declaração ao gerar os registros; mudar a declaração de um catálogo vale
  para registros novos.
- **Comportamento atual**: as duas regras estão fixas no código de telas diferentes. Na DSB, as
  respostas gravadas são `SIM` e `NAO` (o servidor aceita também `NÃO`). Na DTR, a ocorrência grava
  `constatacao` ou `nc`, e a cláusula e o prazo só são copiados quando é NC; "gera NC" do tipo não é
  consultado no registro.
- **Motivo da diferença**: câmaras novas terão outras respostas (ex.: "Não se aplica"); com as regras
  fixas no código, cada câmara exigiria mudar o motor.
- **Objetos do catálogo**: `coluna:respostas_checklist.resposta`,
  `coluna:unidades_fiscalizadas.tipo_ocorrencia`, `coluna:itens_checklist.gera_nc`,
  `coluna:tipos_ocorrencia_dtr.gera_nc`
- **Origem**: decisão do responsável, 2026-09-30.

### R-checklists-014 — Campos próprios da câmara

- **Comportamento desejado**: o app de uma câmara declara campos próprios para os itens dos catálogos
  dela: nome, tipo de valor (texto, lista de valores, lista de linhas), obrigatoriedade e papel na
  aplicação:
  - **agrupamento**: o campo organiza a escolha do item em níveis, com ordem própria (DTR: frente,
    em ordem fixa, e depois item do PER);
  - **aplicabilidade**: o item só é oferecido quando o valor combina com o contexto da fiscalização,
    e vazio vale para todos (DTR: rodovias do item × rodovia da fiscalização; havendo item específico
    da rodovia e genérico com a mesma descrição, vale o específico);
  - **escolha complementar**: o fiscal escolhe um dos valores ao usar o item (DTR: etapa de obra,
    oferecida só quando o item tem etapas).

  Os valores dos campos próprios fazem parte da versão do item, aparecem no formulário e na planilha
  e são versionados com ele. O módulo guarda e entrega os valores; o significado deles é do app da
  câmara. Declarar ou mudar campos de uma câmara não altera este módulo nem os catálogos das outras.
- **Comportamento atual**: os campos da DTR são colunas fixas da tabela de tipos (frente, item do
  PER, rodovia, etapas de obra); a navegação por frente e PER, o filtro por rodovia e a etapa de obra
  estão fixos no código do registro de ocorrência. Em produção, 35 tipos são de CONSERVAÇÃO, 31 de
  RECUPERAÇÃO E MANUTENÇÃO, 7 de SERVIÇOS OPERACIONAIS e 6 de MELHORIAS OPERACIONAIS; todos com
  rodovias "112/306"; 6 têm etapas de obra.
- **Motivo da diferença**: constituição v2.5.0, "Independência entre apps": o motor comum não pode
  depender dos apps de câmara, e mudar a DTR não pode exigir mudar o motor.
- **Objetos do catálogo**: `coluna:tipos_ocorrencia_dtr.frente`, `coluna:tipos_ocorrencia_dtr.item_contrato`,
  `coluna:tipos_ocorrencia_dtr.rodovia`, `coluna:tipos_ocorrencia_dtr.etapas_obra`,
  `indice:idx_tipos_ocorrencia_dtr_rodovia`
- **Origem**: decisão do responsável, 2026-09-30; constituição v2.5.0.

## Telas do sistema atual

Ações das telas atuais que pertencem a este módulo, no molde `formatos/spec-modulo.md` da spec 003.
Fonte: `src/pages/` e `src/components/admin/` do sistema atual.

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
| Criar e editar item: ordem, pergunta, constatação Sim e Não, "gera NC" (desligado ao criar) e, com NC, dispositivo normativo, determinação e recomendação | R-checklists-003 |
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
| Editar ou criar um tipo avulso | R-checklists-003 (nova: não há formulário hoje) |
| Aba KML por rodovia | fora: dtr |

### Registro de ocorrência da DTR (`src/pages/VistoriarOcorrenciaDTR.jsx`), só o que usa o catálogo

| Ação | Regra |
|---|---|
| Escolher frente, depois item do PER, depois descrição | R-checklists-014; fora: dtr (o registro) |
| Tipos filtrados pela rodovia da fiscalização; específico da rodovia vence o genérico | R-checklists-014 |
| Escolher a etapa de obra, quando o tipo tem etapas | R-checklists-014 |
| Escolher Constatação ou Não conformidade; ver a cláusula e o prazo | R-checklists-013 |
| Cópia de frente, item do PER, cláusula e prazo para a ocorrência | R-checklists-005 |
| Lista de 16 tipos fixa no código quando o aparelho não tem tipos | R-checklists-008 (retirada) |

### Outras telas que usam o catálogo

| Tela | Ação | Regra |
|---|---|---|
| Definições (`src/pages/Definicoes.jsx`) | Abas Tipos de Unidade e Checklists | R-core-025 (entradas registradas por este módulo) |
| Adicionar unidade (`src/pages/AdicionarUnidade.jsx`) | Oferecer tipos ativos por serviço em comum com a fiscalização | R-checklists-002; fora: fiscalizacao |
| Vistoriar unidade (`src/pages/VistoriarUnidade.jsx`) | Responder Sim ou Não a cada item, com a versão da criação da unidade | R-checklists-005, R-checklists-013; fora: fiscalizacao |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das vistorias migradas mostram exatamente o texto do checklist que foi respondido
  na época (conferência de 100% das respostas migradas contra a versão ligada).
- **SC-002**: Reimportar uma planilha já importada, em qualquer formato, cria 0 versões.
- **SC-003**: Mudar a ordem de itens cria 0 itens e 0 versões novos.
- **SC-004**: Em teste com usuários de duas câmaras e um prestador, 0 catálogos ou itens de outra
  câmara são alcançados por qualquer caminho, e o prestador não alcança nenhum.
- **SC-005**: O fiscal abre o checklist de qualquer unidade e registra ocorrência com o catálogo da
  sua câmara sem rede, em 100% dos casos.
- **SC-006**: Os 33 tipos e as 768 versões da DSB e os 79 tipos da DTR chegam ao sistema novo com os
  mesmos identificadores, conferidos registro a registro, e agrupados nos itens estáveis a que
  pertencem.
- **SC-007**: 100% das regras de acesso deste módulo têm teste automatizado.
- **SC-008**: Um catálogo de teste com tipo de resposta e campos próprios novos funciona com 0
  alterações neste módulo e 0 mudanças no comportamento da DSB e da DTR.
- **SC-009**: Toda ação das telas atuais do módulo tem regra ou destino em outro módulo (0 `LACUNA`).

## Assumptions

- **Migração das versões da DSB**: cada uma das 768 linhas vira uma versão, com o mesmo
  identificador (as respostas das vistorias apontam para ele). As linhas são agrupadas em itens
  estáveis pela chave atual (tipo mais ordem, ou pergunta), ordenadas por data; a vigência de cada
  versão vai da data dela até a da seguinte. Versões idênticas à anterior (reimportação) são
  mantidas, porque podem ter respostas ligadas, e marcadas como repetição no histórico.
- **Migração da DTR**: os 79 tipos viram os itens do catálogo de ocorrências da DTR, cada um com uma
  versão, com o mesmo identificador e vigência desde a data de importação. As ocorrências já
  registradas são ligadas ao item pela frente, item do PER e descrição (a spec da DTR define o que
  fazer quando não casar); os textos copiados nelas continuam valendo como registro da época.
- **Serviços dos catálogos**: os valores de hoje (textos) são convertidos para os serviços do core;
  "Abastecimento de Água" e "Esgotamento Sanitário" juntos são ambos da CATESA, então os 3 tipos com
  os dois continuam válidos. O catálogo da DTR recebe o serviço de rodovias, e a câmara dele é a que o
  responsável definir para esse serviço na carga da referência (R-core-014).
- **Um catálogo de ocorrências por câmara**: a DTR tem hoje um catálogo; concessões diferentes se
  distinguem pelas rodovias dos itens (R-checklists-014). Se a DTR precisar de um catálogo por
  contrato, é um catálogo a mais, sem mudar o motor.
- **Tipos sem itens**: os 3 tipos de produção sem itens são migrados e ficam indisponíveis para
  unidade nova até terem itens.
- **DGE**: não tem catálogo hoje; o motor a atende quando o app dela declarar os catálogos
  (User Story 5).
- **Planilhas**: os formatos de colunas de hoje (DSB e DTR) são mantidos para a equipe não refazer as
  planilhas; a DSB ganha o modelo para baixar.
- **Prazo e texto da NC no formulário da DSB**: a divergência entre o relato do responsável e o
  código deste repositório (R-checklists-003) é conferida na tela de produção antes do plano; não
  muda o comportamento desejado.
