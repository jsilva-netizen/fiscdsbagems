# Contrato: API do motor de checklists

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md): prefixo
`/api/v1/`, JSON, JWT, registro fora do alcance responde **404**, e toda escrita é auditada. Quem
pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md). Toda manutenção é só com rede.

## Peças e modelos

| Método e rota | Descrição |
|---|---|
| `GET checklists/pecas` | peças do motor (tipos de campo, papéis, tipos de resposta, recursos de planilha) e as registradas pelos apps (saídas com os dados, contextos, modos) |
| `GET checklists/modelos?camara=` | modelos da câmara, com a versão vigente e `incompleto` |
| `GET checklists/modelos/outras-camaras` | estrutura dos modelos de todas as câmaras, para copiar (sem catálogos nem itens) |
| `POST checklists/modelos` | `{codigo, nome, definicao}`: cria o modelo na câmara do usuário, versão 1; **400** com os motivos da validação |
| `GET checklists/modelos/{id}` · `GET checklists/modelos/{id}/versoes` | modelo e versões, com autor e data |
| `POST checklists/modelos/{id}/versoes` | `{definicao}`: nova versão (R-checklists-017); **400** com os motivos |
| `PATCH checklists/modelos/{id}` | `{nome?, ativo?}` |
| `POST checklists/modelos/validar` | `{definicao}`: valida sem gravar; devolve os motivos e a prévia do formulário e das colunas da planilha |
| `POST checklists/modelos/{id}/copiar` | `{camara_destino?, com_catalogos?}`: cópia (K10); `com_catalogos` e destino diferente da própria câmara só para o administrador |
| `GET checklists/modelos/{id}/planilha-modelo` | arquivo `.xlsx` gerado pela versão vigente |

## Catálogos e itens

| Método e rota | Descrição |
|---|---|
| `GET checklists/catalogos?modelo=&servico=&ativo=` | catálogos no alcance, com a quantidade de itens vigentes |
| `POST checklists/catalogos` · `PATCH checklists/catalogos/{id}` | `{modelo, nome, codigo, servicos[], ativo}`; **400** se os serviços forem de câmaras diferentes ou de outra câmara, ou se o modelo mudar com itens. Não há `DELETE` |
| `GET checklists/catalogos/{id}/itens?em=` | versões vigentes no instante (padrão: agora), em ordem |
| `POST checklists/catalogos/{id}/itens` | `{valores, ordem?}`: cria item e versão 1 |
| `POST checklists/itens/{id}/versoes` | `{valores}`: nova versão; **400** com os motivos; sem mudança de conteúdo, **200** sem criar versão |
| `POST checklists/itens/{id}/retirar` | encerra a versão vigente |
| `POST checklists/catalogos/{id}/ordem` | `{itens: [ids]}`: reordena sem criar versão |
| `GET checklists/itens/{id}/historico` | versões com valores, vigência, autor e origem |

## Importação

| Método e rota | Descrição |
|---|---|
| `POST checklists/catalogos/{id}/importacoes` (multipart) | `.xlsx` ou `.csv` até 5 MB e 5 mil linhas: grava a prévia (K7) e a devolve |
| `POST checklists/modelos/{id}/importacoes` (multipart) | idem, para modelo que cria catálogos pela planilha |
| `GET checklists/importacoes/{id}` | prévia por linha e ausentes |
| `POST checklists/importacoes/{id}/confirmar` | `{retirar: [item_ids]}`: aplica; **409** se o catálogo mudou desde a prévia |
| `POST checklists/importacoes/{id}/descartar` | descarta a prévia |

## Sincronização

| Método e rota | Descrição |
|---|---|
| `GET sync/checklists?desde=` | protocolo do core (K8): versões de modelo, catálogos, itens e versões vigentes das câmaras alcançadas, e as versões em uso; remoções. **Sem** `POST` |

## Consultas para outros apps (`checklists.consultas`)

| Função | Uso |
|---|---|
| `catalogos_disponiveis(camara, servicos, modo)` | fiscalização e apps de câmara, para registro novo |
| `versoes_vigentes(catalogo_id, em, contexto)` | itens a aplicar, com aplicabilidade, agrupamento e ordem |
| `versao(versao_id)` · `versoes(ids)` | versão por identificador, inclusive encerrada |
| `declaracao(versao_id)` | respostas e saídas da versão, com os valores do item aplicados |

## Pontos de extensão (`checklists.pecas`, `checklists.alcance`)

Registros sem dados, feitos no `AppConfig.ready` dos apps ([research K6, K8](../research.md)).

| Função | Uso |
|---|---|
| `registrar_saida(codigo, app, nome, dados)` | fiscalização: constatação, NC, determinação, recomendação |
| `registrar_contexto(codigo, app, nome, tipo)` | CATERF: rodovia da fiscalização |
| `registrar_modo(codigo, app, nome, tipo)` | fiscalização: vistoria por unidade (`lista`); CATERF: ocorrência (`avulso`) |
| `registrar_alcance_aparelho(app, funcao)` | fiscalização: câmaras das fiscalizações em que o usuário está na equipe e versões citadas nelas |

## Serviço para apps de câmara (`checklists.servicos`)

| Função | Regra |
|---|---|
| `aplicar_configuracao_inicial(camara, pacote, app)` | `pacote = {modelos: [{codigo, nome, definicao}]}`; valida tudo antes de gravar; cria só os códigos que a câmara não tem; nunca altera; audita; devolve criados e existentes (R-checklists-020, K11) |

## Comando de migração

| Comando | Descrição |
|---|---|
| `python manage.py migrar_checklists --dump <arquivo> --config <arquivo> [--conferir]` | lê o dump e os mapas `checklists.toml` e `dtr.toml`; o arquivo de configuração diz o modelo de cada câmara e traz a tabela de ajustes; não começa sem os modelos das câmaras (K14) |
