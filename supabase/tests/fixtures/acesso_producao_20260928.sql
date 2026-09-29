-- Estado de PRODUÇÃO (inventário de 2026-09-28) das políticas que a migration 138 corrige:
-- 8 tabelas de public e storage.objects, com os privilégios de tabela e os buckets de produção.
-- Gerado a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao*.csv
-- (branch migracao-sisreg). Só para teste, dentro de transação que termina em ROLLBACK.

-- Colunas de produção que podem faltar no banco local (as políticas de produção as usam).
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS process_id uuid;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS reference_date date;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS extension_days integer;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS calculated_date date;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS municipality_request_at date;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS municipality_protocol text;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.caters_deadline_extensions ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS numero_contrato text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS prestador_servico_id uuid;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS rodovia text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS ativo boolean;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS kml_url text;
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS km_points jsonb;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS tipo_unidade_id uuid;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS ordem integer;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS pergunta text;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS texto_constatacao_sim text;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS texto_constatacao_nao text;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS gera_nc boolean;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS artigo_portaria text;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS texto_nc text;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS texto_determinacao text;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS texto_recomendacao text;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS prazo_dias integer;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS ativo boolean;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS is_sample boolean;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS created_by_id uuid;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS created_by text;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS created_date timestamp with time zone;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS updated_date timestamp with time zone;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS ativo boolean;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS email_contato text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS responsavel text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS cargo text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS tipo text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS documentos jsonb;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS tipo_entidade text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS tipo_servico text[];
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS website text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS estado text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.prestadores_servico ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS termo_id uuid;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS fiscalizacao_id uuid;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS prestador_servico_id uuid;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS numero_rfp text;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS numero_tn text;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS arquivo_lista_pdf_url text;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS arquivo_recebimento_assinado_url text;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS arquivo_oficio_defesa_url text;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS arquivo_parecer_assinado_url text;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS criada_em timestamp with time zone;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS enviada_em timestamp with time zone;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS recebida_em timestamp with time zone;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS defesa_enviada_em timestamp with time zone;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS parecer_enviado_em timestamp with time zone;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.remessas_ai ADD COLUMN IF NOT EXISTS camara_tecnica_id text;
ALTER TABLE public.remessas_ai_itens ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.remessas_ai_itens ADD COLUMN IF NOT EXISTS remessa_ai_id uuid;
ALTER TABLE public.remessas_ai_itens ADD COLUMN IF NOT EXISTS auto_infracao_id uuid;
ALTER TABLE public.remessas_ai_itens ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS gera_nc boolean;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS item_contrato text;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS ativo boolean;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS nao_atendimento text;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS prazo_dias_padrao integer;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS frente text;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS rodovia text;
ALTER TABLE public.tipos_ocorrencia_dtr ADD COLUMN IF NOT EXISTS etapas_obra text;
ALTER TABLE public.tipos_unidade ADD COLUMN IF NOT EXISTS id uuid;
ALTER TABLE public.tipos_unidade ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE public.tipos_unidade ADD COLUMN IF NOT EXISTS servicos_aplicaveis text[];
ALTER TABLE public.tipos_unidade ADD COLUMN IF NOT EXISTS created_at timestamp with time zone;
ALTER TABLE public.tipos_unidade ADD COLUMN IF NOT EXISTS ativo boolean;
ALTER TABLE public.tipos_unidade ADD COLUMN IF NOT EXISTS codigo text;

-- itens_checklist
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='itens_checklist' LOOP EXECUTE format('DROP POLICY %I ON public.itens_checklist', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.itens_checklist FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.itens_checklist TO anon;
REVOKE ALL ON public.itens_checklist FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.itens_checklist TO authenticated;
CREATE POLICY "Leitura pública de itens de checklist" ON public.itens_checklist AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Operadores gerenciam itens de checklist" ON public.itens_checklist AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text])));
CREATE POLICY "Public Access" ON public.itens_checklist AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- tipos_unidade
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tipos_unidade' LOOP EXECUTE format('DROP POLICY %I ON public.tipos_unidade', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.tipos_unidade FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tipos_unidade TO anon;
REVOKE ALL ON public.tipos_unidade FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tipos_unidade TO authenticated;
CREATE POLICY "Leitura pública de tipos de unidade" ON public.tipos_unidade AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Operadores gerenciam tipos de unidade" ON public.tipos_unidade AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text])));
CREATE POLICY "Public Access" ON public.tipos_unidade AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);

-- prestadores_servico
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='prestadores_servico' LOOP EXECUTE format('DROP POLICY %I ON public.prestadores_servico', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.prestadores_servico FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.prestadores_servico TO anon;
REVOKE ALL ON public.prestadores_servico FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.prestadores_servico TO authenticated;
CREATE POLICY "Leitura pública de prestadores" ON public.prestadores_servico AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Operadores gerenciam prestadores" ON public.prestadores_servico AS PERMISSIVE FOR ALL TO authenticated
  USING ((get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text])));
CREATE POLICY "Prestadores visíveis para todos" ON public.prestadores_servico AS PERMISSIVE FOR SELECT TO public
  USING (true);
CREATE POLICY "prestadores_prestador_select_own" ON public.prestadores_servico AS PERMISSIVE FOR SELECT TO authenticated
  USING ((("current_role"() = 'prestador'::text) AND ((id = current_prestador_servico_id()) OR (user_id = auth.uid()))));
CREATE POLICY "prestadores_staff_all" ON public.prestadores_servico AS PERMISSIVE FOR ALL TO authenticated
  USING (is_staff())
  WITH CHECK (is_staff());

-- contratos
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='contratos' LOOP EXECUTE format('DROP POLICY %I ON public.contratos', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.contratos FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contratos TO anon;
REVOKE ALL ON public.contratos FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.contratos TO authenticated;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.contratos AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- remessas_ai
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='remessas_ai' LOOP EXECUTE format('DROP POLICY %I ON public.remessas_ai', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.remessas_ai FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.remessas_ai TO anon;
REVOKE ALL ON public.remessas_ai FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.remessas_ai TO authenticated;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.remessas_ai AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
CREATE POLICY "Fiscais e Admins: acesso por camara em remessas" ON public.remessas_ai AS PERMISSIVE FOR ALL TO authenticated
  USING (can_access_camara(camara_tecnica_id))
  WITH CHECK (can_access_camara(camara_tecnica_id));
CREATE POLICY "Prestadores: ler suas próprias remessas" ON public.remessas_ai AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id())));

-- remessas_ai_itens
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='remessas_ai_itens' LOOP EXECUTE format('DROP POLICY %I ON public.remessas_ai_itens', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.remessas_ai_itens FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.remessas_ai_itens TO anon;
REVOKE ALL ON public.remessas_ai_itens FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.remessas_ai_itens TO authenticated;
CREATE POLICY "Acesso total autenticado (DEV)" ON public.remessas_ai_itens AS PERMISSIVE FOR ALL TO authenticated
  USING (true);
CREATE POLICY "Fiscais e Admins: acesso por camara em itens de remessas" ON public.remessas_ai_itens AS PERMISSIVE FOR ALL TO authenticated
  USING (((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM remessas_ai r
  WHERE ((r.id = remessas_ai_itens.remessa_ai_id) AND can_access_camara(r.camara_tecnica_id)))))))
  WITH CHECK (((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM remessas_ai r
  WHERE ((r.id = remessas_ai_itens.remessa_ai_id) AND can_access_camara(r.camara_tecnica_id)))))));
CREATE POLICY "Prestadores: ler itens de suas próprias remessas" ON public.remessas_ai_itens AS PERMISSIVE FOR SELECT TO authenticated
  USING (((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM remessas_ai r
  WHERE ((r.id = remessas_ai_itens.remessa_ai_id) AND (r.prestador_servico_id = get_my_prestador_id()))))));

-- caters_deadline_extensions
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='caters_deadline_extensions' LOOP EXECUTE format('DROP POLICY %I ON public.caters_deadline_extensions', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.caters_deadline_extensions FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.caters_deadline_extensions TO anon;
REVOKE ALL ON public.caters_deadline_extensions FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.caters_deadline_extensions TO authenticated;
CREATE POLICY "authenticated users can manage deadline extensions" ON public.caters_deadline_extensions AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "e2e_test_user_own_rows_only" ON public.caters_deadline_extensions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (created_by = auth.uid())));
CREATE POLICY "e2e_test_user_own_rows_only_delete" ON public.caters_deadline_extensions AS RESTRICTIVE FOR DELETE TO authenticated
  USING (((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (created_by = auth.uid())));

-- tipos_ocorrencia_dtr
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tipos_ocorrencia_dtr' LOOP EXECUTE format('DROP POLICY %I ON public.tipos_ocorrencia_dtr', p.policyname); END LOOP; END $$;
REVOKE ALL ON public.tipos_ocorrencia_dtr FROM anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tipos_ocorrencia_dtr TO anon;
REVOKE ALL ON public.tipos_ocorrencia_dtr FROM authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public.tipos_ocorrencia_dtr TO authenticated;
CREATE POLICY "Escrita admin tipos_ocorrencia_dtr" ON public.tipos_ocorrencia_dtr AS PERMISSIVE FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
CREATE POLICY "Leitura autenticada tipos_ocorrencia_dtr" ON public.tipos_ocorrencia_dtr AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

-- storage.objects: remove as políticas locais e recria as de produção.
DO $$ DECLARE p record; BEGIN FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' LOOP EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname); END LOOP; END $$;
CREATE POLICY "Storage delete authenticated" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = ANY (ARRAY['termos-notificacao'::text, 'evidencias-determinacoes'::text, 'relatorios_fiscalizacao'::text, 'fotos_fiscalizacao'::text, 'documentos-prestadores'::text, 'documentos-autos'::text])));
CREATE POLICY "Storage insert authenticated" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = ANY (ARRAY['termos-notificacao'::text, 'evidencias-determinacoes'::text, 'relatorios_fiscalizacao'::text, 'fotos_fiscalizacao'::text, 'documentos-prestadores'::text, 'documentos-autos'::text])));
CREATE POLICY "Storage read authenticated" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = ANY (ARRAY['termos-notificacao'::text, 'evidencias-determinacoes'::text, 'relatorios_fiscalizacao'::text, 'fotos_fiscalizacao'::text, 'documentos-prestadores'::text, 'documentos-autos'::text])));
CREATE POLICY "Storage update authenticated" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = ANY (ARRAY['termos-notificacao'::text, 'evidencias-determinacoes'::text, 'relatorios_fiscalizacao'::text, 'fotos_fiscalizacao'::text, 'documentos-prestadores'::text, 'documentos-autos'::text])))
  WITH CHECK ((bucket_id = ANY (ARRAY['termos-notificacao'::text, 'evidencias-determinacoes'::text, 'relatorios_fiscalizacao'::text, 'fotos_fiscalizacao'::text, 'documentos-prestadores'::text, 'documentos-autos'::text])));
CREATE POLICY "documentos-autos authenticated all 1fhxxna_0" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'documentos-autos'::text));
CREATE POLICY "documentos-autos authenticated all 1fhxxna_1" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'documentos-autos'::text));
CREATE POLICY "documentos-autos authenticated all 1fhxxna_2" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'documentos-autos'::text));
CREATE POLICY "documentos-autos authenticated all 1fhxxna_3" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'documentos-autos'::text));
CREATE POLICY "documentos-prestadores authenticated all 1rt2ofe_0" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'documentos-prestadores'::text));
CREATE POLICY "documentos-prestadores authenticated all 1rt2ofe_1" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'documentos-prestadores'::text));
CREATE POLICY "documentos-prestadores authenticated all 1rt2ofe_2" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'documentos-prestadores'::text));
CREATE POLICY "documentos-prestadores authenticated all 1rt2ofe_3" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'documentos-prestadores'::text));
CREATE POLICY "documentos-termos authenticated all 16irk4e_0" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'documentos-termos'::text));
CREATE POLICY "documentos-termos authenticated all 16irk4e_1" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'documentos-termos'::text));
CREATE POLICY "documentos-termos authenticated all 16irk4e_2" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'documentos-termos'::text));
CREATE POLICY "documentos-termos authenticated all 16irk4e_3" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'documentos-termos'::text));
CREATE POLICY "kml_rodovias_authenticated_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'kml-rodovias'::text));
CREATE POLICY "kml_rodovias_authenticated_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'kml-rodovias'::text));
CREATE POLICY "kml_rodovias_authenticated_read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'kml-rodovias'::text));
CREATE POLICY "kml_rodovias_authenticated_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'kml-rodovias'::text));
CREATE POLICY "logos_entidades_authenticated_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'logos-entidades'::text));
CREATE POLICY "logos_entidades_authenticated_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'logos-entidades'::text));
CREATE POLICY "logos_entidades_authenticated_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'logos-entidades'::text));
CREATE POLICY "logos_entidades_public_access" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING ((bucket_id = 'logos-entidades'::text));
CREATE POLICY "p_evid_write" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING ((bucket_id = 'evidencias-determinacoes'::text))
  WITH CHECK ((bucket_id = 'evidencias-determinacoes'::text));
CREATE POLICY "relatorios_fiscalizacao authenticated all 1760aao_0" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((bucket_id = 'relatorios_fiscalizacao'::text));
CREATE POLICY "relatorios_fiscalizacao authenticated all 1760aao_1" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'relatorios_fiscalizacao'::text));
CREATE POLICY "relatorios_fiscalizacao authenticated all 1760aao_2" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'relatorios_fiscalizacao'::text));
CREATE POLICY "relatorios_fiscalizacao authenticated all 1760aao_3" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'relatorios_fiscalizacao'::text));
CREATE POLICY "tn_delete_authenticated" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING ((bucket_id = 'documentos-termos'::text));
CREATE POLICY "tn_update_authenticated" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((bucket_id = 'documentos-termos'::text))
  WITH CHECK ((bucket_id = 'documentos-termos'::text));
CREATE POLICY "tn_upload_authenticated" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'documentos-termos'::text));

-- Buckets de produção que faltam no banco local.
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-autos', 'documentos-autos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-prestadores', 'documentos-prestadores', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-termos', 'documentos-termos', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('evidencias-determinacoes', 'evidencias-determinacoes', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos_fiscalizacao', 'fotos_fiscalizacao', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kml-rodovias', 'kml-rodovias', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('logos-entidades', 'logos-entidades', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('relatorios_fiscalizacao', 'relatorios_fiscalizacao', false) ON CONFLICT (id) DO NOTHING;
