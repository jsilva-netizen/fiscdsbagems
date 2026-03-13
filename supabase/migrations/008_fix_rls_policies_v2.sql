-- Atualizar a política RLS para permitir inserções autenticadas na tabela tipos_unidade
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.tipos_unidade;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.tipos_unidade FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Atualizar a política RLS para permitir inserções autenticadas na tabela itens_checklist
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.itens_checklist;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.itens_checklist FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Forçar atualização do cache de permissões
NOTIFY pgrst, 'reload schema';
