"""Destino de migração de cada coluna e repositório de arquivos do banco de produção.

Cada módulo que já tem mapa de migração tem um arquivo `anotacoes/migracao/<modulo>.toml`:

    modulo = "core"
    data_model = "specs/004-modulo-core/data-model.md"   # opcional; se houver, os destinos são conferidos
    notas = ["Fontes fora do catálogo: ..."]             # opcional

    [destino."coluna:profiles.full_name"]
    para = "core.Usuario.nome"                           # ou uma lista de destinos
    transformacao = "Texto aparado."                     # opcional

    [destino."coluna:prestadores_servico.tipo"]
    descarte = "Sem uso em nenhuma tela (R-core-016)."

Regras:
- a chave é uma coluna de tabela (não de view) ou um repositório de arquivos do inventário, e o
  dono dela é o módulo do arquivo;
- cada destino tem `para` ou `descarte`, nunca os dois;
- `para` segue `app.Modelo.campo` (com um quarto nível opcional, `app.Modelo.campo.chave`, para
  campos compostos); quando o app tem `data_model`, o modelo precisa ser um título `### Modelo` do
  data-model e o campo, uma linha da tabela dele;
- num módulo com mapa, toda coluna e todo repositório do módulo precisa de destino; o que falta é
  **pendente**;
- objetos fora do escopo não precisam de destino: são descartados pelo motivo da anotação.
"""

import re
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

PARA = re.compile(r"^[a-z_]+\.[A-Z][A-Za-z0-9]*\.[a-z_][a-z0-9_]*(\.[a-z0-9_]+)?$")
TITULO = re.compile(r"^#{2,3}\s+(.+?)\s*$")
CAMPOS_DO_ARQUIVO = {"modulo", "data_model", "notas", "destino"}
CAMPOS_DO_DESTINO = {"para", "transformacao", "descarte"}


@dataclass
class Item:
    chave: str
    tipo: str            # coluna | bucket
    modulo: str | None
    fora: dict | None
    volume: int | None   # linhas da tabela (coluna) ou arquivos (bucket)
    destino: dict | None = None


@dataclass
class AnaliseMigracao:
    mapas: dict = field(default_factory=dict)          # módulo -> {"arquivo", "data_model", "notas"}
    itens: list = field(default_factory=list)          # Item, na ordem das chaves
    pendentes: list = field(default_factory=list)      # chaves sem destino em módulos com mapa
    sem_mapa: list = field(default_factory=list)       # módulos com itens e sem mapa
    nao_verificados: list = field(default_factory=list)  # (chave, destino) em app sem data-model
    erros: list = field(default_factory=list)


def modelos_do_data_model(texto: str) -> dict:
    """Modelo -> campos, lidos dos títulos `### Modelo` e da primeira coluna das tabelas."""
    modelos, atual = {}, None
    for linha in texto.splitlines():
        m = TITULO.match(linha)
        if m:
            nivel = len(linha) - len(linha.lstrip("#"))
            if nivel == 3:
                atual = m.group(1).split()[0].strip("`")
                modelos.setdefault(atual, set())
            else:
                atual = None
            continue
        if atual and linha.startswith("|"):
            celulas = [c.strip() for c in linha.strip().strip("|").split("|")]
            primeira = celulas[0] if celulas else ""
            if not primeira or primeira.lower() == "campo" or set(primeira) <= set("-: "):
                continue
            for nome in primeira.split(","):
                nome = nome.strip().strip("`").strip()
                if nome:
                    modelos[atual].add(nome)
    return modelos


def _itens(inv, anot) -> list:
    volumes_bucket = {b["bucket"]: b.get("arquivos") for b in inv.secoes.get("arquivos_por_bucket", [])}
    itens = []
    for chave, obj in inv.objetos.items():
        if obj.tipo == "coluna":
            pai = inv.objetos.get(obj.pai)
            if not pai or pai.tipo != "tabela":
                continue  # coluna de view: não guarda dado
            volume = pai.atributos.get("linhas_exatas")
        elif obj.tipo == "bucket":
            volume = volumes_bucket.get(obj.atributos.get("id"), 0)
        else:
            continue
        modulo, fora = anot.dono(chave, inv)
        itens.append(Item(chave, obj.tipo, modulo, fora, volume))
    return itens


def _ler_mapas(pasta: Path, ids_modulos: set, erros: list) -> dict:
    mapas = {}
    base = pasta / "migracao"
    if not base.is_dir():
        return mapas
    for arq in sorted(base.glob("*.toml")):
        nome = f"migracao/{arq.name}"
        try:
            with open(arq, "rb") as f:
                dados = tomllib.load(f)
        except tomllib.TOMLDecodeError as e:
            erros.append(f"{nome}: TOML inválido ({e}).")
            continue
        extras = set(dados) - CAMPOS_DO_ARQUIVO
        if extras:
            erros.append(f"{nome}: campos desconhecidos: {', '.join(sorted(extras))}.")
        modulo = dados.get("modulo")
        if not modulo:
            erros.append(f"{nome}: sem 'modulo'.")
            continue
        if modulo not in ids_modulos:
            erros.append(f"{nome}: módulo '{modulo}' não existe em modulos.toml.")
            continue
        if modulo in mapas:
            erros.append(f"{nome}: módulo '{modulo}' já tem mapa em {mapas[modulo]['arquivo']}.")
            continue
        mapas[modulo] = {"arquivo": nome, "data_model": dados.get("data_model") or "",
                         "notas": dados.get("notas") or [], "destino": dados.get("destino") or {}}
    return mapas


def analisar(inv, anot, pasta_anotacoes, resolver=Path) -> AnaliseMigracao:
    """`resolver` converte o caminho do data-model (relativo à raiz do repositório) em Path."""
    r = AnaliseMigracao()
    ids_modulos = {m["id"] for m in anot.modulos}
    mapas = _ler_mapas(Path(pasta_anotacoes), ids_modulos, r.erros)
    r.itens = _itens(inv, anot)
    por_chave = {i.chave: i for i in r.itens}

    # Modelos de cada app com data-model, para conferir os destinos.
    modelos = {}
    for modulo, mapa in mapas.items():
        if mapa["data_model"]:
            caminho = resolver(mapa["data_model"])
            if not Path(caminho).exists():
                r.erros.append(f"{mapa['arquivo']}: data_model '{mapa['data_model']}' não existe.")
                continue
            modelos[modulo] = modelos_do_data_model(Path(caminho).read_text(encoding="utf-8"))

    for modulo, mapa in mapas.items():
        for chave, d in mapa["destino"].items():
            onde = f"{mapa['arquivo']}: '{chave}'"
            item = por_chave.get(chave)
            if item is None:
                obj = inv.objetos.get(chave)
                motivo = "não existe no inventário" if obj is None else "não é coluna de tabela nem repositório"
                r.erros.append(f"{onde} {motivo}.")
                continue
            if item.modulo != modulo:
                dono = item.modulo or ("fora do escopo" if item.fora else "sem dono")
                r.erros.append(f"{onde} pertence a '{dono}', não a '{modulo}'.")
                continue
            if not isinstance(d, dict):
                r.erros.append(f"{onde}: destino precisa ser uma tabela TOML.")
                continue
            extras = set(d) - CAMPOS_DO_DESTINO
            if extras:
                r.erros.append(f"{onde}: campos desconhecidos: {', '.join(sorted(extras))}.")
            para, descarte = d.get("para"), (d.get("descarte") or "").strip()
            if para and descarte:
                r.erros.append(f"{onde} tem 'para' e 'descarte' ao mesmo tempo.")
                continue
            if not para and not descarte:
                r.erros.append(f"{onde} sem 'para' nem 'descarte'.")
                continue
            for destino in ([para] if isinstance(para, str) else (para or [])):
                if not isinstance(destino, str) or not PARA.match(destino):
                    r.erros.append(f"{onde}: destino '{destino}' fora do formato app.Modelo.campo.")
                    continue
                app, modelo, campo = destino.split(".")[:3]
                if app not in modelos:
                    r.nao_verificados.append((chave, destino))
                elif modelo not in modelos[app]:
                    r.erros.append(f"{onde}: modelo '{modelo}' não está no data-model de '{app}'.")
                elif campo not in modelos[app][modelo]:
                    r.erros.append(f"{onde}: campo '{campo}' não está em '{app}.{modelo}' no data-model.")
            item.destino = d

    r.mapas = {m: {k: v for k, v in mapa.items() if k != "destino"} for m, mapa in mapas.items()}
    r.pendentes = [i.chave for i in r.itens if i.modulo in mapas and i.destino is None]
    r.sem_mapa = sorted({i.modulo for i in r.itens if i.modulo and i.modulo not in mapas},
                        key=lambda m: next((x.get("ordem", 999) for x in anot.modulos if x["id"] == m), 999))
    return r
