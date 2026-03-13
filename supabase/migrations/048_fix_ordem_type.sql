
-- Corrigir tipo da coluna 'ordem' para BIGINT
-- Se estiver como INTEGER, o valor de Date.now() (timestamp em ms) estoura o limite.

DO $$
BEGIN
    -- Verifica se a coluna 'ordem' existe e tenta alterar
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'constatacoes_manuais' 
        AND column_name = 'ordem' 
        AND data_type = 'integer'
    ) THEN
        RAISE NOTICE 'Alterando coluna ordem de INTEGER para BIGINT...';
        ALTER TABLE public.constatacoes_manuais 
        ALTER COLUMN ordem TYPE BIGINT;
    ELSE
        RAISE NOTICE 'A coluna ordem já é BIGINT ou não existe.';
        -- Se não existir, criar como BIGINT
        ALTER TABLE public.constatacoes_manuais 
        ADD COLUMN IF NOT EXISTS ordem BIGINT;
    END IF;
END $$;

-- Forçar atualização do cache do schema
NOTIFY pgrst, 'reload schema';
