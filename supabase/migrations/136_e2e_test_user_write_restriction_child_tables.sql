-- Migração 136: estende a política aditiva de FR-019 (migration 135) às tabelas do ciclo
-- de campo que a 135 não conseguia cobrir — unidades_fiscalizadas, respostas_checklist,
-- constatacoes_manuais, determinacoes e recomendacoes não têm coluna created_by (conferido
-- por leitura direta de 001_initial_schema.sql). Achado de 2026-09-21, ao preparar T026
-- (specs/001-data-access-abstraction/tasks.md): sem esta migration, o usuário de teste e2e
-- tinha, nessas cinco tabelas, o mesmo poder de UPDATE/DELETE que qualquer usuário
-- autenticado — nenhuma trava de banco, só a rotina de limpeza em tests/support/cleanup.ts
-- (código de aplicação, não garantia de banco) ficava entre um teste com defeito e dado real.
--
-- Desenho: em vez de um marcador de texto (a estratégia da 135), a restrição segue a posse
-- real por cadeia de referência até fiscalizacoes.created_by — a única coluna de autoria que
-- já existe nessa árvore de dados. Preferido a marcador de texto porque nem toda tabela tem
-- um campo livre alcançável pela UI: respostas_checklist, por exemplo, não tem nenhum campo
-- de texto que o fluxo normal de resposta (ChecklistItem.jsx) preencha — a UI sempre grava
-- observacao = ''. Uma política baseada em marcador seria inaplicável ali; a cadeia de posse
-- cobre as cinco tabelas de forma uniforme, sem depender de UI.
--
-- UUID do usuário de teste (o mesmo da migration 135):
--   5cdf15b9-4b87-4163-8ee7-6eaecd354f67
--
-- Mesma leitura de RESTRICTIVE da 135: combina em AND com as políticas PERMISSIVE
-- existentes, só pode negar, nunca ampliar acesso. Para qualquer usuário que não seja o de
-- teste, a condição "auth.uid() <> <uuid do teste>" já é verdadeira e a política não
-- restringe nada.

BEGIN;

-- unidades_fiscalizadas: posse direta via fiscalizacao_id -> fiscalizacoes.created_by
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.unidades_fiscalizadas;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.unidades_fiscalizadas
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.fiscalizacoes f
      WHERE f.id = unidades_fiscalizadas.fiscalizacao_id
        AND f.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.unidades_fiscalizadas;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.unidades_fiscalizadas
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.fiscalizacoes f
      WHERE f.id = unidades_fiscalizadas.fiscalizacao_id
        AND f.created_by = auth.uid()
    )
  );

-- respostas_checklist: posse por dois níveis, via unidade_fiscalizada_id -> unidades_fiscalizadas
-- -> fiscalizacao_id -> fiscalizacoes.created_by
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.respostas_checklist;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.respostas_checklist
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.unidades_fiscalizadas u
      JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
      WHERE u.id = respostas_checklist.unidade_fiscalizada_id
        AND f.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.respostas_checklist;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.respostas_checklist
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.unidades_fiscalizadas u
      JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
      WHERE u.id = respostas_checklist.unidade_fiscalizada_id
        AND f.created_by = auth.uid()
    )
  );

-- constatacoes_manuais: mesma cadeia de posse de respostas_checklist
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.constatacoes_manuais;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.constatacoes_manuais
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.unidades_fiscalizadas u
      JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
      WHERE u.id = constatacoes_manuais.unidade_fiscalizada_id
        AND f.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.constatacoes_manuais;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.constatacoes_manuais
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.unidades_fiscalizadas u
      JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
      WHERE u.id = constatacoes_manuais.unidade_fiscalizada_id
        AND f.created_by = auth.uid()
    )
  );

-- determinacoes: mesma cadeia de posse
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.determinacoes;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.determinacoes
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.unidades_fiscalizadas u
      JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
      WHERE u.id = determinacoes.unidade_fiscalizada_id
        AND f.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.determinacoes;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.determinacoes
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.unidades_fiscalizadas u
      JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
      WHERE u.id = determinacoes.unidade_fiscalizada_id
        AND f.created_by = auth.uid()
    )
  );

-- recomendacoes: mesma cadeia de posse
DROP POLICY IF EXISTS "e2e_test_user_own_rows_only" ON public.recomendacoes;
CREATE POLICY "e2e_test_user_own_rows_only" ON public.recomendacoes
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.unidades_fiscalizadas u
      JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
      WHERE u.id = recomendacoes.unidade_fiscalizada_id
        AND f.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "e2e_test_user_own_rows_only_delete" ON public.recomendacoes;
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.recomendacoes
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'
    OR EXISTS (
      SELECT 1 FROM public.unidades_fiscalizadas u
      JOIN public.fiscalizacoes f ON f.id = u.fiscalizacao_id
      WHERE u.id = recomendacoes.unidade_fiscalizada_id
        AND f.created_by = auth.uid()
    )
  );

COMMIT;

-- Nota: fiscalizacoes.created_by é preenchido pelo client em Repository.createFiscalizacao
-- (ver migration 063_fix_fiscalizacoes_created_by_default.sql para o histórico desse campo).
-- Toda a árvore de dado de uma vistoria (unidade, respostas, constatações manuais,
-- determinações, recomendações) referencia sua fiscalização de origem direta ou
-- transitivamente, então a posse verificada na raiz é suficiente para toda a árvore — não é
-- necessário (nem existe hoje) um created_by próprio em cada tabela filha.
