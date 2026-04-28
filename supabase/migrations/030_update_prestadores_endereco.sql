-- Atualização complementar para adicionar colunas faltantes em prestadores_servico

DO $$
BEGIN
    -- Verificar e adicionar coluna endereco
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'endereco') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN endereco TEXT;
    END IF;

    -- Verificar e adicionar coluna cidade
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'cidade') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN cidade TEXT;
    END IF;

    -- Verificar e adicionar coluna telefone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'telefone') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN telefone TEXT;
    END IF;
    
    -- Verificar e adicionar coluna email_contato (caso não tenha rodado o anterior)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'email_contato') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN email_contato TEXT;
    END IF;

    -- Garantir todas as outras
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'cnpj') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN cnpj TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'responsavel') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN responsavel TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'cargo') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN cargo TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'tipo') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN tipo TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'documentos') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN documentos JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'updated_at') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

UPDATE public.prestadores_servico
SET updated_at = coalesce(updated_at, created_at, now())
WHERE updated_at IS NULL;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_prestadores_updated_at ON public.prestadores_servico;
CREATE TRIGGER update_prestadores_updated_at BEFORE UPDATE ON public.prestadores_servico FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

NOTIFY pgrst, 'reload schema';
