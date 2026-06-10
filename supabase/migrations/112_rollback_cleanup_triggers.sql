-- Migração 112: Reverter a limpeza de triggers e restaurar todos os triggers oficiais
BEGIN;

-- 1. Unidades Fiscalizadas
DROP TRIGGER IF EXISTS update_unidades_updated_at ON public.unidades_fiscalizadas;
CREATE TRIGGER update_unidades_updated_at BEFORE UPDATE ON public.unidades_fiscalizadas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audit_unidades ON public.unidades_fiscalizadas;
CREATE TRIGGER trg_audit_unidades AFTER INSERT OR UPDATE OR DELETE ON public.unidades_fiscalizadas FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_propagate_unidades ON public.unidades_fiscalizadas;
CREATE TRIGGER trg_propagate_unidades AFTER INSERT OR UPDATE OR DELETE ON public.unidades_fiscalizadas FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();


-- 2. Fiscalizações
DROP TRIGGER IF EXISTS update_fiscalizacoes_updated_at ON public.fiscalizacoes;
CREATE TRIGGER update_fiscalizacoes_updated_at BEFORE UPDATE ON public.fiscalizacoes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS trg_audit_fiscalizacoes ON public.fiscalizacoes;
CREATE TRIGGER trg_audit_fiscalizacoes AFTER INSERT OR UPDATE OR DELETE ON public.fiscalizacoes FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_set_fiscalizacao_last_modified ON public.fiscalizacoes;
CREATE TRIGGER trg_set_fiscalizacao_last_modified BEFORE INSERT OR UPDATE ON public.fiscalizacoes FOR EACH ROW EXECUTE FUNCTION public.set_fiscalizacao_last_modified();

DROP TRIGGER IF EXISTS trg_set_fiscalizacao_cache_fields ON public.fiscalizacoes;
CREATE TRIGGER trg_set_fiscalizacao_cache_fields BEFORE INSERT OR UPDATE ON public.fiscalizacoes FOR EACH ROW EXECUTE FUNCTION public.set_fiscalizacao_cache_fields();


-- 3. Respostas Checklist
DROP TRIGGER IF EXISTS trg_audit_respostas ON public.respostas_checklist;
CREATE TRIGGER trg_audit_respostas AFTER INSERT OR UPDATE OR DELETE ON public.respostas_checklist FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_propagate_respostas ON public.respostas_checklist;
CREATE TRIGGER trg_propagate_respostas AFTER INSERT OR UPDATE OR DELETE ON public.respostas_checklist FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();


-- 4. Constatações Manuais
DROP TRIGGER IF EXISTS trg_audit_constatacoes ON public.constatacoes_manuais;
CREATE TRIGGER trg_audit_constatacoes AFTER INSERT OR UPDATE OR DELETE ON public.constatacoes_manuais FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_propagate_constatacoes ON public.constatacoes_manuais;
CREATE TRIGGER trg_propagate_constatacoes AFTER INSERT OR UPDATE OR DELETE ON public.constatacoes_manuais FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();


-- 5. Recomendações
DROP TRIGGER IF EXISTS trg_audit_recomendacoes ON public.recomendacoes;
CREATE TRIGGER trg_audit_recomendacoes AFTER INSERT OR UPDATE OR DELETE ON public.recomendacoes FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_propagate_recomendacoes ON public.recomendacoes;
CREATE TRIGGER trg_propagate_recomendacoes AFTER INSERT OR UPDATE OR DELETE ON public.recomendacoes FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();


-- 6. Determinações
DROP TRIGGER IF EXISTS trg_audit_determinacoes ON public.determinacoes;
CREATE TRIGGER trg_audit_determinacoes AFTER INSERT OR UPDATE OR DELETE ON public.determinacoes FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

DROP TRIGGER IF EXISTS trg_propagate_determinacoes ON public.determinacoes;
CREATE TRIGGER trg_propagate_determinacoes AFTER INSERT OR UPDATE OR DELETE ON public.determinacoes FOR EACH ROW EXECUTE FUNCTION public.propagate_modification_to_parent();

DROP TRIGGER IF EXISTS update_determinacoes_updated_at ON public.determinacoes;
CREATE TRIGGER update_determinacoes_updated_at BEFORE UPDATE ON public.determinacoes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
