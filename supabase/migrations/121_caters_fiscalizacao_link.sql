-- Migração 121: Integração CATERS ↔ Fiscalizações do App
-- Liga caters_processes a fiscalizacoes existentes e auto-importa recomendações/determinações.

BEGIN;

-- ====================================================================
-- 1. COLUNAS DE LINK
-- ====================================================================

-- caters_processes: referência opcional à fiscalização de origem
ALTER TABLE public.caters_processes
  ADD COLUMN IF NOT EXISTS fiscalizacao_id uuid
    REFERENCES public.fiscalizacoes(id) ON DELETE SET NULL;

-- caters_recommendations: rastreia de onde veio cada recomendação
ALTER TABLE public.caters_recommendations
  ADD COLUMN IF NOT EXISTS recomendacao_id uuid
    REFERENCES public.recomendacoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS determinacao_id uuid
    REFERENCES public.determinacoes(id) ON DELETE SET NULL;

-- Índices para queries de vinculação
CREATE INDEX IF NOT EXISTS idx_caters_processes_fiscalizacao_id
  ON public.caters_processes(fiscalizacao_id);

CREATE INDEX IF NOT EXISTS idx_caters_recommendations_recomendacao_id
  ON public.caters_recommendations(recomendacao_id);

CREATE INDEX IF NOT EXISTS idx_caters_recommendations_determinacao_id
  ON public.caters_recommendations(determinacao_id);

-- ====================================================================
-- 2. FUNÇÃO: Importar recomendações de uma fiscalização
-- Importa recomendacoes (e futuramente determinacoes) de uma fiscalizacao
-- para um processo CATERS. Idempotente — não duplica registros.
-- Retorna o número de itens importados.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.caters_import_from_fiscalizacao(
  p_fiscalizacao_id  uuid,
  p_caters_process_id uuid,
  p_prazo_dias        integer DEFAULT 30
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_base     date;
  v_prazo_date    date;
  v_rec           RECORD;
  v_det           RECORD;
  v_imported      integer := 0;
BEGIN
  -- Verifica se o caller tem acesso CATERS
  IF NOT public.is_caters_user() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não pertence à CATERS.';
  END IF;

  -- Data base para calcular o prazo de 30 dias das recomendações
  SELECT COALESCE(data_fim::date, data_inicio::date, now()::date)
    INTO v_data_base
    FROM public.fiscalizacoes
   WHERE id = p_fiscalizacao_id;

  v_prazo_date := v_data_base + (p_prazo_dias || ' days')::interval;

  -- ----------------------------------------------------------------
  -- Importar RECOMENDAÇÕES (fonte atual)
  -- ----------------------------------------------------------------
  FOR v_rec IN
    SELECT r.id, r.descricao, r.created_at
      FROM public.recomendacoes r
      JOIN public.unidades_fiscalizadas uf ON uf.id = r.unidade_fiscalizada_id
     WHERE uf.fiscalizacao_id = p_fiscalizacao_id
       AND r.descricao IS NOT NULL
       AND r.descricao <> ''
       AND NOT EXISTS (
             SELECT 1
               FROM public.caters_recommendations cr
              WHERE cr.process_id      = p_caters_process_id
                AND cr.recomendacao_id = r.id
           )
  LOOP
    INSERT INTO public.caters_recommendations (
      process_id,
      recomendacao_id,
      description,
      promised_due_at,
      priority,
      status,
      created_by
    ) VALUES (
      p_caters_process_id,
      v_rec.id,
      v_rec.descricao,
      v_prazo_date,
      'media',
      'pendente',
      auth.uid()
    );
    v_imported := v_imported + 1;
  END LOOP;

  -- ----------------------------------------------------------------
  -- Importar DETERMINAÇÕES (futuro — já preparado)
  -- determinacoes têm prazo DATE explícito; usamos ele diretamente.
  -- ----------------------------------------------------------------
  FOR v_det IN
    SELECT d.id, d.descricao, d.prazo
      FROM public.determinacoes d
      JOIN public.unidades_fiscalizadas uf ON uf.id = d.unidade_fiscalizada_id
     WHERE uf.fiscalizacao_id = p_fiscalizacao_id
       AND d.descricao IS NOT NULL
       AND d.descricao <> ''
       AND NOT EXISTS (
             SELECT 1
               FROM public.caters_recommendations cr
              WHERE cr.process_id     = p_caters_process_id
                AND cr.determinacao_id = d.id
           )
  LOOP
    INSERT INTO public.caters_recommendations (
      process_id,
      determinacao_id,
      description,
      promised_due_at,
      priority,
      status,
      created_by
    ) VALUES (
      p_caters_process_id,
      v_det.id,
      v_det.descricao,
      COALESCE(v_det.prazo, v_prazo_date),
      'alta',   -- determinações têm prioridade mais alta por padrão
      'pendente',
      auth.uid()
    );
    v_imported := v_imported + 1;
  END LOOP;

  -- Vincula o processo à fiscalização (garante consistência)
  UPDATE public.caters_processes
     SET fiscalizacao_id = p_fiscalizacao_id
   WHERE id = p_caters_process_id;

  RETURN v_imported;
END;
$$;

-- ====================================================================
-- 3. VIEW: fiscalizações disponíveis para vincular a processos CATERS
-- Facilita o select no frontend sem expor dados de outras câmaras.
-- ====================================================================

CREATE OR REPLACE VIEW public.caters_fiscalizacoes_disponiveis AS
SELECT
  f.id,
  f.municipio_nome          AS municipality,
  f.fiscal_nome             AS technician_name,
  f.numero_termo,
  f.data_inicio,
  f.data_fim,
  f.status,
  f.tipo_modulo,
  f.prestador_servico_nome,
  -- Já vinculada a algum processo CATERS?
  EXISTS (
    SELECT 1 FROM public.caters_processes cp
     WHERE cp.fiscalizacao_id = f.id
  ) AS ja_vinculada,
  -- Conta recomendações disponíveis
  (
    SELECT COUNT(*)
      FROM public.recomendacoes r
      JOIN public.unidades_fiscalizadas uf ON uf.id = r.unidade_fiscalizada_id
     WHERE uf.fiscalizacao_id = f.id
  ) AS total_recomendacoes,
  -- Conta determinações disponíveis
  (
    SELECT COUNT(*)
      FROM public.determinacoes d
      JOIN public.unidades_fiscalizadas uf ON uf.id = d.unidade_fiscalizada_id
     WHERE uf.fiscalizacao_id = f.id
  ) AS total_determinacoes
FROM public.fiscalizacoes f
WHERE f.tipo_modulo IN ('residuos_dsb', 'saneamento_dsb')  -- módulos da DSB
  AND f.status = 'finalizada';

-- RLS na view via função de acesso
-- (views herdam políticas das tabelas base; fiscalizacoes já tem RLS adequado)

COMMIT;
