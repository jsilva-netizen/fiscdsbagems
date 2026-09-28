<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_ai_jobs

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 7
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` |  |  |
| 2 | `job_type` | caters_ai_job_type | sim |  |  |  |
| 3 | `process_id` | uuid |  |  |  |  |
| 4 | `storage_bucket` | text |  |  |  | `documentos-prestadores` (6), `(nulo)` (1) |
| 5 | `storage_path` | text |  |  |  |  |
| 6 | `input_text` | text |  |  |  |  |
| 7 | `status` | text | sim | `'queued'::text` |  | `queued` (6), `error` (1) |
| 8 | `result_json` | jsonb |  |  |  | JSON — formas: nenhuma linha |
| 9 | `reviewed_at` | timestamp with time zone |  |  |  |  |
| 10 | `reviewed_by` | uuid |  |  |  |  |
| 11 | `error_message` | text |  |  |  |  |
| 12 | `requested_by` | uuid |  |  |  |  |
| 13 | `created_at` | timestamp with time zone | sim | `now()` |  |  |
| 14 | `updated_at` | timestamp with time zone | sim | `now()` |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_ai_jobs_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_ai_jobs_process_id_fkey` | chave_estrangeira | `FOREIGN KEY (process_id) REFERENCES caters_processes(id) ON DELETE CASCADE` |
| `caters_ai_jobs_requested_by_fkey` | chave_estrangeira | `FOREIGN KEY (requested_by) REFERENCES auth.users(id)` |
| `caters_ai_jobs_reviewed_by_fkey` | chave_estrangeira | `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)` |
| `caters_ai_jobs_status_check` | verificacao | `CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'done'::text, 'error'::text]))` |

| Índice | Definição |
|---|---|
| `caters_ai_jobs_pkey` | `CREATE UNIQUE INDEX caters_ai_jobs_pkey ON public.caters_ai_jobs USING btree (id)` |
| `caters_ai_jobs_process_id_idx` | `CREATE INDEX caters_ai_jobs_process_id_idx ON public.caters_ai_jobs USING btree (process_id)` |
| `caters_ai_jobs_status_idx` | `CREATE INDEX caters_ai_jobs_status_idx ON public.caters_ai_jobs USING btree (status)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)

**É usada por:**

- [claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](../funcoes/claim_caters_ai_jobs.md) — escreve (codigo)
- [claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](../funcoes/claim_caters_ai_jobs.md) — le (codigo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_caters_ai_jobs_updated_at` | ativo | [caters_set_updated_at()](../funcoes/caters_set_updated_at.md) | _Sem anotação._ |

<details><summary>Definição de trg_caters_ai_jobs_updated_at</summary>

```sql
CREATE TRIGGER trg_caters_ai_jobs_updated_at BEFORE UPDATE ON caters_ai_jobs FOR EACH ROW EXECUTE FUNCTION caters_set_updated_at()
```

</details>

## Políticas de acesso

### CATERS ai jobs: gestao

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
is_caters_user()
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
