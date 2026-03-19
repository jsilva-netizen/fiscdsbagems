ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated Select relatorios_fiscalizacao" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert relatorios_fiscalizacao" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update relatorios_fiscalizacao" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete relatorios_fiscalizacao" ON storage.objects;

CREATE POLICY "Authenticated Select relatorios_fiscalizacao"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'relatorios_fiscalizacao');

CREATE POLICY "Authenticated Insert relatorios_fiscalizacao"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'relatorios_fiscalizacao');

CREATE POLICY "Authenticated Update relatorios_fiscalizacao"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'relatorios_fiscalizacao');

CREATE POLICY "Authenticated Delete relatorios_fiscalizacao"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'relatorios_fiscalizacao');

DROP POLICY IF EXISTS "Delete own relatorios_jobs" ON public.relatorios_jobs;

CREATE POLICY "Delete own relatorios_jobs"
ON public.relatorios_jobs
FOR DELETE
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
