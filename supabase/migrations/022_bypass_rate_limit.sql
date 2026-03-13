-- Script para INSERIR admin via SQL (Bypass no Rate Limit do Client)
-- Já que o cadastro via front está bloqueado por Rate Limit, usamos o back.

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- 1. Verifica se já existe, se não, cria
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@agems.ms.gov.br';
    
    IF v_user_id IS NULL THEN
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
        ) RETURNING id INTO v_user_id;
    END IF;

    -- 2. Garante o perfil associado
    INSERT INTO public.profiles (id, email, full_name, role, ativo)
    VALUES (v_user_id, 'admin@agems.ms.gov.br', 'Administrador', 'admin', TRUE)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', ativo = TRUE;

END $$;
