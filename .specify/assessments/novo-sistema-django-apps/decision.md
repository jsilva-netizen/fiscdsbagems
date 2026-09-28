# Decision: Levantamento completo do sistema atual em specs do sistema novo

- **Slug**: novo-sistema-django-apps
- **Decided**: 2026-09-28
- **Verdict**: **go** (condicionado — ver *Condições*)
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md (e
  `inventario-producao.sql`, testado contra o banco local; o resultado de produção ainda não
  existe)

Substitui, como direção de trabalho, a decisão de `.specify/assessments/django-refactor/decision.md`
(2026-09-18), cuja premissa central — admissão do fiscdsbagems como app dentro do SISREG — deixou
de existir com o descarte do SISREG [intake.md; research.md, Prior Art].

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | **strong** | A reconstrução está decidida e registrada [usuário, 2026-09-28], e o que o sistema faz só existe no código e no banco. Está espalhado em três camadas, com regras duplicadas e defeitos conhecidos [research.md, Data & Constraints]. Reconstruir sem essa descrição tem custo concreto de perda silenciosa [problem.md, Cost of Inaction]. |
| Evidence strength | **adequate** | O sistema atual foi medido diretamente: 37 tabelas, 34 funções, 33 gatilhos, 165 políticas criadas, 9 edge functions, 42.815 linhas de frontend, e 7 das 10 câmaras sem funcionalidade [research.md]. Faltam três coisas: o inventário do banco de **produção** (o script está pronto e testado, mas não foi rodado); o registro formal do descarte do SISREG, que não foi visto; e os volumes de produção, que não foram medidos. Suficiente para decidir o método; insuficiente para escrever a primeira spec. |
| Value vs. inaction | **strong** | A alternativa é a opção D, reconstruir lendo o código. Ela carrega os defeitos por inércia, perde as regras que não aparecem na tela (gatilhos, append-only de checklist, invariantes do offline, numeração em três lugares) e deixa a migração de dados sem referência para conferência [problem.md; concept.md, Option D]. |
| Feasibility / appetite | **adequate** | Há método concreto e escolhido (A + B), com apetite `large` aceito pelo usuário, que pediu para ignorar prazo e tamanho de time nesta avaliação [usuário, 2026-09-28]. Não é `strong` por dois motivos. A combinação A + B é maior que a A sozinha. E partes do trabalho dependem de decisões do usuário, caso a caso, sobre o comportamento desejado quando há defeito ou regra duplicada [concept.md, Assumptions]. |
| Strategic fit | **adequate** | O objetivo cumpre o Princípio I (completude binária, conferência por identificador) e o II (offline como requisito central) da constituição. Mas a seção "Restrições Tecnológicas e de Integração" ainda impõe o SISREG (banco compartilhado, `Entidade`/`Instrumento`/`Subunidade`/`Acao`) [constituição, linhas 79–104]. A emenda está aprovada pelo usuário [usuário, 2026-09-28], mas não foi feita. |
| Risk posture | **adequate** | Os riscos estão nomeados [concept.md, Rabbit holes]: protocolo de sincronização a redesenhar, permissões (RLS mais controles fora dela), regras duplicadas entre banco e cliente, divergência entre produção e migrations, granularidade das specs e sistema em movimento. Dois já têm mitigação desenhada: o mapa de rastreabilidade torna lacunas visíveis, e a validação pela opção B cruza o levantamento com o uso real. Os demais dependem de decisões ainda não tomadas (formato da spec, dono das decisões de comportamento, congelamento ou não do sistema atual). |

## Verdict & Rationale

**Go, com a abordagem A + B.**

O problema é real e decidido. A evidência sobre o sistema atual é direta, embora a do banco de
produção esteja pendente. E existe um método que atende a todas as exigências do problema.

**A opção A é o eixo de produção:**
1. O inventário do banco de produção vem primeiro.
2. Dele sai o mapa de rastreabilidade: cada objeto do banco aponta para a spec de módulo que vai
   descrevê-lo.
3. Depois, as specs de módulo são escritas em ordem de dependência, cada uma com o comportamento
   desejado e, quando for diferente, o comportamento atual e o motivo da mudança.

**A opção B entra, por decisão do usuário ("as duas coisas são importantes"), como camada de
validação, e não como segunda forma de produção.** As jornadas de cada perfil (fiscal, coordenador,
administrador, prestador) são descritas de ponta a ponta. Cada passo de cada jornada precisa
apontar para a regra correspondente nas specs de módulo. Passo sem regra correspondente é lacuna
do levantamento; regra que contradiz a jornada é erro de uma das duas. As jornadas também são o
que os usuários de cada módulo revisam, o que atenua a validação tardia, que era o ponto fraco da
opção A [concept.md, Option A — Trade-offs].

Assim, a A garante a cobertura do que não aparece na tela, e a B garante a cobertura do que o
usuário faz, e as duas se conferem mutuamente.

**Por que o go é condicionado:** nenhum critério é `weak` ou `unknown`. Evidência, viabilidade,
alinhamento estratégico e risco estão em `adequate` por pendências específicas e resolvíveis,
listadas abaixo. Elas são condição de entrada da primeira spec, não motivo para voltar a etapas
anteriores.

## Condições

Antes da **primeira** spec (a de base de dados):
1. **Rodar o inventário em produção** (`inventario-producao.sql`) e salvar o resultado em
   `inventario-producao.csv` nesta pasta. A spec de base parte dele, e não das migrations
   [problem.md, Goals].
2. **Emendar a constituição**, retirando as restrições que dependem do SISREG e registrando a
   direção nova, com o versionamento e o registro de motivo que a própria constituição exige
   [constituição, Governance]. O usuário aprova [usuário, 2026-09-28].

Antes da primeira spec **de módulo**:
3. **Fixar o formato da spec de módulo**: seções obrigatórias, com comportamento desejado,
   comportamento atual e motivo da diferença, referências ao mapa de rastreabilidade e às
   jornadas. Também o formato da jornada da opção B. Sem isso, "nos mínimos detalhes" produz
   specs desiguais [concept.md, Rabbit holes].
4. **Definir quem decide o comportamento desejado** quando houver defeito ou regra duplicada.
   Presume-se o usuário, caso a caso [problem.md, Open Questions].

## If go — Handoff to `/speckit-specify`

- **Problem**: o que o sistema atual faz só existe no código e no banco, espalhado em três camadas
  e misturado a defeitos, na véspera de ser reconstruído em um sistema novo e próprio. Sem uma
  descrição completa, funcionalidades e regras se perdem sem ninguém perceber.
- **Chosen approach**: opção A com validação pela opção B.
  - A, eixo de produção: inventário de produção → mapa de rastreabilidade → specs de módulo em
    ordem de dependência (base de dados; identidade, perfis, entidades, instrumentos, diretorias e
    câmaras; motor de checklists; fiscalização de campo com offline; e assim por diante).
  - B, validação: jornadas por perfil, com cada passo rastreado até a regra de uma spec de
    módulo, revisadas com quem usa cada módulo.
- **In scope**: todo o comportamento existente hoje (banco, funções, gatilhos, políticas, buckets,
  edge functions, telas, operação offline), descrito como deve ser no sistema novo, com as
  funcionalidades preservadas e os defeitos corrigidos. Também as jornadas de validação por
  perfil. Ordem: banco primeiro, depois módulo a módulo.
- **Out of scope**:
  - prazo, time e esforço;
  - requisitos das 7 câmaras sem funcionalidade (CRES, CATRANSP, CATEFIS, CRET, CATEGAS, CATENE,
    CREG), em branco por ora;
  - implementar o sistema novo e migrar os dados;
  - a spec 001 e a T032;
  - dados pessoais e segredos de produção;
  - arquitetura e modelos do sistema novo, que ficam para o desenho técnico das etapas seguintes.
- **Primeira spec a pedir ao `/speckit-specify`**: a de **base de dados**. Ela cobre o inventário de
  produção lido e explicado, as divergências entre produção e migrations, o mapa de rastreabilidade
  (objeto → módulo) e a ordem de dependência dos módulos, derivada das chaves estrangeiras e das
  chamadas entre funções. Só depois vêm as specs de módulo, uma de cada vez, e as jornadas de
  validação à medida que os módulos de cada jornada ficarem descritos.
- **Success metrics** [problem.md]:
  - 100% dos objetos do banco de produção referenciados no mapa;
  - 100% das telas, edge functions e funções de banco descritas;
  - toda divergência entre produção e migrations listada e classificada;
  - cada débito conhecido com decisão registrada;
  - 100% dos passos das jornadas de validação apontando para uma regra (métrica acrescentada
    pela opção B);
  - em revisão, alguém que não leu o código atual consegue responder, só com as specs, como uma
    regra funciona.
- **Carried-forward open questions**:
  - [NEEDS CLARIFICATION: onde as specs vivem — neste repositório (`specs/003-…` em diante) ou no
    repositório do sistema novo?]
  - [NEEDS CLARIFICATION: o sistema atual continua recebendo correções em produção durante o
    levantamento? Como as specs acompanham?]
  - [NEEDS CLARIFICATION: "tramitação de documentos/dados" já existe hoje (remessas, respostas,
    histórico de análise?) ou é funcionalidade nova, fora do levantamento?]
  - [NEEDS CLARIFICATION: bucket `documentos-prestadores` (usado pelo código, ausente no banco
    local) × `documentos-autos` (presente no banco local, não usado pelo código): qual é o real
    em produção?]
  - [NEEDS CLARIFICATION: documento ou ato que registra o descarte do SISREG, para citar na
    emenda da constituição]
  - [NEEDS CLARIFICATION: destino da branch `migracao-sisreg`, que hoje concentra a spec 001
    parada e esta avaliação]
  - [NEEDS CLARIFICATION: requisitos das 7 câmaras sem funcionalidade, deixados em branco]
