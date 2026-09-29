<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# relatorios_jobs

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 18
- **RLS ativo**: sim

## Finalidade

Fila de geração do relatório de fiscalização (PDF). O relatório é gerado fora do app, pelas edge
functions:

- **Pedido:** o app pede à `relatorios_enqueue`, que cria o trabalho `queued`.
- **Execução:** `relatorios_worker` reivindica o trabalho (`claim_relatorios_jobs`), monta o PDF
  com as unidades e fotos, atualizando o progresso, e grava o arquivo no bucket
  `relatorios_fiscalizacao`.
- **Relatório grande:** é dividido em partes, que o app baixa e junta.
- **Consulta:** o app acompanha pela `relatorios_status`.

Reabrir a fiscalização apaga os trabalhos dela, para forçar um relatório novo. Produção tem 18,
todos concluídos. Inclusão e exclusão são auditadas. *(fonte: supabase/functions/relatorios_enqueue/index.ts:124, supabase/functions/relatorios_worker/index.ts:2574, src/components/fiscalizacao/RelatorioFiscalizacao.jsx:11, funcao:reabrir_fiscalizacao(p_fiscalizacao_id uuid), inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador do trabalho de relatório. *(fonte: supabase/functions/relatorios_enqueue/index.ts:124)* |  |
| 2 | `fiscalizacao_id` | uuid | sim |  | Fiscalização do relatório. Excluir a fiscalização exclui os trabalhos. *(fonte: restricao:relatorios_jobs.relatorios_jobs_fiscalizacao_id_fkey)* |  |
| 3 | `requested_by` | uuid |  |  | Quem pediu o relatório (perfil). A auditoria usa como autor quando o trabalho é alterado pela<br>chave de serviço. Pode excluir o próprio trabalho. A chave estrangeira sem regra de exclusão<br>impede excluir definitivamente um usuário que já pediu relatório. *(fonte: restricao:relatorios_jobs.relatorios_jobs_requested_by_fkey, funcao:process_audit_log(), funcao:admin_delete_user(p_user_id uuid))* |  |
| 4 | `status` | text | sim | `'queued'::text` | `queued` (padrão, ao pedir), `processing` (em geração), `done` (pronto) ou `error`: o banco aceita<br>só esses valores. *(fonte: restricao:relatorios_jobs.relatorios_jobs_status_check, supabase/functions/relatorios_worker/index.ts:2576)* | `done` (18) |
| 5 | `progress_unidades` | integer | sim | `0` | Quantas unidades já entraram no relatório; mostrado como progresso. *(fonte: supabase/functions/relatorios_worker/index.ts:2512)* | `1` (3), `21` (2), `6` (2), `10` (1), `16` (1), `17` (1), `23` (1), `29` (1), `32` (1), `35` (1), `43` (1), `49` (1), `7` (1), `9` (1) |
| 6 | `progress_fotos` | integer | sim | `0` | Quantas fotos já foram processadas; mostrado como progresso. *(fonte: supabase/functions/relatorios_worker/index.ts:1853)* | `0` (2), `88` (2), `102` (1), `116` (1), `194` (1), `2` (1), `27` (1), `30` (1), `36` (1), `42` (1), `46` (1), `48` (1), `52` (1), `6` (1), `73` (1), `92` (1) |
| 7 | `error_message` | text |  |  | Mensagem do erro quando a geração falha (status `error`); limpa ao reprocessar. *(fonte: supabase/functions/relatorios_worker/index.ts:2583)* |  |
| 8 | `storage_path` | text |  |  | Caminho do PDF final no bucket `relatorios_fiscalizacao`, gravado ao concluir. *(fonte: supabase/functions/relatorios_worker/index.ts:2574)* |  |
| 9 | `created_at` | timestamp with time zone | sim | `now()` | Quando o relatório foi pedido. *(fonte: supabase/functions/relatorios_enqueue/index.ts:124)* |  |
| 10 | `updated_at` | timestamp with time zone | sim | `now()` | Última mudança de estado ou progresso, gravada pelo worker. *(fonte: supabase/functions/relatorios_worker/index.ts:193)* |  |
| 11 | `parts_count` | integer | sim | `1` | Em quantas partes o PDF foi gerado (padrão 1). Com mais de uma, o app baixa cada parte e junta no<br>navegador. Em produção: 1 parte (10), 2 (3), 3 (4) e 7 (1). *(fonte: src/components/fiscalizacao/RelatorioFiscalizacao.jsx:11, inventário: dominio_categorico)* | `1` (10), `3` (4), `2` (3), `7` (1) |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `relatorios_jobs_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id) ON DELETE CASCADE` |
| `relatorios_jobs_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `relatorios_jobs_requested_by_fkey` | chave_estrangeira | `FOREIGN KEY (requested_by) REFERENCES profiles(id)` |
| `relatorios_jobs_status_check` | verificacao | `CHECK (status = ANY (ARRAY['queued'::text, 'processing'::text, 'done'::text, 'error'::text]))` |

| Índice | Definição |
|---|---|
| `relatorios_jobs_fiscalizacao_id_idx` | `CREATE INDEX relatorios_jobs_fiscalizacao_id_idx ON public.relatorios_jobs USING btree (fiscalizacao_id)` |
| `relatorios_jobs_pkey` | `CREATE UNIQUE INDEX relatorios_jobs_pkey ON public.relatorios_jobs USING btree (id)` |
| `relatorios_jobs_requested_by_idx` | `CREATE INDEX relatorios_jobs_requested_by_idx ON public.relatorios_jobs USING btree (requested_by)` |
| `relatorios_jobs_status_idx` | `CREATE INDEX relatorios_jobs_status_idx ON public.relatorios_jobs USING btree (status)` |

## Dependências

**Depende de:**

- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)
- [profiles](../tabelas/profiles.md) — referencia (catalogo)

**É usada por:**

- [claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](../funcoes/claim_relatorios_jobs.md) — escreve (codigo)
- [claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](../funcoes/claim_relatorios_jobs.md) — le (codigo)
- [process_audit_log()](../funcoes/process_audit_log.md) — le (codigo)
- [reabrir_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/reabrir_fiscalizacao.md) — escreve (codigo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_audit_relatorios_jobs` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | Depois de cada inclusão ou exclusão (não em alterações de progresso), grava o registro de<br>auditoria. O histórico da fiscalização mostra os relatórios gerados. *(fonte: funcao:process_audit_log(), src/components/fiscalizacao/HistoricoFiscalizacao.jsx:396)* |

<details><summary>Definição de trg_audit_relatorios_jobs</summary>

```sql
CREATE TRIGGER trg_audit_relatorios_jobs AFTER INSERT OR DELETE ON relatorios_jobs FOR EACH ROW EXECUTE FUNCTION process_audit_log()
```

</details>

## Políticas de acesso

### Delete relatorios_jobs (owner/admin)

- **Papéis**: authenticated · **Operação**: DELETE · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo exclui os trabalhos que pediu; admin ativo exclui qualquer um. Inclusão e alteração
não têm política: só as edge functions, com a chave de serviço, gravam. *(fonte: supabase/functions/relatorios_enqueue/index.ts:124)*

<details><summary>Condição original</summary>

```sql
USING:
((EXISTS ( SELECT 1
   FROM profiles p0
  WHERE ((p0.id = auth.uid()) AND (p0.ativo = true)))) AND ((requested_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text) AND (p.ativo = true)))) OR (EXISTS ( SELECT 1
   FROM fiscalizacoes f
  WHERE ((f.id = relatorios_jobs.fiscalizacao_id) AND ((f.created_by = auth.uid()) OR ((lower(COALESCE(f.fiscal_email, ''::text)) <> ''::text) AND (lower(COALESCE(f.fiscal_email, ''::text)) = lower(COALESCE(( SELECT p2.email
           FROM profiles p2
          WHERE (p2.id = auth.uid())), ''::text))))))))))

WITH CHECK:
(nenhuma)
```

</details>

### Select relatorios_jobs (any active user)

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Qualquer usuário ativo lê todos os trabalhos de relatório, de qualquer câmara e inclusive o
prestador. Já exigia perfil ativo antes das correções de 2026-09-29. *(fonte: tabela:profiles)*

<details><summary>Condição original</summary>

```sql
USING:
(EXISTS ( SELECT 1
   FROM profiles p0
  WHERE ((p0.id = auth.uid()) AND (p0.ativo = true))))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
