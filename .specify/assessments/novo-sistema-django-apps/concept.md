# Concept: Levantamento completo do sistema atual em specs do sistema novo

- **Slug**: novo-sistema-django-apps
- **Created**: 2026-09-28
- **Recommended option**: Option A — Do banco para os módulos, com inventário de produção como base

O problema a resolver [problem.md]: descrever **todo** o sistema atual como ele deve ser no sistema
novo — funcionalidades preservadas, defeitos corrigidos —, **começando pelo banco de produção**, em
ordem, com detalhe suficiente para implementar sem abrir o código antigo. As opções abaixo são
formas de produzir essa descrição. A direção do sistema novo (Django em apps, PostgreSQL próprio,
React offline) já está decidida e não é opção aqui [problem.md, Non-Goals].

## Options

### Option A — Do banco para os módulos, com inventário de produção como base

- **Sketch**: primeiro, o inventário do banco real de produção, lido pelo SQL Editor do Supabase
  (a rede não permite conexão direta [usuário, 2026-09-28]), é conferido contra as migrations. Dele
  sai um **mapa de rastreabilidade**: cada objeto do banco (tabela, coluna, função, gatilho,
  política, bucket) aponta para o módulo que vai descrevê-lo. Depois, os módulos são especificados
  um de cada vez, **na ordem de dependência**: o que é base para os outros vem antes (identidade,
  perfis, entidades, instrumentos, diretorias e câmaras; depois o motor de checklists; depois a
  fiscalização de campo, incluindo a operação offline; e assim por diante até os módulos de
  câmara). Cada spec traz, para cada regra, o comportamento desejado; quando ele difere do atual,
  traz também o atual e o motivo da mudança. O mapa de rastreabilidade mede a completude:
  objeto sem módulo é lacuna visível.
- **Appetite**: large (meses) — orçamento, não estimativa; o usuário pediu para ignorar prazo nesta
  avaliação [usuário, 2026-09-28].
- **Trade-offs**:
  - Ganha: segue a ordem que o usuário pediu (banco primeiro, depois módulos em sequência); pega o
    comportamento que não aparece na tela (gatilhos, funções, políticas, invariantes do offline),
    que é onde mora o risco de perda silenciosa [research.md]; dá uma métrica binária de
    completude, alinhada ao Princípio I.
  - Sacrifica: a validação pelos usuários finais demora — as primeiras specs (base de dados,
    identidade, cadastros) são pouco visíveis para fiscais e coordenadores. Um módulo só fica
    "pronto" quando todas as regras dele estão decididas, e cada defeito conhecido exige uma
    decisão de comportamento desejado.
- **Rabbit holes**:
  - **Operação offline e sincronização** (6.532 linhas no cliente [research.md]): descrever "como
    deve ser" exige decidir o protocolo de sincronização com um backend Django, não só transcrever
    o atual — é o ponto onde a spec mais pode virar desenho de sistema.
  - **Permissões**: 165 políticas de RLS criadas ao longo do histórico, mais controles de
    segurança fora da RLS (`enforce_profile_security`) [research.md]. Descrever quem pode o quê,
    por câmara, é trabalho próprio.
  - **Regras duplicadas entre banco e cliente** (numeração de C/NC/R/D em três lugares; geração
    de NC/D/R em duas implementações independentes) [research.md]: antes de escrever a regra
    desejada, é preciso descobrir qual das versões é a certa.
  - **Divergências produção × migrations**: se forem muitas, a spec de base cresce antes de
    qualquer módulo começar.
  - **Granularidade**: "nos mínimos detalhes" sem um formato fixo pode gerar specs gigantes e
    desiguais; o formato precisa ser definido antes da primeira spec de módulo.
  - **Sistema em movimento**: correções em produção durante o levantamento desatualizam specs já
    escritas.

### Option B — Das telas para dentro (jornadas de usuário)

- **Sketch**: percorrer o sistema pela ótica de quem usa — cada perfil (fiscal, coordenador,
  administrador, prestador) e cada jornada (abrir fiscalização, vistoriar unidade, emitir termo,
  analisar manifestação...) vira uma spec, e o banco é descrito à medida que as jornadas o tocam.
  O inventário de produção entra como conferência no fim.
- **Appetite**: large
- **Trade-offs**:
  - Ganha: specs fáceis de validar com os usuários desde a primeira; cobre bem o que aparece na
    tela.
  - Sacrifica: inverte a ordem pedida pelo usuário (banco primeiro); as regras que atravessam
    várias jornadas (numeração, sincronização, permissões, gatilhos) aparecem espalhadas e
    repetidas em várias specs; o comportamento que não passa por tela nenhuma (gatilhos,
    agendamentos, jobs assíncronos) só é percebido na conferência final, quando corrigir é mais
    caro.
- **Rabbit holes**: duplicação de regra entre specs de jornadas diferentes, com versões que
  divergem entre si; definir o que é uma "jornada" para as telas administrativas grandes
  (`GerenciarTermos.jsx`, 1.780 linhas) [research.md].

### Option C — Menor coisa que funciona: catálogo completo, detalhe só nos núcleos

- **Sketch**: o mesmo inventário de produção e o mesmo mapa de rastreabilidade da opção A, mas o
  detalhamento "passo a passo" fica só para os núcleos de maior risco (motor de checklists,
  numeração, finalização e reabertura de fiscalização, sincronização offline, processo
  sancionador). O resto recebe uma descrição curta de catálogo (o que existe, para que serve,
  onde está), a ser detalhada depois, se preciso.
- **Appetite**: medium (semanas)
- **Trade-offs**:
  - Ganha: entrega cedo os núcleos que mais podem se perder; o catálogo já garante que nada fique
    sem ao menos um registro.
  - Sacrifica: contraria o pedido explícito de detalhar **tudo** [usuário, 2026-09-28] e a meta
    de "implementável sem o código antigo" para as partes não-núcleo [problem.md, Success
    Metrics]; o time acabaria voltando ao código atual justamente para as partes "simples".
- **Rabbit holes**: a fronteira entre "núcleo" e "resto" tende a ser redesenhada a cada módulo.

### Option D — Não especificar: reconstruir direto a partir do código atual

- **Sketch**: o time de desenvolvimento lê o código atual conforme constrói cada app do sistema
  novo, sem uma descrição intermediária.
- **Appetite**: nenhum levantamento; o custo vai para a construção.
- **Trade-offs**: é o custo de não fazer descrito em problem.md — perda silenciosa das regras que
  moram longe das telas, defeitos herdados por inércia, e nenhuma base contra a qual conferir a
  migração de dados. Registrada só como referência de comparação.
- **Rabbit holes**: não se aplica.

## Recommendation

**Option A.** É a única que atende às três exigências do problema ao mesmo tempo:
- **Ordem pedida:** banco de produção primeiro, depois módulos em sequência [usuário, 2026-09-28].
- **Completude binária mensurável:** o mapa de rastreabilidade transforma "cobrir 100% dos
  objetos do banco" e "cobrir 100% das telas, edge functions e funções" em listas verificáveis
  [problem.md, Success Metrics].
- **Pega o comportamento invisível:** gatilhos, funções, políticas e invariantes do offline
  são tratados na base, antes das jornadas. É a parte que a opção B só veria no fim e que a
  opção C deixaria rasa.

A validação tardia pelos usuários (desvantagem da A) pode ser atenuada revisando cada spec de
módulo com quem usa aquele módulo, sem mudar a ordem. As opções C e D não atendem ao pedido de
"tudo, nos mínimos detalhes".

**Primeiro passo concreto, já preparado**: o script de inventário
[`inventario-producao.sql`](./inventario-producao.sql), testado contra o banco local (24 seções,
sem erro). O usuário roda no SQL Editor do Supabase de produção e salva o resultado em
`inventario-producao.csv` nesta pasta. O script não altera o banco, não extrai dados pessoais nem
segredos, e traz o código completo das funções, gatilhos, políticas, buckets, volumes, migrations
aplicadas e o conteúdo das tabelas de configuração.

## Out of Scope (for the recommended option)

- Prazo, tamanho do time e esforço [problem.md, Non-Goals].
- Requisitos das 7 câmaras sem funcionalidade — os módulos delas entram na ordem só quando tiverem
  requisitos [problem.md].
- Implementar o sistema novo e executar a migração de dados.
- Continuar a spec 001 (camada de abstração) e a T032.
- Dados pessoais e segredos de produção: o inventário só lê estrutura, contagens agregadas e
  tabelas de configuração.
- Decidir aqui a arquitetura, os modelos de dados ou a estrutura de apps do sistema novo — cada
  spec descreve comportamento; o desenho técnico é das etapas seguintes do SDD.

## Assumptions to Validate

- **O SQL Editor do Supabase de produção executa o script**: ele cria uma função em `pg_temp` e
  lê `auth`, `storage`, `supabase_migrations` e `cron`. Testado contra o Supabase local, onde o
  papel `postgres` tem essas permissões; em produção pode haver diferenças de versão ou de
  permissão.
- **O resultado cabe na exportação do painel**: no banco local, ~320 KB; em produção, com mais
  linhas de configuração e possivelmente mais funções, pode ser maior. Se não couber, o script
  aceita rodar por partes.
- **O inventário de produção é a fonte da verdade do banco**: quando divergir das migrations, vale
  o de produção [problem.md, Goals].
- **A ordem de dependência dos módulos pode ser derivada do inventário**: as chaves estrangeiras e
  as chamadas entre funções indicam o que é base de quê.
- **O usuário decide, caso a caso, o comportamento desejado quando há defeito ou regra duplicada**
  [problem.md, Open Questions] — sem essa decisão, a spec do módulo não fecha.
- **Um formato único de spec de módulo, com comportamento desejado, comportamento atual e motivo
  da diferença, cabe em todos os módulos.** A primeira spec de módulo serve para validar isso.
- **"Tramitação de documentos/dados", citada como app do sistema novo [usuário, 2026-09-28],
  corresponde a algo que já existe hoje** (remessas, respostas, histórico de análise?) — ou é
  funcionalidade nova, o que a tiraria do levantamento e a poria entre os requisitos novos.
- **O banco local não reflete o de produção nos buckets**: o local tem `documentos-autos` e não tem
  `documentos-prestadores`, que o código usa. O inventário de produção vai dizer qual é o real.
