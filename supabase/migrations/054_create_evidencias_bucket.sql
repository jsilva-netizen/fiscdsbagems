INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias-determinacoes', 'evidencias-determinacoes', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Access evidencias"
ON storage.objects FOR SELECT
USING ( bucket_id = 'evidencias-determinacoes' );

CREATE POLICY "Authenticated Insert evidencias"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'evidencias-determinacoes' );

CREATE POLICY "Authenticated Update evidencias"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'evidencias-determinacoes' );

CREATE POLICY "Authenticated Delete evidencias"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'evidencias-determinacoes' );
