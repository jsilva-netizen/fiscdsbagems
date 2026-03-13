
-- 1. Criar bucket 'fotos_fiscalizacao' se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos_fiscalizacao', 'fotos_fiscalizacao', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Habilitar RLS (caso não esteja)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas para evitar conflitos (opcional, mas seguro)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;

-- 4. Recriar Políticas

-- Política de SELECT (Público pode ver qualquer objeto neste bucket)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'fotos_fiscalizacao' );

-- Política de INSERT (Autenticado pode inserir neste bucket)
CREATE POLICY "Authenticated Insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'fotos_fiscalizacao' );

-- Política de UPDATE (Autenticado pode atualizar seus próprios objetos neste bucket)
CREATE POLICY "Authenticated Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'fotos_fiscalizacao' );

-- Política de DELETE (Autenticado pode deletar seus próprios objetos neste bucket)
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'fotos_fiscalizacao' );
