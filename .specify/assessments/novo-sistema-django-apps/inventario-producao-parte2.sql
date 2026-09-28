-- =====================================================================================
-- Inventário do banco de produção do fiscdsbagems — PARTE 2 (complemento)
-- Avaliação: .specify/assessments/novo-sistema-django-apps
--
-- Complementa inventario-producao.sql com o que faltava para conhecer o banco por inteiro:
--   25. papéis do banco e participação entre eles
--   26. privilégios padrão (o que objetos novos recebem automaticamente)
--   27. privilégios por coluna para os papéis da API
--   28. event triggers
--   29. dono, opções (ex.: security_invoker de views) e replica identity de cada tabela/view
--   30. dependências formais entre objetos (views/funções SQL → tabelas e colunas)
--   31. nomes dos segredos do Vault (SÓ nome e descrição; nunca o valor)
--   32. domínio real dos dados: valores distintos de colunas categóricas (status, tipo...)
--   33. estrutura das colunas JSON/JSONB: chaves usadas e seus tipos
--   34. padrão dos caminhos de arquivo por bucket (identificadores trocados por marcadores)
--   35. chaves de metadados do cadastro de usuário em auth.users (SÓ as chaves)
--
-- O QUE NÃO FAZ
--   - Não altera nada no banco (só cria uma função TEMPORÁRIA em pg_temp).
--   - Não traz dados pessoais nem segredos: valores de segredos do Vault não são lidos; de
--     auth.users só saem NOMES de chaves de metadados; a seção 32 só lista valores de colunas
--     com poucos valores distintos (até 25) e EXCLUI colunas cujo nome indica dado pessoal
--     (nome, responsável, razão social, contato, autoria), texto livre, endereço de arquivo,
--     localização ou identificador, e as tabelas profiles e audit_logs
--     (desta, só as colunas de categoria: tabela, operação).
--
-- COMO RODAR
--   Igual à parte 1: SQL Editor > New query > colar o arquivo inteiro > Run > Export CSV.
--   Salvar em: .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv
-- =====================================================================================

SET statement_timeout = '10min';

CREATE OR REPLACE FUNCTION pg_temp.inventario_fiscdsbagems_parte2()
RETURNS TABLE (ordem int, secao text, total int, conteudo jsonb)
LANGUAGE plpgsql
AS $fn$
#variable_conflict use_column
DECLARE
  v_excluidos text[] := ARRAY[
    'information_schema', 'auth', 'storage', 'realtime', '_realtime', 'supabase_functions',
    'supabase_migrations', 'extensions', 'graphql', 'graphql_public', 'vault', 'pgsodium',
    'pgsodium_masks', 'net', 'cron', 'pgbouncer', '_analytics', '_supavisor', 'pgtle',
    'repack', 'topology', 'tiger', 'tiger_data'
  ];
  -- Colunas que podem conter dado pessoal, texto livre, endereço de arquivo ou identificador:
  -- nunca têm valores listados na seção 32.
  v_padrao_sensivel text := '(nome|name|email|mail|cpf|cnpj|rg|telefone|phone|celular|endereco|address|'
    || 'logradouro|cep|descri|observ|obs$|texto|text|legenda|coment|justific|parecer|conteudo|content|'
    || 'mensagem|message|url|path|caminho|arquivo|file|token|senha|password|secret|assinatura|signature|'
    || 'hash|ip$|user_agent|latitude|longitude|coordenad|lat$|lng$|lon$|_id$|^id$|numero|codigo|code|'
    || 'resposta|answer|raw|payload|prompt|erro|error|motivo|fundament|recomend|determin|constat|'
    || 'titulo|title|assunto|subject|km|rodovia|trecho|placa|responsavel|razao|fantasia|contato|'
    || 'representante|procurador|autor|author|usuario|user|_by$|cargo|matricula|fiscal_|signat|cidade|municipio_nome)';
  v_schemas text[];
  v_total   int;
  v_j       jsonb;
  v_linhas  jsonb := '[]'::jsonb;
  v_n       bigint;
  r         record;
BEGIN
  SELECT array_agg(nspname ORDER BY nspname) INTO v_schemas
  FROM pg_namespace
  WHERE nspname !~ '^pg_' AND nspname <> ALL (v_excluidos);

  -- 25. Papéis do banco (não-sistema) e participação ---------------------------------------
  RETURN QUERY SELECT 25, 'papeis', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.papel), '[]'::jsonb)
  FROM (
    SELECT r.rolname AS papel, r.rolsuper AS superusuario, r.rolinherit AS herda,
           r.rolcanlogin AS pode_logar, r.rolbypassrls AS ignora_rls, r.rolcreaterole AS cria_papeis,
           r.rolconfig AS configuracao,
           ARRAY(SELECT g.rolname FROM pg_auth_members m JOIN pg_roles g ON g.oid = m.roleid
                 WHERE m.member = r.oid ORDER BY g.rolname) AS membro_de
    FROM pg_roles r
    WHERE r.rolname !~ '^pg_'
  ) x;

  -- 26. Privilégios padrão ------------------------------------------------------------------
  RETURN QUERY SELECT 26, 'privilegios_padrao', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.dono, x.esquema, x.tipo_objeto), '[]'::jsonb)
  FROM (
    SELECT pg_get_userbyid(d.defaclrole) AS dono, n.nspname AS esquema,
           CASE d.defaclobjtype WHEN 'r' THEN 'tabela' WHEN 'S' THEN 'sequencia' WHEN 'f' THEN 'funcao'
                                WHEN 'T' THEN 'tipo' WHEN 'n' THEN 'schema' END AS tipo_objeto,
           d.defaclacl::text[] AS privilegios
    FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
  ) x;

  -- 27. Privilégios por coluna para os papéis da API -----------------------------------------
  RETURN QUERY SELECT 27, 'privilegios_colunas', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.tabela, x.coluna, x.papel), '[]'::jsonb)
  FROM (
    SELECT table_name AS tabela, column_name AS coluna, grantee AS papel,
           string_agg(privilege_type, ',' ORDER BY privilege_type) AS privilegios
    FROM information_schema.column_privileges
    WHERE table_schema = ANY (v_schemas) AND grantee IN ('anon', 'authenticated', 'service_role', 'PUBLIC')
      -- só o que difere do privilégio da tabela inteira interessa; o filtro abaixo mantém as
      -- colunas cujo conjunto de privilégios não é o mesmo da tabela
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.role_table_grants t
        WHERE t.table_schema = column_privileges.table_schema AND t.table_name = column_privileges.table_name
          AND t.grantee = column_privileges.grantee AND t.privilege_type = column_privileges.privilege_type)
    GROUP BY table_name, column_name, grantee
  ) x;

  -- 28. Event triggers -----------------------------------------------------------------------
  RETURN QUERY SELECT 28, 'event_triggers', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.nome), '[]'::jsonb)
  FROM (
    SELECT e.evtname AS nome, e.evtevent AS evento, e.evtenabled::text AS situacao,
           e.evttags AS comandos, pn.nspname || '.' || p.proname AS funcao,
           pg_get_userbyid(e.evtowner) AS dono
    FROM pg_event_trigger e JOIN pg_proc p ON p.oid = e.evtfoid JOIN pg_namespace pn ON pn.oid = p.pronamespace
  ) x;

  -- 29. Dono, opções e replica identity de tabelas e views ----------------------------------
  RETURN QUERY SELECT 29, 'opcoes_tabelas', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.nome), '[]'::jsonb)
  FROM (
    SELECT c.relname AS nome,
           CASE c.relkind WHEN 'r' THEN 'tabela' WHEN 'p' THEN 'tabela_particionada' WHEN 'v' THEN 'view'
                          WHEN 'm' THEN 'view_materializada' WHEN 'f' THEN 'tabela_estrangeira' END AS tipo,
           pg_get_userbyid(c.relowner) AS dono,
           c.reloptions AS opcoes,
           CASE c.relreplident WHEN 'd' THEN 'padrao' WHEN 'n' THEN 'nenhuma' WHEN 'f' THEN 'completa'
                               WHEN 'i' THEN 'indice' END AS replica_identity,
           c.relispartition AS e_particao
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f') AND n.nspname = ANY (v_schemas)
  ) x;

  -- 30. Dependências formais: views e funções SQL → tabelas/colunas -------------------------
  --     (funções plpgsql não registram dependência no catálogo; o código delas, na parte 1,
  --     é analisado separadamente)
  RETURN QUERY SELECT 30, 'dependencias', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.dependente, x.depende_de), '[]'::jsonb)
  FROM (
    SELECT DISTINCT
           COALESCE(vc.relname, fp.proname) AS dependente,
           CASE WHEN vc.relname IS NOT NULL THEN 'view' ELSE 'funcao_sql' END AS tipo_dependente,
           tc.relname AS depende_de,
           ta.attname AS coluna
    FROM pg_depend d
    LEFT JOIN pg_rewrite rw ON d.classid = 'pg_rewrite'::regclass AND rw.oid = d.objid
    LEFT JOIN pg_class vc ON vc.oid = rw.ev_class
    LEFT JOIN pg_proc fp ON d.classid = 'pg_proc'::regclass AND fp.oid = d.objid
    JOIN pg_class tc ON d.refclassid = 'pg_class'::regclass AND tc.oid = d.refobjid
    JOIN pg_namespace tn ON tn.oid = tc.relnamespace
    LEFT JOIN pg_attribute ta ON ta.attrelid = tc.oid AND ta.attnum = d.refobjsubid AND d.refobjsubid > 0
    WHERE tn.nspname = ANY (v_schemas)
      AND (vc.relname IS NOT NULL AND vc.oid <> tc.oid OR fp.proname IS NOT NULL)
  ) x;

  -- 31. Segredos do Vault: SÓ nome e descrição, nunca o valor -------------------------------
  IF to_regclass('vault.secrets') IS NOT NULL THEN
    EXECUTE $q$
      SELECT count(*)::int, coalesce(jsonb_agg(jsonb_build_object('nome', name, 'descricao', description,
             'criado_em', created_at, 'atualizado_em', updated_at) ORDER BY name), '[]'::jsonb)
      FROM vault.secrets
    $q$ INTO v_total, v_j;
    RETURN QUERY SELECT 31, 'vault_nomes', v_total, v_j;
  ELSE
    RETURN QUERY SELECT 31, 'vault_nomes', 0, '[]'::jsonb;
  END IF;

  -- 32. Domínio real de colunas categóricas (até 25 valores distintos) ----------------------
  FOR r IN
    SELECT c.relname AS tab, a.attname AS col, format_type(a.atttypid, a.atttypmod) AS tipo
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ANY (v_schemas) AND c.relkind IN ('r', 'p')
      AND a.attnum > 0 AND NOT a.attisdropped
      AND format_type(a.atttypid, a.atttypmod) ~ '^(text|character varying|character|boolean|smallint|integer|text\[\]|character varying\[\])'
      AND c.relname NOT IN ('profiles')
      AND (c.relname <> 'audit_logs' OR a.attname IN ('table_name', 'action', 'operation', 'operacao', 'tabela'))
      AND (a.attname !~* v_padrao_sensivel OR a.attname IN ('status', 'tipo', 'role'))
  LOOP
    BEGIN
      EXECUTE format('SELECT count(DISTINCT %I) FROM public.%I', r.col, r.tab) INTO v_n;
      IF v_n BETWEEN 1 AND 25 THEN
        EXECUTE format(
          'SELECT jsonb_object_agg(coalesce(v::text, ''(nulo)''), n) FROM (SELECT %I AS v, count(*) AS n FROM public.%I GROUP BY 1) s',
          r.col, r.tab) INTO v_j;
        v_linhas := v_linhas || jsonb_build_object('tabela', r.tab, 'coluna', r.col, 'tipo', r.tipo,
                                                   'distintos', v_n, 'valores', v_j);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_linhas := v_linhas || jsonb_build_object('tabela', r.tab, 'coluna', r.col, 'erro', SQLERRM);
    END;
  END LOOP;
  RETURN QUERY SELECT 32, 'dominio_categorico', jsonb_array_length(v_linhas), v_linhas;

  -- 33. Estrutura das colunas JSON/JSONB: chaves e tipos usados ------------------------------
  --     Para objeto: chaves do objeto. Para lista de objetos: chaves dos elementos.
  v_linhas := '[]'::jsonb;
  FOR r IN
    SELECT c.relname AS tab, a.attname AS col, format_type(a.atttypid, a.atttypmod) AS tipo
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ANY (v_schemas) AND c.relkind IN ('r', 'p')
      AND a.attnum > 0 AND NOT a.attisdropped
      AND a.atttypid IN ('json'::regtype, 'jsonb'::regtype)
  LOOP
    BEGIN
      EXECUTE format($q$
        WITH v AS (SELECT %1$I::jsonb AS j FROM public.%2$I WHERE %1$I IS NOT NULL),
        formas AS (SELECT jsonb_typeof(j) AS forma, count(*) AS n FROM v GROUP BY 1),
        elementos AS (
          SELECT j AS e FROM v WHERE jsonb_typeof(j) = 'object'
          UNION ALL
          SELECT e FROM v, jsonb_array_elements(CASE WHEN jsonb_typeof(j) = 'array' THEN j ELSE '[]'::jsonb END) e
          WHERE jsonb_typeof(e) = 'object'
        ),
        tipos_elementos AS (
          SELECT jsonb_typeof(e) AS tipo, count(*) AS n
          FROM v, jsonb_array_elements(CASE WHEN jsonb_typeof(j) = 'array' THEN j ELSE '[]'::jsonb END) e
          GROUP BY 1
        ),
        chaves AS (
          SELECT k.key AS chave, jsonb_typeof(k.value) AS tipo, count(*) AS n
          FROM elementos, jsonb_each(e) k GROUP BY 1, 2
        )
        SELECT jsonb_build_object(
          'linhas_preenchidas', (SELECT count(*) FROM v),
          'formas', (SELECT coalesce(jsonb_object_agg(forma, n), '{}'::jsonb) FROM formas),
          'tipos_dos_elementos_das_listas', (SELECT coalesce(jsonb_object_agg(tipo, n), '{}'::jsonb) FROM tipos_elementos),
          'chaves', (SELECT coalesce(jsonb_agg(jsonb_build_object('chave', chave, 'tipo', tipo, 'ocorrencias', n)
                                                ORDER BY chave, tipo), '[]'::jsonb) FROM chaves)
        )
      $q$, r.col, r.tab) INTO v_j;
      v_linhas := v_linhas || (jsonb_build_object('tabela', r.tab, 'coluna', r.col, 'tipo', r.tipo) || v_j);
    EXCEPTION WHEN OTHERS THEN
      v_linhas := v_linhas || jsonb_build_object('tabela', r.tab, 'coluna', r.col, 'erro', SQLERRM);
    END;
  END LOOP;
  RETURN QUERY SELECT 33, 'estrutura_json', jsonb_array_length(v_linhas), v_linhas;

  -- 34. Padrão dos caminhos de arquivo por bucket --------------------------------------------
  --     UUIDs viram <uuid>, sequências de dígitos viram <n>, e o último segmento (nome do
  --     arquivo) vira <arquivo>.<extensão> — nenhum nome de arquivo real sai daqui.
  RETURN QUERY SELECT 34, 'padroes_caminho_arquivos', count(*)::int, coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.bucket, x.arquivos DESC), '[]'::jsonb)
  FROM (
    SELECT bucket, padrao, count(*) AS arquivos FROM (
      SELECT o.bucket_id AS bucket,
             regexp_replace(
               regexp_replace(
                 regexp_replace(o.name, '/[^/]*?(\.[A-Za-z0-9]{1,6})?$', '/<arquivo>\1'),
                 '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}', '<uuid>', 'g'),
               '[0-9]{2,}', '<n>', 'g') AS padrao
      FROM storage.objects o
    ) s
    GROUP BY bucket, padrao
  ) x;

  -- 35. Chaves de metadados do cadastro de usuário (SÓ os nomes das chaves) -------------------
  EXECUTE $q$
    SELECT jsonb_build_object(
      'raw_user_meta_data', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (
          SELECT k, count(*) AS n FROM auth.users, jsonb_object_keys(coalesce(raw_user_meta_data, '{}'::jsonb)) k GROUP BY k) s),
      'raw_app_meta_data', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (
          SELECT k, count(*) AS n FROM auth.users, jsonb_object_keys(coalesce(raw_app_meta_data, '{}'::jsonb)) k GROUP BY k) s)
    )
  $q$ INTO v_j;
  RETURN QUERY SELECT 35, 'chaves_metadados_usuario', 1, v_j;
END;
$fn$;

SELECT ordem, secao, total, conteudo
FROM pg_temp.inventario_fiscdsbagems_parte2()
ORDER BY ordem, secao;
