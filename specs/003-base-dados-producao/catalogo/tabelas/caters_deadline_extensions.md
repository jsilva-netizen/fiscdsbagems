<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_deadline_extensions

- **Tipo**: tabela
- **Dono**: módulo **caters**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Dilações (prorrogações) do prazo de resposta de um processo CATERS: data de referência, dias
concedidos, novo prazo calculado, pedido e protocolo do município e decisão (aprovado ou negado).
Vazia em produção.

**Defeito:** ao aprovar, a tela grava a dilação e depois tenta atualizar o prazo do processo com
um status inexistente (`dilacao_solicitada`). A segunda gravação falha: a dilação fica registrada,
mas o prazo do processo e o histórico não mudam. *(fonte: src/pages/CatersProcessoDetalhe.jsx:343, src/pages/CatersProcessoDetalhe.jsx:361, src/lib/caters/deadlineExtensions.js:13)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da dilação. *(fonte: src/lib/caters/deadlineExtensions.js:13)* |  |
| 2 | `process_id` | uuid | sim |  | Processo prorrogado; excluir o processo exclui as dilações. *(fonte: restricao:caters_deadline_extensions.caters_deadline_extensions_process_id_fkey)* |  |
| 3 | `reference_date` | date | sim |  | Data a partir da qual os dias são contados. *(fonte: src/pages/CatersProcessoDetalhe.jsx:345)* |  |
| 4 | `extension_days` | integer | sim |  | Dias concedidos (maior que zero, verificado pela tela). *(fonte: src/pages/CatersProcessoDetalhe.jsx:346)* |  |
| 5 | `calculated_date` | date | sim |  | Novo prazo: data de referência mais os dias, calculado no navegador. *(fonte: src/pages/CatersProcessoDetalhe.jsx:348)* |  |
| 6 | `municipality_request_at` | date |  |  | Quando o município pediu a dilação. *(fonte: src/pages/CatersProcessoDetalhe.jsx:354)* |  |
| 7 | `municipality_protocol` | text |  |  | Protocolo do pedido do município. *(fonte: src/pages/CatersProcessoDetalhe.jsx:355)* |  |
| 8 | `status` | text | sim | `'aprovado'::text` | Decisão: `aprovado` (padrão) ou `negado`; o banco aceita só esses. *(fonte: restricao:caters_deadline_extensions.caters_deadline_extensions_status_check, src/pages/CatersProcessoDetalhe.jsx:357)* |  |
| 9 | `notes` | text |  |  | Observações sobre a dilação. *(fonte: src/pages/CatersProcessoDetalhe.jsx:356)* |  |
| 10 | `created_by` | uuid |  |  | Conta de quem registrou; usada pelas políticas do usuário de teste e2e. *(fonte: src/pages/CatersProcessoDetalhe.jsx:358, politica:public.caters_deadline_extensions.e2e_test_user_own_rows_only)* |  |
| 11 | `created_at` | timestamp with time zone |  | `now()` | Quando a dilação foi registrada; ordena a lista. *(fonte: src/lib/caters/deadlineExtensions.js:8)* |  |
| 12 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração; não há gatilho que a mantenha nem tela que altere dilações. *(fonte: src/lib/caters/deadlineExtensions.js:13)* |  |

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
- **Em linguagem simples**: Quem tem perfil ativo, de qualquer papel e câmara, lê, cria, altera e exclui dilações de qualquer
processo, sem exigir a CATERS. Desde a migration 138; antes, valia para qualquer logado. *(fonte: supabase/migrations/138_fix_open_policies.sql)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)

WITH CHECK:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)
```

</details>

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera dilações que ele criou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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
- **Em linguagem simples**: Mesma restrição, para exclusão. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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
