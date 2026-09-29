-- Teste da migration 140 (.specify/bugs/view-caters-sem-login).
--
-- Recria a view caters_fiscalizacoes_disponiveis como está em produção (dono postgres, sem
-- security_invoker, todos os privilégios para anon e authenticated), aplica as migrations 137, 138
-- e 140 e verifica quem lê. Tudo numa transação que termina em ROLLBACK.
--
-- Rodar: bash supabase/tests/rodar.sh view_caters_sem_login.sql

\set ON_ERROR_STOP 1

BEGIN;

SET LOCAL client_min_messages = warning;
\ir fixtures/estado_producao_20260928.sql

-- Estado de produção da view (inventário de 2026-09-28).
CREATE OR REPLACE VIEW public.caters_fiscalizacoes_disponiveis AS
 SELECT id, municipio_nome, prestador_servico_nome, servicos, status, data_inicio, data_fim,
        numero_termo, camara_tecnica_id
   FROM fiscalizacoes f
  WHERE ((camara_tecnica_id = 'caters'::text) AND (status = 'finalizada'::text));
ALTER VIEW public.caters_fiscalizacoes_disponiveis OWNER TO postgres;
ALTER VIEW public.caters_fiscalizacoes_disponiveis RESET (security_invoker);
GRANT ALL ON public.caters_fiscalizacoes_disponiveis TO anon, authenticated;

\ir ../migrations/137_fix_signup_privilege_escalation.sql
\ir ../migrations/138_fix_open_policies.sql
\ir ../migrations/140_fix_view_caters_security_invoker.sql
SET LOCAL client_min_messages = notice;

CREATE FUNCTION pg_temp.entrar(uid uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
CREATE FUNCTION pg_temp.sair() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '', true);
$$;
CREATE FUNCTION pg_temp.ok(cond boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN
    RAISE EXCEPTION 'FALHOU: %', msg;
  END IF;
  RAISE NOTICE 'ok: %', msg;
END $$;
CREATE FUNCTION pg_temp.erro(cmd text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE cmd;
  RETURN '';
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END $$;
CREATE FUNCTION pg_temp.cadastrar(uid uuid, meta jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES (uid, uid::text || '@teste.invalid', meta);
$$;
-- Quantas linhas de teste (ids ...f3xx) o usuário atual vê na view.
CREATE FUNCTION pg_temp.visiveis() RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) FROM public.caters_fiscalizacoes_disponiveis WHERE id::text LIKE '00000000-0000-4000-8000-00000000f3%';
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, anon;

-- Cenário: f301 CATERS finalizada · f302 CATERS em andamento · f303 CRES finalizada
-- a001 admin · b001 não aprovado · c001 fiscal da CATERS · c002 fiscal da CRES
SELECT pg_temp.sair();
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000a001', '{"role": "fiscal"}');
UPDATE public.profiles SET role = 'admin', ativo = true WHERE id = '00000000-0000-4000-8000-00000000a001';
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000b001', '{"role": "fiscal", "camara_tecnica_id": "caters"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c001', '{"role": "fiscal", "camara_tecnica_id": "caters"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c002', '{"role": "fiscal", "camara_tecnica_id": "cres"}');
UPDATE public.profiles SET ativo = true
WHERE id IN ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000c002');

INSERT INTO public.fiscalizacoes (id, camara_tecnica_id, status) VALUES
  ('00000000-0000-4000-8000-00000000f301', 'caters', 'finalizada'),
  ('00000000-0000-4000-8000-00000000f302', 'caters', 'em_andamento'),
  ('00000000-0000-4000-8000-00000000f303', 'cres', 'finalizada');

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.erro('SELECT * FROM public.caters_fiscalizacoes_disponiveis') = '42501',
    'anônimo: não lê a view');
END $$;
RESET ROLE;

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000b001');
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM pg_temp.ok(pg_temp.visiveis() = 0, 'conta não aprovada: não vê fiscalizações'); END $$;
RESET ROLE;

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM pg_temp.ok(pg_temp.visiveis() = 0, 'fiscal de outra câmara: não vê as do CATERS'); END $$;
RESET ROLE;

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.visiveis() = 1, 'fiscal da CATERS: vê só a finalizada da CATERS');
  PERFORM pg_temp.ok(pg_temp.erro($q$DELETE FROM public.caters_fiscalizacoes_disponiveis$q$) = '42501',
    'fiscal da CATERS: não escreve pela view');
END $$;
RESET ROLE;

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000a001');
SET LOCAL ROLE authenticated;
DO $$ BEGIN PERFORM pg_temp.ok(pg_temp.visiveis() = 1, 'admin: vê a finalizada da CATERS'); END $$;
RESET ROLE;

\echo 'view_caters_sem_login: todos os testes passaram'
ROLLBACK;
