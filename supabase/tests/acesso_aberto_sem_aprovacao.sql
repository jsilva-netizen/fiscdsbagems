-- Teste da migration 138 (.specify/bugs/acesso-aberto-sem-aprovacao).
--
-- Carrega o estado de produção (funções, perfis, políticas das 8 tabelas e de storage.objects),
-- aplica as migrations 137 e 138 e simula anônimo, conta não aprovada, fiscal, prestador e admin
-- ativos. Tudo numa transação que termina em ROLLBACK.
--
-- Rodar: bash supabase/tests/rodar.sh acesso_aberto_sem_aprovacao.sql

\set ON_ERROR_STOP 1

BEGIN;

SET LOCAL client_min_messages = warning;
\ir fixtures/estado_producao_20260928.sql
\ir fixtures/acesso_producao_20260928.sql
\ir ../migrations/137_fix_signup_privilege_escalation.sql
\ir ../migrations/138_fix_open_policies.sql
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

-- Executa o comando e devolve o código de erro ('' se deu certo).
CREATE FUNCTION pg_temp.erro(cmd text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE cmd;
  RETURN '';
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END $$;

-- Executa o comando e devolve quantas linhas ele afetou.
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

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, anon;

-- Deixa o gatilho protect_delete de storage.objects fora do caminho: o que se testa é a política.
SELECT set_config('storage.allow_delete_query', 'true', true);

-- Cenário ----------------------------------------------------------------------------------------
-- a001 admin · b001 conta não aprovada · c001 fiscal (câmara cres) · c002 usuário do prestador d001
-- d001 prestador · e001 tipo de unidade · e002 item de checklist · e003 contrato
-- e004 tipo de ocorrência DTR · e005 remessa do d001 (câmara cres) · e006 item da remessa
-- arquivo teste-acesso/e007.jpg em fotos_fiscalizacao

SELECT pg_temp.sair();

INSERT INTO public.prestadores_servico (id, nome, ativo, tipo_entidade, status, telefone)
VALUES ('00000000-0000-4000-8000-00000000d001', 'Prestador de teste', true, 'Concessionária', 'ativa', '(00) 0000-0000');

SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000a001', '{"full_name": "Admin", "role": "fiscal"}');
UPDATE public.profiles SET role = 'admin', ativo = true WHERE id = '00000000-0000-4000-8000-00000000a001';
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000b001', '{"full_name": "Nao aprovado", "role": "fiscal"}');
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c001',
  '{"full_name": "Fiscal", "role": "fiscal", "diretoria_id": "dsb", "camara_tecnica_id": "cres"}');
UPDATE public.profiles SET ativo = true WHERE id = '00000000-0000-4000-8000-00000000c001';
SELECT pg_temp.cadastrar('00000000-0000-4000-8000-00000000c002',
  '{"full_name": "Prestador", "role": "prestador", "prestador_servico_id": "00000000-0000-4000-8000-00000000d001"}');
UPDATE public.profiles SET ativo = true WHERE id = '00000000-0000-4000-8000-00000000c002';

INSERT INTO public.tipos_unidade (id, nome) VALUES ('00000000-0000-4000-8000-00000000e001', 'Tipo de teste');
INSERT INTO public.itens_checklist (id, tipo_unidade_id, pergunta)
VALUES ('00000000-0000-4000-8000-00000000e002', '00000000-0000-4000-8000-00000000e001', 'Pergunta de teste');
INSERT INTO public.contratos (id, numero_contrato, rodovia, prestador_servico_id)
VALUES ('00000000-0000-4000-8000-00000000e003', 'CT-TESTE', 'MS-000', '00000000-0000-4000-8000-00000000d001');
INSERT INTO public.tipos_ocorrencia_dtr (id, nome) VALUES ('00000000-0000-4000-8000-00000000e004', 'Ocorrência de teste');
INSERT INTO public.remessas_ai (id, prestador_servico_id, camara_tecnica_id, status)
VALUES ('00000000-0000-4000-8000-00000000e005', '00000000-0000-4000-8000-00000000d001', 'cres', 'enviada');
INSERT INTO public.remessas_ai_itens (id, remessa_ai_id)
VALUES ('00000000-0000-4000-8000-00000000e006', '00000000-0000-4000-8000-00000000e005');
INSERT INTO storage.objects (bucket_id, name) VALUES ('fotos_fiscalizacao', 'teste-acesso/e007.jpg');

-- 1. Anônimo -------------------------------------------------------------------------------------

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.itens_checklist) = 0, 'anônimo: não lê itens de checklist');
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.itens_checklist SET pergunta = 'x'$q$) = 0,
    'anônimo: não altera itens de checklist');
  PERFORM pg_temp.ok(pg_temp.linhas($q$DELETE FROM public.tipos_unidade$q$) = 0,
    'anônimo: não apaga tipos de unidade');
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO public.tipos_unidade (nome) VALUES ('x')$q$) = '42501',
    'anônimo: não cria tipo de unidade');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.prestadores_servico) = 0,
    'anônimo: não lê prestadores (contatos, responsável)');
  PERFORM pg_temp.ok(EXISTS (SELECT 1 FROM public.prestadores_para_cadastro()
                             WHERE id = '00000000-0000-4000-8000-00000000d001' AND nome = 'Prestador de teste'),
    'anônimo: a tela de cadastro obtém id e nome dos prestadores ativos');
  PERFORM pg_temp.ok(pg_get_function_result('public.prestadores_para_cadastro()'::regprocedure) = 'TABLE(id uuid, nome text)',
    'anônimo: a função de cadastro devolve só id e nome');
  PERFORM pg_temp.ok((SELECT count(*) FROM storage.objects) = 0, 'anônimo: não lê arquivos');
END $$;
RESET ROLE;

-- 2. Conta não aprovada --------------------------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000b001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.itens_checklist) = 0, 'não aprovada: não lê itens de checklist');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.tipos_unidade) = 0, 'não aprovada: não lê tipos de unidade');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.prestadores_servico) = 0, 'não aprovada: não lê prestadores');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.contratos) = 0, 'não aprovada: não lê contratos');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.tipos_ocorrencia_dtr) = 0, 'não aprovada: não lê tipos de ocorrência');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.remessas_ai) = 0, 'não aprovada: não lê remessas');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.remessas_ai_itens) = 0, 'não aprovada: não lê itens de remessa');
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.contratos SET rodovia = 'x'$q$) = 0,
    'não aprovada: não altera contratos');
  PERFORM pg_temp.ok(pg_temp.linhas($q$DELETE FROM public.tipos_ocorrencia_dtr$q$) = 0,
    'não aprovada: não apaga tipos de ocorrência');
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.remessas_ai SET status = 'x'$q$) = 0,
    'não aprovada: não altera remessas');
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO public.contratos (numero_contrato, rodovia) VALUES ('x', 'x')$q$) = '42501',
    'não aprovada: não cria contrato');
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO public.caters_deadline_extensions
      (process_id, reference_date, extension_days, calculated_date)
      VALUES (gen_random_uuid(), now(), 1, now())$q$) = '42501',
    'não aprovada: não cria prorrogação de prazo do CATERS');
  PERFORM pg_temp.ok((SELECT count(*) FROM storage.objects) = 0, 'não aprovada: não lê arquivos');
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO storage.objects (bucket_id, name)
      VALUES ('relatorios_fiscalizacao', 'teste-acesso/x.pdf')$q$) = '42501',
    'não aprovada: não envia arquivo');
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE storage.objects SET name = name$q$) = 0,
    'não aprovada: não altera arquivos');
  PERFORM pg_temp.ok(pg_temp.linhas($q$DELETE FROM storage.objects$q$) = 0,
    'não aprovada: não apaga arquivos');
END $$;
RESET ROLE;

-- 3. Fiscal ativo --------------------------------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.itens_checklist WHERE id = '00000000-0000-4000-8000-00000000e002') = 1,
    'fiscal: lê itens de checklist');
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.itens_checklist SET pergunta = 'Pergunta editada'
      WHERE id = '00000000-0000-4000-8000-00000000e002'$q$) = 1, 'fiscal: edita item de checklist');
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO public.tipos_unidade (nome) VALUES ('Tipo do fiscal')$q$) = '',
    'fiscal: cria tipo de unidade');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.prestadores_servico WHERE id = '00000000-0000-4000-8000-00000000d001') = 1,
    'fiscal: lê prestadores');
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.contratos SET rodovia = 'MS-001'
      WHERE id = '00000000-0000-4000-8000-00000000e003'$q$) = 1, 'fiscal: edita contrato');
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO public.tipos_ocorrencia_dtr (nome) VALUES ('Ocorrência do fiscal')$q$) = '',
    'fiscal: cria tipo de ocorrência');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.remessas_ai WHERE id = '00000000-0000-4000-8000-00000000e005') = 1,
    'fiscal: lê remessa');
  -- A política passa; o erro esperado é o da chave estrangeira do processo inexistente.
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO public.caters_deadline_extensions
      (process_id, reference_date, extension_days, calculated_date)
      VALUES (gen_random_uuid(), now(), 1, now())$q$) = '23503',
    'fiscal: a política permite criar prorrogação de prazo do CATERS');
  PERFORM pg_temp.ok((SELECT count(*) FROM storage.objects WHERE name = 'teste-acesso/e007.jpg') = 1,
    'fiscal: lê arquivo');
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO storage.objects (bucket_id, name)
      VALUES ('fotos_fiscalizacao', 'teste-acesso/fiscal.jpg')$q$) = '', 'fiscal: envia arquivo');
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE storage.objects SET name = name
      WHERE name = 'teste-acesso/e007.jpg'$q$) = 1, 'fiscal: altera arquivo');
END $$;
RESET ROLE;

-- 4. Prestador ativo -----------------------------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000c002');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok((SELECT count(*) FROM public.remessas_ai WHERE id = '00000000-0000-4000-8000-00000000e005') = 1,
    'prestador: lê a própria remessa');
  PERFORM pg_temp.ok((SELECT count(*) FROM public.remessas_ai_itens WHERE id = '00000000-0000-4000-8000-00000000e006') = 1,
    'prestador: lê itens da própria remessa');
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.remessas_ai SET status = 'defesa_enviada'
      WHERE id = '00000000-0000-4000-8000-00000000e005'$q$) = 1,
    'prestador: altera a própria remessa pelo portal, como hoje');
  PERFORM pg_temp.ok(pg_temp.erro($q$INSERT INTO storage.objects (bucket_id, name)
      VALUES ('documentos-termos', 'teste-acesso/resposta.pdf')$q$) = '', 'prestador: envia arquivo');
  PERFORM pg_temp.ok((SELECT count(*) FROM storage.objects WHERE name = 'teste-acesso/resposta.pdf') = 1,
    'prestador: lê o arquivo que enviou');
END $$;
RESET ROLE;

-- 5. Admin ativo ---------------------------------------------------------------------------------

SELECT pg_temp.entrar('00000000-0000-4000-8000-00000000a001');
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM pg_temp.ok(pg_temp.linhas($q$UPDATE public.itens_checklist SET pergunta = 'Pergunta do admin'
      WHERE id = '00000000-0000-4000-8000-00000000e002'$q$) = 1, 'admin: edita item de checklist');
  PERFORM pg_temp.ok(pg_temp.linhas($q$DELETE FROM public.contratos
      WHERE id = '00000000-0000-4000-8000-00000000e003'$q$) = 1, 'admin: apaga contrato');
  PERFORM pg_temp.ok(pg_temp.linhas($q$DELETE FROM storage.objects
      WHERE name = 'teste-acesso/e007.jpg'$q$) = 1, 'admin: apaga arquivo');
END $$;
RESET ROLE;

-- 6. Nenhuma política aberta restante ------------------------------------------------------------

SELECT pg_temp.sair();
DO $$
BEGIN
  PERFORM pg_temp.ok(NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'storage' AND tablename = 'objects'
        AND roles = ARRAY['authenticated']::name[]
        AND coalesce(qual, '') NOT LIKE '%get_my_role%'
        AND coalesce(with_check, '') NOT LIKE '%get_my_role%'),
    'storage: toda política de authenticated exige perfil ativo');
  PERFORM pg_temp.ok(NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('itens_checklist', 'tipos_unidade', 'prestadores_servico', 'contratos', 'remessas_ai',
                          'remessas_ai_itens', 'caters_deadline_extensions', 'tipos_ocorrencia_dtr')
        AND permissive = 'PERMISSIVE' AND (qual = 'true' OR with_check = 'true')),
    'tabelas: nenhuma política permissiva com condição "true"');
END $$;

\echo 'acesso_aberto_sem_aprovacao: todos os testes passaram'
ROLLBACK;
