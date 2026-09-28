<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_processes

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 2
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` |  |  |
| 2 | `process_number` | text | sim |  |  | `51.001.121-2025` (1), `51.001.853-2025` (1) |
| 3 | `municipality` | text | sim |  |  | `Alcinópolis` (1), `Três Lagoas` (1) |
| 4 | `object` | text | sim |  |  | `Fiscalização Programada dos Serviços Públicos de Limpeza Urbana e Manejo de Resíduos Sólidos Urbanos` (2) |
| 5 | `ar_sent_at` | date |  |  |  |  |
| 6 | `ar_received_at` | date |  |  |  |  |
| 7 | `fatal_date` | date |  |  |  |  |
| 8 | `titular_response_due_at` | date |  |  |  |  |
| 9 | `status` | caters_process_status | sim | `'aguardando_analise'::caters_process_status` |  |  |
| 10 | `relatorio_url` | text |  |  |  |  |
| 11 | `termo_notificacao_url` | text |  |  |  |  |
| 12 | `ar_digitalizado_url` | text |  |  |  |  |
| 13 | `oficio_resposta_url` | text |  |  |  |  |
| 14 | `cronograma_url` | text |  |  |  |  |
| 15 | `observations` | text |  |  |  |  |
| 16 | `ar_tracking_code` | text |  |  |  |  |
| 17 | `ar_protocol_number` | text |  |  |  |  |
| 18 | `report_sent_at` | date |  |  |  |  |
| 19 | `technician_name` | text |  |  |  |  |
| 20 | `created_by` | uuid |  |  |  |  |
| 21 | `created_at` | timestamp with time zone | sim | `now()` |  |  |
| 22 | `updated_at` | timestamp with time zone | sim | `now()` |  |  |
| 23 | `fiscalizacao_id` | uuid |  |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_processes_created_by_fkey` | chave_estrangeira | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `caters_processes_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id) ON DELETE SET NULL` |
| `caters_processes_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_processes_process_number_unique` | unica | `UNIQUE (process_number)` |

| Índice | Definição |
|---|---|
| `caters_processes_pkey` | `CREATE UNIQUE INDEX caters_processes_pkey ON public.caters_processes USING btree (id)` |
| `caters_processes_process_number_unique` | `CREATE UNIQUE INDEX caters_processes_process_number_unique ON public.caters_processes USING btree (process_number)` |
| `idx_caters_processes_fiscalizacao_id` | `CREATE INDEX idx_caters_processes_fiscalizacao_id ON public.caters_processes USING btree (fiscalizacao_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)

**É usada por:**

- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — escreve (codigo)
- [caters_ai_jobs](../tabelas/caters_ai_jobs.md) — referencia (catalogo)
- [caters_analysis_history](../tabelas/caters_analysis_history.md) — referencia (catalogo)
- [caters_deadline_extensions](../tabelas/caters_deadline_extensions.md) — referencia (catalogo)
- [caters_extra_documents](../tabelas/caters_extra_documents.md) — referencia (catalogo)
- [caters_municipality_responses](../tabelas/caters_municipality_responses.md) — referencia (catalogo)
- [caters_recommendations](../tabelas/caters_recommendations.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_caters_processes_updated_at` | ativo | [caters_set_updated_at()](../funcoes/caters_set_updated_at.md) | _Sem anotação._ |

<details><summary>Definição de trg_caters_processes_updated_at</summary>

```sql
CREATE TRIGGER trg_caters_processes_updated_at BEFORE UPDATE ON caters_processes FOR EACH ROW EXECUTE FUNCTION caters_set_updated_at()
```

</details>

## Políticas de acesso

### CATERS processos: atualizar

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

### CATERS processos: deletar

- **Papéis**: authenticated · **Operação**: DELETE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = 'admin'::text)

WITH CHECK:
(nenhuma)
```

</details>

### CATERS processos: inserir

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

### CATERS processos: leitura

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
