# Contrato: API do app da CATERF

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md): prefixo
`/api/v1/`, JSON, JWT, registro fora do alcance responde **404**, e toda escrita é auditada. Quem
pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md).

## Contratos rodoviários e traçados

| Método e rota | Descrição |
|---|---|
| `GET caterf/contratos` | contratos rodoviários com as rodovias, o traçado vigente (pontos lidos, extensão) e "sem traçado" |
| `POST caterf/contratos` · `PATCH caterf/contratos/{id}` | `{contrato, rodovias[]}`: estende um contrato do core |
| `POST caterf/contratos/{id}/tracados` (multipart) | arquivo KML até 10 MB; lê pontos e segmentos (C3); **400** com o motivo se não houver nenhum; a nova versão vira vigente e a anterior, substituída |
| `GET caterf/contratos/{id}/tracados` | versões, com situação, pontos, extensão, quem enviou e quando |
| `GET caterf/tracados/{id}/endereco` · `GET caterf/tracados/{id}/pacote` | endereço assinado do KML e do pacote do aparelho |
| `GET caterf/configuracao` · `PATCH caterf/configuracao` | limite de distância ao traçado |

## Fiscalização rodoviária e ocorrências

| Método e rota | Descrição |
|---|---|
| `GET caterf/fiscalizacoes?rodovia=` | fiscalizações rodoviárias no alcance, com a rodovia (a lista comum e os filtros comuns vêm da fiscalização) |
| `GET caterf/fiscalizacoes/{fiscalizacao_id}` | extensão: contrato, rodovia principal, traçado vigente |
| `GET caterf/ocorrencias?fiscalizacao=` | extensões das ocorrências (rodovia, KM, sentido, KM impreciso, etapa, gravidade) |
| `PATCH caterf/ocorrencias/{registro_id}` | sentido, trecho, etapa, gravidade; o KM só muda por recálculo |

A criação da fiscalização rodoviária e da ocorrência passa pela fiscalização
(`POST fiscalizacoes` com a extensão, e `servicos.criar_registro_avulso`), que chama os
serializadores registrados pela CATERF ([research C6](../research.md)).

## Recálculo de KM

| Método e rota | Descrição |
|---|---|
| `POST caterf/fiscalizacoes/{fiscalizacao_id}/recalculos` | `{ocorrencias?: [ids], so_imprecisas?: bool}`; **409** se a fiscalização não estiver reaberta; devolve a prévia (antigo, novo, sem coordenada) |
| `POST caterf/recalculos/{id}/aplicar` | `{confirmadas: [ids]}`; grava os KMs e pede o redesenho das marcas d'água em segundo plano |
| `POST caterf/recalculos/{id}/descartar` | descarta a prévia |

## Painéis

| Método e rota | Descrição |
|---|---|
| `GET indicadores/caterf?ano=&de=&ate=&rodovia=&entidade=` | fiscalizações rodoviárias, NCs por rodovia, ocorrências por frente, principais tipos, ranking de rodovias |

## Sincronização

| Método e rota | Descrição |
|---|---|
| `GET sync/caterf?desde=` | contratos rodoviários e pacotes dos traçados vigentes das fiscalizações da equipe e das atividades escaladas; extensões das fiscalizações e das ocorrências dessas fiscalizações; remoções |
| `POST sync/caterf` | operações idempotentes sobre `FiscalizacaoRodoviaria` e `Ocorrencia`; recusada com `registro_inexistente` se o registro de campo ainda não chegou (o aparelho reenvia depois da fila da fiscalização) |

## Registros nos apps comuns (feitos no `AppConfig.ready` e no módulo do frontend)

| App | Registro | O que a CATERF fornece |
|---|---|---|
| planejamento | `registrar_tipo_destino("concessao", ...)`, `registrar_tipo_destino("rodovia", ...)` | busca e resolução pelos contratos rodoviários vigentes, com o alcance |
| checklists | valor de contexto `rodovia_fiscalizacao` | a rodovia principal da fiscalização rodoviária |
| checklists | configuração inicial | modelo "Ocorrências do PER" da CATERF (spec 005) |
| fiscalização | `registrar_extensao_fiscalizacao("caterf", ...)` | serializador de `FiscalizacaoRodoviaria` |
| fiscalização | `registrar_tipo_registro_avulso("caterf.ocorrencia", ...)` | serializador e remoção de `Ocorrencia` |
| fiscalização | `registrar_campos_marca_dagua("caterf", ["rodovia", "km", "sentido"])` | campos da marca d'água |
| fiscalização | `registrar_layout_relatorio("caterf.laudo_rodovia", ...)` | template e contexto do laudo |
| fiscalização (aparelho) | enriquecedor do ponto; valores da marca d'água; telas do registro avulso; camada do traçado no mapa | C5, C6, C7 |
| core | telas e painéis (R-core-025) | Definições (traçados), painéis da CATERF |
