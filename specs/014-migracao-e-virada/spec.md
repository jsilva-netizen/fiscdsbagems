# Feature Specification: Migração de dados e virada para o sistema novo

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-10-01

**Status**: Draft

**Input**: Spec transversal, item 3 da proposta de migração de 2026-09-30:
- item 1: mapa de migração coluna a coluna, na spec 003;
- item 2: seção "Migração" em cada spec de módulo;
- **item 3** (esta spec): orquestrar a carga e a troca de sistema.

As regras usam o prefixo `R-virada`. Fontes:
- a constituição v2.6.2: Princípio I (preservação integral), Princípio II (operação offline),
  Princípio IV (produção intocada, virada única) e os seis portões antes da virada;
- a spec 003 (inventário, mapas de migração, achados);
- as seções "Migração" e as decisões de migração dos planos das specs 004 a 013;
- o sistema atual: o "backup local" do aplicativo leva a fila de envio e as fotos pendentes.

Decisões do responsável (2026-10-01):
- a janela de indisponibilidade aceitável é de até 2 dias úteis;
- depois da virada, o sistema atual fica só para leitura, sem prazo para sair do ar;
- o responsável aprova a virada.

## Contexto

O sistema novo é construído em paralelo, e o atual continua em produção até a virada, que é um
passo único, preparado e verificado (Princípio IV). Até lá, o levantamento garantiu que **todo dado
tem para onde ir**:
- os 1.264 objetos do banco de produção têm dono;
- as 456 colunas de tabela e repositórios de arquivos têm destino ou descarte com motivo: 431 nos 6
  mapas de módulo e 25 fora do escopo, com 0 pendências e 0 destinos sem verificação contra os
  modelos de dados.

Falta garantir que **cada dado chegou, e chegou certo**, e que a troca aconteça sem perder o
trabalho de campo que ainda está nos aparelhos. Esta spec define:
- a ordem de carga;
- o relatório único de conferência;
- os ensaios;
- o congelamento do sistema atual;
- o procedimento dos aparelhos;
- o critério de volta;
- a verificação dos seis portões da constituição.

**Volumes de produção** (inventário de 2026-09-29):
- 26 fiscalizações, 402 unidades, 3.454 respostas de checklist e 768 versões de itens;
- 19.966 registros de auditoria;
- 5 termos de notificação, 2 processos da CATERS e 27 recomendações acompanhadas;
- 8 contas de usuário;
- 1.554 arquivos (cerca de 1 GB) em 8 repositórios.

**Quem faz o quê**: toda operação no sistema atual (congelar, gerar o dump, copiar os arquivos,
reabrir) é feita pelo responsável, com roteiros revisados e testados nos ensaios. O sistema novo e
as ferramentas de migração nunca escrevem no sistema atual: só leem o dump e a cópia dos arquivos
(Princípio IV).

Fica fora desta spec: as regras de transformação de cada módulo (seções "Migração" e planos das
specs 004 a 013) e a operação do sistema novo depois da virada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ensaiar a migração até ela passar sem pendência (Priority: P1)

O responsável pede um dump novo de produção e a cópia dos arquivos. A equipe refaz o inventário,
carrega tudo num ambiente de homologação na ordem definida e gera o relatório de conferência. Cada
falha vira correção, e o ensaio se repete até o relatório sair sem pendência e no tempo da janela.

**Why this priority**: é o único jeito de chegar à virada sabendo que ela funciona; a produção muda
entre os ensaios.

**Independent Test**: com o dump de um dia qualquer, o ensaio carrega os 8 módulos com dados e gera
o relatório. Todos os registros e arquivos aparecem conferidos ou com motivo listado. O tempo total
fica registrado e cabe em 2 dias úteis com folga.

**Acceptance Scenarios**:

1. **Given** um dump novo, **When** o inventário refeito mostra objeto sem anotação ou coluna sem
   destino, **Then** o ensaio não começa até a spec 003 e os mapas serem atualizados.
2. **Given** um ensaio, **When** um valor migrado difere do esperado pelo mapa, **Then** o relatório
   mostra o registro, o campo, o valor de origem, o esperado e o obtido.
3. **Given** dois ensaios seguidos com o mesmo dump, **When** os relatórios são comparados, **Then**
   são idênticos.

---

### User Story 2 - Esvaziar a fila de cada aparelho antes do congelamento (Priority: P1)

Antes da data da virada, cada usuário de campo sincroniza o aplicativo atual com rede e baixa o
backup local. Uma ferramenta lê o arquivo e confirma que não há operação nem foto pendente. O
aparelho só é dado como liberado com essa confirmação registrada. O congelamento só começa com
todos os aparelhos liberados.

**Why this priority**: dado que existe só no aparelho é dado de produção (Princípio II); é o portão
2 da constituição.

**Independent Test**: com 6 aparelhos cadastrados, 5 enviam um backup sem pendência e 1 envia um com
3 operações pendentes. A lista mostra 5 liberados e 1 bloqueado, com as 3 operações. O usuário
sincroniza de novo e reenvia: o aparelho é liberado, e o congelamento pode começar.

**Acceptance Scenarios**:

1. **Given** um backup com operação ou foto pendente, **When** é conferido, **Then** o aparelho fica
   bloqueado, com a lista do que falta enviar.
2. **Given** um aparelho que não pode sincronizar (usuário desligado, aparelho sem acesso),
   **When** chega o dia do congelamento, **Then** o backup dele é guardado e o trabalho pendente é
   carregado no sistema novo depois da migração, com conferência e o autor original.
3. **Given** algum aparelho sem confirmação, **When** o responsável tenta iniciar o congelamento,
   **Then** a lista de verificação da virada mostra o portão 2 aberto.

---

### User Story 3 - Executar a virada (Priority: P1)

No dia marcado, o responsável congela o sistema atual (só leitura), gera o dump final e copia os
arquivos. A equipe carrega tudo no sistema novo e gera o relatório. O responsável confere os seis
portões e aprova. O sistema novo abre para os usuários, e o sistema atual continua só para leitura.

**Why this priority**: é o objetivo da spec.

**Independent Test**: no ensaio geral, a sequência inteira roda com os roteiros reais em
homologação, do congelamento à abertura, dentro de 2 dias úteis. A aprovação é registrada com o
relatório, e os usuários entram no sistema novo pelo primeiro acesso com código.

**Acceptance Scenarios**:

1. **Given** o sistema atual congelado, **When** qualquer usuário tenta gravar nele, **Then** a
   gravação é recusada, e a leitura continua.
2. **Given** o relatório com alguma pendência não aceita, **When** o responsável avalia, **Then** a
   virada não é aprovada.
3. **Given** a virada aprovada, **When** o sistema novo abre, **Then** os usuários entram com o
   primeiro acesso por código, e as tarefas automáticas (avisos de prazo) não disparam avisos de
   prazos que já tinham vencido antes da virada.

---

### User Story 4 - Voltar atrás antes do ponto de não retorno (Priority: P2)

Se a carga ou a conferência falhar, ou a janela estourar, antes de o sistema novo abrir, o
responsável cancela a virada: reabre o sistema atual para escrita, e o trabalho segue como antes. A
equipe guarda o relatório da tentativa para corrigir e marcar nova data.

**Why this priority**: a alternativa a uma virada reversível até o fim é ficar indisponível por
tempo indeterminado (Princípio IV).

**Independent Test**: no ensaio, a conferência é forçada a falhar; o roteiro de volta reabre o
ambiente que simula o sistema atual para escrita em menos de 1 hora, e nada do sistema novo foi
exposto aos usuários.

**Acceptance Scenarios**:

1. **Given** a virada em andamento sem o sistema novo aberto, **When** o responsável decide voltar,
   **Then** o sistema atual é reaberto para escrita, e os aparelhos voltam a sincronizar com ele.
2. **Given** o sistema novo já aberto e com a primeira gravação de usuário, **When** surge um
   problema, **Then** não se volta ao sistema atual; o problema é corrigido no sistema novo.

---

### Edge Cases

- **Produção muda entre o último ensaio e a virada** (correção crítica aplicada): o inventário é
  refeito antes do dump final, e qualquer diferença trava a virada até a spec 003 e os mapas serem
  atualizados e ensaiados.
- **Arquivo do repositório que falta ou está corrompido na cópia**: entra no relatório; a virada não
  é aprovada sem decisão do responsável para cada um.
- **Arquivo sem registro que aponte para ele** (ex.: os 5 de autos, A-018): listado para decisão;
  não migra sem decisão.
- **Dados de teste descobertos depois da lista fechada**: entram na lista antes do dump final; nunca
  são apagados do sistema atual.
- **Aparelho usado por dois usuários ou em duas diretorias**: um backup por usuário e por diretoria
  em que ele trabalha, porque o backup do aplicativo atual filtra pela diretoria.
- **Usuário sem e-mail válido**: não consegue o primeiro acesso; é listado antes da virada para o
  administrador corrigir no core.
- **Janela estourando**: no marco de 1,5 dia útil sem relatório aprovável, o responsável decide
  entre seguir com o tempo restante e voltar atrás.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A carga MUST seguir a ordem da R-virada-002, e cada etapa MUST conferir as
  pré-condições da anterior antes de começar.
- **FR-002**: O relatório de conferência MUST cobrir 100% dos registros e arquivos de origem, cada um
  como conferido, descartado com motivo, legado marcado ou pendente (R-virada-003).
- **FR-003**: A virada MUST NOT ser aprovada com item pendente no relatório sem decisão registrada do
  responsável (R-virada-003, R-virada-009).
- **FR-004**: Cada ensaio MUST partir de um dump novo e de um inventário refeito, e MUST registrar o
  tempo de cada etapa (R-virada-004).
- **FR-005**: O congelamento MUST NOT começar com aparelho sem confirmação de fila vazia (R-virada-006).
- **FR-006**: O sistema atual MUST recusar gravações durante o congelamento e depois da virada, e MUST
  continuar disponível para leitura sem prazo (R-virada-005, R-virada-010).
- **FR-007**: Até o ponto de não retorno, a virada MUST poder ser desfeita por roteiro testado
  (R-virada-008).
- **FR-008**: As ferramentas de migração MUST ler só o dump e a cópia dos arquivos, nunca o sistema
  atual (R-virada-001).
- **FR-009**: Os dados de teste da lista fechada MUST ficar fora da carga, com o volume no relatório
  (R-virada-007).

### Key Entities

- **Ensaio**: data, dump e inventário usados, tempo de cada etapa, relatório, falhas e correções.
- **Relatório de conferência**: por módulo e no total, contagens, conferidos, descartes, legados,
  pendências, arquivos e ligações; com a assinatura de aprovação.
- **Confirmação de aparelho**: usuário, aparelho, diretoria, data, arquivo de backup (com checksum),
  resultado (liberado ou bloqueado) e o que estava pendente.
- **Lista de verificação da virada**: os seis portões, cada um com a evidência e a situação.
- **Lista de dados de teste**: identificadores por tabela e repositório, fechada com o responsável.
- **Tabela de ajustes**: decisões do responsável sobre registros que precisam de ajuste antes da carga
  (câmara de usuário, conta sem perfil, número repetido, arquivo sem registro).

## Regras

### R-virada-001 — Produção só é lida, e só por dump

- **Comportamento desejado**: a migração lê um dump do banco de produção e uma cópia dos arquivos dos
  8 repositórios, gerados pelo responsável. As ferramentas de migração não têm credencial do sistema
  atual. As operações no sistema atual (congelar, gerar o dump, copiar os arquivos, reabrir) são
  roteiros revisados e testados nos ensaios, executados pelo responsável. O dump e a cópia ficam em
  local protegido, com checksum, e não saem dele: contêm dados pessoais.
- **Motivo**: Princípio IV; "nunca conectar nem alterar produção".
- **Origem**: constituição v2.6.2.

### R-virada-002 — Ordem de carga

- **Comportamento desejado**: a carga segue a ordem dos módulos e das dependências entre os dados:

  | Etapa | O que carrega | Spec |
  |---|---|---|
  | 1 | core: referências, diretorias, câmaras, municípios, entidades, contratos, usuários (sem senha), auditoria, logotipos | 004 |
  | 2 | configuração inicial das câmaras: CATESA, CATERS e CATERF | 009, 010, 008 |
  | 3 | checklists: catálogos, itens e versões | 005 |
  | 4 | CATERF: contratos rodoviários, traçados e pontos de KM | 008 |
  | 5 | fiscalização: fiscalizações, registros, respostas, NCs, determinações, recomendações, fotos, relatórios | 007 |
  | 6 | CATERF: extensões das fiscalizações e ocorrências | 008 |
  | 7 | processo sancionador: processos, termos, respostas, AM, autos, remessas, pareceres, documentos | 011 |
  | 8 | CATERS: processos de acompanhamento, recomendações, documentos | 010 |
  | 9 | sequências de numeração, a partir dos maiores números migrados | 007, 011 |
  | 10 | controle de avisos já vencidos (R-virada-011) | 010, 011, 013 |

  Planejamento, CATESA (além da configuração), portal e tramitação não têm dados a migrar. Cada
  etapa confere as pré-condições dela (ex.: os checklists não começam sem os modelos das câmaras) e
  para a carga inteira se faltar alguma. A carga é refeita do zero a cada ensaio: não há carga
  parcial em cima de dados anteriores.
- **Motivo**: dependências registradas nos planos (research N16, T12, F18, C11, K14 e R13 do core).
- **Origem**: planos das specs 004 a 011.

### R-virada-003 — Relatório único de conferência

- **Comportamento desejado**: depois da carga, um relatório reúne os critérios MIG-1 a MIG-6 de todos
  os módulos:
  - **registros**: por tabela de origem, a contagem e cada identificador, conferido no destino, ou
    com o motivo de estar fora (descarte, teste, ajuste);
  - **valores**: para cada registro, a impressão digital dos valores transformados pelo mapa,
    calculada dos dois lados (origem transformada e destino) e comparada; cada diferença lista o
    campo e os três valores;
  - **arquivos**: os 1.554 arquivos, cada um com o checksum de origem igual ao de destino e ligado ao
    mesmo registro (ex.: cada foto na mesma unidade, na mesma ordem);
  - **ligações**: as referências que precisam se encontrar (respostas → versões de item, autos →
    determinações notificadas, recomendações da CATERS → origem);
  - **legados**: registros que as regras novas recusariam, carregados e marcados;
  - **descartes**: volume e motivo de cada descarte do mapa;
  - **dados de teste**: volume deixado fora;
  - **pendências**: tudo o que não se encaixa acima. A meta é zero, e cada uma exige decisão do
    responsável.

  O relatório sai em formato legível e em formato de dados. Com o mesmo dump, dá sempre o mesmo
  resultado. É a evidência do portão 6.
- **Motivo**: Princípio I (tudo ou falha, registro a registro); proposta de 2026-09-30.
- **Origem**: constituição v2.6.2; seções "Migração" das specs 004 a 013.

### R-virada-004 — Ensaios

- **Comportamento desejado**: a virada é ensaiada num ambiente de homologação igual ao de produção do
  sistema novo. Cada ensaio:
  1. parte de um dump novo e da cópia dos arquivos;
  2. refaz o inventário de produção com os dois roteiros da spec 003 e regenera o catálogo; o ensaio
     só segue com 0 objetos sem anotação, 0 sem dono, 0 colunas sem destino e 0 destinos sem
     verificação;
  3. carrega na ordem da R-virada-002;
  4. gera o relatório da R-virada-003;
  5. registra o tempo de cada etapa e as falhas, que viram correções no sistema novo ou nas specs.

  São pelo menos dois ensaios completos sem pendência antes da virada. O último, o **ensaio geral**,
  roda a sequência inteira da virada (congelamento simulado, roteiros reais, carga, conferência,
  abertura e volta) até 10 dias antes da data marcada.
- **Motivo**: produção muda entre os ensaios (vimos as migrations 137 a 141); portão 3 (janela
  dimensionada).
- **Origem**: proposta de 2026-09-30; constituição, portões 1 e 3.

### R-virada-005 — Congelamento do sistema atual

- **Comportamento desejado**: no início da janela, o responsável aplica o roteiro de congelamento: o
  sistema atual passa a recusar qualquer gravação de dados e de arquivos, para todos os papéis, e
  continua aberto para leitura. Os usuários são avisados com antecedência e veem no aplicativo atual
  que ele está só para leitura. O dump final e a cópia dos arquivos são feitos com o sistema
  congelado, para não perder gravação feita no meio da cópia. O roteiro de descongelamento (volta)
  existe e é testado nos ensaios.
- **Motivo**: Princípio IV (virada única e verificada); dump consistente.
- **Origem**: proposta de 2026-09-30.

### R-virada-006 — Aparelhos: fila vazia comprovada

- **Comportamento desejado**:
  1. **Antecedência**: na semana anterior, os usuários de campo são avisados; não se começa
     fiscalização nova sem rede nos 2 dias anteriores à janela.
  2. **Por aparelho e usuário**: com rede, o usuário sincroniza o aplicativo atual e baixa o backup
     local, que contém a fila de envio e as fotos pendentes. Quem trabalha em mais de uma diretoria
     baixa um backup em cada.
  3. **Conferência**: uma ferramenta lê o backup e confere que não há operação pendente ou com erro
     nem foto local por enviar. Ela registra a **confirmação**: usuário, aparelho, diretoria, data,
     checksum do arquivo, resultado e, se bloqueado, a lista do que falta.
  4. **Lista**: a lista de aparelhos parte dos usuários ativos de campo do sistema atual e mostra
     liberados, bloqueados e sem confirmação. O congelamento só começa com todos liberados.
  5. **Exceção**: aparelho que não pode sincronizar (usuário desligado, aparelho sem acesso) tem o
     backup guardado. Depois da migração, o trabalho pendente dele é carregado no sistema novo por
     uma importação do backup do sistema atual, que converte as operações para o sistema novo e as
     aplica em nome do autor original, com auditoria e entrada no relatório. É o mesmo caminho da
     fila de aparelho de usuário desativado da fiscalização (F12 da spec 007).
- **Motivo**: Princípio II; portão 2 (comprovado aparelho a aparelho, não por suposição).
- **Origem**: constituição, portão 2; o backup local do aplicativo atual já leva a fila e as fotos
  pendentes.

### R-virada-007 — Dados de teste e tabela de ajustes

- **Comportamento desejado**: antes do primeiro ensaio, o responsável fecha a **lista de dados de
  teste**, com os identificadores por tabela e repositório: as 34 respostas e as 20 evidências do
  A-002, os termos de teste, o usuário de teste automatizado e as entidades fictícias. Fecha também
  a **tabela de ajustes**:
  - câmara de usuário que não tem;
  - conta sem perfil;
  - número repetido;
  - texto livre sem correspondência;
  - arquivos sem registro.

  As duas são revistas antes do dump final. A lista nunca apaga nada do sistema atual: só deixa de
  fora da carga, com o volume no relatório. Uma carga sem a lista ou sem a tabela não roda.
- **Motivo**: portão 5; A-002; constituição, "Dado de teste MUST ser expurgado ou explicitamente
  classificado antes de qualquer migração".
- **Origem**: A-002 (decidido); research N16 e R13 do core.

### R-virada-008 — Ponto de não retorno e critério de volta

- **Comportamento desejado**: o **ponto de não retorno** é a abertura do sistema novo aos usuários.
  Até ele:
  - a virada pode ser desfeita: o responsável aplica o descongelamento, os usuários voltam ao
    sistema atual, e os dados carregados no sistema novo são descartados;
  - motivos de volta: pendência sem decisão no relatório, falha na carga, portão não satisfeito, ou
    janela estourada (no marco de 1,5 dia útil, o responsável decide entre seguir e voltar).

  Depois do ponto de não retorno, não se volta: problemas são corrigidos no sistema novo. A volta é
  testada no ensaio geral e leva menos de 1 hora.
- **Motivo**: Princípio IV ("todo passo reversível até a virada; a virada é irreversível").
- **Origem**: constituição v2.6.2.

### R-virada-009 — Os seis portões e a aprovação

- **Comportamento desejado**: uma lista de verificação reúne os seis portões da constituição, cada um
  com a evidência:

  | Portão | Evidência |
  |---|---|
  | 1. Inventário conferido contra o modelo novo | inventário refeito antes do dump final; catálogo regenerado com 0 pendências; mapas com 0 colunas sem destino e 0 destinos sem verificação |
  | 2. Nenhum aparelho com fila não sincronizada | lista de confirmações com todos liberados, e os backups das exceções guardados (R-virada-006) |
  | 3. Volume de arquivos medido e janela dimensionada | contagem e tamanho do dump final e da cópia; tempos do ensaio geral dentro de 2 dias úteis |
  | 4. Autorização verificada e aprovada | todas as matrizes de acesso das specs 004 a 013 testadas e passando no sistema carregado; revisão das matrizes pelo responsável |
  | 5. Dados de teste expurgados ou classificados | lista fechada e volume deixado fora no relatório |
  | 6. Migração conferida registro a registro | relatório da R-virada-003 sem pendência sem decisão |

  O **responsável** aprova a virada com a lista completa. A aprovação é registrada com data, os
  arquivos de evidência e o checksum de cada um. Sem os seis portões, o sistema novo não abre.
- **Motivo**: constituição, "Portões antes da virada"; decisão do responsável (2026-10-01).
- **Origem**: constituição v2.6.2; decisão do responsável, 2026-10-01.

### R-virada-010 — Depois da virada

- **Comportamento desejado**:
  - o sistema atual continua **só para leitura, sem prazo** definido para sair do ar; o endereço dele
    mostra que é o sistema anterior, só para consulta;
  - o dump final, a cópia dos arquivos, o relatório e a aprovação ficam guardados com checksum;
  - os aparelhos com o aplicativo atual mostram que o sistema mudou e apontam o endereço do novo;
  - os usuários entram no sistema novo pelo primeiro acesso com código no e-mail (R-core-005); os
    usuários sem e-mail válido são listados e corrigidos pelo administrador antes da abertura;
  - nos primeiros 30 dias, uma conferência diária compara contagens do sistema novo com o relatório
    da virada para os dados antigos, e qualquer diferença é investigada.
- **Motivo**: decisão do responsável (2026-10-01); Princípio I.
- **Origem**: decisão do responsável, 2026-10-01.

### R-virada-011 — Tarefas automáticas na abertura

- **Comportamento desejado**: as tarefas automáticas do sistema novo começam a rodar só depois da
  aprovação. Antes disso, a carga registra no controle de avisos de cada app os prazos já vencidos
  antes da virada, para a primeira execução não mandar uma enxurrada de avisos de coisas antigas.
  Isso vale para as respostas atrasadas da CATERS, os prazos do processo sancionador e os da
  tramitação. Os prazos que vencem depois da virada são avisados normalmente.
- **Motivo**: avisos úteis desde o primeiro dia, sem ruído.
- **Origem**: research T9 (spec 010), N13 (spec 011), X12 (spec 013).

## Telas do sistema atual

| Tela | Ação | Regra |
|---|---|---|
| Barra de sincronização (`src/components/camaras/SyncBar.jsx`) | "Sincronizar" e "Baixar backup local" (dados, fila de envio e fotos pendentes) | R-virada-006 (evidência de fila vazia) |
| Exportar e importar (`src/pages/ExportarImportar.jsx`) | Exportar fiscalizações em JSON | fora: fiscalizacao (R-fiscalizacao-020); não é usado na virada, que parte do dump |

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Conferir o backup do aparelho e registrar a confirmação; lista de aparelhos | R-virada-006 |
| Gerar e consultar o relatório de conferência | R-virada-003 |
| Lista de verificação dos portões e aprovação | R-virada-009 |
| Importar no sistema novo o trabalho pendente de backup do sistema atual | R-virada-006 |

## Migração

Esta spec é a própria migração: os volumes, critérios e casos de cada módulo estão nas seções
"Migração" das specs 004 a 013 e nos mapas de `specs/003-base-dados-producao/anotacoes/migracao/`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos registros e dos 1.554 arquivos de origem aparecem no relatório como
  conferidos, descartados com motivo, legados marcados ou fora por teste; 0 pendências sem decisão
  na virada.
- **SC-002**: 0 diferenças de valor transformado e 0 diferenças de checksum no relatório da virada.
- **SC-003**: Pelo menos 2 ensaios completos sem pendência, o último até 10 dias antes da virada.
- **SC-004**: A sequência do congelamento à abertura cabe em 2 dias úteis no ensaio geral e na
  virada.
- **SC-005**: 100% dos aparelhos de campo com confirmação de fila vazia antes do congelamento, ou com
  o backup guardado e o trabalho pendente carregado e conferido no sistema novo.
- **SC-006**: 0 gravações aceitas pelo sistema atual depois do congelamento.
- **SC-007**: A volta, testada no ensaio geral, reabre o sistema atual em menos de 1 hora.
- **SC-008**: Os seis portões com evidência registrada e a aprovação do responsável antes da
  abertura.
- **SC-009**: 0 avisos disparados no primeiro dia sobre prazos vencidos antes da virada.

## Assumptions

- **Ambiente de homologação**: igual ao de produção do sistema novo, com dados reais só durante os
  ensaios e acesso restrito à equipe; apagado depois de cada ensaio.
- **Comunicação**: o responsável comunica a data, o congelamento e o primeiro acesso aos usuários
  internos e às entidades.
- **Fiscalizações em andamento**: as que estiverem em andamento no congelamento migram como estão e
  continuam no sistema novo.
- **Sistemas externos**: o e-MS não participa da virada (a tramitação começa vazia).
- **Datas**: a data da virada é escolhida pelo responsável depois do segundo ensaio sem pendência,
  evitando períodos de prazos críticos do processo sancionador.
