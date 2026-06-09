-- Migração 107: Atualizar trigger handle_new_user para suportar metadados adicionais no cadastro (role, diretoria, camara_tecnica, prestador)
-- Objetivo: Mapear os campos selecionados pelo usuário na tela de cadastro durante o INSERT inicial do profile.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    ativo, 
    diretoria_id, 
    camara_tecnica_id, 
    prestador_servico_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'fiscal'),
    FALSE, -- Sempre inativo até aprovação do admin
    COALESCE(NEW.raw_user_meta_data->>'diretoria_id', 'dsb'),
    NULLIF(NEW.raw_user_meta_data->>'camara_tecnica_id', ''),
    NULLIF(NEW.raw_user_meta_data->>'prestador_servico_id', '')::uuid
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = COALESCE(NEW.raw_user_meta_data->>'role', EXCLUDED.role),
      diretoria_id = COALESCE(NEW.raw_user_meta_data->>'diretoria_id', EXCLUDED.diretoria_id),
      camara_tecnica_id = NULLIF(NEW.raw_user_meta_data->>'camara_tecnica_id', ''),
      prestador_servico_id = NULLIF(NEW.raw_user_meta_data->>'prestador_servico_id', '')::uuid,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;
