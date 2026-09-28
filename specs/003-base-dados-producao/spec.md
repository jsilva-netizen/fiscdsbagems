# Feature Specification: Base de dados do sistema atual — catálogo, divergências, rastreabilidade e ordem dos módulos

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; ver constituição v2.0.0, "Levantamento em specs")

**Created**: 2026-09-28

**Status**: Draft

**Input**: Handoff da avaliação `novo-sistema-django-apps` (`.specify/assessments/novo-sistema-django-apps/decision.md`, verdict go): primeira spec do levantamento. Ela cobre o inventário do banco de produção lido e explicado, as divergências entre produção e migrations, o mapa de rastreabilidade (objeto → módulo) e a ordem de dependência dos módulos. Fontes: `inventario-producao.csv` e `inventario-producao-parte2.csv` (produção, 2026-09-28).

## Contexto

A AGEMS vai substituir o fiscdsbagems por um sistema novo e próprio. Antes de construir, todo o
sistema atual precisa ser descrito em specs, começando pelo banco de produção, que é a fonte da
verdade do banco (constituição v2.0.0, "Levantamento em specs").

Esta spec é a **fundação** das demais. Ela não descreve regras de negócio módulo a módulo; isso é
trabalho das specs de módulo que vêm depois. O que ela entrega:
- o catálogo completo do banco de produção;
- a lista de onde produção e migrations divergem;
- a atribuição de cada objeto a um módulo;
- a ordem em que os módulos serão especificados;
- os achados que exigem decisão antes de o sistema novo herdar qualquer coisa;
- o formato padrão das specs de módulo e das jornadas de validação.

Retrato do banco de produção em 2026-09-28, pelos inventários:
- **Estrutura:** 35 tabelas e 1 view, com 446 colunas, 113 restrições (62 delas chaves estrangeiras), 80 índices e 5 tipos enumerados.
- **Comportamento:** 38 funções (33 com permissão elevada), 30 gatilhos (um deles em `auth.users`) e 173 políticas de acesso (32 delas sobre arquivos).
- **Arquivos:** 8 repositórios, com 1.554 arquivos e cerca de 1 GB.
- **Cadastro:** 12 câmaras técnicas cadastradas em 3 diretorias. Duas delas (`caterm` e `catesg`) não aparecem no código do frontend, que conhece 10.
- **Dados:** 12 tabelas sem nenhuma linha, entre elas as de autos de infração, julgamentos, pareceres técnicos, manifestações e remessas.
- **Migrations:** produção não tem registro de migrations aplicadas e diverge das migrations do repositório (research.md da avaliação; commit `386dac1`).

## User Scenarios & Testing *(mandatory)*

Os usuários desta spec são o **time de desenvolvimento do sistema novo** e os **autores das specs
de módulo**. O **responsável pelo projeto** revisa o trabalho e toma as decisões pendentes.

### User Story 1 - Consultar qualquer objeto do banco de produção (Priority: P1)

O desenvolvedor escolhe qualquer objeto do banco: uma tabela, uma coluna, uma função, um gatilho,
uma política de acesso, um repositório de arquivos, um tipo, um papel ou um segredo (só o nome). No
catálogo, ele encontra:
- o que o objeto é e para que serve;
- a estrutura completa;
- de quem o objeto depende e quem depende dele;
- quantos registros ou arquivos existem;
- qual spec de módulo vai descrevê-lo.

Tudo isso sem abrir o banco nem o código antigo.

**Why this priority**: sem o catálogo, nenhuma spec de módulo tem base comum. Cada autor
redescobriria o banco por conta própria, com o risco de divergir dos outros e de perder objetos
que ninguém procurou (constituição, Princípio I).

**Independent Test**: sortear 10 objetos dos inventários de produção, de tipos diferentes, e
responder para cada um, só com o catálogo: o que é, estrutura, dependências nas duas direções e
módulo responsável. Depois, conferir as respostas contra os inventários.

**Acceptance Scenarios**:

1. **Given** a tabela `unidades_fiscalizadas`, **When** o desenvolvedor a consulta no catálogo, **Then** encontra:
   - as colunas, com tipo, obrigatoriedade, valor padrão e significado;
   - a tabela da qual ela depende (`fiscalizacoes`) e as 8 tabelas que dependem dela;
   - os 3 gatilhos e as funções que eles disparam;
   - as 7 funções que leem ou escrevem nela;
   - as 7 políticas de acesso sobre ela;
   - o número de linhas;
   - o módulo responsável.
2. **Given** a função `gerar_ncs_unidade`, **When** consultada, **Then** o catálogo informa:
   - as tabelas que ela lê e escreve;
   - as funções que ela chama;
   - quem a chama (gatilho, política, tela, edge function);
   - que ela roda com permissão elevada;
   - a spec de módulo que vai descrever a regra de negócio dela.
3. **Given** uma política de acesso, **When** consultada, **Then** o catálogo informa, em linguagem simples, quem pode fazer o quê e em que condição, e aponta as funções auxiliares em que ela se apoia.
4. **Given** um repositório de arquivos, **When** consultado, **Then** o catálogo informa:
   - se é público ou privado, e os limites de tamanho e de tipo de arquivo;
   - o volume;
   - o padrão de caminho dos arquivos;
   - as políticas de acesso sobre ele;
   - as colunas que guardam referência para os arquivos dele.

---

### User Story 2 - Saber onde produção e migrations divergem (Priority: P1)

O desenvolvedor e o responsável pelo projeto veem a lista completa das diferenças entre o banco
de produção e o banco que as migrations do repositório constroem. Cada diferença vem classificada,
para que ninguém use as migrations como referência por engano.

**Why this priority**: a divergência já medida é grande:
- 66 políticas existem só em produção, e 18 só nas migrations;
- 8 funções existem só em produção, e 4 só nas migrations;
- 27 funções têm o mesmo nome e código diferente;
- também divergem 15 índices, 6 restrições, 11 colunas, 2 repositórios de arquivos e uma tabela.

Especificar a partir das migrations descreveria um sistema que não é o que está em uso.

**Independent Test**: reconstruir o banco a partir das migrations, gerar o mesmo inventário, e
conferir que toda diferença entre os dois inventários aparece na lista, com classificação.

**Acceptance Scenarios**:

1. **Given** um objeto que existe só em produção (ex.: a função `is_staff`), **When** consultada a lista de divergências, **Then** ele aparece como "só em produção", com a classificação e a consequência para as specs.
2. **Given** uma função com código diferente nos dois lados, **When** consultada, **Then** a lista mostra o que muda entre as duas versões e registra que vale a de produção.
3. **Given** um objeto que existe só nas migrations (ex.: a tabela `catesa_ai_jobs`), **When** consultado, **Then** a lista registra que ele não existe em produção e o que isso significa para a funcionalidade que depende dele.

---

### User Story 3 - Saber a que módulo cada objeto pertence e em que ordem especificar os módulos (Priority: P2)

O responsável pelo projeto vê o mapa de rastreabilidade e a ordem dos módulos:
- **o mapa:** cada objeto do banco tem um único módulo dono e pode ser referenciado por outros;
- **a ordem:** a sequência dos módulos, derivada de quem depende de quem.

Com isso, ele sabe qual spec vem a seguir e acompanha o progresso: um objeto sem spec de módulo
aparece como lacuna.

**Why this priority**: o mapa é a medida de completude do levantamento (constituição, Princípio
I e "Levantamento em specs"), e a ordem evita especificar um módulo antes daquilo de que ele
depende. Vem depois das histórias 1 e 2 porque é construída sobre elas.

**Independent Test**:
- verificar que todo objeto dos inventários aparece no mapa com exatamente um dono ou com
  classificação explícita de fora do escopo (plataforma, descarte);
- verificar que nenhum módulo da ordem depende de outro que venha depois dele, ou que a exceção
  está justificada.

**Acceptance Scenarios**:

1. **Given** o mapa completo, **When** se filtram os objetos sem dono, **Then** o resultado é vazio.
2. **Given** a ordem dos módulos, **When** se verifica cada chave estrangeira e cada chamada entre funções, **Then** o objeto referenciado pertence a um módulo anterior ou ao mesmo módulo. Onde há dependência circular, ela está identificada e resolvida.
3. **Given** um objeto mantido pela plataforma atual e sem equivalente no sistema novo (ex.: os event triggers da plataforma), **When** consultado no mapa, **Then** aparece como "plataforma — não migra", com o motivo.

---

### User Story 4 - Decidir sobre o que não deve ser herdado (Priority: P2)

O responsável pelo projeto recebe a lista dos achados que exigem decisão antes de qualquer spec de
módulo herdar o que está no banco. Cada achado vem com evidência, risco, opções e recomendação, e
a decisão tomada fica registrada.

**Why this priority**: as specs descrevem o comportamento **desejado**, sem defeitos (decisão da
avaliação). Achado não decidido vira defeito herdado ou funcionalidade perdida.

**Independent Test**: para cada achado, verificar que há evidência nos inventários e uma decisão
registrada, ou a marcação explícita "aguardando decisão".

**Acceptance Scenarios**:

1. **Given** as 22 políticas de acesso criadas para os testes automatizados e presentes em produção, **When** o responsável consulta os achados, **Then** encontra o achado com a lista das políticas e a recomendação de não levá-las ao sistema novo.
2. **Given** dados de teste em produção (ex.: manifestações de prestador com o texto "a", "aa", "aaa"), **When** consultado, **Then** o achado indica onde estão, quantos são e o que fazer com eles antes da migração de dados (constituição, portão 5).
3. **Given** a view `caters_fiscalizacoes_disponiveis`, que não aplica as permissões de quem consulta, **When** consultada, **Then** o achado explica que ela expõe dados por fora das políticas de acesso e registra a regra desejada para o sistema novo.
4. **Given** as 12 tabelas vazias em produção, **When** consultadas, **Then** o achado registra que a funcionalidade delas existe e precisa ser preservada (Princípio I), mas que não há dado a migrar.

---

### User Story 5 - Escrever cada spec de módulo no mesmo formato (Priority: P3)

O autor de uma spec de módulo usa um formato padrão. Para cada regra, o formato traz:
- o comportamento desejado;
- o comportamento atual, quando diferente;
- o motivo da diferença;
- as referências ao catálogo e ao mapa.

Há também um formato padrão de jornada de validação por perfil de usuário, em que cada passo
aponta para uma regra.

**Why this priority**: é condição da decisão antes da primeira spec de módulo. Sem formato fixo,
"nos mínimos detalhes" gera specs desiguais. Não bloqueia as histórias 1 a 4.

**Independent Test**: escrever um trecho de exemplo de spec de módulo e de jornada no formato e
verificar que um revisor encontra, para cada regra, as quatro informações acima.

**Acceptance Scenarios**:

1. **Given** o formato de spec de módulo, **When** um autor descreve uma regra que muda no sistema novo, **Then** o formato o obriga a registrar o comportamento atual e o motivo da mudança.
2. **Given** o formato de jornada, **When** um passo da jornada não tem regra correspondente em nenhuma spec de módulo, **Then** o passo aparece marcado como lacuna.

---

### Edge Cases

- **Objetos da plataforma.** Papéis internos, event triggers e schemas mantidos pelo provedor atual aparecem nos inventários, mas não são da aplicação. Precisam aparecer no mapa como "plataforma — não migra", nunca sem classificação.
- **Funções com mais de uma assinatura.** `obter_resumo_indicadores` existe em duas versões com parâmetros diferentes. Cada versão é um objeto do catálogo, e é preciso registrar qual está em uso.
- **Políticas de nome duplicado ou corrompido.** Duas políticas têm o nome com acentuação corrompida e aparentam duplicar outras. Precisam ser identificadas como duplicatas, ou não, pelo conteúdo, não pelo nome.
- **Tabelas vazias.** A ausência de dados não autoriza descartar a funcionalidade (Princípio I).
- **Colunas preenchidas por gatilho e também pelo cliente.** O catálogo aponta os dois lados, e a decisão de qual vale fica para a spec de módulo.
- **Dependências que só existem no código.** O banco não registra a dependência entre funções procedurais e tabelas; ela sai da leitura do código. O catálogo diz de onde veio cada dependência (do banco ou da leitura do código).
- **Produção muda durante o levantamento.** Uma correção em produção pode desatualizar o catálogo (constituição, Princípio IV). O inventário precisa poder ser refeito, e o catálogo regenerado, sem trabalho manual sobre o que não mudou.
- **Informação que não está no banco.** O código publicado das edge functions e a configuração de autenticação ficam fora do banco. O catálogo os lista como entradas pendentes, sem inventar conteúdo.

## Requirements *(mandatory)*

### Functional Requirements

**Catálogo**

- **FR-001**: O catálogo MUST conter uma entrada para cada tabela e view de aplicação do inventário de produção (35 tabelas e 1 view). Cada entrada traz: finalidade, colunas, restrições, índices, gatilhos, políticas de acesso, número de linhas e módulo dono.
- **FR-002**: Cada coluna (446) MUST ter no catálogo:
  - tipo, obrigatoriedade e valor padrão;
  - significado;
  - valores realmente em uso, quando for categórica;
  - estrutura interna, quando for estruturada (lista ou objeto).

  O significado MUST citar de onde foi tirado (comentário no banco, código do frontend, código de função). Significado sem fonte MUST ser marcado como hipótese.
- **FR-003**: Cada função (38) MUST ter no catálogo:
  - finalidade, entradas e saídas;
  - tabelas lidas e escritas, e funções chamadas;
  - quem a chama: gatilho, política, tela ou edge function;
  - se roda com permissão elevada;
  - se contém regra de negócio que precisa ser descrita numa spec de módulo.
- **FR-004**: Cada política de acesso (173, incluindo as 32 sobre arquivos) MUST ser descrita em linguagem simples: quem, qual operação, em que condição, e em quais funções auxiliares ela se apoia. Políticas de conteúdo equivalente MUST ser apontadas como duplicatas.
- **FR-005**: Cada gatilho (30) MUST ter no catálogo a tabela e o evento que o disparam, a função executada e o efeito observável. Isso inclui o gatilho que cria o perfil quando um usuário é cadastrado.
- **FR-006**: Cada repositório de arquivos (8) MUST ter no catálogo:
  - se é público ou privado, e os limites de tamanho e de tipo;
  - volume e padrão de caminho;
  - as políticas de acesso sobre ele;
  - as colunas e funções que guardam ou montam referências para os arquivos dele.
- **FR-007**: O catálogo MUST descrever o controle de acesso fora das políticas:
  - papéis do banco;
  - privilégios concedidos aos papéis usados pela interface, inclusive o anônimo;
  - privilégios padrão;
  - funções executáveis por usuário não autenticado;
  - o nome (nunca o valor) de cada segredo guardado no banco, e quem o usa.
- **FR-008**: O catálogo MUST mostrar, para cada objeto, as dependências nas duas direções (de quem depende e quem depende dele), identificando se cada dependência vem do registro do banco ou da leitura do código.

**Divergências**

- **FR-009**: A lista de divergências MUST conter toda diferença entre o banco de produção e o banco construído pelas migrations do repositório. Isso cobre tabelas, colunas, restrições, índices, funções (existência e código), gatilhos, políticas, tipos e repositórios de arquivos.
- **FR-010**: Cada divergência MUST ter exatamente uma classificação:
  - "produção vale" (o sistema em uso é a referência);
  - "resíduo a descartar";
  - "defeito a corrigir no sistema novo";
  - "aguardando decisão".

  Cada uma vem com a justificativa.
- **FR-011**: Para cada função com código diferente nos dois lados, a lista MUST resumir o que muda de comportamento entre as versões.

**Rastreabilidade e ordem**

- **FR-012**: O mapa de rastreabilidade MUST atribuir cada objeto dos dois inventários a exatamente um módulo dono, ou a uma classificação explícita fora do escopo ("plataforma — não migra" ou "descartar", com motivo).
- **FR-013**: A lista de módulos MUST seguir a organização em apps da constituição v2.0.0: core, checklists, um por diretoria ou câmara técnica, processo sancionador, portal do prestador, tramitação, com análises com IA dentro dos apps que as usam. Cada módulo MUST ter a lista dos objetos que possui.
- **FR-014**: A ordem de especificação dos módulos MUST ser derivada das dependências: chaves estrangeiras, chamadas entre funções, e funções usadas por políticas e gatilhos. Nenhum módulo pode vir antes de um módulo do qual depende. Dependências circulares MUST ser identificadas e resolvidas de forma explícita.
- **FR-015**: O mapa MUST indicar, para cada objeto, a spec de módulo que o descreve. Enquanto ela não existir, o objeto aparece como lacuna. Assim o mapa mede o progresso do levantamento.

**Achados que exigem decisão**

- **FR-016**: A lista de achados MUST registrar, com evidência dos inventários, pelo menos:
  - as políticas criadas para testes automatizados presentes em produção;
  - os dados de teste presentes em produção;
  - as políticas duplicadas ou de nome corrompido;
  - a view que não aplica as permissões de quem consulta;
  - as funções que rodam com permissão elevada;
  - os privilégios e funções acessíveis a usuário não autenticado;
  - as tabelas vazias;
  - o repositório de arquivos público;
  - as câmaras técnicas cadastradas no banco sem correspondência no código (`caterm`, `catesg`);
  - as funcionalidades cujo objeto existe só nas migrations.
- **FR-017**: Cada achado MUST trazer risco, opções e recomendação, e MUST ficar "aguardando decisão" até o responsável pelo projeto decidir. A decisão tomada MUST ficar registrada no próprio achado.
- **FR-018**: Este trabalho MUST NOT alterar nada no banco de produção. Os achados descrevem o que fazer. Limpeza ou correção em produção, se decidida, é trabalho separado, sob o Princípio IV.

**Formato das specs seguintes**

- **FR-019**: Esta spec MUST entregar um formato padrão de spec de módulo em que cada regra tenha comportamento desejado, comportamento atual quando diferente, motivo da diferença, e referências ao catálogo e ao mapa.
- **FR-020**: Esta spec MUST entregar um formato padrão de jornada de validação por perfil de usuário, em que cada passo aponte para a regra de uma spec de módulo, e passo sem regra apareça como lacuna.

**Integridade do próprio catálogo**

- **FR-021**: Nenhum artefato desta spec MUST conter dado pessoal ou valor de segredo. Só pode conter estrutura, contagens agregadas, conteúdo de tabelas de configuração e valores categóricos não pessoais.
- **FR-022**: O catálogo MUST registrar a data e a origem dos inventários em que se baseia. Ele MUST poder ser regenerado a partir de um inventário novo, preservando o texto explicativo dos objetos que não mudaram e destacando o que mudou.
- **FR-023**: O catálogo MUST listar as informações do sistema atual que não estão no banco e que as specs de módulo vão precisar, cada uma com a forma de obtê-la. São elas o código publicado das 9 edge functions e a configuração de autenticação.

### Key Entities

- **Inventário**: retrato do banco de produção numa data. Hoje são dois arquivos, de 2026-09-28. É a fonte de todos os outros artefatos.
- **Objeto do banco**: qualquer item inventariado: tabela, view, coluna, restrição, índice, função, gatilho, política, tipo, repositório de arquivos, papel, privilégio ou nome de segredo. Tem um módulo dono ou uma classificação fora do escopo.
- **Dependência**: relação "A depende de B" entre dois objetos, com a origem (registro do banco ou leitura de código).
- **Divergência**: diferença entre produção e migrations para um objeto, com uma classificação e a justificativa.
- **Módulo**: unidade de especificação que corresponde a um app do sistema novo. Tem uma posição na ordem de especificação e uma lista de objetos.
- **Achado**: fato do banco atual que exige decisão antes de ser herdado. Tem evidência, risco, opções, recomendação e decisão.
- **Formato de spec de módulo** e **formato de jornada**: os moldes das specs seguintes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos objetos de aplicação dos dois inventários têm entrada no catálogo. Hoje: 35 tabelas, 1 view, 446 colunas, 113 restrições, 80 índices, 38 funções, 30 gatilhos, 173 políticas, 5 tipos, 8 repositórios de arquivos, papéis, privilégios e 2 nomes de segredo. Zero objetos sem entrada.
- **SC-002**: 100% dos objetos têm módulo dono ou classificação fora do escopo no mapa. Zero sem atribuição.
- **SC-003**: 100% das divergências entre produção e migrations estão listadas e classificadas. Zero na situação "não classificada".
- **SC-004**: Em revisão, para 10 objetos sorteados, uma pessoa que não conhece o banco responde só com o catálogo, em até 5 minutos por objeto, o que o objeto é, de quem depende, quem depende dele e qual módulo o descreve. As respostas conferem com os inventários em 10 de 10.
- **SC-005**: Uma varredura automática dos artefatos desta spec encontra zero dado pessoal e zero valor de segredo. A varredura procura endereços de e-mail, nomes de pessoas das tabelas de cadastro e segredos.
- **SC-006**: Todos os achados têm decisão registrada antes de começar a primeira spec de módulo.
- **SC-007**: Regenerar o catálogo a partir do mesmo inventário produz as mesmas contagens de objetos e não perde nenhum texto explicativo.
- **SC-008**: Nenhum módulo da ordem de especificação depende de um módulo posterior sem exceção justificada.

## Assumptions

- **O que vale como banco atual:** os inventários de 2026-09-28 são a referência. Se produção mudar durante o levantamento, o inventário é refeito com os mesmos scripts, e o catálogo é regenerado (FR-022).
- **Objetos da plataforma:** papéis internos, event triggers e schemas mantidos pelo provedor atual não têm equivalente no sistema novo. Eles são classificados, não descritos em detalhe.
- **Fonte do significado:** o significado de colunas e funções sai do código atual (frontend, funções do banco, edge functions do repositório), porque o banco quase não tem comentários (26 de 446 colunas, 3 tabelas).
- **Edge functions:** até chegar o código publicado das edge functions, o do repositório é usado como referência provisória. Isso fica marcado nos objetos que dependem delas.
- **Decisões de achados:** quem decide é o responsável pelo projeto, caso a caso. Esta spec recomenda, mas não decide.
- **Divergências:** a comparação com as migrations usa o banco reconstruído localmente a partir do repositório (Supabase local), que é o mesmo procedimento usado para medir a divergência em 2026-09-28.
- **Fora do escopo:** o desenho do banco do sistema novo (modelos, tabelas, tipos). Esta spec descreve o banco atual e a atribuição a módulos; o desenho fica para o planejamento técnico do sistema novo.
- **Câmaras sem funcionalidade:** as 7 câmaras técnicas sem funcionalidade não têm objetos próprios no banco hoje. Elas entram na lista de módulos só quando houver requisitos (decisão da avaliação).
