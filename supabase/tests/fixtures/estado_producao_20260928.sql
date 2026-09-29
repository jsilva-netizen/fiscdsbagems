-- Estado de PRODUÇÃO (inventário de 2026-09-28) dos objetos que a migration 137 corrige.
-- Gerado a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao*.csv
-- (branch migracao-sisreg). Só para teste: é carregado dentro de uma transação que termina em
-- ROLLBACK, para que o teste rode contra produção mesmo com o banco local divergente.

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

  SELECT role FROM public.profiles WHERE id = auth.uid();

$function$;

CREATE OR REPLACE FUNCTION public."current_role"()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role from public.profiles where id = auth.uid()), '');
$function$;

CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.current_role() in ('admin', 'fiscal', 'coordenador');
$function$;

CREATE OR REPLACE FUNCTION public.get_my_camara_tecnica()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT camara_tecnica_id FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_my_diretoria()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT diretoria_id FROM public.profiles WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_my_prestador_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

  SELECT prestador_servico_id FROM public.profiles WHERE id = auth.uid();

$function$;

CREATE OR REPLACE FUNCTION public.current_prestador_servico_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select (select prestador_servico_id from public.profiles where id = auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.is_caters_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    public.get_my_role() = 'admin'
    OR public.get_my_camara_tecnica() = 'caters'
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_camara(row_camara text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND (
        public.get_my_camara_tecnica() IS NULL  -- no chamber = backward compat, see all
        OR row_camara IS NULL                   -- legacy record
        OR row_camara = public.get_my_camara_tecnica()
      )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

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

    FALSE, -- Sempre inativo at├® aprova├º├úo do admin

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

$function$;

CREATE OR REPLACE FUNCTION public.enforce_profile_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Se for uma operação interna sem usuário logado (auth trigger, migrations, seeds), permitir tudo
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obter a role de quem está executando a operação
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();

  -- Se for INSERÇÃO (Cadastro Inicial)
  IF TG_OP = 'INSERT' THEN
    -- Apenas admins podem cadastrar novos perfis como admin ou coordenador
    IF NEW.role IN ('admin', 'coordenador') AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.role := 'fiscal';
    END IF;

    -- Apenas admins podem cadastrar novos perfis já ativos
    IF NEW.ativo = TRUE AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.ativo := FALSE;
    END IF;
  END IF;

  -- Se for ATUALIZAÇÃO (Edição de Perfil)
  IF TG_OP = 'UPDATE' THEN
    -- Impedir alteração de role por quem não é admin
    IF OLD.role <> NEW.role AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.role := OLD.role;
    END IF;

    -- Impedir alteração de ativo (aprovação) por quem não é admin
    IF OLD.ativo <> NEW.ativo AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.ativo := OLD.ativo;
    END IF;

    -- Impedir alteração de vínculo de prestador por quem não é admin
    IF COALESCE(OLD.prestador_servico_id, '00000000-0000-0000-0000-000000000000'::uuid) <>
       COALESCE(NEW.prestador_servico_id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.prestador_servico_id := OLD.prestador_servico_id;
    END IF;

    -- Impedir alteração de diretoria/câmara técnica por quem não é admin
    IF COALESCE(OLD.diretoria_id, '') <> COALESCE(NEW.diretoria_id, '')
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.diretoria_id := OLD.diretoria_id;
    END IF;

    IF COALESCE(OLD.camara_tecnica_id, '') <> COALESCE(NEW.camara_tecnica_id, '')
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.camara_tecnica_id := OLD.camara_tecnica_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Gatilhos de produção em profiles e auth.users (o local tem um a mais: on_profile_approved).
DROP TRIGGER IF EXISTS on_profile_approved ON public.profiles;
DROP TRIGGER IF EXISTS trg_enforce_profile_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_security();
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Políticas de produção de profiles: remove as locais e recria as de produção.
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles' LOOP EXECUTE format('DROP POLICY %I ON public.profiles', p.policyname); END LOOP; END $$;
CREATE POLICY "Admins can delete profiles" ON public.profiles AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::text)))));
CREATE POLICY "Admins can update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((( SELECT profiles_1.role
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid())) = 'admin'::text))
  WITH CHECK ((( SELECT profiles_1.role
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid())) = 'admin'::text));
CREATE POLICY "Admins e coordenadores gerenciam perfis" ON public.profiles AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text])));
CREATE POLICY "Edição Própria" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING ((auth.uid() = id));
CREATE POLICY "Enable insert for authenticated users and during sign up" ON public.profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (true);
CREATE POLICY "Inserção Própria" ON public.profiles AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "Leitura Geral" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "Leitura pública de perfis" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Usuários comuns atualizam apenas dados de contato próprios" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));
CREATE POLICY "profiles_admin_all" ON public.profiles AS PERMISSIVE FOR ALL TO authenticated
  USING (("current_role"() = 'admin'::text))
  WITH CHECK (("current_role"() = 'admin'::text));
CREATE POLICY "profiles_self_select" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((id = auth.uid()));
CREATE POLICY "profiles_self_update" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = auth.uid()))
  WITH CHECK ((id = auth.uid()));

-- Políticas de produção de fiscalizacoes: remove as locais e recria as de produção.
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='fiscalizacoes' LOOP EXECUTE format('DROP POLICY %I ON public.fiscalizacoes', p.policyname); END LOOP; END $$;
CREATE POLICY "Fiscais e Admins: acesso por camara em fiscalizacoes" ON public.fiscalizacoes AS PERMISSIVE FOR ALL TO authenticated
  USING (can_access_camara(camara_tecnica_id))
  WITH CHECK (can_access_camara(camara_tecnica_id));
CREATE POLICY "Prestadores: ler apenas suas próprias fiscalizações" ON public.fiscalizacoes AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())));
CREATE POLICY "Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe" ON public.fiscalizacoes AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())));
CREATE POLICY "e2e_test_user_own_rows_only" ON public.fiscalizacoes AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (created_by = auth.uid())));
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.fiscalizacoes AS RESTRICTIVE FOR DELETE TO authenticated
  USING (((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (created_by = auth.uid())));
