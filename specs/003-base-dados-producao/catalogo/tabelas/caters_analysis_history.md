<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_analysis_history

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` |  |  |
| 2 | `process_id` | uuid | sim |  |  |  |
| 3 | `action_type` | caters_analysis_action_type | sim |  |  |  |
| 4 | `description` | text | sim |  |  |  |
| 5 | `new_fatal_date` | date |  |  |  |  |
| 6 | `related_document_url` | text |  |  |  |  |
| 7 | `performed_by` | uuid |  |  |  |  |
| 8 | `created_at` | timestamp with time zone | sim | `now()` |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_analysis_history_performed_by_fkey` | chave_estrangeira | `FOREIGN KEY (performed_by) REFERENCES auth.users(id)` |
| `caters_analysis_history_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_analysis_history_process_id_fkey` | chave_estrangeira | `FOREIGN KEY (process_id) REFERENCES caters_processes(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `caters_analysis_history_pkey` | `CREATE UNIQUE INDEX caters_analysis_history_pkey ON public.caters_analysis_history USING btree (id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### CATERS historico: inserir

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

### CATERS historico: leitura

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

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
