-- SOLUÇÃO DEFINITIVA: Client-Side Profile Creation
-- Removemos a complexidade dos triggers para evitar erros 500 no Auth.
-- O perfil será criado explicitamente pelo frontend.

-- 1. Remover Triggers e Funções Problemáticas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Garantir RLS Permissivo para INSERT autenticado
-- Isso permite que o usuário crie seu próprio perfil logo após o cadastro
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Leitura: Todos podem ler (necessário para admin listar)
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

-- Inserção: Usuário pode inserir seu próprio perfil
CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Atualização: Usuário pode editar seu próprio perfil
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. Garantir Admin (Novamente, para segurança)
INSERT INTO public.profiles (id, email, full_name, role, ativo)
SELECT id, email, 'Administrador', 'admin', TRUE
FROM auth.users
WHERE email = 'admin@agems.ms.gov.br'
ON CONFLICT (id) DO UPDATE SET role = 'admin', ativo = TRUE;
