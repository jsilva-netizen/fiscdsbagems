-- Habilitar pgcrypto para hash de senha
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Inserir usuário admin na tabela auth.users
-- Senha: 'admin123' (hash gerado com crypt)
-- Email: 'admin@agems.ms.gov.br'
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    uuid_generate_v4(),
    'authenticated',
    'authenticated',
    'admin@agems.ms.gov.br',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administrador","role":"admin"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (email) DO NOTHING;

-- O trigger handle_new_user já deve ter criado o profile.
-- Vamos garantir que o role seja 'admin' caso o trigger tenha falhado ou criado como 'user'
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@agems.ms.gov.br';
