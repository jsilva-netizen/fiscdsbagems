"""Gera as fixtures de inventário usadas nos testes (T003).

Mesmo formato dos CSVs exportados pelo SQL Editor (colunas ordem, secao, total, conteudo, com
`conteudo` em JSON), mas com um banco inventado e mínimo. Nenhum dado real de produção.

Rodar de dentro de specs/003-base-dados-producao/:  python -m ferramentas.testes.fixtures.gerar_fixtures
"""

import csv
import json
from pathlib import Path

AQUI = Path(__file__).resolve().parent


def _col(tabela, pos, coluna, tipo, obrigatoria=False, padrao=None):
    return {"esquema": "public", "tabela": tabela, "posicao": pos, "coluna": coluna, "tipo": tipo,
            "obrigatoria": obrigatoria, "padrao": padrao, "identidade": None, "gerada": None, "comentario": None}


FUNCAO_ESCREVE = """CREATE OR REPLACE FUNCTION public.registrar_filho(p_pai uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  IF NOT public.eh_admin() THEN RAISE EXCEPTION 'sem permissão'; END IF;
  INSERT INTO public.filho (pai_id) VALUES (p_pai);
  UPDATE public.pai SET atualizado = now() WHERE id = p_pai;
  PERFORM 1 FROM public.pai_x;
END; $function$"""

FUNCAO_ADMIN = """CREATE OR REPLACE FUNCTION public.eh_admin()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $function$
  SELECT true
$function$"""

FUNCAO_SOBRECARGA_1 = """CREATE OR REPLACE FUNCTION public.resumo(p_ano integer)
 RETURNS integer LANGUAGE sql AS $function$ SELECT count(*)::int FROM public.pai $function$"""

FUNCAO_SOBRECARGA_2 = """CREATE OR REPLACE FUNCTION public.resumo(p_ano integer, p_tipo text)
 RETURNS integer LANGUAGE sql AS $function$ SELECT count(*)::int FROM public.filho $function$"""

FUNCAO_GATILHO = """CREATE OR REPLACE FUNCTION public.marcar_atualizacao()
 RETURNS trigger LANGUAGE plpgsql AS $function$ BEGIN NEW.atualizado := now(); RETURN NEW; END; $function$"""

FUNCAO_NOVO_USUARIO = """CREATE OR REPLACE FUNCTION public.novo_usuario()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN INSERT INTO public.pai (id) VALUES (NEW.id); RETURN NEW; END; $function$"""


def _funcao(nome, argumentos, definicao, retorno="void", seguranca=False):
    return {"esquema": "public", "nome": nome, "argumentos": argumentos, "retorno": retorno, "linguagem": "plpgsql",
            "tipo": "funcao", "security_definer": seguranca, "volatilidade": "volatile", "configuracao": None,
            "comentario": None, "definicao": definicao}


def parte1():
    tabelas = [
        {"esquema": "public", "nome": "pai", "tipo": "tabela", "rls_ativo": True, "rls_forcado": False,
         "comentario": None, "linhas_estimadas": 2, "linhas_exatas": 2, "tamanho_bytes": 16384},
        {"esquema": "public", "nome": "pai_x", "tipo": "tabela", "rls_ativo": True, "rls_forcado": False,
         "comentario": None, "linhas_estimadas": 0, "linhas_exatas": 0, "tamanho_bytes": 8192},
        {"esquema": "public", "nome": "filho", "tipo": "tabela", "rls_ativo": True, "rls_forcado": False,
         "comentario": "Filhos de teste.", "linhas_estimadas": 5, "linhas_exatas": 5, "tamanho_bytes": 16384},
        {"esquema": "public", "nome": "resumo_filhos", "tipo": "view", "rls_ativo": False, "rls_forcado": False,
         "comentario": None, "linhas_estimadas": 0, "linhas_exatas": None, "tamanho_bytes": 0},
    ]
    colunas = [
        _col("pai", 1, "id", "uuid", True, "gen_random_uuid()"), _col("pai", 2, "atualizado", "timestamp with time zone"),
        _col("pai_x", 1, "id", "uuid", True),
        _col("filho", 1, "id", "uuid", True, "gen_random_uuid()"), _col("filho", 2, "pai_id", "uuid", True),
        _col("filho", 3, "status", "text", False, "'aberto'::text"), _col("filho", 4, "fotos", "jsonb"),
        _col("filho", 5, "atualizado", "timestamp with time zone"),
        _col("resumo_filhos", 1, "pai_id", "uuid"), _col("resumo_filhos", 2, "total", "bigint"),
    ]
    restricoes = [
        {"esquema": "public", "tabela": "pai", "nome": "pai_pkey", "tipo": "chave_primaria", "definicao": "PRIMARY KEY (id)"},
        {"esquema": "public", "tabela": "filho", "nome": "filho_pkey", "tipo": "chave_primaria", "definicao": "PRIMARY KEY (id)"},
        {"esquema": "public", "tabela": "filho", "nome": "filho_pai_id_fkey", "tipo": "chave_estrangeira",
         "definicao": "FOREIGN KEY (pai_id) REFERENCES pai(id) ON DELETE CASCADE"},
        {"esquema": "public", "tabela": "filho", "nome": "filho_status_check", "tipo": "verificacao",
         "definicao": "CHECK (status = ANY (ARRAY['aberto'::text, 'fechado'::text]))"},
        {"esquema": "public", "tabela": "pai", "nome": "pai_id_key", "tipo": "unica", "definicao": "UNIQUE (id)"},
        {"esquema": "public", "tabela": "pai", "nome": "pai_id_fkey", "tipo": "chave_estrangeira",
         "definicao": "FOREIGN KEY (id) REFERENCES auth.users(id)"},
    ]
    indices = [{"esquema": "public", "tabela": "filho", "nome": "idx_filho_pai",
                "definicao": "CREATE INDEX idx_filho_pai ON public.filho USING btree (pai_id)"}]
    views = [{"esquema": "public", "nome": "resumo_filhos", "tipo": "view",
              "definicao": " SELECT pai_id, count(*) AS total FROM filho GROUP BY pai_id;"}]
    funcoes = [
        _funcao("registrar_filho", "p_pai uuid", FUNCAO_ESCREVE, seguranca=True),
        _funcao("eh_admin", "", FUNCAO_ADMIN, "boolean", True),
        _funcao("resumo", "p_ano integer", FUNCAO_SOBRECARGA_1, "integer"),
        _funcao("resumo", "p_ano integer, p_tipo text", FUNCAO_SOBRECARGA_2, "integer"),
        _funcao("marcar_atualizacao", "", FUNCAO_GATILHO, "trigger"),
        _funcao("novo_usuario", "", FUNCAO_NOVO_USUARIO, "trigger", True),
    ]
    gatilhos = [
        {"esquema": "public", "tabela": "filho", "nome": "trg_filho_atualizado", "situacao": "ativo",
         "funcao": "public.marcar_atualizacao",
         "definicao": "CREATE TRIGGER trg_filho_atualizado BEFORE UPDATE ON filho FOR EACH ROW EXECUTE FUNCTION marcar_atualizacao()"},
        {"esquema": "auth", "tabela": "users", "nome": "ao_criar_usuario", "situacao": "ativo",
         "funcao": "public.novo_usuario",
         "definicao": "CREATE TRIGGER ao_criar_usuario AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION novo_usuario()"},
    ]
    politicas = [
        {"esquema": "public", "tabela": "filho", "nome": "admin faz tudo", "permissiva": "PERMISSIVE",
         "papeis": ["authenticated"], "comando": "ALL", "condicao_using": "eh_admin()", "condicao_with_check": "eh_admin()"},
        {"esquema": "storage", "tabela": "objects", "nome": "ler fotos", "permissiva": "PERMISSIVE",
         "papeis": ["authenticated"], "comando": "SELECT", "condicao_using": "(bucket_id = 'fotos'::text)",
         "condicao_with_check": None},
    ]
    tipos = [{"esquema": "public", "nome": "situacao_filho", "tipo": "enum", "valores": ["aberto", "fechado"], "tipo_base": None}]
    buckets = [{"id": "fotos", "name": "fotos", "public": False, "file_size_limit": 5242880,
                "allowed_mime_types": ["image/jpeg"], "created_at": "2026-01-01T00:00:00+00:00"}]
    return [
        (1, "metadados", 1, {"banco": "postgres", "usuario": "postgres", "gerado_em": "2026-01-01T00:00:00+00:00",
                             "versao_script": "1", "versao_postgres": "PostgreSQL 17", "schemas_excluidos": ["auth"],
                             "schemas_da_aplicacao": ["public"]}),
        (2, "extensoes", 1, [{"nome": "pgcrypto", "versao": "1.3", "esquema": "extensions"}]),
        (3, "schemas", 1, [{"nome": "public", "dono": "postgres", "comentario": None, "inventariado": True}]),
        (4, "tabelas", len(tabelas), tabelas),
        (5, "colunas", len(colunas), colunas),
        (6, "restricoes", len(restricoes), restricoes),
        (7, "indices", len(indices), indices),
        (8, "views", len(views), views),
        (9, "funcoes", len(funcoes), funcoes),
        (10, "gatilhos", len(gatilhos), gatilhos),
        (11, "politicas", len(politicas), politicas),
        (12, "tipos", len(tipos), tipos),
        (13, "sequencias", 0, []),
        (14, "permissoes_tabelas", 1, [{"esquema": "public", "tabela": "filho", "papel": "anon", "privilegios": "SELECT"}]),
        (15, "permissoes_funcoes", 1, [{"esquema": "public", "funcao": "eh_admin", "papel": "anon"}]),
        (16, "publicacoes", 0, []),
        (17, "buckets", len(buckets), buckets),
        (18, "arquivos_por_bucket", 1, [{"bucket": "fotos", "arquivos": 3, "bytes": 3000,
                                         "primeiro": "2026-01-01T00:00:00+00:00", "ultimo": "2026-01-02T00:00:00+00:00"}]),
        (19, "prefixos_por_bucket", 1, [{"bucket": "fotos", "prefixo": "fiscalizacoes", "arquivos": 3}]),
        (20, "migracoes_aplicadas", 0, "tabela supabase_migrations.schema_migrations não existe"),
        (21, "agendamentos", 0, "pg_cron não instalado"),
        (22, "autenticacao", 1, {"usuarios": 2, "por_provedor": {"email": 2}, "com_email_confirmado": 2,
                                 "com_login_nos_ultimos_90_dias": 1}),
        (23, "perfis_agregados", 1, {"role": {"admin": 1, "fiscal": 1}}),
        (24, "dados_referencia.pai", 2, [{"id": "00000000-0000-0000-0000-000000000001", "atualizado": None},
                                         {"id": "00000000-0000-0000-0000-000000000002", "atualizado": None}]),
    ]


def parte2():
    return [
        (25, "papeis", 1, [{"papel": "anon", "superusuario": False, "herda": True, "pode_logar": False, "ignora_rls": False,
                            "cria_papeis": False, "configuracao": None, "membro_de": []}]),
        (26, "privilegios_padrao", 1, [{"dono": "postgres", "esquema": "public", "tipo_objeto": "tabela",
                                        "privilegios": ["anon=arwdDxtm/postgres"]}]),
        (27, "privilegios_colunas", 0, []),
        (28, "event_triggers", 1, [{"nome": "watch_ddl", "evento": "ddl_command_end", "situacao": "O", "comandos": None,
                                    "funcao": "extensions.watch", "dono": "postgres"}]),
        (29, "opcoes_tabelas", 4, [{"nome": n, "tipo": t, "dono": "postgres", "opcoes": None, "replica_identity": "padrao",
                                    "e_particao": False}
                                   for n, t in [("filho", "tabela"), ("pai", "tabela"), ("pai_x", "tabela"), ("resumo_filhos", "view")]]),
        (30, "dependencias", 1, [{"dependente": "resumo_filhos", "tipo_dependente": "view", "depende_de": "filho", "coluna": "pai_id"}]),
        (31, "vault_nomes", 1, [{"nome": "CHAVE_WORKER", "descricao": None, "criado_em": "2026-01-01", "atualizado_em": "2026-01-01"}]),
        (32, "dominio_categorico", 1, [{"tabela": "filho", "coluna": "status", "tipo": "text", "distintos": 2,
                                        "valores": {"aberto": 3, "fechado": 2}}]),
        (33, "estrutura_json", 1, [{"tabela": "filho", "coluna": "fotos", "tipo": "jsonb", "linhas_preenchidas": 5,
                                    "formas": {"array": 5}, "tipos_dos_elementos_das_listas": {"object": 7},
                                    "chaves": [{"chave": "path", "tipo": "string", "ocorrencias": 7}]}]),
        (34, "padroes_caminho_arquivos", 1, [{"bucket": "fotos", "padrao": "fiscalizacoes/<uuid>/<arquivo>.jpg", "arquivos": 3}]),
        (35, "chaves_metadados_usuario", 1, {"raw_user_meta_data": {"role": 2}, "raw_app_meta_data": {"provider": 2}}),
    ]


def escrever(caminho: Path, linhas, total_errado=None, json_quebrado=None, sem=None):
    with open(caminho, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["ordem", "secao", "total", "conteudo"])
        for ordem, secao, total, conteudo in linhas:
            if secao == sem:
                continue
            texto = conteudo if isinstance(conteudo, str) else json.dumps(conteudo, ensure_ascii=False)
            if secao == total_errado:
                total += 1
            if secao == json_quebrado:
                texto = texto[:-5]
            w.writerow([ordem, secao, total, texto])


def main():
    escrever(AQUI / "parte1-ok.csv", parte1())
    escrever(AQUI / "parte2-ok.csv", parte2())
    escrever(AQUI / "parte1-sem-secao.csv", parte1(), sem="gatilhos")
    escrever(AQUI / "parte1-total-errado.csv", parte1(), total_errado="colunas")
    escrever(AQUI / "parte1-json-quebrado.csv", parte1(), json_quebrado="funcoes")


if __name__ == "__main__":
    main()
