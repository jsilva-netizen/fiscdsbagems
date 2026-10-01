# Contrato: API do app da CATERS

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md): prefixo
`/api/v1/`, JSON, JWT, registro fora do alcance responde **404**, e toda escrita é auditada. Quem
pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md). O app é só com rede.

## Processos

| Método e rota | Descrição |
|---|---|
| `GET caters/processos?municipio=&situacao=&de=&ate=&busca=` | processos no alcance, com o prazo de resposta efetivo, a origem dele, os dias restantes e a quantidade de recomendações em aberto (T5) |
| `POST caters/processos` | `{numero_processo, municipio, objeto, tecnico?, fiscalizacao?, datas e AR?, prazo_resposta_informado?, observacoes?}`; **400** com número repetido ou fiscalização não finalizada ou de outra câmara; gera o evento "criação" |
| `GET caters/processos/{id}` | processo com resposta do município, dilações, documentos, relatório vigente da fiscalização ligada e linha do tempo |
| `PATCH caters/processos/{id}` | dados, datas e AR, situação (exceto `encerrado`); cada mudança de situação ou de AR gera evento; **409** se encerrado |
| `POST caters/processos/{id}/encerrar` · `POST caters/processos/{id}/reabrir` | `{motivo}` obrigatório para reabrir; geram evento |
| `DELETE caters/processos/{id}` | só administrador; **409** se houver recomendação, documento ou evento além da criação |
| `GET caters/fiscalizacoes-disponiveis` | fiscalizações finalizadas da CATERS no alcance, pela consulta da fiscalização |
| `POST caters/processos/{id}/importar` | `{prazo_dias?: 30}`: importa recomendações e determinações (T4); devolve criadas e com origem removida |

## Recomendações acompanhadas

| Método e rota | Descrição |
|---|---|
| `GET caters/recomendacoes?situacao=&municipio=&processo=` | de todos os processos no alcance, com a situação calculada; totais em aberto, vencidas e no prazo |
| `POST caters/processos/{id}/recomendacoes` | cadastro manual |
| `PATCH caters/recomendacoes/{id}` | código, descrição (só manual), categoria, prioridade, prazo, `em_andamento`, resposta do titular, evidência, observações |
| `POST caters/recomendacoes/{id}/cumprir` | `{data?}`: padrão, hoje no fuso de MS |
| `DELETE caters/recomendacoes/{id}` | só manual; gera evento; **409** se importada |

## Resposta, dilações e linha do tempo

| Método e rota | Descrição |
|---|---|
| `PUT caters/processos/{id}/resposta` | `{recebida_em, protocolo?, situacao_cronograma, observacoes?}`; gera evento "resposta recebida"; situação vai a `em_analise` com adequação solicitada ou a `respondido` nos demais casos, se não estiver encerrado |
| `POST caters/processos/{id}/dilacoes/previa` | `{data_referencia, dias}`: devolve o novo prazo, sem gravar |
| `POST caters/processos/{id}/dilacoes` | `{data_referencia, dias, pedido_em?, protocolo_municipio?, decisao, manter_situacao?, observacoes?}`: grava e, se aprovada, muda prazo, situação e linha do tempo na mesma transação (T6). Sem `PATCH` nem `DELETE` |
| `POST caters/processos/{id}/eventos` | `{tipo: registro \| observacao, descricao}`. Sem `PATCH` nem `DELETE` (405) |

## Documentos

| Método e rota | Descrição |
|---|---|
| `POST caters/processos/{id}/documentos` (multipart) | `{tipo, titulo?, descricao?, arquivo}`: PDF ou imagem até 20 MB, conferido pelo conteúdo; gera evento |
| `GET caters/documentos/{id}/endereco` | endereço assinado de curta duração, depois da verificação de alcance |
| `POST caters/documentos/{id}/remover` | marca `removido_em`, gera evento; o arquivo é mantido |

## Painel

| Método e rota | Descrição |
|---|---|
| `GET painel/caters` | processos em acompanhamento, respostas atrasadas, recomendações vencidas, aguardando análise e, com o processo sancionador instalado, termos da CATERS por situação (T10) |

## Comandos

| Comando | Descrição |
|---|---|
| `python manage.py configurar_caters [--conferir]` | aplica o pacote de configuração inicial (T2) |
| `python manage.py migrar_caters --dump <arquivo> [--conferir]` | migração pelo mapa `caters.toml` (T12) |

## Registros nos apps comuns (no `AppConfig.ready` e no módulo do frontend)

| App | Registro | O que a CATERS fornece |
|---|---|---|
| fiscalização | `registrar_verificacao_documento("caters", funcao)` | a fiscalização com processo da CATERS não é excluída (T3) |
| core | `core.avisos.registrar_tipo` | `caters.resposta_atrasada`, `caters.recomendacao_vencida`, `caters.aguardando_analise` (T9) |
| core (frontend) | menu, início e painel (R-core-025) | Processos, Recomendações e o painel da CATERS, para a CATERS, o diretor da DSB e o administrador |
| checklists, fiscalização, planejamento | configuração inicial | o pacote, pelo comando |

## Consultas usadas

| App | Consulta |
|---|---|
| fiscalização | `fiscalizacoes_finalizadas(camara, desde, ate)`, `fiscalizacao(id, usuario)`, `saidas(fiscalizacao_id)`, `relatorio_vigente(fiscalizacao_id)` |
| processo sancionador | `consultas.contagem_termos(usuario, camara)` ([API da 011](../../011-modulo-processo-sancionador/contracts/api-sancionador.md)) |
