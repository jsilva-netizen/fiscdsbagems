# Contrato: API do core

Prefixo `/api/v1/`. JSON, datas em ISO 8601 (UTC), identificadores UUID. Autenticação por
`Authorization: Bearer <token de acesso>` (JWT), exceto onde indicado. Registro fora do escopo do
usuário responde **404**, nunca 403, para não revelar que existe ([research R7](../research.md)).
Quem pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md).

Erros: `{"erro": "<codigo>", "mensagem": "<texto para o usuário>", "campos": {...}}`.

## Entrada e acesso (sem login)

| Método e rota | Entrada | Resposta |
|---|---|---|
| `POST auth/entrar` | `email`, `senha`, `aparelho_token?` | **200** `{acesso, renovacao}` se o aparelho estiver confirmado; **202** `{desafio_id}` se precisar de código; **400** genérico para qualquer falha (não revela se o e-mail existe); **429** acima do limite de tentativas |
| `POST auth/verificar` | `desafio_id`, `codigo`, `rotulo_aparelho` | **200** `{acesso, renovacao, aparelho_token}`; **400** código errado ou vencido; após 5 erros o desafio é encerrado |
| `POST auth/reenviar-codigo` | `desafio_id` | **202**; o código anterior deixa de valer |
| `POST auth/primeiro-acesso` | `token` (do e-mail), `senha` | **204**; depois o usuário usa `auth/entrar` |
| `POST auth/recuperar` | `email` | **202** sempre (existindo ou não o e-mail) |
| `POST auth/redefinir` | `token`, `senha` | **204**; revoga os aparelhos confirmados |

## Sessão (com login)

| Método e rota | Resposta |
|---|---|
| `POST auth/renovar` `{renovacao}` | **200** novos tokens; **401** se o usuário foi desativado, o aparelho revogado ou o token está bloqueado |
| `POST auth/sair` `{renovacao}` | **204**; bloqueia o token de renovação |

## O próprio usuário

| Método e rota | Descrição |
|---|---|
| `GET eu` | perfil: nome, e-mail, papel, diretoria, câmara, entidade |
| `PATCH eu` | só `nome` |
| `POST eu/senha` | `senha_atual`, `senha_nova`; revoga os outros aparelhos |
| `GET eu/aparelhos` · `DELETE eu/aparelhos/{id}` | lista e revoga os próprios aparelhos confirmados |

## Usuários

| Método e rota | Descrição |
|---|---|
| `GET usuarios` | lista; o admin vê todos os campos, a equipe vê nome, papel e câmara (R-core-009); filtros `papel`, `camara`, `ativo`, `entidade` |
| `POST usuarios` | admin cria: `nome`, `email`, `papel`, vínculos; envia o e-mail de primeiro acesso |
| `GET usuarios/{id}` · `PATCH usuarios/{id}` | admin altera nome, e-mail, papel e vínculos |
| `POST usuarios/{id}/desativar` · `POST usuarios/{id}/reativar` | admin |
| `DELETE usuarios/{id}` | admin; **409** se houver registro vinculado (oferece desativar) |
| `POST usuarios/{id}/reenviar-primeiro-acesso` | admin |
| `GET usuarios/{id}/aparelhos` · `DELETE usuarios/{id}/aparelhos/{aparelho}` | admin |

## Estrutura e referência

| Método e rota | Descrição |
|---|---|
| `GET diretorias` · `GET camaras` · `GET servicos` · `GET papeis` | leitura para usuário ativo (`papeis`, só admin) |
| `POST/PATCH` nas mesmas rotas | só admin |
| `GET municipios?busca=` | leitura para usuário ativo |
| `POST/PATCH municipios` | só admin |

## Entidades reguladas

| Método e rota | Descrição |
|---|---|
| `GET entidades` | equipe: todas (filtros `servico`, `diretoria`, `ativa`, `busca`); prestador: só a própria |
| `POST entidades` · `PATCH entidades/{id}` | admin, coordenador e fiscal; `id` pode vir do aparelho; **409** se o CNPJ já existir |
| `POST entidades/{id}/desativar` · `POST entidades/{id}/reativar` | admin, coordenador e fiscal |
| `DELETE entidades/{id}` | **409** se houver registro vinculado (R-core-017) |
| `PUT entidades/{id}/logotipo` (multipart) · `DELETE entidades/{id}/logotipo` | PNG ou JPEG até 2 MB; resposta traz o endereço público |
| `GET entidades/{id}/documentos` · `POST entidades/{id}/documentos` (multipart) | PDF, PNG ou JPEG até 20 MB |
| `GET entidades/{id}/documentos/{doc}/endereco` | endereço assinado de 5 minutos, só para quem alcança a entidade |
| `DELETE entidades/{id}/documentos/{doc}` | equipe |

## Contratos

| Método e rota | Descrição |
|---|---|
| `GET contratos?entidade=&vigente=` | equipe; prestador recebe lista vazia |
| `POST contratos` · `PATCH contratos/{id}` | admin, coordenador e fiscal; `id` pode vir do aparelho |
| `DELETE contratos/{id}` | **409** se outro app referenciar o contrato |

## Auditoria

| Método e rota | Descrição |
|---|---|
| `GET auditoria?tabela=&registro=&desde=&ate=` | admin, coordenador e fiscal, só registros do escopo de cada um; sem escrita |

## Sincronização

| Método e rota | Descrição |
|---|---|
| `GET sync/core?desde=<marca>` | alterações e remoções no escopo do usuário desde a marca do servidor: `{marca, diretorias, camaras, servicos, municipios, entidades, contratos, remocoes}` |
| `POST sync/core` | `{operacoes: [{id, modelo, acao, dados}]}` idempotente; resposta por operação: `aceita` ou `recusada` com `erro` |

## Integrações

| Método e rota | Descrição |
|---|---|
| `GET/POST credenciais` · `POST credenciais/{id}/revogar` | só admin; a chave aparece uma vez, na criação |
| Rotas marcadas "integração" | aceitam `Authorization: Api-Key <chave>` com os escopos da credencial; nenhuma no core por enquanto, a primeira virá com o planejamento |
