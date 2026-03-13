-- Atualizar tabela respostas_checklist para espelhar o esquema do Base44 conforme solicitado

-- 1. pergunta (Texto da pergunta - Cache)
-- Tipo: text
ALTER TABLE public.respostas_checklist ADD COLUMN IF NOT EXISTS pergunta TEXT;

-- 2. numero_constatacao (Número da constatação C1, C2...)
-- Tipo: text
ALTER TABLE public.respostas_checklist ADD COLUMN IF NOT EXISTS numero_constatacao TEXT;

-- 3. gera_nc (Se este item gera NC quando NÃO)
-- Tipo: boolean
ALTER TABLE public.respostas_checklist ADD COLUMN IF NOT EXISTS gera_nc BOOLEAN DEFAULT FALSE;

-- 4. observacao (Observação adicional)
-- Tipo: text
ALTER TABLE public.respostas_checklist ADD COLUMN IF NOT EXISTS observacao TEXT;

-- 5. resposta (SIM, NAO, NA)
-- Tipo: text
-- Garantir que a coluna existe
ALTER TABLE public.respostas_checklist ADD COLUMN IF NOT EXISTS resposta TEXT;

-- Opcional: Adicionar constraint para garantir integridade dos dados (baseado nas Options do print)
-- DO $$ BEGIN
--     ALTER TABLE public.respostas_checklist ADD CONSTRAINT respostas_checklist_resposta_check CHECK (resposta IN ('SIM', 'NAO', 'NA'));
-- EXCEPTION
--     WHEN duplicate_object THEN NULL;
-- END $$;

-- Atualizar cache do PostgREST para reconhecer as novas colunas imediatamente
NOTIFY pgrst, 'reload schema';
