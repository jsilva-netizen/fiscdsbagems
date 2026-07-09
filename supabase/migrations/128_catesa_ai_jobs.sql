-- Migração 128: CATESA — Jobs de análise por IA
-- Objetivo: fila assíncrona pra comparar, por termo de notificação, cada
--           determinação com a resposta do prestador/município e as
--           evidências anexadas, via Google Gemini. Resultado fica como
--           sugestão pendente (status='done' + reviewed_at IS NULL) até um
--           analista humano revisar — nada é gravado em respostas_determinacao
--           automaticamente.

BEGIN;

CREATE TABLE IF NOT EXISTS public.catesa_ai_jobs (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  termo_id        uuid NOT NULL REFERENCES public.termos_notificacao(id) ON DELETE CASCADE,
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
  CONSTRAINT catesa_ai_jobs_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS catesa_ai_jobs_termo_id_idx ON public.catesa_ai_jobs (termo_id);
CREATE INDEX IF NOT EXISTS catesa_ai_jobs_status_idx ON public.catesa_ai_jobs (status);

CREATE OR REPLACE FUNCTION public.catesa_ai_jobs_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_catesa_ai_jobs_updated_at ON public.catesa_ai_jobs;
CREATE TRIGGER trg_catesa_ai_jobs_updated_at
  BEFORE UPDATE ON public.catesa_ai_jobs
  FOR EACH ROW EXECUTE FUNCTION public.catesa_ai_jobs_set_updated_at();

ALTER TABLE public.catesa_ai_jobs ENABLE ROW LEVEL SECURITY;

-- Reaproveita can_access_camara() da migração 122 (mesma função usada por
-- termos_notificacao/autos_infracao/determinacoes).
DROP POLICY IF EXISTS "CATESA ai jobs: gestao" ON public.catesa_ai_jobs;
CREATE POLICY "CATESA ai jobs: gestao" ON public.catesa_ai_jobs FOR ALL TO authenticated
  USING (public.can_access_camara('catesa')) WITH CHECK (public.can_access_camara('catesa'));

-- Claim atômico de jobs (mesmo padrão de claim_caters_ai_jobs da migração 127).
CREATE OR REPLACE FUNCTION public.claim_catesa_ai_jobs(
  p_limit int,
  p_job_id uuid DEFAULT NULL,
  p_stale_minutes int DEFAULT 5
)
RETURNS SETOF public.catesa_ai_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.catesa_ai_jobs j
  SET status = 'processing', updated_at = now(), error_message = NULL
  FROM (
    SELECT id FROM public.catesa_ai_jobs
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
