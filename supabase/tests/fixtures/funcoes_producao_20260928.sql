-- Estado de PRODUÇÃO (inventário de 2026-09-28) das funções que a migration 141 corrige, com
-- EXECUTE para anon e authenticated (padrão do Supabase), e sem a fila de IA da CATESA, que não
-- existe em produção. Só para teste, dentro de transação que termina em ROLLBACK.

DROP TABLE IF EXISTS public.catesa_ai_jobs CASCADE;
DROP FUNCTION IF EXISTS public.claim_catesa_ai_jobs(integer, uuid, integer);
DROP FUNCTION IF EXISTS public.catesa_ai_jobs_set_updated_at();

DROP FUNCTION IF EXISTS public.claim_relatorios_jobs(integer, uuid, integer);
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
$function$;

GRANT EXECUTE ON FUNCTION public.claim_relatorios_jobs(integer, uuid, integer) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.claim_caters_ai_jobs(integer, uuid, integer);
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
$function$;

GRANT EXECUTE ON FUNCTION public.claim_caters_ai_jobs(integer, uuid, integer) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.kick_relatorios_worker(uuid, integer);
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

GRANT EXECUTE ON FUNCTION public.kick_relatorios_worker(uuid, integer) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.reabrir_fiscalizacao(uuid);
CREATE OR REPLACE FUNCTION public.reabrir_fiscalizacao(p_fiscalizacao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_retries INT := 3;
  v_retry_delay INT := 100;
BEGIN
  -- Tentar até 3 vezes em caso de deadlock
  FOR i IN 1..v_retries LOOP
    BEGIN
      -- 1. Reabrir a fiscalização
      UPDATE public.fiscalizacoes
      SET status = 'em_andamento',
          data_fim = NULL,
          updated_at = now()
      WHERE id = p_fiscalizacao_id;

      -- 2. Reabrir todas as unidades da fiscalização
      UPDATE public.unidades_fiscalizadas
      SET status = 'em_andamento',
          updated_at = now()
      WHERE fiscalizacao_id = p_fiscalizacao_id;

      -- 3. Remover jobs de relatório anteriores para forçar nova geração
      DELETE FROM public.relatorios_jobs
      WHERE fiscalizacao_id = p_fiscalizacao_id;

      -- Se chegou até aqui sem erro, sair do loop
      EXIT;
    EXCEPTION
      WHEN deadlock_detected OR serialization_failure THEN
        -- Se não for a última tentativa, esperar e tentar novamente
        IF i < v_retries THEN
          PERFORM pg_sleep(v_retry_delay / 1000.0 * i);
        ELSE
          -- Se for a última tentativa, re-lançar o erro
          RAISE;
        END IF;
    END;
  END LOOP;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reabrir_fiscalizacao(uuid) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.obter_resumo_indicadores(text[], text[], uuid[], uuid[], boolean);
CREATE OR REPLACE FUNCTION public.obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_fiscalizacoes int := 0;
  v_finalizadas int := 0;
  v_total_ncs int := 0;
  v_total_constatacoes int := 0;
  v_total_determinacoes int := 0;
  v_total_recomendacoes int := 0;
  v_total_conformidades int := 0;
  v_por_servico jsonb := '[]'::jsonb;
  v_ranking_determ jsonb := '[]'::jsonb;
BEGIN
  -- Criar tabelas temporárias para armazenar os IDs das entidades filtradas no escopo desta transação
  CREATE TEMP TABLE temp_fisc ON COMMIT DROP AS
  SELECT f.id, f.status, f.municipio_id, f.municipio_nome, f.prestador_servico_id, f.prestador_servico_nome, f.servicos, f.created_at
  FROM public.fiscalizacoes f
  WHERE
    (cardinality(p_anos) = 0 OR extract(year from f.created_at)::text = ANY(p_anos))
    AND (
      cardinality(p_servicos) = 0 
      OR (
        f.servicos IS NOT NULL AND f.servicos && p_servicos
      )
    )
    AND (cardinality(p_municipio_ids) = 0 OR f.municipio_id = ANY(p_municipio_ids))
    AND (cardinality(p_prestador_ids) = 0 OR f.prestador_servico_id = ANY(p_prestador_ids))
    AND (NOT p_apenas_finalizadas OR f.status = 'finalizada');

  CREATE TEMP TABLE temp_unidades ON COMMIT DROP AS
  SELECT uf.id, uf.fiscalizacao_id
  FROM public.unidades_fiscalizadas uf
  JOIN temp_fisc tf ON tf.id = uf.fiscalizacao_id;

  -- Obter totais de fiscalizações
  SELECT count(*) INTO v_total_fiscalizacoes FROM temp_fisc;
  SELECT count(*) INTO v_finalizadas FROM temp_fisc WHERE status = 'finalizada';

  -- Se existirem unidades correspondentes, calcular indicadores dependentes
  IF EXISTS (SELECT 1 FROM temp_unidades) THEN
    SELECT count(*) INTO v_total_ncs 
    FROM public.nao_conformidades nc
    WHERE nc.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_determinacoes 
    FROM public.determinacoes d
    WHERE d.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_recomendacoes 
    FROM public.recomendacoes r
    WHERE r.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_conformidades 
    FROM public.respostas_checklist rc
    WHERE rc.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades)
      AND rc.resposta = 'SIM';

    SELECT coalesce(sum(t.cte), 0) INTO v_total_constatacoes
    FROM (
      SELECT count(*) as cte
      FROM public.respostas_checklist rc
      WHERE rc.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades)
        AND upper(coalesce(rc.resposta, '')) IN ('SIM','NAO','NÃO')
        AND rc.pergunta IS NOT NULL AND btrim(rc.pergunta) <> ''
      UNION ALL
      SELECT count(*) as cte
      FROM public.constatacoes_manuais cm
      WHERE cm.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades)
    ) t;

    -- Ranking de determinações por município (Top 10)
    SELECT coalesce(jsonb_agg(jsonb_build_object('municipio', rk.muni_nome, 'determinacoes', rk.qty)), '[]'::jsonb)
    INTO v_ranking_determ
    FROM (
      SELECT 
        coalesce(tf.municipio_nome, m.nome, 'Sem Nome') AS muni_nome,
        count(d.id) AS qty
      FROM public.determinacoes d
      JOIN temp_unidades tu ON tu.id = d.unidade_fiscalizada_id
      JOIN temp_fisc tf ON tf.id = tu.fiscalizacao_id
      LEFT JOIN public.municipios m ON m.id = tf.municipio_id
      GROUP BY muni_nome
      ORDER BY qty DESC, muni_nome ASC
      LIMIT 10
    ) rk;
  END IF;

  -- Distribuição de dados por serviço
  SELECT coalesce(jsonb_agg(jsonb_build_object('servico', svc.servico_nome, 'quantidade', svc.qty)), '[]'::jsonb)
  INTO v_por_servico
  FROM (
    SELECT unnest_servico AS servico_nome, count(*) AS qty
    FROM (
      SELECT unnest(tf.servicos) AS unnest_servico
      FROM temp_fisc tf
    ) s
    WHERE unnest_servico IS NOT NULL AND unnest_servico <> ''
    GROUP BY unnest_servico
    ORDER BY qty DESC
  ) svc;

  -- Retornar payload JSON compactado contendo todos os indicadores calculados
  RETURN jsonb_build_object(
    'total_fiscalizacoes', v_total_fiscalizacoes,
    'finalizadas', v_finalizadas,
    'total_ncs', v_total_ncs,
    'total_constatacoes', v_total_constatacoes,
    'total_determinacoes', v_total_determinacoes,
    'total_recomendacoes', v_total_recomendacoes,
    'total_conformidades', v_total_conformidades,
    'por_servico', v_por_servico,
    'ranking_determinacoes', v_ranking_determ
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.obter_resumo_indicadores(text[], text[], uuid[], uuid[], boolean) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.obter_resumo_indicadores(text[], text[], uuid[], uuid[], text[]);
CREATE OR REPLACE FUNCTION public.obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_fiscalizacoes int := 0;
  v_finalizadas         int := 0;
  v_total_ncs           int := 0;
  v_total_constatacoes  int := 0;
  v_total_determinacoes int := 0;
  v_total_recomendacoes int := 0;
  v_total_conformidades int := 0;
  v_total_unidades      int := 0;
  v_total_fotos         int := 0;
  v_por_servico         jsonb := '[]'::jsonb;
  v_ranking_determ      jsonb := '[]'::jsonb;
BEGIN
  -- Tabela temporária com todas as fiscalizações do filtro (para contar totais)
  CREATE TEMP TABLE temp_fisc_todas ON COMMIT DROP AS
  SELECT f.id, f.status, f.municipio_id, f.municipio_nome,
         f.prestador_servico_id, f.prestador_servico_nome,
         f.servicos, f.created_at, f.tipo_modulo
  FROM public.fiscalizacoes f
  WHERE
    (cardinality(p_anos) = 0 OR extract(year from f.created_at)::text = ANY(p_anos))
    AND (
      cardinality(p_servicos) = 0
      OR (f.servicos IS NOT NULL AND f.servicos && p_servicos)
    )
    AND (cardinality(p_municipio_ids) = 0 OR f.municipio_id = ANY(p_municipio_ids))
    AND (cardinality(p_prestador_ids) = 0 OR f.prestador_servico_id = ANY(p_prestador_ids))
    AND (cardinality(p_tipo_modulo) = 0 OR f.tipo_modulo = ANY(p_tipo_modulo));

  -- Tabela temporária apenas com as fiscalizações finalizadas
  CREATE TEMP TABLE temp_fisc_finalizadas ON COMMIT DROP AS
  SELECT * FROM temp_fisc_todas WHERE status = 'finalizada';

  CREATE TEMP TABLE temp_unidades ON COMMIT DROP AS
  SELECT uf.id, uf.fiscalizacao_id
  FROM public.unidades_fiscalizadas uf
  JOIN temp_fisc_finalizadas tff ON tff.id = uf.fiscalizacao_id;

  -- Contar fiscalizações (todas vs finalizadas)
  SELECT count(*) INTO v_total_fiscalizacoes FROM temp_fisc_todas;
  SELECT count(*) INTO v_finalizadas         FROM temp_fisc_finalizadas;

  -- Contar unidades fiscalizadas e fotos registradas nessas unidades
  SELECT count(*) INTO v_total_unidades FROM temp_unidades;

  SELECT coalesce(sum(jsonb_array_length(coalesce(uf.fotos_unidade, '[]'::jsonb))), 0)
  INTO v_total_fotos
  FROM public.unidades_fiscalizadas uf
  WHERE uf.id IN (SELECT id FROM temp_unidades);

  -- Calcular indicadores se houver unidades correspondentes
  IF EXISTS (SELECT 1 FROM temp_unidades) THEN
    SELECT count(*) INTO v_total_ncs
    FROM public.nao_conformidades nc
    WHERE nc.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_determinacoes
    FROM public.determinacoes d
    WHERE d.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_recomendacoes
    FROM public.recomendacoes r
    WHERE r.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    -- Constatações totais dos campos consolidados nas unidades
    SELECT coalesce(sum(uf.total_constatacoes), 0) INTO v_total_constatacoes
    FROM public.unidades_fiscalizadas uf
    WHERE uf.id IN (SELECT id FROM temp_unidades);

    -- Conformidades = Constatações - Não Conformidades
    v_total_conformidades := v_total_constatacoes - v_total_ncs;
    IF v_total_conformidades < 0 THEN
      v_total_conformidades := 0;
    END IF;

    -- Ranking de determinações por município (Top 10)
    SELECT coalesce(jsonb_agg(jsonb_build_object('municipio', rk.muni_nome, 'determinacoes', rk.qty)), '[]'::jsonb)
    INTO v_ranking_determ
    FROM (
      SELECT
        coalesce(tff.municipio_nome, m.nome, 'Sem Nome') AS muni_nome,
        count(d.id) AS qty
      FROM public.determinacoes d
      JOIN temp_unidades tu  ON tu.id = d.unidade_fiscalizada_id
      JOIN temp_fisc_finalizadas tff ON tff.id = tu.fiscalizacao_id
      LEFT JOIN public.municipios m ON m.id = tff.municipio_id
      GROUP BY muni_nome
      ORDER BY qty DESC, muni_nome ASC
      LIMIT 10
    ) rk;
  END IF;

  -- Distribuição por serviço (apenas finalizadas)
  SELECT coalesce(jsonb_agg(jsonb_build_object('servico', svc.servico_nome, 'quantidade', svc.qty)), '[]'::jsonb)
  INTO v_por_servico
  FROM (
    SELECT unnest_servico AS servico_nome, count(*) AS qty
    FROM (
      SELECT unnest(tff.servicos) AS unnest_servico
      FROM temp_fisc_finalizadas tff
    ) s
    WHERE unnest_servico IS NOT NULL AND unnest_servico <> ''
    GROUP BY unnest_servico
    ORDER BY qty DESC
  ) svc;

  RETURN jsonb_build_object(
    'total_fiscalizacoes', v_total_fiscalizacoes,
    'finalizadas',         v_finalizadas,
    'total_ncs',           v_total_ncs,
    'total_constatacoes',  v_total_constatacoes,
    'total_determinacoes', v_total_determinacoes,
    'total_recomendacoes', v_total_recomendacoes,
    'total_conformidades', v_total_conformidades,
    'total_unidades',      v_total_unidades,
    'total_fotos',         v_total_fotos,
    'por_servico',         v_por_servico,
    'ranking_determinacoes', v_ranking_determ
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.obter_resumo_indicadores(text[], text[], uuid[], uuid[], text[]) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.gerar_ncs_unidade(uuid, jsonb, boolean);
CREATE OR REPLACE FUNCTION public.gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb DEFAULT NULL::jsonb, p_finalizar boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p_unidade_id uuid := p_unidade_fiscalizada_id;
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
  v_nc_descricao text;
  
  -- Novas variáveis para controle e preservação de recomendações
  v_origem text;
  v_rec_id uuid;
  v_valid_origens text[] := array[]::text[];
  
  -- Novas variáveis para controle e preservação de determinações
  v_det_id uuid;
  v_valid_det_origens text[] := array[]::text[];
BEGIN
  -- Segurança: Bloquear se o executor não for admin, coordenador ou fiscal
  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'coordenador', 'fiscal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: privilégios insuficientes.');
  END IF;

  SELECT uf.fiscalizacao_id, uf.created_at
    INTO v_fiscalizacao, v_created
  FROM public.unidades_fiscalizadas uf
  WHERE uf.id = p_unidade_id;

  IF v_fiscalizacao IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unidade não encontrada');
  END IF;

  SELECT array_agg(uf.id)
    INTO ids_anteriores
  FROM public.unidades_fiscalizadas uf
  WHERE uf.fiscalizacao_id = v_fiscalizacao
    AND uf.status = 'finalizada'
    AND uf.created_at < v_created;

  IF ids_anteriores IS NOT NULL THEN
    SELECT coalesce(sum(uf.total_constatacoes),0), coalesce(sum(uf.total_ncs),0)
      INTO contC, contNC
    FROM public.unidades_fiscalizadas uf
    WHERE uf.id = ANY(ids_anteriores);

    SELECT count(*) INTO contD
    FROM public.determinacoes d
    WHERE d.unidade_fiscalizada_id = ANY(ids_anteriores);

    SELECT count(*) INTO contR
    FROM public.recomendacoes r
    WHERE r.unidade_fiscalizada_id = ANY(ids_anteriores);
  END IF;

  -- 1. Remove apenas não-conformidades antigas (elas são reconstruídas do zero a cada ciclo)
  -- NOTA: O drop de NCs redefine o campo nao_conformidade_id das determinações para NULL (ON DELETE SET NULL).
  -- Não deletamos as determinações cegas para preservar edições de descrição, prazo e numeração feitas na UI.
  DELETE FROM public.nao_conformidades nc WHERE nc.unidade_fiscalizada_id = p_unidade_id;
  
  -- 2. NOTA: Não limpamos/zeramos a numeração (numero_recomendacao) no início,
  -- pois queremos preservar a ordenação customizada (drag & drop) que o usuário definiu na UI.

  -- 3. Processamento das respostas do checklist
  FOR r_resp IN
    WITH ranked AS (
      SELECT
        rc.*,
        ic.artigo_portaria,
        ic.texto_determinacao,
        ic.prazo_dias,
        ic.texto_recomendacao,
        row_number() OVER (
          PARTITION BY coalesce(rc.item_checklist_id::text, rc.pergunta, rc.numero_constatacao)
          ORDER BY coalesce(((to_jsonb(rc)->>'updated_at'))::timestamptz, rc.created_at) DESC, rc.created_at DESC, rc.id DESC
        ) AS rn
      FROM public.respostas_checklist rc
      LEFT JOIN public.itens_checklist ic ON ic.id = rc.item_checklist_id
      WHERE rc.unidade_fiscalizada_id = p_unidade_id
    )
    SELECT * FROM ranked WHERE rn = 1
  LOOP
    IF upper(coalesce(r_resp.resposta, '')) IN ('NAO','NÃO') AND coalesce(r_resp.gera_nc, false) THEN
      contNC := contNC + 1;

      v_nc_descricao := 'Constatação '||coalesce(r_resp.numero_constatacao, 'C?')||': não cumprimento do '||coalesce(r_resp.artigo_portaria, 'artigo aplicável')||';';
      IF v_nc_descricao IS NULL OR btrim(v_nc_descricao) = '' THEN
        v_nc_descricao := 'Não conformidade sem descrição;';
      END IF;

      INSERT INTO public.nao_conformidades (
        unidade_fiscalizada_id, resposta_checklist_id, numero_nc, artigo_portaria, descricao, gravidade
      )
      VALUES (
        p_unidade_id,
        r_resp.id,
        'NC'||contNC,
        coalesce(r_resp.artigo_portaria, ''),
        v_nc_descricao,
        'Média'
      )
      RETURNING id INTO v_nc_id;

      IF r_resp.texto_determinacao IS NOT NULL AND btrim(r_resp.texto_determinacao) <> '' THEN
        contD := contD + 1;
        
        -- Mapeia a origem de forma individualizada de acordo com o padrão do frontend
        v_origem := CASE
          WHEN r_resp.item_checklist_id IS NOT NULL THEN 'checklist:'||r_resp.item_checklist_id::text
          ELSE 'legacy:'||r_resp.id::text
        END;
        v_valid_det_origens := array_append(v_valid_det_origens, v_origem);

        -- Verifica se já existe uma determinação com a mesma origem para esta unidade
        SELECT id INTO v_det_id
        FROM public.determinacoes
        WHERE unidade_fiscalizada_id = p_unidade_id
          AND (origem = v_origem OR origem = 'checklist:'||r_resp.id::text);

        IF v_det_id IS NOT NULL THEN
          -- Preserva a descrição editada pelo usuário!
          -- Atualizamos apenas o nao_conformidade_id (que mudou), a origem e o timestamp.
          UPDATE public.determinacoes
          SET nao_conformidade_id = v_nc_id,
              origem = v_origem,
              updated_at = now()
          WHERE id = v_det_id;
        ELSE
          -- Cria nova determinação com o texto padrão
          -- Usamos NULL na numeração para evitar conflitos; o sync engine se encarrega de reordenar na sincronização.
          INSERT INTO public.determinacoes (
            unidade_fiscalizada_id, nao_conformidade_id, numero_determinacao, descricao, prazo_dias, data_limite, status, origem, created_at, updated_at
          )
          VALUES (
            p_unidade_id,
            v_nc_id,
            NULL,
            'Sanar NC'||contNC||'. '||r_resp.texto_determinacao,
            coalesce(r_resp.prazo_dias, 30),
            (now()::date + coalesce(r_resp.prazo_dias, 30)),
            'pendente',
            v_origem,
            now(),
            now()
          );
        END IF;
      ELSIF r_resp.texto_recomendacao IS NOT NULL AND btrim(r_resp.texto_recomendacao) <> '' THEN
        contR := contR + 1;
        
        -- Mapeia a origem de forma tempo real e individualizada
        v_origem := CASE 
          WHEN r_resp.item_checklist_id IS NOT NULL THEN 'checklist:'||r_resp.item_checklist_id::text
          ELSE 'legacy_rec:'||r_resp.id::text
        END;
        
        v_valid_origens := array_append(v_valid_origens, v_origem);

        -- Verifica se já existe uma recomendação com a mesma origem para esta unidade
        SELECT id INTO v_rec_id 
        FROM public.recomendacoes 
        WHERE unidade_fiscalizada_id = p_unidade_id 
          AND (origem = v_origem OR origem = 'checklist'); 

        IF v_rec_id IS NOT NULL THEN
          -- Preserva a numeração e a descrição originais
          UPDATE public.recomendacoes 
          SET origem = v_origem,
              updated_at = now() 
          WHERE id = v_rec_id;
        ELSE
          -- Cria nova recomendação
          INSERT INTO public.recomendacoes (unidade_fiscalizada_id, numero_recomendacao, descricao, origem, created_at, updated_at)
          VALUES (p_unidade_id, NULL, r_resp.texto_recomendacao, v_origem, now(), now());
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 4. Processamento das constatações manuais
  FOR r_man IN
    SELECT cm.* FROM public.constatacoes_manuais cm
    WHERE cm.unidade_fiscalizada_id = p_unidade_id
    ORDER BY coalesce(cm.updated_at, cm.created_at) ASC, cm.created_at ASC, cm.id ASC
  LOOP
    IF coalesce(r_man.gera_nc,false) THEN
      contNC := contNC + 1;

      v_nc_descricao := coalesce(
        nullif(btrim(r_man.descricao_nc), ''),
        'Constatação '||coalesce(r_man.numero_constatacao, 'C?')||': não cumprimento do '||coalesce(r_man.artigo_portaria, 'artigo aplicável')||';'
      );
      v_nc_descricao := regexp_replace(
        v_nc_descricao,
        'Constatação\s+C[0-9]+',
        'Constatação '||coalesce(r_man.numero_constatacao, 'C?')
      );
      IF v_nc_descricao IS NULL OR btrim(v_nc_descricao) = '' THEN
        v_nc_descricao := 'Não conformidade sem descrição;';
      END IF;

      INSERT INTO public.nao_conformidades (
        unidade_fiscalizada_id, resposta_checklist_id, numero_nc, artigo_portaria, descricao, gravidade
      )
      VALUES (
        p_unidade_id,
        null,
        'NC'||contNC,
        coalesce(r_man.artigo_portaria, ''),
        v_nc_descricao,
        'Média'
      )
      RETURNING id INTO v_nc_id;

      IF r_man.texto_determinacao IS NOT NULL AND btrim(r_man.texto_determinacao) <> '' THEN
        contD := contD + 1;
        
        -- Mapeia a origem de forma individualizada
        v_origem := 'manual_constatacao:'||r_man.id::text;
        v_valid_det_origens := array_append(v_valid_det_origens, v_origem);

        -- Verifica se já existe uma determinação com a mesma origem para esta unidade
        SELECT id INTO v_det_id
        FROM public.determinacoes
        WHERE unidade_fiscalizada_id = p_unidade_id
          AND origem = v_origem;

        IF v_det_id IS NOT NULL THEN
          -- Preserva a descrição editada pelo usuário!
          -- Atualizamos apenas o nao_conformidade_id (que mudou) e o timestamp.
          UPDATE public.determinacoes
          SET nao_conformidade_id = v_nc_id,
              updated_at = now()
          WHERE id = v_det_id;
        ELSE
          -- Cria nova determinação
          INSERT INTO public.determinacoes (
            unidade_fiscalizada_id, nao_conformidade_id, numero_determinacao, descricao, prazo_dias, data_limite, status, origem, created_at, updated_at
          )
          VALUES (
            p_unidade_id,
            v_nc_id,
            NULL,
            CASE
              WHEN r_man.texto_determinacao ILIKE 'Para sanar%' OR r_man.texto_determinacao ILIKE 'Sanar%' THEN r_man.texto_determinacao
              ELSE 'Sanar NC'||contNC||'. '||r_man.texto_determinacao
            END,
            30,
            (now()::date + 30),
            'pendente',
            v_origem,
            now(),
            now()
          );
        END IF;
      ELSIF r_man.texto_recomendacao IS NOT NULL AND btrim(r_man.texto_recomendacao) <> '' THEN
        contR := contR + 1;
        
        v_origem := 'manual_constatacao:'||r_man.id::text;
        v_valid_origens := array_append(v_valid_origens, v_origem);

        SELECT id INTO v_rec_id 
        FROM public.recomendacoes 
        WHERE unidade_fiscalizada_id = p_unidade_id 
          AND (origem = v_origem OR origem = 'manual_constatacao');

        IF v_rec_id IS NOT NULL THEN
          UPDATE public.recomendacoes 
          SET origem = v_origem,
              updated_at = now() 
          WHERE id = v_rec_id;
        ELSE
          INSERT INTO public.recomendacoes (unidade_fiscalizada_id, numero_recomendacao, descricao, origem, created_at, updated_at)
          VALUES (p_unidade_id, NULL, r_man.texto_recomendacao, v_origem, now(), now());
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 5. Deleta apenas as recomendações órfãs (cujo checklist mudou para SIM ou constatação foi removida)
  DELETE FROM public.recomendacoes r
  WHERE r.unidade_fiscalizada_id = p_unidade_id
    AND (
      r.origem ILIKE 'checklist%'
      OR coalesce(nullif(btrim(r.origem), ''), 'manual') IN ('checklist', 'manual_constatacao')
    )
    AND (r.origem IS NULL OR NOT (r.origem = ANY(v_valid_origens)));

  -- 6. Deleta apenas as determinações órfãs (cujo checklist mudou para SIM ou constatação manual foi removida)
  DELETE FROM public.determinacoes d
  WHERE d.unidade_fiscalizada_id = p_unidade_id
    AND (
      d.origem ILIKE 'checklist%'
      OR d.origem ILIKE 'manual_constatacao%'
      OR d.origem ILIKE 'legacy%'
    )
    AND (d.origem IS NULL OR NOT (d.origem = ANY(v_valid_det_origens)));

  -- 7. Recalcula os totais da unidade
  SELECT count(*) INTO v_total_constatacoes
  FROM (
    WITH ranked AS (
      SELECT
        rc.*,
        row_number() OVER (
          PARTITION BY coalesce(rc.item_checklist_id::text, rc.pergunta, rc.numero_constatacao)
          ORDER BY coalesce(((to_jsonb(rc)->>'updated_at'))::timestamptz, rc.created_at) DESC, rc.created_at DESC, rc.id DESC
        ) AS rn
      FROM public.respostas_checklist rc
      WHERE rc.unidade_fiscalizada_id = p_unidade_id
        AND rc.pergunta IS NOT NULL
        AND btrim(rc.pergunta) <> ''
    )
    SELECT * FROM ranked WHERE rn = 1
  ) t
  WHERE upper(coalesce(t.resposta, '')) IN ('SIM','NAO','NÃO');

  v_total_constatacoes := v_total_constatacoes + (
    SELECT count(*) FROM public.constatacoes_manuais cm WHERE cm.unidade_fiscalizada_id = p_unidade_id
  );

  SELECT count(*) INTO v_total_ncs FROM public.nao_conformidades nc WHERE nc.unidade_fiscalizada_id = p_unidade_id;
  SELECT count(*) INTO v_total_dets FROM public.determinacoes d WHERE d.unidade_fiscalizada_id = p_unidade_id;
  SELECT count(*) INTO v_total_recs FROM public.recomendacoes r WHERE r.unidade_fiscalizada_id = p_unidade_id;

  UPDATE public.unidades_fiscalizadas uf
  SET total_constatacoes = v_total_constatacoes,
      total_ncs = v_total_ncs,
      fotos_unidade = coalesce(p_fotos, uf.fotos_unidade),
      status = CASE WHEN p_finalizar THEN 'finalizada' ELSE uf.status END,
      updated_at = now()
  WHERE uf.id = p_unidade_id
  RETURNING uf.status INTO v_status_final;

  RETURN jsonb_build_object(
    'success', true,
    'total_constatacoes', v_total_constatacoes,
    'total_ncs', v_total_ncs,
    'total_determinacoes', v_total_dets,
    'total_recomendacoes', v_total_recs,
    'status_final', v_status_final
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.gerar_ncs_unidade(uuid, jsonb, boolean) TO PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.finalizar_fiscalizacao(uuid);
CREATE OR REPLACE FUNCTION public.finalizar_fiscalizacao(p_fiscalizacao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fisc_id uuid := p_fiscalizacao_id;
  r_u record;
  v_total_nc int := 0;
  v_total_dets int := 0;
  v_total_recs int := 0;
  v_total_const int := 0;
  v_total_unidades int := 0;
  v_numero_termo text;
  v_ano int;
  v_rank int := 0;
  v_created_at timestamptz;
  v_data_fim timestamptz := now();
  has_total_constatacoes boolean;
  has_total_ncs boolean;
  has_total_determinacoes boolean;
  has_total_recomendacoes boolean;
BEGIN
  -- Segurança: Bloquear se o executor não for admin, coordenador ou fiscal
  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'coordenador', 'fiscal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: privilégios insuficientes.');
  END IF;

  IF v_fisc_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiscalização não informada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fiscalizacoes f WHERE f.id = v_fisc_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiscalização não encontrada');
  END IF;

  SELECT f.created_at INTO v_created_at
  FROM public.fiscalizacoes f
  WHERE f.id = v_fisc_id
  FOR UPDATE;

  v_created_at := coalesce(v_created_at, now());
  v_ano := extract(year from v_created_at);

  SELECT t.rn INTO v_rank
  FROM (
    SELECT
      f.id,
      row_number() OVER (
        PARTITION BY extract(year from f.created_at)::int
        ORDER BY f.created_at ASC, f.id ASC
      ) AS rn
    FROM public.fiscalizacoes f
    WHERE f.created_at IS NOT NULL
  ) t
  WHERE t.id = v_fisc_id;

  IF v_rank IS NULL OR v_rank < 1 THEN
    v_rank := 1;
  END IF;

  v_numero_termo := lpad(v_rank::text, 3, '0') || '/' || v_ano::text;

  -- Regerar NC/D/R por unidade antes de consolidar (mantém consistência após reaberturas/edições)
  FOR r_u IN
    SELECT uf.*
    FROM public.unidades_fiscalizadas uf
    WHERE uf.fiscalizacao_id = v_fisc_id
    ORDER BY uf.created_at ASC
  LOOP
    PERFORM public.gerar_ncs_unidade(r_u.id, (to_jsonb(r_u)->'fotos_unidade'), false);
  END LOOP;

  SELECT count(*) INTO v_total_unidades
  FROM public.unidades_fiscalizadas uf
  WHERE uf.fiscalizacao_id = v_fisc_id;

  SELECT coalesce(sum(t.cte),0) INTO v_total_const
  FROM (
    SELECT count(*) AS cte
    FROM public.respostas_checklist rc
    WHERE rc.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id)
      AND upper(coalesce(rc.resposta, '')) IN ('SIM','NAO','NÃO')
      AND rc.pergunta IS NOT NULL AND btrim(rc.pergunta) <> ''
    UNION ALL
    SELECT count(*) AS cte
    FROM public.constatacoes_manuais cm
    WHERE cm.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id)
  ) t;

  SELECT count(*) INTO v_total_nc
  FROM public.nao_conformidades nc
  WHERE nc.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  SELECT count(*) INTO v_total_dets
  FROM public.determinacoes d
  WHERE d.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  SELECT count(*) INTO v_total_recs
  FROM public.recomendacoes r
  WHERE r.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  UPDATE public.fiscalizacoes f
  SET status = 'finalizada',
      data_fim = CASE WHEN f.data_fim IS NULL THEN v_data_fim ELSE f.data_fim END,
      numero_termo = v_numero_termo,
      updated_at = now()
  WHERE f.id = v_fisc_id;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_constatacoes'
  ) INTO has_total_constatacoes;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_ncs'
  ) INTO has_total_ncs;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_determinacoes'
  ) INTO has_total_determinacoes;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_recomendacoes'
  ) INTO has_total_recomendacoes;

  IF has_total_constatacoes THEN
    UPDATE public.fiscalizacoes SET total_constatacoes = v_total_const WHERE id = v_fisc_id;
  END IF;
  IF has_total_ncs THEN
    UPDATE public.fiscalizacoes SET total_ncs = v_total_nc WHERE id = v_fisc_id;
  END IF;
  IF has_total_determinacoes THEN
    UPDATE public.fiscalizacoes SET total_determinacoes = v_total_dets WHERE id = v_fisc_id;
  END IF;
  IF has_total_recomendacoes THEN
    UPDATE public.fiscalizacoes SET total_recomendacoes = v_total_recs WHERE id = v_fisc_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fiscalizacao_id', v_fisc_id,
    'numero_termo', v_numero_termo,
    'total_unidades', v_total_unidades,
    'total_constatacoes', v_total_const,
    'total_ncs', v_total_nc,
    'total_determinacoes', v_total_dets,
    'total_recomendacoes', v_total_recs
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.finalizar_fiscalizacao(uuid) TO PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.propagate_modification_to_parent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_fiscalizacao_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'unidades_fiscalizadas' THEN
    v_fiscalizacao_id := COALESCE(NEW.fiscalizacao_id, OLD.fiscalizacao_id);
  ELSIF TG_TABLE_NAME IN ('respostas_checklist', 'constatacoes_manuais', 'recomendacoes', 'determinacoes') THEN
    SELECT fiscalizacao_id INTO v_fiscalizacao_id
    FROM public.unidades_fiscalizadas
    WHERE id = COALESCE(NEW.unidade_fiscalizada_id, OLD.unidade_fiscalizada_id);
  END IF;

  IF v_fiscalizacao_id IS NOT NULL THEN
    UPDATE public.fiscalizacoes
    SET updated_at = now()
    WHERE id = v_fiscalizacao_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.propagate_modification_to_parent() TO PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_fiscalizacao_set_camara()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only auto-derive when camara was not explicitly provided
  IF NEW.camara_tecnica_id IS NULL THEN
    NEW.camara_tecnica_id := public.camara_from_servicos(NEW.servicos);
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.trg_fiscalizacao_set_camara() TO PUBLIC, anon, authenticated, service_role;

