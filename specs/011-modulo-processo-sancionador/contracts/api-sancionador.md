# Contrato: API do processo sancionador

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md): prefixo
`/api/v1/`, JSON, JWT, registro fora do alcance responde **404**, e toda escrita é auditada e entra
na linha do tempo. Quem pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md). Uma
ação fora da etapa ou da situação certa responde **409** com o motivo; uma movimentação incompleta
responde **409** com a lista do que falta.

## Processos e movimentações

| Método e rota | Descrição |
|---|---|
| `GET sancionador/processos?etapa=&situacao=&camara=&entidade=&municipio=&de=&ate=&busca=&aguardando_mim=` | processos no alcance, com a etapa, a situação do termo e os prazos calculados (N5) |
| `POST sancionador/processos` | `{fiscalizacao, numero_processo, tipo_relatorio, numero_relatorio, fluxo, prazo_resposta_dias?, observacoes?}`: cria o processo e o termo pendente de emissão; **400** se a fiscalização não estiver finalizada, for de outra câmara ou já tiver processo |
| `GET sancionador/processos/{id}` | processo completo: termo, determinações notificadas (com `alterada_depois`), respostas, análises, autos, remessa, defesas, pareceres, decisões, documentos e linha do tempo |
| `POST sancionador/processos/{id}/movimentar` | `{para, motivo?}`: passagem de etapa (N2) |
| `POST sancionador/processos/{id}/cancelar` | `{motivo}`: só nas etapas da câmara técnica |
| `DELETE sancionador/processos/{id}` | só com o termo não emitido |
| `GET sancionador/fiscalizacoes-disponiveis` | fiscalizações finalizadas da câmara sem processo, pela consulta da fiscalização |

## Termo de notificação

| Método e rota | Descrição |
|---|---|
| `PATCH sancionador/termos/{id}` | dados do termo antes da emissão |
| `POST sancionador/termos/{id}/emitir` | exige TN e relatório assinados anexados; atribui o número (N3), grava os retratos das determinações (N4), avisa a entidade (fluxo portal) |
| `POST sancionador/termos/{id}/ciencia-manual` | `{data_protocolo}`: fluxo manual; calcula a data-limite |
| `POST sancionador/termos/{id}/assinatura` | `{aceita, motivo?}`: decisão da equipe sobre o TN assinado pela entidade |
| `POST sancionador/termos/{id}/resposta-manual` | `{recebida_em}`: fluxo manual; com os documentos anexados |

## Respostas e análise

| Método e rota | Descrição |
|---|---|
| `POST sancionador/determinacoes/{id}/resposta-manual` | `{manifestacao}`: resposta recebida em papel, registrada pela equipe |
| `GET sancionador/processos/{id}/analise` | AM vigente (rascunho ou concluída) com as análises |
| `PUT sancionador/analises/{id}/respostas/{determinacao_id}` | `{resultado, texto}`; só em rascunho |
| `POST sancionador/analises/{id}/concluir` | número, documento, autos e movimentação (N7) |
| `POST sancionador/analises/{id}/refazer` | `{motivo}`: nova versão; **409** se algum auto já foi enviado |

## Autos, remessa, defesa e parecer

| Método e rota | Descrição |
|---|---|
| `PATCH sancionador/autos/{id}` | `{pena_base_uferms, pena_base_rs}`; só em `gerado` |
| `POST sancionador/autos/{id}/cancelar` | `{motivo}`; só antes do envio |
| `POST sancionador/processos/{id}/remessa` | monta e envia a remessa com os autos prontos; gera a lista (N8) |
| `POST sancionador/remessas/{id}/recebimento-manual` | `{recebida_em}`: com os protocolos anexados |
| `POST sancionador/autos/{id}/defesa-manual` | `{texto?}`: defesa recebida em papel |
| `PUT sancionador/autos/{id}/parecer` | `{analise_tecnica, recomendacao, multa_sugerida_uferms?, multa_sugerida_rs?}`; só em rascunho |
| `POST sancionador/pareceres/{id}/finalizar` | exige o parecer assinado anexado |

## Julgamento e deliberação (provisório até Q1)

| Método e rota | Descrição |
|---|---|
| `PUT sancionador/autos/{id}/decisoes/{instancia}` | `{resultado, multa_uferms?, multa_rs?, fundamentacao}`: `julgamento` ou `deliberacao`, só por membro vigente do colegiado, na etapa certa |
| `GET sancionador/colegiados` · `PUT sancionador/colegiados/{codigo}/membros` | composição; escrita só do administrador |

## Documentos

| Método e rota | Descrição |
|---|---|
| `POST sancionador/processos/{id}/documentos` (multipart) | `{tipo, referencia_tipo, referencia_id, arquivo}`: PDF ou imagem até 20 MB, conferido pelo conteúdo; tipo compatível com a etapa e com quem envia |
| `GET sancionador/documentos/{id}/endereco` | endereço assinado de curta duração |
| `POST sancionador/documentos/{id}/cancelar` | `{motivo}` |

## Portal (escritas da entidade, N6)

As telas são do portal; as rotas são deste app, só para o prestador da entidade do processo, com
termo emitido pelo portal.

| Método e rota | Descrição |
|---|---|
| `POST portal/sancionador/termos/{id}/tn-assinado` (multipart) | primeiro envio grava a ciência e o prazo (N5); reenvio troca o arquivo |
| `PUT portal/sancionador/determinacoes/{id}/resposta` | `{manifestacao, enviar}`; **409** depois da análise |
| `POST portal/sancionador/determinacoes/{id}/evidencias` (multipart) | até 20 por resposta |
| `POST portal/sancionador/termos/{id}/concluir-resposta` | exige o termo de envio anexado; grava o recebimento e a pontualidade |
| `POST portal/sancionador/remessas/{id}/recebimento` | exige o AI assinado pela entidade em cada auto; grava o recebimento e o prazo de defesa |
| `PUT portal/sancionador/autos/{id}/defesa` | `{texto, enviar}`; com anexos e ofício enviados como documentos; **409** depois de enviada |
| `POST portal/sancionador/{registro}/{id}/documentos` (multipart) | documentos da entidade: TN assinado, termo de envio, AI assinado, defesa |

O que a entidade lê no portal sai das consultas abaixo.

## Configuração

| Método e rota | Descrição |
|---|---|
| `GET sancionador/configuracao` · `PATCH sancionador/configuracao` | prazos, layouts e base legal da câmara; `POST sancionador/configuracao/copiar` `{camara_origem}` |

## Consultas para outros apps (`processo_sancionador.consultas`)

| Função | Uso |
|---|---|
| `contagem_termos(usuario, camara)` | painéis da CATESA e da CATERS: termos por situação |
| `contagem_autos(usuario, camara)` | painéis da CATESA e da CATERS: autos por situação |
| `termos_da_entidade(usuario)` · `processo_da_entidade(usuario, id)` | portal: o que a entidade vê, só com termo emitido (A-027) |
| `decisoes_finais(desde)` | futuro módulo de cobrança e dívida: autos deliberados com resultado e multa |

## Registros em outros apps (no `AppConfig.ready` e no módulo do frontend)

| App | Registro | O que o app fornece |
|---|---|---|
| fiscalização | `registrar_verificacao_documento("processo_sancionador", funcao)` | fiscalização com processo não é excluída |
| core | `core.avisos.registrar_tipo` | tipos `sancionador.*` (N13) |
| core | papel `julgador` (migração de dados, R4) | membro da câmara de julgamento sem outro papel |
| core (frontend) | menu, início por papel, abas da entidade (R-core-025) | processos, acompanhamento, "aguardando minha etapa" |

## Comandos

| Comando | Descrição |
|---|---|
| `python manage.py migrar_processo_sancionador --dump <arquivo> --excluir <lista> [--conferir]` | migração pelo mapa (N16); não roda sem a lista de teste |
