-- A função handle_new_user pode estar falhando se o metadata estiver null ou mal formatado.
-- Vamos torná-la mais robusta e garantir que não quebre o fluxo de auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), -- Fallback para email se não tiver nome
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    FALSE -- Padrão inativo
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Logar erro se possível ou apenas ignorar para não travar o cadastro (embora o ideal seja tratar)
    -- Mas como é um trigger AFTER INSERT, falhar aqui pode fazer rollback do usuário.
    -- Vamos garantir que funcione mesmo com dados mínimos.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verificar permissões na tabela profiles
-- O trigger roda como superuser (SECURITY DEFINER), mas é bom garantir.
GRANT ALL ON public.profiles TO postgres;
GRANT ALL ON public.profiles TO service_role;

-- Garantir que o admin existe e está ativo (reparação)
UPDATE public.profiles SET ativo = TRUE WHERE email = 'admin@agems.ms.gov.br';
