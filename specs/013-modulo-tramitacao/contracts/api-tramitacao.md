# Contrato: API da tramitação

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md): prefixo
`/api/v1/`, JSON, JWT, registro fora do alcance responde **404**, e toda escrita é auditada e entra
na linha do tempo. Quem pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md).

## Configuração

| Método e rota | Descrição |
|---|---|
| `GET tramitacao/unidades` · `POST`/`PATCH tramitacao/unidades/{id}` · `PUT tramitacao/unidades/{id}/membros` | unidades `outra` e membros; escrita só do administrador |
| `GET tramitacao/tipos?unidade=` · `POST tramitacao/tipos` · `PATCH tramitacao/tipos/{id}` · `POST tramitacao/tipos/copiar` | tipos de expediente da unidade; cópia de outra unidade |
| `GET tramitacao/formatos?unidade=` · `POST tramitacao/formatos` · `POST tramitacao/formatos/{id}/versoes` | formato e versões; **400** com os motivos da validação |
| `POST tramitacao/formatos/validar` · `GET tramitacao/formatos/{id}/planilha-modelo` | validação sem gravar; planilha modelo da versão vigente |

## Expedientes

| Método e rota | Descrição |
|---|---|
| `GET tramitacao/expedientes?caixa=&situacao=&tipo=&entidade=&de=&ate=&busca=` | caixas da unidade: `a_responder`, `aguardando_entidade`, `vencidos`, `encaminhados`; ou busca |
| `POST tramitacao/expedientes` | `{tipo, assunto, entidades?, texto, prazo?, numero_processo_ems?, ligacoes?}`: rascunho; com várias entidades, um por entidade |
| `GET tramitacao/expedientes/{id}` | expediente com mensagens, documentos, ciências, movimentações, ligações (resumo ou "sem acesso"), operações no protocolo e linha do tempo |
| `PATCH tramitacao/expedientes/{id}` | só em rascunho |
| `POST tramitacao/expedientes/{id}/enviar` | atribui o protocolo, grava a mensagem, gera o comprovante (X5) e avisa; **409** se a entidade não tem usuário ativo |
| `POST tramitacao/expedientes/{id}/envio-externo` | registra envio por outro meio, com comprovante anexado |
| `POST tramitacao/expedientes/{id}/mensagens` | `{tipo: pedido_complemento \| complemento \| resposta, texto, prazo?}` |
| `POST tramitacao/mensagens/{id}/documentos` (multipart) | anexos de mensagem em rascunho; até 20 MB |
| `POST tramitacao/expedientes/{id}/encaminhar` | `{para_unidade, despacho}` (X11) |
| `POST tramitacao/expedientes/{id}/encerrar` · `.../cancelar` | `{motivo}` |
| `GET tramitacao/documentos/{id}/endereco` | endereço assinado |

## Pedidos de dados

| Método e rota | Descrição |
|---|---|
| `GET tramitacao/pedidos` · `POST tramitacao/pedidos` · `PATCH tramitacao/pedidos/{id}` | pedidos da unidade; mudar o formato vale para os próximos períodos |
| `GET tramitacao/pedidos/{id}/quadro?periodo=` | por entidade: pendente, recebido, fora do prazo, atrasado |
| `GET tramitacao/dados?formato=&entidade=&de=&ate=` · `GET tramitacao/dados/exportar?...` | envios vigentes, em JSON ou planilha |

## Integração com o protocolo externo (provisório até Q1)

| Método e rota | Descrição |
|---|---|
| `POST tramitacao/expedientes/{id}/protocolo/enviar-documentos` | `{documentos: [ids]}`: cria a operação (X10) |
| `POST tramitacao/expedientes/{id}/protocolo/abrir-processo` | quando o adaptador oferecer |
| `POST tramitacao/expedientes/{id}/protocolo/andamentos` · `.../baixar-documento` | traz andamentos e documentos como mensagens `externo` |
| `GET tramitacao/expedientes/{id}/protocolo/operacoes` | operações com situação, tentativas e retorno |

## Portal (rotas da entidade)

| Método e rota | Descrição |
|---|---|
| `GET portal/tramitacao/expedientes` · `GET portal/tramitacao/expedientes/{id}` | expedientes da entidade; abrir a mensagem grava a ciência (X4) |
| `POST portal/tramitacao/expedientes/{id}/resposta` | `{texto}` com documentos; pontualidade pelo servidor |
| `POST portal/tramitacao/protocolos` | `{unidade, assunto, texto}` com documentos: protocolo e comprovante |
| `GET portal/tramitacao/pedidos` | pedidos do período da entidade, com a situação |
| `GET portal/tramitacao/pedidos/{id}/planilha-modelo` | planilha da versão do período |
| `POST portal/tramitacao/pedidos/{id}/envio` | campos ou planilha; **400** com a lista de erros (linha, campo, motivo), sem gravar |
| `GET portal/tramitacao/documentos/{id}/endereco` | endereço assinado |

## Registros em outros apps e pontos de extensão

| App | Registro | O que a tramitação fornece |
|---|---|---|
| portal | `registrar_cartao` e páginas (V3) | "Expedientes a responder", "Pedidos de dados pendentes" |
| core | `core.avisos.registrar_tipo` | `tramitacao.expediente_recebido`, `tramitacao.pedido_aberto`, `tramitacao.lembrete_prazo`, `tramitacao.resposta_recebida`, `tramitacao.protocolo_recebido`, `tramitacao.encaminhado`, `tramitacao.prazo_vencido`, `tramitacao.protocolo_externo` |
| core (frontend) | menu e início (R-core-025) | caixa da unidade, pedidos, configuração |
| tramitação | `registrar_conector(codigo, app, nome, buscar)` | ponto de extensão para conectores das entidades (X9) |
| tramitação | porta `IntegracaoProtocolo` | adaptador do e-MS (X10) |

## Consultas para outros apps (`tramitacao.consultas`)

| Função | Uso |
|---|---|
| `dados_recebidos(usuario, formato, entidade, de, ate)` | painéis e apps futuros |
| `expedientes_ligados(usuario, tipo, objeto_id)` | mostrar, no registro ligado, os expedientes que o citam |
