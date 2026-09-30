# Research: Módulo DTR — app da CATERF

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-30

Decisões técnicas do app da CATERF. Valem, sem repetir, as do core (R1 a R15), do planejamento (P2
destinos, P9 motor de documentos) e da fiscalização (F1 a F18), em especial os pontos de extensão
([contracts/extensoes.md da 007](../007-modulo-fiscalizacao/contracts/extensoes.md)).

## C1 — Nome, lugar e dependências

**Decision**: app Django `caterf` em `backend/apps/caterf/` e módulo `frontend/src/caterf/`. O
módulo continua `dtr` no catálogo da spec 003 (identificador das regras `R-dtr-NNN`); o mapa de
migração declara `app = "caterf"`. Depende de `core`, `checklists`, `planejamento` e
`fiscalizacao`, pelas `consultas`, pelos serviços oferecidos a apps de câmara e pelos registros
de extensão. Nenhum app comum importa o `caterf` (import-linter).

**Rationale**: um app por câmara (constituição v2.6.0); a CATERF vem depois dos comuns na ordem.

**Alternatives considered**: app `dtr` (por diretoria, contra "um app por câmara"); renomear o
módulo na spec 003 (mexeria em identificadores já citados, sem ganho).

## C2 — Ligação com os modelos de outros apps

**Decision**: as extensões usam chave estrangeira declarada por nome para os modelos donos
(`core.Contrato`, `fiscalizacao.Fiscalizacao`, `fiscalizacao.RegistroCampo`), com proteção contra
exclusão (`PROTECT`). A remoção de uma extensão acontece pela função `apagar_extensao` que o app
registra na fiscalização (F7), chamada na mesma transação antes da exclusão do registro. O app
nunca grava nos modelos de outros apps: cria fiscalização e registro só por `fiscalizacao.servicos`
(R-dtr-016).

**Rationale**: integridade no banco único (Princípio I) e direção de dependência correta (a
CATERF depende dos comuns); a escrita continua só pelo app dono.

**Alternatives considered**: guardar só o UUID, sem chave (perderia a integridade); `CASCADE`
(exclusão de outro app apagaria dado da CATERF sem passar pela regra dela).

## C3 — Leitura do KML e segurança

**Decision**: o KML é lido no servidor, no envio, com `defusedxml` (sem entidades externas nem
expansão), limite de 10 MB e tipo conferido pelo conteúdo. A leitura extrai:
- **pontos de KM**: `Placemark` com `Point`, KM e rodovia de `ExtendedData` (`SimpleData`/`Data`)
  ou, para o KM, do `name` (o formato de hoje);
- **segmentos**: `LineString` com a rodovia, para a projeção quando não há ponto de KM.

Resultado sem ponto nem segmento é recusado com o motivo. O servidor calcula a quantidade de
pontos, o KM inicial e final e a extensão, e grava tudo na versão do traçado.

**Rationale**: R-dtr-002; KML é XML enviado por usuário (risco de XXE); ler no servidor garante o
mesmo resultado para todos os aparelhos.

**Alternatives considered**: ler no navegador, como hoje (cada aparelho interpretaria o arquivo;
sem validação central).

## C4 — Pacote do traçado para o aparelho

**Decision**: cada versão vigente do traçado gera um **pacote** (JSON compactado com gzip) com os
pontos de KM e os segmentos simplificados, guardado no repositório privado e baixado pelo
aparelho pela sincronização do app (`sync/caterf`), com checksum. O aparelho guarda o pacote no
banco local e monta, na abertura, uma grade espacial (células de ~1 km) para achar o ponto mais
próximo sem varrer os 15 mil pontos a cada leitura do GPS.

**Rationale**: R-dtr-007 e R-dtr-014; hoje a lista de 15 mil pontos viaja dentro do contrato a cada
sincronização.

**Alternatives considered**: baixar o KML e interpretar no aparelho (repete o trabalho do
servidor); índice espacial pronto (dependência extra para um volume que a grade resolve).

## C5 — Cálculo do KM no aparelho

**Decision**: o enriquecedor do ponto (registro no frontend da fiscalização, F7) calcula, para cada
leitura do GPS:
1. o ponto de KM mais próximo (grade espacial, distância de Haversine), se estiver a até o limite
   de distância (padrão 500 m);
2. senão, a projeção no segmento mais próximo (`@turf/nearest-point-on-line`, já usado hoje), com o
   KM pela distância ao longo da linha a partir do KM inicial;
3. senão, KM digitado.

Devolve rodovia, KM, distância ao traçado, origem do KM (`ponto`, `segmento`, `digitado`) e a marca
"KM impreciso" (precisão acima do limite da câmara, ou KM digitado). A tela de registro fixa o
resultado na primeira foto.

**Rationale**: R-dtr-007; mantém o comportamento de campo que já funciona, sem os traçados fixos no
código.

**Alternatives considered**: calcular no servidor (não funciona sem rede).

## C6 — Registro de ocorrência

**Decision**: o frontend da CATERF registra na fiscalização as telas do registro avulso do tipo
`caterf.ocorrencia` (F7). O assistente grava, sem rede:
- pela fila da fiscalização: o registro de campo (catálogo, versão do item, resposta, ponto, fotos,
  observação), com o identificador do aparelho;
- pela fila da CATERF (`sync/caterf`): a extensão da ocorrência, apontando para o mesmo
  identificador.

O servidor da fiscalização chama o serializador registrado para validar a extensão na mesma
transação quando ela chega junto (com rede); pela fila, a extensão chega depois e é validada contra
o registro já existente (a CATERF aceita a extensão só se o registro existe e é do tipo dela). A
consolidação gera NC e determinação pelas saídas do catálogo (R-checklists-013).

**Rationale**: R-dtr-006; cada app grava só o que é seu.

**Alternatives considered**: a fiscalização guardar os dados da rodovia num campo livre (chumbaria
câmara no comum).

## C7 — Marca d'água

**Decision**: o app registra os campos `{rodovia}`, `{km}` e `{sentido}` (servidor, para a tela de
configuração) e a função que fornece os valores no aparelho. A configuração inicial da CATERF traz as
três linhas da spec. A marca é desenhada a partir da foto original, depois de fixado o KM, pelo
componente de fotos da fiscalização (F8).

**Rationale**: R-dtr-008.

**Alternatives considered**: desenhar a marca na captura, antes do KM (sairia sem KM).

## C8 — Recálculo de KM e marcas

**Decision**: serviço em duas etapas, só com rede e com a fiscalização reaberta:
1. `prévia`: para cada ocorrência escolhida, lê as coordenadas da foto original (metadados gravados
   na captura, guardados em `Foto`) ou, sem elas, as do registro; calcula o KM com o traçado
   vigente, no servidor, pela mesma regra do C5 (implementação Python com os mesmos casos de teste
   do TypeScript); devolve antigo, novo e sem coordenada;
2. `aplicar`: grava os KMs confirmados na extensão e pede à fiscalização o redesenho das marcas
   d'água pelas originais (tarefa Celery, com os campos da CATERF), com o antes e o depois na
   auditoria.

**Rationale**: R-dtr-009; sem OCR nem ZIP.

**Alternatives considered**: recálculo no aparelho, como hoje (exige baixar todas as fotos).

## C9 — Laudo de rodovia

**Decision**: o app registra o layout `caterf.laudo_rodovia` (template HTML e função de contexto que
acrescenta, por registro, rodovia, KM, sentido, frente e item do PER, lidos da extensão e da versão
do item). O motor de relatórios da fiscalização gera o PDF (F10). A configuração inicial da CATERF
escolhe esse layout.

**Rationale**: R-dtr-011.

**Alternatives considered**: um modelo da DTR dentro do código do relatório comum, como hoje.

## C10 — Painéis

**Decision**: consultas agregadas no app (`caterf/indicadores.py`), sobre `fiscalizacao.consultas`
(registros e saídas com o alcance) e as extensões da CATERF; painéis registrados no core
(R-core-025) para a CATERF e o diretor da DTR, com os filtros dos indicadores da fiscalização.

**Rationale**: R-dtr-012.

**Alternatives considered**: painéis dentro da tela comum de indicadores (chumba câmara).

## C11 — Migração

**Decision**: comando `migrar_caterf`, que roda depois de core e checklists e **antes** da
fiscalização carregar os registros avulsos (a fiscalização precisa do tipo e do catálogo; a CATERF
precisa do registro): a ordem é core → checklists → caterf (contratos, traçados, pontos) →
fiscalização (fiscalizações e registros) → caterf (extensões de fiscalização e ocorrências). Regras:
- KML migrado vira a versão 1 do traçado, relido pelo C3; os pontos relidos são conferidos com os
  gravados em `contratos.km_points` (MIG-2);
- ocorrência: a extensão recebe rodovia, trecho, KM, sentido, KM impreciso, gravidade e os textos da
  época (frente, item do PER, cláusula, prazo); o tipo é ligado pela frente, item do PER e descrição,
  sem diferenciar maiúsculas e espaços; o que não casar fica sem versão e é listado.

**Rationale**: seção "Migração" da spec.

**Alternatives considered**: migrar os pontos do contrato sem reler o KML (não conferiria o
arquivo contra os pontos).
