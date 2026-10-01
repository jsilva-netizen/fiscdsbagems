# Contrato: pontos de extensão para os apps de câmara

Peças que os apps de câmara plugam na fiscalização (R-fiscalizacao-025, [research F7](../research.md)).
Os registros não gravam dados: são carregados quando o app inicia, no servidor pelo `AppConfig.ready`
e no aparelho pelo registro do módulo do frontend. O app de fiscalização não importa nenhum app de
câmara.

## No servidor (`fiscalizacao.extensoes`)

| Função | O que o app da câmara fornece | Uso |
|---|---|---|
| `registrar_layout_relatorio(codigo, app, template, contexto)` | template HTML e uma função que acrescenta ao contexto padrão os dados próprios (ex.: rodovia, KM, frente) | escolhido na configuração da câmara; o motor de documentos gera o PDF (F10) |
| `registrar_tipo_registro_avulso(codigo, app, serializador_extensao, apagar_extensao)` | o serializador dos dados próprios do registro avulso, gravados no modelo do app da câmara, e a remoção deles | `servicos.criar_registro_avulso(fiscalizacao, dados_comuns, dados_extensao)` valida o comum (catálogo no modo avulso, item, resposta, ponto, fotos), grava, chama o serializador da câmara na mesma transação e consolida |
| `registrar_extensao_fiscalizacao(app, serializador_extensao)` | o serializador dos dados próprios da câmara sobre a fiscalização (ex.: contrato e rodovia da CATERF), gravados no modelo do app da câmara | `servicos.criar_fiscalizacao` aceita os dados da extensão e chama o serializador na mesma transação; sem rede, o aparelho envia a extensão pela sincronização do app da câmara, depois da fiscalização |
| `registrar_verificacao_documento(app, funcao)` | função que diz se a fiscalização tem documento do app (termo, auto, remessa) | a exclusão da fiscalização é recusada se alguma disser que sim (R-fiscalizacao-015) |
| `registrar_campos_marca_dagua(app, campos)` | nomes e descrições dos campos que o app acrescenta às linhas da marca d'água (ex.: `{rodovia}`, `{km}`, `{sentido}`) | a tela de configuração oferece os campos; o aparelho preenche (abaixo) |

## No aparelho (`frontend/src/fiscalizacao/extensoes.ts`)

| Registro | O que o módulo da câmara fornece | Uso |
|---|---|---|
| enriquecedor do ponto | função que recebe o ponto (lat, lng, precisão) e devolve os dados próprios (ex.: rodovia, KM, sentido, KM impreciso), sem rede | chamada ao registrar o ponto e cada foto; os dados vão ao app da câmara pela sincronização dele |
| valores dos campos da marca d'água | função que devolve os valores dos campos registrados, para a foto | desenhados com as linhas da configuração da câmara |
| telas do registro avulso | as telas de captura (ex.: frente → item do PER → descrição → etapa → constatação ou NC → sentido → observação) | abertas no lugar da vistoria por unidade quando o catálogo é do modo avulso do tipo registrado |
| camadas do mapa | camadas sobre o mapa-base (ex.: traçado KML) | mapa da fiscalização |

## Configuração inicial entregue pelo app da câmara

| Serviço | Regra |
|---|---|
| `servicos.aplicar_configuracao_inicial(camara, pacote, app)` | valida o pacote como a tela de configuração e cria a `ConfiguracaoFiscalizacao` da câmara só se ela não existir; nunca altera a existente; registra na auditoria o app de origem; devolve o que criou e o que já existia. Usado pelo comando de configuração de cada app de câmara, na implantação ([research S4 da spec 009](../../009-modulo-catesa/research.md)) |

## Garantias

- Um app de câmara de teste (`backend/tests/apps/camara_teste/` e o módulo correspondente no
  frontend) pluga layout, registro avulso, campos de marca d'água e enriquecedor sem alteração no
  app de fiscalização (SC-008).
- O app de fiscalização não contém código de câmara; um teste falha se o código citar uma câmara
  (R-fiscalizacao-025).
- Os dados próprios da câmara nunca são gravados pelo app de fiscalização: o app da câmara é o dono
  (constituição, "Todo dado tem um app dono").
