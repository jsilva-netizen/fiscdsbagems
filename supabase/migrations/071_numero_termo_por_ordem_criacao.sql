-- Define numero_termo (TERMO DE VISTORIA) pela ordem de criação das fiscalizações no ano.
-- Regra: para um mesmo ano, a N-ésima fiscalização criada deve receber NNN/AAAA,
-- independentemente do status (em andamento/finalizada).

-- 1) Backfill/normalização global para evitar números incoerentes em fiscalizações já existentes.
WITH ranked AS (
  SELECT
    f.id,
    extract(year from f.created_at)::int AS ano,
    row_number() OVER (
      PARTITION BY extract(year from f.created_at)::int
      ORDER BY f.created_at ASC, f.id ASC
    ) AS rn
  FROM public.fiscalizacoes f
  WHERE f.created_at IS NOT NULL
)
UPDATE public.fiscalizacoes f
SET numero_termo = lpad(r.rn::text, 3, '0') || '/' || r.ano::text
FROM ranked r
WHERE f.id = r.id;

-- 2) Atualiza a RPC finalizar_fiscalizacao para sempre usar a mesma regra no momento da finalização.
CREATE OR REPLACE FUNCTION public.finalizar_fiscalizacao(
  p_fiscalizacao_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION public.finalizar_fiscalizacao(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.finalizar_fiscalizacao(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';

