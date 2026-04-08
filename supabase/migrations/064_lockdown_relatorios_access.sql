ALTER TABLE public.relatorios_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Select own relatorios_jobs" ON public.relatorios_jobs;
DROP POLICY IF EXISTS "Select relatorios_jobs (owner/admin)" ON public.relatorios_jobs;
DROP POLICY IF EXISTS "Select relatorios_jobs (any active user)" ON public.relatorios_jobs;

CREATE POLICY "Select relatorios_jobs (any active user)"
ON public.relatorios_jobs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p0
    WHERE p0.id = auth.uid()
      AND p0.ativo = TRUE
  )
);

DROP POLICY IF EXISTS "Delete own relatorios_jobs" ON public.relatorios_jobs;
DROP POLICY IF EXISTS "Delete relatorios_jobs (owner/admin)" ON public.relatorios_jobs;

CREATE POLICY "Delete relatorios_jobs (owner/admin)"
ON public.relatorios_jobs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p0
    WHERE p0.id = auth.uid()
      AND p0.ativo = TRUE
  )
  AND (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
        AND p.ativo = TRUE
    )
    OR EXISTS (
      SELECT 1
      FROM public.fiscalizacoes f
      WHERE f.id = relatorios_jobs.fiscalizacao_id
        AND (
          f.created_by = auth.uid()
          OR (
            lower(coalesce(f.fiscal_email, '')) <> ''
            AND lower(coalesce(f.fiscal_email, '')) = lower(coalesce((SELECT p2.email FROM public.profiles p2 WHERE p2.id = auth.uid()), ''))
          )
        )
    )
  )
);

NOTIFY pgrst, 'reload schema';
