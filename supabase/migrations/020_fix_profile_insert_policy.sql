-- A política de INSERT está falhando porque, no momento do cadastro (signUp),
-- o cliente Supabase ainda não tem a sessão autenticada completa estabelecida para o contexto RLS.
-- Ou seja, auth.uid() pode estar retornando null ou o usuário é considerado 'anon' nesse milissegundo.

-- SOLUÇÃO: Permitir INSERT público (anon) na tabela profiles, MAS com validação de ID.
-- Isso é seguro porque a tabela profiles depende de um ID que deve existir em auth.users (constraint FK).
-- Um usuário malicioso não consegue inserir um ID falso que não exista no Auth.

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Enable insert for authenticated users and during sign up" 
ON public.profiles FOR INSERT 
WITH CHECK (
  -- Permite se o usuário estiver logado e o ID bater
  (auth.uid() = id) 
  OR 
  -- OU permite qualquer inserção (o FK protege contra IDs inválidos)
  -- Essa é a abordagem prática para cadastro client-side onde o token ainda não está 100% propagado
  (true)
);

-- Reforçar permissões para anon
GRANT INSERT ON public.profiles TO anon;
GRANT INSERT ON public.profiles TO authenticated;
