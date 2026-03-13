-- Script de Limpeza e Recriação do Admin (com CASCADE simulado)

-- 1. Remover perfil primeiro (para evitar erro de FK)
DELETE FROM public.profiles WHERE email = 'admin@agems.ms.gov.br';

-- 2. Remover usuário do Auth
DELETE FROM auth.users WHERE email = 'admin@agems.ms.gov.br';

-- 3. Recriar usuário admin limpo
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    'admin@agems.ms.gov.br',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administrador","role":"admin"}',
    NOW(),
    NOW(),
    '', ''
);

-- 4. Recriar perfil (Client-side style, manual)
INSERT INTO public.profiles (id, email, full_name, role, ativo)
SELECT id, email, 'Administrador', 'admin', TRUE
FROM auth.users
WHERE email = 'admin@agems.ms.gov.br';
