-- Migração 111: Limpeza de gatilhos (triggers) indesejados nas tabelas para evitar finalizações em cascata automáticas e comportamentos incorretos
BEGIN;

DO $$
DECLARE
  r RECORD;
  v_allowed_triggers TEXT[];
BEGIN
  -- 1. Unidades Fiscalizadas
  v_allowed_triggers := ARRAY['update_unidades_updated_at', 'trg_audit_unidades', 'trg_propagate_unidades'];
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'unidades_fiscalizadas'
      AND t.tgisinternal = false
      AND NOT (t.tgname = ANY(v_allowed_triggers))
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.unidades_fiscalizadas;';
    RAISE NOTICE 'Trigger removido da tabela unidades_fiscalizadas: %', r.tgname;
  END LOOP;

  -- 2. Fiscalizações
  v_allowed_triggers := ARRAY['update_fiscalizacoes_updated_at', 'trg_audit_fiscalizacoes', 'trg_set_fiscalizacao_last_modified', 'trg_set_fiscalizacao_cache_fields'];
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'fiscalizacoes'
      AND t.tgisinternal = false
      AND NOT (t.tgname = ANY(v_allowed_triggers))
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.fiscalizacoes;';
    RAISE NOTICE 'Trigger removido da tabela fiscalizacoes: %', r.tgname;
  END LOOP;

  -- 3. Respostas Checklist
  v_allowed_triggers := ARRAY['trg_audit_respostas', 'trg_propagate_respostas'];
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'respostas_checklist'
      AND t.tgisinternal = false
      AND NOT (t.tgname = ANY(v_allowed_triggers))
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.respostas_checklist;';
    RAISE NOTICE 'Trigger removido da tabela respostas_checklist: %', r.tgname;
  END LOOP;

  -- 4. Constatações Manuais
  v_allowed_triggers := ARRAY['trg_audit_constatacoes', 'trg_propagate_constatacoes'];
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'constatacoes_manuais'
      AND t.tgisinternal = false
      AND NOT (t.tgname = ANY(v_allowed_triggers))
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.constatacoes_manuais;';
    RAISE NOTICE 'Trigger removido da tabela constatacoes_manuais: %', r.tgname;
  END LOOP;

  -- 5. Recomendações
  v_allowed_triggers := ARRAY['trg_audit_recomendacoes', 'trg_propagate_recomendacoes'];
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'recomendacoes'
      AND t.tgisinternal = false
      AND NOT (t.tgname = ANY(v_allowed_triggers))
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.recomendacoes;';
    RAISE NOTICE 'Trigger removido da tabela recomendacoes: %', r.tgname;
  END LOOP;

  -- 6. Determinações
  v_allowed_triggers := ARRAY['trg_audit_determinacoes', 'trg_propagate_determinacoes', 'update_determinacoes_updated_at'];
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relname = 'determinacoes'
      AND t.tgisinternal = false
      AND NOT (t.tgname = ANY(v_allowed_triggers))
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON public.determinacoes;';
    RAISE NOTICE 'Trigger removido da tabela determinacoes: %', r.tgname;
  END LOOP;

END $$;

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
