# Problem Definition: Conhecimento do sistema atual preso no código, na véspera de reconstruí-lo

- **Slug**: novo-sistema-django-apps
- **Created**: 2026-09-28
- **Inputs used**: intake.md, research.md, respostas do usuário na chamada deste comando
  (2026-09-28), citadas como **[usuário, 2026-09-28]**

## Problem Statement

A AGEMS vai substituir o fiscdsbagems por um sistema novo, próprio [intake.md; research.md,
"Users & Demand"]. Mas o que o sistema atual faz — regras de negócio, cálculos, fluxos, estados,
permissões — só existe no código e no banco, espalhado entre banco, frontend online e frontend
offline, misturado a defeitos conhecidos e sem descrição única [research.md, "Data &
Constraints" e "Evidence Against the Idea"]. Sem essa descrição, quem reconstrói não tem como
garantir que nenhuma funcionalidade se perca nem como separar regra de negócio de acidente de
implementação. Nesta fiscalização regulatória, função perdida é prova ou prazo perdido
[constituição, Princípio I].

## Affected Users & Stakeholders

- **Users**:
  - **Time de desenvolvimento da AGEMS** — vai construir e manter o sistema novo
    [usuário, 2026-09-28; research.md]. Hoje, para saber o que o sistema faz, precisaria ler
    42.815 linhas de frontend, 10.477 linhas de SQL em 120 migrations e 4.148 linhas de edge
    functions [research.md, "Data & Constraints"].
  - **Fiscais, coordenadores e administradores** — usam o sistema atual; perdem capacidade se o
    novo nascer sem alguma funcionalidade ou com comportamento diferente sem aviso
    [research.md, "Users & Demand"].
  - **Prestadores de serviço regulados** — usam o portal do prestador (termos de notificação,
    respostas) [research.md, "Users & Demand"; intake.md].
- **Stakeholders**:
  - **Usuário (jsilva)** — conduz o levantamento e aprova a emenda da constituição
    [usuário, 2026-09-28].
  - **Diretorias e câmaras técnicas da AGEMS** (DSB, DTR, DGE e suas 10 câmaras) — todas entram
    no sistema novo [research.md, "Data & Constraints"; usuário, 2026-09-28].
  - Quem registrou a decisão de descartar o SISREG — [NEEDS CLARIFICATION: instância/pessoa].

## Goals

- **Descrever o sistema atual por inteiro**: toda funcionalidade existente hoje fica descrita,
  sem exceção. Completude é binária, como exige o Princípio I da constituição.
- **Descrever o comportamento desejado, não o acidental**: cada descrição diz como o sistema novo
  deve se comportar, com todas as funcionalidades preservadas e os defeitos corrigidos
  [usuário, 2026-09-28]. Quando o desejado diferir do atual, o comportamento atual e o motivo da
  mudança ficam registrados, para que a diferença seja decisão e não esquecimento.
- **Partir do banco real de produção**: o levantamento começa pela estrutura do banco atual
  [usuário, 2026-09-28], lida diretamente em produção, e não só das migrations
  [usuário, 2026-09-28: "o inventário direto do banco em produção é essencial"]. As migrations
  já se mostraram incompletas uma vez [research.md, commit `54cd4b3`].
- **Seguir uma ordem**: estrutura do banco primeiro; depois, módulo a módulo, em sequência
  [usuário, 2026-09-28].
- **Detalhar a ponto de dispensar o código antigo**: nível de detalhe "nos mínimos detalhes,
  passo a passo" [usuário, 2026-09-28], suficiente para o time implementar cada parte sem precisar
  ler o código atual para entender uma regra.

## Non-Goals

- **Prazo, tamanho do time e esforço** — fora desta avaliação por decisão do usuário
  [usuário, 2026-09-28].
- **Requisitos das 7 câmaras técnicas que hoje não têm funcionalidade** (CRES, CATRANSP, CATEFIS,
  CRET, CATEGAS, CATENE, CREG) — ficam em branco por ora [usuário, 2026-09-28]. Elas só
  existem como listas de "funcionalidades previstas" [research.md].
- **Construir o sistema novo** — este trabalho produz a descrição; implementar é outra etapa.
- **Executar a migração dos dados de produção** — planejada para depois [usuário, 2026-09-28].
- **Continuar a spec 001 (camada de abstração)** e a T032 — paradas [usuário, 2026-09-28].
- **Rediscutir a decisão de descartar o SISREG** ou a direção geral do sistema novo (Django em apps,
  PostgreSQL próprio, frontend React offline) — decididas [usuário, 2026-09-28].
- **Evoluir o sistema atual** além das correções de produção que surgirem.

## Success Metrics

- **Cobertura do banco de produção**: fração dos objetos do banco real (tabelas, colunas,
  restrições, índices, views, funções, triggers, policies, tipos e buckets) referenciados por
  alguma descrição. Meta: 100%. (baseline: 0%; o total de objetos é desconhecido até o inventário
  de produção — as migrations indicam ao menos 37 tabelas, 34 funções, 33 triggers e 6 buckets
  [research.md])
- **Cobertura do comportamento do código**: fração das telas (44), edge functions (9) e funções
  de banco (34) cujo comportamento está descrito. Meta: 100%. (baseline: 0%)
- **Divergências produção × migrations**: toda diferença encontrada entre o banco real e as
  migrations fica listada e classificada. (baseline: desconhecido — nunca medido)
- **Débitos conhecidos com decisão registrada**: cada item de
  `debitos-tecnicos-e-inconsistencias.md` (10 itens numerados, mais subitens) tem registrado como
  o sistema novo deve se comportar. (baseline: 0)
- **Implementável sem o código antigo** (qualitativo): em revisão, uma pessoa do time que não leu
  o código atual consegue responder, só com a descrição, como uma regra funciona (ex.: numeração
  de C, NC, R e D; motor de checklists; geração de relatórios). (baseline: não aplicável hoje —
  essa descrição não existe)

## Cost of Inaction

Sem esse levantamento, o sistema novo seria construído a partir de memória e de leituras parciais
do código. Com isso, funcionalidades e regras sumiriam sem que ninguém percebesse, justamente as
que moram longe das telas, como:
- a semântica append-only dos itens de checklist, que preserva o texto vigente em vistorias
  antigas;
- as invariantes do sincronismo offline;
- as regras de numeração, hoje espalhadas em três lugares;
- a lógica que só existe em triggers.

[research.md, "Data & Constraints"; debitos-tecnicos-e-inconsistencias.md]

Os defeitos conhecidos iriam junto por inércia. E a migração posterior dos dados de produção
[usuário, 2026-09-28] não teria contra o que ser conferida: a conferência registro a registro
exigida pela constituição pressupõe saber o que cada dado significa.

## Open Questions

- [NEEDS CLARIFICATION: acesso de leitura ao banco de produção para o inventário — quem fornece,
  com qual credencial e papel (somente leitura), e por qual via (conexão direta, dump do
  schema, painel)?]
- [NEEDS CLARIFICATION: `unidades` e `caters_fiscalizacoes_disponiveis` — o que são no banco real
  (research.md)]
- [NEEDS CLARIFICATION: volumes de produção por tabela e por bucket — necessários para a migração
  de dados posterior, não para o levantamento em si]
- [NEEDS CLARIFICATION: o sistema atual continuará recebendo correções em produção durante o
  levantamento? Se sim, como as descrições acompanham essas mudanças?]
- [NEEDS CLARIFICATION: quando o comportamento desejado exigir escolha entre alternativas (ex.:
  corrigir a numeração não atômica), quem decide — o usuário, caso a caso?]
- [NEEDS CLARIFICATION: requisitos das 7 câmaras sem funcionalidade — deixados em branco por ora
  (usuário, 2026-09-28); precisam de dono antes de entrarem no sistema novo]
- [NEEDS CLARIFICATION: documento ou ato que registra o descarte do SISREG — para citar na emenda
  da constituição]
- [NEEDS CLARIFICATION: destino da branch `migracao-sisreg` e dos commits da spec 001 que não estão
  na `origin`]
