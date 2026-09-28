# Contrato: arquivos de anotação (TOML)

**Onde**: `specs/003-base-dados-producao/anotacoes/`
**Quem escreve**: autores do levantamento (à mão). **Quem lê**: o gerador (só leitura).
**Regra geral**: toda chave de objeto segue [data-model.md](../data-model.md#chave-do-objeto).
Chave anotada que não existe no inventário é **órfã** e faz o gerador falhar com a lista das
órfãs, porque normalmente é erro de digitação ou objeto que mudou em produção.

## Organização dos arquivos

| Arquivo | Conteúdo |
|---|---|
| `modulos.toml` | a lista de módulos, ordem, app e observação |
| `tabelas/<tabela>.toml` | a tabela ou view e tudo que pende dela: colunas, restrições, índices, gatilhos, políticas |
| `funcoes/<nome>.toml` | uma função (todas as sobrecargas de um mesmo nome no mesmo arquivo) |
| `arquivos.toml` | buckets, com políticas de `storage.objects` agrupadas por bucket |
| `acesso.toml` | papéis, privilégios, privilégios padrão, segredos |
| `plataforma.toml` | objetos classificados `plataforma` (em bloco, com motivo) |
| `divergencias.toml` | classificação e justificativa de cada divergência |
| `achados.toml` | achados, opções, recomendação e decisão |
| `externos.toml` | informações do sistema atual que não estão no banco (FR-023) |

## Campos

### Objeto (em `tabelas/`, `funcoes/`, `arquivos.toml`, `acesso.toml`)

```toml
[objeto."tabela:unidades_fiscalizadas"]
modulo = "fiscalizacao"            # obrigatório, ou `fora_escopo` (abaixo)
finalidade = """..."""             # obrigatório para tabela, view, função, bucket
fonte = ["src/pages/VistoriarUnidade.jsx:315", "funcao:gerar_ncs_unidade(...)"]

[objeto."coluna:unidades_fiscalizadas.status"]
significado = """..."""            # obrigatório para coluna
fonte = ["src/lib/offline/syncEngine.ts:1013"]
hipotese = false                   # true quando não há fonte que confirme
```

- **Campo de texto por tipo** (o gerador conta como "sem anotação" quem não tem):
  `finalidade` para tabela, view, função, bucket, tipo, papel, segredo, extensão, event trigger e
  privilégio padrão; `significado` para coluna; `efeito` para gatilho; `descricao` (a política
  em linguagem simples: quem, operação, condição) para política. Restrição, índice e privilégio
  não exigem texto: a definição gerada já os descreve.
- **Função** aceita também `chamada_por` (lista de telas ou edge functions, com arquivo:linha) e
  `regra_de_negocio` (texto: qual regra a função implementa e qual spec de módulo vai descrevê-la).
- **Herança de dono**: coluna, restrição, índice, gatilho, política e privilégio de tabela herdam
  o dono da tabela; política de `storage.objects` herda do bucket citado em `bucket_id = '...'`;
  privilégio de função herda da função. Objeto fora do escopo (próprio ou herdado) não exige texto.
- `modulo` é obrigatório para tabela, view, função e bucket. Coluna, restrição, índice, gatilho e
  política herdam o módulo da tabela, a menos que declarem outro.
- `fora_escopo = { classificacao = "plataforma" | "descartar", motivo = "...", achado = "A-NNN" }`
  substitui `modulo`. `achado` é obrigatório quando a classificação é `descartar`.
- `fonte` vazio ou ausente obriga `hipotese = true`.

### `modulos.toml`

```toml
[[modulo]]
id = "core"
nome = "Core"
ordem = 1
app = "core"
spec = ""                          # preenchido quando a spec de módulo existir
observacao = ""
```

### `divergencias.toml`

```toml
[divergencia."funcao:is_staff()"]
classificacao = "producao_vale"    # producao_vale | residuo_descartar | defeito_corrigir | aguardando_decisao
justificativa = """..."""
resumo_codigo = """..."""          # obrigatório quando o tipo é codigo_diferente (FR-011)
```

### `achados.toml`

```toml
[[achado]]
id = "A-001"
titulo = "..."
objetos = ["politica:public.unidades_fiscalizadas.e2e_test_user_own_rows_only", "..."]
evidencia = """..."""
risco = """..."""
opcoes = ["...", "..."]
recomendacao = """..."""
situacao = "aguardando_decisao"    # aguardando_decisao | decidido
decisao = ""                       # texto; preenchido só pelo responsável pelo projeto
decidido_por = ""
decidido_em = ""                   # AAAA-MM-DD
```

### `externos.toml`

```toml
[[externo]]
nome = "Código publicado das edge functions"
descricao = """..."""
como_obter = """..."""
usado_por = ["..."]               # módulos ou specs que dependem desta informação
```

## Proibições

- Nenhum valor de dado pessoal nem de segredo em qualquer campo (verificado pela varredura).
- Nenhuma cópia de estrutura gerada (tipo de coluna, código de função, definição de política). A
  anotação explica; a estrutura vem do inventário.
