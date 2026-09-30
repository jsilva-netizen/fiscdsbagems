# Problem Definition: Planejamento anual de fiscalizações

- **Slug**: planejamento-fiscalizacoes
- **Created**: 2026-09-30
- **Inputs used**: intake.md, research.md, decisões do responsável em 2026-09-30 (sessão)

## Problem Statement

O planejamento anual de fiscalizações de cada câmara vive hoje fora do sistema. Ele é feito em
planilha e aprovado por e-mail ou ofício. Por isso:
- o que foi aprovado não se liga ao que foi executado;
- mudanças depois da aprovação não deixam histórico;
- o fiscal não tem uma fonte única de onde, quando e com quem vai a campo;
- RH, financeiro e frotas recebem os dados por fora para lançar ponto, diárias e reserva de
  veículos.

Isso importa agora porque o sistema novo está sendo construído do zero. Se o planejamento não entrar
antes da fiscalização, a execução de campo nasce sem o elo com o que foi planejado e aprovado.

## Affected Users & Stakeholders

- **Users**:
  - **Coordenador da câmara**: elabora o plano em planilha, envia para aprovação por fora e controla
    as mudanças manualmente [research: Users & Demand]. Não há coordenador cadastrado em produção
    hoje [research: `perfis_agregados`].
  - **Diretor**: aprova o plano e os itens extras por e-mail ou ofício, sem visão consolidada do
    planejado × executado [research]. Também não há diretor cadastrado em produção hoje.
  - **Fiscal**: precisa saber em que fiscalizações está escalado, quando, com quem e com qual
    veículo, inclusive em campo sem rede [research; decisão (d)].
  - **Servidores de outras câmaras ou áreas na equipe** (motorista, apoio): escalados em itens do
    plano e visíveis a RH e financeiro [decisão (b)].
  - **Prestador (entidade regulada)**: passa a ver as fiscalizações previstas para a sua entidade
    [decisão (c)]. Hoje não vê nada antes da fiscalização.
- **Stakeholders**:
  - **RH, financeiro e frotas**: usam o plano aprovado para folha de ponto, diárias e reserva de
    veículos; só leem, com fluxo próprio nos seus apps futuros [intake; constituição, "Extensão para
    outras áreas"]. O que precisam de fato não foi levantado com eles
    [NEEDS CLARIFICATION: ouvir as três áreas].
  - **Responsável pelo projeto**: define o processo e decide o escopo.
  - **Controle interno e externo** (auditoria dos atos e das diárias): interesse em rastreabilidade
    de quem planejou, aprovou e mudou [ASSUMPTION].

## Goals

- **G1**: cada câmara tem o seu plano anual de fiscalizações registrado no sistema, com o que
  fiscalizar, quando, com qual equipe, veículo e quantidade de diárias por item.
- **G2**: o diretor aprova o plano e os itens extras no sistema. A aprovação e toda mudança posterior
  ficam registradas: quem, quando e o que mudou.
- **G3**: mudanças depois da aprovação seguem a regra do responsável. As pequenas (trocar fiscal,
  ajustar data dentro do mês) não pedem nova aprovação; as grandes (incluir, cancelar, mudar diárias)
  pedem.
- **G4**: fiscalizações fora do plano (denúncia, emergência, eventual) continuam possíveis e ficam
  visíveis como extras aprovados.
- **G5**: o fiscal consulta, inclusive sem rede, os itens em que está escalado.
- **G6**: RH, financeiro e frotas passam a ter uma fonte única e confiável do plano aprovado, que
  leem sem poder alterar.
- **G7**: cada fiscalização executada pode ser comparada com o que foi planejado e aprovado
  (planejado × executado).
- **G8**: o prestador vê as fiscalizações previstas para a sua entidade, e nada de outras.
- **G9**: o planejamento serve a qualquer câmara, com o que cada uma fiscaliza (município,
  concessão, rodovia, entidade), sem ser feito sob medida para uma delas.

## Non-Goals

- Calcular valores de diárias, pagar diárias, reservar veículos ou lançar ponto: são ações de
  financeiro, frotas e RH nos apps deles, que só leem o plano.
- Executar a fiscalização: planejamento e execução são conceitos distintos (constituição, "Fronteiras
  de domínio").
- Construir agora os apps de RH, financeiro ou frotas, ou integrações com sistemas externos deles.
  O plano só precisa estar pronto para ser lido por eles.
- Otimização automática de rotas, escalas ou alocação de veículos.
- Elaborar, alterar ou aprovar o plano sem rede.
- Publicar o plano para o público em geral: fora, salvo nova decisão. O responsável escolheu que o
  prestador veja o que é dele, e não a publicação.
- Análise por IA (constituição, "Inteligência artificial").

## Success Metrics

- **Planejamento no sistema**: 100% das câmaras que fiscalizam (hoje CATESA, CATERS e CATERF) com o
  plano do ano no sistema e aprovado (baseline: 0; todas em planilha).
- **Aprovação rastreável**: 100% dos planos, itens extras e mudanças grandes com registro de
  aprovação do diretor (quem e quando) (baseline: aprovação por e-mail ou ofício, sem registro no
  sistema).
- **Histórico de mudanças**: 100% das mudanças em itens aprovados com o antes, o depois, o autor e a
  data (baseline: nenhum histórico).
- **Planejado × executado**: 100% das fiscalizações executadas ligadas a um item aprovado do plano,
  do planejamento anual ou extra (baseline: 0%; não há ligação). A taxa de execução do plano fica
  mensurável por câmara (baseline: desconhecida).
- **Redigitação pelas áreas**: 0 lançamentos de RH, financeiro e frotas refeitos à mão a partir de
  planilha ou e-mail, quando os apps deles existirem (baseline: desconhecida; qualitativo até lá).
- **Consulta do fiscal sem rede**: 100% dos itens em que o fiscal está escalado disponíveis no
  aparelho sem rede (baseline: não se aplica).
- **Isolamento**: 0 itens de outra câmara ou de outra entidade alcançados por fiscal, coordenador ou
  prestador (verificado por teste; Princípio III).
- **Tempo de aprovação** (qualitativo até haver dado): tempo entre o envio do plano e a aprovação,
  medido a partir do primeiro ano no sistema (baseline: desconhecida).

## Cost of Inaction

A fiscalização nasceria no sistema novo sem nenhuma ligação com o que foi planejado:
- a agência continuaria com planilhas por câmara e aprovação por e-mail ou ofício;
- não haveria histórico das mudanças nem medida de execução do plano;
- o diretor não teria o painel planejado × executado previsto no core (R-core-012);
- RH, financeiro e frotas continuariam recebendo dados por fora.

Acrescentar o planejamento depois obrigaria a mexer na fiscalização já construída, para criar o elo
com o plano e a equipe, que a fiscalização atual não tem (um fiscal só por fiscalização). A constituição quer evitar
esse tipo de mudança ("Independência entre apps").

Com o volume atual (26 fiscalizações em produção), a planilha atende o essencial. O custo está na
rastreabilidade, na integração com as áreas e na medida de desempenho, e não no volume.

## Open Questions

- [NEEDS CLARIFICATION: uma planilha real de planejamento (anonimizada), de pelo menos uma câmara,
  para confirmar colunas, granularidade e vocabulário]
- [NEEDS CLARIFICATION: o "objeto" de um item em cada câmara (município, entidade, contrato,
  rodovia, serviço), e se um item pode ter vários objetos]
- [NEEDS CLARIFICATION: fronteira exata entre mudança pequena e grande (mudar a data para outro mês?
  trocar o veículo? acrescentar alguém à equipe?)]
- [NEEDS CLARIFICATION: o que o prestador vê do item previsto (objeto e período? data exata? equipe?)
  e a partir de quando (depois da aprovação? com antecedência mínima?). Anunciar a fiscalização pode
  reduzir o efeito das inspeções sem aviso; confirmar se há fiscalizações que não devem aparecer
  para ele]
- [NEEDS CLARIFICATION: como a fiscalização executada se liga ao item do plano, e o que acontece
  com um item aprovado que não é executado no período (atrasado, cancelado, reprogramado)]
- [NEEDS CLARIFICATION: servidores de outras câmaras ou áreas na equipe: quem os escala, e se
  precisam aceitar ou ser liberados pela chefia deles]
- [NEEDS CLARIFICATION: o que RH, financeiro e frotas precisam ler e com que antecedência (ouvir as
  áreas)]
- [NEEDS CLARIFICATION: indicadores planejado × executado: de qual app vêm e quem os vê (diretor,
  coordenador, fiscal)]
- [NEEDS CLARIFICATION: quem pode ver nomes da equipe e quantidades de diárias (dados de pessoal):
  fiscais de outras câmaras? o prestador (não, por padrão)?]
- [NEEDS CLARIFICATION: cadastro de veículos: quando o app de frotas existir, ele assume o cadastro
  e o planejamento passa a só ler? (constituição: nenhum app mantém cópia de dado de outro)]
