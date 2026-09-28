<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_recommendations

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 27
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` |  |  |
| 2 | `process_id` | uuid | sim |  |  |  |
| 3 | `item_code` | text |  |  |  |  |
| 4 | `description` | text | sim |  |  |  |
| 5 | `category` | text |  |  |  | `UTR Municipal` (8), `Unidade de Transbordo` (8), `Coleta de RSD` (4), `Coleta Seletiva` (3), `Limpeza Urbana` (2), `Entrega de Dados e Informações` (1), `Vazadouro a Céu Aberto` (1) |
| 6 | `priority` | caters_recommendation_priority | sim | `'media'::caters_recommendation_priority` |  |  |
| 7 | `promised_due_at` | date |  |  |  |  |
| 8 | `status` | caters_recommendation_status | sim | `'pendente'::caters_recommendation_status` |  |  |
| 9 | `fulfilled_at` | date |  |  |  |  |
| 10 | `evidence_url` | text |  |  |  |  |
| 11 | `notes` | text |  |  |  |  |
| 12 | `titular_response` | text |  |  |  |  |
| 13 | `created_by` | uuid |  |  |  |  |
| 14 | `created_at` | timestamp with time zone | sim | `now()` |  |  |
| 15 | `updated_at` | timestamp with time zone | sim | `now()` |  |  |
| 16 | `recomendacao_id` | uuid |  |  |  |  |
| 17 | `determinacao_id` | uuid |  |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_recommendations_created_by_fkey` | chave_estrangeira | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `caters_recommendations_determinacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id) ON DELETE SET NULL` |
| `caters_recommendations_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_recommendations_process_id_fkey` | chave_estrangeira | `FOREIGN KEY (process_id) REFERENCES caters_processes(id) ON DELETE CASCADE` |
| `caters_recommendations_recomendacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (recomendacao_id) REFERENCES recomendacoes(id) ON DELETE SET NULL` |

| Índice | Definição |
|---|---|
| `caters_recommendations_pkey` | `CREATE UNIQUE INDEX caters_recommendations_pkey ON public.caters_recommendations USING btree (id)` |
| `idx_caters_recommendations_determinacao_id` | `CREATE INDEX idx_caters_recommendations_determinacao_id ON public.caters_recommendations USING btree (determinacao_id)` |
| `idx_caters_recommendations_recomendacao_id` | `CREATE INDEX idx_caters_recommendations_recomendacao_id ON public.caters_recommendations USING btree (recomendacao_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)
- [determinacoes](../tabelas/determinacoes.md) — referencia (catalogo)
- [recomendacoes](../tabelas/recomendacoes.md) — referencia (catalogo)

**É usada por:**

- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — escreve (codigo)
- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — le (codigo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_caters_recommendations_updated_at` | ativo | [caters_set_updated_at()](../funcoes/caters_set_updated_at.md) | _Sem anotação._ |

<details><summary>Definição de trg_caters_recommendations_updated_at</summary>

```sql
CREATE TRIGGER trg_caters_recommendations_updated_at BEFORE UPDATE ON caters_recommendations FOR EACH ROW EXECUTE FUNCTION caters_set_updated_at()
```

</details>

## Políticas de acesso

### CATERS recomendacoes: atualizar

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

### CATERS recomendacoes: deletar

- **Papéis**: authenticated · **Operação**: DELETE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

### CATERS recomendacoes: inserir

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
is_caters_user()
```

</details>

### CATERS recomendacoes: leitura

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (created_by = auth.uid()))

WITH CHECK:
(nenhuma)
```

</details>

### e2e_test_user_own_rows_only_delete

- **Papéis**: authenticated · **Operação**: DELETE · **RESTRICTIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (created_by = auth.uid()))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
