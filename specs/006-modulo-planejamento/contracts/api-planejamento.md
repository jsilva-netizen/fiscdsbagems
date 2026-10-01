# Contrato: API do planejamento

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md):
- prefixo `/api/v1/`, JSON, datas ISO 8601 e UUID;
- JWT;
- registro fora do escopo responde **404**;
- erros no formato `{"erro", "mensagem", "campos"}`.

Quem pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md). Toda escrita é auditada.

## Configuração da câmara

| Método e rota | Descrição |
|---|---|
| `GET planejamento/configuracao` | configuração da câmara do usuário (admin: `?camara=`); cria a padrão no primeiro acesso |
| `PATCH planejamento/configuracao` | `mudancas_com_aprovacao`, `layout_cronograma`; **400** se tirar `AUMENTAR_DIARIAS` |
| `GET/POST planejamento/tipos-atividade` · `PATCH planejamento/tipos-atividade/{id}` | nome, `e_fiscalizacao`, `ativo`; nome único na câmara |
| `POST planejamento/configuracao/copiar` | `{camara_origem}`: substitui a configuração da câmara por uma cópia independente |
| `GET planejamento/colunas-cronograma` · `GET planejamento/tipos-mudanca` · `GET planejamento/tipos-destino` | peças disponíveis |
| `GET planejamento/destinos?tipo=&busca=` | busca objetos de um tipo de destino, pelo app dono, no escopo do usuário |

## Cadastros provisórios

| Método e rota | Descrição |
|---|---|
| `GET planejamento/veiculos` · `POST` · `PATCH planejamento/veiculos/{id}` | leitura pela equipe; escrita só admin; veículo usado só desativa |
| `GET planejamento/diarias?municipio=&data=` · `POST` · `PATCH planejamento/diarias/{id}` | leitura pela equipe; escrita só admin |

## Planos

| Método e rota | Descrição |
|---|---|
| `GET planejamento/planos?ano=&camara=` | planos no escopo, com situação e totais (combustível, diárias, geral) |
| `POST planejamento/planos` | `{ano, preco_litro?}`; coordenador, para a própria câmara; **409** se já existir |
| `GET planejamento/planos/{id}` | plano com as viagens (versões vigentes; o coordenador e o diretor veem também as pendentes) |
| `PATCH planejamento/planos/{id}` | `preco_litro`, só em rascunho |
| `POST planejamento/planos/{id}/enviar` | rascunho → enviado; avisa o diretor |
| `POST planejamento/planos/{id}/aprovar` | diretor; enviado → aprovado; versões em rascunho viram vigentes |
| `POST planejamento/planos/{id}/devolver` | diretor; `{motivo}` obrigatório; enviado → rascunho |

## Viagens

| Método e rota | Descrição |
|---|---|
| `POST planejamento/viagens` | no plano da câmara: logística (`data_inicio`, `data_fim`, `destinos[]`, `distancia_km`, `veiculo?`, `autonomia_km_l?`) e a participação da câmara (`quantidade_servidores`, `atividades[]`, `diarias[]`); em plano aprovado, exige `origem=extra` e `motivo_extra` |
| `POST planejamento/viagens/previa-custos` | mesma entrada, só calcula; resposta com litros, combustível, diárias e totais |
| `GET planejamento/viagens/{id}` | versões vigente e pendente, participações, escalas, histórico |
| `PATCH planejamento/viagens/{id}` | em plano rascunho: edita a versão em rascunho; em plano aprovado: cria a proposta de mudança (resposta traz `tipos` e `pede_aprovacao`) |
| `PATCH planejamento/viagens/{id}/participacoes/{camara}` | idem, para a parte da câmara do usuário; **404** para a parte de outra câmara |
| `POST planejamento/viagens/{id}/cancelar` | cria mudança `CANCELAR_VIAGEM` |
| `POST planejamento/viagens/{id}/enviar` | viagem extra: envia ao diretor |
| `POST planejamento/viagens/{id}/aprovar` · `.../devolver` | diretor; viagem extra |
| `POST planejamento/viagens/{id}/convidar` | `{camara}`; mesma diretoria, senão **400** |
| `POST planejamento/viagens/{id}/participacoes/{camara}/aceitar` · `.../recusar` | coordenador da câmara convidada |
| `GET planejamento/viagens/{id}/historico` | versões e mudanças com antes, depois, autor e decisão |

## Mudanças

| Método e rota | Descrição |
|---|---|
| `GET planejamento/mudancas?situacao=pendente` | pendências no escopo (diretor: da diretoria; coordenador: da câmara) |
| `POST planejamento/mudancas/{id}/aprovar` · `.../devolver` | diretor; devolver exige `{motivo}` |
| `POST planejamento/mudancas/{id}/retirar` | coordenador autor, enquanto pendente |

## Equipe

| Método e rota | Descrição |
|---|---|
| `GET planejamento/viagens/{id}/participacoes/{camara}/escalas` | equipe e pedidos |
| `POST planejamento/viagens/{id}/participacoes/{camara}/escalas` | `{usuario}`; própria câmara: `escalado`; outra câmara: `pedido`; **409** se passar da quantidade aprovada ou houver sobreposição de período; **400** se a participação não estiver aprovada |
| `DELETE planejamento/escalas/{id}` | coordenador da participação: cancela |
| `GET planejamento/liberacoes?situacao=pedido` | pedidos à câmara do coordenador |
| `POST planejamento/escalas/{id}/liberar` · `.../recusar` | coordenador da câmara de origem; recusar exige `{motivo}` |

## Cronograma

| Método e rota | Descrição |
|---|---|
| `GET planejamento/cronograma?camara=&diretoria=&de=&ate=&formato=xlsx\|pdf` | viagens vigentes do período, no layout da câmara, com totais |
| `GET planejamento/atualizacao?camara=&de=&ate=&formato=xlsx\|pdf` | mudanças aplicadas no período |

## Leituras para outros

| Método e rota | Descrição |
|---|---|
| `GET planejamento/minhas-viagens` | viagens vigentes em que o usuário tem escala ativa (inclusive de outra câmara) |
| `GET sync/planejamento?desde=` | protocolo do core: as mesmas viagens e remoções; **sem** `POST` |
| `GET portal/planejamento/previstas` | prestador: atividades vigentes de planos aprovados da própria entidade, não escondidas: tipo, serviços, destinos, mês e datas |
| `GET integracao/planejamento/viagens?desde=&camara=` | **integração** (`Api-Key` com escopo `planejamento.leitura`) e papéis com `planejamento.leitura_aprovados`: viagens vigentes de planos aprovados, com equipe, veículo, quantidades, valores e histórico; só leitura |

## Consultas para outros apps (`planejamento.consultas`)

Não são rotas: são as funções que os apps posteriores importam ([research P12](../research.md)).

| Função | Uso |
|---|---|
| `atividades_de_fiscalizacao(camara, desde, ate)` | a fiscalização escolhe a atividade planejada a que a fiscalização executada corresponde |
| `atividade(atividade_id)` | a fiscalização mostra a atividade ligada, inclusive retirada ou de viagem cancelada (marcada) |
| `viagens_aprovadas(camara, desde, ate)` | RH, financeiro e frotas, nos apps deles |

## Configuração inicial entregue pelo app da câmara

| Serviço | Regra |
|---|---|
| `servicos.aplicar_configuracao_inicial(camara, pacote, app)` | valida o pacote e cria a `ConfiguracaoPlanejamento` e os tipos de atividade da câmara só se ela não tiver configuração; nunca altera a existente; registra na auditoria o app de origem. Usado pelo comando de configuração de cada app de câmara, na implantação ([research S4 da spec 009](../../009-modulo-catesa/research.md)) |

## Ponto de extensão (`planejamento.destinos`)

O registro não grava dados: é configuração carregada quando o app inicia ([research P2](../research.md)).

| Função | Uso |
|---|---|
| `registrar_tipo_destino(codigo, nome, app, buscar, resolver)` | apps que oferecem tipos de destino (CATERF: concessão, rodovia). `buscar(usuario, texto)` e `resolver(objeto_id)` usam as `consultas` do próprio app, com o escopo do usuário |
