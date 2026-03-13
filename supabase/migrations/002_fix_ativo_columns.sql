-- Adicionar coluna 'ativo' na tabela tipos_unidade se não existir
ALTER TABLE public.tipos_unidade ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Adicionar coluna 'ativo' na tabela itens_checklist se não existir
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
