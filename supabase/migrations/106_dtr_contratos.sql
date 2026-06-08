-- Migração 106: Cadastro Unificado de Entidades, Tabela de Contratos e Bucket de Logos
-- Objetivo: Expandir prestadores_servico para suportar múltiplos atributos de cadastro de Entidade,
--           criar a tabela de contratos (DTR) e configurar o bucket de logos de entidades.

BEGIN;

-- 1. Expansão da tabela prestadores_servico
ALTER TABLE public.prestadores_servico
  ADD COLUMN IF NOT EXISTS tipo_entidade TEXT NOT NULL DEFAULT 'Concessionária',
  ADD COLUMN IF NOT EXISTS tipo_servico TEXT[] DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativa',
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'MS',
  ADD COLUMN IF NOT EXISTS cep TEXT DEFAULT '79000-000',
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 2. Atualização das entidades/concessionárias existentes com tipos de serviço e campos padrão
-- Concessionárias DTR
UPDATE public.prestadores_servico
SET tipo_servico = ARRAY['Rodovias'],
    tipo_entidade = 'Concessionária',
    status = 'ativa',
    estado = 'MS',
    cep = '79000-000'
WHERE id IN (
  '44444444-4444-4444-4444-444444444401',
  '44444444-4444-4444-4444-444444444402',
  '44444444-4444-4444-4444-444444444403'
);

-- Prestadores DSB
UPDATE public.prestadores_servico
SET tipo_servico = ARRAY['Abastecimento de Água', 'Esgotamento Sanitário'],
    tipo_entidade = 'Concessionária',
    status = 'ativa',
    estado = 'MS',
    cep = '79040-040'
WHERE nome = 'SANESUL';

UPDATE public.prestadores_servico
SET tipo_servico = ARRAY['Abastecimento de Água', 'Esgotamento Sanitário', 'Limpeza Urbana', 'Manejo de Resíduos Sólidos', 'Drenagem Urbana'],
    tipo_entidade = 'Órgão ou Entidade Pública',
    status = 'ativa',
    estado = 'MS',
    cep = '79556-000'
WHERE nome = 'Município de Paraíso das Águas';

-- 3. Criação da tabela de contratos
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_contrato TEXT NOT NULL,
  prestador_servico_id UUID REFERENCES public.prestadores_servico(id) ON DELETE CASCADE,
  rodovia TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para contratos
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para contratos
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.contratos;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.contratos 
  FOR ALL TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- Trigger de updated_at para contratos
DROP TRIGGER IF EXISTS update_contratos_updated_at ON public.contratos;
CREATE TRIGGER update_contratos_updated_at 
  BEFORE UPDATE ON public.contratos 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- 4. Seed de contratos ativos correspondentes às rodovias
-- CCR MSVia -> BR-163 (Contrato nº 001/2014)
INSERT INTO public.contratos (id, numero_contrato, prestador_servico_id, rodovia, ativo) VALUES
  ('55555555-5555-5555-5555-555555555501', '001/2014', '44444444-4444-4444-4444-444444444401', 'BR-163', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Way-306 -> MS-306 (Contrato nº 002/2020)
INSERT INTO public.contratos (id, numero_contrato, prestador_servico_id, rodovia, ativo) VALUES
  ('55555555-5555-5555-5555-555555555502', '002/2020', '44444444-4444-4444-4444-444444444402', 'MS-306', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Way-112 -> MS-112 (Contrato nº 003/2023)
INSERT INTO public.contratos (id, numero_contrato, prestador_servico_id, rodovia, ativo) VALUES
  ('55555555-5555-5555-5555-555555555503', '003/2023', '44444444-4444-4444-4444-444444444403', 'MS-112', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 5. Bucket de logos de entidades e suas políticas de acesso
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos-entidades', 'logos-entidades', true)
ON CONFLICT (id) DO NOTHING;

-- Recriar políticas de SELECT/INSERT/UPDATE/DELETE no storage.objects abrangendo o novo bucket
DROP POLICY IF EXISTS "logos_entidades_public_access" ON storage.objects;
CREATE POLICY "logos_entidades_public_access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos-entidades' );

DROP POLICY IF EXISTS "logos_entidades_authenticated_insert" ON storage.objects;
CREATE POLICY "logos_entidades_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'logos-entidades' );

DROP POLICY IF EXISTS "logos_entidades_authenticated_update" ON storage.objects;
CREATE POLICY "logos_entidades_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'logos-entidades' );

DROP POLICY IF EXISTS "logos_entidades_authenticated_delete" ON storage.objects;
CREATE POLICY "logos_entidades_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'logos-entidades' );

-- Recarregar o esquema do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
