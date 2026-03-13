-- Atualizar a função RPC gerar_ncs_unidade para aceitar fotos e finalizar unidade
-- Esta migração centraliza a limpeza e a regeneração de NC/D/R numa transação,
-- e atualiza status, fotos e totais da unidade.
do $$
begin
  -- Remover versões antigas com assinatura diferente, se existirem
  begin
    perform 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'gerar_ncs_unidade'
      and p.pronargs = 1; -- versão antiga com 1 parâmetro (uuid)
    if found then
      execute 'drop function if exists public.gerar_ncs_unidade(uuid)';
    end if;
  exception when others then
    null;
  end;
end $$;

create or replace function public.gerar_ncs_unidade(
  unidade_fiscalizada_id uuid,
  p_fotos jsonb default null,
  p_finalizar boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p_unidade_id uuid := unidade_fiscalizada_id;
  v_fiscalizacao uuid;
  v_created timestamptz;
  ids_anteriores uuid[];
  contC int := 0;
  contNC int := 0;
  contD int := 0;
  contR int := 0;
  r_resp record;
  r_man record;
  v_nc_id uuid;
  v_total_constatacoes int := 0;
  v_total_ncs int := 0;
  v_total_dets int := 0;
  v_total_recs int := 0;
  v_status_final text;
begin
  -- Unidade alvo
  select uf.fiscalizacao_id, uf.created_at
    into v_fiscalizacao, v_created
  from public.unidades_fiscalizadas uf
  where uf.id = p_unidade_id;

  if v_fiscalizacao is null then
    return jsonb_build_object('success', false, 'error', 'Unidade não encontrada');
  end if;

  -- Unidades anteriores finalizadas (para numerar sequencialmente)
  select array_agg(uf.id)
    into ids_anteriores
  from public.unidades_fiscalizadas uf
  where uf.fiscalizacao_id = v_fiscalizacao
    and uf.status = 'finalizada'
    and uf.created_at < v_created;

  if ids_anteriores is not null then
    select coalesce(sum(uf.total_constatacoes),0), coalesce(sum(uf.total_ncs),0)
      into contC, contNC
    from public.unidades_fiscalizadas uf
    where uf.id = any(ids_anteriores);

    select count(*) into contD
    from public.determinacoes d
    where d.unidade_fiscalizada_id = any(ids_anteriores);

    select count(*) into contR
    from public.recomendacoes r
    where r.unidade_fiscalizada_id = any(ids_anteriores);
  end if;

  -- Limpeza de registros da unidade
  delete from public.determinacoes d where d.unidade_fiscalizada_id = p_unidade_id;
  delete from public.nao_conformidades nc where nc.unidade_fiscalizada_id = p_unidade_id;
  delete from public.recomendacoes r where r.unidade_fiscalizada_id = p_unidade_id and r.origem = 'checklist';

  -- Respostas do checklist → gerar NC/D/R
  for r_resp in
    select rc.*, ic.artigo_portaria, ic.texto_determinacao, ic.prazo_dias, ic.texto_recomendacao
    from public.respostas_checklist rc
    left join public.itens_checklist ic on ic.id = rc.item_checklist_id
    where rc.unidade_fiscalizada_id = p_unidade_id
  loop
    if r_resp.resposta = 'NAO' and coalesce(r_resp.gera_nc, false) then
      contNC := contNC + 1;
      insert into public.nao_conformidades (
        unidade_fiscalizada_id, resposta_checklist_id, numero_nc, artigo_portaria, descricao, gravidade
      )
      values (
        p_unidade_id,
        r_resp.id,
        'NC'||contNC,
        coalesce(r_resp.artigo_portaria, ''),
        'A Constatação '||r_resp.numero_constatacao||' não cumpre o disposto no '||coalesce(r_resp.artigo_portaria, 'artigo aplicável')||';',
        'Média'
      )
      returning id into v_nc_id;

      if r_resp.texto_determinacao is not null and btrim(r_resp.texto_determinacao) <> '' then
        contD := contD + 1;
        insert into public.determinacoes (
          unidade_fiscalizada_id, nao_conformidade_id, numero_determinacao, descricao, prazo_dias, data_limite, status
        )
        values (
          p_unidade_id,
          v_nc_id,
          'D'||contD,
          'Para sanar a NC'||contNC||' '||r_resp.texto_determinacao,
          coalesce(r_resp.prazo_dias, 30),
          (now()::date + coalesce(r_resp.prazo_dias, 30)),
          'pendente'
        );
      elsif r_resp.texto_recomendacao is not null and btrim(r_resp.texto_recomendacao) <> '' then
        contR := contR + 1;
        insert into public.recomendacoes (unidade_fiscalizada_id, numero_recomendacao, descricao, origem)
        values (p_unidade_id, 'R'||contR, r_resp.texto_recomendacao, 'checklist');
      end if;
    end if;
  end loop;

  -- Constatações manuais → gerar NC/D/R
  for r_man in
    select cm.* from public.constatacoes_manuais cm
    where cm.unidade_fiscalizada_id = p_unidade_id
  loop
    if coalesce(r_man.gera_nc,false) then
      contNC := contNC + 1;
      insert into public.nao_conformidades (
        unidade_fiscalizada_id, resposta_checklist_id, numero_nc, artigo_portaria, descricao, gravidade
      )
      values (
        p_unidade_id,
        null,
        'NC'||contNC,
        coalesce(r_man.artigo_portaria, ''),
        'A Constatação '||r_man.numero_constatacao||' não cumpre o disposto no '||coalesce(r_man.artigo_portaria, 'artigo aplicável')||';',
        'Média'
      )
      returning id into v_nc_id;

      if r_man.texto_determinacao is not null and btrim(r_man.texto_determinacao) <> '' then
        contD := contD + 1;
        insert into public.determinacoes (
          unidade_fiscalizada_id, nao_conformidade_id, numero_determinacao, descricao, prazo_dias, data_limite, status
        )
        values (
          p_unidade_id,
          v_nc_id,
          'D'||contD,
          'Para sanar a NC'||contNC||' '||r_man.texto_determinacao||'. Prazo: 30 dias.',
          30,
          (now()::date + 30),
          'pendente'
        );
      elsif r_man.texto_recomendacao is not null and btrim(r_man.texto_recomendacao) <> '' then
        contR := contR + 1;
        insert into public.recomendacoes (unidade_fiscalizada_id, numero_recomendacao, descricao, origem)
        values (p_unidade_id, 'R'||contR, r_man.texto_recomendacao, 'manual');
      end if;
    end if;
  end loop;

  -- Totais
  select count(*) into v_total_constatacoes
  from public.respostas_checklist rc
  where rc.unidade_fiscalizada_id = p_unidade_id
    and rc.resposta in ('SIM','NAO')
    and rc.pergunta is not null and btrim(rc.pergunta) <> '';

  v_total_constatacoes := v_total_constatacoes + (
    select count(*) from public.constatacoes_manuais cm where cm.unidade_fiscalizada_id = p_unidade_id
  );

  select count(*) into v_total_ncs from public.nao_conformidades nc where nc.unidade_fiscalizada_id = p_unidade_id;
  select count(*) into v_total_dets from public.determinacoes d where d.unidade_fiscalizada_id = p_unidade_id;
  select count(*) into v_total_recs from public.recomendacoes r where r.unidade_fiscalizada_id = p_unidade_id;

  -- Atualizar unidade (status/fotos/totais)
  update public.unidades_fiscalizadas uf
  set total_constatacoes = v_total_constatacoes,
      total_ncs = v_total_ncs,
      fotos_unidade = coalesce(p_fotos, uf.fotos_unidade),
      status = case when p_finalizar then 'finalizada' else uf.status end,
      updated_at = now()
  where uf.id = p_unidade_id
  returning uf.status into v_status_final;

  return jsonb_build_object(
    'success', true,
    'total_constatacoes', v_total_constatacoes,
    'total_ncs', v_total_ncs,
    'total_determinacoes', v_total_dets,
    'total_recomendacoes', v_total_recs,
    'status_final', v_status_final
  );
end;
$$;

revoke all on function public.gerar_ncs_unidade(uuid, jsonb, boolean) from public;
grant execute on function public.gerar_ncs_unidade(uuid, jsonb, boolean) to authenticated;

-- Índices recomendados para integridade e desempenho
create index if not exists idx_dets_nc on public.determinacoes(nao_conformidade_id);
create index if not exists idx_autos_det on public.autos_infracao(determinacao_id);

-- Forçar recarregamento do schema pelo PostgREST
notify pgrst, 'reload schema';
