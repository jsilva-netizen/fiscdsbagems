<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# claim_catesa_ai_jobs

## `claim_catesa_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`

- **Retorno**: `SETOF catesa_ai_jobs` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: fora do escopo: **descartar** — Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30)., achado A-039

**Finalidade**: Reivindica trabalhos da fila de IA da CATESA para o worker: marca como `processing` um trabalho
específico ou os mais antigos em `queued`, e também os `processing` parados, sem pegar o que outro
worker já travou. Só a chave de serviço executa (migration 141). Mesmo padrão de
`claim_caters_ai_jobs` e `claim_relatorios_jobs`. *(fonte: supabase/functions/catesa_ai_worker/index.ts:30, supabase/migrations/141_fix_funcoes_sem_verificacao.sql:925)*

- **Lê**: [catesa_ai_jobs](../tabelas/catesa_ai_jobs.md)
- **Escreve**: [catesa_ai_jobs](../tabelas/catesa_ai_jobs.md)
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: supabase/functions/catesa_ai_worker/index.ts:30 (chave de serviço)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.claim_catesa_ai_jobs(p_limit integer, p_job_id uuid DEFAULT NULL::uuid, p_stale_minutes integer DEFAULT 5)
 RETURNS SETOF catesa_ai_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.catesa_ai_jobs j
  SET status = 'processing', updated_at = now(), error_message = NULL
  FROM (
    SELECT id FROM public.catesa_ai_jobs
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

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: decidido; [detalhes](../../achados.md#a-005)).
- Achado **A-039** — Análises por IA ficam fora do sistema novo (situação: decidido; [detalhes](../../achados.md#a-039)).
