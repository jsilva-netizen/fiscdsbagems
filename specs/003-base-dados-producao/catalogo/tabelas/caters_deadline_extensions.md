<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_deadline_extensions

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `process_id` | uuid | sim |  |  |  |
| 3 | `reference_date` | date | sim |  |  |  |
| 4 | `extension_days` | integer | sim |  |  |  |
| 5 | `calculated_date` | date | sim |  |  |  |
| 6 | `municipality_request_at` | date |  |  |  |  |
| 7 | `municipality_protocol` | text |  |  |  |  |
| 8 | `status` | text | sim | `'aprovado'::text` |  |  |
| 9 | `notes` | text |  |  |  |  |
| 10 | `created_by` | uuid |  |  |  |  |
| 11 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 12 | `updated_at` | timestamp with time zone |  | `now()` |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_deadline_extensions_created_by_fkey` | chave_estrangeira | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `caters_deadline_extensions_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_deadline_extensions_process_id_fkey` | chave_estrangeira | `FOREIGN KEY (process_id) REFERENCES caters_processes(id) ON DELETE CASCADE` |
| `caters_deadline_extensions_status_check` | verificacao | `CHECK (status = ANY (ARRAY['aprovado'::text, 'negado'::text]))` |

| Índice | Definição |
|---|---|
| `caters_deadline_extensions_pkey` | `CREATE UNIQUE INDEX caters_deadline_extensions_pkey ON public.caters_deadline_extensions USING btree (id)` |
| `caters_deadline_extensions_process_id_idx` | `CREATE INDEX caters_deadline_extensions_process_id_idx ON public.caters_deadline_extensions USING btree (process_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### authenticated users can manage deadline extensions

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
true
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
