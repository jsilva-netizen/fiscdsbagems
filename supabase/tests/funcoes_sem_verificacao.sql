-- Teste da migration 141 (.specify/bugs/funcoes-sem-verificacao).
--
-- Carrega o estado de produção das funções (executáveis por todos, fila da CATESA ausente),
-- aplica as migrations 137, 138 e 141 e verifica anônimo, conta não aprovada, prestador, fiscais e
-- a chave de serviço. Tudo numa transação que termina em ROLLBACK.
--
-- Rodar: bash supabase/tests/rodar.sh funcoes_sem_verificacao.sql

\set ON_ERROR_STOP 1

BEGIN;

SET LOCAL client_min_messages = warning;
\ir fixtures/estado_producao_20260928.sql
\ir fixtures/funcoes_producao_20260928.sql
\ir ../migrations/137_fix_signup_privilege_escalation.sql
\ir ../migrations/138_fix_open_policies.sql
\ir ../migrations/141_fix_funcoes_sem_verificacao.sql
SET LOCAL client_min_messages = notice;

CREATE FUNCTION pg_temp.entrar(uid uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
CREATE FUNCTION pg_temp.servico() RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', '{"role": "service_role"}', true);
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
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, anon, service_role;

-- Cenário: f401 fiscalização finalizada da CATESA · f402 finalizada da CATERS · j401 relatório na fila
-- c001 fiscal da CATESA · c002 fiscal do CATERS · c003 prestador · b001 não aprovado
SELECT pg_temp.sair();
INSERT INTO public.prestadores_servico (id, nome, ativo, tipo_entidade, status)
VALUES ('00000000-0000-4000-8000-00000000d001', 'Prestador de teste', true, 'Concessionária', 'ativa');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c001', '{"role": "fiscal", "camara_tecnica_id": "catesa"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c002', '{"role": "fiscal", "camara_tecnica_id": "caters"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c003',
  '{"role": "prestador", "prestador_servico_id": "00000000-0000-4000-8000-00000000d001"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000b001', '{"role": "fiscal", "camara_tecnica_id": "catesa"}');
UPDATE public.profiles SET ativo = true WHERE id IN
  ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000c002', '00000000-0000-4000-8000-00000000c003');
INSERT INTO public.fiscalizacoes (id, camara_tecnica_id, status, data_fim) VALUES
  ('00000000-0000-4000-8000-00000000f401', 'catesa', 'finalizada', now()),
  ('00000000-0000-4000-8000-00000000f402', 'caters', 'finalizada', now());
INSERT INTO public.relatorios_jobs (id, fiscalizacao_id, status)
VALUES ('00000000-0000-4000-8000-00000000e401', '00000000-0000-4000-8000-00000000f401', 'queued');

-- 1. Anônimo -------------------------------------------------------------------------------------
SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.reabrir_fiscalizacao('00000000-0000-4000-8000-00000000f401')$q$) = '42501',
    'anônimo: não reabre fiscalização');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT * FROM public.claim_relatorios_jobs(10, NULL, 5)$q$) = '42501',
    'anônimo: não toma a fila de relatórios');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT * FROM public.claim_caters_ai_jobs(10, NULL, 5)$q$) = '42501',
    'anônimo: não toma a fila de IA do CATERS');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.kick_relatorios_worker(NULL, 1)$q$) = '42501',
    'anônimo: não dispara o worker de relatórios');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.obter_resumo_indicadores(ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::text[])$q$) = '42501',
    'anônimo: não lê indicadores');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT * FROM public.claim_catesa_ai_jobs(10, NULL, 5)$q$) = '42501',
    'anônimo: não toma a fila de IA da CATESA');
END $$;
RESET ROLE;

-- 2. Conta não aprovada e prestador --------------------------------------------------------------
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000b001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.reabrir_fiscalizacao('00000000-0000-4000-8000-00000000f401')$q$) = '42501',
    'não aprovada: não reabre fiscalização');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.obter_resumo_indicadores(ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::text[])$q$) = '42501',
    'não aprovada: não lê indicadores');
END $$;
RESET ROLE;

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c003');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.reabrir_fiscalizacao('00000000-0000-4000-8000-00000000f401')$q$) = '42501',
    'prestador: não reabre fiscalização');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.obter_resumo_indicadores(ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::uuid[], ARRAY[]::uuid[], true)$q$) = '42501',
    'prestador: não lê indicadores (versão antiga)');
END $$;
RESET ROLE;

-- 3. Fiscais -------------------------------------------------------------------------------------
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.reabrir_fiscalizacao('00000000-0000-4000-8000-00000000f401')$q$) = '42501',
    'fiscal do CATERS: não reabre fiscalização da CATESA');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT * FROM public.claim_relatorios_jobs(10, NULL, 5)$q$) = '42501',
    'fiscal: não toma a fila de relatórios');
END $$;
RESET ROLE;

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c001');
SET LOCAL ROLE authenticated;
DO $$
DECLARE r jsonb;
BEGIN
  r := public.obter_resumo_indicadores(ARRAY[]::text[], ARRAY[]::text[], ARRAY[]::uuid[], ARRAY[]::uuid[], ARRAY[]::text[]);
  PERFORM pg_temp.ok(r IS NOT NULL, 'fiscal ativo: lê indicadores');
  PERFORM pg_temp.ok(pg_temp.erro($q$SELECT public.reabrir_fiscalizacao('00000000-0000-4000-8000-00000000f401')$q$) = '',
    'fiscal da CATESA: reabre fiscalização da própria câmara');
END $$;
RESET ROLE;
SELECT pg_temp.sair();
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT status = 'em_andamento' AND data_fim IS NULL FROM public.fiscalizacoes
                      WHERE id = '00000000-0000-4000-8000-00000000f401'), 'reabertura aplicada');
  PERFORM pg_temp.ok(NOT EXISTS (SELECT 1 FROM public.relatorios_jobs WHERE id = '00000000-0000-4000-8000-00000000e401'),
    'reabertura apaga os relatórios da fiscalização');
END $$;

-- 4. Chave de serviço (edge functions) -----------------------------------------------------------
INSERT INTO public.relatorios_jobs (id, fiscalizacao_id, status)
VALUES ('00000000-0000-4000-8000-00000000e402', '00000000-0000-4000-8000-00000000f402', 'queued');
SELECT pg_temp.servico();
SET LOCAL ROLE service_role;
DO $$
DECLARE n int; r jsonb;
BEGIN
  SELECT count(*) INTO n FROM public.claim_relatorios_jobs(10, '00000000-0000-4000-8000-00000000e402', 5);
  PERFORM pg_temp.ok(n = 1, 'chave de serviço: toma o trabalho de relatório');
  r := public.finalizar_fiscalizacao('00000000-0000-4000-8000-00000000f402');
  PERFORM pg_temp.ok((r ->> 'success')::boolean IS TRUE,
    'chave de serviço: finaliza a fiscalização (pedido de relatório regenera NCs e totais)');
  INSERT INTO public.termos_notificacao (id, fiscalizacao_id) VALUES
    ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-00000000f401');
  INSERT INTO public.catesa_ai_jobs (id, termo_id) VALUES
    ('00000000-0000-4000-8000-00000000e403', '00000000-0000-4000-8000-0000000000b4');
  SELECT count(*) INTO n FROM public.claim_catesa_ai_jobs(10, '00000000-0000-4000-8000-00000000e403', 5);
  PERFORM pg_temp.ok(n = 1, 'chave de serviço: fila de IA da CATESA existe e é reivindicada');
END $$;
RESET ROLE;

-- 5. Fila da CATESA para a equipe ----------------------------------------------------------------
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.catesa_ai_jobs WHERE id = '00000000-0000-4000-8000-00000000e403') = 1,
    'fiscal da CATESA: lê a fila de IA da CATESA');
END $$;
RESET ROLE;
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.catesa_ai_jobs) = 0,
    'fiscal do CATERS: não lê a fila de IA da CATESA');
END $$;
RESET ROLE;

\echo 'funcoes_sem_verificacao: todos os testes passaram'
ROLLBACK;
