-- Tornar jsilva@agems.ms.gov.br o ADMINISTRADOR ATIVO

-- 1. Confirmar email (caso pendente)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'jsilva@agems.ms.gov.br';

-- 2. Atualizar/Criar Perfil com permissão de ADMIN
-- Usamos UPSERT para garantir que funcione mesmo se o perfil não tiver sido criado
INSERT INTO public.profiles (id, email, full_name, role, ativo)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'J. Silva'), 'admin', TRUE
FROM auth.users
WHERE email = 'jsilva@agems.ms.gov.br'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', ativo = TRUE;
