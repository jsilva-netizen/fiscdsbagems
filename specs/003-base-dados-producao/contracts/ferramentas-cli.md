# Contrato: ferramentas de linha de comando

**Onde**: `specs/003-base-dados-producao/ferramentas/`
**Requisito**: Python 3.11+ (usa `tomllib`), sem pacotes externos.
**Como rodar**: de dentro de `specs/003-base-dados-producao/`. Caminhos relativos nas opções são
resolvidos a partir da **raiz do repositório** (a ferramenta a localiza subindo até achar `.specify/`),
então os padrões abaixo valem de qualquer máquina com o repositório clonado.
Nenhuma ferramenta conecta em produção (o inventário de produção é feito pelo SQL Editor, fora
delas). A única que altera um banco é `inventario_migrations --reconstruir`, e só o banco
**local**, com confirmação; as demais só leem arquivos.

## `python -m ferramentas.gerar`

Lê os inventários e as anotações e (re)escreve os documentos gerados.

| Opção | Padrão | Efeito |
|---|---|---|
| `--producao-parte1 <csv>` | `.specify/assessments/novo-sistema-django-apps/inventario-producao.csv` | inventário de produção, parte 1 |
| `--producao-parte2 <csv>` | `.../inventario-producao-parte2.csv` | parte 2 |
| `--migrations <dir>` | `specs/003-base-dados-producao/inventario/` | inventários do banco das migrations (`migrations-parte1.tsv`, `migrations-parte2.tsv`) |
| `--verificar` | desligado | não escreve nada; só compara o que seria gerado com o que está no disco e sai com erro se diferir (SC-007) |

**Saída (código de retorno)**:
- `0` — gerado (ou, com `--verificar`, idêntico ao disco);
- `1` — inventário inválido (seção ausente, total que não bate, JSON que não abre);
- `2` — anotação inválida (TOML com erro, chave órfã, campo obrigatório ausente, colisão de chave);
- `3` — com `--verificar`, o que está no disco difere do que seria gerado.

**Mensagens**: sempre em português e com a chave do objeto envolvido. A última linha é um resumo
de completude: objetos sem anotação, sem módulo, divergências não classificadas e achados
aguardando decisão.

## `python -m ferramentas.inventario_migrations`

Roda os dois scripts SQL de inventário no Supabase **local**, depois de reconstruído pelas
migrations, e grava `inventario/migrations-parte1.tsv` e `inventario/migrations-parte2.tsv`.

| Opção | Padrão | Efeito |
|---|---|---|
| `--container <nome>` | `supabase_db_fiscdsbagems` | contêiner do Postgres local |
| `--reconstruir` | desligado | antes de inventariar, reconstrói o banco local só pelas migrations (apaga os dados locais — pede confirmação) |

Recusa rodar se o host do banco não for local.

## `python -m ferramentas.varredura`

Percorre todos os arquivos da pasta da spec e procura dado sensível (research.md D8). Retorno `0`
= nada encontrado; `1` = encontrado, com arquivo, linha e tipo do achado (sem repetir o valor
encontrado na mensagem).

## `python -m unittest discover -s ferramentas/testes`

Testes das próprias ferramentas (abaixo, em [quickstart.md](../quickstart.md)).
