-- Migração 103: Suporte Multi-Diretoria
-- Objetivo: Preparar o banco para suportar múltiplas Diretorias da AGEMS (DSB, DTR, DGE),
--           vinculando usuários e fiscalizações ao seu respectivo módulo/diretoria.
-- IMPORTANTE: Esta migração é 100% aditiva. Não altera nenhuma funcionalidade existente.

BEGIN;

-- ====================================================================
-- 1. TABELA DE REFERÊNCIA: diretorias
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.diretorias (
  id   text PRIMARY KEY,
  nome text NOT NULL
);

-- Seed das diretorias
INSERT INTO public.diretorias (id, nome) VALUES
  ('dsb', 'Diretoria de Saneamento Básico'),
  ('dtr', 'Diretoria de Transportes'),
  ('dge', 'Diretoria de Gás e Energia')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.diretorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Diretorias visíveis para todos autenticados" ON public.diretorias;
CREATE POLICY "Diretorias visíveis para todos autenticados" ON public.diretorias
  FOR SELECT TO authenticated USING (true);

-- ====================================================================
-- 2. TABELA DE REFERÊNCIA: camaras_tecnicas
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.camaras_tecnicas (
  id           text PRIMARY KEY,
  diretoria_id text NOT NULL REFERENCES public.diretorias(id) ON DELETE RESTRICT,
  nome         text NOT NULL
);

-- Seed das câmaras técnicas iniciais
INSERT INTO public.camaras_tecnicas (id, diretoria_id, nome) VALUES
  ('caterf', 'dtr', 'Câmara Técnica de Rodovias e Ferrovias'),
  ('caterm', 'dtr', 'Câmara Técnica de Terminais Rodoviários'),
  ('catesg', 'dge', 'Câmara Técnica de Serviços de Gás')
ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.camaras_tecnicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Câmaras técnicas visíveis para todos autenticados" ON public.camaras_tecnicas;
CREATE POLICY "Câmaras técnicas visíveis para todos autenticados" ON public.camaras_tecnicas
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins gerenciam câmaras técnicas" ON public.camaras_tecnicas;
CREATE POLICY "Admins gerenciam câmaras técnicas" ON public.camaras_tecnicas
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin');

-- ====================================================================
-- 3. EXPANDIR TABELA: profiles
-- Adicionar colunas diretoria_id e camara_tecnica_id
-- ====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS diretoria_id      text DEFAULT 'dsb' REFERENCES public.diretorias(id),
  ADD COLUMN IF NOT EXISTS camara_tecnica_id text DEFAULT NULL  REFERENCES public.camaras_tecnicas(id);

-- Backfill: todos os usuários existentes (são da DSB) recebem diretoria_id = 'dsb'
UPDATE public.profiles
SET diretoria_id = 'dsb'
WHERE diretoria_id IS NULL;

-- ====================================================================
-- 4. EXPANDIR TABELA: fiscalizacoes
-- Adicionar coluna tipo_modulo para rastrear o módulo de origem
-- ====================================================================

ALTER TABLE public.fiscalizacoes
  ADD COLUMN IF NOT EXISTS tipo_modulo text DEFAULT 'saneamento_dsb';

-- Backfill: todas as fiscalizações existentes pertencem ao módulo de saneamento
UPDATE public.fiscalizacoes
SET tipo_modulo = 'saneamento_dsb'
WHERE tipo_modulo IS NULL;

-- Adicionar comentário explicativo nos valores esperados
COMMENT ON COLUMN public.fiscalizacoes.tipo_modulo IS
  'Identificador do módulo/diretoria que originou a fiscalização. Valores: saneamento_dsb, rodovias_dtr, terminais_dtr, gas_dge';

-- ====================================================================
-- 5. FUNÇÕES AUXILIARES RLS
-- Seguindo o mesmo padrão de get_my_role() e get_my_prestador_id()
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_my_diretoria()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT diretoria_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_camara_tecnica()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT camara_tecnica_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ====================================================================
-- 6. ATUALIZAR TRIGGER handle_new_user
-- Garantir que novos usuários criados herdem diretoria_id = 'dsb' por padrão
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, ativo, diretoria_id, camara_tecnica_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'fiscal'),
    FALSE,
    COALESCE(NEW.raw_user_meta_data->>'diretoria_id', 'dsb'),
    NULLIF(NEW.raw_user_meta_data->>'camara_tecnica_id', '')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger (sem DROP/CREATE do trigger, pois já existe da migration 055)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ====================================================================
-- 7. ATUALIZAR TRIGGER enforce_profile_security
-- Proteger diretoria_id e camara_tecnica_id contra alteração não-admin
-- ====================================================================

CREATE OR REPLACE FUNCTION public.enforce_profile_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recriar o gatilho (já existia da migration 097)
DROP TRIGGER IF EXISTS trg_enforce_profile_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_security();

COMMIT;
