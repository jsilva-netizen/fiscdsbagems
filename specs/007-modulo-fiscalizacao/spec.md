# Feature Specification: Módulo fiscalização — execução de campo comum às câmaras

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec de módulo da fiscalização do sistema novo da AGEMS, quarto módulo da ordem da spec
003 (depois de core, checklists e planejamento), escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes:
- o catálogo do banco de produção (módulo `fiscalizacao` no mapa de rastreabilidade: 9 tabelas, 12
  funções, 2 repositórios de arquivos, 42 políticas, 18 gatilhos);
- os achados decididos e as divergências classificadas da spec 003;
- as telas e a sincronização offline do sistema atual;
- as specs 004 (core), 005 (checklists) e 006 (planejamento), e a constituição v2.6.2;
- decisões do responsável em 2026-09-30.

## Contexto

A fiscalização é o trabalho de campo: uma equipe vai a uma entidade regulada, num município,
vistoria o que o plano previu e registra o que encontrou. Dessas vistorias saem:
- as constatações (C1, C2...);
- as não conformidades (NC1, NC2...);
- as determinações, com prazo (D1, D2...);
- as recomendações (R1, R2...);
- as fotos;
- o relatório, que acompanha o termo de notificação à entidade.

Produção tem 26 fiscalizações (24 da DSB e 2 da DTR), 402 unidades, 3.454 respostas de checklist,
299 constatações manuais, 478 NCs, 183 determinações, 350 recomendações, 1.445 fotos e 43
relatórios em PDF.

Hoje isso é feito assim:
- tudo é criado e editado no aparelho, sem rede, e enviado por uma fila;
- ao finalizar, uma função do banco apaga e recria as NCs e ajusta determinações e recomendações;
- o número do termo é a posição da fiscalização no ano, recalculada a cada finalização;
- o relatório é gerado fora do app, em partes que o navegador junta;
- reabrir apaga os relatórios.

O acesso da equipe ignora a câmara nas tabelas filhas (A-026), e o prestador lê a fiscalização da
própria entidade antes de receber o termo (A-027).

No sistema novo, a fiscalização é o **app comum de execução de campo**, construído como peças de
montar (constituição v2.6.0 a v2.6.2):

- **Peças do app**:
  - fiscalização e registro de campo (a unidade);
  - execução do modo "lista por unidade" do motor de checklists;
  - constatações manuais;
  - geração das NCs, determinações e recomendações a partir das saídas declaradas no catálogo;
  - numeração;
  - localização (ponto GPS com precisão, sem travar a captura) e fotos;
  - finalização, número do termo e reabertura;
  - relatório com versões;
  - indicadores, exportação e importação;
  - fila offline;
  - consultas para os apps seguintes.
- **O que a câmara monta ou pluga**:
  - o layout do relatório e a marca d'água das fotos;
  - os painéis de indicadores próprios;
  - o registro avulso com dados próprios. A CATERF registra ocorrências na rodovia, com KM
    calculado pelo traçado KML, no app dela, sobre o registro de campo comum.

A fiscalização nasce de uma atividade aprovada no planejamento (spec 006) e aponta para ela. O
processo sancionador, o portal do prestador e o app de cada câmara leem a fiscalização por
consultas e nunca a editam (constituição, "Extensão para outras áreas").

Fica fora desta spec:
- o termo de notificação, as respostas do prestador às determinações e o acompanhamento do
  cumprimento, que são do processo sancionador;
- o que o prestador vê no portal (portal do prestador);
- o registro de ocorrência na rodovia, o KML e o laudo da DTR (app da CATERF);
- o motor de checklists (spec 005);
- o planejamento (spec 006).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Iniciar a fiscalização a partir do que foi planejado (Priority: P1)

O fiscal escalado abre, no aparelho, a atividade de fiscalização aprovada da viagem e inicia a
fiscalização a partir dela. A entidade, o município, os serviços, a câmara e a equipe vêm do
planejamento. Em urgência, o coordenador inicia sem atividade, com motivo, e a fiscalização fica
pendente até ser ligada a uma viagem extra aprovada.

**Why this priority**: é o elo planejado × executado exigido pelo planejamento. Sem ele, a
fiscalização nasce solta, como hoje.

**Independent Test**:
- um fiscal escalado numa viagem aprovada da CATESA, sem rede, inicia a fiscalização da atividade
  "Fiscalização de SAA e SES em Miranda";
- ela nasce com a entidade, os serviços, a câmara e a equipe da escala;
- um coordenador inicia uma fiscalização de urgência com motivo, e ela aparece como pendente de
  ligação até o diretor aprovar a viagem extra e o coordenador ligá-la.

**Acceptance Scenarios**:

1. **Given** uma atividade de fiscalização aprovada em que o fiscal está escalado, **When** ele
   inicia a fiscalização sem rede, **Then** ela é criada no aparelho com os dados da atividade e
   enviada quando a rede voltar.
2. **Given** um fiscal sem atividade aprovada, **When** tenta iniciar uma fiscalização, **Then** o
   sistema não permite e indica o caminho: viagem extra ou urgência pelo coordenador.
3. **Given** uma fiscalização de urgência sem atividade, **When** o coordenador a liga a uma
   atividade de uma viagem extra aprovada, **Then** ela deixa de ser pendente de ligação.
4. **Given** uma atividade que já tem fiscalização, **When** alguém tenta iniciar outra para a mesma
   atividade, **Then** o sistema avisa e abre a existente.

---

### User Story 2 - Vistoriar a unidade com o checklist (Priority: P1)

O fiscal adiciona à fiscalização as unidades vistoriadas (uma ETE, um aterro), escolhendo o tipo de
unidade (o catálogo). Para cada unidade, ele:
- responde o checklist na versão vigente na criação da unidade;
- escreve constatações manuais;
- ajusta os textos gerados;
- fotografa;
- finaliza a unidade.

**Why this priority**: é o registro da vistoria, com efeito jurídico (Princípio I).

**Independent Test**: numa unidade "Estação de Tratamento de Água", o fiscal responde Não a um item
que gera NC com determinação. O sistema mostra:
- a constatação C1;
- a NC1;
- a determinação D1 "Sanar NC1. ...", com o prazo do item.

Ele edita o texto da constatação e da determinação, acrescenta uma constatação manual com NC e
recomendação, e a numeração continua certa. Tudo sem rede.

**Acceptance Scenarios**:

1. **Given** uma unidade criada em 10/03 e um item do checklist editado em 15/03, **When** o
   fiscal abre a unidade, **Then** responde a versão vigente em 10/03.
2. **Given** uma resposta Não em item que gera NC, **When** o fiscal responde, **Then** a
   constatação, a NC e a determinação ou recomendação aparecem, conforme o que o catálogo declara.
3. **Given** um texto de determinação editado pelo fiscal, **When** a unidade é consolidada de novo,
   **Then** a edição é preservada.
4. **Given** uma resposta que volta de Não para Sim, **When** a unidade é consolidada, **Then** a NC
   e a determinação ligadas somem, e a numeração se ajusta.
5. **Given** uma unidade finalizada, **When** alguém tenta alterá-la fora do modo de edição,
   **Then** o sistema recusa.

---

### User Story 3 - Registrar fotos e localização em campo (Priority: P1)

O fiscal fotografa. Cada foto é reduzida, recebe a marca d'água da câmara e guarda a data e as
coordenadas, também sem rede. O ponto GPS da unidade é registrado com a precisão, sem travar a
captura esperando precisão.

**Why this priority**: as fotos são a prova; hoje são 1.445 arquivos e o maior volume do sistema.

**Independent Test**:
- o fiscal tira 3 fotos sem rede; cada uma tem a marca "ETA-001, Miranda - MS", a data, a hora e
  as coordenadas;
- ele reordena as fotos, escreve legendas e exclui uma;
- a 21ª foto da unidade é recusada;
- com a rede de volta, as fotos são enviadas e aparecem no relatório na ordem definida.

**Acceptance Scenarios**:

1. **Given** um aparelho sem rede, **When** o fiscal tira uma foto, **Then** ela fica no aparelho
   com marca d'água, data e coordenadas, e entra na fila de envio.
2. **Given** um GPS com precisão ruim, **When** o fiscal registra o ponto, **Then** o ponto é
   gravado com a precisão atual e marcado como impreciso, sem bloquear a captura.
3. **Given** 20 fotos numa unidade, **When** o fiscal tenta a 21ª, **Then** o sistema recusa.
4. **Given** uma foto enviada, **When** alguém sem acesso à fiscalização tenta abri-la, **Then** o
   arquivo não é entregue.

---

### User Story 4 - Finalizar a fiscalização (Priority: P1)

O fiscal finaliza a fiscalização, também sem rede. No servidor:
- as NCs, determinações e recomendações de todas as unidades são consolidadas;
- a fiscalização recebe o número do termo, que não muda mais;
- os totais ficam disponíveis.

**Why this priority**: a finalização fecha o registro e gera o número que vai ao termo de
notificação.

**Independent Test**: a fiscalização é finalizada sem rede; ao sincronizar, recebe o número
"012/2027". Uma fiscalização anterior do ano é excluída depois, e o número da primeira continua
"012/2027".

**Acceptance Scenarios**:

1. **Given** uma fiscalização em andamento, **When** o fiscal a finaliza sem rede, **Then** a
   finalização entra na fila e é feita no servidor quando a rede voltar.
2. **Given** a primeira finalização de uma fiscalização, **When** ela é feita, **Then** a
   fiscalização recebe o próximo número do ano, que não muda em reaberturas nem exclusões de outras.
3. **Given** uma fiscalização finalizada, **When** alguém consulta os totais, **Then** vê unidades,
   constatações, NCs, determinações e recomendações calculados dos registros.

---

### User Story 5 - Gerar e guardar o relatório (Priority: P2)

A equipe pede o relatório da fiscalização. O sistema primeiro envia as mudanças pendentes do
aparelho, depois gera o PDF no servidor, no layout da câmara, e avisa quando fica pronto. Cada
relatório gerado fica guardado. O mais recente é o vigente, e os anteriores ficam como substituídos.

**Why this priority**: o relatório é o documento enviado à entidade. Hoje é substituído a cada
geração e apagado na reabertura.

**Independent Test**:
- o coordenador gera o relatório de uma fiscalização com 40 fotos e baixa um único PDF;
- ele gera de novo, e a lista mostra as duas versões, com a mais antiga como substituída;
- a fiscalização é reaberta, e o relatório vigente aparece como desatualizado, sem ser apagado.

**Acceptance Scenarios**:

1. **Given** mudanças pendentes no aparelho, **When** o relatório é pedido, **Then** elas são
   enviadas antes, e o relatório reflete o que está no servidor.
2. **Given** um relatório pronto, **When** quem pediu é avisado, **Then** baixa o PDF por endereço
   temporário.
3. **Given** um relatório já gerado, **When** outro é gerado, **Then** os dois ficam guardados, e só
   o novo é o vigente.
4. **Given** uma fiscalização reaberta, **When** alguém vê os relatórios, **Then** o vigente aparece
   como desatualizado até um novo ser gerado.

---

### User Story 6 - Registro avulso pelo app da câmara (Priority: P2)

A CATERF percorre a rodovia e registra ocorrências avulsas, uma por ponto. O app da CATERF faz a
captura (KM pelo traçado, sentido, marca d'água com rodovia e KM) sobre o registro de campo comum.
A fiscalização aplica a resposta (constatação ou NC), numera e gera o relatório no layout da
CATERF.

**Why this priority**: a DTR já fiscaliza assim. O app comum precisa servir ao modo avulso sem
conhecer rodovia nem KM.

**Independent Test**: um app de câmara de teste registra 3 registros avulsos numa fiscalização,
com dados próprios guardados no app dele. A fiscalização numera, gera as NCs das respostas "Não
conformidade" e produz o relatório no layout do app, sem alteração no app de fiscalização.

**Acceptance Scenarios**:

1. **Given** um catálogo no modo "registro avulso", **When** o app da câmara cria um registro com o
   item escolhido e a resposta, **Then** a fiscalização gera as saídas declaradas no catálogo.
2. **Given** um registro avulso, **When** a fiscalização é consultada, **Then** os dados próprios da
   câmara vêm do app dela, ligado ao registro, e não do app de fiscalização.

---

### User Story 7 - Reabrir com motivo (Priority: P2)

O fiscal ou o coordenador da câmara reabre uma fiscalização finalizada, informando o motivo. A
equipe é avisada, o número do termo é mantido e os relatórios ficam desatualizados até um novo.

**Why this priority**: correções depois da finalização existem, e hoje a reabertura não registra
por quê.

**Independent Test**: o fiscal reabre com o motivo "foto trocada na unidade 3"; o histórico mostra
a reabertura com o motivo; ele corrige, finaliza de novo, e o número do termo é o mesmo.

**Acceptance Scenarios**:

1. **Given** uma fiscalização finalizada, **When** o fiscal reabre sem motivo, **Then** o sistema
   recusa.
2. **Given** um aparelho sem rede, **When** alguém tenta reabrir, **Then** o sistema pede rede.
3. **Given** uma reabertura, **When** a fiscalização é finalizada de novo, **Then** mantém o número
   do termo.

---

### User Story 8 - Acompanhar indicadores e consultar (Priority: P3)

A equipe e o diretor filtram as fiscalizações e veem indicadores:
- fiscalizações, unidades e fotos;
- constatações, conformidades e NCs;
- determinações e recomendações;
- distribuição por serviço e ranking de municípios.

Cada um vê só o que alcança. O histórico de cada fiscalização mostra quem mudou o quê.

**Why this priority**: gestão; o diretor vê painéis consolidados por padrão (R-core-012).

**Independent Test**: um coordenador da CATERS vê indicadores só da CATERS; o diretor da DSB vê os
da CATESA e da CATERS, separados e juntos; ninguém vê os da CATERF fora da DTR.

**Acceptance Scenarios**:

1. **Given** um coordenador da CATERS, **When** abre os indicadores, **Then** os números contam só
   fiscalizações da CATERS.
2. **Given** o histórico de uma fiscalização, **When** alguém que alcança a fiscalização o abre,
   **Then** vê as alterações dela e das unidades, com autor e data.

---

### User Story 9 - Exportar e importar fiscalizações (Priority: P3)

O administrador exporta fiscalizações finalizadas em arquivo (dados e referências das fotos) e
importa um arquivo exportado, passando pelas mesmas regras das telas.

**Why this priority**: cópia e transferência de fiscalizações; decisão do responsável de manter as
duas.

**Independent Test**: o administrador exporta 2 fiscalizações e importa o arquivo em outro
ambiente. As fiscalizações são criadas com as fotos conferidas e marcadas como importadas, com a
origem. Um arquivo com unidade de tipo inexistente é recusado com o motivo da linha.

**Acceptance Scenarios**:

1. **Given** um arquivo exportado, **When** o administrador importa, **Then** vê a prévia do que
   será criado e os erros antes de confirmar.
2. **Given** uma importação, **When** ela é gravada, **Then** passa pelas mesmas validações das
   telas e fica na auditoria com a origem.

---

### Edge Cases

- **Aparelho com trabalho não enviado de uma fiscalização excluída no servidor**: o aparelho não
  descarta o trabalho. Ele o mantém e oferece enviá-lo como fiscalização nova, ligada à mesma
  atividade (Princípio II).
- **Sessão encerrada ou usuário desativado com fila pendente**: a fila fica no aparelho. O mesmo
  usuário, ao entrar de novo, envia. Se o usuário foi desativado, o aparelho exporta a fila para
  arquivo, que o administrador importa em nome do autor (R-fiscalizacao-017).
- **Limpar os dados do aparelho com fila pendente**: não é permitido enquanto houver operação ou
  foto não enviada.
- **Duas pessoas da equipe editam a mesma unidade sem rede**: vale a última recebida pelo servidor,
  e as duas versões ficam na auditoria (protocolo do core).
- **Unidade de catálogo desativado depois da criação**: continua vistoriável, com a versão da
  criação.
- **Resposta Não sem texto de determinação nem de recomendação**: gera só a constatação e a NC.
- **Foto maior que o limite depois de reduzida**: recusada, com a mensagem de limite.
- **Relatório de fiscalização em andamento**: pode ser gerado; o documento mostra a situação "em
  andamento".
- **Atividade planejada cancelada depois de a fiscalização começar**: a fiscalização continua; a
  inconsistência aparece para o coordenador (R-planejamento-021).
- **Viagem conjunta**: cada câmara tem a sua fiscalização, ligada à sua atividade. O servidor
  liberado de outra câmara trabalha na fiscalização da câmara que o escalou.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda fiscalização MUST nascer de uma atividade de fiscalização aprovada no
  planejamento, exceto a de urgência, criada pelo coordenador com motivo e pendente até ser ligada
  a uma viagem extra aprovada (R-fiscalizacao-002).
- **FR-002**: A fiscalização MUST ter câmara, entidade, município, serviços da câmara, equipe e
  situação, e MUST ser alcançada só pela câmara, pela equipe, pelo diretor da diretoria (leitura) e
  pelo administrador (R-fiscalizacao-001, R-fiscalizacao-003).
- **FR-003**: O app MUST executar o modo "lista por unidade" do motor de checklists e aceitar
  registros avulsos criados por apps de câmara, sem conhecer os dados próprios deles
  (R-fiscalizacao-004, R-fiscalizacao-005).
- **FR-004**: As NCs, determinações e recomendações MUST ser geradas das saídas declaradas no
  catálogo e das constatações manuais, de forma repetível, preservando as edições da equipe e
  mantendo o identificador de cada uma enquanto a origem existir (R-fiscalizacao-007).
- **FR-005**: A numeração de constatações, NCs, determinações e recomendações MUST seguir a
  R-fiscalizacao-008 e MUST ficar congelada na finalização.
- **FR-006**: O app MUST registrar o ponto GPS e as fotos sem rede, com precisão, marca d'água da
  câmara, data e coordenadas, sem travar a captura (R-fiscalizacao-010, R-fiscalizacao-011).
- **FR-007**: A finalização MUST poder ser feita sem rede, MUST atribuir uma única vez o número do
  termo, e o número MUST NOT mudar depois (R-fiscalizacao-012, R-fiscalizacao-013).
- **FR-008**: Reabrir MUST exigir rede e motivo, ser feito só por fiscal ou coordenador da câmara e
  manter o número do termo (R-fiscalizacao-014).
- **FR-009**: Excluir MUST ser recusado para fiscalização já finalizada alguma vez, ou que tenha
  documentos ligados (R-fiscalizacao-015).
- **FR-010**: O relatório MUST ser gerado no servidor, num único PDF, no layout da câmara, e toda
  versão gerada MUST ser guardada (R-fiscalizacao-016).
- **FR-011**: Nenhum trabalho feito sem rede MUST ser perdido, inclusive com sessão encerrada,
  usuário desativado ou fiscalização excluída no servidor (R-fiscalizacao-017).
- **FR-012**: Os indicadores MUST seguir as definições da R-fiscalizacao-018 e MUST respeitar o
  alcance de cada usuário.
- **FR-013**: A exportação e a importação MUST ser só do administrador, e a importação MUST passar
  pelas mesmas regras das telas (R-fiscalizacao-020).
- **FR-014**: O app MUST oferecer consultas de leitura para o processo sancionador, o portal, o
  planejamento e os apps de câmara, e nenhum deles MUST alterar a fiscalização
  (R-fiscalizacao-022).
- **FR-015**: O app MUST NOT conter layout, marca d'água, campo ou regra de uma câmara específica
  (R-fiscalizacao-025).
- **FR-016**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Fiscalização**:
  - câmara, entidade, destinos (e município, quando for destino), serviços;
  - atividade planejada, ou urgência com motivo;
  - equipe e responsável;
  - datas de início e fim;
  - situação (em andamento, finalizada);
  - número do termo;
  - origem (criada, migrada, importada).
- **Registro de campo (unidade)**:
  - catálogo e item (no modo avulso), identificação (nome, código), endereço;
  - ponto de localização e data e hora da vistoria;
  - ordem e situação;
  - fotos;
  - o app de câmara que o estende, quando houver.
- **Resposta**: a resposta a um item do catálogo, na versão respondida, com observação e o texto
  da constatação, editável.
- **Constatação manual**: texto livre do fiscal, com a indicação de NC, o dispositivo e os textos
  de determinação e recomendação.
- **Não conformidade**: descrição, dispositivo normativo, número e origem (a resposta ou a
  constatação manual).
- **Determinação**: texto, prazo em dias, data-limite, número e origem.
- **Recomendação**: texto, número e origem.
- **Ponto de localização**: latitude, longitude, precisão, origem (GPS do aparelho, foto ou
  digitado) e horário.
- **Foto**: arquivo com marca d'água, arquivo sem marca, legenda, ordem, data e coordenadas.
- **Relatório**: versão, pedido por, data, situação (na fila, gerando, pronto, erro), vigente,
  substituído ou desatualizado, e o arquivo.
- **Importação**: arquivo, quem importou, prévia, resultado e registros criados.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. As chaves citadas estão no catálogo
da spec 003.

### R-fiscalizacao-001 — A fiscalização

- **Comportamento desejado**: a fiscalização tem:
  - câmara técnica (obrigatória);
  - entidade regulada (obrigatória, com chave para o core);
  - destinos, copiados da atividade planejada, com os tipos registrados pelos apps (município e
    entidade do core; concessão e rodovia da CATERF), e o município (com chave para o core) quando
    algum destino é município. A fiscalização rodoviária não tem município;
  - serviços fiscalizados (pelo menos um, todos da câmara);
  - atividade planejada, ou marca de urgência com motivo (R-fiscalizacao-002);
  - equipe (usuários) e fiscal responsável;
  - data de início (a criação) e data de fim (a primeira finalização);
  - situação (em andamento ou finalizada);
  - número do termo (R-fiscalizacao-013);
  - origem (criada no sistema, migrada ou importada).

  O identificador é gerado no aparelho. Os nomes de entidade, município e equipe exibidos vêm do
  core; os dos documentos já emitidos ficam no documento. A diretoria vem da câmara (não há campo de
  "módulo").
- **Comportamento atual**:
  - a câmara é deduzida dos serviços por gatilho quando vem vazia, e serviços de câmaras
    diferentes, ou de rodovias, deixam a fiscalização sem câmara, visível a todos;
  - município e entidade não têm chave estrangeira;
  - há um fiscal só (nome e e-mail copiados), sem equipe;
  - os nomes de município e entidade são copiados por gatilho;
  - o `tipo_modulo` separa DSB e DTR nas listas;
  - a fiscalização guarda quem alterou por último em colunas próprias;
  - os pontos de início da visita existem, mas o app não os grava.
- **Motivo da diferença**:
  - fiscalização sem câmara fura o isolamento (A-026);
  - chave ausente permite registro órfão (A-037);
  - a equipe vem do planejamento (spec 006);
  - quem alterou está na auditoria do core (R-core-022);
  - colunas que ninguém grava não são levadas (A-025).
- **Objetos do catálogo**: `tabela:fiscalizacoes`, `coluna:fiscalizacoes.id`,
  `coluna:fiscalizacoes.camara_tecnica_id`, `coluna:fiscalizacoes.municipio_id`,
  `coluna:fiscalizacoes.municipio_nome`, `coluna:fiscalizacoes.prestador_servico_id`,
  `coluna:fiscalizacoes.prestador_servico_nome`, `coluna:fiscalizacoes.servicos`,
  `coluna:fiscalizacoes.fiscal_nome`, `coluna:fiscalizacoes.fiscal_email`,
  `coluna:fiscalizacoes.data_inicio`, `coluna:fiscalizacoes.data_fim`,
  `coluna:fiscalizacoes.status`, `coluna:fiscalizacoes.tipo_modulo`,
  `coluna:fiscalizacoes.created_by`, `coluna:fiscalizacoes.created_at`,
  `coluna:fiscalizacoes.updated_at`, `coluna:fiscalizacoes.last_modified_by`,
  `coluna:fiscalizacoes.last_modified_at`, `coluna:fiscalizacoes.latitude_inicio`,
  `coluna:fiscalizacoes.longitude_inicio`, `gatilho:public.fiscalizacoes.tr_camara_fiscalizacoes`,
  `funcao:trg_fiscalizacao_set_camara()`, `gatilho:public.fiscalizacoes.trg_set_fiscalizacao_cache_fields`,
  `funcao:set_fiscalizacao_cache_fields()`, `gatilho:public.fiscalizacoes.trg_set_fiscalizacao_last_modified`,
  `funcao:set_fiscalizacao_last_modified()`, `gatilho:public.fiscalizacoes.update_fiscalizacoes_updated_at`,
  `funcao:camara_from_servicos(p_servicos text[])`
- **Origem**: A-026, A-037, A-025, A-021 (decididos); R-core-011 (a dedução pelos serviços sai do
  core); spec 006 (equipe).

### R-fiscalizacao-002 — Nasce da atividade planejada; urgência com exceção registrada

- **Comportamento desejado**: o fiscal escalado inicia a fiscalização a partir de uma atividade de
  fiscalização aprovada, do plano anual ou de uma viagem extra, que ele tem no aparelho
  (R-planejamento-017, R-planejamento-021). Vêm da atividade a câmara, os serviços, a entidade alvo,
  o destino do tipo município e a equipe (a escala). Uma atividade tem no máximo uma fiscalização.

  **Urgência**: sem atividade aprovada, só o coordenador da câmara inicia uma fiscalização, com
  motivo obrigatório. Ela fica marcada "pendente de ligação" e aparece como pendência do
  coordenador e no painel do diretor até ser ligada a uma atividade de uma viagem extra aprovada
  depois (a viagem extra pode ter período já iniciado). A equipe da urgência é informada pelo
  coordenador. A ligação é da fiscalização: o planejamento não muda (R-planejamento-021).
- **Comportamento atual**: a fiscalização é criada livremente, sem planejamento: escolhe-se
  município, entidade e serviços, e a posição GPS capturada na tela não é gravada.
- **Motivo da diferença**: decisão do responsável (2026-09-30): planejado × executado para todas as
  fiscalizações, com exceção registrada para urgência.
- **Objetos do catálogo**: `coluna:fiscalizacoes.data_inicio`
- **Origem**: decisão do responsável, 2026-09-30; spec 006.

### R-fiscalizacao-003 — Quem alcança a fiscalização

- **Comportamento desejado**:
  - **Coordenador e fiscal**: leem e alteram as fiscalizações da própria câmara e, além delas,
    aquelas de outra câmara em que estão na equipe (liberados pelo planejamento).
  - **Diretor**: lê as das câmaras da sua diretoria.
  - **Administrador**: tudo.
  - **Prestador**: só alcança a fiscalização depois do termo de notificação, pelo portal do
    prestador (A-027), e o que ele vê é definido naquela spec.
  - **Outras áreas e apps**: leem pelas consultas (R-fiscalizacao-022).

  A regra vale para a fiscalização e para tudo o que pende dela (unidades, respostas, constatações,
  NCs, determinações, recomendações, fotos, relatórios), por qualquer caminho: tela,
  sincronização, chamada direta, relatório, exportação. Registro fora do alcance responde como
  inexistente.
- **Comportamento atual**:
  - na fiscalização, a câmara é respeitada, mas quem não tem câmara vê todas e todos veem as sem
    câmara;
  - nas tabelas filhas, a equipe tem acesso total, sem olhar a câmara;
  - o prestador lê fiscalização, unidades, respostas, constatações, NCs, determinações e
    recomendações da própria entidade, com ou sem termo;
  - há políticas duplicadas, com nome corrompido e de teste automatizado;
  - os relatórios são lidos por qualquer usuário ativo.
- **Motivo da diferença**: isolamento por câmara como fronteira de segurança (A-026; Princípio
  III); prestador só depois do termo (A-027); uma regra por papel e operação (A-003); testes fora
  de produção (A-001).
- **Objetos do catálogo**: `politica:public.fiscalizacoes.Fiscais e Admins: acesso por camara em fiscalizacoes`,
  `politica:public.fiscalizacoes.Prestadores: ler apenas suas próprias fiscalizações`,
  `politica:public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe`,
  `politica:public.fiscalizacoes.e2e_test_user_own_rows_only`,
  `politica:public.fiscalizacoes.e2e_test_user_own_rows_only_delete`,
  `politica:public.unidades_fiscalizadas.Fiscais e Admins: acesso total em unidades`,
  `politica:public.unidades_fiscalizadas.Prestadores: ler suas próprias unidades`,
  `politica:public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades`,
  `politica:public.unidades_fiscalizadas.unidades_staff_all`,
  `politica:public.unidades_fiscalizadas.e2e_test_user_own_rows_only`,
  `politica:public.unidades_fiscalizadas.e2e_test_user_own_rows_only_delete`,
  `politica:public.respostas_checklist.Fiscais e Admins: acesso total em respostas`,
  `politica:public.respostas_checklist.Prestadores: ler suas próprias respostas`,
  `politica:public.respostas_checklist.respostas_checklist_staff_all`,
  `politica:public.respostas_checklist.e2e_test_user_own_rows_only`,
  `politica:public.respostas_checklist.e2e_test_user_own_rows_only_delete`,
  `politica:public.constatacoes_manuais.Fiscais e Admins: acesso total em constatacoes`,
  `politica:public.constatacoes_manuais.Prestadores: ler suas próprias constatacoes`,
  `politica:public.constatacoes_manuais.constatacoes_staff_all`,
  `politica:public.constatacoes_manuais.e2e_test_user_own_rows_only`,
  `politica:public.constatacoes_manuais.e2e_test_user_own_rows_only_delete`,
  `politica:public.nao_conformidades.Fiscais e Admins: acesso total em ncs`,
  `politica:public.nao_conformidades.Prestadores: ler suas próprias ncs`,
  `politica:public.nao_conformidades.ncs_staff_all`,
  `politica:public.determinacoes.Fiscais e Admins: acesso total em determinacoes`,
  `politica:public.determinacoes.Prestadores: ler suas próprias determinacoes`,
  `politica:public.determinacoes.determinacoes_staff_all`,
  `politica:public.determinacoes.e2e_test_user_own_rows_only`,
  `politica:public.determinacoes.e2e_test_user_own_rows_only_delete`,
  `politica:public.recomendacoes.Fiscais e Admins: acesso total em recomendacoes`,
  `politica:public.recomendacoes.Prestadores: ler suas próprias recomendacoes`,
  `politica:public.recomendacoes.recomendacoes_staff_all`,
  `politica:public.recomendacoes.e2e_test_user_own_rows_only`,
  `politica:public.recomendacoes.e2e_test_user_own_rows_only_delete`,
  `politica:public.relatorios_jobs.Select relatorios_jobs (any active user)`,
  `politica:public.relatorios_jobs.Delete relatorios_jobs (owner/admin)`
- **Origem**: A-026, A-027, A-003, A-001 (decididos); R-core-011, R-core-012.

### R-fiscalizacao-004 — Registro de campo (unidade) e os dois modos

- **Comportamento desejado**: o registro de campo é a peça comum de tudo o que se vistoria numa
  fiscalização. Ele tem:
  - catálogo (no modo avulso, também o item escolhido e a resposta);
  - nome e código (único na fiscalização, sugerido a partir do código do catálogo e editável);
  - endereço;
  - ponto de localização (R-fiscalizacao-010) e data e hora da vistoria (padrão: a criação,
    editável);
  - ordem na fiscalização (reordenável);
  - situação (em andamento, finalizado);
  - fotos (R-fiscalizacao-011).

  Os modos do catálogo (R-checklists-012) se aplicam assim:
  - **lista por unidade**: o app de fiscalização adiciona a unidade, oferecendo só catálogos ativos,
    com item vigente, da câmara e com serviço em comum com a fiscalização, e apresenta o checklist
    (R-fiscalizacao-005);
  - **registro avulso**: o app da câmara cria o registro pela consulta de escrita que a fiscalização
    oferece a ele, com o item e a resposta. Os dados próprios da câmara (na CATERF: rodovia, trecho,
    KM, sentido, gravidade, KM impreciso) ficam num registro do app da câmara ligado ao registro de
    campo, como o contrato estendido pela CATERF no core (R-core-020).

  Registro finalizado só é alterado em modo de edição da fiscalização reaberta.
- **Comportamento atual**:
  - unidade de saneamento e ocorrência da DTR são a mesma tabela, com as colunas da DTR juntas;
  - o tipo de unidade não tem chave estrangeira;
  - o nome do tipo copiado não é gravado pelo app;
  - há coordenadas como texto digitado e coordenadas numéricas lado a lado;
  - os totais de determinações e recomendações nunca são gravados;
  - a unidade tem as situações `pendente` e `cancelada`, sem uso na tela.
- **Motivo da diferença**:
  - app comum sem campos de câmara (constituição v2.6.0);
  - chave obrigatória (A-037);
  - colunas que ninguém grava não são levadas (A-025);
  - totais são calculados (A-025);
  - um só ponto, com a origem do valor (R-fiscalizacao-010).
- **Objetos do catálogo**: `tabela:unidades_fiscalizadas`, `coluna:unidades_fiscalizadas.id`,
  `coluna:unidades_fiscalizadas.fiscalizacao_id`, `coluna:unidades_fiscalizadas.tipo_unidade_id`,
  `coluna:unidades_fiscalizadas.tipo_unidade_nome`, `coluna:unidades_fiscalizadas.nome_unidade`,
  `coluna:unidades_fiscalizadas.codigo_unidade`, `coluna:unidades_fiscalizadas.endereco`,
  `coluna:unidades_fiscalizadas.data_hora_vistoria`, `coluna:unidades_fiscalizadas.ordem`,
  `coluna:unidades_fiscalizadas.status`, `coluna:unidades_fiscalizadas.total_constatacoes`,
  `coluna:unidades_fiscalizadas.total_ncs`, `coluna:unidades_fiscalizadas.total_determinacoes`,
  `coluna:unidades_fiscalizadas.total_recomendacoes`, `coluna:unidades_fiscalizadas.created_at`,
  `coluna:unidades_fiscalizadas.updated_at`, `gatilho:public.unidades_fiscalizadas.update_unidades_updated_at`,
  `coluna:unidades_fiscalizadas.km`, `coluna:unidades_fiscalizadas.rodovia`
- **Origem**: A-025, A-037 (decididos); R-checklists-012; constituição v2.6.0.

### R-fiscalizacao-005 — Checklist na unidade

- **Comportamento desejado**: a unidade apresenta os itens do catálogo na versão vigente na data
  de criação dela (R-checklists-005). As versões já respondidas continuam na vistoria reaberta. Cada
  resposta guarda:
  - a versão do item;
  - a resposta, com as opções que o catálogo declara (hoje, Sim ou Não);
  - a observação;
  - o **texto da constatação**, copiado do item e editável pelo fiscal.

  Excluir a constatação de uma resposta tira a resposta da contagem de constatações, sem apagar a
  resposta. Uma resposta por item e unidade. Quem lê o texto é o relatório e a contagem; resposta
  sem texto de constatação não conta.
- **Comportamento atual**:
  - a resposta guarda a pergunta copiada, que a tela deixa editar como texto da constatação;
  - excluir a constatação apaga a pergunta copiada e a marca de NC;
  - a resposta é `SIM` ou `NAO` (o servidor aceita `NÃO`);
  - "gera NC" é gravado pela tela a partir do item;
  - há um campo antigo de comentário, que a tela não usa.
- **Motivo da diferença**: as saídas vêm do catálogo (R-checklists-013), e não de uma marca gravada
  pela tela; o campo antigo não é levado (divergência classificada).
- **Objetos do catálogo**: `tabela:respostas_checklist`, `coluna:respostas_checklist.id`,
  `coluna:respostas_checklist.unidade_fiscalizada_id`, `coluna:respostas_checklist.item_checklist_id`,
  `coluna:respostas_checklist.resposta`, `coluna:respostas_checklist.pergunta`,
  `coluna:respostas_checklist.observacao`, `coluna:respostas_checklist.gera_nc`,
  `coluna:respostas_checklist.comentario`, `coluna:respostas_checklist.created_at`,
  `coluna:respostas_checklist.updated_at`
- **Origem**: A-024 (decidido); divergências `coluna:respostas_checklist.comentario`
  (residuo_descartar) e `coluna:respostas_checklist.pergunta` (producao_vale).

### R-fiscalizacao-006 — Constatações manuais

- **Comportamento desejado**: o fiscal escreve constatações livres na unidade, com:
  - texto (obrigatório);
  - se geram NC;
  - o dispositivo normativo e a descrição da NC (se vazia, o padrão da R-fiscalizacao-007);
  - o texto da determinação ou, sem ele, o da recomendação.

  As constatações manuais são editáveis, excluíveis e reordenáveis, e entram na mesma numeração C
  das respostas.
- **Comportamento atual**: igual ao desejado. Produção tem 299, 123 delas gerando NC.
- **Motivo da diferença**: —
- **Objetos do catálogo**: `tabela:constatacoes_manuais`, `coluna:constatacoes_manuais.id`,
  `coluna:constatacoes_manuais.unidade_fiscalizada_id`, `coluna:constatacoes_manuais.descricao`,
  `coluna:constatacoes_manuais.ordem`, `coluna:constatacoes_manuais.gera_nc`,
  `coluna:constatacoes_manuais.artigo_portaria`, `coluna:constatacoes_manuais.descricao_nc`,
  `coluna:constatacoes_manuais.texto_determinacao`, `coluna:constatacoes_manuais.texto_recomendacao`,
  `coluna:constatacoes_manuais.created_at`, `coluna:constatacoes_manuais.updated_at`
- **Origem**: divergências `coluna:constatacoes_manuais.descricao` e
  `coluna:constatacoes_manuais.ordem` (producao_vale).

### R-fiscalizacao-007 — Geração das NCs, determinações e recomendações

- **Comportamento desejado**: a consolidação de uma unidade gera os registros a partir de:
  - as respostas, conforme as **saídas declaradas no catálogo** (R-checklists-013), cujos
    identificadores (constatação, NC, determinação, recomendação) este app registra no motor;
  - as constatações manuais, com a mesma lógica.

  Com os modelos de hoje:
  - **NC**: descrição "Constatação C<n>: não cumprimento do <dispositivo>;", com "artigo
    aplicável" quando não há dispositivo; na constatação manual, a descrição de NC dela, se houver;
  - **determinação**: "Sanar NC<n>. <texto>", com o prazo do item (padrão 30 dias);
  - **recomendação**: quando há texto de recomendação e não há de determinação.

  **Regras da consolidação**:
  - é repetível: rodar de novo não duplica nada;
  - cada NC, determinação e recomendação é identificada pela **origem** (a resposta ou a
    constatação manual) e mantém o identificador enquanto a origem existir;
  - textos editados pela equipe e a ordem definida são preservados;
  - registro cuja origem deixou de gerar a saída (resposta voltou para Sim) é removido;
  - a determinação aponta para a NC que manda sanar.

  A consolidação roda no servidor ao receber mudanças da unidade, na finalização e antes do
  relatório. O aparelho mostra o mesmo resultado pela mesma regra, para o trabalho sem rede. A
  equipe também acrescenta determinações e recomendações ligadas a uma constatação, que ficam com
  a origem dela.
- **Comportamento atual**:
  - a função do banco apaga e recria todas as NCs a cada execução, com identificador novo;
  - as determinações perdem e recebem de novo o vínculo com a NC;
  - determinações e recomendações já são preservadas pela origem;
  - a gravidade da NC é fixa em "Média";
  - as fotos e a localização da NC não são usadas;
  - a consolidação roda só na finalização e, desde a migration 141, no pedido de relatório;
  - no aparelho, determinações e recomendações são criadas durante a vistoria, e NCs não;
  - há uma função de preenchimento da origem sem uso.
- **Motivo da diferença**:
  - NC com identificador estável pode ser citada por outros registros (termo, auto) sem se perder a
    cada finalização;
  - saídas vindas do catálogo tiram do código a regra de uma câmara (constituição v2.6.0);
  - campos fixos ou sem uso não são levados (A-025, A-035).
- **Objetos do catálogo**: `funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)`,
  `tabela:nao_conformidades`, `coluna:nao_conformidades.id`,
  `coluna:nao_conformidades.unidade_fiscalizada_id`, `coluna:nao_conformidades.descricao`,
  `coluna:nao_conformidades.artigo_portaria`, `coluna:nao_conformidades.resposta_checklist_id`,
  `coluna:nao_conformidades.gravidade`, `coluna:nao_conformidades.fotos`,
  `coluna:nao_conformidades.latitude_foto`, `coluna:nao_conformidades.longitude_foto`,
  `coluna:nao_conformidades.created_at`, `restricao:nao_conformidades.nao_conformidades_resposta_checklist_id_fkey`,
  `tabela:recomendacoes`, `coluna:recomendacoes.id`, `coluna:recomendacoes.unidade_fiscalizada_id`,
  `coluna:recomendacoes.descricao`, `coluna:recomendacoes.origem`, `coluna:recomendacoes.created_at`,
  `coluna:recomendacoes.updated_at`, `coluna:determinacoes.origem`,
  `coluna:determinacoes.nao_conformidade_id`, `funcao:determinacoes_fill_origem()`
- **Origem**: A-025, A-035 (decididos); R-checklists-013; divergência `coluna:determinacoes.origem`
  (producao_vale).

### R-fiscalizacao-008 — Numeração

- **Comportamento desejado**:
  - **constatações** (C1, C2...): por unidade, na ordem definida pelo fiscal, juntando as
    respostas com texto de constatação e as constatações manuais;
  - **NCs** (NC1, NC2...): sequenciais na fiscalização, seguindo a ordem das unidades e, dentro
    delas, a das constatações;
  - **determinações** (D1, D2...) e **recomendações** (R1, R2...): por unidade, na ordem definida
    pela equipe (reordenáveis);
  - os textos que citam números ("Sanar NC<n>") acompanham a numeração.

  A numeração é recalculada enquanto a fiscalização está em andamento e fica **congelada na
  finalização**. A reabertura permite recalcular, e a nova finalização congela de novo. O relatório
  usa a numeração gravada.
- **Comportamento atual**:
  - C, D e R são numeradas no aparelho;
  - as NCs seguem a ordem em que as unidades foram finalizadas;
  - o relatório refaz a numeração na montagem.
- **Motivo da diferença**: numeração previsível, que não depende da ordem de finalização, e igual
  na tela, no relatório e no termo.
- **Objetos do catálogo**: `coluna:respostas_checklist.numero_constatacao`,
  `coluna:constatacoes_manuais.numero_constatacao`, `coluna:nao_conformidades.numero_nc`,
  `coluna:determinacoes.numero_determinacao`, `coluna:recomendacoes.numero_recomendacao`
- **Origem**: —

### R-fiscalizacao-009 — Determinações

- **Comportamento desejado**: a determinação tem:
  - texto (editável);
  - prazo em dias (do item ou da constatação; padrão 30; editável pela equipe);
  - data-limite, calculada como a criação mais o prazo, como hoje;
  - número;
  - origem;
  - a NC que manda sanar.

  O cumprimento (cumprida, não cumprida, prorrogada) e o acompanhamento são do processo sancionador,
  que registra a análise nos registros dele e nunca altera a determinação (constituição, "área que
  consulta não edita").
- **Comportamento atual**:
  - a situação aceita pendente, cumprida, não cumprida e prorrogada, mas nada a muda: as 183 de
    produção estão pendentes;
  - há uma coluna antiga de prazo (data) que ninguém grava;
  - o prazo não é editável na tela.
- **Motivo da diferença**:
  - a análise da resposta do prestador é do processo sancionador;
  - a coluna antiga não é levada (A-025);
  - a equipe ajusta o prazo sem mexer no catálogo.
- **Objetos do catálogo**: `tabela:determinacoes`, `coluna:determinacoes.id`,
  `coluna:determinacoes.unidade_fiscalizada_id`, `coluna:determinacoes.descricao`,
  `coluna:determinacoes.prazo_dias`, `coluna:determinacoes.data_limite`,
  `coluna:determinacoes.prazo`, `coluna:determinacoes.status`,
  `restricao:determinacoes.determinacoes_status_check`, `coluna:determinacoes.created_at`,
  `coluna:determinacoes.updated_at`, `gatilho:public.determinacoes.update_determinacoes_updated_at`
- **Origem**: A-025 (decidido); constituição, "Extensão para outras áreas".

### R-fiscalizacao-010 — Localização

- **Comportamento desejado**: a localização é peça comum (constituição v2.6.2). Cada registro de
  campo tem um ponto com:
  - latitude e longitude;
  - precisão em metros;
  - origem (GPS do aparelho, coordenada da foto ou digitada pelo fiscal, em graus decimais ou
    graus, minutos e segundos);
  - horário.

  O ponto é pego sem rede e **nunca trava a captura** esperando precisão: grava a precisão atual e
  marca como impreciso quando passa do limite (20 m). O fiscal pode corrigir o ponto, e a origem
  passa a "digitada". O endereço pode ser sugerido pelas coordenadas e é editável.

  O app de uma câmara pluga o que depende dela sobre o ponto. A CATERF calcula rodovia, KM e sentido
  pelo traçado KML, e guarda esses dados e o "KM impreciso" no app dela. O mapa-base mostra os
  pontos da fiscalização, e o app da câmara acrescenta as camadas dele.
- **Comportamento atual**:
  - latitude e longitude numéricas convivem com um texto de coordenadas digitado;
  - a precisão e o "KM impreciso" existem só nas ocorrências da DTR;
  - a DTR nunca trava a captura esperando precisão.
- **Motivo da diferença**: decisão do responsável (2026-09-30): localização comum na fiscalização;
  KM pelo KML no app da CATERF.
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.latitude`,
  `coluna:unidades_fiscalizadas.longitude`, `coluna:unidades_fiscalizadas.coordenadas`,
  `coluna:unidades_fiscalizadas.gps_accuracy_m`, `coluna:unidades_fiscalizadas.km_impreciso`
- **Origem**: decisão do responsável, 2026-09-30; constituição v2.6.2.

### R-fiscalizacao-011 — Fotos

- **Comportamento desejado**: o fiscal fotografa pela câmera ou escolhe da galeria, também sem rede.
  Cada foto é:
  - reduzida para no máximo 1.600 px no maior lado, em JPEG, com até 5 MB depois de reduzida;
  - gravada com a data e as coordenadas da captura nos metadados da imagem;
  - marcada com as linhas de marca d'água que a câmara define. O padrão de hoje é "<código da
    unidade>, <município> - MS", "<data> <hora>" e "<coordenadas>"; o app da CATERF fornece as
    linhas com rodovia e KM.

  O sistema guarda sempre a versão com marca d'água e a versão sem marca. Cada registro tem até 20
  fotos, com legenda, e elas são reordenáveis e excluíveis. A equipe baixa as fotos de uma
  fiscalização num arquivo compactado, com duas pastas (com e sem marca d'água) e uma subpasta por
  registro, como a lista da DTR faz hoje. A ordem é a do relatório ("Figura n –
  legenda"). As fotos vão ao servidor pela fila e são entregues só a quem alcança a fiscalização,
  por endereço temporário (A-016, A-017).
- **Comportamento atual**:
  - a foto já é reduzida (1.600 px, JPEG, até 5 MB), com até 20 por unidade, legenda, ordem e
    exclusão;
  - no saneamento, a marca d'água é desenhada na captura;
  - na DTR, a marca é desenhada ao salvar a ocorrência, depois de calcular o KM;
  - a versão sem marca é guardada só às vezes;
  - a lista de fotos fica num campo da unidade;
  - a tabela de fotos de evidência não é usada;
  - o repositório de fotos é privado, mas o portal monta endereço público, que não abre.
- **Motivo da diferença**:
  - a foto sem marca preserva a imagem original como prova;
  - a marca d'água é peça da câmara (constituição v2.6.0);
  - a tabela sem uso não é levada (A-030);
  - arquivo só por endereço assinado depois de verificar o acesso (A-016, A-017).
- **Objetos do catálogo**: `coluna:unidades_fiscalizadas.fotos_unidade`,
  `restricao:unidades_fiscalizadas.unidades_fiscalizadas_fotos_is_array_check`,
  `bucket:fotos_fiscalizacao`, `tabela:fotos_evidencia`,
  `politica:public.fotos_evidencia.Fiscais e Admins: acesso total em fotos`,
  `politica:public.fotos_evidencia.Prestadores: ler suas próprias fotos`
- **Origem**: A-016, A-017, A-030 (decididos); constituição v2.6.0 e v2.6.2.

### R-fiscalizacao-012 — Finalização

- **Comportamento desejado**: o fiscal finaliza cada unidade e depois a fiscalização. A
  finalização da fiscalização pode ser feita sem rede: entra na fila e acontece no servidor quando a
  rede voltar. No servidor:
  1. consolida todas as unidades (R-fiscalizacao-007);
  2. finaliza as unidades ainda em andamento;
  3. congela a numeração (R-fiscalizacao-008);
  4. na primeira finalização, atribui o número do termo (R-fiscalizacao-013) e a data de fim;
  5. registra a finalização na auditoria e avisa a equipe e o coordenador.

  Os totais (unidades, constatações, NCs, determinações, recomendações, fotos) são calculados dos
  registros sempre que consultados, e não gravados.
- **Comportamento atual**:
  - a função do banco finaliza, conta os totais e tenta gravá-los em colunas que não existem, sem
    efeito;
  - a data de fim existente é preservada;
  - a fila offline chama a função;
  - o pedido de relatório também chama a função, com a chave de serviço;
  - quem não é da equipe recebe "acesso negado" sem erro.
- **Motivo da diferença**: totais calculados (A-025); nenhuma regra de negócio em função do banco
  (A-005); a finalização pelo relatório vira consolidação sem finalizar (R-fiscalizacao-016).
- **Objetos do catálogo**: `funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid)`
- **Origem**: A-005, A-015, A-025 (decididos).

### R-fiscalizacao-013 — Número do termo

- **Comportamento desejado**: na primeira finalização, a fiscalização recebe o próximo número de uma
  sequência anual da agência, no formato "NNN/AAAA", com o ano da data de início. O número é gravado
  uma vez e **nunca muda**, nem em reaberturas nem na exclusão de outras fiscalizações. O texto do
  documento que o exibe (ex.: "TERMO DE VISTORIA AGEMS/DSB Nº") é do layout do relatório da câmara.
  As fiscalizações migradas mantêm o número atual, e a sequência de cada ano continua do maior
  número migrado.
- **Comportamento atual**: o número é a posição da fiscalização entre todas as do ano, de todas as
  câmaras, pela ordem de criação, recalculado a cada finalização. Pode mudar se uma fiscalização
  anterior do ano for excluída e esta for finalizada de novo.
- **Motivo da diferença**: o número vai ao termo de notificação, e um número que muda invalida
  documentos já emitidos.
- **Objetos do catálogo**: `coluna:fiscalizacoes.numero_termo`
- **Origem**: anotação de `funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid)` (a spec deve
  corrigir a numeração).

### R-fiscalizacao-014 — Reabertura

- **Comportamento desejado**: o fiscal ou o coordenador da câmara reabre uma fiscalização
  finalizada, com **motivo obrigatório** e com rede. A reabertura:
  - volta a fiscalização e as unidades para "em andamento", liberando a edição;
  - mantém o número do termo e a data de fim anterior no histórico;
  - marca o relatório vigente como desatualizado, sem apagá-lo (R-fiscalizacao-016);
  - avisa a equipe;
  - fica na auditoria com o motivo.

  Finalizações pendentes na fila do aparelho para essa fiscalização são descartadas, com aviso.
- **Comportamento atual**:
  - fiscal, coordenador ou administrador com acesso à câmara reabre (desde a migration 141; antes,
    qualquer pessoa, inclusive sem login);
  - pela fila offline, sem motivo;
  - a reabertura apaga a data de fim e os trabalhos de relatório;
  - tenta de novo em caso de bloqueio do banco.
- **Motivo da diferença**: decisão do responsável (2026-09-30): fiscal e coordenador, com motivo.
  Com rede, porque invalida relatórios e disputa com finalizações pendentes; sem apagar documentos,
  porque o relatório pode já ter ido à entidade.
- **Objetos do catálogo**: `funcao:reabrir_fiscalizacao(p_fiscalizacao_id uuid)`
- **Origem**: decisão do responsável, 2026-09-30; A-015 (decidido).

### R-fiscalizacao-015 — Exclusão

- **Comportamento desejado**:
  - **unidade**: excluída só com a fiscalização em andamento, com a confirmação em dois passos de
    hoje. Leva junto respostas, constatações, saídas e fotos, e a exclusão fica na auditoria;
  - **fiscalização**: excluída só se nunca foi finalizada e não tem nenhum documento ligado
    (relatório, termo, auto, remessa). Com isso, não há número de termo a perder. Fora disso, não é
    excluída.

  Os arquivos da exclusão vão para a remoção do protocolo de sincronização, para os aparelhos
  apagarem a cópia.
- **Comportamento atual**:
  - a fiscalização é excluída em definitivo, digitando "EXCLUIR", com tudo o que pende dela em
    cascata, inclusive depois de finalizada;
  - a unidade é excluída com tudo;
  - a exclusão em cascata é auditada tabela a tabela.
- **Motivo da diferença**: fiscalização finalizada é ato registrado, com número de termo
  (Princípio I); o padrão de desativar em vez de excluir das entidades vale aqui (A-020, por
  analogia).
- **Objetos do catálogo**: `restricao:unidades_fiscalizadas.unidades_fiscalizadas_fiscalizacao_id_fkey`
- **Origem**: A-020 (decidido, por analogia).

### R-fiscalizacao-016 — Relatório da fiscalização

- **Comportamento desejado**:
  - **Geração**: a equipe pede o relatório; o aparelho envia antes as mudanças pendentes; o
    servidor consolida (sem finalizar) e gera um **único PDF**, em segundo plano, no **layout do
    relatório da câmara**. Quem pediu vê o andamento (unidades e fotos processadas) e é avisado
    quando fica pronto ou dá erro.
  - **Layout padrão da DSB** (o de hoje):
    - cabeçalho "TERMO DE VISTORIA AGEMS/DSB Nº <termo>";
    - informações da fiscalização (município, entidade, serviços, fiscal, datas);
    - resumo executivo;
    - uma seção por unidade (identificação, endereço, coordenadas, data e hora; constatações, NCs,
      determinações com prazo, recomendações; registros fotográficos numerados "Figura n –
      legenda");
    - paginação.
  - **Layouts de outras câmaras**: fornecidos pelo app da câmara (a CATERF traz o laudo de rodovia).
  - **Versões**: cada relatório gerado fica guardado, com versão, data e quem pediu. O mais recente
    pronto é o **vigente**, e os anteriores ficam **substituídos**. A reabertura marca o vigente como
    **desatualizado**. Nenhum relatório é apagado.
  - **Entrega**: o arquivo é entregue só a quem alcança a fiscalização, por endereço temporário.
    Relatório de fiscalização em andamento pode ser gerado e mostra a situação.
- **Comportamento atual**:
  - o pedido cria um trabalho na fila, que funções externas processam;
  - o PDF sai em até 7 partes, que o navegador baixa e junta;
  - uma nova geração limpa a pasta, e só o último fica;
  - a reabertura apaga os trabalhos;
  - qualquer usuário ativo lê a fila;
  - o disparo do processamento usa uma extensão de requisição HTTP e segredos do cofre do banco;
  - o layout da DTR é um modelo à parte no mesmo código.
- **Motivo da diferença**:
  - preservar o que foi enviado à entidade (decisão do responsável, 2026-09-30);
  - partes juntadas no navegador eram contorno do limite das funções externas, e o servidor
    próprio gera um arquivo só;
  - layout de câmara fora do app comum (constituição v2.6.0);
  - o processamento em segundo plano usa a fila do sistema novo (Celery).
- **Objetos do catálogo**: `tabela:relatorios_jobs`, `coluna:relatorios_jobs.id`,
  `coluna:relatorios_jobs.fiscalizacao_id`, `coluna:relatorios_jobs.requested_by`,
  `coluna:relatorios_jobs.status`, `coluna:relatorios_jobs.progress_unidades`,
  `coluna:relatorios_jobs.progress_fotos`, `coluna:relatorios_jobs.error_message`,
  `coluna:relatorios_jobs.storage_path`, `coluna:relatorios_jobs.parts_count`,
  `coluna:relatorios_jobs.created_at`, `coluna:relatorios_jobs.updated_at`,
  `gatilho:public.relatorios_jobs.trg_audit_relatorios_jobs`, `bucket:relatorios_fiscalizacao`,
  `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_0`,
  `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_1`,
  `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_2`,
  `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_3`,
  `funcao:claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`,
  `funcao:kick_relatorios_worker(p_job_id uuid, p_limit integer)`, `extensao:pg_net`,
  `extensao:supabase_vault`, `segredo:RELATORIOS_INVOKE_APIKEY`, `segredo:RELATORIOS_WORKER_SECRET`
- **Origem**: decisão do responsável, 2026-09-30; A-016 (decidido); constituição, "Stack
  obrigatória".

### R-fiscalizacao-017 — Trabalho sem rede

- **Comportamento desejado**: sem rede, o fiscal:
  - inicia a fiscalização a partir da atividade;
  - adiciona, edita, reordena e exclui unidades e respostas;
  - trabalha com constatações, determinações, recomendações, fotos e pontos;
  - finaliza unidades e a fiscalização.

  Tudo entra na fila do aparelho, com o identificador gerado nele, e vai ao servidor pelo protocolo
  do core (R-core-021). O aparelho mostra o que falta enviar, por fiscalização, e permite enviar uma
  fiscalização específica.

  Garantias (Princípio II):
  - a fila nunca é apagada por sessão encerrada, renovação recusada ou atualização do app;
  - limpar os dados do aparelho é recusado enquanto houver operação ou foto não enviada;
  - trabalho de uma fiscalização excluída no servidor é mantido e pode ser enviado como fiscalização
    nova, ligada à mesma atividade;
  - com usuário desativado, o aparelho exporta a fila para arquivo, e o administrador a importa em
    nome do autor, com auditoria (o autor original e quem importou).

  Pedir relatório, reabrir, ver indicadores, exportar e importar exigem rede.
- **Comportamento atual**:
  - tudo já é feito offline, com fila de mutações e fila de fotos, envio por fiscalização e
    bloqueio de limpeza com pendências;
  - a fiscalização excluída no servidor com trabalho local é recriada no aparelho com
    identificadores novos;
  - o aparelho baixa a fiscalização inteira de novo a cada mudança numa unidade (gatilhos de
    propagação);
  - a reabertura também vai pela fila.
- **Motivo da diferença**: o protocolo do core baixa só o que mudou; a fila de usuário desativado
  tinha só a regra do core de não apagar (R-core-006), e agora tem caminho de envio.
- **Objetos do catálogo**: `funcao:propagate_modification_to_parent()`,
  `gatilho:public.unidades_fiscalizadas.trg_propagate_unidades`,
  `gatilho:public.respostas_checklist.trg_propagate_respostas`,
  `gatilho:public.constatacoes_manuais.trg_propagate_constatacoes`,
  `gatilho:public.determinacoes.trg_propagate_determinacoes`,
  `gatilho:public.recomendacoes.trg_propagate_recomendacoes`
- **Origem**: constituição, Princípio II; R-core-006, R-core-021.

### R-fiscalizacao-018 — Indicadores

- **Comportamento desejado**: a tela de indicadores filtra por ano, período, serviço, município e
  entidade. Ela conta, das fiscalizações no alcance do usuário (R-fiscalizacao-003):
  - fiscalizações (total e finalizadas);
  - das finalizadas:
    - unidades;
    - fotos;
    - constatações (respostas com texto de constatação mais constatações manuais);
    - NCs;
    - conformidades (constatações menos NCs);
    - determinações e recomendações;
  - distribuição por serviço, vistorias por mês e ranking dos 10 municípios com mais
    determinações.

  O diretor vê por padrão os painéis da diretoria, por câmara e juntos (R-core-012). O painel é
  exportável em PDF e JSON. Painéis próprios de uma câmara (na DTR, NCs por rodovia e ocorrências
  por frente) são registrados pelo app dela nas telas do core (R-core-025). A fiscalização registra
  no início de cada papel o painel "Últimas fiscalizações" e, com o planejamento, o painel planejado
  × executado (R-planejamento-021).
- **Comportamento atual**:
  - a função do banco calcula os mesmos indicadores com permissão elevada, sem filtrar por câmara;
  - a tela filtra pela diretoria do usuário ou pela câmara escolhida pelo administrador;
  - há uma versão antiga da função sem uso;
  - os painéis da DTR estão na mesma tela.
- **Motivo da diferença**: isolamento por câmara (A-026); nenhuma regra em função do banco (A-005);
  painéis de câmara fora do app comum (constituição v2.6.0).
- **Objetos do catálogo**: `funcao:obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])`,
  `funcao:obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)`
- **Origem**: A-005, A-026, A-035 (decididos); R-core-012, R-core-025.

### R-fiscalizacao-019 — Relatório consolidado da lista

- **Comportamento desejado**: da lista de fiscalizações filtrada, a equipe emite um PDF consolidado
  (uma linha por fiscalização, com totais), gerado no servidor pelo mesmo motor de documentos do
  relatório e do cronograma do planejamento, só com o que o usuário alcança.
- **Comportamento atual**: o PDF consolidado é montado no navegador, com o que o aparelho tem.
- **Motivo da diferença**: um só motor de documentos (research do planejamento, P9); o conteúdo
  respeita o alcance no servidor.
- **Objetos do catálogo**: `tabela:fiscalizacoes`
- **Origem**: —

### R-fiscalizacao-020 — Exportar e importar

- **Comportamento desejado**: só o administrador exporta e importa.
  - **Exportar**: as fiscalizações escolhidas (padrão: as finalizadas no filtro), num arquivo com
    os dados da fiscalização e de tudo o que pende dela, e com as fotos referenciadas por endereço
    temporário ou incluídas no pacote.
  - **Importar**: o arquivo passa pelas **mesmas validações das telas** (entidade, município,
    catálogo e câmara existentes, serviços da câmara). Antes de gravar, mostra a prévia do que será
    criado e os erros. As fiscalizações importadas ganham identificadores novos e ficam marcadas com
    a origem (arquivo, data, quem importou), e as fotos são enviadas de novo e conferidas por
    checksum. Tudo fica na auditoria.
  - **Fora da importação**: dados de outros apps que venham no arquivo (termos de notificação) não
    são importados pela fiscalização; cada app dono importa os seus.
- **Comportamento atual**:
  - a exportação gera um JSON com as fiscalizações finalizadas, as unidades, as respostas, as NCs,
    as determinações, as recomendações, as constatações manuais, os termos e a lista de fotos;
  - a importação grava tudo direto no banco, com identificadores novos, sem prévia, e reenvia as
    fotos pela lista de endereços;
  - a tela é aberta pelo gerenciamento de usuários.
- **Motivo da diferença**: decisão do responsável (2026-09-30) de manter as duas, com a importação
  passando pelas regras; os termos são do processo sancionador (constituição, "Todo dado tem um app
  dono").
- **Objetos do catálogo**: `tabela:fiscalizacoes`, `tabela:unidades_fiscalizadas`
- **Origem**: decisão do responsável, 2026-09-30.

### R-fiscalizacao-021 — Histórico

- **Comportamento desejado**: o histórico de uma fiscalização mostra, a quem a alcança, as
  alterações dela e de tudo o que pende dela, com autor, data, antes e depois, pela auditoria do
  core (R-core-022). Inclui finalizações, reaberturas com o motivo, relatórios gerados, ligações de
  urgência e importações.
- **Comportamento atual**: a tela mostra a auditoria da fiscalização e das unidades; relatórios
  pedidos e excluídos entram na auditoria.
- **Motivo da diferença**: —
- **Objetos do catálogo**: `gatilho:public.fiscalizacoes.trg_audit_fiscalizacoes`,
  `gatilho:public.unidades_fiscalizadas.trg_audit_unidades`,
  `gatilho:public.respostas_checklist.trg_audit_respostas`,
  `gatilho:public.constatacoes_manuais.trg_audit_constatacoes`,
  `gatilho:public.determinacoes.trg_audit_determinacoes`,
  `gatilho:public.recomendacoes.trg_audit_recomendacoes`
- **Origem**: R-core-022.

### R-fiscalizacao-022 — Consultas para os outros apps

- **Comportamento desejado**: a fiscalização oferece consultas de leitura, com o alcance aplicado:
  - **ao processo sancionador**: fiscalização finalizada com número do termo, unidades, NCs,
    determinações (texto, prazo, data-limite) e o relatório vigente, para o termo, o
    acompanhamento e os autos;
  - **ao portal do prestador**: o que a spec do portal definir, depois do termo (A-027);
  - **ao planejamento e ao painel planejado × executado**: as fiscalizações com a atividade
    ligada;
  - **aos apps de câmara**: os registros de campo das fiscalizações da câmara, e a escrita do
    registro avulso (R-fiscalizacao-004).

  Nenhum desses apps altera a fiscalização; as ações deles são registradas nos seus próprios
  registros (constituição, "Extensão para outras áreas").
- **Comportamento atual**: as telas de termos, acompanhamento e autos leem as tabelas da
  fiscalização direto, e o acompanhamento lê as determinações com as respostas do prestador.
- **Motivo da diferença**: constituição v2.5.0 e v2.6.0 (consultas como único ponto de entrada).
- **Objetos do catálogo**: `tabela:determinacoes`, `tabela:nao_conformidades`
- **Origem**: constituição, "Independência entre apps" e "Extensão para outras áreas".

### R-fiscalizacao-023 — Avisos

- **Comportamento desejado**: a fiscalização registra os tipos de aviso dela na central do core
  (R-core-026) e manda:
  - relatório pronto ou com erro (a quem pediu);
  - fiscalização finalizada (ao coordenador e à equipe);
  - fiscalização reaberta, com o motivo (à equipe);
  - fiscalização de urgência pendente de ligação (ao coordenador e ao diretor);
  - fila de aparelho importada pelo administrador (ao autor).
- **Comportamento atual**: não há avisos.
- **Motivo da diferença**: R-core-026.
- **Objetos do catálogo**: — (conceito novo)
- **Origem**: decisão do responsável, 2026-09-30 (central de avisos).

### R-fiscalizacao-024 — Campos e objetos sem uso não são levados

- **Comportamento desejado**: o sistema novo não tem:
  - os pontos de início da visita que o app não grava;
  - o nome do tipo de unidade copiado e não gravado;
  - os totais gravados (são calculados);
  - a coluna antiga de prazo da determinação;
  - a gravidade fixa e as fotos e a localização sem uso da NC;
  - o comentário antigo da resposta;
  - a tabela de fotos de evidência;
  - as funções sem uso;
  - as colunas de "quem alterou por último" (a auditoria responde).
- **Comportamento atual**: esses campos existem, vazios, com valor fixo ou sem leitura.
- **Motivo da diferença**: campos sem uso confundem quem mantém (A-025, A-030, A-035).
- **Objetos do catálogo**: `coluna:fiscalizacoes.latitude_inicio`, `coluna:unidades_fiscalizadas.tipo_unidade_nome`,
  `coluna:unidades_fiscalizadas.total_determinacoes`, `coluna:determinacoes.prazo`,
  `coluna:nao_conformidades.gravidade`, `tabela:fotos_evidencia`, `funcao:determinacoes_fill_origem()`
- **Origem**: A-025, A-030, A-035 (decididos); divergências `coluna:unidades_fiscalizadas.total_determinacoes`
  e `coluna:unidades_fiscalizadas.total_recomendacoes` (defeito_corrigir).

### R-fiscalizacao-025 — Nada de câmara dentro do app de fiscalização

- **Comportamento desejado**: o app de fiscalização não tem layout de relatório, marca d'água,
  campo, painel, texto ou regra de uma câmara específica. O que é de câmara é peça plugada pelo app
  dela ou configuração:
  - layout do relatório e linhas da marca d'água;
  - dados próprios do registro avulso e enriquecimento do ponto (KM);
  - painéis de indicadores.

  O padrão de hoje da DSB é entregue como configuração inicial das câmaras da DSB, e não como
  código. Um teste automatizado falha se o app citar uma câmara, e outro prova que um app de câmara
  de teste pluga layout, marca d'água e registro avulso sem alterar o app de fiscalização.
- **Comportamento atual**:
  - o código separa DSB e DTR por `tipo_modulo`;
  - o relatório tem um gerador DSB e um DTR no mesmo código;
  - a marca d'água muda conforme o módulo;
  - as colunas da DTR estão na tabela de unidades.
- **Motivo da diferença**: constituição v2.6.0 a v2.6.2, "Apps comuns como motores genéricos".
- **Objetos do catálogo**: `coluna:fiscalizacoes.tipo_modulo`, `coluna:fiscalizacoes.rodovia`,
  `coluna:unidades_fiscalizadas.tipo_ocorrencia`
- **Origem**: constituição v2.6.2.

## Telas do sistema atual

Ações das telas atuais que pertencem ao módulo, no molde `formatos/spec-modulo.md` da spec 003.
Fonte: `src/pages/` e `src/components/fiscalizacao/` do sistema atual.

### Lista de fiscalizações (`src/pages/Fiscalizacoes.jsx`)

| Ação | Regra |
|---|---|
| Buscar por código, município ou fiscal; filtrar por situação, serviço e datas; limpar filtros | R-fiscalizacao-003 |
| Nova fiscalização (e "Iniciar primeira fiscalização") | R-fiscalizacao-002 |
| Expandir o cartão com os totais | R-fiscalizacao-012 (totais calculados) |
| Sincronizar uma fiscalização, com progresso | R-fiscalizacao-017 |
| Gerar e baixar o relatório | R-fiscalizacao-016 |
| Ver o histórico de alterações | R-fiscalizacao-021 |
| PDF consolidado da lista | R-fiscalizacao-019 |
| Finalizar fiscalização, com confirmação | R-fiscalizacao-012 |
| "Reabrir Edição" | R-fiscalizacao-014 (com motivo) |
| Excluir permanentemente, digitando "EXCLUIR" | R-fiscalizacao-015 (só nunca finalizada e sem documentos) |
| Separar DSB e DTR pelo tipo de módulo; administrador escolhe a câmara pelo endereço | R-fiscalizacao-003, R-fiscalizacao-025 |

### Nova fiscalização (`src/pages/NovaFiscalizacao.jsx`)

| Ação | Regra |
|---|---|
| Escolher município, entidade e serviços | R-fiscalizacao-002 (vêm da atividade planejada, com os destinos) |
| Link "Novo" para cadastrar entidade | fora: core (R-core-016) |
| Capturar e recapturar a posição GPS (não gravada) | R-fiscalizacao-024 (retirada: o ponto é do registro de campo) |

### Executar fiscalização (`src/pages/ExecutarFiscalizacao.jsx`)

| Ação | Regra |
|---|---|
| Listar as unidades com situação | R-fiscalizacao-004 |
| Adicionar unidade | R-fiscalizacao-004 |
| Reordenar unidades arrastando | R-fiscalizacao-004, R-fiscalizacao-008 |
| Editar unidade (abre a vistoria) | R-fiscalizacao-005 |
| Excluir unidade, com os dados do checklist e as fotos | R-fiscalizacao-015 |
| Finalizar fiscalização | R-fiscalizacao-012 |

### Adicionar unidade (`src/pages/AdicionarUnidade.jsx`)

| Ação | Regra |
|---|---|
| Escolher o tipo de unidade (filtrado pelos serviços) | R-fiscalizacao-004; R-checklists-002 |
| Código sugerido a partir do código do tipo; nome; endereço | R-fiscalizacao-004 |
| Coordenadas digitadas (graus, minutos e segundos) ou pelo GPS | R-fiscalizacao-010 |

### Vistoriar unidade (`src/pages/VistoriarUnidade.jsx` e componentes)

| Ação | Regra |
|---|---|
| Editar nome, código, endereço, coordenadas, data e hora da vistoria | R-fiscalizacao-004, R-fiscalizacao-010 |
| Responder Sim ou Não a cada item, com observação | R-fiscalizacao-005 |
| Editar o texto da constatação do checklist; excluir a constatação | R-fiscalizacao-005 |
| Link "Configurar checklist" | fora: checklists (spec 005) |
| Adicionar, editar, excluir e reordenar constatação manual; definir NC, dispositivo, texto da NC, determinação ou recomendação (`EditarNCModal`) | R-fiscalizacao-006 |
| Adicionar determinação ligada a uma constatação; editar o texto; excluir | R-fiscalizacao-007, R-fiscalizacao-009 |
| Adicionar, editar, excluir e reordenar recomendação | R-fiscalizacao-007, R-fiscalizacao-008 |
| Tirar ou escolher fotos, legenda, reordenar, excluir; limite de 20 (`PhotoGrid`) | R-fiscalizacao-011 |
| Finalizar unidade ("Sim, Finalizar") | R-fiscalizacao-012 |
| Salvar alterações em modo de edição de unidade finalizada | R-fiscalizacao-004, R-fiscalizacao-014 |

### Relatórios e indicadores (`src/pages/Relatorios.jsx`)

| Ação | Regra |
|---|---|
| Filtrar por ano, serviço, município e entidade; selecionar todos; limpar | R-fiscalizacao-018 |
| Painéis de fiscalizações, unidades, fotos, constatações, conformidade, NCs, determinações, recomendações, por serviço, por mês, ranking de municípios | R-fiscalizacao-018 |
| Exportar o painel em PDF e JSON | R-fiscalizacao-018 |
| Painéis de rodovias, frentes e tipos de ocorrência | fora: dtr (app da CATERF, R-core-025) |

### Exportar e importar (`src/pages/ExportarImportar.jsx`)

| Ação | Regra |
|---|---|
| Exportar as fiscalizações finalizadas em JSON | R-fiscalizacao-020 |
| Importar um arquivo exportado (grava direto, reenvia fotos, inclui termos) | R-fiscalizacao-020 (com prévia e validações; termos ficam com o processo sancionador) |

### Outras telas

| Tela | Ação | Regra |
|---|---|---|
| Início (`src/pages/Home.jsx`) | Últimas fiscalizações; "Nova Fiscalização"; "Ver todas" | R-fiscalizacao-018 (painel registrado no início, R-core-025) |
| Acompanhamento de determinações (`src/pages/AcompanhamentoDeterminacoes.jsx`) | Vencidas, a vencer, respondidas, análises | fora: processo_sancionador (lê as determinações pela consulta, R-fiscalizacao-022) |
| Telas da DTR (`FiscalizacoesDTR.jsx`, `NovaFiscalizacaoDTR.jsx`, `ExecutarFiscalizacaoDTR.jsx`, `VistoriarOcorrenciaDTR.jsx`) | Fiscalização e registro de ocorrências na rodovia | fora: dtr (app da CATERF, sobre R-fiscalizacao-004, R-fiscalizacao-010 e R-fiscalizacao-016) |

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Iniciar a fiscalização a partir da atividade planejada; iniciar urgência com motivo; ligar a urgência a uma viagem extra | R-fiscalizacao-002 |
| Ver a equipe da fiscalização | R-fiscalizacao-001 |
| Editar o prazo da determinação | R-fiscalizacao-009 |
| Ver as versões do relatório (vigente, substituídas, desatualizadas) | R-fiscalizacao-016 |
| Informar o motivo da reabertura | R-fiscalizacao-014 |
| Exportar a fila do aparelho de usuário desativado; importar a fila (administrador) | R-fiscalizacao-017 |
| Ver a prévia da importação | R-fiscalizacao-020 |

## Migração

Mapa: `specs/003-base-dados-producao/anotacoes/migracao/fiscalizacao.toml` (115 colunas e
repositórios, 87 com destino e 28 descartes, 0 pendentes, destinos conferidos contra o data-model
do plano).

### Volumes de produção

| Origem | Registros ou arquivos | Destino |
|---|---:|---|
| `tabela:fiscalizacoes` | 26 (19 finalizadas, 7 em andamento) | Fiscalização (origem "migrada", sem atividade planejada) |
| `tabela:unidades_fiscalizadas` | 402 (324 de saneamento, 78 ocorrências da DTR) | Registro de campo; os dados da DTR vão ao app da CATERF |
| `tabela:respostas_checklist` | 3.454 | Resposta, ligada à versão do item migrada (spec 005) |
| `tabela:constatacoes_manuais` | 299 | Constatação manual |
| `tabela:nao_conformidades` | 478 | Não conformidade, com a origem reconstruída |
| `tabela:determinacoes` | 183 | Determinação |
| `tabela:recomendacoes` | 350 | Recomendação |
| `tabela:relatorios_jobs` | 18 | Relatório (versões) |
| `bucket:fotos_fiscalizacao` | 1.445 arquivos | Fotos dos registros |
| `bucket:relatorios_fiscalizacao` | 43 arquivos | Arquivos das versões de relatório |
| `tabela:fotos_evidencia` | 0 | não levada (A-030) |

### Critérios

| Critério | Meta |
|---|---|
| MIG-1 Registros | 100% dos registros acima chegam com o mesmo identificador (exceto os de teste do A-002, com o motivo no relatório) |
| MIG-2 Valores | Em 100% dos registros, cada campo migrado é igual ao da origem depois da transformação do mapa; os números de termo, NC, C, D e R migram como estão e não são recalculados |
| MIG-3 Arquivos | Os 1.445 arquivos de fotos e os 43 relatórios chegam com o mesmo checksum, ligados ao mesmo registro; a ordem e as legendas das fotos são mantidas |
| MIG-4 Legados | Fiscalização sem câmara, com município ou entidade inexistentes, unidade com tipo inexistente, resposta sem versão de item e NC sem origem reconhecível são carregadas e marcadas, nunca recusadas, e listadas no relatório |
| MIG-5 Descartes | Os campos da R-fiscalizacao-024 descartados com volume listado |
| MIG-6 Mapa | 0 pendentes em `fiscalizacao.toml`, com os destinos conferidos contra o data-model |

### Casos conhecidos

- **Respostas e versões**: 100% das 3.454 respostas precisam encontrar a versão do item na migração
  dos checklists (spec 005, "Ligação com as vistorias").
- **Ocorrências da DTR**: as 78 unidades de fiscalizações da DTR viram registros avulsos, e as
  colunas da rodovia vão ao app da CATERF, que liga cada ocorrência ao tipo do catálogo (spec 005,
  premissa "Migração da DTR").
- **Relatórios em partes**: os relatórios de produção em partes (até 7 arquivos) são migrados como
  estão, numa versão com várias partes, e marcados como legado.
- **Fiscalizações migradas sem planejamento**: as 26 migram sem atividade planejada, com a origem
  "migrada", e não contam como pendência de ligação.
- **Fila dos aparelhos**: a virada exige nenhum aparelho com fila pendente (constituição, portões);
  o procedimento é da spec de migração e virada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das fiscalizações criadas no sistema novo estão ligadas a uma atividade aprovada
  do planejamento, ou são urgências com motivo pendentes de ligação, visíveis ao coordenador e ao
  diretor.
- **SC-002**: Uma vistoria completa feita sem rede (fiscalização, 5 unidades, respostas, constatações,
  20 fotos, finalização) chega ao servidor sem perda, conferida item a item.
- **SC-003**: Consolidar a mesma unidade duas vezes produz os mesmos registros, com os mesmos
  identificadores e as edições preservadas.
- **SC-004**: O número do termo de uma fiscalização não muda em 100% dos casos de reabertura e de
  exclusão de outras fiscalizações.
- **SC-005**: Em teste com usuários de duas câmaras, um servidor liberado de outra câmara, um diretor
  e um prestador sem termo, 0 registros fora do alcance de cada um são alcançados por qualquer
  caminho, inclusive fotos e relatórios.
- **SC-006**: O relatório de uma fiscalização com 40 fotos sai num único PDF, e 100% das versões
  geradas continuam disponíveis depois de novas gerações e de reaberturas.
- **SC-007**: O fiscal registra uma foto com marca d'água e coordenadas em menos de 5 segundos no
  aparelho, com ou sem rede, e o GPS nunca impede a captura.
- **SC-008**: Um app de câmara de teste pluga layout de relatório, marca d'água e registro avulso
  com 0 alterações no app de fiscalização.
- **SC-009**: Os indicadores de um coordenador contam 0 fiscalizações de outra câmara.
- **SC-010**: 100% das regras de acesso deste módulo têm teste automatizado.
- **SC-011**: Toda ação das telas atuais do módulo tem regra ou destino em outro módulo (0
  `LACUNA`).

## Assumptions

- **Data-limite da determinação**: continua como a criação mais o prazo, como hoje. Se a spec do
  processo sancionador contar o prazo a partir da ciência do termo, ela calcula nos registros dela,
  sem mudar a determinação.
- **Limite de imprecisão do GPS**: 20 m, o de hoje na DTR, para todas as câmaras; configurável pela
  câmara se preciso.
- **Foto sem marca d'água**: guardar as duas versões dobra o armazenamento das fotos (hoje cerca de
  461 MB), o que cabe na infraestrutura própria.
- **Sequência do número do termo**: uma só para a agência por ano, como hoje; o texto do documento
  (DSB, DTR) vem do layout da câmara.
- **Unidade de viagem conjunta**: cada câmara tem a sua fiscalização; não há fiscalização com duas
  câmaras.
- **Equipe da urgência**: informada pelo coordenador entre os servidores da câmara; servidor de
  outra câmara só depois da ligação a uma viagem extra aprovada, pela liberação do planejamento.
- **Exportação**: o formato do arquivo é definido no plano; ele contém os dados e as fotos para a
  importação conferir por checksum.
- **Painel planejado × executado**: definido na spec do planejamento (R-planejamento-021) e
  registrado por este app, que lê as duas fontes.
