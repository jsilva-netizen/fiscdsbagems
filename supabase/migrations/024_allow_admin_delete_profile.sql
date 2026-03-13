-- Atualizar RLS para permitir DELETE de usuários na tabela profiles
-- A exclusão física do usuário do Auth não pode ser feita via Client (requer service_role)
-- Mas podemos permitir que o admin delete o perfil (soft-delete ou hard-delete do profile)

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Admins can delete profiles" 
ON public.profiles FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Garantir que o usuário JSILVA é admin (caso tenha se perdido)
UPDATE public.profiles 
SET role = 'admin', ativo = TRUE 
WHERE email = 'jsilva@agems.ms.gov.br';
