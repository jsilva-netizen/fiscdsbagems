CREATE TABLE IF NOT EXISTS public.relatorios_jobs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscalizacao_id uuid NOT NULL REFERENCES public.fiscalizacoes(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.profiles(id),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'done', 'error')),
  progress_unidades integer NOT NULL DEFAULT 0,
  progress_fotos integer NOT NULL DEFAULT 0,
  error_message text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relatorios_jobs_fiscalizacao_id_idx ON public.relatorios_jobs (fiscalizacao_id);
CREATE INDEX IF NOT EXISTS relatorios_jobs_requested_by_idx ON public.relatorios_jobs (requested_by);
CREATE INDEX IF NOT EXISTS relatorios_jobs_status_idx ON public.relatorios_jobs (status);

ALTER TABLE public.relatorios_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select own relatorios_jobs" ON public.relatorios_jobs;

CREATE POLICY "Select own relatorios_jobs"
ON public.relatorios_jobs
FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.ativo = TRUE
  )
);
