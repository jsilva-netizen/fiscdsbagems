-- Script para INSERIR usuário manualmente (Bypass Rate Limit)
-- Use isso quando o frontend estiver bloqueado por 429 Too Many Requests

DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'mvsilva@agems.ms.gov.br'; -- SEU EMAIL AQUI
    v_name TEXT := 'Mathaus Vasconcelos Silva'; -- SEU NOME AQUI
BEGIN
    -- 1. Verifica se já existe, se não, cria
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
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
            v_email,
            crypt('123456', gen_salt('bf')), -- SENHA PADRÃO: 123456
            NOW(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', v_name, 'role', 'user'),
            NOW(),
            NOW(),
            '', ''
        ) RETURNING id INTO v_user_id;
    END IF;

    -- 2. Garante o perfil associado
    INSERT INTO public.profiles (id, email, full_name, role, ativo)
    VALUES (v_user_id, v_email, v_name, 'user', FALSE) -- Cria como INATIVO (pendente aprovação)
    ON CONFLICT (id) DO NOTHING;

END $$;
