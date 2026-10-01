# Contrato: API do app da CATESA

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md): prefixo
`/api/v1/`, JSON, JWT, e registro fora do alcance responde **404**. Quem pode chamar cada rota está
em [matriz-acesso.md](./matriz-acesso.md).

## Painel

| Método e rota | Descrição |
|---|---|
| `GET painel/catesa` | `{fiscalizacoes: {em_andamento, finalizadas}, termos?: {...}, autos?: {...}}`, com o alcance do usuário ([data-model](../data-model.md)); `termos` e `autos` só com o processo sancionador instalado; só leitura |

O app não tem outras rotas: a configuração da CATESA é mantida nas telas dos apps comuns, e o app
não tem sincronização (o painel é online).

## Comando de implantação

| Comando | Descrição |
|---|---|
| `python manage.py configurar_catesa` | valida e aplica o pacote de configuração inicial pelos serviços dos apps comuns ([research S4](../research.md)); idempotente; `--conferir` só lista o que seria criado e o que já existe |

## Serviços dos apps comuns usados pelo app

| App | Serviço | Regra |
|---|---|---|
| checklists | `servicos.aplicar_configuracao_inicial(camara, pacote, app)` | cria o modelo pela chave (câmara, código) se não existir; valida como a tela de montagem ([R-checklists-020 da spec 005](../../005-modulo-checklists/spec.md)) |
| fiscalização | `servicos.aplicar_configuracao_inicial(camara, pacote, app)` | cria a `ConfiguracaoFiscalizacao` da câmara se não existir ([extensões da 007](../../007-modulo-fiscalizacao/contracts/extensoes.md)) |
| planejamento | `servicos.aplicar_configuracao_inicial(camara, pacote, app)` | cria a `ConfiguracaoPlanejamento` e os tipos de atividade da câmara se não existirem ([API da 006](../../006-modulo-planejamento/contracts/api-planejamento.md)) |

## Consultas lidas pelo painel

| App | Consulta |
|---|---|
| fiscalização | `consultas.contagem_por_situacao(usuario, camara)` ([API da 007](../../007-modulo-fiscalizacao/contracts/api-fiscalizacao.md)) |
| processo sancionador | contagem de termos e de autos por situação, com o alcance; a definir na spec do processo sancionador |

## Registros nos apps comuns (no `AppConfig.ready` e no módulo do frontend)

| App | Registro | O que a CATESA fornece |
|---|---|---|
| core (frontend) | painel do início (R-core-025) | painel da CATESA, para coordenador e fiscal da CATESA, diretor da DSB e administrador |
| checklists, fiscalização, planejamento | configuração inicial | o pacote (acima), aplicado pelo comando |
