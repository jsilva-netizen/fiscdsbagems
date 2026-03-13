-- Alternativa para criar usuário sem conflito de UNIQUE CONSTRAINT
-- Primeiro verificamos se o usuário já existe, se não, inserimos

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@agems.ms.gov.br') THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
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
            NOW()
        );
    END IF;
END $$;

-- Garantir permissão de admin no perfil (funciona mesmo se o usuário já existia)
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'admin@agems.ms.gov.br';
