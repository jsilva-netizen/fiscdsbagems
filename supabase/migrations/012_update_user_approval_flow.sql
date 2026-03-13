-- Alterar o padrão da coluna 'ativo' para FALSE (novos usuários nascem inativos)
ALTER TABLE public.profiles ALTER COLUMN ativo SET DEFAULT FALSE;

-- Atualizar a função handle_new_user para respeitar o novo padrão ou definir explicitamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Se for o primeiro usuário (admin), pode ativar automaticamente (opcional, mas seguro)
  -- Mas como já temos admin criado, vamos seguir a regra geral: nasce inativo.
  -- Exceto se passarmos 'ativo' nos metadata, o que não estamos fazendo no Register.jsx.
  
  INSERT INTO public.profiles (id, email, full_name, role, ativo)
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'full_name', 
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    FALSE -- Força inativo para novos cadastros via Auth
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que o admin principal continue ativo
UPDATE public.profiles
SET ativo = TRUE
WHERE email = 'admin@agems.ms.gov.br';
