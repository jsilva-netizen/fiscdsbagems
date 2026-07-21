-- kick_relatorios_worker existia apenas no banco (criada direto no SQL Editor), fora de
-- qualquer migration, e por isso não sobreviveu à migração para um novo projeto Supabase
-- sem intervenção manual (URL hardcoded do projeto antigo + secrets do Vault, que não são
-- copiados entre projetos porque cada projeto tem sua própria chave de criptografia).
--
-- Chamada por relatorios_enqueue logo após criar um relatorios_jobs, dispara de forma
-- assíncrona (via pg_net) o relatorios_worker para processar o job. Depende de:
--   1) extensão pg_net habilitada (sem ela, net.http_post não existe e a chamada falha
--      silenciosamente, pois relatorios_enqueue engole o erro do rpc());
--   2) dois secrets no Vault (Database > Vault no dashboard, não são Edge Function
--      Secrets), criados manualmente em cada projeto novo:
--
--        select vault.create_secret('<anon key do projeto>', 'RELATORIOS_INVOKE_APIKEY');
--        select vault.create_secret('<mesmo valor do Edge Function Secret>', 'RELATORIOS_WORKER_SECRET');
--
-- Se este projeto for migrado de novo no futuro, repita o passo 2 e atualize a URL abaixo.

create extension if not exists pg_net;

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
$function$;
