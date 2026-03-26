-- Forçar abertura total do RLS para todas as tabelas principais de sincronização
-- Isso resolve problemas onde usuários 'fiscal' não conseguem baixar unidades ou outros dados criados por eles mesmos ou por outros.

DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'fiscalizacoes',
            'unidades_fiscalizadas',
            'respostas_checklist',
            'constatacoes_manuais',
            'recomendacoes',
            'determinacoes',
            'nao_conformidades',
            'fotos_evidencia'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Usuários veem suas próprias fiscalizações" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Usuários criam fiscalizações" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Usuários editam suas fiscalizações" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Usuários deletam suas fiscalizações" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Acesso a Unidades Fiscalizadas" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Acesso a Respostas" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.%I', t_name);
        
        EXECUTE format('CREATE POLICY "Acesso total autenticado (DEV)" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t_name);
    END LOOP;
END $$;

-- Atualizar cache do postgrest
NOTIFY pgrst, 'reload schema';
