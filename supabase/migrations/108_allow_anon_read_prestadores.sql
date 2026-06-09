-- 108_allow_anon_read_prestadores.sql
-- Permitir leitura de prestadores de serviço por usuários anônimos para viabilizar o cadastro

-- 1. Remover a política antiga se existir
DROP POLICY IF EXISTS "Prestadores visíveis para todos autenticados" ON public.prestadores_servico;
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.prestadores_servico;

-- 2. Criar a política de leitura pública (permitindo anon e authenticated)
CREATE POLICY "Prestadores visíveis para todos" 
ON public.prestadores_servico 
FOR SELECT 
TO public 
USING (true);

-- 3. Assegurar que RLS continue ativo
ALTER TABLE public.prestadores_servico ENABLE ROW LEVEL SECURITY;
