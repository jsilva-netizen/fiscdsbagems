-- Migração 097: Políticas de RLS Altamente Otimizadas com Funções Estáveis (STABLE)
-- Esta migração aplica RLS cirúrgica em todas as tabelas, assegurando alta performance
-- durante sincronização offline e separação rigorosa de perfis.

BEGIN;

-- DROP DE POLÍTICAS NOVAS PARA EVITAR CONFLITOS DE RE-EXECUÇÃO
DROP POLICY IF EXISTS "Leitura pública de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuários comuns atualizam apenas dados de contato próprios" ON public.profiles;
DROP POLICY IF EXISTS "Admins e coordenadores gerenciam perfis" ON public.profiles;
DROP POLICY IF EXISTS "Leitura pública de municípios" ON public.municipios;
DROP POLICY IF EXISTS "Operadores gerenciam municípios" ON public.municipios;
DROP POLICY IF EXISTS "Leitura pública de prestadores" ON public.prestadores_servico;
DROP POLICY IF EXISTS "Operadores gerenciam prestadores" ON public.prestadores_servico;
DROP POLICY IF EXISTS "Leitura pública de tipos de unidade" ON public.tipos_unidade;
DROP POLICY IF EXISTS "Operadores gerenciam tipos de unidade" ON public.tipos_unidade;
DROP POLICY IF EXISTS "Leitura pública de itens de checklist" ON public.itens_checklist;
DROP POLICY IF EXISTS "Operadores gerenciam itens de checklist" ON public.itens_checklist;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em fiscalizacoes" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Prestadores: ler apenas suas próprias fiscalizações" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em unidades" ON public.unidades_fiscalizadas;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias unidades" ON public.unidades_fiscalizadas;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em respostas" ON public.respostas_checklist;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias respostas" ON public.respostas_checklist;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em ncs" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias ncs" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em determinacoes" ON public.determinacoes;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias determinacoes" ON public.determinacoes;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em recomendacoes" ON public.recomendacoes;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias recomendacoes" ON public.recomendacoes;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em constatacoes" ON public.constatacoes_manuais;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias constatacoes" ON public.constatacoes_manuais;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em fotos" ON public.fotos_evidencia;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias fotos" ON public.fotos_evidencia;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em termos" ON public.termos_notificacao;
DROP POLICY IF EXISTS "Prestadores: ler seus termos" ON public.termos_notificacao;
DROP POLICY IF EXISTS "Prestadores: responder seus termos" ON public.termos_notificacao;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em respostas determinacoes" ON public.respostas_determinacao;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias respostas determinacoes" ON public.respostas_determinacao;
DROP POLICY IF EXISTS "Prestadores: cadastrar respostas determinacoes" ON public.respostas_determinacao;
DROP POLICY IF EXISTS "Prestadores: atualizar suas próprias respostas determinacoes" ON public.respostas_determinacao;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em manifestacoes" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias manifestações" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Prestadores: cadastrar suas próprias manifestações" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Prestadores: atualizar suas próprias manifestações" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em pareceres" ON public.pareceres_tecnicos;
DROP POLICY IF EXISTS "Prestadores: ler pareceres de seus autos" ON public.pareceres_tecnicos;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em julgamentos" ON public.julgamentos;
DROP POLICY IF EXISTS "Prestadores: ler julgamentos de seus autos" ON public.julgamentos;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em remessas" ON public.remessas_ai;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias remessas" ON public.remessas_ai;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em itens de remessas" ON public.remessas_ai_itens;
DROP POLICY IF EXISTS "Prestadores: ler itens de suas próprias remessas" ON public.remessas_ai_itens;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em autos" ON public.autos_infracao;
DROP POLICY IF EXISTS "Prestadores: ler seus próprios autos" ON public.autos_infracao;



-- ====================================================================
-- 1. CRIAR AS FUNÇÕES AUXILIARES OTIMIZADAS (STABLE E SECURITY DEFINER)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_prestador_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT prestador_servico_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ====================================================================
-- 1.5. GATILHO DE PROTEÇÃO PREVENTIVA CONTRA AUTOPROMOÇÃO EM PERFIS
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

  -- Obter a role de quem está executando a operação (o usuário autenticado)
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid();
  
  -- Se for INSERÇÃO (Cadastro Inicial)
  IF TG_OP = 'INSERT' THEN
    -- Apenas admins podem cadastrar novos perfis como admin ou coordenador
    IF NEW.role IN ('admin', 'coordenador') AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.role := 'fiscal'; -- Rebaixa para a role mais segura
    END IF;
    
    -- Apenas admins podem cadastrar novos perfis já ativos
    IF NEW.ativo = TRUE AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.ativo := FALSE; -- Força inativo
    END IF;
  END IF;

  -- Se for ATUALIZAÇÃO (Edição de Perfil)
  IF TG_OP = 'UPDATE' THEN
    -- Impedir alteração de role por quem não é admin
    IF OLD.role <> NEW.role AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.role := OLD.role; -- Reverte para a role antiga
    END IF;

    -- Impedir alteração de ativo (aprovação) por quem não é admin
    IF OLD.ativo <> NEW.ativo AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.ativo := OLD.ativo; -- Reverte para o status antigo
    END IF;

    -- Impedir alteração de vínculo de prestador por quem não é admin
    IF COALESCE(OLD.prestador_servico_id, '00000000-0000-0000-0000-000000000000'::uuid) <> COALESCE(NEW.prestador_servico_id, '00000000-0000-0000-0000-000000000000'::uuid) 
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.prestador_servico_id := OLD.prestador_servico_id; -- Reverte para o vínculo antigo
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar gatilho de interceptação preventiva antes de gravar no banco
DROP TRIGGER IF EXISTS trg_enforce_profile_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_security();


-- ====================================================================
-- 2. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestadores_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_unidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscalizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_fiscalizadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.determinacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recomendacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constatacoes_manuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_evidencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autos_infracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_determinacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termos_notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifestacoes_auto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pareceres_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.julgamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remessas_ai ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remessas_ai_itens ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 3. REMOVER POLÍTICAS ANTIGAS E ADICIONAR NOVAS REGRAS OTIMIZADAS
-- ====================================================================

-- ----------------------------------------------------
-- A. TABELA: profiles
-- ----------------------------------------------------
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.profiles;
DROP POLICY IF EXISTS "Perfis visíveis para todos autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Perfis visÃ­veis para todos autenticados" ON public.profiles;
DROP POLICY IF EXISTS "Usuários editam seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "UsuÃ¡rios editam seu prÃ³prio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins editam qualquer perfil" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins gerenciam qualquer perfil" ON public.profiles;

CREATE POLICY "Leitura pública de perfis" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários comuns atualizam apenas dados de contato próprios" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins e coordenadores gerenciam perfis" ON public.profiles
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador'));

-- ----------------------------------------------------
-- B. TABELAS DE DOMÍNIO: municipios, prestadores_servico, tipos_unidade, itens_checklist
-- ----------------------------------------------------

-- municipios
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.municipios;
DROP POLICY IF EXISTS "Leitura pública de municípios" ON public.municipios;
DROP POLICY IF EXISTS "Apenas admins e coordenadores gerenciam municípios" ON public.municipios;
DROP POLICY IF EXISTS "Municípios visíveis para todos autenticados" ON public.municipios;

CREATE POLICY "Leitura pública de municípios" ON public.municipios
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operadores gerenciam municípios" ON public.municipios
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador'));

-- prestadores_servico
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.prestadores_servico;
DROP POLICY IF EXISTS "Leitura de prestadores por autenticados" ON public.prestadores_servico;
DROP POLICY IF EXISTS "Leitura pública de prestadores" ON public.prestadores_servico;
DROP POLICY IF EXISTS "Apenas fiscais e admins gerenciam prestadores" ON public.prestadores_servico;
DROP POLICY IF EXISTS "Prestadores visíveis para todos autenticados" ON public.prestadores_servico;

CREATE POLICY "Leitura pública de prestadores" ON public.prestadores_servico
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operadores gerenciam prestadores" ON public.prestadores_servico
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

-- tipos_unidade
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.tipos_unidade;
DROP POLICY IF EXISTS "Leitura de tipos de unidade" ON public.tipos_unidade;
DROP POLICY IF EXISTS "Leitura pública de tipos de unidade" ON public.tipos_unidade;
DROP POLICY IF EXISTS "Apenas fiscais e admins alteram tipos de unidade" ON public.tipos_unidade;
DROP POLICY IF EXISTS "Tipos de Unidade visíveis para todos autenticados" ON public.tipos_unidade;

CREATE POLICY "Leitura pública de tipos de unidade" ON public.tipos_unidade
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operadores gerenciam tipos de unidade" ON public.tipos_unidade
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

-- itens_checklist
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.itens_checklist;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.itens_checklist;
DROP POLICY IF EXISTS "Leitura de itens de checklist" ON public.itens_checklist;
DROP POLICY IF EXISTS "Leitura pública de itens de checklist" ON public.itens_checklist;
DROP POLICY IF EXISTS "Apenas fiscais e admins alteram checklists" ON public.itens_checklist;

CREATE POLICY "Leitura pública de itens de checklist" ON public.itens_checklist
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operadores gerenciam itens de checklist" ON public.itens_checklist
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

-- ----------------------------------------------------
-- C. TABELAS OPERACIONAIS: fiscalizacoes, unidades_fiscalizadas, respostas_checklist, nao_conformidades, determinacoes, recomendacoes, constatacoes_manuais, fotos_evidencia
-- ----------------------------------------------------

-- fiscalizacoes
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Fiscais e Admins: total acesso" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em fiscalizacoes" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias fiscalizações" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Prestadores: ler suas prÃ³prias fiscalizacoes" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Usuários veem suas próprias fiscalizações" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Usuários criam fiscalizações" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Usuários editam suas fiscalizações" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Usuários deletam suas fiscalizações" ON public.fiscalizacoes;

CREATE POLICY "Fiscais e Admins: acesso total em fiscalizacoes" ON public.fiscalizacoes
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler apenas suas próprias fiscalizações" ON public.fiscalizacoes
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND 
        prestador_servico_id = public.get_my_prestador_id()
    );

-- unidades_fiscalizadas
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.unidades_fiscalizadas;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em unidades" ON public.unidades_fiscalizadas;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias unidades" ON public.unidades_fiscalizadas;
DROP POLICY IF EXISTS "Prestadores: ler suas prÃ³prias unidades" ON public.unidades_fiscalizadas;
DROP POLICY IF EXISTS "Acesso a Unidades Fiscalizadas" ON public.unidades_fiscalizadas;

CREATE POLICY "Fiscais e Admins: acesso total em unidades" ON public.unidades_fiscalizadas
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias unidades" ON public.unidades_fiscalizadas
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.fiscalizacoes f
            WHERE f.id = unidades_fiscalizadas.fiscalizacao_id 
              AND f.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- respostas_checklist
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.respostas_checklist;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em respostas" ON public.respostas_checklist;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias respostas" ON public.respostas_checklist;
DROP POLICY IF EXISTS "Prestadores: ler suas prÃ³prias respostas" ON public.respostas_checklist;
DROP POLICY IF EXISTS "Acesso a Respostas" ON public.respostas_checklist;

CREATE POLICY "Fiscais e Admins: acesso total em respostas" ON public.respostas_checklist
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias respostas" ON public.respostas_checklist
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.unidades_fiscalizadas u
            JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
            WHERE u.id = respostas_checklist.unidade_fiscalizada_id 
              AND f.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- nao_conformidades
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em ncs" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias ncs" ON public.nao_conformidades;
DROP POLICY IF EXISTS "Prestadores: ler suas prÃ³prias ncs" ON public.nao_conformidades;

CREATE POLICY "Fiscais e Admins: acesso total em ncs" ON public.nao_conformidades
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias ncs" ON public.nao_conformidades
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.unidades_fiscalizadas u
            JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
            WHERE u.id = nao_conformidades.unidade_fiscalizada_id 
              AND f.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- determinacoes
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.determinacoes;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.determinacoes;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em determinacoes" ON public.determinacoes;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias determinacoes" ON public.determinacoes;
DROP POLICY IF EXISTS "Prestadores: ler suas prÃ³prias determinacoes" ON public.determinacoes;

CREATE POLICY "Fiscais e Admins: acesso total em determinacoes" ON public.determinacoes
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias determinacoes" ON public.determinacoes
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.unidades_fiscalizadas u
            JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
            WHERE u.id = determinacoes.unidade_fiscalizada_id 
              AND f.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- recomendacoes
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.recomendacoes;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.recomendacoes;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em recomendacoes" ON public.recomendacoes;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias recomendacoes" ON public.recomendacoes;
DROP POLICY IF EXISTS "Prestadores: ler suas prÃ³prias recomendacoes" ON public.recomendacoes;

CREATE POLICY "Fiscais e Admins: acesso total em recomendacoes" ON public.recomendacoes
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias recomendacoes" ON public.recomendacoes
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.unidades_fiscalizadas u
            JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
            WHERE u.id = recomendacoes.unidade_fiscalizada_id 
              AND f.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- constatacoes_manuais
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.constatacoes_manuais;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.constatacoes_manuais;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em constatacoes" ON public.constatacoes_manuais;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias constatacoes" ON public.constatacoes_manuais;
DROP POLICY IF EXISTS "Prestadores: ler suas prÃ³prias constatacoes" ON public.constatacoes_manuais;

CREATE POLICY "Fiscais e Admins: acesso total em constatacoes" ON public.constatacoes_manuais
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias constatacoes" ON public.constatacoes_manuais
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.unidades_fiscalizadas u
            JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
            WHERE u.id = constatacoes_manuais.unidade_fiscalizada_id 
              AND f.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- fotos_evidencia
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.fotos_evidencia;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.fotos_evidencia;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em fotos" ON public.fotos_evidencia;
DROP POLICY IF EXISTS "Prestadores: ler suas próprias fotos" ON public.fotos_evidencia;
DROP POLICY IF EXISTS "Prestadores: ler suas prÃ³prias fotos" ON public.fotos_evidencia;

CREATE POLICY "Fiscais e Admins: acesso total em fotos" ON public.fotos_evidencia
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias fotos" ON public.fotos_evidencia
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.unidades_fiscalizadas u
            JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
            WHERE u.id = fotos_evidencia.unidade_fiscalizada_id 
              AND f.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- ----------------------------------------------------
-- D. TABELAS DE AÇÕES, AUTOS E RETORNOS: termos_notificacao, respostas_determinacao, manifestacoes_auto, pareceres_tecnicos, julgamentos, remessas_ai, remessas_ai_itens
-- ----------------------------------------------------

-- termos_notificacao
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.termos_notificacao;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.termos_notificacao;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em termos" ON public.termos_notificacao;
DROP POLICY IF EXISTS "Prestadores: ler seus termos" ON public.termos_notificacao;
DROP POLICY IF EXISTS "Prestadores: responder seus termos" ON public.termos_notificacao;

CREATE POLICY "Fiscais e Admins: acesso total em termos" ON public.termos_notificacao
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler seus termos" ON public.termos_notificacao
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    );

CREATE POLICY "Prestadores: responder seus termos" ON public.termos_notificacao
    FOR UPDATE TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    )
    WITH CHECK (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    );

-- respostas_determinacao
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.respostas_determinacao;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.respostas_determinacao;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em respostas determinacoes" ON public.respostas_determinacao;
DROP POLICY IF EXISTS "Prestadores: visualizar e responder suas determinacoes" ON public.respostas_determinacao;

CREATE POLICY "Fiscais e Admins: acesso total em respostas determinacoes" ON public.respostas_determinacao
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias respostas determinacoes" ON public.respostas_determinacao
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    );

CREATE POLICY "Prestadores: cadastrar respostas determinacoes" ON public.respostas_determinacao
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    );

CREATE POLICY "Prestadores: atualizar suas próprias respostas determinacoes" ON public.respostas_determinacao
    FOR UPDATE TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    )
    WITH CHECK (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    );

-- manifestacoes_auto
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em manifestacoes" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Prestadores: visualizar manifestações de seus autos" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Prestadores: cadastrar manifestações em seus autos" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Prestadores: total acesso em suas próprias manifestações" ON public.manifestacoes_auto;

CREATE POLICY "Fiscais e Admins: acesso total em manifestacoes" ON public.manifestacoes_auto
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias manifestações" ON public.manifestacoes_auto
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.autos_infracao a
            WHERE a.id = manifestacoes_auto.auto_infracao_id 
              AND a.prestador_servico_id = public.get_my_prestador_id()
        )
    );

CREATE POLICY "Prestadores: cadastrar suas próprias manifestações" ON public.manifestacoes_auto
    FOR INSERT TO authenticated
    WITH CHECK (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.autos_infracao a
            WHERE a.id = manifestacoes_auto.auto_infracao_id 
              AND a.prestador_servico_id = public.get_my_prestador_id()
        )
    );

CREATE POLICY "Prestadores: atualizar suas próprias manifestações" ON public.manifestacoes_auto
    FOR UPDATE TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.autos_infracao a
            WHERE a.id = manifestacoes_auto.auto_infracao_id 
              AND a.prestador_servico_id = public.get_my_prestador_id()
        )
    )
    WITH CHECK (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.autos_infracao a
            WHERE a.id = manifestacoes_auto.auto_infracao_id 
              AND a.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- pareceres_tecnicos
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.pareceres_tecnicos;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.pareceres_tecnicos;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em pareceres" ON public.pareceres_tecnicos;
DROP POLICY IF EXISTS "Prestadores: ler pareceres de seus autos" ON public.pareceres_tecnicos;

CREATE POLICY "Fiscais e Admins: acesso total em pareceres" ON public.pareceres_tecnicos
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler pareceres de seus autos" ON public.pareceres_tecnicos
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.autos_infracao a
            WHERE a.id = pareceres_tecnicos.auto_id 
              AND a.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- julgamentos
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.julgamentos;
DROP POLICY IF EXISTS "Acesso genérico autenticado (DEV)" ON public.julgamentos;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em julgamentos" ON public.julgamentos;
DROP POLICY IF EXISTS "Prestadores: ler julgamentos de seus autos" ON public.julgamentos;

CREATE POLICY "Fiscais e Admins: acesso total em julgamentos" ON public.julgamentos
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler julgamentos de seus autos" ON public.julgamentos
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.autos_infracao a
            WHERE a.id = julgamentos.auto_id 
              AND a.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- remessas_ai
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em remessas" ON public.remessas_ai;
DROP POLICY IF EXISTS "Prestadores: ler apenas suas próprias remessas" ON public.remessas_ai;

CREATE POLICY "Fiscais e Admins: acesso total em remessas" ON public.remessas_ai
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler suas próprias remessas" ON public.remessas_ai
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    );

-- remessas_ai_itens
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em itens de remessas" ON public.remessas_ai_itens;
DROP POLICY IF EXISTS "Prestadores: ler apenas itens de suas próprias remessas" ON public.remessas_ai_itens;

CREATE POLICY "Fiscais e Admins: acesso total em itens de remessas" ON public.remessas_ai_itens
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler itens de suas próprias remessas" ON public.remessas_ai_itens
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        EXISTS (
            SELECT 1 FROM public.remessas_ai r
            WHERE r.id = remessas_ai_itens.remessa_ai_id 
              AND r.prestador_servico_id = public.get_my_prestador_id()
        )
    );

-- autos_infracao
DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.autos_infracao;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em autos" ON public.autos_infracao;
DROP POLICY IF EXISTS "Prestadores: ler seus próprios autos" ON public.autos_infracao;

CREATE POLICY "Fiscais e Admins: acesso total em autos" ON public.autos_infracao
    FOR ALL TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'))
    WITH CHECK (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

CREATE POLICY "Prestadores: ler seus próprios autos" ON public.autos_infracao
    FOR SELECT TO authenticated
    USING (
        public.get_my_role() = 'prestador' AND
        prestador_servico_id = public.get_my_prestador_id()
    );

-- ====================================================================
-- 3.5. SEGURANÇA NAS FUNÇÕES RPC (SECURITY DEFINER)
-- Evita que Prestadores burlam RLS invocando RPCs diretamente pelo cliente.
-- ====================================================================

DROP FUNCTION IF EXISTS public.finalizar_fiscalizacao(uuid);
CREATE OR REPLACE FUNCTION public.finalizar_fiscalizacao(
  p_fiscalizacao_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fisc_id uuid := p_fiscalizacao_id;
  r_u record;
  v_total_nc int := 0;
  v_total_dets int := 0;
  v_total_recs int := 0;
  v_total_const int := 0;
  v_total_unidades int := 0;
  v_numero_termo text;
  v_ano int;
  v_rank int := 0;
  v_created_at timestamptz;
  v_data_fim timestamptz := now();
  has_total_constatacoes boolean;
  has_total_ncs boolean;
  has_total_determinacoes boolean;
  has_total_recomendacoes boolean;
BEGIN
  -- Segurança: Bloquear se o executor não for admin, coordenador ou fiscal
  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'coordenador', 'fiscal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: privilégios insuficientes.');
  END IF;

  IF v_fisc_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiscalização não informada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fiscalizacoes f WHERE f.id = v_fisc_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiscalização não encontrada');
  END IF;

  SELECT f.created_at INTO v_created_at
  FROM public.fiscalizacoes f
  WHERE f.id = v_fisc_id
  FOR UPDATE;

  v_created_at := coalesce(v_created_at, now());
  v_ano := extract(year from v_created_at);

  SELECT t.rn INTO v_rank
  FROM (
    SELECT
      f.id,
      row_number() OVER (
        PARTITION BY extract(year from f.created_at)::int
        ORDER BY f.created_at ASC, f.id ASC
      ) AS rn
    FROM public.fiscalizacoes f
    WHERE f.created_at IS NOT NULL
  ) t
  WHERE t.id = v_fisc_id;

  IF v_rank IS NULL OR v_rank < 1 THEN
    v_rank := 1;
  END IF;

  v_numero_termo := lpad(v_rank::text, 3, '0') || '/' || v_ano::text;

  -- Regerar NC/D/R por unidade antes de consolidar (mantém consistência após reaberturas/edições)
  FOR r_u IN
    SELECT uf.*
    FROM public.unidades_fiscalizadas uf
    WHERE uf.fiscalizacao_id = v_fisc_id
    ORDER BY uf.created_at ASC
  LOOP
    PERFORM public.gerar_ncs_unidade(r_u.id, (to_jsonb(r_u)->'fotos_unidade'), false);
  END LOOP;

  SELECT count(*) INTO v_total_unidades
  FROM public.unidades_fiscalizadas uf
  WHERE uf.fiscalizacao_id = v_fisc_id;

  SELECT coalesce(sum(t.cte),0) INTO v_total_const
  FROM (
    SELECT count(*) AS cte
    FROM public.respostas_checklist rc
    WHERE rc.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id)
      AND upper(coalesce(rc.resposta, '')) IN ('SIM','NAO','NÃO')
      AND rc.pergunta IS NOT NULL AND btrim(rc.pergunta) <> ''
    UNION ALL
    SELECT count(*) AS cte
    FROM public.constatacoes_manuais cm
    WHERE cm.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id)
  ) t;

  SELECT count(*) INTO v_total_nc
  FROM public.nao_conformidades nc
  WHERE nc.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  SELECT count(*) INTO v_total_dets
  FROM public.determinacoes d
  WHERE d.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  SELECT count(*) INTO v_total_recs
  FROM public.recomendacoes r
  WHERE r.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  UPDATE public.fiscalizacoes f
  SET status = 'finalizada',
      data_fim = CASE WHEN f.data_fim IS NULL THEN v_data_fim ELSE f.data_fim END,
      numero_termo = v_numero_termo,
      updated_at = now()
  WHERE f.id = v_fisc_id;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_constatacoes'
  ) INTO has_total_constatacoes;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_ncs'
  ) INTO has_total_ncs;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_determinacoes'
  ) INTO has_total_determinacoes;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_recomendacoes'
  ) INTO has_total_recomendacoes;

  IF has_total_constatacoes THEN
    UPDATE public.fiscalizacoes SET total_constatacoes = v_total_const WHERE id = v_fisc_id;
  END IF;
  IF has_total_ncs THEN
    UPDATE public.fiscalizacoes SET total_ncs = v_total_nc WHERE id = v_fisc_id;
  END IF;
  IF has_total_determinacoes THEN
    UPDATE public.fiscalizacoes SET total_determinacoes = v_total_dets WHERE id = v_fisc_id;
  END IF;
  IF has_total_recomendacoes THEN
    UPDATE public.fiscalizacoes SET total_recomendacoes = v_total_recs WHERE id = v_fisc_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fiscalizacao_id', v_fisc_id,
    'numero_termo', v_numero_termo,
    'total_unidades', v_total_unidades,
    'total_constatacoes', v_total_const,
    'total_ncs', v_total_nc,
    'total_determinacoes', v_total_dets,
    'total_recomendacoes', v_total_recs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.finalizar_fiscalizacao(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.finalizar_fiscalizacao(uuid) TO authenticated;


DROP FUNCTION IF EXISTS public.gerar_ncs_unidade(uuid, jsonb, boolean);
CREATE OR REPLACE FUNCTION public.gerar_ncs_unidade(
  p_unidade_fiscalizada_id uuid,
  p_fotos jsonb default null,
  p_finalizar boolean default false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_unidade_id uuid := p_unidade_fiscalizada_id;
  v_fiscalizacao uuid;
  v_created timestamptz;
  ids_anteriores uuid[];
  contC int := 0;
  contNC int := 0;
  contD int := 0;
  contR int := 0;
  r_resp record;
  r_man record;
  v_nc_id uuid;
  v_total_constatacoes int := 0;
  v_total_ncs int := 0;
  v_total_dets int := 0;
  v_total_recs int := 0;
  v_status_final text;
  v_nc_descricao text;
BEGIN
  -- Segurança: Bloquear se o executor não for admin, coordenador ou fiscal
  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'coordenador', 'fiscal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: privilégios insuficientes.');
  END IF;

  SELECT uf.fiscalizacao_id, uf.created_at
    INTO v_fiscalizacao, v_created
  FROM public.unidades_fiscalizadas uf
  WHERE uf.id = p_unidade_id;

  IF v_fiscalizacao IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unidade não encontrada');
  END IF;

  SELECT array_agg(uf.id)
    INTO ids_anteriores
  FROM public.unidades_fiscalizadas uf
  WHERE uf.fiscalizacao_id = v_fiscalizacao
    AND uf.status = 'finalizada'
    AND uf.created_at < v_created;

  IF ids_anteriores IS NOT NULL THEN
    SELECT coalesce(sum(uf.total_constatacoes),0), coalesce(sum(uf.total_ncs),0)
      INTO contC, contNC
    FROM public.unidades_fiscalizadas uf
    WHERE uf.id = ANY(ids_anteriores);

    SELECT count(*) INTO contD
    FROM public.determinacoes d
    WHERE d.unidade_fiscalizada_id = ANY(ids_anteriores);

    SELECT count(*) INTO contR
    FROM public.recomendacoes r
    WHERE r.unidade_fiscalizada_id = ANY(ids_anteriores);
  END IF;

  DELETE FROM public.determinacoes d WHERE d.unidade_fiscalizada_id = p_unidade_id;
  DELETE FROM public.nao_conformidades nc WHERE nc.unidade_fiscalizada_id = p_unidade_id;
  DELETE FROM public.recomendacoes r
  WHERE r.unidade_fiscalizada_id = p_unidade_id
    AND (
      r.origem ILIKE 'checklist%'
      OR coalesce(nullif(btrim(r.origem), ''), 'manual') IN ('checklist', 'manual_constatacao')
    );

  FOR r_resp IN
    WITH ranked AS (
      SELECT
        rc.*,
        ic.artigo_portaria,
        ic.texto_determinacao,
        ic.prazo_dias,
        ic.texto_recomendacao,
        row_number() OVER (
          PARTITION BY coalesce(rc.item_checklist_id::text, rc.pergunta, rc.numero_constatacao)
          ORDER BY coalesce(((to_jsonb(rc)->>'updated_at'))::timestamptz, rc.created_at) DESC, rc.created_at DESC, rc.id DESC
        ) AS rn
      FROM public.respostas_checklist rc
      LEFT JOIN public.itens_checklist ic ON ic.id = rc.item_checklist_id
      WHERE rc.unidade_fiscalizada_id = p_unidade_id
    )
    SELECT * FROM ranked WHERE rn = 1
  LOOP
    IF upper(coalesce(r_resp.resposta, '')) IN ('NAO','NÃO') AND coalesce(r_resp.gera_nc, false) THEN
      contNC := contNC + 1;

      v_nc_descricao := 'Constatação '||coalesce(r_resp.numero_constatacao, 'C?')||': não cumprimento do '||coalesce(r_resp.artigo_portaria, 'artigo aplicável')||';';
      IF v_nc_descricao IS NULL OR btrim(v_nc_descricao) = '' THEN
        v_nc_descricao := 'Não conformidade sem descrição;';
      END IF;

      INSERT INTO public.nao_conformidades (
        unidade_fiscalizada_id, resposta_checklist_id, numero_nc, artigo_portaria, descricao, gravidade
      )
      VALUES (
        p_unidade_id,
        r_resp.id,
        'NC'||contNC,
        coalesce(r_resp.artigo_portaria, ''),
        v_nc_descricao,
        'Média'
      )
      RETURNING id INTO v_nc_id;

      IF r_resp.texto_determinacao IS NOT NULL AND btrim(r_resp.texto_determinacao) <> '' THEN
        contD := contD + 1;
        INSERT INTO public.determinacoes (
          unidade_fiscalizada_id, nao_conformidade_id, numero_determinacao, descricao, prazo_dias, data_limite, status, origem
        )
        VALUES (
          p_unidade_id,
          v_nc_id,
          'D'||contD,
          'Sanar NC'||contNC||'. '||r_resp.texto_determinacao,
          coalesce(r_resp.prazo_dias, 30),
          (now()::date + coalesce(r_resp.prazo_dias, 30)),
          'pendente',
          CASE
            WHEN r_resp.item_checklist_id IS NOT NULL THEN 'checklist:'||r_resp.item_checklist_id::text
            ELSE 'legacy:'||r_resp.id::text
          END
        );
      ELSIF r_resp.texto_recomendacao IS NOT NULL AND btrim(r_resp.texto_recomendacao) <> '' THEN
        contR := contR + 1;
        INSERT INTO public.recomendacoes (unidade_fiscalizada_id, numero_recomendacao, descricao, origem, created_at, updated_at)
        VALUES (p_unidade_id, 'R'||contR, r_resp.texto_recomendacao, 'checklist', now(), now())
        ON CONFLICT (unidade_fiscalizada_id, numero_recomendacao)
        DO UPDATE SET descricao = EXCLUDED.descricao, origem = EXCLUDED.origem, updated_at = now()
        WHERE (
          public.recomendacoes.origem ILIKE 'checklist%'
          OR coalesce(nullif(btrim(public.recomendacoes.origem), ''), 'manual') IN ('checklist', 'manual_constatacao')
        );
      END IF;
    END IF;
  END LOOP;

  FOR r_man IN
    SELECT cm.* FROM public.constatacoes_manuais cm
    WHERE cm.unidade_fiscalizada_id = p_unidade_id
    ORDER BY coalesce(cm.updated_at, cm.created_at) ASC, cm.created_at ASC, cm.id ASC
  LOOP
    IF coalesce(r_man.gera_nc,false) THEN
      contNC := contNC + 1;

      v_nc_descricao := coalesce(
        nullif(btrim(r_man.descricao_nc), ''),
        'Constatação '||coalesce(r_man.numero_constatacao, 'C?')||': não cumprimento do '||coalesce(r_man.artigo_portaria, 'artigo aplicável')||';'
      );
      v_nc_descricao := regexp_replace(
        v_nc_descricao,
        'Constatação\s+C[0-9]+',
        'Constatação '||coalesce(r_man.numero_constatacao, 'C?')
      );
      IF v_nc_descricao IS NULL OR btrim(v_nc_descricao) = '' THEN
        v_nc_descricao := 'Não conformidade sem descrição;';
      END IF;

      INSERT INTO public.nao_conformidades (
        unidade_fiscalizada_id, resposta_checklist_id, numero_nc, artigo_portaria, descricao, gravidade
      )
      VALUES (
        p_unidade_id,
        null,
        'NC'||contNC,
        coalesce(r_man.artigo_portaria, ''),
        v_nc_descricao,
        'Média'
      )
      RETURNING id INTO v_nc_id;

      IF r_man.texto_determinacao IS NOT NULL AND btrim(r_man.texto_determinacao) <> '' THEN
        contD := contD + 1;
        INSERT INTO public.determinacoes (
          unidade_fiscalizada_id, nao_conformidade_id, numero_determinacao, descricao, prazo_dias, data_limite, status, origem
        )
        VALUES (
          p_unidade_id,
          v_nc_id,
          'D'||contD,
          CASE
            WHEN r_man.texto_determinacao ILIKE 'Para sanar%' OR r_man.texto_determinacao ILIKE 'Sanar%' THEN r_man.texto_determinacao
            ELSE 'Sanar NC'||contNC||'. '||r_man.texto_determinacao
          END,
          30,
          (now()::date + 30),
          'pendente',
          'manual_constatacao:'||r_man.id::text
        );
      ELSIF r_man.texto_recomendacao IS NOT NULL AND btrim(r_man.texto_recomendacao) <> '' THEN
        contR := contR + 1;
        INSERT INTO public.recomendacoes (unidade_fiscalizada_id, numero_recomendacao, descricao, origem, created_at, updated_at)
        VALUES (p_unidade_id, 'R'||contR, r_man.texto_recomendacao, 'manual_constatacao', now(), now())
        ON CONFLICT (unidade_fiscalizada_id, numero_recomendacao)
        DO UPDATE SET descricao = EXCLUDED.descricao, origem = EXCLUDED.origem, updated_at = now()
        WHERE (
          public.recomendacoes.origem ILIKE 'checklist%'
          OR coalesce(nullif(btrim(public.recomendacoes.origem), ''), 'manual') IN ('checklist', 'manual_constatacao')
        );
      END IF;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_total_constatacoes
  FROM (
    WITH ranked AS (
      SELECT
        rc.*,
        row_number() OVER (
          PARTITION BY coalesce(rc.item_checklist_id::text, rc.pergunta, rc.numero_constatacao)
          ORDER BY coalesce(((to_jsonb(rc)->>'updated_at'))::timestamptz, rc.created_at) DESC, rc.created_at DESC, rc.id DESC
        ) AS rn
      FROM public.respostas_checklist rc
      WHERE rc.unidade_fiscalizada_id = p_unidade_id
        AND rc.pergunta IS NOT NULL
        AND btrim(rc.pergunta) <> ''
    )
    SELECT * FROM ranked WHERE rn = 1
  ) t
  WHERE upper(coalesce(t.resposta, '')) IN ('SIM','NAO','NÃO');

  v_total_constatacoes := v_total_constatacoes + (
    SELECT count(*) FROM public.constatacoes_manuais cm WHERE cm.unidade_fiscalizada_id = p_unidade_id
  );

  SELECT count(*) INTO v_total_ncs FROM public.nao_conformidades nc WHERE nc.unidade_fiscalizada_id = p_unidade_id;
  SELECT count(*) INTO v_total_dets FROM public.determinacoes d WHERE d.unidade_fiscalizada_id = p_unidade_id;
  SELECT count(*) INTO v_total_recs FROM public.recomendacoes r WHERE r.unidade_fiscalizada_id = p_unidade_id;

  UPDATE public.unidades_fiscalizadas uf
  SET total_constatacoes = v_total_constatacoes,
      total_ncs = v_total_ncs,
      fotos_unidade = coalesce(p_fotos, uf.fotos_unidade),
      status = CASE WHEN p_finalizar THEN 'finalizada' ELSE uf.status END,
      updated_at = now()
  WHERE uf.id = p_unidade_id
  RETURNING uf.status INTO v_status_final;

  RETURN jsonb_build_object(
    'success', true,
    'total_constatacoes', v_total_constatacoes,
    'total_ncs', v_total_ncs,
    'total_determinacoes', v_total_dets,
    'total_recomendacoes', v_total_recs,
    'status_final', v_status_final
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gerar_ncs_unidade(uuid, jsonb, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.gerar_ncs_unidade(uuid, jsonb, boolean) TO authenticated;

-- ====================================================================
-- 3.8. CORREÇÃO DE ÍNDICE ÚNICO PARA SINCRONIZAÇÃO OFFLINE (ON CONFLICT)
-- ====================================================================
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY unidade_fiscalizada_id, item_checklist_id
      ORDER BY coalesce(updated_at, created_at) DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.respostas_checklist
  WHERE item_checklist_id IS NOT NULL
)
DELETE FROM public.respostas_checklist rc
USING ranked r
WHERE rc.id = r.id
  AND r.rn > 1;

DROP INDEX IF EXISTS public.ux_respostas_checklist_unidade_item;
CREATE UNIQUE INDEX IF NOT EXISTS ux_respostas_checklist_unidade_item
  ON public.respostas_checklist (unidade_fiscalizada_id, item_checklist_id);


-- ====================================================================
-- 4. RECARREGAR O CACHE DO POSTGREST
-- ====================================================================

NOTIFY pgrst, 'reload schema';

COMMIT;
