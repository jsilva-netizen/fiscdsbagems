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
| `migracao/<modulo>.toml` | destino de migração de cada coluna e repositório de arquivos do módulo (um arquivo por módulo, criado com a spec do módulo) |

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
- **Bucket** aceita também `referenciado_por` (lista de colunas, telas ou funções que guardam ou
  montam referência para arquivos dele, com fonte).
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

Exceção de ordem (T040), no mesmo arquivo: aceita uma dependência de um objeto para outro de
módulo posterior na ordem. Liga dois objetos, não dois módulos, para que uma dependência nova
entre os mesmos módulos continue aparecendo como violação.

```toml
[[excecao]]
de = "funcao:x()"                  # objeto que depende
para = "tabela:y"                  # objeto de que ele depende (módulo posterior)
justificativa = """..."""          # obrigatória
```

Exceção sem justificativa, ou que não corresponde a nenhuma violação, é erro (retorno 2).

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

### `migracao/<modulo>.toml`

```toml
modulo = "core"                                   # id de modulos.toml; um arquivo por módulo
app = "core"                                      # opcional: prefixo dos destinos, quando o app tem outro nome (ex.: dtr → caterf)
data_model = "specs/004-modulo-core/data-model.md"  # opcional; com ele, os destinos são conferidos
notas = ["..."]                                   # opcional: fontes fora do catálogo, tabela de ajustes...

[destino."coluna:profiles.full_name"]             # chave do catálogo: coluna de tabela ou bucket do módulo
para = "core.Usuario.nome"                        # app.Modelo.campo[.chave]; ou lista de destinos
transformacao = "..."                             # opcional: conversão, valores legados, conferência

[destino."coluna:prestadores_servico.tipo"]
descarte = "..."                                  # motivo; exclusivo com `para`
```

Regras (validadas pelo gerador, que falha com código 2):
- a chave existe no inventário, é coluna de tabela (não de view) ou bucket, e o dono é o módulo do
  arquivo;
- `para` ou `descarte`, nunca os dois;
- com `data_model`, o modelo é um título `### Modelo` do data-model e o campo, uma linha da tabela
  dele. Destino em app sem data-model fica "não verificado";
- num módulo com mapa, coluna ou bucket sem destino é **pendente**: conta na linha de completude,
  com meta 0. Objetos fora do escopo não precisam de destino.

## Proibições

- Nenhum valor de dado pessoal nem de segredo em qualquer campo (verificado pela varredura).
- Nenhuma cópia de estrutura gerada (tipo de coluna, código de função, definição de política). A
  anotação explica; a estrutura vem do inventário.
