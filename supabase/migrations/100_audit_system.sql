-- Migração 100: Sistema de Auditoria e Histórico de Modificação
BEGIN;

-- 1. Adicionar colunas de última modificação na tabela fiscalizacoes
ALTER TABLE public.fiscalizacoes 
  ADD COLUMN IF NOT EXISTS last_modified_by TEXT,
  ADD COLUMN IF NOT EXISTS last_modified_at TIMESTAMPTZ;

-- 2. Criar a tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Criar índices para a tabela audit_logs para otimização de consultas
CREATE INDEX IF NOT EXISTS audit_logs_table_name_record_id_idx ON public.audit_logs (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);

-- 4. Habilitar RLS na tabela de logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Remover políticas antigas de audit_logs se houverem
DROP POLICY IF EXISTS "Fiscais, Coordenadores e Admins leem logs de auditoria" ON public.audit_logs;

-- 6. Criar política de leitura de logs para fiscais, coordenadores e admins
CREATE POLICY "Fiscais, Coordenadores e Admins leem logs de auditoria" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.get_my_role() IN ('admin', 'coordenador', 'fiscal'));

-- 7. Função de trigger para registrar alterações (Auditoria)
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  -- Identifica o ID do usuário executor
  v_user_id := auth.uid();
  
  -- Se for uma Edge Function via service role executando relatorios_jobs
  IF v_user_id IS NULL AND TG_TABLE_NAME = 'relatorios_jobs' AND NEW.requested_by IS NOT NULL THEN
    v_user_id := NEW.requested_by;
  END IF;
  
  -- Resolve o e-mail a partir do perfil
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE id = v_user_id;
    IF v_email IS NULL THEN
      v_email := COALESCE(
        auth.jwt() ->> 'email',
        (SELECT email FROM auth.users WHERE id = v_user_id)
      );
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    user_email,
    old_data,
    new_data
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_user_id,
    v_email,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Função de trigger para gravar dados de modificação em fiscalizacoes
CREATE OR REPLACE FUNCTION public.set_fiscalizacao_last_modified()
RETURNS TRIGGER AS $$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
    IF v_email IS NULL THEN
      v_email := auth.jwt() ->> 'email';
    END IF;
    IF v_email IS NOT NULL THEN
      NEW.last_modified_by := v_email;
    END IF;
  ELSIF NEW.last_modified_by IS NULL THEN
    NEW.last_modified_by := 'sistema';
  END IF;
  
  NEW.last_modified_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Função para propagar alterações das tabelas filhas para a tabela pai (fiscalizacoes)
CREATE OR REPLACE FUNCTION public.propagate_modification_to_parent()
RETURNS TRIGGER AS $$
DECLARE
  v_fiscalizacao_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'unidades_fiscalizadas' THEN
    v_fiscalizacao_id := COALESCE(NEW.fiscalizacao_id, OLD.fiscalizacao_id);
  ELSIF TG_TABLE_NAME IN ('respostas_checklist', 'constatacoes_manuais', 'recomendacoes', 'determinacoes') THEN
    SELECT fiscalizacao_id INTO v_fiscalizacao_id
    FROM public.unidades_fiscalizadas
    WHERE id = COALESCE(NEW.unidade_fiscalizada_id, OLD.unidade_fiscalizada_id);
  END IF;

  IF v_fiscalizacao_id IS NOT NULL THEN
    UPDATE public.fiscalizacoes
    SET updated_at = now()
    WHERE id = v_fiscalizacao_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Vincular Triggers de Auditoria
DROP TRIGGER IF EXISTS trg_audit_fiscalizacoes ON public.fiscalizacoes;
CREATE TRIGGER trg_audit_fiscalizacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.fiscalizacoes
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_unidades ON public.unidades_fiscalizadas;
CREATE TRIGGER trg_audit_unidades
  AFTER INSERT OR UPDATE OR DELETE ON public.unidades_fiscalizadas
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_respostas ON public.respostas_checklist;
CREATE TRIGGER trg_audit_respostas
  AFTER INSERT OR UPDATE OR DELETE ON public.respostas_checklist
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_constatacoes ON public.constatacoes_manuais;
CREATE TRIGGER trg_audit_constatacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.constatacoes_manuais
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_recomendacoes ON public.recomendacoes;
CREATE TRIGGER trg_audit_recomendacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.recomendacoes
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_determinacoes ON public.determinacoes;
CREATE TRIGGER trg_audit_determinacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.determinacoes
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_audit_relatorios_jobs ON public.relatorios_jobs;
CREATE TRIGGER trg_audit_relatorios_jobs
  AFTER INSERT OR DELETE ON public.relatorios_jobs
  FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 11. Vincular Trigger de data/hora e usuário de modificação na tabela pai
DROP TRIGGER IF EXISTS trg_set_fiscalizacao_last_modified ON public.fiscalizacoes;
CREATE TRIGGER trg_set_fiscalizacao_last_modified
  BEFORE INSERT OR UPDATE ON public.fiscalizacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_fiscalizacao_last_modified();

-- 12. Vincular Triggers de propagação de alteração para as tabelas filhas
DROP TRIGGER IF EXISTS trg_propagate_unidades ON public.unidades_fiscalizadas;
CREATE TRIGGER trg_propagate_unidades
  AFTER INSERT OR UPDATE OR DELETE ON public.unidades_fiscalizadas
  FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();

DROP TRIGGER IF EXISTS trg_propagate_respostas ON public.respostas_checklist;
CREATE TRIGGER trg_propagate_respostas
  AFTER INSERT OR UPDATE OR DELETE ON public.respostas_checklist
  FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();

DROP TRIGGER IF EXISTS trg_propagate_constatacoes ON public.constatacoes_manuais;
CREATE TRIGGER trg_propagate_constatacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.constatacoes_manuais
  FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();

DROP TRIGGER IF EXISTS trg_propagate_recomendacoes ON public.recomendacoes;
CREATE TRIGGER trg_propagate_recomendacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.recomendacoes
  FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();

DROP TRIGGER IF EXISTS trg_propagate_determinacoes ON public.determinacoes;
CREATE TRIGGER trg_propagate_determinacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.determinacoes
  FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();

-- 13. Adicionar controle de segurança por role no RPC reabrir_fiscalizacao
CREATE OR REPLACE FUNCTION public.reabrir_fiscalizacao(p_fiscalizacao_id uuid)
RETURNS void AS $$
BEGIN
  -- Segurança: Apenas admins, coordenadores e fiscais podem reabrir
  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'coordenador', 'fiscal') THEN
    RAISE EXCEPTION 'Acesso negado: privilégios insuficientes para reabrir fiscalização.';
  END IF;

  -- 1. Reabrir a fiscalização
  UPDATE public.fiscalizacoes
  SET status = 'em_andamento',
      data_fim = NULL,
      updated_at = now()
  WHERE id = p_fiscalizacao_id;

  -- 2. Remover jobs de relatório anteriores para forçar nova geração
  DELETE FROM public.relatorios_jobs
  WHERE fiscalizacao_id = p_fiscalizacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13.5. Buscar e preencher automaticamente campos de cache na tabela fiscalizacoes
CREATE OR REPLACE FUNCTION public.set_fiscalizacao_cache_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.municipio_id IS NOT NULL THEN
    SELECT nome INTO NEW.municipio_nome FROM public.municipios WHERE id = NEW.municipio_id;
  END IF;
  
  IF NEW.prestador_servico_id IS NOT NULL THEN
    SELECT nome INTO NEW.prestador_servico_nome FROM public.prestadores_servico WHERE id = NEW.prestador_servico_id;
  END IF;

  IF NEW.fiscal_nome IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT full_name INTO NEW.fiscal_nome FROM public.profiles WHERE id = auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_fiscalizacao_cache_fields ON public.fiscalizacoes;
CREATE TRIGGER trg_set_fiscalizacao_cache_fields
  BEFORE INSERT OR UPDATE ON public.fiscalizacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_fiscalizacao_cache_fields();

-- 14. Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
