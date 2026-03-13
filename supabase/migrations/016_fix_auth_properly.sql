-- 1. Garantir permissões fundamentais (Muitas vezes a causa raiz do erro 500 em Auth)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- 2. Recriar a tabela de perfis com estrutura correta e RLS habilitado
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    ativo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS Inteligentes (Princípio do Menor Privilégio)
-- Remove políticas antigas conflitantes
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.profiles;
DROP POLICY IF EXISTS "Perfis visíveis para todos autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuários editam seu próprio perfil" ON public.profiles;

-- Permitir leitura pública de perfis básicos (necessário para listar usuários no admin)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Permitir que o usuário edite apenas seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 4. Trigger Robusto e Seguro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    FALSE -- Padrão: Inativo
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logar erro (se tivesse tabela de logs) mas permitir o cadastro
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Garantir Usuário Admin (Idempotente)
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verifica se o usuário já existe
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@agems.ms.gov.br';
    
    IF v_user_id IS NULL THEN
        -- Insere novo usuário se não existir
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
    ELSE
        -- Atualiza senha se já existir
        UPDATE auth.users
        SET encrypted_password = crypt('admin123', gen_salt('bf')),
            raw_user_meta_data = '{"full_name":"Administrador","role":"admin"}'::jsonb
        WHERE id = v_user_id;
    END IF;

    -- Garante o perfil (o trigger deve ter criado, mas garantimos aqui)
    INSERT INTO public.profiles (id, email, full_name, role, ativo)
    VALUES (v_user_id, 'admin@agems.ms.gov.br', 'Administrador', 'admin', TRUE)
    ON CONFLICT (id) DO UPDATE 
    SET role = 'admin', ativo = TRUE;
    
END $$;
