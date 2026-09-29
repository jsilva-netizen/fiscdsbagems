<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_extra_documents

- **Tipo**: tabela
- **Dono**: módulo **caters**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Documentos avulsos anexados a um processo CATERS, além dos documentos fixos do processo
(relatório, termo, AR, ofício, cronograma). Vazia em produção. *(fonte: src/lib/caters/documents.js:17, inventário: tabelas)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do documento. *(fonte: src/lib/caters/documents.js:17)* |  |
| 2 | `process_id` | uuid | sim |  | Processo do documento; excluir o processo exclui os documentos. *(fonte: restricao:caters_extra_documents.caters_extra_documents_process_id_fkey)* |  |
| 3 | `title` | text | sim |  | Título do documento. *(fonte: src/lib/caters/documents.js:17)* |  |
| 4 | `description` | text |  |  | Descrição do documento. *(fonte: src/lib/caters/documents.js:17)* |  |
| 5 | `file_url` | text | sim |  | Arquivo do documento no armazenamento. *(fonte: src/lib/caters/documents.js:17)* |  |
| 6 | `created_by` | uuid |  |  | Conta de quem anexou; usada pelas políticas do usuário de teste e2e. *(fonte: politica:public.caters_extra_documents.e2e_test_user_own_rows_only)* |  |
| 7 | `created_at` | timestamp with time zone | sim | `now()` | Quando o documento foi anexado. *(fonte: src/lib/caters/documents.js:7)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_extra_documents_created_by_fkey` | chave_estrangeira | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `caters_extra_documents_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_extra_documents_process_id_fkey` | chave_estrangeira | `FOREIGN KEY (process_id) REFERENCES caters_processes(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `caters_extra_documents_pkey` | `CREATE UNIQUE INDEX caters_extra_documents_pkey ON public.caters_extra_documents USING btree (id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### CATERS documentos: deletar

- **Papéis**: authenticated · **Operação**: DELETE · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin exclui documentos. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

### CATERS documentos: inserir

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin anexa documentos. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
is_caters_user()
```

</details>

### CATERS documentos: leitura

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin lê os documentos. *(fonte: funcao:is_caters_user())*
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
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera documentos que ele anexou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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
