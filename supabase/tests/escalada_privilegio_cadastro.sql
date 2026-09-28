-- Teste da migration 137 (.specify/bugs/escalada-privilegio-cadastro).
--
-- Carrega o estado de produção dos objetos envolvidos, aplica a migration e simula cadastros e
-- requisições de admin, usuários inativos, usuário aprovado e anônimo. Tudo dentro de uma
-- transação que termina em ROLLBACK: o banco local não é alterado.
--
-- Rodar: bash supabase/tests/rodar.sh escalada_privilegio_cadastro.sql
-- Falha = psql sai com erro e a mensagem "FALHOU: ...".

\set ON_ERROR_STOP 1
SET client_min_messages = notice;

BEGIN;

\ir fixtures/estado_producao_20260928.sql
\ir ../migrations/137_fix_signup_privilege_escalation.sql

-- Auxiliares -------------------------------------------------------------------------------------

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

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, anon;

-- Cadastro simulado: o que o signUp grava em auth.users (dispara handle_new_user).
CREATE FUNCTION pg_temp.cadastrar(uid uuid, meta jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (uid, uid::text || '@teste.invalid', meta);
$$;

-- Cenário ----------------------------------------------------------------------------------------
-- a001 admin ativo · b001 cadastro pedindo admin · b002 coordenador CATERS não aprovado
-- c001 fiscal (aprovado no meio do teste) · c002 prestador · c003 fiscal mandando prestador
-- c004 diretor · f001 fiscalização da câmara do fiscal

SELECT pg_temp.sair();

SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000a001', '{"full_name": "Admin", "role": "fiscal"}');
UPDATE public.profiles SET role = 'admin', ativo = true WHERE id = '00000000-0000-4000-8000-00000000a001';

SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000b001',
  '{"full_name": "Atacante", "role": "admin", "diretoria_id": "dsb"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000b002',
  '{"full_name": "Coord", "role": "coordenador", "diretoria_id": "dsb", "camara_tecnica_id": "caters"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c001',
  '{"full_name": "Fiscal", "role": "fiscal", "diretoria_id": "dsb", "camara_tecnica_id": "cres"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c004',
  '{"full_name": "Diretor", "role": "diretor", "diretoria_id": "dtr"}');

INSERT INTO public.fiscalizacoes (id, camara_tecnica_id)
VALUES ('00000000-0000-4000-8000-00000000f001', 'cres');

-- 1. Cadastro ------------------------------------------------------------------------------------

DO $$
DECLARE p public.profiles;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000b001';
  PERFORM pg_temp.ok(p.role = 'fiscal', 'cadastro pedindo admin vira fiscal');
  PERFORM pg_temp.ok(p.ativo IS FALSE, 'cadastro pedindo admin nasce inativo');

  SELECT * INTO p FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000b002';
  PERFORM pg_temp.ok(p.role = 'coordenador' AND p.camara_tecnica_id = 'caters' AND p.ativo IS FALSE,
    'coordenador escolhido na tela é mantido, inativo, com a câmara escolhida');

  SELECT * INTO p FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000c001';
  PERFORM pg_temp.ok(p.role = 'fiscal' AND p.diretoria_id = 'dsb' AND p.camara_tecnica_id = 'cres'
    AND p.ativo IS FALSE AND p.prestador_servico_id IS NULL,
    'fiscal escolhido na tela é mantido, inativo, com diretoria e câmara escolhidas');

  SELECT * INTO p FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000c004';
  PERFORM pg_temp.ok(p.role = 'diretor' AND p.diretoria_id = 'dtr' AND p.ativo IS FALSE,
    'diretor escolhido na tela é mantido, inativo');
END $$;

DO $$
DECLARE v_prestador uuid;
BEGIN
  SELECT id INTO v_prestador FROM public.prestadores_servico ORDER BY id LIMIT 1;
  IF v_prestador IS NULL THEN
    RAISE NOTICE 'pulado: sem prestador no banco local para o cadastro de prestador';
    RETURN;
  END IF;
  PERFORM pg_temp.cadastrar('00000000-0000-4000-8000-00000000c002',
    jsonb_build_object('full_name', 'Prestador', 'role', 'prestador', 'diretoria_id', 'dsb',
                       'prestador_servico_id', v_prestador));
  PERFORM pg_temp.ok((SELECT role = 'prestador' AND prestador_servico_id = v_prestador AND ativo IS FALSE
                      FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000c002'),
    'prestador escolhido na tela é mantido, inativo, com o prestador escolhido');
  PERFORM pg_temp.cadastrar('00000000-0000-4000-8000-00000000c003',
    jsonb_build_object('full_name', 'Fiscal2', 'role', 'fiscal', 'prestador_servico_id', v_prestador));
  PERFORM pg_temp.ok((SELECT prestador_servico_id IS NULL
                      FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000c003'),
    'vínculo com prestador é ignorado para quem não é prestador');
END $$;

-- 2. Inativo não tem permissão -------------------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000b001');
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.ok(public.get_my_role() IS NULL, 'inativo: get_my_role() é nulo');
  PERFORM pg_temp.ok(public."current_role"() = '', 'inativo: current_role() é vazio');
  PERFORM pg_temp.ok(public.is_staff() IS FALSE, 'inativo: is_staff() é falso');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.fiscalizacoes) = 0, 'inativo: não vê fiscalizações');

  UPDATE public.profiles SET ativo = true, role = 'admin' WHERE id = auth.uid();
  UPDATE public.profiles SET ativo = true WHERE id = '00000000-0000-4000-8000-00000000c001';
  DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000a001';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.ok(n = 0, 'inativo: não exclui perfil de outro');
END $$;
RESET ROLE;

SELECT pg_temp.sair();
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT ativo IS FALSE AND role = 'fiscal' FROM public.profiles
                      WHERE id = '00000000-0000-4000-8000-00000000b001'),
    'inativo: não se autoaprova nem troca o próprio papel');
  PERFORM pg_temp.ok((SELECT ativo IS FALSE FROM public.profiles
                      WHERE id = '00000000-0000-4000-8000-00000000c001'),
    'inativo: não aprova outro usuário');
END $$;

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000b002');
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.ok(public.is_caters_user() IS NOT TRUE, 'coordenador CATERS não aprovado: is_caters_user() não é verdadeiro');
  PERFORM pg_temp.ok(public.get_my_camara_tecnica() IS NULL, 'coordenador não aprovado: sem câmara');
  DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000a001';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.ok(n = 0, 'coordenador não aprovado: não exclui perfis');
  UPDATE public.profiles SET full_name = 'x' WHERE id = '00000000-0000-4000-8000-00000000c001';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.ok(n = 0, 'coordenador não aprovado: não edita perfil de outro');
END $$;
RESET ROLE;

-- 3. Anônimo -------------------------------------------------------------------------------------

SELECT pg_temp.sair();
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.profiles) = 0, 'anônimo: não lê perfis');
  BEGIN
    INSERT INTO public.profiles (id, email, role) VALUES (gen_random_uuid(), 'x@teste.invalid', 'admin');
    PERFORM pg_temp.ok(false, 'anônimo: não insere perfil');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM pg_temp.ok(true, 'anônimo: não insere perfil');
  END;
END $$;
RESET ROLE;

-- 4. Aprovação e uso normal ----------------------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000a001');
SET LOCAL ROLE authenticated;
DO $$
DECLARE n int;
BEGIN
  PERFORM pg_temp.ok(public.get_my_role() = 'admin', 'admin ativo: get_my_role() = admin');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.profiles
                      WHERE id::text LIKE '00000000-0000-4000-8000-%') >= 5, 'admin ativo: lista os perfis');
  UPDATE public.profiles SET ativo = true WHERE id = '00000000-0000-4000-8000-00000000c001';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.ok(n = 1, 'admin ativo: aprova o fiscal');
  UPDATE public.profiles SET role = 'coordenador' WHERE id = '00000000-0000-4000-8000-00000000c004';
  PERFORM pg_temp.ok((SELECT role = 'coordenador' FROM public.profiles
                      WHERE id = '00000000-0000-4000-8000-00000000c004'), 'admin ativo: altera papel');
  DELETE FROM public.profiles WHERE id = '00000000-0000-4000-8000-00000000b001';
  GET DIAGNOSTICS n = ROW_COUNT;
  PERFORM pg_temp.ok(n = 1, 'admin ativo: exclui perfil');
END $$;
RESET ROLE;

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(public.get_my_role() = 'fiscal', 'fiscal aprovado: get_my_role() = fiscal');
  PERFORM pg_temp.ok(public.is_staff() IS TRUE, 'fiscal aprovado: is_staff() é verdadeiro');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.fiscalizacoes
                      WHERE id = '00000000-0000-4000-8000-00000000f001') = 1,
    'fiscal aprovado: vê a fiscalização da sua câmara');
  PERFORM pg_temp.ok((SELECT ativo FROM public.profiles WHERE id = auth.uid()) IS TRUE,
    'fiscal aprovado: lê o próprio perfil');
END $$;
RESET ROLE;

\echo 'escalada_privilegio_cadastro: todos os testes passaram'
ROLLBACK;
