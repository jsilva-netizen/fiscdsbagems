-- =====================================================================================
-- Inventário do banco de produção do fiscdsbagems (Supabase / PostgreSQL)
-- Avaliação: .specify/assessments/novo-sistema-django-apps
--
-- O QUE FAZ
--   Lê o catálogo do banco e devolve, em ~25 linhas (uma por seção), tudo o que define a
--   estrutura e o comportamento do banco: tabelas, colunas, restrições, índices, views,
--   funções (código completo), gatilhos, políticas de RLS (inclusive de storage), tipos,
--   sequências, permissões, publicações, buckets, volume de arquivos, migrations aplicadas,
--   agendamentos, contagem exata de linhas por tabela e o conteúdo das tabelas de
--   configuração (diretorias, câmaras, tipos de unidade, itens de checklist, tipos de
--   ocorrência DTR, municípios).
--
-- O QUE NÃO FAZ
--   - Não altera nada no banco. Cria só uma função TEMPORÁRIA (pg_temp), que some ao fim
--     da sessão.
--   - Não extrai dados pessoais nem segredos: de auth.users e profiles, só contagens
--     agregadas; nenhum e-mail, nome, senha, token ou segredo do vault.
--
-- COMO RODAR
--   1. Supabase > SQL Editor > New query. Cole este arquivo INTEIRO e clique em Run.
--   2. No painel de resultados: Export (ou Download) > CSV.
--   3. Salve o arquivo em:
--        .specify/assessments/novo-sistema-django-apps/inventario-producao.csv
--   Se o resultado ficar grande demais para o painel, rode por partes trocando a última
--   linha por, por exemplo:  ... WHERE ordem BETWEEN 1 AND 8 ...  e salve cada parte como
--   inventario-producao-parte1.csv, -parte2.csv etc.
-- =====================================================================================

SET statement_timeout = '10min';

CREATE OR REPLACE FUNCTION pg_temp.inventario_fiscdsbagems()
RETURNS TABLE (ordem int, secao text, total int, conteudo jsonb)
LANGUAGE plpgsql
AS $fn$
#variable_conflict use_column
DECLARE
  -- Schemas mantidos pela plataforma Supabase/extensões: fora do inventário da aplicação
  -- (auth e storage entram em seções próprias, só com o que a aplicação define ou usa).
  v_excluidos text[] := ARRAY[
    'information_schema', 'auth', 'storage', 'realtime', '_realtime', 'supabase_functions',
    'supabase_migrations', 'extensions', 'graphql', 'graphql_public', 'vault', 'pgsodium',
    'pgsodium_masks', 'net', 'cron', 'pgbouncer', '_analytics', '_supavisor', 'pgtle',
    'repack', 'topology', 'tiger', 'tiger_data'
  ];
  v_schemas   text[];
  v_contagens jsonb := '{}'::jsonb;
  v_n         bigint;
  v_total     int;
  v_j         jsonb;
  v_k         jsonb;
  v_tabela    text;
  v_coluna    text;
  r           record;
BEGIN
  SELECT array_agg(nspname ORDER BY nspname) INTO v_schemas
  FROM pg_namespace
  WHERE nspname !~ '^pg_' AND nspname <> ALL (v_excluidos);

  -- Contagem EXATA de linhas de cada tabela da aplicação.
  FOR r IN
    SELECT n.nspname AS esq, c.relname AS tab
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p') AND n.nspname = ANY (v_schemas)
  LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM %I.%I', r.esq, r.tab) INTO v_n;
      v_contagens := v_contagens || jsonb_build_object(r.esq || '.' || r.tab, v_n);
    EXCEPTION WHEN OTHERS THEN
      v_contagens := v_contagens || jsonb_build_object(r.esq || '.' || r.tab, 'erro: ' || SQLERRM);
    END;
  END LOOP;

  -- 1. Metadados --------------------------------------------------------------------------
  RETURN QUERY SELECT 1, 'metadados', 1, jsonb_build_object(
    'gerado_em', now(),
    'versao_postgres', version(),
    'banco', current_database(),
    'usuario', current_user,
    'schemas_da_aplicacao', to_jsonb(v_schemas),
    'schemas_excluidos', to_jsonb(v_excluidos),
    'versao_script', '1'
  );

  -- 2. Extensões --------------------------------------------------------------------------
  RETURN QUERY SELECT 2, 'extensoes', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.nome), '[]'::jsonb)
  FROM (
    SELECT e.extname AS nome, e.extversion AS versao, n.nspname AS esquema
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
  ) x;

  -- 3. Schemas ----------------------------------------------------------------------------
  RETURN QUERY SELECT 3, 'schemas', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.nome), '[]'::jsonb)
  FROM (
    SELECT n.nspname AS nome, pg_get_userbyid(n.nspowner) AS dono,
           obj_description(n.oid, 'pg_namespace') AS comentario,
           n.nspname = ANY (v_schemas) AS inventariado
    FROM pg_namespace n
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'
  ) x;

  -- 4. Tabelas, views e afins (com contagem exata de linhas) ------------------------------
  RETURN QUERY SELECT 4, 'tabelas', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.nome), '[]'::jsonb)
  FROM (
    SELECT n.nspname AS esquema, c.relname AS nome,
           CASE c.relkind WHEN 'r' THEN 'tabela' WHEN 'p' THEN 'tabela_particionada'
                          WHEN 'v' THEN 'view' WHEN 'm' THEN 'view_materializada'
                          WHEN 'f' THEN 'tabela_estrangeira' END AS tipo,
           c.relrowsecurity AS rls_ativo, c.relforcerowsecurity AS rls_forcado,
           obj_description(c.oid, 'pg_class') AS comentario,
           c.reltuples::bigint AS linhas_estimadas,
           v_contagens -> (n.nspname || '.' || c.relname) AS linhas_exatas,
           pg_total_relation_size(c.oid) AS tamanho_bytes
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f') AND n.nspname = ANY (v_schemas)
  ) x;

  -- 5. Colunas ----------------------------------------------------------------------------
  RETURN QUERY SELECT 5, 'colunas', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.tabela, x.posicao), '[]'::jsonb)
  FROM (
    SELECT n.nspname AS esquema, c.relname AS tabela, a.attnum AS posicao, a.attname AS coluna,
           format_type(a.atttypid, a.atttypmod) AS tipo, a.attnotnull AS obrigatoria,
           pg_get_expr(d.adbin, d.adrelid) AS padrao,
           NULLIF(a.attidentity::text, '') AS identidade,
           NULLIF(a.attgenerated::text, '') AS gerada,
           col_description(c.oid, a.attnum) AS comentario
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attnum > 0 AND NOT a.attisdropped
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f') AND n.nspname = ANY (v_schemas)
  ) x;

  -- 6. Restrições (PK, FK, UNIQUE, CHECK, EXCLUDE) ------------------------------------------
  RETURN QUERY SELECT 6, 'restricoes', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.tabela, x.nome), '[]'::jsonb)
  FROM (
    SELECT n.nspname AS esquema, c.relname AS tabela, con.conname AS nome,
           CASE con.contype WHEN 'p' THEN 'chave_primaria' WHEN 'f' THEN 'chave_estrangeira'
                            WHEN 'u' THEN 'unica' WHEN 'c' THEN 'verificacao'
                            WHEN 'x' THEN 'exclusao' WHEN 't' THEN 'gatilho'
                            ELSE con.contype::text END AS tipo,
           pg_get_constraintdef(con.oid, true) AS definicao
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ANY (v_schemas)
  ) x;

  -- 7. Índices ----------------------------------------------------------------------------
  RETURN QUERY SELECT 7, 'indices', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.tabela, x.nome), '[]'::jsonb)
  FROM (
    SELECT schemaname AS esquema, tablename AS tabela, indexname AS nome, indexdef AS definicao
    FROM pg_indexes WHERE schemaname = ANY (v_schemas)
  ) x;

  -- 8. Views e views materializadas (definição completa) ----------------------------------
  RETURN QUERY SELECT 8, 'views', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.nome), '[]'::jsonb)
  FROM (
    SELECT schemaname AS esquema, viewname AS nome, 'view' AS tipo, definition AS definicao
    FROM pg_views WHERE schemaname = ANY (v_schemas)
    UNION ALL
    SELECT schemaname, matviewname, 'view_materializada', definition
    FROM pg_matviews WHERE schemaname = ANY (v_schemas)
  ) x;

  -- 9. Funções e procedimentos da aplicação (código completo; exclui os de extensões) -----
  RETURN QUERY SELECT 9, 'funcoes', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.nome, x.argumentos), '[]'::jsonb)
  FROM (
    SELECT n.nspname AS esquema, p.proname AS nome,
           pg_get_function_identity_arguments(p.oid) AS argumentos,
           pg_get_function_result(p.oid) AS retorno,
           l.lanname AS linguagem,
           CASE p.prokind WHEN 'f' THEN 'funcao' WHEN 'p' THEN 'procedimento' END AS tipo,
           p.prosecdef AS security_definer,
           CASE p.provolatile WHEN 'i' THEN 'immutable' WHEN 's' THEN 'stable' ELSE 'volatile' END AS volatilidade,
           p.proconfig AS configuracao,
           obj_description(p.oid, 'pg_proc') AS comentario,
           pg_get_functiondef(p.oid) AS definicao
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_language l ON l.oid = p.prolang
    WHERE n.nspname = ANY (v_schemas) AND p.prokind IN ('f', 'p')
      AND NOT EXISTS (SELECT 1 FROM pg_depend dep WHERE dep.objid = p.oid AND dep.deptype = 'e')
  ) x;

  -- 10. Gatilhos: nas tabelas da aplicação, ou que chamam funções da aplicação ------------
  --     (inclui, por exemplo, gatilhos em auth.users que criam o perfil do usuário)
  RETURN QUERY SELECT 10, 'gatilhos', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.tabela, x.nome), '[]'::jsonb)
  FROM (
    SELECT n.nspname AS esquema, c.relname AS tabela, t.tgname AS nome,
           CASE t.tgenabled WHEN 'O' THEN 'ativo' WHEN 'D' THEN 'desativado'
                            WHEN 'R' THEN 'replica' WHEN 'A' THEN 'sempre' END AS situacao,
           pn.nspname || '.' || p.proname AS funcao,
           pg_get_triggerdef(t.oid, true) AS definicao
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace pn ON pn.oid = p.pronamespace
    WHERE NOT t.tgisinternal
      AND (n.nspname = ANY (v_schemas) OR pn.nspname = ANY (v_schemas))
  ) x;

  -- 11. Políticas de RLS (aplicação e storage) --------------------------------------------
  RETURN QUERY SELECT 11, 'politicas', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.tabela, x.nome), '[]'::jsonb)
  FROM (
    SELECT schemaname AS esquema, tablename AS tabela, policyname AS nome,
           permissive AS permissiva, roles AS papeis, cmd AS comando,
           qual AS condicao_using, with_check AS condicao_with_check
    FROM pg_policies
    WHERE schemaname = ANY (v_schemas) OR schemaname = 'storage'
  ) x;

  -- 12. Tipos: enums, domínios e tipos compostos --------------------------------------------
  RETURN QUERY SELECT 12, 'tipos', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.nome), '[]'::jsonb)
  FROM (
    SELECT n.nspname AS esquema, t.typname AS nome, 'enum' AS tipo,
           to_jsonb(ARRAY(SELECT e.enumlabel::text FROM pg_enum e WHERE e.enumtypid = t.oid ORDER BY e.enumsortorder)) AS valores,
           NULL::text AS tipo_base
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'e' AND n.nspname = ANY (v_schemas)
    UNION ALL
    SELECT n.nspname, t.typname, 'dominio',
           to_jsonb(ARRAY(SELECT pg_get_constraintdef(con.oid) FROM pg_constraint con WHERE con.contypid = t.oid)),
           format_type(t.typbasetype, t.typtypmod)
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typtype = 'd' AND n.nspname = ANY (v_schemas)
    UNION ALL
    SELECT n.nspname, t.typname, 'composto',
           to_jsonb(ARRAY(SELECT a.attname || ' ' || format_type(a.atttypid, a.atttypmod)
                          FROM pg_attribute a WHERE a.attrelid = t.typrelid AND a.attnum > 0 AND NOT a.attisdropped
                          ORDER BY a.attnum)),
           NULL
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace JOIN pg_class c ON c.oid = t.typrelid
    WHERE t.typtype = 'c' AND c.relkind = 'c' AND n.nspname = ANY (v_schemas)
  ) x;

  -- 13. Sequências ------------------------------------------------------------------------
  RETURN QUERY SELECT 13, 'sequencias', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.nome), '[]'::jsonb)
  FROM (
    SELECT schemaname AS esquema, sequencename AS nome, data_type::text AS tipo,
           start_value AS inicio, increment_by AS incremento, last_value AS ultimo_valor
    FROM pg_sequences WHERE schemaname = ANY (v_schemas)
  ) x;

  -- 14. Permissões em tabelas para os papéis da API ---------------------------------------
  RETURN QUERY SELECT 14, 'permissoes_tabelas', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.tabela, x.papel), '[]'::jsonb)
  FROM (
    SELECT table_schema AS esquema, table_name AS tabela, grantee AS papel,
           string_agg(privilege_type, ',' ORDER BY privilege_type) AS privilegios
    FROM information_schema.role_table_grants
    WHERE table_schema = ANY (v_schemas)
      AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
    GROUP BY table_schema, table_name, grantee
  ) x;

  -- 15. Permissão de execução de funções para os papéis da API ----------------------------
  RETURN QUERY SELECT 15, 'permissoes_funcoes', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.esquema, x.funcao, x.papel), '[]'::jsonb)
  FROM (
    SELECT DISTINCT routine_schema AS esquema, routine_name AS funcao, grantee AS papel
    FROM information_schema.role_routine_grants
    WHERE routine_schema = ANY (v_schemas) AND privilege_type = 'EXECUTE'
      AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
  ) x;

  -- 16. Publicações (Realtime / replicação lógica) ----------------------------------------
  RETURN QUERY SELECT 16, 'publicacoes', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.publicacao, x.esquema, x.tabela), '[]'::jsonb)
  FROM (
    SELECT pubname AS publicacao, schemaname AS esquema, tablename AS tabela FROM pg_publication_tables
  ) x;

  -- 17. Buckets de arquivos (configuração completa, sem o dono) ---------------------------
  RETURN QUERY SELECT 17, 'buckets', count(*)::int, coalesce(jsonb_agg(to_jsonb(b) - 'owner' - 'owner_id' ORDER BY b.id), '[]'::jsonb)
  FROM storage.buckets b;

  -- 18. Volume de arquivos por bucket -----------------------------------------------------
  RETURN QUERY SELECT 18, 'arquivos_por_bucket', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.bucket), '[]'::jsonb)
  FROM (
    SELECT bucket_id AS bucket, count(*) AS arquivos,
           sum(coalesce((metadata ->> 'size')::bigint, 0)) AS bytes,
           min(created_at) AS primeiro, max(created_at) AS ultimo
    FROM storage.objects GROUP BY bucket_id
  ) x;

  -- 19. Primeiros segmentos de caminho por bucket (convenção de pastas; até 20 por bucket) --
  RETURN QUERY SELECT 19, 'prefixos_por_bucket', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.bucket, x.arquivos DESC), '[]'::jsonb)
  FROM (
    SELECT bucket, prefixo, arquivos FROM (
      SELECT bucket_id AS bucket, split_part(name, '/', 1) AS prefixo, count(*) AS arquivos,
             row_number() OVER (PARTITION BY bucket_id ORDER BY count(*) DESC) AS pos
      FROM storage.objects GROUP BY bucket_id, split_part(name, '/', 1)
    ) s WHERE pos <= 20
  ) x;

  -- 20. Migrations aplicadas (registro do Supabase; sem o SQL, que é grande) ---------------
  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    EXECUTE $q$
      SELECT count(*)::int,
             coalesce(jsonb_agg(to_jsonb(m) - 'statements' - 'created_by' - 'idempotency_key' ORDER BY m.version), '[]'::jsonb)
      FROM supabase_migrations.schema_migrations m
    $q$ INTO v_total, v_j;
    RETURN QUERY SELECT 20, 'migracoes_aplicadas', v_total, v_j;
  ELSE
    RETURN QUERY SELECT 20, 'migracoes_aplicadas', 0, '"tabela supabase_migrations.schema_migrations não existe"'::jsonb;
  END IF;

  -- 21. Agendamentos (pg_cron) ------------------------------------------------------------
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE $q$
      SELECT count(*)::int, coalesce(jsonb_agg(to_jsonb(j) ORDER BY j.jobid), '[]'::jsonb) FROM cron.job j
    $q$ INTO v_total, v_j;
    RETURN QUERY SELECT 21, 'agendamentos', v_total, v_j;
  ELSE
    RETURN QUERY SELECT 21, 'agendamentos', 0, '"pg_cron não instalado"'::jsonb;
  END IF;

  -- 22. Autenticação: só agregados, nenhum dado pessoal -----------------------------------
  EXECUTE $q$
    SELECT jsonb_build_object(
      'usuarios', (SELECT count(*) FROM auth.users),
      'com_email_confirmado', (SELECT count(*) FROM auth.users WHERE email_confirmed_at IS NOT NULL),
      'com_login_nos_ultimos_90_dias', (SELECT count(*) FROM auth.users WHERE last_sign_in_at > now() - interval '90 days'),
      'por_provedor', (SELECT coalesce(jsonb_object_agg(provider, n), '{}'::jsonb)
                       FROM (SELECT provider, count(*) AS n FROM auth.identities GROUP BY provider) s)
    )
  $q$ INTO v_j;
  RETURN QUERY SELECT 22, 'autenticacao', 1, v_j;

  -- 23. Perfis: contagem por papel, situação, diretoria e câmara (só agregados) ------------
  IF to_regclass('public.profiles') IS NOT NULL THEN
    v_j := '{}'::jsonb;
    FOREACH v_coluna IN ARRAY ARRAY['role', 'ativo', 'diretoria_id', 'camara_tecnica_id'] LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = v_coluna) THEN
        EXECUTE format(
          'SELECT coalesce(jsonb_object_agg(coalesce(v::text, ''(nulo)''), n), ''{}''::jsonb)
             FROM (SELECT %I AS v, count(*) AS n FROM public.profiles GROUP BY 1) s', v_coluna)
        INTO v_k;
        v_j := v_j || jsonb_build_object(v_coluna, v_k);
      END IF;
    END LOOP;
    RETURN QUERY SELECT 23, 'perfis_agregados', 1, v_j;
  END IF;

  -- 24. Conteúdo das tabelas de configuração (sem dados pessoais) -------------------------
  FOREACH v_tabela IN ARRAY ARRAY['diretorias', 'camaras_tecnicas', 'tipos_unidade', 'itens_checklist',
                                   'tipos_ocorrencia_dtr', 'municipios'] LOOP
    IF to_regclass('public.' || v_tabela) IS NOT NULL THEN
      EXECUTE format('SELECT count(*)::int, coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM public.%I t', v_tabela)
        INTO v_total, v_j;
      RETURN QUERY SELECT 24, 'dados_referencia.' || v_tabela, v_total, v_j;
    END IF;
  END LOOP;
END;
$fn$;

SELECT ordem, secao, total, conteudo
FROM pg_temp.inventario_fiscdsbagems()
ORDER BY ordem, secao;
