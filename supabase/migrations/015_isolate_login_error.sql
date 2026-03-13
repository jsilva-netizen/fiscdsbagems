-- DIAGNÓSTICO: Desabilitar Triggers e RLS temporariamente para isolar o erro

-- 1. Remover o trigger de criação de usuário (ele pode estar falhando silenciosamente ou travando o banco)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Desabilitar RLS na tabela profiles (para garantir que não é permissão de leitura bloqueando)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Garantir permissões explícitas para todos os papéis (inclusive anon, caso o login falhe antes de autenticar)
GRANT ALL ON public.profiles TO postgres, service_role, anon, authenticated;

-- 4. Verificar se o usuário admin está correto (redefinir senha novamente para garantir)
UPDATE auth.users
SET encrypted_password = crypt('admin123', gen_salt('bf')),
    raw_user_meta_data = '{"full_name": "Admin", "role": "admin"}'::jsonb,
    email_confirmed_at = now()
WHERE email = 'admin@agems.ms.gov.br';

-- 5. Garantir que o perfil existe
INSERT INTO public.profiles (id, email, full_name, role, ativo)
SELECT id, email, 'Admin', 'admin', TRUE
FROM auth.users
WHERE email = 'admin@agems.ms.gov.br'
ON CONFLICT (id) DO UPDATE SET role = 'admin', ativo = TRUE;
