-- Migração para otimizar os indicadores do painel de Relatórios
-- Cria uma função RPC no Supabase que consolida todas as somas, contagens e agrupamentos
-- no lado do servidor com índices otimizados, eliminando limites de consulta no frontend.

CREATE OR REPLACE FUNCTION public.obter_resumo_indicadores(
  p_anos text[],
  p_servicos text[],
  p_municipio_ids uuid[],
  p_prestador_ids uuid[],
  p_apenas_finalizadas boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  SELECT f.id, f.status, f.municipio_id, f.municipio_nome, f.prestador_servico_id, f.prestador_servico_nome, f.servicos, f.servico, f.created_at
  FROM public.fiscalizacoes f
  WHERE
    (cardinality(p_anos) = 0 OR extract(year from f.created_at)::text = ANY(p_anos))
    AND (
      cardinality(p_servicos) = 0 
      OR (
        f.servicos IS NOT NULL AND f.servicos && p_servicos
      )
      OR f.servico = ANY(p_servicos)
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
      SELECT unnest(coalesce(tf.servicos, ARRAY[tf.servico])) AS unnest_servico
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
$$;

-- Ajustar permissões para permitir execução apenas por usuários autenticados
REVOKE ALL ON FUNCTION public.obter_resumo_indicadores(text[], text[], uuid[], uuid[], boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.obter_resumo_indicadores(text[], text[], uuid[], uuid[], boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
