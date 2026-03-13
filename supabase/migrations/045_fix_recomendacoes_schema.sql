
-- Verificar estrutura da tabela recomendacoes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'recomendacoes';

-- Garantir que as colunas necessárias existam
ALTER TABLE public.recomendacoes ADD COLUMN IF NOT EXISTS unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id);
ALTER TABLE public.recomendacoes ADD COLUMN IF NOT EXISTS numero_recomendacao TEXT;
ALTER TABLE public.recomendacoes ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.recomendacoes ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'checklist';

-- Forçar refresh
NOTIFY pgrst, 'reload schema';
