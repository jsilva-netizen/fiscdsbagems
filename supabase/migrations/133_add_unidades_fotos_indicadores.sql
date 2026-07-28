-- Migração 133: adiciona contadores de unidades fiscalizadas e fotos registradas
-- à RPC obter_resumo_indicadores, usada na aba de Indicadores.

CREATE OR REPLACE FUNCTION public.obter_resumo_indicadores(
  p_anos          text[],
  p_servicos      text[],
  p_municipio_ids uuid[],
  p_prestador_ids uuid[],
  p_tipo_modulo   text[] DEFAULT '{}'::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Permissões (inalteradas)
REVOKE ALL ON FUNCTION public.obter_resumo_indicadores(text[], text[], uuid[], uuid[], text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.obter_resumo_indicadores(text[], text[], uuid[], uuid[], text[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
