<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# claim_relatorios_jobs

## `claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`

- **Retorno**: `SETOF relatorios_jobs` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: [relatorios_jobs](../tabelas/relatorios_jobs.md)
- **Escreve**: [relatorios_jobs](../tabelas/relatorios_jobs.md)
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

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

_Nenhuma divergência entre produção e migrations, nenhum achado._
