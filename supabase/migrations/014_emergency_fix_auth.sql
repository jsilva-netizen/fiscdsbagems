-- Script de Emergência para corrigir Erro 500 no Login

-- 1. Limpar triggers potencialmente problemáticos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Recriar o trigger de forma ultra-simplificada e segura
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    FALSE -- Padrão inativo
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignora erros para não quebrar o Auth
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. RESETAR PERMISSÕES (Causa provável do "Database error querying schema")
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Permissões específicas para o trigger funcionar (o trigger roda como Security Definer, mas é bom garantir)
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO service_role;

-- 4. Garantir que o usuário Admin existe, tem senha correta e profile ativo
-- Atualiza a senha para 'admin123' caso tenha sido corrompida
UPDATE auth.users
SET encrypted_password = crypt('admin123', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    raw_user_meta_data = '{"full_name":"Administrador","role":"admin"}'::jsonb
WHERE email = 'admin@agems.ms.gov.br';

-- Insere/Atualiza o profile do admin
INSERT INTO public.profiles (id, email, full_name, role, ativo)
SELECT id, email, 'Administrador', 'admin', TRUE
FROM auth.users
WHERE email = 'admin@agems.ms.gov.br'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', ativo = TRUE;
