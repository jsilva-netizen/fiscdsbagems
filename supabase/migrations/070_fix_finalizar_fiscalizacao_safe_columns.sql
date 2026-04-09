-- Torna a RPC finalizar_fiscalizacao tolerante a esquemas antigos onde as colunas
-- total_* podem não existir na tabela fiscalizacoes (evita erro 400 no PostgREST).

create or replace function public.finalizar_fiscalizacao(
  p_fiscalizacao_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fisc_id uuid := p_fiscalizacao_id;
  r_u record;
  v_total_nc int := 0;
  v_total_dets int := 0;
  v_total_recs int := 0;
  v_total_const int := 0;
  v_total_unidades int := 0;
  v_numero_termo text;
  v_ano int;
  v_next_num int := 0;
  v_data_fim timestamptz := now();
  v_existing_numero_termo text;
  v_existing_status text;
  v_existing_data_fim timestamptz;
  has_total_constatacoes boolean;
  has_total_ncs boolean;
  has_total_determinacoes boolean;
  has_total_recomendacoes boolean;
begin
  if v_fisc_id is null then
    return jsonb_build_object('success', false, 'error', 'Fiscalização não informada');
  end if;
  if not exists (select 1 from public.fiscalizacoes f where f.id = v_fisc_id) then
    return jsonb_build_object('success', false, 'error', 'Fiscalização não encontrada');
  end if;

  select f.numero_termo, f.status, f.data_fim
    into v_existing_numero_termo, v_existing_status, v_existing_data_fim
  from public.fiscalizacoes f
  where f.id = v_fisc_id
  for update;

  if v_existing_status = 'finalizada'
     and v_existing_numero_termo is not null
     and v_existing_numero_termo ~ '^[0-9]{3}/[0-9]{4}$'
  then
    v_numero_termo := v_existing_numero_termo;
    v_data_fim := coalesce(v_existing_data_fim, v_data_fim);
  end if;

  for r_u in
    select uf.*
    from public.unidades_fiscalizadas uf
    where uf.fiscalizacao_id = v_fisc_id
    order by uf.created_at asc
  loop
    perform public.gerar_ncs_unidade(r_u.id, (to_jsonb(r_u)->'fotos_unidade'), false);
  end loop;

  select count(*) into v_total_unidades
  from public.unidades_fiscalizadas uf
  where uf.fiscalizacao_id = v_fisc_id;

  select coalesce(sum(t.cte),0) into v_total_const
  from (
    select count(*) as cte
    from public.respostas_checklist rc
    where rc.unidade_fiscalizada_id in (select uf.id from public.unidades_fiscalizadas uf where uf.fiscalizacao_id = v_fisc_id)
      and upper(coalesce(rc.resposta, '')) in ('SIM','NAO','NÃO')
      and rc.pergunta is not null and btrim(rc.pergunta) <> ''
    union all
    select count(*) as cte
    from public.constatacoes_manuais cm
    where cm.unidade_fiscalizada_id in (select uf.id from public.unidades_fiscalizadas uf where uf.fiscalizacao_id = v_fisc_id)
  ) t;

  select count(*) into v_total_nc
  from public.nao_conformidades nc
  where nc.unidade_fiscalizada_id in (select uf.id from public.unidades_fiscalizadas uf where uf.fiscalizacao_id = v_fisc_id);

  select count(*) into v_total_dets
  from public.determinacoes d
  where d.unidade_fiscalizada_id in (select uf.id from public.unidades_fiscalizadas uf where uf.fiscalizacao_id = v_fisc_id);

  select count(*) into v_total_recs
  from public.recomendacoes r
  where r.unidade_fiscalizada_id in (select uf.id from public.unidades_fiscalizadas uf where uf.fiscalizacao_id = v_fisc_id);

  v_ano := extract(year from v_data_fim);
  if v_numero_termo is null then
    perform pg_advisory_xact_lock(hashtext('fiscalizacoes_numero_termo_' || v_ano::text));

    with used as (
      select (split_part(f.numero_termo, '/', 1))::int as n
      from public.fiscalizacoes f
      where f.status = 'finalizada'
        and f.numero_termo is not null
        and f.numero_termo ~ '^[0-9]{3}/[0-9]{4}$'
        and (split_part(f.numero_termo, '/', 2))::int = v_ano
    ),
    mx as (
      select coalesce(max(n), 0) as m from used
    ),
    missing as (
      select gs as n
      from generate_series(1, (select m from mx) + 1) gs
      left join used u on u.n = gs
      where u.n is null
      order by gs
      limit 1
    )
    select n into v_next_num from missing;

    if v_next_num is null or v_next_num < 1 then
      v_next_num := 1;
    end if;

    v_numero_termo := lpad(v_next_num::text, 3, '0') || '/' || v_ano::text;
  end if;

  update public.fiscalizacoes f
  set status = 'finalizada',
      data_fim = case when f.data_fim is null then v_data_fim else f.data_fim end,
      numero_termo = v_numero_termo,
      updated_at = now()
  where f.id = v_fisc_id;

  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fiscalizacoes' and column_name = 'total_constatacoes'
  ) into has_total_constatacoes;

  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fiscalizacoes' and column_name = 'total_ncs'
  ) into has_total_ncs;

  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fiscalizacoes' and column_name = 'total_determinacoes'
  ) into has_total_determinacoes;

  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'fiscalizacoes' and column_name = 'total_recomendacoes'
  ) into has_total_recomendacoes;

  if has_total_constatacoes then
    update public.fiscalizacoes set total_constatacoes = v_total_const where id = v_fisc_id;
  end if;
  if has_total_ncs then
    update public.fiscalizacoes set total_ncs = v_total_nc where id = v_fisc_id;
  end if;
  if has_total_determinacoes then
    update public.fiscalizacoes set total_determinacoes = v_total_dets where id = v_fisc_id;
  end if;
  if has_total_recomendacoes then
    update public.fiscalizacoes set total_recomendacoes = v_total_recs where id = v_fisc_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'fiscalizacao_id', v_fisc_id,
    'numero_termo', v_numero_termo,
    'total_unidades', v_total_unidades,
    'total_constatacoes', v_total_const,
    'total_ncs', v_total_nc,
    'total_determinacoes', v_total_dets,
    'total_recomendacoes', v_total_recs
  );
end;
$$;

revoke all on function public.finalizar_fiscalizacao(uuid) from public;
grant execute on function public.finalizar_fiscalizacao(uuid) to authenticated;
notify pgrst, 'reload schema';

