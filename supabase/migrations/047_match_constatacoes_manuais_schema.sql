
-- Atualizar tabela constatacoes_manuais para espelhar o esquema do Base44

-- 1. unidade_fiscalizada_id (Já deve existir como UUID, mas garantindo)
-- Se for UUID no banco atual, mantemos UUID. Se não existir, criamos.
ALTER TABLE public.constatacoes_manuais 
ADD COLUMN IF NOT EXISTS unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id) ON DELETE CASCADE;

-- 2. numero_constatacao (text)
ALTER TABLE public.constatacoes_manuais 
ADD COLUMN IF NOT EXISTS numero_constatacao TEXT;

-- 3. descricao (text, required)
ALTER TABLE public.constatacoes_manuais 
ADD COLUMN IF NOT EXISTS descricao TEXT;

-- 4. gera_nc (boolean, default false)
ALTER TABLE public.constatacoes_manuais 
ADD COLUMN IF NOT EXISTS gera_nc BOOLEAN DEFAULT FALSE;

-- 5. artigo_portaria (text)
ALTER TABLE public.constatacoes_manuais 
ADD COLUMN IF NOT EXISTS artigo_portaria TEXT;

-- 6. texto_determinacao (text)
ALTER TABLE public.constatacoes_manuais 
ADD COLUMN IF NOT EXISTS texto_determinacao TEXT;

-- 7. texto_recomendacao (text)
ALTER TABLE public.constatacoes_manuais 
ADD COLUMN IF NOT EXISTS texto_recomendacao TEXT;

-- 8. ordem (number -> bigint/integer)
ALTER TABLE public.constatacoes_manuais 
ADD COLUMN IF NOT EXISTS ordem BIGINT;

-- Forçar atualização do cache do PostgREST
NOTIFY pgrst, 'reload schema';
