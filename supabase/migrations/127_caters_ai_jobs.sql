-- Migração 127: CATERS — Jobs de análise por IA
-- Objetivo: fila assíncrona para (1) extrair processo/recomendações de um PDF
--           e (2) analisar respostas do prestador/município frente às
--           recomendações, via Google Gemini. Todo resultado fica como
--           sugestão pendente (status='done' + reviewed_at IS NULL) até um
--           analista humano revisar e aprovar — nada é gravado nas tabelas
--           oficiais (caters_processes/caters_recommendations) automaticamente.

BEGIN;

-- ====================================================================
-- 1. ENUM
-- ====================================================================

DO $$ BEGIN
  CREATE TYPE public.caters_ai_job_type AS ENUM ('extract_pdf', 'analyze_response');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====================================================================
-- 2. TABELA
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.caters_ai_jobs (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  job_type        public.caters_ai_job_type NOT NULL,
  process_id      uuid REFERENCES public.caters_processes(id) ON DELETE CASCADE,
  storage_bucket  text,
  storage_path    text,
  input_text      text,
  status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'processing', 'done', 'error')),
  result_json     jsonb,
  reviewed_at     timestamptz,
  reviewed_by     uuid REFERENCES auth.users(id),
  error_message   text,
  requested_by    uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT caters_ai_jobs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS caters_ai_jobs_process_id_idx ON public.caters_ai_jobs (process_id);
CREATE INDEX IF NOT EXISTS caters_ai_jobs_status_idx ON public.caters_ai_jobs (status);

-- ====================================================================
-- 3. TRIGGER updated_at (reaproveita a função criada na migração 120)
-- ====================================================================

DROP TRIGGER IF EXISTS trg_caters_ai_jobs_updated_at ON public.caters_ai_jobs;
CREATE TRIGGER trg_caters_ai_jobs_updated_at
  BEFORE UPDATE ON public.caters_ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.caters_set_updated_at();

-- ====================================================================
-- 4. RLS (reaproveita is_caters_user() da migração 120)
-- ====================================================================

ALTER TABLE public.caters_ai_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CATERS ai jobs: gestao" ON public.caters_ai_jobs;
CREATE POLICY "CATERS ai jobs: gestao" ON public.caters_ai_jobs FOR ALL TO authenticated
  USING (public.is_caters_user()) WITH CHECK (public.is_caters_user());

-- ====================================================================
-- 5. Claim atômico de jobs (com FOR UPDATE SKIP LOCKED — ao contrário de
--    relatorios_jobs, cuja RPC de claim nunca foi versionada em migration)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.claim_caters_ai_jobs(
  p_limit int,
  p_job_id uuid DEFAULT NULL,
  p_stale_minutes int DEFAULT 5
)
RETURNS SETOF public.caters_ai_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
$$;

COMMIT;
