"""Gera o catálogo do banco a partir dos inventários e das anotações (contracts/ferramentas-cli.md).

Uso, de dentro de specs/003-base-dados-producao/:
    python -m ferramentas.gerar              # (re)escreve os documentos gerados
    python -m ferramentas.gerar --verificar  # só confere se o disco está igual ao que seria gerado

Retornos: 0 ok · 1 inventário inválido · 2 anotação inválida · 3 disco difere (--verificar).
"""

import argparse
import sys
from collections import Counter, defaultdict
from pathlib import Path

from ferramentas import anotacoes as anot_mod
from ferramentas import inventario as inv_mod
from ferramentas import paginas
from ferramentas.dependencias import extrair
from ferramentas import migracao as migracao_mod
from ferramentas.divergencias import comparar
from ferramentas.divergencias import validar_anotacoes as validar_divergencias
from ferramentas.modulos import analisar as analisar_modulos
from ferramentas.raiz import PASTA_SPEC, raiz_repositorio, resolver

PADRAO_P1 = ".specify/assessments/novo-sistema-django-apps/inventario-producao.csv"
PADRAO_P2 = ".specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv"
PADRAO_MIGRATIONS = "specs/003-base-dados-producao/inventario"

# Tudo dentro destas pastas é gerado: arquivo que não for mais produzido é apagado.
PASTAS_GERADAS = ("catalogo",)
ARQUIVOS_GERADOS_NA_RAIZ = ("mapa-rastreabilidade.md", "ordem-modulos.md", "divergencias.md", "achados.md",
                            "migracao.md")

ROTULO_TIPO = {
    "tabela": "Tabelas", "view": "Views", "coluna": "Colunas", "restricao": "Restrições", "indice": "Índices",
    "funcao": "Funções", "gatilho": "Gatilhos", "politica": "Políticas de acesso", "tipo": "Tipos",
    "bucket": "Repositórios de arquivos", "papel": "Papéis", "privilegio": "Privilégios",
    "privilegio_padrao": "Privilégios padrão", "privilegio_coluna": "Privilégios de coluna", "segredo": "Segredos (nomes)",
    "evento": "Event triggers", "extensao": "Extensões", "sequencia": "Sequências", "publicacao": "Publicações",
    "agendamento": "Agendamentos",
}


class Contexto:
    """Tudo o que as páginas precisam, calculado uma vez."""

    def __init__(self, inv, anot, fonte: str, divergencias=None, migrations=None, migracao=None):
        self.inv = inv
        self.anot = anot
        self.fonte = fonte
        self.migrations = migrations  # inventário do banco das migrations, se houver
        self.grafo = extrair(inv)
        self.divergencias = divergencias or []
        self.sem_anotacao = anot.sem_anotacao(inv)
        self.sem_dono = anot.sem_dono(inv)
        self.nao_classificadas = sum(1 for d in self.divergencias if d.chave not in anot.divergencias)
        self.modulos = analisar_modulos(inv, anot, self.grafo)
        self.violacoes = self.modulos.nao_justificadas
        self.aguardando = sum(1 for a in anot.achados if a.get("situacao") == "aguardando_decisao")
        # Mapa de migração: sem pasta de anotações informada, todos os módulos ficam "sem mapa".
        self.migracao = migracao or migracao_mod.analisar(inv, anot, Path("/inexistente"))
        # Índices usados pelas páginas.
        self.colunas = defaultdict(list)
        for c in sorted(inv.secoes.get("colunas", []), key=lambda c: (c["tabela"], c["posicao"])):
            self.colunas[c["tabela"]].append(c)
        self.filhos = defaultdict(list)
        for o in inv.objetos.values():
            if o.pai:
                self.filhos[o.pai].append(o)
        self.dominio = {(d["tabela"], d["coluna"]): d for d in inv.secoes.get("dominio_categorico", [])}
        self.json = {(d["tabela"], d["coluna"]): d for d in inv.secoes.get("estrutura_json", [])}
        self.opcoes = {o["nome"]: o for o in inv.secoes.get("opcoes_tabelas", [])}

    def classificacao(self, chave: str) -> str:
        return self.anot.divergencias.get(chave, {}).get("classificacao", "nao_classificada")

    def aviso(self) -> str:
        return f"<!-- GERADO por ferramentas/gerar.py a partir de {self.fonte} e anotacoes/. Não editar. -->\n"

    def resumo(self) -> str:
        return (f"Completude: {len(self.sem_anotacao)} objetos sem anotação | {len(self.sem_dono)} sem dono | "
                f"{self.nao_classificadas} divergências não classificadas | {self.violacoes} violações de ordem | "
                f"{self.aguardando} achados aguardando decisão | "
                f"{len(self.migracao.pendentes)} sem destino de migração | "
                f"{len(self.migracao.sem_mapa)} módulos sem mapa de migração")


def _readme(ctx: Contexto) -> str:
    objs = ctx.inv.objetos
    por_tipo = Counter(o.tipo for o in objs.values())
    pendentes = Counter(objs[c].tipo for c in ctx.sem_anotacao)
    linhas = [
        ctx.aviso(),
        "# Catálogo do banco de produção\n",
        f"Inventário de {ctx.inv.data or '(data desconhecida)'} · {len(objs)} objetos.\n",
        "Páginas gerais: [repositórios de arquivos](arquivos.md) · [controle de acesso](acesso.md) · "
        "[tipos](tipos.md) · [informações fora do banco](externos.md)\n",
        "## Objetos por tipo\n",
        "| Tipo | Total | Sem anotação |",
        "|---|---:|---:|",
    ]
    for tipo in sorted(por_tipo, key=lambda t: list(ROTULO_TIPO).index(t) if t in ROTULO_TIPO else 99):
        exige = tipo in anot_mod.CAMPO_DE_TEXTO
        linhas.append(f"| {ROTULO_TIPO.get(tipo, tipo)} | {por_tipo[tipo]} | {pendentes[tipo] if exige else '—'} |")
    linhas += ["", "## Completude\n", ctx.resumo(), ""]

    # Índice por módulo: tabelas, views e funções de cada dono.
    grupos = defaultdict(lambda: {"tabela": [], "funcao": []})
    for o in objs.values():
        if o.tipo in ("tabela", "view", "funcao"):
            modulo, fora = ctx.anot.dono(o.chave, ctx.inv)
            grupo = modulo or (f"fora do escopo: {fora['classificacao']}" if fora else "sem dono (lacuna)")
            grupos[grupo]["tabela" if o.tipo in ("tabela", "view") else "funcao"].append(o)
    ordem = {m["id"]: m.get("ordem", 99) for m in ctx.anot.modulos}
    linhas += ["## Por módulo\n"]
    for grupo in sorted(grupos, key=lambda g: (ordem.get(g, 999), g)):
        tabs = sorted({o.atributos["nome"] for o in grupos[grupo]["tabela"]})
        funcs = sorted({o.atributos["nome"] for o in grupos[grupo]["funcao"]})
        linhas.append(f"### {grupo}\n")
        if tabs:
            linhas.append("Tabelas e views: " + " · ".join(f"[{t}](tabelas/{t}.md)" for t in tabs) + "\n")
        if funcs:
            linhas.append("Funções: " + " · ".join(f"[{f}](funcoes/{f}.md)" for f in funcs) + "\n")

    hipoteses = sorted(c for c, a in ctx.anot.objetos.items() if a.get("hipotese") is True)
    linhas += ["## Anotações marcadas como hipótese (para revisão)\n"]
    linhas += [f"- `{c}` ({ctx.anot.origem[c]})" for c in hipoteses] or ["_Nenhuma._"]
    linhas.append("")
    return "\n".join(linhas)


def documentos(ctx: Contexto) -> dict[str, str]:
    """Caminho relativo à pasta de saída → conteúdo. Ordem e conteúdo determinísticos."""
    docs = {"catalogo/README.md": _readme(ctx)}
    for o in ctx.inv.objetos.values():
        if o.tipo in ("tabela", "view"):
            docs[f"catalogo/tabelas/{o.atributos['nome']}.md"] = paginas.pagina_tabela(ctx, o.chave)
    for nome in sorted({o.atributos["nome"] for o in ctx.inv.objetos.values() if o.tipo == "funcao"}):
        docs[f"catalogo/funcoes/{nome}.md"] = paginas.pagina_funcao(ctx, nome)
    docs["catalogo/arquivos.md"] = paginas.pagina_arquivos(ctx)
    docs["catalogo/acesso.md"] = paginas.pagina_acesso(ctx)
    docs["catalogo/tipos.md"] = paginas.pagina_tipos(ctx)
    docs["catalogo/externos.md"] = paginas.pagina_externos(ctx)
    docs["mapa-rastreabilidade.md"] = paginas.pagina_mapa(ctx.inv, ctx.anot, ctx.modulos, ctx.aviso(), ROTULO_TIPO)
    docs["ordem-modulos.md"] = paginas.pagina_ordem(ctx.inv, ctx.anot, ctx.modulos, ctx.aviso(), ROTULO_TIPO)
    docs["achados.md"] = paginas.pagina_achados(ctx.anot.achados, ctx.aviso())
    docs["migracao.md"] = paginas.pagina_migracao(ctx.migracao, ctx.anot, ctx.aviso())
    if ctx.migrations is not None:
        cabecalho = (f"Produção: inventário de {ctx.inv.data or '(data desconhecida)'}. Migrations: inventário de "
                     f"{ctx.migrations.data or '(data desconhecida)'}, do banco local reconstruído "
                     "(`python -m ferramentas.inventario_migrations --reconstruir`).")
        aviso = ctx.aviso().replace(" e anotacoes/", f" + {PADRAO_MIGRATIONS}/migrations-parte*.tsv e anotacoes/")
        docs["divergencias.md"] = paginas.pagina_divergencias(ctx.divergencias, ctx.anot.divergencias, aviso,
                                                              ROTULO_TIPO, cabecalho)
    # O código de algumas funções de produção vem com quebras de linha do Windows (\r\n); a saída
    # usa sempre \n, senão a comparação de --verificar nunca bate.
    return {nome: texto.replace("\r\n", "\n").replace("\r", "\n") for nome, texto in sorted(docs.items())}


def _existentes(saida: Path) -> dict[str, str]:
    atuais = {}
    for pasta in PASTAS_GERADAS:
        base = saida / pasta
        if base.is_dir():
            for p in base.rglob("*.md"):
                atuais[p.relative_to(saida).as_posix()] = p.read_text(encoding="utf-8")
    for nome in ARQUIVOS_GERADOS_NA_RAIZ:
        if (saida / nome).exists():
            atuais[nome] = (saida / nome).read_text(encoding="utf-8")
    return atuais


def _rotulo_fonte(p1: Path, p2: Path) -> str:
    raiz = raiz_repositorio()

    def rel(p):
        try:
            return p.resolve().relative_to(raiz).as_posix()
        except ValueError:
            return p.name
    return f"{rel(p1)} + {rel(p2)}"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="python -m ferramentas.gerar", description=__doc__.splitlines()[0])
    ap.add_argument("--producao-parte1", default=PADRAO_P1)
    ap.add_argument("--producao-parte2", default=PADRAO_P2)
    ap.add_argument("--migrations", default=PADRAO_MIGRATIONS)
    ap.add_argument("--anotacoes", default=str(PASTA_SPEC / "anotacoes"))
    ap.add_argument("--saida", default=str(PASTA_SPEC))
    ap.add_argument("--verificar", action="store_true")
    a = ap.parse_args(argv)

    p1, p2 = resolver(a.producao_parte1), resolver(a.producao_parte2)
    try:
        inv = inv_mod.carregar(p1, p2)
    except (inv_mod.InventarioInvalido, FileNotFoundError) as e:
        print(f"Inventário inválido: {e}", file=sys.stderr)
        return 1
    try:
        anot = anot_mod.carregar(resolver(a.anotacoes), inv)
    except anot_mod.AnotacaoInvalida as e:
        print(f"Anotação inválida:\n{e}", file=sys.stderr)
        return 2

    # Banco das migrations (US2): opcional; sem ele, não há divergências a mostrar.
    pasta_mig = resolver(a.migrations)
    m1, m2 = pasta_mig / "migrations-parte1.tsv", pasta_mig / "migrations-parte2.tsv"
    mig, divs = None, []
    if m1.exists() and m2.exists():
        try:
            mig = inv_mod.carregar(m1, m2)
        except inv_mod.InventarioInvalido as e:
            print(f"Inventário das migrations inválido: {e}", file=sys.stderr)
            return 1
        divs = comparar(inv, mig)
        erros = validar_divergencias(divs, anot.divergencias)
        if erros:
            print("Anotação inválida:\n" + "\n".join(erros), file=sys.stderr)
            return 2

    mapa_migracao = migracao_mod.analisar(inv, anot, resolver(a.anotacoes), resolver)
    if mapa_migracao.erros:
        print("Anotação inválida:\n" + "\n".join(mapa_migracao.erros), file=sys.stderr)
        return 2
    ctx = Contexto(inv, anot, _rotulo_fonte(p1, p2), divs, mig, mapa_migracao)
    if ctx.modulos.erros:
        print("Anotação inválida:\n" + "\n".join(ctx.modulos.erros), file=sys.stderr)
        return 2
    novos = documentos(ctx)
    saida = resolver(a.saida)
    atuais = _existentes(saida)

    if a.verificar:
        diferentes = sorted(n for n in set(novos) | set(atuais) if novos.get(n) != atuais.get(n))
        for nome in diferentes:
            print(f"difere: {nome}")
        print(ctx.resumo())
        return 3 if diferentes else 0

    for nome in sorted(set(atuais) - set(novos)):
        (saida / nome).unlink()
    for nome, conteudo in novos.items():
        destino = saida / nome
        destino.parent.mkdir(parents=True, exist_ok=True)
        with open(destino, "w", encoding="utf-8", newline="\n") as f:
            f.write(conteudo)
    print(f"{len(novos)} documentos gerados em {saida}")
    print(ctx.resumo())
    return 0


if __name__ == "__main__":
    sys.exit(main())
