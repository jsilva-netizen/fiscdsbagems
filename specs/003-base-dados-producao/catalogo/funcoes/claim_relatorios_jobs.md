<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# claim_relatorios_jobs

## `claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`

- **Retorno**: `SETOF relatorios_jobs` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **fiscalizacao**

**Finalidade**: Reivindica trabalhos da fila de relatórios para o worker. Marca como `processing` um trabalho
específico ou até 10 dos mais antigos em `queued`, e também os `processing` parados há mais que o
tempo informado. Usa `FOR UPDATE SKIP LOCKED` para que dois workers não peguem o mesmo trabalho.

Desde a migration 141, só a chave de serviço executa; antes, qualquer pessoa podia tomar a fila. *(fonte: supabase/functions/relatorios_worker/index.ts:175, supabase/migrations/141_fix_funcoes_sem_verificacao.sql)*

- **Lê**: [relatorios_jobs](../tabelas/relatorios_jobs.md)
- **Escreve**: [relatorios_jobs](../tabelas/relatorios_jobs.md)
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: supabase/functions/relatorios_worker/index.ts:175 (chave de serviço)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.claim_relatorios_jobs(p_limit integer, p_job_id uuid DEFAULT NULL::uuid, p_stale_minutes integer DEFAULT 20)
 RETURNS SETOF relatorios_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_now timestamptz := now();
  v_cutoff timestamptz := v_now - make_interval(mins => greatest(p_stale_minutes, 1));
begin
  if p_job_id is not null then
    return query
    with picked as (
      select id
      from public.relatorios_jobs
      where id = p_job_id
        and (status = 'queued' or (status = 'processing' and updated_at < v_cutoff))
      for update skip locked
    ), upd as (
      update public.relatorios_jobs j
      set status = 'processing', updated_at = v_now, error_message = null
      from picked
      where j.id = picked.id
      returning j.*
    )
    select * from upd;
    return;
  end if;

  return query
  with picked as (
    select id
    from public.relatorios_jobs
    where status = 'queued' or (status = 'processing' and updated_at < v_cutoff)
    order by created_at asc
    limit greatest(1, least(p_limit, 10))
    for update skip locked
  ), upd as (
    update public.relatorios_jobs j
    set status = 'processing', updated_at = v_now, error_message = null
    from picked
    where j.id = picked.id
    returning j.*
  )
  select * from upd;
end;
$function$
```

</details>

## Divergências e achados

- Divergência `funcao:claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
