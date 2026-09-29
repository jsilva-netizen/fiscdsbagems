-- Teste da migration 139 (.specify/bugs/prazos-calculados-pelo-prestador).
--
-- Carrega o estado de produção (funções, perfis, políticas de termos e respostas), aplica as
-- migrations 137, 138 e 139 e simula o prestador (tentando adulterar e seguindo o fluxo normal do
-- portal) e a equipe. Tudo numa transação que termina em ROLLBACK.
--
-- Rodar: bash supabase/tests/rodar.sh prazos_calculados_pelo_prestador.sql

\set ON_ERROR_STOP 1

BEGIN;

SET LOCAL client_min_messages = warning;
\ir fixtures/estado_producao_20260928.sql
\ir fixtures/acesso_producao_20260928.sql
\ir fixtures/sancionador_producao_20260928.sql
\ir ../migrations/137_fix_signup_privilege_escalation.sql
\ir ../migrations/138_fix_open_policies.sql
\ir ../migrations/139_fix_prestador_prazos.sql
SET LOCAL client_min_messages = notice;

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

CREATE FUNCTION pg_temp.erro(cmd text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE cmd;
  RETURN '';
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END $$;

CREATE FUNCTION pg_temp.linhas(cmd text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE cmd;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

CREATE FUNCTION pg_temp.cadastrar(uid uuid, meta jsonb) RETURNS void LANGUAGE sql AS $$
  INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES (uid, uid::text || '@teste.invalid', meta);
$$;

-- Hoje em MS, como o servidor calcula.
CREATE FUNCTION pg_temp.hoje() RETURNS date LANGUAGE sql AS $$
  SELECT (now() AT TIME ZONE 'America/Campo_Grande')::date;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, anon;

-- Cenário ----------------------------------------------------------------------------------------
-- c001 fiscal · c002 usuário do prestador d001 · d001 prestador
-- f001 fiscalização com termo t001 (prazo ainda não iniciado)
-- f002 fiscalização com termo t002 (prazo vencido ontem)
-- u001/u002 unidades · e101/e102 determinações de f001 · e201 determinação de f002

SELECT pg_temp.sair();

INSERT INTO public.prestadores_servico (id, nome, ativo, tipo_entidade, status)
VALUES ('00000000-0000-4000-8000-00000000d001', 'Prestador de teste', true, 'Concessionária', 'ativa');

SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c001',
  '{"full_name": "Fiscal", "role": "fiscal", "diretoria_id": "dsb", "camara_tecnica_id": "cres"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c002',
  '{"full_name": "Prestador", "role": "prestador", "prestador_servico_id": "00000000-0000-4000-8000-00000000d001"}');
UPDATE public.profiles SET ativo = true
WHERE id IN ('00000000-0000-4000-8000-00000000c001', '00000000-0000-4000-8000-00000000c002');

INSERT INTO public.fiscalizacoes (id, prestador_servico_id, camara_tecnica_id) VALUES
  ('00000000-0000-4000-8000-00000000f001', '00000000-0000-4000-8000-00000000d001', 'cres'),
  ('00000000-0000-4000-8000-00000000f002', '00000000-0000-4000-8000-00000000d001', 'cres');
INSERT INTO public.unidades_fiscalizadas (id, fiscalizacao_id) VALUES
  ('00000000-0000-4000-8000-00000000a101', '00000000-0000-4000-8000-00000000f001'),
  ('00000000-0000-4000-8000-00000000a201', '00000000-0000-4000-8000-00000000f002');
INSERT INTO public.determinacoes (id, unidade_fiscalizada_id, descricao, origem) VALUES
  ('00000000-0000-4000-8000-00000000e101', '00000000-0000-4000-8000-00000000a101', 'Sanar NC1', 'teste:1'),
  ('00000000-0000-4000-8000-00000000e102', '00000000-0000-4000-8000-00000000a101', 'Sanar NC2', 'teste:2'),
  ('00000000-0000-4000-8000-00000000e201', '00000000-0000-4000-8000-00000000a201', 'Sanar NC1', 'teste:3');
INSERT INTO public.termos_notificacao
  (id, fiscalizacao_id, prestador_servico_id, numero_termo_notificacao, prazo_resposta_dias,
   arquivo_url, arquivo_rfp_url, status, created_at)
VALUES
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000f001',
   '00000000-0000-4000-8000-00000000d001', 'TN 001/2026/DSB/AGEMS', 30,
   'storage://documentos-termos/tn.pdf', 'storage://documentos-termos/rfp.pdf',
   'aguardando_assinatura_prestador', now()),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-00000000f002',
   '00000000-0000-4000-8000-00000000d001', 'TN 002/2026/DSB/AGEMS', 30,
   'storage://documentos-termos/tn2.pdf', 'storage://documentos-termos/rfp2.pdf',
   'aguardando_resposta', now());
UPDATE public.termos_notificacao
SET data_inicio_prazo = pg_temp.hoje() - 31, data_maxima_resposta = pg_temp.hoje() - 1
WHERE id = '00000000-0000-4000-8000-0000000000b2';

-- 1. Prestador tentando adulterar o termo --------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  UPDATE public.termos_notificacao
  SET data_maxima_resposta = '2099-12-31', recebida_no_prazo = true, arquivo_url = 'storage://x/y.pdf',
      numero_termo_notificacao = 'TN 999', prazo_resposta_dias = 999
  WHERE id = '00000000-0000-4000-8000-0000000000b1';
END $$;
RESET ROLE;
SELECT pg_temp.sair();
DO $$
DECLARE t public.termos_notificacao;
BEGIN
  SELECT * INTO t FROM public.termos_notificacao WHERE id = '00000000-0000-4000-8000-0000000000b1';
  PERFORM pg_temp.ok(t.data_maxima_resposta IS NULL, 'prestador: não grava data-limite');
  PERFORM pg_temp.ok(t.recebida_no_prazo IS NULL, 'prestador: não grava "recebida no prazo"');
  PERFORM pg_temp.ok(t.arquivo_url = 'storage://documentos-termos/tn.pdf', 'prestador: não troca o TN da AGEMS');
  PERFORM pg_temp.ok(t.numero_termo_notificacao = 'TN 001/2026/DSB/AGEMS' AND t.prazo_resposta_dias = 30,
    'prestador: não altera número nem prazo em dias');
END $$;

-- 2. Envio do TN assinado pelo portal (com datas forjadas no pedido) -----------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.termos_notificacao
      SET arquivo_tn_prestador_url = 'storage://documentos-termos/tn-assinado.pdf',
          assinatura_prestador_valida = true, data_assinatura_prestador = '2000-01-01',
          data_protocolo = '2000-01-01', data_inicio_prazo = '2000-01-01',
          data_maxima_resposta = '2099-12-31', status = 'aguardando_resposta'
      WHERE id = '00000000-0000-4000-8000-0000000000b1'$q$) = 1, 'portal: envio do TN assinado é aceito');
END $$;
RESET ROLE;
SELECT pg_temp.sair();
DO $$
DECLARE t public.termos_notificacao;
BEGIN
  SELECT * INTO t FROM public.termos_notificacao WHERE id = '00000000-0000-4000-8000-0000000000b1';
  PERFORM pg_temp.ok(t.arquivo_tn_prestador_url = 'storage://documentos-termos/tn-assinado.pdf', 'portal: TN assinado gravado');
  PERFORM pg_temp.ok(t.data_inicio_prazo = pg_temp.hoje() AND t.data_protocolo = pg_temp.hoje(),
    'servidor: prazo começa hoje (data de MS), não na data enviada');
  PERFORM pg_temp.ok(t.data_maxima_resposta = pg_temp.hoje() + 30, 'servidor: data-limite = hoje + 30 dias');
  PERFORM pg_temp.ok(t.assinatura_prestador_valida AND t.data_assinatura_prestador > now() - interval '1 minute',
    'servidor: assinatura válida com a hora do servidor');
  PERFORM pg_temp.ok(t.status = 'aguardando_resposta', 'servidor: status aguardando resposta');
END $$;

-- Reenvio do TN não reinicia o prazo.
UPDATE public.termos_notificacao SET data_inicio_prazo = pg_temp.hoje() - 5, data_maxima_resposta = pg_temp.hoje() + 25
WHERE id = '00000000-0000-4000-8000-0000000000b1';
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
UPDATE public.termos_notificacao SET arquivo_tn_prestador_url = 'storage://documentos-termos/tn-assinado-v2.pdf'
WHERE id = '00000000-0000-4000-8000-0000000000b1';
RESET ROLE;
SELECT pg_temp.sair();
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT data_inicio_prazo = pg_temp.hoje() - 5 AND data_maxima_resposta = pg_temp.hoje() + 25
                      AND arquivo_tn_prestador_url LIKE '%v2.pdf'
                      FROM public.termos_notificacao WHERE id = '00000000-0000-4000-8000-0000000000b1'),
    'servidor: reenviar o TN troca o arquivo, mas não reinicia o prazo');
END $$;

-- 3. Respostas às determinações ------------------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$
DECLARE r public.respostas_determinacao;
BEGIN
  -- Rascunho com vínculos, análise e status forjados.
  INSERT INTO public.respostas_determinacao
    (id, determinacao_id, unidade_fiscalizada_id, fiscalizacao_id, prestador_servico_id,
     manifestacao_prestador, status, dentro_prazo, descricao_atendimento)
  VALUES ('00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-00000000e101',
          '00000000-0000-4000-8000-00000000a201', '00000000-0000-4000-8000-00000000f002',
          '00000000-0000-4000-8000-00000000d001', 'Rascunho', 'atendida', true, 'Atendida pela AGEMS');
END $$;
RESET ROLE;
SELECT pg_temp.sair();
DO $$
DECLARE r public.respostas_determinacao;
BEGIN
  SELECT * INTO r FROM public.respostas_determinacao WHERE id = '00000000-0000-4000-8000-0000000000c1';
  PERFORM pg_temp.ok(r.status = 'rascunho', 'prestador: não cria resposta já "atendida" (vira rascunho)');
  PERFORM pg_temp.ok(r.descricao_atendimento IS NULL, 'prestador: não escreve a análise da equipe');
  PERFORM pg_temp.ok(r.dentro_prazo IS NULL, 'prestador: não define pontualidade no rascunho');
  PERFORM pg_temp.ok(r.fiscalizacao_id = '00000000-0000-4000-8000-00000000f001'
                     AND r.unidade_fiscalizada_id = '00000000-0000-4000-8000-00000000a101',
    'servidor: unidade e fiscalização vêm da determinação');
END $$;

-- Envio da resposta, com pontualidade e data forjadas.
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
UPDATE public.respostas_determinacao
SET status = 'aguardando_analise', dentro_prazo = false, data_resposta = '2000-01-01', manifestacao_prestador = 'Sanado'
WHERE id = '00000000-0000-4000-8000-0000000000c1';
RESET ROLE;
SELECT pg_temp.sair();
DO $$
DECLARE r public.respostas_determinacao;
BEGIN
  SELECT * INTO r FROM public.respostas_determinacao WHERE id = '00000000-0000-4000-8000-0000000000c1';
  PERFORM pg_temp.ok(r.status = 'aguardando_analise' AND r.manifestacao_prestador = 'Sanado', 'portal: envio da resposta gravado');
  PERFORM pg_temp.ok(r.dentro_prazo IS TRUE, 'servidor: dentro do prazo (hoje antes da data-limite)');
  PERFORM pg_temp.ok(r.data_resposta > now() - interval '1 minute', 'servidor: data da resposta é a do servidor');
END $$;

-- Equipe analisa.
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.respostas_determinacao
      SET status = 'nao_atendida', descricao_atendimento = 'Evidência insuficiente'
      WHERE id = '00000000-0000-4000-8000-0000000000c1'$q$) = 1, 'equipe: analisa a resposta');
END $$;
RESET ROLE;

-- Prestador tenta desfazer a análise.
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.erro($q$UPDATE public.respostas_determinacao
      SET status = 'aguardando_analise', descricao_atendimento = ''
      WHERE id = '00000000-0000-4000-8000-0000000000c1'$q$) = '42501', 'prestador: não altera resposta já analisada');
  -- Resposta a determinação de fiscalização sem termo para ele: bloqueada pela política.
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO public.respostas_determinacao
      (determinacao_id, prestador_servico_id, status) VALUES
      ('00000000-0000-4000-8000-00000000e999', '00000000-0000-4000-8000-00000000d001', 'rascunho')$q$) = '42501',
    'prestador: não responde determinação sem termo para ele');
END $$;
RESET ROLE;
SELECT pg_temp.sair();
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT status = 'nao_atendida' AND descricao_atendimento = 'Evidência insuficiente'
                      FROM public.respostas_determinacao WHERE id = '00000000-0000-4000-8000-0000000000c1'),
    'análise da equipe preservada');
END $$;

-- Resposta a determinação de termo vencido: fora do prazo.
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
INSERT INTO public.respostas_determinacao (id, determinacao_id, prestador_servico_id, manifestacao_prestador, status, dentro_prazo)
VALUES ('00000000-0000-4000-8000-0000000000c2', '00000000-0000-4000-8000-00000000e201',
        '00000000-0000-4000-8000-00000000d001', 'Atrasada', 'aguardando_analise', true);
RESET ROLE;
SELECT pg_temp.sair();
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT dentro_prazo IS FALSE FROM public.respostas_determinacao
                      WHERE id = '00000000-0000-4000-8000-0000000000c2'),
    'servidor: resposta depois da data-limite fica fora do prazo, mesmo enviando true');
END $$;

-- 4. Conclusão da resposta ao termo --------------------------------------------------------------

-- Último dia do prazo conta como no prazo.
UPDATE public.termos_notificacao SET data_maxima_resposta = pg_temp.hoje()
WHERE id = '00000000-0000-4000-8000-0000000000b1';
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
UPDATE public.termos_notificacao
SET data_recebimento_resposta = '2000-01-01', recebida_no_prazo = false, status = 'respondido'
WHERE id = '00000000-0000-4000-8000-0000000000b1';
UPDATE public.termos_notificacao
SET recebida_no_prazo = true, status = 'respondido'
WHERE id = '00000000-0000-4000-8000-0000000000b2';
RESET ROLE;
SELECT pg_temp.sair();
DO $$
DECLARE t1 public.termos_notificacao; t2 public.termos_notificacao;
BEGIN
  SELECT * INTO t1 FROM public.termos_notificacao WHERE id = '00000000-0000-4000-8000-0000000000b1';
  SELECT * INTO t2 FROM public.termos_notificacao WHERE id = '00000000-0000-4000-8000-0000000000b2';
  PERFORM pg_temp.ok(t1.status = 'respondido' AND t1.data_recebimento_resposta = pg_temp.hoje(),
    'servidor: conclusão grava respondido com a data de hoje (MS)');
  PERFORM pg_temp.ok(t1.recebida_no_prazo IS TRUE, 'servidor: resposta no último dia conta como no prazo');
  PERFORM pg_temp.ok(t2.status = 'respondido' AND t2.recebida_no_prazo IS FALSE,
    'servidor: resposta depois da data-limite fica fora do prazo, mesmo enviando true');
END $$;

-- Depois de respondido, o prestador não altera mais o termo.
SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.termos_notificacao SET arquivos_resposta = '[{"nome": "tarde.pdf"}]'
      WHERE id = '00000000-0000-4000-8000-0000000000b1'$q$) = 0, 'prestador: não altera termo já respondido');
END $$;
RESET ROLE;

-- 5. A equipe continua editando o termo ----------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.termos_notificacao
      SET data_maxima_resposta = '2030-01-31', recebida_no_prazo = true, status = 'aguardando_resposta',
          data_protocolo = '2026-01-02'
      WHERE id = '00000000-0000-4000-8000-0000000000b2'$q$) = 1, 'equipe: edita datas e status do termo');
  PERFORM pg_temp.ok((SELECT data_maxima_resposta = '2030-01-31' AND recebida_no_prazo AND status = 'aguardando_resposta'
                      FROM public.termos_notificacao WHERE id = '00000000-0000-4000-8000-0000000000b2'),
    'equipe: valores da equipe são gravados como enviados');
END $$;
RESET ROLE;

\echo 'prazos_calculados_pelo_prestador: todos os testes passaram'
ROLLBACK;
