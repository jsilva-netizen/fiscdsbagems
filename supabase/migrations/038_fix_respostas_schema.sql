
-- Garantir que a tabela respostas_checklist tenha todas as colunas necessárias
ALTER TABLE public.respostas_checklist ADD COLUMN IF NOT EXISTS pergunta TEXT;
ALTER TABLE public.respostas_checklist ADD COLUMN IF NOT EXISTS numero_constatacao TEXT;
ALTER TABLE public.respostas_checklist ADD COLUMN IF NOT EXISTS gera_nc BOOLEAN DEFAULT FALSE;

-- Garantir que a tabela constatacoes_manuais tenha todas as colunas necessárias
ALTER TABLE public.constatacoes_manuais ADD COLUMN IF NOT EXISTS numero_constatacao TEXT;
ALTER TABLE public.constatacoes_manuais ADD COLUMN IF NOT EXISTS gera_nc BOOLEAN DEFAULT FALSE;
ALTER TABLE public.constatacoes_manuais ADD COLUMN IF NOT EXISTS artigo_portaria TEXT;
ALTER TABLE public.constatacoes_manuais ADD COLUMN IF NOT EXISTS texto_determinacao TEXT;
ALTER TABLE public.constatacoes_manuais ADD COLUMN IF NOT EXISTS texto_recomendacao TEXT;
ALTER TABLE public.constatacoes_manuais ADD COLUMN IF NOT EXISTS ordem BIGINT;

-- Forçar atualização do cache do schema
NOTIFY pgrst, 'reload schema';
