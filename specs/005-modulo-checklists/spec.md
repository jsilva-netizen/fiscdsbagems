# Feature Specification: Módulo checklists — tipos de unidade e itens versionados

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec de módulo dos checklists do sistema novo da AGEMS, segundo módulo da ordem da spec
003 (`specs/003-base-dados-producao/ordem-modulos.md`), escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes: o catálogo do banco de produção
(objetos do módulo `checklists` no `mapa-rastreabilidade.md`), os achados decididos e as
divergências classificadas da spec 003, e a spec do core (004).

## Contexto

O checklist é o motor comum da fiscalização: para cada tipo de unidade (aterro sanitário, estação
de tratamento de esgoto, gestão administrativa...), uma lista de perguntas de resposta Sim ou Não,
com os textos que a vistoria gera conforme a resposta: a constatação, a não conformidade (NC), a
determinação com prazo ou a recomendação. Produção tem 33 tipos de unidade e 768 linhas de itens,
das quais 525 são itens vigentes e 243 versões antigas.

A característica central é o **versionamento**: um item nunca é alterado nem apagado, porque as
vistorias já feitas precisam continuar mostrando o texto da época. No sistema atual isso é feito de
forma implícita (a linha mais recente de cada "chave" vale), o que gerou versões duplicadas por
reimportação da planilha e uma regra difícil de manter. O achado A-024 decidiu tornar o
versionamento explícito.

Fica fora desta spec: as respostas da vistoria e a geração de NCs, determinações e recomendações a
partir delas (módulo fiscalização, que usa o que é definido aqui) e as ocorrências da DTR (módulo
DTR, que não usa checklist).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manter o checklist de um tipo de unidade (Priority: P1)

A equipe responsável cadastra os tipos de unidade da sua câmara e, para cada tipo, os itens do
checklist, com a pergunta, os textos gerados pela resposta, o dispositivo normativo e o prazo da
determinação. Editar ou excluir um item nunca muda o que vistorias passadas registraram.

**Why this priority**: sem checklist não há vistoria; é o conteúdo que a fiscalização executa.

**Independent Test**: um responsável da CATESA cria o tipo "Estação de Tratamento de Água" com três
itens; edita o texto de um item; exclui outro. A lista de itens atuais mostra dois itens, o editado
com o texto novo; o histórico do tipo mostra as três versões do item editado e o excluído.

**Acceptance Scenarios**:

1. **Given** um tipo com itens, **When** o responsável edita o texto de um item, **Then** passa a
   valer uma nova versão do item, e a versão anterior continua existindo, ligada às vistorias que a
   responderam.
2. **Given** um item, **When** o responsável muda só a ordem dele, **Then** o item continua o mesmo
   (não vira item novo) e as vistorias que o responderam continuam ligadas a ele.
3. **Given** um item, **When** o responsável o exclui, **Then** ele some da lista de itens atuais e
   continua existindo para as vistorias que o responderam.
4. **Given** um tipo com unidades vistoriadas, **When** alguém tenta apagá-lo, **Then** o sistema
   recusa e oferece desativar.

---

### User Story 2 - A vistoria usa o texto certo do checklist (Priority: P1)

Quando o fiscal abre uma unidade, o checklist mostrado é o que valia quando a unidade foi criada,
mesmo que o checklist tenha mudado depois. O resultado fica registrado com a versão respondida.

**Why this priority**: é a garantia jurídica de que o relatório e a notificação refletem o texto em
vigor na vistoria (Princípio I).

**Independent Test**: uma unidade é criada; o item 3 do checklist é editado depois; a unidade
continua mostrando o texto antigo do item 3; uma unidade criada depois da edição mostra o texto
novo.

**Acceptance Scenarios**:

1. **Given** uma unidade criada em 10/03 e um item editado em 15/03, **When** o fiscal abre a
   unidade, **Then** vê a versão do item vigente em 10/03.
2. **Given** uma unidade que já tem respostas, **When** o checklist muda, **Then** as respostas
   continuam ligadas às versões respondidas e nada muda no que já foi registrado.
3. **Given** o fiscal sem rede, **When** abre uma unidade de um tipo da sua câmara, **Then** o
   checklist certo está disponível no aparelho.

---

### User Story 3 - Importar o checklist de uma planilha (Priority: P2)

O responsável importa tipos e itens de uma planilha Excel, no formato usado hoje. Antes de gravar,
vê o que será criado, alterado ou ignorado e os erros de cada linha. Reimportar a mesma planilha não
cria nada novo.

**Why this priority**: é como os checklists foram carregados e são revisados em lote; a
reimportação atual duplicou versões.

**Independent Test**: importar uma planilha com 10 itens (2 tipos novos) mostra a prévia e grava;
reimportar a mesma planilha informa "nada a alterar"; alterar o texto de uma linha e reimportar
cria só a versão nova daquele item.

**Acceptance Scenarios**:

1. **Given** uma planilha válida, **When** o responsável a envia, **Then** vê a prévia por linha
   (criar, nova versão, sem mudança, erro) antes de confirmar.
2. **Given** a mesma planilha já importada, **When** é importada de novo, **Then** nenhuma versão é
   criada.
3. **Given** uma linha sem pergunta ou sem tipo, **When** a planilha é importada, **Then** a linha
   aparece como erro com o motivo, e as demais seguem.
4. **Given** uma planilha com um tipo de outra câmara, **When** o responsável importa, **Then** as
   linhas desse tipo são recusadas.

---

### User Story 4 - Cada câmara vê e usa só os seus checklists (Priority: P2)

Os tipos de unidade pertencem à câmara dos serviços a que se aplicam; ao criar uma unidade, a
fiscalização só oferece tipos da câmara e dos serviços da fiscalização.

**Why this priority**: o isolamento por câmara é requisito (A-026); hoje o separador entre os
checklists das câmaras é só o filtro por serviço, e tipo sem serviço aparece para todas.

**Independent Test**: um fiscal da CATERS não vê nem altera tipos da CATESA; uma fiscalização de
Abastecimento de Água só oferece tipos com esse serviço.

**Acceptance Scenarios**:

1. **Given** um fiscal da CATERS, **When** lista os tipos de unidade, **Then** vê só os da CATERS.
2. **Given** um tipo sem serviço aplicável, **When** alguém tenta salvá-lo, **Then** o sistema recusa.

---

### Edge Cases

- Dois responsáveis editam o mesmo item ao mesmo tempo: cada gravação cria uma versão; vale a mais
  recente, e as duas ficam no histórico.
- Item editado enquanto um fiscal está em campo sem rede: a vistoria em andamento continua com a
  versão da criação da unidade; o aparelho recebe a versão nova na próxima sincronização, só para
  unidades novas.
- Tipo desativado com fiscalização em andamento: as unidades já criadas desse tipo continuam
  vistoriáveis; o tipo só deixa de ser oferecido para unidades novas.
- Tipo sem itens (produção tem 3): pode existir, mas não pode ser escolhido para unidade nova até ter
  pelo menos um item vigente.
- Planilha com o mesmo tipo escrito com maiúsculas diferentes ou pelo código: reconhecido como o
  mesmo tipo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST manter tipos de unidade com nome e código únicos, serviços aplicáveis e
  situação (ativo ou desativado) (R-checklists-001, R-checklists-002).
- **FR-002**: Todo tipo de unidade MUST pertencer à câmara técnica dos seus serviços
  (R-checklists-002).
- **FR-003**: O sistema MUST manter os itens do checklist de cada tipo com versões explícitas, nunca
  alterando nem apagando uma versão já criada (R-checklists-003, R-checklists-004).
- **FR-004**: Mudar a ordem de um item MUST NOT criar outro item (R-checklists-004).
- **FR-005**: Para uma unidade, o sistema MUST oferecer, de cada item, a versão vigente na data de
  criação da unidade, e MUST manter cada resposta ligada à versão respondida (R-checklists-005).
- **FR-006**: A importação por planilha MUST mostrar a prévia por linha, criar versão só quando o
  conteúdo mudou e ser repetível sem efeito (R-checklists-006).
- **FR-007**: Coordenador e fiscal MUST poder criar e alterar tipos e itens só da própria câmara; o
  administrador, de todas (R-checklists-007).
- **FR-008**: Tipos e itens MUST estar disponíveis no aparelho para vistoria sem rede, no escopo da
  câmara do usuário (R-checklists-008).
- **FR-009**: Tipo com itens ou unidades MUST NOT ser apagado; MUST poder ser desativado
  (R-checklists-009).
- **FR-010**: Cada versão MUST registrar quem a criou e quando; as alterações de tipos MUST ser
  auditadas (R-checklists-010).
- **FR-011**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Tipo de unidade**: o que a fiscalização vistoria (aterro, estação de tratamento...). Nome, código
  curto, serviços aplicáveis, câmara (derivada dos serviços), situação.
- **Item do checklist**: uma pergunta de um tipo, com identidade estável ao longo das versões e a
  ordem dentro do checklist.
- **Versão do item**: o conteúdo do item num período: pergunta, texto da constatação para Sim e para
  Não, se gera NC, dispositivo normativo, texto da NC, texto da determinação, prazo da determinação
  em dias, texto da recomendação; início de vigência, fim de vigência (quando substituída ou
  excluída) e autor.
- **Importação de planilha**: o lote importado, com a prévia por linha e o resultado.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. As chaves citadas estão no catálogo
da spec 003.

### R-checklists-001 — Tipos de unidade

- **Comportamento desejado**: o tipo de unidade tem nome (obrigatório, único sem diferenciar
  maiúsculas), código curto (obrigatório, único sem diferenciar maiúsculas; é a base do código que a
  fiscalização gera para a unidade), serviços aplicáveis (pelo menos um, da lista de serviços do
  core) e situação (ativo ou desativado). "Excluir" na tela desativa; reativar é possível.
- **Comportamento atual**: nome obrigatório; código opcional e não único; serviços aplicáveis como
  texto livre, e tipo sem serviço aparece para todas as câmaras; a importação acha o tipo pelo nome
  ou pelo código sem diferenciar maiúsculas. Produção tem 33 tipos, todos ativos.
- **Motivo da diferença**: nome ou código repetido faz a importação escolher o tipo errado; serviço
  como texto livre diverge da lista do core; tipo sem serviço fura o isolamento por câmara.
- **Objetos do catálogo**: `tabela:tipos_unidade`, `coluna:tipos_unidade.nome`,
  `coluna:tipos_unidade.codigo`, `coluna:tipos_unidade.servicos_aplicaveis`,
  `coluna:tipos_unidade.ativo`, `coluna:tipos_unidade.created_at`, `coluna:tipos_unidade.id`
- **Origem**: A-026 (decidido); divergência `coluna:tipos_unidade.codigo` (comentário só em produção,
  producao_vale).

### R-checklists-002 — O tipo pertence à câmara dos seus serviços

- **Comportamento desejado**: a câmara de um tipo é a câmara dos serviços aplicáveis dele, pelo
  vínculo serviço → câmara do core (R-core-014). Todos os serviços de um tipo são da mesma câmara;
  tipo com serviços de câmaras diferentes é recusado. A fiscalização oferece para unidade nova só
  tipos ativos, com pelo menos um item vigente, da câmara da fiscalização e com algum serviço em
  comum com ela.
- **Comportamento atual**: não há câmara no tipo; a fiscalização filtra os tipos ativos por serviço
  em comum e mostra os sem serviço para todas. Em produção, os serviços dos tipos são todos da DSB
  (água, esgoto, resíduos, limpeza urbana), e três tipos juntam água e esgoto (ambos da CATESA).
- **Motivo da diferença**: isolamento por câmara (A-026) e fim do tipo "para todas".
- **Objetos do catálogo**: `coluna:tipos_unidade.servicos_aplicaveis`,
  `funcao:camara_from_servicos(p_servicos text[])`
- **Origem**: A-026 (decidido), A-021 (decidido).

### R-checklists-003 — Conteúdo de um item

- **Comportamento desejado**: cada versão de item tem: pergunta (obrigatória), texto da constatação
  para Sim e para Não, se a resposta Não gera NC, dispositivo normativo descumprido, texto da NC,
  texto da determinação, prazo da determinação em dias (inteiro positivo, padrão 30) e texto da
  recomendação. O significado, que a fiscalização aplica ao gerar os registros da vistoria, é:
  - resposta Sim: registra a constatação do Sim;
  - resposta Não: registra a constatação do Não e, se gera NC, uma NC descrita pelo dispositivo
    normativo (ou "artigo aplicável" se vazio); com texto de determinação, gera a determinação com o
    prazo do item; sem ele, gera a recomendação.
- **Comportamento atual**: igual ao desejado. Em produção todos os itens geram NC e têm prazo de 30
  dias; o texto da NC tem só 4 valores distintos e, na prática, a NC usa a descrição montada a partir
  do dispositivo. O formulário de item não oferece o prazo nem o texto da NC (só a importação os
  preenche) e começa com "gera NC" desligado, enquanto a importação marca todo item como gerador de
  NC. Excluir item ou tipo pede confirmação em dois passos, digitando "EXCLUIR".
- **Motivo da diferença**: todos os campos do item passam a ser editáveis no formulário, com o
  mesmo padrão da importação; a confirmação em dois passos é mantida.
- **Objetos do catálogo**: `coluna:itens_checklist.pergunta`, `coluna:itens_checklist.texto_constatacao_sim`,
  `coluna:itens_checklist.texto_constatacao_nao`, `coluna:itens_checklist.gera_nc`,
  `coluna:itens_checklist.artigo_portaria`, `coluna:itens_checklist.texto_nc`,
  `coluna:itens_checklist.texto_determinacao`, `coluna:itens_checklist.prazo_dias`,
  `coluna:itens_checklist.texto_recomendacao`
- **Origem**: —

### R-checklists-004 — Versionamento explícito

- **Comportamento desejado**: o item tem identidade estável (o mesmo item ao longo do tempo) e
  versões numeradas. Criar um item cria a versão 1. Editar cria a versão seguinte, com início de
  vigência na data da gravação, e encerra a anterior. Excluir encerra a vigência da versão atual sem
  criar outra. A ordem do item no checklist é um atributo do item: mudá-la não cria item nem versão
  e não mexe nas vistorias. Nenhuma versão é alterada nem apagada depois de criada. A lista de itens
  atuais de um tipo mostra, em ordem, a versão vigente de cada item não excluído; o histórico mostra
  todas as versões com autor e data.
- **Comportamento atual**: não há item estável; a "chave" é o tipo mais a ordem (ou a pergunta, sem
  ordem), a linha mais recente de cada chave vale, e `ativo = false` marca exclusão. Mudar a ordem
  numa edição cria um item "novo" e inativa o da ordem antiga. `ativo` não diz se a linha vale: as
  768 linhas estão com `true`, sendo 243 versões antigas. São 82 chaves com 2 a 5 versões, 81 delas
  com a pergunta idêntica (reimportação).
- **Motivo da diferença**: a regra implícita é difícil de manter, confunde "ativo" com "vigente" e
  quebra o item quando a ordem muda.
- **Objetos do catálogo**: `tabela:itens_checklist`, `coluna:itens_checklist.id`,
  `coluna:itens_checklist.ordem`, `coluna:itens_checklist.ativo`, `coluna:itens_checklist.created_at`,
  `coluna:itens_checklist.tipo_unidade_id`,
  `politica:public.itens_checklist.Operadores gerenciam itens de checklist`
- **Origem**: A-024 (decidido).

### R-checklists-005 — Versão usada numa vistoria

- **Comportamento desejado**: o módulo responde, para um tipo e uma data, quais versões estavam
  vigentes nela; a fiscalização usa a data de criação da unidade. A resposta da vistoria guarda a
  versão respondida, e a vistoria reaberta mostra as versões já respondidas. O módulo também responde
  uma versão pelo identificador, para relatórios e documentos antigos.
- **Comportamento atual**: o aplicativo escolhe, para cada chave, a versão mais recente até a
  criação da unidade, dando preferência às versões já respondidas; a resposta aponta para a linha
  (versão) respondida.
- **Motivo da diferença**: com versões explícitas, a escolha deixa de depender da regra de chave; o
  efeito para o fiscal é o mesmo.
- **Objetos do catálogo**: `coluna:itens_checklist.id`, `coluna:itens_checklist.created_at`
- **Origem**: A-024 (decidido).

### R-checklists-006 — Importação por planilha

- **Comportamento desejado**: o responsável envia uma planilha Excel com as colunas de hoje (serviço,
  código do tipo, nome do tipo, ordem, pergunta, constatação Sim, constatação Não, dispositivo
  normativo, determinação, recomendação, texto da NC, prazo em dias). O sistema:
  - identifica o tipo pelo nome ou pelo código, sem diferenciar maiúsculas, e cria os tipos que não
    existem, com os serviços da planilha;
  - identifica o item pelo tipo e pela ordem;
  - mostra a prévia por linha — item novo, nova versão (conteúdo mudou), sem mudança, erro com
    motivo — e só grava depois da confirmação;
  - cria versão só quando o conteúdo mudou, então reimportar a mesma planilha não cria nada;
  - recusa linhas de tipos fora da câmara de quem importa;
  - funciona só com rede.
- **Comportamento atual**: grava direto, sem prévia; cria uma versão nova para toda linha, mesmo
  igual à vigente (origem das 81 chaves duplicadas); marca todo item como gerador de NC; ignora
  linhas sem pergunta ou tipo; importa só com rede.
- **Motivo da diferença**: reimportar duplicava o checklist inteiro; sem prévia, um erro na planilha
  só aparecia depois de gravado.
- **Objetos do catálogo**: `tabela:itens_checklist`, `tabela:tipos_unidade`
- **Origem**: A-024 (decidido).

### R-checklists-007 — Quem mantém os checklists

- **Comportamento desejado**: coordenador e fiscal da câmara criam e alteram tipos e itens de
  checklist, só da própria câmara; o administrador, de todas (decisão do responsável, 2026-09-30); o diretor lê os da sua diretoria; o
  prestador não acessa o cadastro de checklists (vê só os textos que chegam a ele nos documentos da
  fiscalização).
- **Comportamento atual**: administrador, coordenador e fiscal ativos criam, alteram e excluem tipos
  e itens de qualquer câmara; qualquer usuário ativo, inclusive o prestador, lê todos.
- **Motivo da diferença**: isolamento por câmara (A-026); o prestador não precisa do cadastro.
- **Objetos do catálogo**: `politica:public.itens_checklist.Operadores gerenciam itens de checklist`,
  `politica:public.itens_checklist.Leitura pública de itens de checklist`,
  `politica:public.tipos_unidade.Operadores gerenciam tipos de unidade`,
  `politica:public.tipos_unidade.Leitura pública de tipos de unidade`
- **Origem**: A-026 (decidido).

### R-checklists-008 — Checklist disponível sem rede

- **Comportamento desejado**: o aplicativo baixa os tipos e as versões dos itens dos tipos da câmara
  do usuário (as vigentes e as que unidades do seu alcance já usam) e recebe só o que mudou nas
  sincronizações seguintes, pelo protocolo do core (R-core-021). A manutenção de checklists não é
  feita offline.
- **Comportamento atual**: o aplicativo baixa todos os tipos e todas as linhas de itens, de todas as
  câmaras, inclusive as versões antigas.
- **Motivo da diferença**: escopo por câmara (A-026) e menos dados no aparelho.
- **Objetos do catálogo**: `tabela:tipos_unidade`, `tabela:itens_checklist`
- **Origem**: A-026 (decidido).

### R-checklists-009 — Tipos e itens não são apagados

- **Comportamento desejado**: tipo de unidade não é apagado; só desativado. Tipo desativado não é
  oferecido para unidade nova, e as unidades existentes continuam com ele. Versões de item nunca são
  apagadas (R-checklists-004).
- **Comportamento atual**: a tela só desativa, mas a regra de acesso permite apagar tipos e itens, e
  apagar um tipo apagaria todos os itens dele em cascata.
- **Motivo da diferença**: apagar em cascata perderia o texto das vistorias (Princípio I).
- **Objetos do catálogo**: `restricao:itens_checklist.itens_checklist_tipo_unidade_id_fkey`,
  `politica:public.tipos_unidade.Operadores gerenciam tipos de unidade`
- **Origem**: —

### R-checklists-010 — Autoria das versões e auditoria

- **Comportamento desejado**: cada versão registra quem a criou e quando (é o próprio histórico do
  item). Criação, alteração e desativação de tipos entram na auditoria do core (R-core-022).
- **Comportamento atual**: as versões não registram autor; os campos de autoria herdados do app de
  origem estão vazios em todas as linhas; checklists não são auditados.
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

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das vistorias migradas mostram exatamente o texto do checklist que foi respondido
  na época (conferência por amostra de 100% das respostas migradas contra a versão ligada).
- **SC-002**: Reimportar uma planilha já importada cria 0 versões.
- **SC-003**: Mudar a ordem de itens cria 0 itens e 0 versões novos.
- **SC-004**: Em teste com usuários de duas câmaras, 0 tipos ou itens de outra câmara são alcançados
  por qualquer caminho.
- **SC-005**: O fiscal abre o checklist de qualquer unidade da sua câmara sem rede, em 100% dos casos.
- **SC-006**: Os 33 tipos e as 768 versões de produção chegam ao sistema novo com os mesmos
  identificadores, conferidos registro a registro, e agrupados nos itens estáveis a que pertencem.
- **SC-007**: 100% das regras de acesso deste módulo têm teste automatizado.

## Assumptions

- **Migração das versões**: cada uma das 768 linhas vira uma versão, com o mesmo identificador (as
  respostas das vistorias apontam para ele). As linhas são agrupadas em itens estáveis pela chave
  atual (tipo mais ordem, ou pergunta), ordenadas por data; a vigência de cada versão vai da data
  dela até a da seguinte. Versões idênticas à anterior (reimportação) são mantidas, porque podem ter
  respostas ligadas, e marcadas como repetição no histórico.
- **Serviços dos tipos**: os valores de hoje (textos) são convertidos para os serviços do core;
  "Abastecimento de Água" e "Esgotamento Sanitário" juntos são ambos da CATESA, então os 3 tipos com
  os dois continuam válidos.
- **Tipos sem itens**: os 3 tipos de produção sem itens são migrados e ficam indisponíveis para
  unidade nova até terem itens.
- **Outras diretorias**: DTR usa ocorrências (módulo DTR), não checklist; DGE não tem checklist hoje.
  O motor atende qualquer câmara que venha a usá-lo.
- **Planilha**: o formato de colunas de hoje é mantido para a equipe não refazer as planilhas.
