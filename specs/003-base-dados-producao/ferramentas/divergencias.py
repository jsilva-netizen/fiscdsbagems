"""Divergências entre produção e o banco reconstruído pelas migrations (T033; research D5).

Os dois lados vêm dos mesmos scripts de inventário, então a comparação é objeto a objeto pela
chave estável. A classificação de cada divergência é anotação (`anotacoes/divergencias.toml`).
"""

import difflib
import re
from dataclasses import dataclass

# Atributos que medem dados ou momento de criação, não estrutura: não geram divergência.
VOLATEIS = {
    "tabela": {"linhas_estimadas", "linhas_exatas", "tamanho_bytes"},
    "view": {"linhas_estimadas", "linhas_exatas", "tamanho_bytes"},
    "coluna": {"posicao"},  # a ordem física das colunas depende do histórico de ALTER TABLE
    "bucket": {"created_at", "updated_at"},
    "segredo": {"criado_em", "atualizado_em"},
}
# Atributos que são código: comparados sem diferença de espaço em branco, com diff.
CODIGO = {"funcao": "definicao", "view": "definicao"}


@dataclass
class Divergencia:
    chave: str
    tipo: str             # so_producao | so_migrations | codigo_diferente | estrutura_diferente
    objeto: str           # tipo do objeto (tabela, funcao...)
    detalhe: str = ""     # atributos que diferem, com os dois valores
    diff: str = ""        # só para codigo_diferente


def _normalizar_codigo(texto) -> str:
    return re.sub(r"\s+", " ", str(texto or "")).strip()


def _linhas_codigo(texto) -> list[str]:
    return str(texto or "").replace("\r\n", "\n").replace("\r", "\n").strip("\n").splitlines()


def _atributos(inv, obj) -> dict:
    """Atributos comparáveis do objeto, incluindo o que o inventário guarda fora dele (views, opções)."""
    a = {k: v for k, v in obj.atributos.items() if k not in VOLATEIS.get(obj.tipo, set())}
    if obj.tipo in ("tabela", "view"):
        nome = obj.atributos.get("nome")
        if obj.tipo == "view":
            a["definicao"] = next((v.get("definicao") for v in inv.secoes.get("views", []) if v.get("nome") == nome), None)
        opcoes = next((o for o in inv.secoes.get("opcoes_tabelas", []) if o.get("nome") == nome), None)
        if opcoes is not None:
            a["opcoes"] = opcoes.get("opcoes")
    return a


def _comparar_objeto(chave, tipo, a_prod: dict, a_mig: dict) -> Divergencia | None:
    campo_codigo = CODIGO.get(tipo)
    diferentes = []
    for k in sorted(set(a_prod) | set(a_mig)):
        vp, vm = a_prod.get(k), a_mig.get(k)
        if k == campo_codigo:
            if _normalizar_codigo(vp) != _normalizar_codigo(vm):
                diferentes.append(k)
        elif vp != vm:
            diferentes.append(k)
    if not diferentes:
        return None
    outros = [k for k in diferentes if k != campo_codigo]
    detalhe = "; ".join(f"{k}: produção {a_prod.get(k)!r} × migrations {a_mig.get(k)!r}" for k in outros)
    if campo_codigo in diferentes:
        diff = "\n".join(difflib.unified_diff(_linhas_codigo(a_mig.get(campo_codigo)),
                                              _linhas_codigo(a_prod.get(campo_codigo)),
                                              "migrations", "producao", lineterm=""))
        return Divergencia(chave, "codigo_diferente", tipo, detalhe, diff)
    return Divergencia(chave, "estrutura_diferente", tipo, detalhe)


def comparar(producao, migrations) -> list[Divergencia]:
    """Divergências em ordem de chave. O diff vai de migrations (-) para produção (+)."""
    divs = []
    for chave in sorted(set(producao.objetos) | set(migrations.objetos)):
        op, om = producao.objetos.get(chave), migrations.objetos.get(chave)
        if om is None:
            divs.append(Divergencia(chave, "so_producao", op.tipo))
        elif op is None:
            divs.append(Divergencia(chave, "so_migrations", om.tipo))
        else:
            d = _comparar_objeto(chave, op.tipo, _atributos(producao, op), _atributos(migrations, om))
            if d:
                divs.append(d)
    return divs


def classificacao(d: Divergencia, anotadas: dict) -> str:
    """Classificação anotada; sem anotação, `nao_classificada` (conta contra o SC-003)."""
    return anotadas.get(d.chave, {}).get("classificacao", "nao_classificada")


def validar_anotacoes(divs: list[Divergencia], anotadas: dict) -> list[str]:
    """Erros das anotações de divergência contra as divergências de fato (contracts/anotacoes.md)."""
    por_chave = {d.chave: d for d in divs}
    erros = [f"divergencias.toml: '{c}' não diverge mais (anotação órfã)." for c in sorted(anotadas) if c not in por_chave]
    for c, a in sorted(anotadas.items()):
        d = por_chave.get(c)
        if d and d.tipo == "codigo_diferente" and not (a.get("resumo_codigo") or "").strip():
            erros.append(f"divergencias.toml: '{c}' tem código diferente e está sem 'resumo_codigo'.")
    return erros
