-- 138: fecha políticas abertas (.specify/bugs/acesso-aberto-sem-aprovacao).
--
-- Antes: sem login, qualquer pessoa alterava e apagava itens de checklist e tipos de unidade e lia
-- os dados de contato dos prestadores; qualquer conta logada, inclusive recém-cadastrada e não
-- aprovada, lia e apagava os arquivos de fiscalização e dos processos e escrevia em contratos,
-- tipos de ocorrência da DTR, remessas e prorrogações de prazo do CATERS.
--
-- Depois: nenhuma escrita sem login; só perfil ativo lê e escreve nessas tabelas e nos arquivos.
-- Quem está ativo continua fazendo exatamente o que fazia (inclusive o prestador, que altera
-- remessas e envia arquivos pelo portal). Requer a migration 137 (get_my_role() só de perfil ativo).
--
-- Parte das definições de produção (inventário de 2026-09-28).

-- 1. Escrita anônima no motor de checklists. A escrita fica com as políticas "Operadores
--    gerenciam ..." (admin, coordenador e fiscal ativos), que já existem.
DROP POLICY IF EXISTS "Public Access" ON public.itens_checklist;
DROP POLICY IF EXISTS "Public Access" ON public.tipos_unidade;

-- 2. Leitura anônima dos prestadores (contatos, responsável). A tela de cadastro só precisa de
--    id e nome dos ativos, e passa a obtê-los por esta função.
DROP POLICY IF EXISTS "Prestadores visíveis para todos" ON public.prestadores_servico;

CREATE OR REPLACE FUNCTION public.prestadores_para_cadastro()
 RETURNS TABLE (id uuid, nome text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nome FROM public.prestadores_servico p WHERE p.ativo IS TRUE ORDER BY p.nome;
$function$;

REVOKE ALL ON FUNCTION public.prestadores_para_cadastro() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prestadores_para_cadastro() TO anon, authenticated;

-- 3. Políticas com condição "true" para qualquer logado passam a exigir perfil ativo. Mesmos
--    nomes, comandos e papéis.

DROP POLICY IF EXISTS "Leitura pública de itens de checklist" ON public.itens_checklist;
CREATE POLICY "Leitura pública de itens de checklist" ON public.itens_checklist
  FOR SELECT TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL);

DROP POLICY IF EXISTS "Leitura pública de tipos de unidade" ON public.tipos_unidade;
CREATE POLICY "Leitura pública de tipos de unidade" ON public.tipos_unidade
  FOR SELECT TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL);

DROP POLICY IF EXISTS "Leitura pública de prestadores" ON public.prestadores_servico;
CREATE POLICY "Leitura pública de prestadores" ON public.prestadores_servico
  FOR SELECT TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL);

DROP POLICY IF EXISTS "Leitura autenticada tipos_ocorrencia_dtr" ON public.tipos_ocorrencia_dtr;
CREATE POLICY "Leitura autenticada tipos_ocorrencia_dtr" ON public.tipos_ocorrencia_dtr
  FOR SELECT TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL);

DROP POLICY IF EXISTS "Escrita admin tipos_ocorrencia_dtr" ON public.tipos_ocorrencia_dtr;
CREATE POLICY "Escrita admin tipos_ocorrencia_dtr" ON public.tipos_ocorrencia_dtr
  FOR ALL TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.get_my_role()) IS NOT NULL);

DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.contratos;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.contratos
  FOR ALL TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.get_my_role()) IS NOT NULL);

DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.remessas_ai;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.remessas_ai
  FOR ALL TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.get_my_role()) IS NOT NULL);

DROP POLICY IF EXISTS "Acesso total autenticado (DEV)" ON public.remessas_ai_itens;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.remessas_ai_itens
  FOR ALL TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.get_my_role()) IS NOT NULL);

DROP POLICY IF EXISTS "authenticated users can manage deadline extensions" ON public.caters_deadline_extensions;
CREATE POLICY "authenticated users can manage deadline extensions" ON public.caters_deadline_extensions
  FOR ALL TO authenticated
  USING ((SELECT public.get_my_role()) IS NOT NULL)
  WITH CHECK ((SELECT public.get_my_role()) IS NOT NULL);

-- 4. Arquivos: toda política de storage.objects para "authenticated" que só olha o bucket passa a
--    exigir perfil ativo. Em produção são 32 (leitura, envio, troca e exclusão nos 7 buckets
--    privados e no de logos). A leitura pública de logos-entidades (papel public) não muda.
DO $$
DECLARE
  p record;
  ativo CONSTANT text := '(SELECT public.get_my_role()) IS NOT NULL';
  n int := 0;
BEGIN
  FOR p IN
    SELECT policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND roles = ARRAY['authenticated']::name[]
      AND coalesce(qual, '') NOT LIKE '%get_my_role%'
      AND coalesce(with_check, '') NOT LIKE '%get_my_role%'
  LOOP
    IF p.qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON storage.objects USING ((%s) AND %s)', p.policyname, p.qual, ativo);
    END IF;
    IF p.with_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON storage.objects WITH CHECK ((%s) AND %s)', p.policyname, p.with_check, ativo);
    END IF;
    n := n + 1;
    RAISE NOTICE 'storage.objects: "%" passa a exigir perfil ativo', p.policyname;
  END LOOP;
  RAISE NOTICE 'storage.objects: % políticas alteradas', n;
END $$;
