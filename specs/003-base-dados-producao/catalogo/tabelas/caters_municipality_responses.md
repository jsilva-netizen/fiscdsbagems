<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_municipality_responses

- **Tipo**: tabela
- **Dono**: módulo **caters**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Resposta do município a um processo CATERS: data de recebimento, protocolo e situação do
cronograma de adequação. É uma por processo; a tela grava ou substitui. Vazia em produção. *(fonte: src/lib/caters/municipalityResponses.js:15, indice:caters_municipality_responses_process_id_key)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador da resposta. *(fonte: src/lib/caters/municipalityResponses.js:15)* |  |
| 2 | `process_id` | uuid | sim |  | Processo respondido; único, e excluir o processo exclui a resposta. *(fonte: restricao:caters_municipality_responses.caters_municipality_responses_process_id_key)* |  |
| 3 | `received_at` | date | sim |  | Quando a resposta do município foi recebida. *(fonte: src/pages/CatersProcessoDetalhe.jsx:139)* |  |
| 4 | `protocol_number` | text |  |  | Protocolo da resposta. *(fonte: src/pages/CatersProcessoDetalhe.jsx:139)* |  |
| 5 | `cronograma_status` | text | sim | `'pendente'::text` | Situação do cronograma de adequação: `pendente` (padrão), `aprovado`, `adequacao` (pedida<br>adequação) ou `dispensado`; o banco aceita só esses. *(fonte: restricao:caters_municipality_responses.caters_municipality_responses_cronograma_status_check, src/pages/CatersProcessoDetalhe.jsx:951)* |  |
| 6 | `notes` | text |  |  | Observações sobre a resposta. *(fonte: src/pages/CatersProcessoDetalhe.jsx:139)* |  |
| 7 | `created_by` | uuid |  |  | Conta de quem registrou; usada pelas políticas do usuário de teste e2e. *(fonte: politica:public.caters_municipality_responses.e2e_test_user_own_rows_only)* |  |
| 8 | `created_at` | timestamp with time zone | sim | `now()` | Quando a resposta foi registrada. *(fonte: src/lib/caters/municipalityResponses.js:15)* |  |
| 9 | `updated_at` | timestamp with time zone | sim | `now()` | Última alteração, mantida pelo gatilho. *(fonte: gatilho:public.caters_municipality_responses.trg_caters_municipality_responses_updated_at)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_municipality_responses_created_by_fkey` | chave_estrangeira | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `caters_municipality_responses_cronograma_status_check` | verificacao | `CHECK (cronograma_status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'adequacao'::text, 'dispensado'::text]))` |
| `caters_municipality_responses_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_municipality_responses_process_id_fkey` | chave_estrangeira | `FOREIGN KEY (process_id) REFERENCES caters_processes(id) ON DELETE CASCADE` |
| `caters_municipality_responses_process_id_key` | unica | `UNIQUE (process_id)` |

| Índice | Definição |
|---|---|
| `caters_municipality_responses_pkey` | `CREATE UNIQUE INDEX caters_municipality_responses_pkey ON public.caters_municipality_responses USING btree (id)` |
| `caters_municipality_responses_process_id_key` | `CREATE UNIQUE INDEX caters_municipality_responses_process_id_key ON public.caters_municipality_responses USING btree (process_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_caters_municipality_responses_updated_at` | ativo | [caters_set_updated_at()](../funcoes/caters_set_updated_at.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:caters_set_updated_at())* |

<details><summary>Definição de trg_caters_municipality_responses_updated_at</summary>

```sql
CREATE TRIGGER trg_caters_municipality_responses_updated_at BEFORE UPDATE ON caters_municipality_responses FOR EACH ROW EXECUTE FUNCTION caters_set_updated_at()
```

</details>

## Políticas de acesso

### CATERS respostas: gestao

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin lê, grava e exclui respostas. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
is_caters_user()
```

</details>

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera respostas que ele registrou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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
