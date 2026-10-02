# Contrato: API da fiscalização

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md):
- prefixo `/api/v1/`, JSON, datas ISO 8601 e UUID;
- JWT;
- registro fora do alcance responde **404**;
- erros no formato `{"erro", "mensagem", "campos"}`.

Quem pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md). Toda escrita é auditada.
As escritas feitas em campo vão pela sincronização (`POST sync/fiscalizacao`); as rotas REST de
escrita valem para uso com rede e aplicam as mesmas regras e serviços.

## Configuração da câmara

| Método e rota | Descrição |
|---|---|
| `GET fiscalizacao/configuracao` · `PATCH fiscalizacao/configuracao` | configuração da câmara do usuário (admin: `?camara=`): layout, título do documento, linhas da marca d'água, limite de imprecisão |
| `POST fiscalizacao/configuracao/copiar` | `{camara_origem}`: cópia independente |
| `GET fiscalizacao/layouts` · `GET fiscalizacao/campos-marca-dagua` | peças disponíveis (registradas pelo app e pelos apps de câmara) |

## Fiscalizações

| Método e rota | Descrição |
|---|---|
| `GET fiscalizacoes?busca=&situacao=&servico=&de=&ate=&camara=&pendente_ligacao=` | lista no alcance, com totais calculados |
| `POST fiscalizacoes` | `{id?, atividade_id}`: cria a partir da atividade aprovada em que o usuário está escalado; **409** se a atividade já tem fiscalização; ou `{id?, urgencia: true, motivo_urgencia, entidade, municipio, servicos, equipe[]}`, só coordenador |
| `GET fiscalizacoes/{id}` | fiscalização, equipe, registros, totais, relatórios, reaberturas |
| `PATCH fiscalizacoes/{id}` | responsável e serviços (da câmara), em andamento |
| `POST fiscalizacoes/{id}/ligar` | `{atividade_id}`: liga a urgência a uma atividade aprovada; coordenador |
| `POST fiscalizacoes/{id}/finalizar` | com rede; também pela fila (`acao: finalizar`, com `reaberturas` conhecidas) |
| `POST fiscalizacoes/{id}/reabrir` | `{motivo}` obrigatório; só com rede; fiscal ou coordenador da câmara; **400** sem motivo |
| `DELETE fiscalizacoes/{id}` | **409** se já finalizada alguma vez ou com documento ligado (relatório, ou consulta de outros apps: termo, auto, remessa) |
| `GET fiscalizacoes/{id}/historico` | auditoria da fiscalização e do que pende dela |
| `POST fiscalizacoes/{id}/fotos/zip` | gera em segundo plano o arquivo compactado das fotos (pastas com e sem marca d'água, subpasta por registro); aviso e endereço assinado quando pronto |

## Registros de campo e vistoria

| Método e rota | Descrição |
|---|---|
| `GET fiscalizacoes/{id}/catalogos` | catálogos oferecidos para registro novo (ativos, com item vigente, da câmara, com serviço em comum) |
| `POST fiscalizacoes/{id}/registros` | `{id?, catalogo_id, nome, codigo?, endereco?, ponto?, data_hora_vistoria?}`; o código é sugerido se vazio |
| `GET registros/{id}` | registro com os itens na versão da criação, respostas, entradas manuais, registros gerados (com tipo, sigla, número, referência) e fotos |
| `PATCH registros/{id}` | nome, código, endereço, ponto, data e hora, ordem; **409** se finalizado fora do modo de edição |
| `POST fiscalizacoes/{id}/registros/ordem` | `{ordem: [ids]}` |
| `POST registros/{id}/finalizar` | finaliza o registro |
| `DELETE registros/{id}` | só com a fiscalização em andamento |
| `PUT registros/{id}/respostas/{item_versao_id}` | `{valor, observacao?}` |
| `POST registros/{id}/entradas` · `PATCH`/`DELETE entradas/{id}` · `POST registros/{id}/entradas/ordem` | entrada manual, com os valores dos campos declarados no modelo |
| `POST registros/{id}/gerados` | `{tipo, referencia, campos, texto?}`: registro acrescentado à mão, ligado a um registro do tipo referenciado, se o tipo permite |
| `PATCH registros-gerados/{id}` | texto, prazo, `suprimido`; editar marca `texto_editado`; só o que o tipo permite |
| `DELETE registros-gerados/{id}` | só os acrescentados à mão |
| `POST registros/{id}/gerados/ordem` | `{tipo, ids}`: reordena os registros de um tipo com ordem da equipe |
| `POST registros/{id}/consolidar` | devolve os registros gerados consolidados e numerados (a mesma regra da sincronização) |

## Endereço sugerido

| Método e rota | Descrição |
|---|---|
| `GET enderecos/reverso?lat=&lng=` | endereço sugerido para as coordenadas, pelo serviço de geocodificação consultado pelo servidor, com cache e limite de frequência (F20); **503** com o serviço fora, e o aparelho usa as coordenadas |

## Fotos

| Método e rota | Descrição |
|---|---|
| `POST sync/fiscalizacao/fotos` (multipart) | `{id, registro, ordem, legenda, capturada_em, latitude, longitude, checksum, checksum_original}` + `arquivo` + `arquivo_original`; idempotente pelo `id`; **409** acima de 20 fotos; **400** se o checksum não confere ou passa de 5 MB |
| `PATCH fotos/{id}` · `DELETE fotos/{id}` · `POST registros/{id}/fotos/ordem` | legenda, exclusão, ordem |
| `GET fotos/{id}/endereco?versao=marcada\|original` | endereço assinado de 5 minutos, depois de verificar o alcance |

## Relatórios

| Método e rota | Descrição |
|---|---|
| `POST fiscalizacoes/{id}/relatorios` | pede um relatório; o aparelho envia antes a fila da fiscalização; **202** com o `relatorio_id` |
| `GET fiscalizacoes/{id}/relatorios` | versões: situação, estado (vigente, substituído, desatualizado), progresso, datas, quem pediu |
| `GET relatorios/{id}/endereco` | endereço assinado do PDF (ou das partes, se legado) |
| `GET fiscalizacoes/relatorio-consolidado?filtros...&formato=pdf` | PDF consolidado da lista filtrada (R-fiscalizacao-019) |

## Indicadores

| Método e rota | Descrição |
|---|---|
| `GET indicadores/fiscalizacao?ano=&de=&ate=&servico=&municipio=&entidade=&camara=` | indicadores da R-fiscalizacao-018 no alcance; `camara` só para diretor e admin |
| `GET indicadores/fiscalizacao/exportar?...&formato=pdf\|json` | exportação do painel |

## Exportar e importar

| Método e rota | Descrição |
|---|---|
| `POST exportacoes/fiscalizacao` | `{fiscalizacoes: [ids]}` ou filtros; gera o `.zip` (F17) em segundo plano; aviso quando pronto |
| `GET exportacoes/fiscalizacao/{id}/endereco` | endereço assinado do arquivo |
| `POST importacoes` (multipart) | arquivo `.zip`; valida e devolve a prévia por linha |
| `POST importacoes/{id}/confirmar` | grava em segundo plano; resultado com os identificadores criados |
| `POST importacoes/fila` (multipart) | arquivo de fila de aparelho (F12); prévia e confirmação como acima, em nome do autor |

## Sincronização

| Método e rota | Descrição |
|---|---|
| `GET sync/fiscalizacao?desde=` | fiscalizações em que o usuário está na equipe (em andamento ou finalizadas há até 90 dias), com registros, respostas, constatações, saídas, fotos (metadados e miniatura) e remoções; e a configuração de fiscalização das câmaras alcançadas (R-fiscalizacao-027) |
| `POST sync/fiscalizacao` | `{operacoes: [{id, modelo, acao, dados}]}`: criar, alterar e excluir de cada modelo, e `finalizar`; resposta por operação (`aceita`, `recusada` com `erro`: `fiscalizacao_inexistente`, `descartada_pela_reabertura`, `fora_do_alcance`, ...) e o que mudou (consolidação e numeração) |

## Consultas para outros apps (`fiscalizacao.consultas`)

| Função | Uso |
|---|---|
| `fiscalizacao(id, usuario)` | processo sancionador, portal e apps de câmara, com o alcance aplicado |
| `fiscalizacoes_finalizadas(camara, desde, ate)` | processo sancionador (termos) |
| `registros(fiscalizacao_id)` · `registros_gerados(fiscalizacao_id, papel=None, tipos=None)` | registros gerados com tipo, nome e sigla do tipo, número, texto, prazo, data-limite e a cadeia de referências; com `papel`, só os dos tipos que o cumprem (ex.: `processo_sancionador.notificado`, `caters.acompanhado`) |
| `relatorio_vigente(fiscalizacao_id)` | anexar ao termo |
| `fiscalizacoes_por_atividade(atividade_ids)` | painel planejado × executado |
| `resumo_para_entidade(fiscalizacao_id)` · `endereco_foto_para_entidade(fiscalizacao_id, foto_id)` | portal do prestador, depois da regra do termo: unidades (nome, endereço, coordenadas), recomendações, fotos com marca d'água e relatório anexado; sem alcance de usuário; importáveis só pelo `portal_prestador` (import-linter; research V2 da spec 012) |
| `contagem_por_situacao(usuario, camara)` | painéis dos apps de câmara (em andamento, finalizadas), com o alcance do usuário |
| `tem_documento_ligado` | ponto de extensão: os apps que ligam documentos à fiscalização (termo, auto, remessa) registram uma verificação, usada na exclusão |

A escrita do registro avulso pelos apps de câmara está em [extensoes.md](./extensoes.md).

## Registros no motor de checklists (no `AppConfig.ready`)

| Registro | O que a fiscalização fornece |
|---|---|
| `checklists.pecas.registrar_estilo_secao` | `fiscalizacao.lista` e `fiscalizacao.quadro_respostas` ([research F3](../research.md)); os tipos de registro gerado vêm do modelo da câmara (R-checklists-022) |
| `checklists.pecas.registrar_modo` | `fiscalizacao.vistoria_unidade`, do tipo `lista` |
| `checklists.alcance.registrar_alcance_aparelho` | para um usuário, as câmaras das fiscalizações em que ele está na equipe e as versões de item citadas nas fiscalizações do alcance dele ([research K8 da spec 005](../../005-modulo-checklists/research.md)) |
