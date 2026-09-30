# Decision: Planejamento anual de fiscalizações

- **Slug**: planejamento-fiscalizacoes
- **Decided**: 2026-09-30
- **Verdict**: go
- **Artifacts reviewed**: intake.md | research.md | problem.md | concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | strong | O processo real existe e está fora do sistema: planilha por câmara e aprovação por e-mail ou ofício, sem elo com a execução nem histórico de mudanças (research, relato do dono do processo). |
| Evidence strength | adequate | O relato vem do responsável, dono do processo, e o inventário de produção confirma a ausência de planejamento e de equipe. Faltam uma planilha real e a escuta de RH, financeiro e frotas, o que é tratado como premissa externa provisória (constituição). |
| Value vs. inaction | adequate | Com o volume atual (26 fiscalizações em produção), a planilha atende o essencial. O valor está na rastreabilidade, no planejado × executado e na integração com as áreas, e em não ter de refazer a fiscalização depois. |
| Feasibility / appetite | adequate | A opção B cabe em semanas, perto de dois meses, com os limites aceitos (lista fechada de tipos de mudança; áreas leem o plano como ele é; prestador vê objeto e período). A liberação pela chefia de origem, mantida no escopo, aumenta o apetite. A incerteza sobe até haver uma planilha real. |
| Strategic fit | strong | O planejamento já está na constituição como app comum, 3º na ordem, e é a exceção de escrita do diretor (R-core-012). A opção B segue "Apps comuns como motores genéricos" (v2.6.0 a v2.6.2) e "Extensão para outras áreas". |
| Risk posture | adequate | Os riscos estão identificados, e a maioria tem mitigação no shape (lista fechada, leitura sem campos das áreas, câmara esconde itens do prestador). Seguem abertos: o formato que as áreas precisam, a posse futura do cadastro de veículos, a adoção por coordenadores e diretores (0 de cada em produção hoje) e o fluxo de liberação pela chefia de origem. |

## Verdict & Rationale

**Go**, com a Opção B (planejamento completo, genérico e montado pela câmara), escolhida pelo
responsável em 2026-09-30.

O problema é real e está bem descrito pelo dono do processo. O app já tem lugar na arquitetura e na
ordem de módulos, e o custo de não fazer recai sobre a fiscalização, que teria de ser refeita para
receber o elo com o plano e a equipe.

A evidência é adequada, e não forte, porque falta uma planilha real e as áreas consumidoras não foram
ouvidas. Por isso, o que RH, financeiro e frotas precisam ler é tratado como premissa externa
provisória (constituição, "Premissas externas"), e a planilha real é pedida no início da
especificação.

Diferente do shape: a liberação, pela chefia de origem, de servidores de outras câmaras ou áreas
escalados na equipe **entra no escopo** (decisão do responsável). A spec precisa desenhar esse
segundo fluxo de aprovação sem virar motor de regras.

## If go — Handoff to `/speckit-specify`

- **Problem**: o planejamento anual de fiscalizações de cada câmara vive em planilha e é aprovado por
  e-mail ou ofício. Ele não se liga à execução, não guarda histórico das mudanças e não chega de
  forma confiável ao fiscal, ao prestador nem às áreas de RH, financeiro e frotas.
- **Chosen approach**: Opção B. App comum `planejamento`, genérico como o motor de checklists:
  - **Plano e itens**: um plano por câmara por ano, com itens. Cada item é uma fiscalização prevista,
    com objeto (tipos oferecidos pelos apps: município e entidade do core, concessão/rodovia da
    CATERF), período, equipe, veículo e quantidade de diárias por pessoa e destino, sem valores.
  - **Aprovação**: o diretor aprova o plano e os itens extras (denúncia, emergência, eventual).
  - **Mudanças depois da aprovação**: seguem uma lista fechada de tipos de mudança, que cada câmara
    marca como "pede nova aprovação" ou não. Tudo fica versionado e auditado.
  - **Equipe**: fiscais da câmara e servidores de outras câmaras ou áreas (motorista, apoio), todos
    usuários do sistema. A escalação de quem é de outra câmara ou área depende da liberação da
    chefia de origem.
  - **Veículos**: cadastro simples no planejamento, até o app de frotas existir.
  - **Leitura**: o fiscal consulta sem rede os itens em que está escalado. O prestador vê, no portal,
    o objeto e o período das fiscalizações previstas para a sua entidade, depois da aprovação, e a
    câmara pode esconder itens. RH, financeiro e frotas leem o plano aprovado como ele é; a
    integração externa usa credencial de sistema (R-core-024).
  - **Elo com a execução**: a fiscalização, que vem depois na ordem, aponta para o item do plano.
- **In scope / out of scope**:
  - Dentro: tudo o que está em "Chosen approach"; isolamento por câmara (Princípio III); auditoria
    (R-core-022); telas registradas no core (R-core-025).
  - Fora (concept.md, "Out of Scope"):
    - valores e pagamento de diárias, reserva de veículos e lançamento de ponto;
    - os apps de RH, financeiro e frotas e integrações externas deles;
    - a execução da fiscalização;
    - otimização automática;
    - elaborar, alterar ou aprovar sem rede;
    - publicação do plano para o público;
    - motor de regras de aprovação;
    - análise por IA.
  - Deixou de ser "fora": a liberação pela chefia de origem.
- **Success metrics** (problem.md):
  - 100% das câmaras que fiscalizam com o plano do ano no sistema e aprovado;
  - 100% das aprovações e mudanças grandes com registro;
  - 100% das mudanças com antes, depois, autor e data;
  - 100% das fiscalizações executadas ligadas a um item aprovado;
  - 100% dos itens do fiscal disponíveis sem rede;
  - 0 itens de outra câmara ou entidade alcançados;
  - 0 redigitações pelas áreas, quando os apps delas existirem.
- **Carried-forward open questions**:
  - [NEEDS CLARIFICATION: planilha real de planejamento (anonimizada) de pelo menos uma câmara,
    para confirmar colunas, granularidade e vocabulário — pedir no início da spec]
  - [NEEDS CLARIFICATION: os tipos de mudança da lista fechada e a marcação padrão de cada um]
  - [NEEDS CLARIFICATION: liberação pela chefia de origem: quem é a chefia de um servidor de outra
    câmara (o coordenador dela?) e de uma área que ainda não tem app no sistema (motorista de
    frotas?); o que acontece se a chefia recusa ou não responde; se a liberação vem antes ou depois
    da aprovação do diretor]
  - [NEEDS CLARIFICATION: o objeto do item: um ou vários por item; quais tipos cada câmara usa]
  - [NEEDS CLARIFICATION: item aprovado não executado no período (atrasado, cancelado,
    reprogramado) e como a fiscalização se liga ao item]
  - [NEEDS CLARIFICATION: quem vê nomes da equipe e quantidades de diárias (dados de pessoal)]
  - [NEEDS CLARIFICATION: indicadores planejado × executado: qual app os registra e quem os vê]
  - [NEEDS CLARIFICATION: posse do cadastro de veículos quando o app de frotas existir]
  - [NEEDS CLARIFICATION: premissa externa: o que RH, financeiro e frotas precisam ler, e com que
    antecedência — provisório até ouvir as áreas]
