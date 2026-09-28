"""Leitura e validação dos inventários do banco (T005).

Aceita o CSV exportado pelo SQL Editor do Supabase (colunas ordem, secao, total, conteudo) e o
TSV gerado pelo `psql -A -F <tab>` (com ruído antes do cabeçalho e rodapé "(N rows)"). Regras de
validação e formato das chaves: data-model.md, "Inventário" e "Chave do objeto".
"""

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path

csv.field_size_limit(10**9)

SECOES_PARTE1 = [
    "metadados", "extensoes", "schemas", "tabelas", "colunas", "restricoes", "indices", "views", "funcoes",
    "gatilhos", "politicas", "tipos", "sequencias", "permissoes_tabelas", "permissoes_funcoes", "publicacoes",
    "buckets", "arquivos_por_bucket", "prefixos_por_bucket", "migracoes_aplicadas", "agendamentos",
    "autenticacao", "perfis_agregados",
]
SECOES_PARTE2 = [
    "papeis", "privilegios_padrao", "privilegios_colunas", "event_triggers", "opcoes_tabelas", "dependencias",
    "vault_nomes", "dominio_categorico", "estrutura_json", "padroes_caminho_arquivos", "chaves_metadados_usuario",
]
# Seções que o script devolve como mensagem de texto quando o recurso não existe no banco.
SECOES_TEXTO = {"migracoes_aplicadas", "agendamentos"}


class InventarioInvalido(Exception):
    pass


@dataclass
class Objeto:
    chave: str
    tipo: str
    atributos: dict
    pai: str | None = None


@dataclass
class Inventario:
    secoes: dict
    objetos: dict = field(default_factory=dict)
    origem: tuple = ()

    @property
    def data(self) -> str:
        return (self.secoes.get("metadados") or {}).get("gerado_em", "")


def _linhas(caminho: Path) -> list[dict]:
    """Lê CSV (vírgula) ou TSV do psql, devolvendo dicts com ordem, secao, total, conteudo."""
    texto = Path(caminho).read_text(encoding="utf-8")
    if Path(caminho).suffix.lower() == ".csv":
        return list(csv.DictReader(texto.splitlines(keepends=True)))
    linhas = []
    for bruta in texto.splitlines():
        partes = bruta.split("\t", 3)
        if len(partes) == 4 and partes[0].strip().isdigit():
            linhas.append({"ordem": partes[0], "secao": partes[1], "total": partes[2], "conteudo": partes[3]})
    return linhas


def _secoes(caminho: Path, esperadas: list[str]) -> dict:
    secoes = {}
    for linha in _linhas(caminho):
        nome, bruto = linha["secao"].strip(), linha["conteudo"]
        try:
            conteudo = json.loads(bruto)
        except json.JSONDecodeError as erro:
            if nome in SECOES_TEXTO:
                conteudo = []
            else:
                raise InventarioInvalido(f"{Path(caminho).name}: seção '{nome}' com JSON inválido ({erro.msg}).") from erro
        if nome in SECOES_TEXTO and isinstance(conteudo, str):
            conteudo = []
        if isinstance(conteudo, list) and nome not in SECOES_TEXTO:
            declarado = int(linha["total"])
            if declarado != len(conteudo):
                raise InventarioInvalido(
                    f"{Path(caminho).name}: seção '{nome}' declara {declarado} itens e traz {len(conteudo)} (truncada?)."
                )
        secoes[nome] = conteudo
    faltando = [s for s in esperadas if s not in secoes]
    if faltando:
        raise InventarioInvalido(f"{Path(caminho).name}: seções ausentes: {', '.join(faltando)}.")
    return secoes


class _Construtor:
    def __init__(self):
        self.objetos: dict[str, Objeto] = {}
        self.colisoes: list[str] = []

    def add(self, chave, tipo, atributos, pai=None):
        if chave in self.objetos:
            self.colisoes.append(chave)
        self.objetos[chave] = Objeto(chave, tipo, atributos, pai)


def _construir_objetos(s: dict) -> dict[str, Objeto]:
    b = _Construtor()
    tabelas_publicas = set()
    for t in s["tabelas"]:
        tipo = "view" if t["tipo"] in ("view", "view_materializada") else "tabela"
        b.add(f"tabela:{t['nome']}", tipo, t)
        tabelas_publicas.add(t["nome"])

    def pai_de(esquema, tabela):
        return f"tabela:{tabela}" if esquema == "public" and tabela in tabelas_publicas else None

    for c in s["colunas"]:
        b.add(f"coluna:{c['tabela']}.{c['coluna']}", "coluna", c, f"tabela:{c['tabela']}")
    for r in s["restricoes"]:
        b.add(f"restricao:{r['tabela']}.{r['nome']}", "restricao", r, f"tabela:{r['tabela']}")
    for i in s["indices"]:
        b.add(f"indice:{i['nome']}", "indice", i, f"tabela:{i['tabela']}")
    for f in s["funcoes"]:
        b.add(f"funcao:{f['nome']}({f['argumentos']})", "funcao", f)
    for g in s["gatilhos"]:
        b.add(f"gatilho:{g['esquema']}.{g['tabela']}.{g['nome']}", "gatilho", g, pai_de(g["esquema"], g["tabela"]))
    for p in s["politicas"]:
        b.add(f"politica:{p['esquema']}.{p['tabela']}.{p['nome']}", "politica", p, pai_de(p["esquema"], p["tabela"]))
    for t in s["tipos"]:
        b.add(f"tipo:{t['nome']}", "tipo", t)
    for k in s["buckets"]:
        b.add(f"bucket:{k['id']}", "bucket", k)
    for e in s["extensoes"]:
        b.add(f"extensao:{e['nome']}", "extensao", e)
    for q in s.get("sequencias") or []:
        b.add(f"sequencia:{q['nome']}", "sequencia", q)
    for q in s.get("publicacoes") or []:
        b.add(f"publicacao:{q['publicacao']}.{q['tabela']}", "publicacao", q)
    for q in s.get("agendamentos") or []:
        b.add(f"agendamento:{q.get('jobname') or q.get('jobid')}", "agendamento", q)
    for p in s["permissoes_tabelas"]:
        b.add(f"privilegio:{p['tabela']}.{p['papel']}", "privilegio", p, pai_de(p["esquema"], p["tabela"]))
    for p in s["permissoes_funcoes"]:
        b.add(f"privilegio:{p['funcao']}.{p['papel']}", "privilegio", p)
    # Parte 2
    for p in s["papeis"]:
        b.add(f"papel:{p['papel']}", "papel", p)
    for p in s["privilegios_padrao"]:
        b.add(f"privilegio_padrao:{p['dono']}.{p['esquema']}.{p['tipo_objeto']}", "privilegio_padrao", p)
    for p in s["privilegios_colunas"]:
        b.add(f"privilegio_coluna:{p['tabela']}.{p['coluna']}.{p['papel']}", "privilegio_coluna", p, f"tabela:{p['tabela']}")
    for e in s["event_triggers"]:
        b.add(f"evento:{e['nome']}", "evento", e)
    for v in s["vault_nomes"]:
        b.add(f"segredo:{v['nome']}", "segredo", v)
    if b.colisoes:
        raise InventarioInvalido(f"chaves repetidas no inventário: {', '.join(sorted(set(b.colisoes)))}.")
    return dict(sorted(b.objetos.items()))


def carregar(parte1: str | Path, parte2: str | Path) -> Inventario:
    secoes = _secoes(Path(parte1), SECOES_PARTE1)
    secoes.update(_secoes(Path(parte2), SECOES_PARTE2))
    inv = Inventario(secoes=secoes, origem=(str(parte1), str(parte2)))
    inv.objetos = _construir_objetos(secoes)
    return inv
