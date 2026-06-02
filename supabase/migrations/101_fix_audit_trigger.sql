-- Migração 101: Correção crítica da função de auditoria
-- Problema: process_audit_log() acessa NEW.requested_by diretamente, o que causa
-- erro 42703 "record new has no field requested_by" em tabelas que não possuem
-- esse campo (unidades_fiscalizadas, respostas_checklist, etc.).
-- Correção: usar to_jsonb(NEW)->>'requested_by' que retorna NULL sem erro.

BEGIN;

CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_requested_by text;
BEGIN
  -- Identifica o ID do usuário executor
  v_user_id := auth.uid();

  -- Se for uma Edge Function via service role executando relatorios_jobs,
  -- usa to_jsonb() para acessar o campo de forma segura (sem quebrar em outras tabelas)
  IF v_user_id IS NULL AND TG_TABLE_NAME = 'relatorios_jobs' THEN
    v_requested_by := to_jsonb(NEW)->>'requested_by';
    IF v_requested_by IS NOT NULL THEN
      v_user_id := v_requested_by::uuid;
    END IF;
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

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
