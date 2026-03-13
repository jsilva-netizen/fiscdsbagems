-- Atualizar tabela prestadores_servico para incluir razao_social se não existir
-- Embora o arquivo de setup completo (000) tenha, se o banco foi criado antes, pode estar faltando.

DO $$
BEGIN
    -- Verificar e adicionar coluna razao_social
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'razao_social') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN razao_social TEXT;
    END IF;

    -- Verificar e adicionar coluna email_contato (caso esteja faltando também)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'email_contato') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN email_contato TEXT;
    END IF;

    -- Verificar e adicionar coluna cnpj
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'cnpj') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN cnpj TEXT;
    END IF;

    -- Verificar e adicionar coluna responsavel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'responsavel') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN responsavel TEXT;
    END IF;

    -- Verificar e adicionar coluna cargo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'cargo') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN cargo TEXT;
    END IF;
    
    -- Verificar e adicionar coluna tipo
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'tipo') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN tipo TEXT;
    END IF;

    -- Verificar e adicionar coluna documentos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'prestadores_servico' AND column_name = 'documentos') THEN
        ALTER TABLE public.prestadores_servico ADD COLUMN documentos JSONB DEFAULT '[]'::jsonb;
    END IF;
    
END $$;
