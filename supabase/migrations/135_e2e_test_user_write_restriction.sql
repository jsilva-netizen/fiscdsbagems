-- Migração 135: política aditiva de acesso para o usuário dedicado de teste e2e (FR-019,
-- specs/001-data-access-abstraction). Restringe alteração/remoção do usuário de teste aos
-- registros de sua própria autoria (created_by), em tabelas onde essa coluna existe e é
-- UUID referenciando auth.users — é a garantia de última instância de FR-017: mesmo um
-- defeito na rotina de limpeza (tests/support/cleanup.ts) não alcança dado legítimo, porque
-- o banco recusa antes.
--
-- UUID do usuário de teste (conta criada e UUID informado em 2026-09-18):
--   5cdf15b9-4b87-4163-8ee7-6eaecd354f67
-- Já substituído em todas as políticas abaixo. Revisar antes de aplicar que a política é
-- estritamente aditiva: RESTRICTIVE, escopada a este UUID específico, sem alterar nenhuma
-- política existente e sem efeito sobre qualquer outro usuário.
--
-- Cobertura desta migration: apenas as tabelas com coluna created_by do tipo UUID
-- referenciando auth.users, confirmadas por leitura direta das migrations anteriores
-- (001/000_setup_completo: fiscalizacoes; 120_caters_processes: caters_processes,
-- caters_recommendations, caters_extra_documents, caters_municipality_responses;
-- 123_caters_deadline_extensions: caters_deadline_extensions). Tabelas cuja coluna de
-- autoria não é UUID (ex.: itens_checklist.created_by é TEXT, não auth.uid() — ver
-- migrations 004/006) ficam de fora desta política até serem mapeadas explicitamente;
-- enquanto não mapeadas, a suíte não deve gravar nelas (FR-017, tests/support/cleanup.ts).

BEGIN;

-- fiscalizacoes
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.fiscalizacoes;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.fiscalizacoes
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.fiscalizacoes;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.fiscalizacoes
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

-- caters_processes
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.caters_processes;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.caters_processes
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.caters_processes;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.caters_processes
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

-- caters_recommendations
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.caters_recommendations;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.caters_recommendations
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.caters_recommendations;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.caters_recommendations
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

-- caters_extra_documents
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.caters_extra_documents;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.caters_extra_documents
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.caters_extra_documents;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.caters_extra_documents
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

-- caters_municipality_responses
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.caters_municipality_responses;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.caters_municipality_responses
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.caters_municipality_responses;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.caters_municipality_responses
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

-- caters_deadline_extensions
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.caters_deadline_extensions;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.caters_deadline_extensions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.caters_deadline_extensions;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.caters_deadline_extensions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67' OR created_by = auth.uid());

COMMIT;

-- Nota de leitura da política: RESTRICTIVE combina em AND com as políticas PERMISSIVE já
-- existentes — ela nunca amplia acesso, só pode negar. A condição
-- "auth.uid() <> <uuid do teste> OR created_by = auth.uid()" significa: para qualquer
-- usuário que NÃO seja o de teste, a política é sempre verdadeira (não restringe nada,
-- nenhum outro usuário é afetado); para o usuário de teste especificamente, só passa se a
-- linha for de sua própria autoria.
