-- 137: fecha a escalada de privilégio pelo cadastro (.specify/bugs/escalada-privilegio-cadastro).
--
-- Antes: o papel do perfil vinha dos metadados do signUp (escolhidos pelo próprio usuário, inclusive
-- 'admin') e valia no banco desde o cadastro, mesmo com ativo = false; só a interface barrava o
-- perfil inativo. Anônimos liam todos os perfis e podiam inserir perfis.
--
-- Depois: perfil só tem papel e vínculos no banco quando ativo; o cadastro só aceita os papéis
-- oferecidos na tela; inativo não se autoaprova e só lê o próprio perfil; anônimo não lê nem
-- insere perfis.
--
-- Parte das definições de produção (inventário de 2026-09-28), que diferem das migrations antigas.

-- Trava: sem admin ativo ninguém conseguiria aprovar usuários depois desta migration.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin' AND ativo IS TRUE) THEN
    RAISE EXCEPTION 'Nenhum admin ativo em profiles: a migration 137 cortaria a administração de usuários';
  END IF;
END $$;

-- 1. Identidade usada pelas políticas: só perfil ativo.
--    is_staff(), is_caters_user() e can_access_*() chamam estas funções e herdam o filtro.

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;
$function$;

CREATE OR REPLACE FUNCTION public."current_role"()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role from public.profiles where id = auth.uid() and ativo is true), '');
$function$;

CREATE OR REPLACE FUNCTION public.get_my_camara_tecnica()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT camara_tecnica_id FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_diretoria()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT diretoria_id FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_prestador_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT prestador_servico_id FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;
$function$;

CREATE OR REPLACE FUNCTION public.current_prestador_servico_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select (select prestador_servico_id from public.profiles where id = auth.uid() and ativo is true);
$function$;

-- 2. Cadastro: só os papéis oferecidos na tela (src/pages/Register.jsx); qualquer outro vira
--    'fiscal'. O perfil nasce inativo e o conflito nunca sobrescreve o papel.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT := NEW.raw_user_meta_data->>'role';
  v_prestador UUID;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('fiscal', 'coordenador', 'diretor', 'prestador') THEN
    v_role := 'fiscal';
  END IF;

  -- Vínculo com prestador só para o papel prestador (restrições de profiles).
  IF v_role = 'prestador' THEN
    v_prestador := NULLIF(NEW.raw_user_meta_data->>'prestador_servico_id', '')::uuid;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, ativo, diretoria_id, camara_tecnica_id, prestador_servico_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    FALSE, -- Sempre inativo até aprovação do admin
    COALESCE(NEW.raw_user_meta_data->>'diretoria_id', 'dsb'),
    NULLIF(NEW.raw_user_meta_data->>'camara_tecnica_id', ''),
    v_prestador
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();

  RETURN NEW;
END;
$function$;

-- 3. Proteção do perfil: o papel de quem executa só conta se o perfil dele estiver ativo, para
--    que um inativo não se autoaprove nem troque o próprio papel ou vínculos.

CREATE OR REPLACE FUNCTION public.enforce_profile_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Operação interna sem usuário logado (gatilho do cadastro, service role, migrations): permitir.
  -- O cadastro é validado em handle_new_user().
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Papel de quem executa, só se o perfil estiver ativo.
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;

  -- Se for INSERÇÃO (Cadastro Inicial)
  IF TG_OP = 'INSERT' THEN
    -- Quem não é admin só cria perfil de fiscal, diretor ou prestador
    IF NEW.role NOT IN ('fiscal', 'diretor', 'prestador') AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.role := 'fiscal';
    END IF;

    -- Apenas admins podem cadastrar novos perfis já ativos
    IF NEW.ativo IS TRUE AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.ativo := FALSE;
    END IF;
  END IF;

  -- Se for ATUALIZAÇÃO (Edição de Perfil)
  IF TG_OP = 'UPDATE' THEN
    -- Impedir alteração de role por quem não é admin
    IF OLD.role IS DISTINCT FROM NEW.role AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.role := OLD.role;
    END IF;

    -- Impedir alteração de ativo (aprovação) por quem não é admin
    IF OLD.ativo IS DISTINCT FROM NEW.ativo AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.ativo := OLD.ativo;
    END IF;

    -- Impedir alteração de vínculo de prestador por quem não é admin
    IF OLD.prestador_servico_id IS DISTINCT FROM NEW.prestador_servico_id
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.prestador_servico_id := OLD.prestador_servico_id;
    END IF;

    -- Impedir alteração de diretoria/câmara técnica por quem não é admin
    IF OLD.diretoria_id IS DISTINCT FROM NEW.diretoria_id
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.diretoria_id := OLD.diretoria_id;
    END IF;

    IF OLD.camara_tecnica_id IS DISTINCT FROM NEW.camara_tecnica_id
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.camara_tecnica_id := OLD.camara_tecnica_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- 4. Políticas de profiles.

-- Anônimo lia todos os perfis (nome, e-mail, papel, vínculos).
DROP POLICY IF EXISTS "Leitura Geral" ON public.profiles;

-- Qualquer logado lia todos os perfis e, com o cadastro público, isso é qualquer pessoa. Passa a:
-- o próprio perfil (a tela de login lê `ativo` para mostrar "aguarda aprovação") ou todos, para
-- quem tem perfil ativo.
DROP POLICY IF EXISTS "Leitura pública de perfis" ON public.profiles;
CREATE POLICY "Leitura pública de perfis" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR (SELECT public.get_my_role()) IS NOT NULL);

-- Anônimo inseria perfis. O perfil é criado pelo gatilho do cadastro; autenticado sem perfil
-- continua com "Inserção Própria".
DROP POLICY IF EXISTS "Enable insert for authenticated users and during sign up" ON public.profiles;

-- Liam o papel direto da tabela, sem olhar ativo; passam a usar get_my_role().
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');
