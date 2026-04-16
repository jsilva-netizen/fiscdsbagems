-- Evita erro 400 em finalizar_fiscalizacao quando não há constraint/índice para ON CONFLICT
-- e impede duplicação de recomendações por (unidade_fiscalizada_id, numero_recomendacao),
-- preservando overrides manuais (origem='manual').

CREATE OR REPLACE FUNCTION public.gerar_ncs_unidade(
  unidade_fiscalizada_id uuid,
  p_fotos jsonb default null,
  p_finalizar boolean default false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
  v_nc_descricao text;
  has_rec_numero boolean;
  has_rec_origem boolean;
  has_rec_updated boolean;
  v_rowcount int := 0;
BEGIN
  SELECT uf.fiscalizacao_id, uf.created_at
    INTO v_fiscalizacao, v_created
  FROM public.unidades_fiscalizadas uf
  WHERE uf.id = p_unidade_id;

  IF v_fiscalizacao IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unidade não encontrada');
  END IF;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recomendacoes' AND column_name = 'numero_recomendacao'
  ) INTO has_rec_numero;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recomendacoes' AND column_name = 'origem'
  ) INTO has_rec_origem;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recomendacoes' AND column_name = 'updated_at'
  ) INTO has_rec_updated;

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

  END IF;

  DELETE FROM public.determinacoes d WHERE d.unidade_fiscalizada_id = p_unidade_id;
  DELETE FROM public.nao_conformidades nc WHERE nc.unidade_fiscalizada_id = p_unidade_id;

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
        INSERT INTO public.determinacoes (
          unidade_fiscalizada_id, nao_conformidade_id, numero_determinacao, descricao, prazo_dias, data_limite, status
        )
        VALUES (
          p_unidade_id,
          v_nc_id,
          'D'||contD,
          'Para sanar a NC'||contNC||' '||r_resp.texto_determinacao,
          coalesce(r_resp.prazo_dias, 30),
          (now()::date + coalesce(r_resp.prazo_dias, 30)),
          'pendente'
        );
      END IF;
    END IF;
  END LOOP;

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
        INSERT INTO public.determinacoes (
          unidade_fiscalizada_id, nao_conformidade_id, numero_determinacao, descricao, prazo_dias, data_limite, status
        )
        VALUES (
          p_unidade_id,
          v_nc_id,
          'D'||contD,
          CASE
            WHEN r_man.texto_determinacao ILIKE 'Para sanar%' THEN r_man.texto_determinacao
            ELSE 'Para sanar a NC'||contNC||' '||r_man.texto_determinacao||'. Prazo: 30 dias.'
          END,
          30,
          (now()::date + 30),
          'pendente'
        );
      END IF;
    END IF;
  END LOOP;

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
$$;

NOTIFY pgrst, 'reload schema';

