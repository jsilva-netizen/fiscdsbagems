-- Trigger para confirmar email automaticamente quando o usuário é aprovado (ativado)
-- Como não temos acesso direto de UPDATE na tabela auth.users via Client,
-- usamos um trigger na tabela profiles que roda com privilégios de SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.confirm_email_on_approval()
RETURNS TRIGGER 
SECURITY DEFINER -- Roda como superuser/postgres
SET search_path = public
AS $$
BEGIN
  -- Se o usuário foi ativado (ativo mudou de false para true)
  IF NEW.ativo = TRUE AND OLD.ativo = FALSE THEN
    -- Atualiza a tabela auth.users para confirmar o email
    UPDATE auth.users
    SET email_confirmed_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria o trigger
DROP TRIGGER IF EXISTS on_profile_approved ON public.profiles;
CREATE TRIGGER on_profile_approved
  AFTER UPDATE OF ativo ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.confirm_email_on_approval();

-- Confirmação retroativa para usuários já ativos mas com email não confirmado
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE id IN (SELECT id FROM public.profiles WHERE ativo = TRUE)
AND email_confirmed_at IS NULL;
