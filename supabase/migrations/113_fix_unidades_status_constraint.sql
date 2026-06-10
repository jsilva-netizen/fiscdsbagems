-- Migração 113: Corrigir a constraint 'unidades_fiscalizadas_status_check'
-- Permite os status 'em_andamento', 'pendente', 'finalizada', 'cancelada'
BEGIN;

DO $$
BEGIN
    -- Verificar e remover a constraint atual se ela existir
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'unidades_fiscalizadas_status_check'
    ) THEN
        ALTER TABLE public.unidades_fiscalizadas DROP CONSTRAINT unidades_fiscalizadas_status_check;
        RAISE NOTICE 'Constraint unidades_fiscalizadas_status_check removida com sucesso.';
    END IF;

    -- Adicionar a nova constraint contemplando todos os status previstos do ciclo de vida
    ALTER TABLE public.unidades_fiscalizadas 
    ADD CONSTRAINT unidades_fiscalizadas_status_check 
    CHECK (status IN ('pendente', 'em_andamento', 'finalizada', 'cancelada'));
    
    RAISE NOTICE 'Nova constraint unidades_fiscalizadas_status_check adicionada com sucesso.';
END $$;

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
