<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_ai_jobs

- **Tipo**: tabela
- **Dono**: módulo **caters**
- **Linhas em produção**: 7
- **RLS ativo**: sim

## Finalidade

Fila de análises por IA do CATERS, processadas pelas edge functions `caters_ai_enqueue`,
`caters_ai_worker` e `caters_ai_status`, com o modelo Gemini. Tipos de análise:

- **`extract_pdf`:** lê o relatório de fiscalização e propõe as recomendações;
- **`match_response_pdf`:** cruza o ofício de resposta do município com as recomendações;
- **`analyze_response`:** analisa a resposta do processo.

O resultado fica em `result_json`, e a equipe revisa antes de usar.

Produção tem 7 trabalhos: 6 ainda `queued` e 1 `error`. **Nenhum foi concluído.** Isso indica que
o worker não está rodando em produção (função não publicada, chave da IA ausente ou nada o
aciona); a tela desiste de esperar depois de 90 segundos. *(fonte: supabase/functions/caters_ai_enqueue/index.ts:216, supabase/functions/caters_ai_worker/index.ts:12, src/lib/caters/aiJobs.js:26, src/pages/CatersProcessoDetalhe.jsx:391, inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do trabalho; a tela acompanha o andamento por ele. *(fonte: src/lib/caters/aiJobs.js:5)* |  |
| 2 | `job_type` | caters_ai_job_type | sim |  | Tipo da análise (tipo `caters_ai_job_type`): `extract_pdf`, `analyze_response` ou `match_response_pdf`. *(fonte: src/pages/CatersProcessoDetalhe.jsx:403, src/pages/CatersProcessoDetalhe.jsx:420)* |  |
| 3 | `process_id` | uuid |  |  | Processo CATERS da análise; excluir o processo exclui os trabalhos. *(fonte: restricao:caters_ai_jobs.caters_ai_jobs_process_id_fkey)* |  |
| 4 | `storage_bucket` | text |  |  | Bucket do PDF analisado (em produção, `documentos-prestadores`); vazio em `analyze_response`. *(fonte: supabase/functions/caters_ai_enqueue/index.ts:74, inventário: dominio_categorico)* | `documentos-prestadores` (6), `(nulo)` (1) |
| 5 | `storage_path` | text |  |  | Caminho do PDF analisado, exigido nos tipos que leem PDF. *(fonte: supabase/functions/caters_ai_enqueue/index.ts:221)* |  |
| 6 | `input_text` | text |  |  | Texto de entrada da análise, quando não é PDF. ⚠️ *hipótese* |  |
| 7 | `status` | text | sim | `'queued'::text` | `queued` (padrão), `processing`, `done` ou `error`; o banco aceita só esses. O worker reivindica os<br>`queued` e retoma os `processing` parados (`claim_caters_ai_jobs`). *(fonte: restricao:caters_ai_jobs.caters_ai_jobs_status_check, funcao:claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer))* | `queued` (6), `error` (1) |
| 8 | `result_json` | jsonb |  |  | Resultado da IA (recomendações extraídas ou cruzamento), mostrado para revisão. *(fonte: src/pages/CatersProcessoDetalhe.jsx:391)* | JSON — formas: nenhuma linha |
| 9 | `reviewed_at` | timestamp with time zone |  |  | Quando a equipe revisou o resultado. *(fonte: src/lib/caters/aiJobs.js:15)* |  |
| 10 | `reviewed_by` | uuid |  |  | Quem revisou o resultado. *(fonte: src/lib/caters/aiJobs.js:15)* |  |
| 11 | `error_message` | text |  |  | Mensagem de erro da análise; limpa ao reivindicar de novo. *(fonte: funcao:claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer))* |  |
| 12 | `requested_by` | uuid |  |  | Quem pediu a análise. *(fonte: supabase/functions/caters_ai_enqueue/index.ts:216, restricao:caters_ai_jobs.caters_ai_jobs_requested_by_fkey)* |  |
| 13 | `created_at` | timestamp with time zone | sim | `now()` | Quando a análise foi pedida; define a ordem da fila. *(fonte: funcao:claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer))* |  |
| 14 | `updated_at` | timestamp with time zone | sim | `now()` | Última mudança; indica trabalhos `processing` parados, que são retomados. *(fonte: gatilho:public.caters_ai_jobs.trg_caters_ai_jobs_updated_at, funcao:claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer))* |  |

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
| `trg_caters_ai_jobs_updated_at` | ativo | [caters_set_updated_at()](../funcoes/caters_set_updated_at.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:caters_set_updated_at())* |

<details><summary>Definição de trg_caters_ai_jobs_updated_at</summary>

```sql
CREATE TRIGGER trg_caters_ai_jobs_updated_at BEFORE UPDATE ON caters_ai_jobs FOR EACH ROW EXECUTE FUNCTION caters_set_updated_at()
```

</details>

## Políticas de acesso

### CATERS ai jobs: gestao

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin lê e altera os trabalhos (a tela só marca como revisado). A
criação é feita pela edge function, com a chave de serviço. *(fonte: funcao:is_caters_user(), supabase/functions/caters_ai_enqueue/index.ts:216)*
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

- Achado **A-033** — Análises por IA do CATERS nunca processadas em produção (situação: decidido; [detalhes](../../achados.md#a-033)).
