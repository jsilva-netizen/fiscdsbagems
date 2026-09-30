# Concept: Planejamento anual de fiscalizações

- **Slug**: planejamento-fiscalizacoes
- **Created**: 2026-09-30
- **Recommended option**: Option B — Planejamento completo, genérico e montado pela câmara

## Options

### Option A — Plano mínimo: o quê, quando e quem

- **Sketch**: cada câmara registra o seu plano anual como uma lista de fiscalizações previstas: o que
  fiscalizar, o período e a equipe. O diretor aprova o plano inteiro com um clique, e o fiscal
  consulta os itens em que está escalado, também sem rede. Veículos, diárias, itens extras, regra de
  mudança e visão do prestador ficam para uma segunda etapa. Mudança depois da aprovação é livre
  para o coordenador, apenas registrada no histórico.
- **Appetite**: small a medium (poucas semanas).
- **Trade-offs**:
  - Ganha: o elo planejado × executado desde o primeiro dia (G1, G5, G7) e um app pequeno antes da
    fiscalização.
  - Sacrifica: G2 e G3 (a regra "mudança grande volta ao diretor" não existe), G4 (extras ficam fora
    do plano), G6 (sem veículos e diárias, RH, financeiro e frotas continuam recebendo por fora) e G8
    (prestador).
  - Risco: a segunda etapa mexe no mesmo app e nas telas que o coordenador já usa; a planilha
    continua viva para veículos e diárias, e o sistema fica sendo a "segunda fonte".
- **Rabbit holes**: o "objeto" do item, porque mesmo o mínimo precisa servir a município (DSB) e a
  concessão/rodovia (DTR) sem chumbar nenhum dos dois.

### Option B — Planejamento completo, genérico e montado pela câmara

- **Sketch**: o app de planejamento é um app comum no estilo "lego", como o motor de checklists.
  - **Plano e itens**: cada câmara tem um plano por ano, com itens. Cada item diz o que fiscalizar
    (o "objeto", escolhido entre os tipos que os apps oferecem: município e entidade do core,
    concessão/rodovia do app da CATERF), o período, a equipe (fiscais da câmara e outros servidores,
    como motorista e apoio), o veículo e a quantidade de diárias por pessoa e destino.
  - **Aprovação e mudanças**: o diretor aprova o plano e os itens extras. Depois da aprovação, as
    mudanças seguem a regra do responsável, com a fronteira entre pequena e grande configurável pela
    câmara: as pequenas entram direto, e as grandes voltam para o diretor. Tudo fica em versões, com
    histórico.
  - **Leitura**: o fiscal consulta os seus itens também sem rede. O prestador vê, no portal, as
    fiscalizações previstas para a sua entidade, no nível de detalhe que a câmara definir. RH,
    financeiro e frotas leem o plano aprovado quando os apps deles existirem, e a integração externa
    usa credencial de sistema.
  - **Elo com a execução**: a fiscalização, que vem depois na ordem, aponta para o item do plano. O
    painel planejado × executado é registrado nas telas do core pelo app que cruza os dois dados.
  - **Veículos**: cadastro simples no planejamento, até o app de frotas existir.
- **Appetite**: medium a large (semanas, perto de dois meses), incerto até haver uma planilha real.
- **Trade-offs**:
  - Ganha: cobre G1 a G9; nasce pronto para as áreas (constituição, "Extensão para outras áreas")
    e sem nada de câmara chumbado (v2.6.0); é a única opção que atende a regra de mudanças e os
    extras decididos pelo responsável.
  - Sacrifica: tempo antes de começar a fiscalização.
  - Risco: construir o formato de leitura das áreas sem ouvi-las; veículos num lugar provisório.
- **Rabbit holes**:
  - **Fronteira pequena × grande**: se virar um motor de regras, estoura. Precisa de uma lista
    fechada de tipos de mudança, que a câmara marca como "pede aprovação" ou não.
  - **Visibilidade do prestador**: o que ele vê e a partir de quando, e se o aviso prévio compromete
    fiscalizações sem aviso.
  - **Equipe entre câmaras**: se o servidor de outra câmara ou área precisa de liberação da chefia
    dele, entra um segundo fluxo de aprovação.
  - **Posse do cadastro de veículos** quando frotas chegar (migração de dono).
  - **Consulta offline com escopo por pessoa**, e não por câmara, para o servidor de outra área
    escalado no item.

### Option C — Não construir agora: manter a planilha

- **Sketch**: o sistema novo segue sem planejamento. A fiscalização ganha só um campo livre de
  referência ao plano (ex.: "item 12 do plano CATESA 2027"), e a planilha e o e-mail continuam como
  hoje. O planejamento vira app depois, quando RH, financeiro e frotas forem construídos.
- **Appetite**: small (dias, só o campo na fiscalização).
- **Trade-offs**:
  - Ganha: zero atraso na fiscalização e nenhuma aposta sobre o que as áreas precisam.
  - Sacrifica: todos os objetivos, exceto um G7 parcial e manual. O diretor fica sem o painel
    planejado × executado, e as áreas continuam recebendo por fora.
  - Risco: acrescentar o planejamento depois obriga a mexer na fiscalização já pronta, para
    equipe, veículo e o elo com o item, o que a constituição quer evitar.
- **Rabbit holes**: nenhum técnico; o risco é organizacional (a planilha nunca sai).

## Recommendation

**Option B.** É a única que atende a regra de mudanças (G3), os extras aprovados (G4), a leitura
pelas áreas (G6) e o prestador (G8), todos decididos pelo responsável, e mantém o app comum sem
nada de câmara chumbado (G9; constituição v2.6.0).

A opção A resolveria o elo planejado × executado mais cedo, mas deixaria a planilha viva para
veículos e diárias e obrigaria a refazer telas e aprovação logo em seguida. A opção C evita o
esforço agora, mas empurra a mudança para dentro da fiscalização já construída.

Para conter o apetite da opção B, três limites entram já no shape:
- a fronteira pequena × grande é uma lista fechada de tipos de mudança, marcada pela câmara, e
  não um motor de regras;
- o formato que as áreas leem é o próprio plano aprovado, sem telas nem regras delas agora;
- a liberação de servidor de outra câmara ou área fica fora da primeira versão: o coordenador
  escala, e a pessoa escalada vê o item.

## Out of Scope (for the recommended option)

- Valores e pagamento de diárias, reserva de veículos e lançamento de ponto (apps de financeiro,
  frotas e RH).
- Os apps de RH, financeiro e frotas e integrações com sistemas externos deles; o plano só fica
  pronto para leitura por credencial de sistema.
- Execução da fiscalização (app de fiscalização); o planejamento não cria fiscalização.
- Otimização automática de rotas, escalas ou veículos.
- Elaborar, alterar ou aprovar sem rede.
- Publicação do plano para o público em geral.
- Liberação, pela chefia de origem, de servidores de outras câmaras ou áreas escalados na equipe.
- Motor de regras configurável para aprovação; só a lista fechada de tipos de mudança.
- Análise por IA.

## Assumptions to Validate

- Uma planilha real de pelo menos uma câmara confirma a granularidade "um item = uma fiscalização
  prevista", com o objeto, o período, a equipe, o veículo e as diárias.
- Os tipos de "objeto" do item (município, entidade, concessão/rodovia) podem ser oferecidos pelos
  apps como peças, do mesmo jeito que as peças do motor de checklists.
- Uma lista fechada de tipos de mudança cobre a regra pequena × grande do responsável.
- O prestador pode ver ao menos o objeto e o período das fiscalizações previstas para ele sem
  prejudicar a fiscalização; a câmara pode esconder itens específicos.
- RH, financeiro e frotas conseguem trabalhar lendo o plano aprovado como ele é, com pessoas,
  datas, veículo e quantidade de diárias, sem campos próprios no planejamento.
- O cadastro de veículos pode passar do planejamento para o app de frotas quando ele existir, sem
  perder o histórico dos itens.
- Coordenadores e diretores serão cadastrados e usarão o sistema. Hoje há 0 de cada em produção.
