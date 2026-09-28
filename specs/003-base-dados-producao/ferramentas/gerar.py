"""Gera o catálogo do banco a partir dos inventários e das anotações (contracts/ferramentas-cli.md).

Uso, de dentro de specs/003-base-dados-producao/:
    python -m ferramentas.gerar              # (re)escreve os documentos gerados
    python -m ferramentas.gerar --verificar  # só confere se o disco está igual ao que seria gerado

Retornos: 0 ok · 1 inventário inválido · 2 anotação inválida · 3 disco difere (--verificar).
"""

import argparse
import sys
from collections import Counter
from pathlib import Path

from ferramentas import anotacoes as anot_mod
from ferramentas import inventario as inv_mod
from ferramentas.raiz import PASTA_SPEC, raiz_repositorio, resolver

PADRAO_P1 = ".specify/assessments/novo-sistema-django-apps/inventario-producao.csv"
PADRAO_P2 = ".specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv"
PADRAO_MIGRATIONS = "specs/003-base-dados-producao/inventario"

# Tudo dentro destas pastas é gerado: arquivo que não for mais produzido é apagado.
PASTAS_GERADAS = ("catalogo",)
ARQUIVOS_GERADOS_NA_RAIZ = ("mapa-rastreabilidade.md", "ordem-modulos.md", "divergencias.md", "achados.md")

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

    def __init__(self, inv, anot, fonte: str):
        self.inv = inv
        self.anot = anot
        self.fonte = fonte
        self.sem_anotacao = anot.sem_anotacao(inv)
        self.sem_dono = anot.sem_dono(inv)
        self.nao_classificadas = 0
        self.violacoes = 0
        self.aguardando = sum(1 for a in anot.achados if a.get("situacao") == "aguardando_decisao")

    def aviso(self) -> str:
        return f"<!-- GERADO por ferramentas/gerar.py a partir de {self.fonte} e anotacoes/. Não editar. -->\n"

    def resumo(self) -> str:
        return (f"Completude: {len(self.sem_anotacao)} objetos sem anotação | {len(self.sem_dono)} sem dono | "
                f"{self.nao_classificadas} divergências não classificadas | {self.violacoes} violações de ordem | "
                f"{self.aguardando} achados aguardando decisão")


def _readme(ctx: Contexto) -> str:
    por_tipo = Counter(o.tipo for o in ctx.inv.objetos.values())
    pendentes = Counter(ctx.inv.objetos[c].tipo for c in ctx.sem_anotacao)
    linhas = [
        ctx.aviso(),
        "# Catálogo do banco de produção\n",
        f"Inventário de {ctx.inv.data or '(data desconhecida)'} · {len(ctx.inv.objetos)} objetos.\n",
        "## Objetos por tipo\n",
        "| Tipo | Total | Sem anotação |",
        "|---|---:|---:|",
    ]
    for tipo in sorted(por_tipo, key=lambda t: list(ROTULO_TIPO).index(t) if t in ROTULO_TIPO else 99):
        rotulo = ROTULO_TIPO.get(tipo, tipo)
        exige = tipo in anot_mod.CAMPO_DE_TEXTO
        linhas.append(f"| {rotulo} | {por_tipo[tipo]} | {pendentes[tipo] if exige else '—'} |")
    linhas += ["", "## Completude\n", ctx.resumo(), ""]
    return "\n".join(linhas)


def documentos(ctx: Contexto) -> dict[str, str]:
    """Caminho relativo à pasta de saída → conteúdo. Ordem e conteúdo determinísticos."""
    return {"catalogo/README.md": _readme(ctx)}


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

    ctx = Contexto(inv, anot, _rotulo_fonte(p1, p2))
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
