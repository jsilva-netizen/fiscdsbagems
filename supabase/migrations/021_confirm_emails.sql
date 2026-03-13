-- Confirmar email automaticamente para todos os usuários existentes
-- Isso resolve o erro "Email not confirmed" em ambiente de DEV
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- Para o usuário jsilva@agems.ms.gov.br especificamente
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'jsilva@agems.ms.gov.br';
