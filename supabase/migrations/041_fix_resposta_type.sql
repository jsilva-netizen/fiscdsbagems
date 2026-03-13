
-- Corrigir o tipo da coluna 'resposta' de JSONB para TEXT
-- O PostgREST pode rejeitar envio de string simples para campo JSONB dependendo da configuração/versão
-- E o sistema legado usa TEXT.

DO $$
BEGIN
    -- Verificar se é jsonb antes de tentar alterar
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'respostas_checklist' 
        AND column_name = 'resposta' 
        AND data_type = 'jsonb'
    ) THEN
        RAISE NOTICE 'Alterando coluna resposta de JSONB para TEXT...';
        
        -- Converter removendo as aspas extras do JSON
        ALTER TABLE public.respostas_checklist 
        ALTER COLUMN resposta TYPE TEXT USING (
            CASE 
                WHEN jsonb_typeof(resposta) = 'string' THEN resposta#>>'{}'
                ELSE resposta::text 
            END
        );
    ELSE
        RAISE NOTICE 'A coluna resposta já é TEXT ou não existe.';
    END IF;
END $$;

-- Garantir refresh do schema
NOTIFY pgrst, 'reload schema';
