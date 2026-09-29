-- Estado de PRODUÇÃO (inventário de 2026-09-28) de termos_notificacao e respostas_determinacao:
-- colunas que podem faltar no banco local, privilégios e políticas. Só para teste, dentro de
-- transação que termina em ROLLBACK. Gerado a partir de
-- .specify/assessments/novo-sistema-django-apps/inventario-producao*.csv (branch migracao-sisreg).

-- Funções de produção usadas pelas políticas do prestador.
CREATE OR REPLACE FUNCTION public.can_access_fiscalizacao(fiscalizacao uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.termos_notificacao t
    where t.fiscalizacao_id = fiscalizacao
      and t.prestador_servico_id = public.current_prestador_servico_id()
  );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_unidade(unidade uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.unidades_fiscalizadas u
    join public.termos_notificacao t
      on t.fiscalizacao_id = u.fiscalizacao_id
    where u.id = unidade
      and t.prestador_servico_id = public.current_prestador_servico_id()
  );
$function$;

ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS determinacao_id uuid;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS unidade_fiscalizada_id uuid;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS fiscalizacao_id uuid;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS prestador_servico_id uuid;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS resposta text;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS manifestacao_prestador text;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS descricao_atendimento text;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS dentro_prazo boolean;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS tipo_resposta text;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS data_resposta timestamp with time zone;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.respostas_determinacao ADD COLUMN IF NOT EXISTS evidencias jsonb;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS numero_termo_notificacao text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS numero_rfp text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS municipio_id uuid;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS prestador_servico_id uuid;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS fiscalizacao_id uuid;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS numero_processo text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS camara_tecnica text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS data_protocolo date;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS prazo_resposta_dias integer;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivo_url text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivo_protocolo_url text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivo_oficio_protocolo text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS data_maxima_resposta date;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS data_geracao timestamp with time zone;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS data_recebimento_resposta date;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS recebida_no_prazo boolean;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivos_resposta jsonb;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivo_oficio_resposta text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS numero_am text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivo_rfp_url text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivo_tn_prestador_url text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS assinatura_prestador_valida boolean;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS data_assinatura_prestador timestamp with time zone;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS data_inicio_prazo date;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS fluxo_manual boolean;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivo_am_assinada_url text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS am_concluida_em timestamp with time zone;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS tipo_relatorio text;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS ano_geracao integer;
ALTER TABLE public.termos_notificacao ADD COLUMN IF NOT EXISTS arquivo_resposta_url text;

DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='termos_notificacao' LOOP EXECUTE format('DROP POLICY %I ON public.termos_notificacao', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.termos_notificacao FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.termos_notificacao TO anon;
REVOKE ALL ON public.termos_notificacao FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.termos_notificacao TO authenticated;
CREATE POLICY "Fiscais e Admins: acesso total em termos" ON public.termos_notificacao AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text])))
  WITH CHECK ((get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text])));
CREATE POLICY "Prestadores: ler seus termos" ON public.termos_notificacao AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())));
CREATE POLICY "Prestadores: responder seus termos" ON public.termos_notificacao AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())))
  WITH CHECK (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())));
CREATE POLICY "termos_prestador_select_own" ON public.termos_notificacao AS PERMISSIVE FOR SELECT TO authenticated
  USING ((("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id())));
CREATE POLICY "termos_prestador_update_own_until_respondido" ON public.termos_notificacao AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND (COALESCE(status, ''::text) <> 'respondido'::text)))
  WITH CHECK ((("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id())));
CREATE POLICY "termos_staff_all" ON public.termos_notificacao AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='respostas_determinacao' LOOP EXECUTE format('DROP POLICY %I ON public.respostas_determinacao', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.respostas_determinacao FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.respostas_determinacao TO anon;
REVOKE ALL ON public.respostas_determinacao FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.respostas_determinacao TO authenticated;
CREATE POLICY "Fiscais e Admins: acesso total em respostas determinacoes" ON public.respostas_determinacao AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text])))
  WITH CHECK ((get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text])));
CREATE POLICY "Prestadores: atualizar suas próprias respostas determinacoes" ON public.respostas_determinacao AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())))
  WITH CHECK (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())));
CREATE POLICY "Prestadores: cadastrar respostas determinacoes" ON public.respostas_determinacao AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())));
CREATE POLICY "Prestadores: ler suas próprias respostas determinacoes" ON public.respostas_determinacao AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())));
CREATE POLICY "respostas_det_prestador_insert" ON public.respostas_determinacao AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id) AND (status = ANY (ARRAY['rascunho'::text, 'aguardando_analise'::text]))));
CREATE POLICY "respostas_det_prestador_select" ON public.respostas_determinacao AS PERMISSIVE FOR SELECT TO authenticated
  USING ((("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id)));
CREATE POLICY "respostas_det_prestador_update" ON public.respostas_determinacao AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id)))
  WITH CHECK ((("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id) AND (status = ANY (ARRAY['rascunho'::text, 'aguardando_analise'::text]))));
CREATE POLICY "respostas_det_staff_all" ON public.respostas_determinacao AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

