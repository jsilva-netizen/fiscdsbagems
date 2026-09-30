# Idea Research: Planejamento anual de fiscalizações

- **Slug**: planejamento-fiscalizacoes
- **Created**: 2026-09-30
- **Evidence confidence (overall)**: medium

A evidência vem de três fontes:
- o relato do responsável, que é o dono do processo;
- o inventário do banco de produção de 2026-09-28, re-executado em 2026-09-29;
- as decisões já registradas na constituição e nas specs.

Não há planilha de planejamento no repositório, nem entrevista com coordenadores, diretores ou as
áreas de RH, financeiro e frotas. Por isso a confiança geral é média.

## Users & Demand

- **Coordenadores** elaboram hoje o planejamento em planilha por câmara (Excel ou Google), com
  municípios, datas e equipe — [source: responsável, sessão de 2026-09-30] (confidence: high, cited)
- **Diretores** aprovam o plano hoje por e-mail ou ofício, fora de qualquer sistema — [source:
  responsável, 2026-09-30] (confidence: high, cited)
- **Fiscais** precisam consultar o plano (datas, equipe, veículo) — [source: responsável,
  2026-09-30] (confidence: high, cited). Como consultam hoje (recebem a planilha, e-mail, mural) não
  foi informado — [NEEDS CLARIFICATION]
- **RH, financeiro e frotas** usam o plano aprovado para folha de ponto, diárias e reserva de
  veículos — [source: responsável, 2026-09-30] (confidence: high, cited). O sinal é de segunda mão:
  nenhuma dessas áreas foi ouvida, e os apps delas ainda não existem —
  [ASSUMPTION sobre o que cada área precisa receber] (confidence: low)
- **Mudanças depois da aprovação** são frequentes o bastante para exigir regra: as pequenas (trocar
  fiscal, ajustar data dentro do mês) sem nova aprovação; as grandes (incluir, cancelar, mudar
  diárias) com nova aprovação do diretor — [source: responsável, 2026-09-30] (confidence: high,
  cited). A frequência real não foi medida — [NEEDS CLARIFICATION]
- **Fiscalizações fora do plano** (denúncia, emergência, eventual) existem e continuam; entram como
  item extra do plano, com equipe, veículo e diárias, e aprovação do diretor — [source: responsável,
  2026-09-30] (confidence: high, cited)
- **Usuários previstos hoje sem conta**: produção tem 7 perfis ativos (2 administradores, 4 fiscais,
  1 prestador) e nenhum coordenador nem diretor. Os dois papéis que dirigem o planejamento ainda não
  usam o sistema — [source: inventário de produção, seção `perfis_agregados`] (confidence: high,
  cited)

## Prior Art

- **Sistema atual (fiscdsbagems)**: não tem planejamento. Não há tabela, status "planejada" nem data
  prevista; `fiscalizacoes.data_inicio` é o momento em que a fiscalização é criada no aparelho, não
  uma data planejada — [source: `specs/003-base-dados-producao/anotacoes/tabelas/fiscalizacoes.toml`,
  coluna `data_inicio`] (confidence: high, cited)
- **Equipe na fiscalização atual**: a fiscalização registra um fiscal só (`fiscal_nome`,
  `fiscal_email`), sem equipe, veículo ou diária — [source: catálogo da spec 003, colunas de
  `fiscalizacoes`] (confidence: high, cited). O planejamento introduz a equipe como conceito novo, e a
  fiscalização terá de refleti-la.
- **"Fiscalização Programada"** aparece como texto em objetos de processos do CATERS ("Fiscalização
  Programada dos Serviços Públicos de Limpeza Urbana…"), o que indica que o termo já é usado na
  agência — [source: `anotacoes/tabelas/caters_processes.toml`] (confidence: medium, cited)
- **SISREG (descartado)**: no assessment `django-refactor`, o planejamento era a entidade `Acao`
  (dependente de `Obrigacao`), mantida distinta da fiscalização, que era execução de campo com FK
  opcional para a ação. O SISREG foi descartado por inteiro, mas a separação entre planejado e
  executado sobreviveu na constituição — [source: `.specify/assessments/django-refactor/problem.md`,
  decisão 3; constituição, "Fronteiras de domínio"] (confidence: high, cited)
- **Plano Anual de Fiscalização em agências reguladoras**: é prática comum em agências reguladoras
  brasileiras publicar um plano anual de fiscalização, aprovado pela diretoria — [ASSUMPTION; não
  pesquisado em fonte externa nesta etapa] (confidence: medium)
- **Referência de desenho interna**: o motor de checklists (spec 005) mostrou como um app comum fica
  genérico ("lego"), com a configuração montada pela câmara na tela e peças trazidas pelos apps —
  [source: `specs/005-modulo-checklists/spec.md`; constituição v2.6.0 a v2.6.2] (confidence: high,
  cited)

## Market & Context

- **Como a agência se vira hoje**: planilha por câmara mais aprovação por e-mail ou ofício —
  [source: responsável] (confidence: high, cited)
- **Custo de não fazer** [ASSUMPTION, inferido do processo relatado] (confidence: medium):
  - o plano aprovado não fica ligado às fiscalizações executadas, então não se mede planejado ×
    executado;
  - RH, financeiro e frotas recebem os dados por fora e redigitam;
  - mudanças depois da aprovação não deixam histórico auditável;
  - o diretor não tem painel consolidado (R-core-012 prevê painéis por padrão).
- **Momento**: o sistema novo está sendo especificado do zero, com a ordem de módulos já definida
  (core → checklists → planejamento → fiscalização); incluir o planejamento agora evita
  refazer a fiscalização depois — [source: constituição, "Organização em apps"; memória do
  responsável] (confidence: high, cited)

## Data & Constraints

- **Volume atual**: 26 fiscalizações em produção (24 DSB, 2 DTR; 19 finalizadas, 7 em andamento),
  402 unidades fiscalizadas, 79 municípios, 9 entidades reguladas, 2 contratos — [source: inventário
  de produção, seções `tabelas` e `dominio_categorico`] (confidence: high, cited). O volume de um
  plano anual por câmara é pequeno (dezenas de itens), e desempenho não é restrição —
  [ASSUMPTION a partir desses números] (confidence: medium)
- **Câmaras com fiscalização hoje**: CATESA (água e esgoto), CATERS (resíduos e limpeza urbana) e
  CATERF (rodovias) — [source: inventário, `fiscalizacoes.servicos`; decisão do responsável sobre a
  CATERF] (confidence: high, cited)
- **O que se fiscaliza varia por câmara**: município (DSB), concessão ou contrato e rodovia (DTR),
  entidade regulada. Um app comum não pode trazer esses tipos chumbados — [source: responsável;
  constituição v2.6.0, "Apps comuns como motores genéricos"] (confidence: high, cited)
- **Restrições de arquitetura** [source: constituição v2.6.2; specs 004 e 005] (confidence: high,
  cited):
  - app comum, 3º na ordem; não pode depender da fiscalização nem de apps de câmara;
  - planejamento e execução são conceitos distintos;
  - o diretor só escreve para aprovar (R-core-012);
  - as áreas que consultam o plano não o editam e registram as próprias ações no app delas;
  - integração externa só por credencial de sistema (R-core-024);
  - isolamento por câmara; auditoria imutável (R-core-022).
- **Veículos e diárias**: enquanto frotas e financeiro não existem, o planejamento guarda um cadastro
  simples de veículos e a quantidade de diárias por pessoa e destino, sem valores — [source:
  responsável, 2026-09-30] (confidence: high, cited). Quando esses apps chegarem, a posse do cadastro
  de veículos pode ter de mudar de app (frotas seria o dono natural) — [ASSUMPTION] (confidence:
  medium)
- **Dados pessoais**: escala da equipe e diárias são dados de pessoal (LGPD). Quem vê nomes e
  quantidades precisa de regra — [ASSUMPTION sobre enquadramento; regra a definir] (confidence:
  medium)
- **Normas de diárias**: a concessão de diárias a servidores segue norma estadual (decreto de MS) —
  [ASSUMPTION; não verificado] (confidence: low). Como o planejamento não calcula valores, o impacto
  direto é limitado.

## Evidence Against the Idea

- **Os papéis que conduzem o fluxo não usam o sistema hoje**: 0 coordenadores e 0 diretores em
  produção. O planejamento depende de adoção por quem ainda não entra no sistema — [source:
  inventário, `perfis_agregados`] (confidence: high)
- **A demanda das áreas consumidoras é de segunda mão**: RH, financeiro e frotas não foram ouvidos, e
  seus apps não existem. Construir hoje o que eles "vão receber" arrisca errar o formato —
  [source: ausência de evidência] (confidence: medium)
- **Planilha funciona para volumes pequenos**: com dezenas de fiscalizações por ano, a planilha
  atende o essencial. O ganho do sistema está na ligação planejado × executado, no histórico e na
  integração, e não no volume — [ASSUMPTION a partir do volume] (confidence: medium)
- **Veículos no lugar provisório**: guardar veículos no planejamento até frotas existir cria dado que
  pode ter de mudar de dono depois, o que a constituição trata como exceção ("nenhum app mantém cópia
  própria de dado de outro") — [source: constituição, "Extensão para outras áreas"] (confidence:
  medium)
- **Risco de escopo**: equipe, veículos, diárias, aprovação com dois níveis de mudança, itens extras e
  integrações formam um escopo grande para um app que vem antes da fiscalização —
  [ASSUMPTION] (confidence: medium)

## Gaps & Open Questions

- [NEEDS CLARIFICATION: uma planilha real de planejamento (anonimizada), de pelo menos uma câmara,
  para confirmar colunas, granularidade e vocabulário]
- [NEEDS CLARIFICATION: granularidade: um plano por câmara por ano com itens (cada fiscalização
  prevista), ou por diretoria, ou por período menor?]
- [NEEDS CLARIFICATION: o "objeto" do item do plano em cada câmara (município, entidade, contrato,
  rodovia, serviço) e se um item pode ter vários objetos]
- [NEEDS CLARIFICATION: fronteira exata entre mudança "pequena" e "grande" (ex.: mudar a data para
  outro mês é grande? trocar o veículo é pequena?)]
- [NEEDS CLARIFICATION: como a fiscalização executada se liga ao item do plano, dado que o
  planejamento vem antes na ordem e não pode depender da fiscalização]
- [NEEDS CLARIFICATION: equipe: só fiscais da câmara, ou também motorista e servidores de outras
  câmaras e áreas? O motorista é usuário do sistema?]
- [NEEDS CLARIFICATION: o prestador vê as fiscalizações previstas para ele? (hoje não vê nada antes)]
- [NEEDS CLARIFICATION: o plano precisa estar no aparelho do fiscal sem rede?]
- [NEEDS CLARIFICATION: indicadores planejado × executado: de qual app, e para quem]
- [NEEDS CLARIFICATION: o que RH, financeiro e frotas precisam ler, e com que antecedência]
- [NEEDS CLARIFICATION: publicidade: o plano anual é publicado (transparência) ou é interno?]

## Sources

- Relato do responsável na sessão de 2026-09-30 (respostas a perguntas) — interno, sem URL
- `.specify/assessments/novo-sistema-django-apps/inventario-producao.csv` e `-parte2.csv`
  (inventário de produção de 2026-09-28, re-executado em 2026-09-29) — interno
- `specs/003-base-dados-producao/anotacoes/tabelas/fiscalizacoes.toml`,
  `anotacoes/tabelas/caters_processes.toml` — interno
- `.specify/assessments/django-refactor/problem.md` — interno
- `.specify/memory/constitution.md` (v2.6.2); `specs/004-modulo-core/spec.md`;
  `specs/005-modulo-checklists/spec.md` — interno
- Nenhuma URL externa foi consultada.

## Adendo (2026-09-30): planilha real da DSB

Fonte: [`cronograma-dsb-2026-jul-set.pdf`](./cronograma-dsb-2026-jul-set.pdf) (original: "Atualização Cronograma de Fiscalização Programada_Julho, Agosto e Setembro-2026.pdf")
("Anexo I — Cronograma de Fiscalização", DSB), fornecido pelo responsável. Não contém dado pessoal:
só municípios, serviços, quantidades e custos. (confidence: high, cited)

- **Unidade do plano = viagem**: cada linha é uma viagem com período (data de início e fim), um ou
  mais municípios (até 3) e um ou mais serviços. São 10 viagens, de fevereiro a setembro de 2026.
- **Viagem que atende duas câmaras**: "SAA, SES e RS" junta água e esgoto (CATESA) e resíduos
  sólidos (CATERS) na mesma viagem.
- **Atividades que não são fiscalização**: "Apresentação de Proposta de Revisão Tarifária" e
  "SAA, SES e Educação Ambiental" aparecem como viagens do mesmo cronograma.
- **Custos calculados**:
  - combustível = KM ÷ autonomia do veículo (8 km/L) × preço do litro (R$ 7,00);
  - diárias = quantidade (com meia diária: 7,5; 4,5) × valor unitário (R$ 200, 240 ou 250,
    conforme a viagem);
  - total = combustível + diárias.
- **Equipe como quantidade**: "QTDE. SERVIDORES" (2 a 4), sem nomes; veículo só pela autonomia,
  sem placa ou modelo.
- **Revisão periódica**: o documento é uma "Atualização" trimestral (julho, agosto e setembro) do
  cronograma, publicada como anexo.
- **Erros de conta na planilha**: nas duas viagens de agosto, os totais de diárias estão trocados
  (5 × R$ 200 aparece como R$ 1.400, e 7 × R$ 200 como R$ 1.000), o que afeta a coluna
  "combustível + diárias". É evidência a favor do cálculo automático.

Decisões do responsável depois da leitura da planilha (2026-09-30, sessão):
- **Plano e viagens**: um plano por câmara, e uma viagem pode ser conjunta de duas câmaras da mesma
  diretoria. Cada câmara tem na viagem os seus serviços e a sua equipe, e cada coordenador cuida da
  sua parte.
- **Custos**: o plano calcula o custo estimado de combustível e diárias, como a planilha; pagar
  continua sendo do financeiro.
- **Atividades**: a viagem tem uma ou mais atividades (fiscalização, apresentação, educação
  ambiental...), de uma lista de tipos da câmara; só as de fiscalização se ligam à execução.
- **Equipe**: o diretor aprova com a quantidade de servidores e de diárias; depois da aprovação, o
  coordenador escala os nomes.
- **Liberação**: a chefia de um servidor de outra câmara é o coordenador dessa câmara, e a liberação
  vem depois da aprovação do diretor. Não há motorista: a equipe é só de servidores das câmaras.
- **Aprovação de mudanças**: mudança que aumenta o valor das diárias pede aprovação do diretor.
