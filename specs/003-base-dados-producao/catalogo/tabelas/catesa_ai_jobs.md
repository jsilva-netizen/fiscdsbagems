<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# catesa_ai_jobs

- **Tipo**: tabela
- **Dono**: fora do escopo: **descartar** — Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30)., achado A-039
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Fila de análises por IA da resposta a um termo de notificação, pedida na tela Analisar resposta.
Para cada determinação do termo, o modelo Gemini compara o que foi determinado com a resposta da
entidade e as evidências anexadas, e devolve um veredito (`adequate` ou `needs_revision`) com a
justificativa, além de um veredito geral. A equipe revisa e pode aplicar o veredito à resposta.

Fluxo: `catesa_ai_enqueue` monta a entrada, cria o trabalho e chama o worker esperando a
resposta; `catesa_ai_worker` reivindica o trabalho (`claim_catesa_ai_jobs`), chama a IA e grava o
resultado; a tela consulta `catesa_ai_status` a cada 3 segundos, por até 90 segundos.

Só usuário com acesso à CATESA (admin, ou coordenador e fiscal da CATESA ou sem câmara) cria e
consulta trabalhos. O botão aparece em todo termo, de qualquer câmara, e para os demais usuários
o pedido é recusado.

Criada em produção pela migration 141 (a 128, que a criava, não tinha sido aplicada); até então a
análise falhava sempre. Produção tem 0 trabalhos. *(fonte: supabase/functions/catesa_ai_enqueue/index.ts:104, supabase/functions/catesa_ai_enqueue/index.ts:180, supabase/functions/catesa_ai_worker/index.ts:61, supabase/functions/catesa_ai_status/index.ts:83, src/lib/catesa/aiJobs.js:5, src/pages/AnalisarResposta.jsx:229, supabase/migrations/141_fix_funcoes_sem_verificacao.sql:883)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do trabalho; a tela acompanha o andamento por ele. *(fonte: src/lib/catesa/aiJobs.js:5)* |  |
| 2 | `termo_id` | uuid | sim |  | Termo de notificação analisado. Excluir o termo exclui os trabalhos. *(fonte: restricao:catesa_ai_jobs.catesa_ai_jobs_termo_id_fkey, supabase/functions/catesa_ai_enqueue/index.ts:183)* |  |
| 3 | `input_text` | text |  |  | Entrada da análise, em JSON: as determinações das unidades da fiscalização do termo, cada uma com<br>número, descrição, prazo (a coluna antiga `determinacoes.prazo`, hoje sempre vazia), a resposta<br>mais recente da entidade (manifestação, análise da equipe, situação, pontualidade) e as<br>referências das evidências. As evidências vão para a IA à parte, como arquivos. *(fonte: supabase/functions/catesa_ai_enqueue/index.ts:149, supabase/functions/catesa_ai_enqueue/index.ts:178)* |  |
| 4 | `status` | text | sim | `'queued'::text` | `queued` (padrão), `processing`, `done` ou `error`; o banco aceita só esses. O worker reivindica<br>os `queued` e retoma os `processing` parados há mais de 5 minutos (`claim_catesa_ai_jobs`). *(fonte: restricao:catesa_ai_jobs.catesa_ai_jobs_status_check, supabase/functions/catesa_ai_worker/index.ts:30)* |  |
| 5 | `result_json` | jsonb |  |  | Resultado da IA: `verdict` e `rationale` gerais e, em `per_determinacao`, um item por<br>determinação com `determinacao_id`, `verdict`, `rationale` e `evidence_reviewed` (se as evidências<br>foram de fato examinadas). *(fonte: supabase/functions/catesa_ai_worker/index.ts:61, supabase/functions/catesa_ai_worker/index.ts:186)* | JSON — formas: nenhuma linha |
| 6 | `reviewed_at` | timestamp with time zone |  |  | Quando a equipe marcou o resultado como revisado, ao fechar o diálogo da análise. *(fonte: src/lib/catesa/aiJobs.js:15, src/components/camaras/CatesaAiAnalysisDialog.jsx:38)* |  |
| 7 | `reviewed_by` | uuid |  |  | Quem marcou o resultado como revisado. *(fonte: src/lib/catesa/aiJobs.js:18)* |  |
| 8 | `error_message` | text |  |  | Motivo da falha, quando `error` (inclui o limite de requisições do Gemini esgotado). *(fonte: supabase/functions/catesa_ai_worker/index.ts:201, supabase/functions/catesa_ai_worker/index.ts:207)* |  |
| 9 | `requested_by` | uuid |  |  | Usuário que pediu a análise. *(fonte: supabase/functions/catesa_ai_enqueue/index.ts:186)* |  |
| 10 | `created_at` | timestamp with time zone | sim | `now()` | Quando o trabalho foi criado; o worker atende primeiro os mais antigos. *(fonte: funcao:claim_catesa_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer))* |  |
| 11 | `updated_at` | timestamp with time zone | sim | `now()` | Última alteração, gravada pelo gatilho e pelo worker; serve para achar trabalhos `processing` parados. *(fonte: gatilho:public.catesa_ai_jobs.trg_catesa_ai_jobs_updated_at, supabase/functions/catesa_ai_worker/index.ts:24)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `catesa_ai_jobs_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `catesa_ai_jobs_requested_by_fkey` | chave_estrangeira | `FOREIGN KEY (requested_by) REFERENCES auth.users(id)` |
| `catesa_ai_jobs_reviewed_by_fkey` | chave_estrangeira | `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id)` |
| `catesa_ai_jobs_status_check` | verificacao | `CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'done'::text, 'error'::text]))` |
| `catesa_ai_jobs_termo_id_fkey` | chave_estrangeira | `FOREIGN KEY (termo_id) REFERENCES termos_notificacao(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `catesa_ai_jobs_pkey` | `CREATE UNIQUE INDEX catesa_ai_jobs_pkey ON public.catesa_ai_jobs USING btree (id)` |
| `catesa_ai_jobs_status_idx` | `CREATE INDEX catesa_ai_jobs_status_idx ON public.catesa_ai_jobs USING btree (status)` |
| `catesa_ai_jobs_termo_id_idx` | `CREATE INDEX catesa_ai_jobs_termo_id_idx ON public.catesa_ai_jobs USING btree (termo_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [termos_notificacao](../tabelas/termos_notificacao.md) — referencia (catalogo)

**É usada por:**

- [claim_catesa_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](../funcoes/claim_catesa_ai_jobs.md) — escreve (codigo)
- [claim_catesa_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](../funcoes/claim_catesa_ai_jobs.md) — le (codigo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_catesa_ai_jobs_updated_at` | ativo | [catesa_ai_jobs_set_updated_at()](../funcoes/catesa_ai_jobs_set_updated_at.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:catesa_ai_jobs_set_updated_at())* |

<details><summary>Definição de trg_catesa_ai_jobs_updated_at</summary>

```sql
CREATE TRIGGER trg_catesa_ai_jobs_updated_at BEFORE UPDATE ON catesa_ai_jobs FOR EACH ROW EXECUTE FUNCTION catesa_ai_jobs_set_updated_at()
```

</details>

## Políticas de acesso

### CATESA ai jobs: gestao

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Usuário com acesso à CATESA (`can_access_camara('catesa')`) lê, cria, altera e apaga qualquer
trabalho. A tela só grava a revisão; criar e consultar passam pelas edge functions. *(fonte: funcao:can_access_camara(row_camara text), src/lib/catesa/aiJobs.js:15)*
- **Funções auxiliares**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md)

<details><summary>Condição original</summary>

```sql
USING:
can_access_camara('catesa'::text)

WITH CHECK:
can_access_camara('catesa'::text)
```

</details>

## Divergências e achados

- Achado **A-007** — 13 tabelas vazias em produção (situação: decidido; [detalhes](../../achados.md#a-007)).
- Achado **A-015** — Funções sem verificação, finalização pela chave de serviço e fila da CATESA ausente (situação: decidido; [detalhes](../../achados.md#a-015)).
- Achado **A-036** — IA da CATESA: botão em qualquer câmara, workers sem verificação e veredito que marca "no prazo"
 (situação: decidido; [detalhes](../../achados.md#a-036)).
- Achado **A-039** — Análises por IA ficam fora do sistema novo (situação: decidido; [detalhes](../../achados.md#a-039)).
