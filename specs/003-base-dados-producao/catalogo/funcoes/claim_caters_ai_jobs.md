<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# claim_caters_ai_jobs

## `claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`

- **Retorno**: `SETOF caters_ai_jobs` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **caters**

**Finalidade**: Reivindica trabalhos da fila de IA do CATERS para o worker: marca como `processing` um trabalho
específico ou os mais antigos em `queued`, e também os `processing` parados.

Desde a migration 141, só a chave de serviço executa. Antes, qualquer pessoa podia tomar a fila e
ler os resultados das análises. *(fonte: supabase/functions/caters_ai_worker/index.ts:30, supabase/migrations/141_fix_funcoes_sem_verificacao.sql)*

- **Lê**: [caters_ai_jobs](../tabelas/caters_ai_jobs.md)
- **Escreve**: [caters_ai_jobs](../tabelas/caters_ai_jobs.md)
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: supabase/functions/caters_ai_worker/index.ts:30 (chave de serviço)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.claim_caters_ai_jobs(p_limit integer, p_job_id uuid DEFAULT NULL::uuid, p_stale_minutes integer DEFAULT 5)
 RETURNS SETOF caters_ai_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.caters_ai_jobs j
  SET status = 'processing', updated_at = now(), error_message = NULL
  FROM (
    SELECT id FROM public.caters_ai_jobs
    WHERE (
        (p_job_id IS NULL OR id = p_job_id)
        AND (
          status = 'queued'
          OR (status = 'processing' AND updated_at < now() - (p_stale_minutes || ' minutes')::interval)
        )
      )
    ORDER BY created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ) claimable
  WHERE j.id = claimable.id
  RETURNING j.*;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
