-- Diagnóstico e Correção de RLS/Triggers para unidades_fiscalizadas

-- 1. Garantir RLS permissivo para INSERT (DEV mode)
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.unidades_fiscalizadas;
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.unidades_fiscalizadas;

CREATE POLICY "Acesso total autenticado (DEV)" 
ON public.unidades_fiscalizadas 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 2. Verificar se existe algum trigger problemático
SELECT trigger_name, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'unidades_fiscalizadas';

-- 3. Inserção de teste via SQL (hardcoded) para ver se o banco aceita
-- Substitua o ID da fiscalização por um válido se souber, ou pegue o primeiro disponível
DO $$
DECLARE
    v_fiscalizacao_id UUID;
BEGIN
    SELECT id INTO v_fiscalizacao_id FROM public.fiscalizacoes LIMIT 1;
    
    IF v_fiscalizacao_id IS NOT NULL THEN
        INSERT INTO public.unidades_fiscalizadas (
            fiscalizacao_id,
            tipo_unidade_id,
            codigo_unidade,
            nome_unidade,
            latitude,
            longitude
        ) VALUES (
            v_fiscalizacao_id,
            (SELECT id FROM public.tipos_unidade LIMIT 1), -- Pega qualquer tipo
            'TEST-001',
            'Unidade de Teste SQL',
            -20.4697,
            -54.6201
        );
    END IF;
END $$;
