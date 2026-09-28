<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# kick_relatorios_worker

## `kick_relatorios_worker(p_job_id uuid, p_limit integer)`

- **Retorno**: `void` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.kick_relatorios_worker(p_job_id uuid, p_limit integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'vault', 'net'
AS $function$
declare
  v_apikey text;
  v_worker_secret text;
begin
  select decrypted_secret into v_apikey
  from vault.decrypted_secrets
  where name = 'RELATORIOS_INVOKE_APIKEY'
  limit 1;

  select decrypted_secret into v_worker_secret
  from vault.decrypted_secrets
  where name = 'RELATORIOS_WORKER_SECRET'
  limit 1;

  if v_apikey is null or v_worker_secret is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://tnsuvwqssiorlzirmiko.supabase.co/functions/v1/relatorios_worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_apikey,
      'Authorization', 'Bearer ' || v_apikey,
      'x-worker-secret', v_worker_secret
    ),
    body := jsonb_build_object('limit', greatest(1, least(p_limit, 10)), 'job_id', p_job_id)
  );
end;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
