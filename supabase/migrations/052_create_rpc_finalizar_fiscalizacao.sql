-- Cria RPC para finalizar fiscalização gerando/numeração de NC/D/R em todas as unidades
-- Fluxo:
-- 1) Itera unidades da fiscalização em ordem de created_at ASC
-- 2) Para cada unidade: chama gerar_ncs_unidade(uf.id, uf.fotos_unidade, false) para limpar/gerar e atualizar totais/fotos
-- 3) Atualiza fiscalização com status 'finalizada', data_fim (agora) e numero_termo sequencial por ano
-- 4) Retorna resumo agregado
do $$
begin
  perform 1;
exception when others then
  null;
end $$;

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
begin
  -- Validar fiscalização
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

  -- Iterar unidades e gerar NC/D/R sequencialmente
  for r_u in
    select uf.*
    from public.unidades_fiscalizadas uf
    where uf.fiscalizacao_id = v_fisc_id
    order by uf.created_at asc
  loop
    perform public.gerar_ncs_unidade(r_u.id, r_u.fotos_unidade, false);
  end loop;

  -- Totais agregados pós geração
  select count(*) into v_total_unidades
  from public.unidades_fiscalizadas uf
  where uf.fiscalizacao_id = v_fisc_id;

  select coalesce(sum(t.cte),0) into v_total_const
  from (
    select count(*) as cte
    from public.respostas_checklist rc
    where rc.unidade_fiscalizada_id in (select uf.id from public.unidades_fiscalizadas uf where uf.fiscalizacao_id = v_fisc_id)
      and rc.resposta in ('SIM','NAO')
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

  -- Numerar termo sequencial no ano
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

  -- Finalizar fiscalização e consolidar totais
  update public.fiscalizacoes f
  set status = 'finalizada',
      data_fim = case when f.data_fim is null then v_data_fim else f.data_fim end,
      numero_termo = v_numero_termo,
      total_constatacoes = v_total_const,
      total_ncs = v_total_nc,
      total_determinacoes = v_total_dets,
      total_recomendacoes = v_total_recs,
      updated_at = now()
  where f.id = v_fisc_id;

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
