"""Leitura e validação das anotações manuais em TOML (T007; contracts/anotacoes.md).

O gerador só LÊ estes arquivos. Toda validação acumula as mensagens e falha de uma vez, para que
quem anota corrija tudo numa rodada.
"""

import re
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

ARQUIVOS_DE_OBJETOS = ("arquivos.toml", "acesso.toml", "plataforma.toml")
PASTAS_DE_OBJETOS = ("tabelas", "funcoes")

# Tipos que precisam de texto explicativo, e o nome do campo (contracts/anotacoes.md).
CAMPO_DE_TEXTO = {
    "tabela": "finalidade", "view": "finalidade", "funcao": "finalidade", "bucket": "finalidade",
    "tipo": "finalidade", "papel": "finalidade", "segredo": "finalidade", "extensao": "finalidade",
    "evento": "finalidade", "privilegio_padrao": "finalidade", "sequencia": "finalidade",
    "publicacao": "finalidade", "agendamento": "finalidade",
    "coluna": "significado", "gatilho": "efeito", "politica": "descricao",
}
CAMPOS_DE_TEXTO = {"finalidade", "significado", "efeito", "descricao"}
# Tipos cuja anotação, quando existe, precisa declarar dono (módulo ou fora do escopo).
EXIGEM_DONO = {"tabela", "view", "funcao", "bucket"}

CLASSIFICACOES_FORA = {"plataforma", "descartar"}
CLASSIFICACOES_DIVERGENCIA = {"producao_vale", "residuo_descartar", "defeito_corrigir", "aguardando_decisao"}
SITUACOES_ACHADO = {"aguardando_decisao", "decidido"}
DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ID_ACHADO = re.compile(r"^A-\d{3}$")
BUCKET_NA_CONDICAO = re.compile(r"bucket_id\s*=\s*'([^']+)'")
BUCKETS_EM_LISTA = re.compile(r"bucket_id\s*=\s*ANY\s*\(\s*ARRAY\s*\[([^\]]*)\]", re.IGNORECASE)


def buckets_na_condicao(texto: str) -> list[str]:
    """Buckets citados numa condição de política: `bucket_id = 'x'` ou `bucket_id = ANY (ARRAY[...])`."""
    achados = set(BUCKET_NA_CONDICAO.findall(texto))
    for lista in BUCKETS_EM_LISTA.findall(texto):
        achados.update(re.findall(r"'([^']+)'", lista))
    return sorted(achados)


class AnotacaoInvalida(Exception):
    pass


@dataclass
class Anotacoes:
    objetos: dict = field(default_factory=dict)       # chave -> dict da anotação
    origem: dict = field(default_factory=dict)        # chave -> arquivo de onde veio
    modulos: list = field(default_factory=list)
    excecoes: list = field(default_factory=list)
    divergencias: dict = field(default_factory=dict)
    achados: list = field(default_factory=list)
    externos: list = field(default_factory=list)

    # --- Dono (módulo ou classificação fora do escopo), com herança -------------------------
    def dono(self, chave: str, inventario) -> tuple:
        """Devolve (modulo, fora_escopo). No máximo um dos dois é não-nulo."""
        a = self.objetos.get(chave, {})
        if a.get("modulo") or a.get("fora_escopo"):
            return a.get("modulo"), a.get("fora_escopo")
        obj = inventario.objetos.get(chave)
        if obj is None:
            return None, None
        if obj.pai:
            return self.dono(obj.pai, inventario)
        if obj.tipo == "politica" and obj.atributos.get("esquema") == "storage":
            citados = buckets_na_condicao(
                f"{obj.atributos.get('condicao_using') or ''} {obj.atributos.get('condicao_with_check') or ''}")
            # Só herda quando a política cita um único bucket; a que cobre vários declara o dono.
            if len(citados) == 1 and f"bucket:{citados[0]}" in inventario.objetos:
                return self.dono(f"bucket:{citados[0]}", inventario)
        if obj.tipo == "privilegio" and "funcao" in obj.atributos:
            nome = obj.atributos["funcao"]
            for outra in inventario.objetos.values():
                if outra.tipo == "funcao" and outra.atributos["nome"] == nome:
                    return self.dono(outra.chave, inventario)
        return None, None

    def sem_anotacao(self, inventario) -> list[str]:
        """Objetos que exigem texto explicativo e ainda não têm (fora do escopo não exige)."""
        faltando = []
        for chave, obj in inventario.objetos.items():
            campo = CAMPO_DE_TEXTO.get(obj.tipo)
            if not campo:
                continue
            if self.dono(chave, inventario)[1]:
                continue
            if not (self.objetos.get(chave, {}).get(campo) or "").strip():
                faltando.append(chave)
        return faltando

    def sem_dono(self, inventario) -> list[str]:
        return [c for c in inventario.objetos if self.dono(c, inventario) == (None, None)]


def _ler(caminho: Path, erros: list) -> dict:
    if not caminho.exists():
        return {}
    try:
        with open(caminho, "rb") as f:
            return tomllib.load(f)
    except tomllib.TOMLDecodeError as e:
        erros.append(f"{caminho.name}: TOML inválido ({e}).")
        return {}


def _tem_fonte(a: dict) -> bool:
    return bool([f for f in (a.get("fonte") or []) if str(f).strip()])


def carregar(pasta: str | Path, inventario) -> Anotacoes:
    pasta = Path(pasta)
    erros: list[str] = []
    r = Anotacoes()

    # Módulos e exceções de ordem.
    m = _ler(pasta / "modulos.toml", erros)
    r.modulos = m.get("modulo", [])
    r.excecoes = m.get("excecao", [])
    ids_modulos = set()
    ordens = set()
    for mod in r.modulos:
        for campo in ("id", "nome", "ordem", "app"):
            if campo not in mod:
                erros.append(f"modulos.toml: módulo {mod.get('id', '?')} sem '{campo}'.")
        if mod.get("id") in ids_modulos:
            erros.append(f"modulos.toml: módulo '{mod['id']}' repetido.")
        if mod.get("ordem") in ordens:
            erros.append(f"modulos.toml: ordem {mod['ordem']} repetida.")
        ids_modulos.add(mod.get("id"))
        ordens.add(mod.get("ordem"))

    # Objetos.
    arquivos = [pasta / n for n in ARQUIVOS_DE_OBJETOS]
    for sub in PASTAS_DE_OBJETOS:
        arquivos += sorted((pasta / sub).glob("*.toml")) if (pasta / sub).is_dir() else []
    for arq in arquivos:
        for chave, a in _ler(arq, erros).get("objeto", {}).items():
            nome = arq.relative_to(pasta).as_posix()
            if chave in r.objetos:
                erros.append(f"{nome}: '{chave}' já anotado em {r.origem[chave]}.")
                continue
            r.objetos[chave] = a
            r.origem[chave] = nome

    orfas = sorted(c for c in r.objetos if c not in inventario.objetos)
    if orfas:
        erros.append("anotações órfãs (sem objeto no inventário): " + ", ".join(orfas) + ".")

    for chave, a in r.objetos.items():
        onde = f"{r.origem[chave]}: '{chave}'"
        obj = inventario.objetos.get(chave)
        fora = a.get("fora_escopo")
        if a.get("modulo") and fora:
            erros.append(f"{onde} tem 'modulo' e 'fora_escopo' ao mesmo tempo.")
        if obj and obj.tipo in EXIGEM_DONO and not a.get("modulo") and not fora:
            erros.append(f"{onde} sem 'modulo' nem 'fora_escopo'.")
        if a.get("modulo") and ids_modulos and a["modulo"] not in ids_modulos:
            erros.append(f"{onde}: módulo '{a['modulo']}' não existe em modulos.toml.")
        if fora:
            if fora.get("classificacao") not in CLASSIFICACOES_FORA:
                erros.append(f"{onde}: fora_escopo.classificacao '{fora.get('classificacao')}' inválida.")
            if not (fora.get("motivo") or "").strip():
                erros.append(f"{onde}: fora_escopo sem 'motivo'.")
            if fora.get("classificacao") == "descartar" and not fora.get("achado"):
                erros.append(f"{onde}: fora_escopo 'descartar' exige 'achado'.")
        if CAMPOS_DE_TEXTO & set(a) and not _tem_fonte(a) and a.get("hipotese") is not True:
            erros.append(f"{onde}: texto sem 'fonte' e sem 'hipotese = true'.")

    # Divergências.
    for chave, d in _ler(pasta / "divergencias.toml", erros).get("divergencia", {}).items():
        if d.get("classificacao") not in CLASSIFICACOES_DIVERGENCIA:
            erros.append(f"divergencias.toml: '{chave}' com classificação '{d.get('classificacao')}' inválida.")
        if not (d.get("justificativa") or "").strip():
            erros.append(f"divergencias.toml: '{chave}' sem 'justificativa'.")
        r.divergencias[chave] = d

    # Achados.
    vistos = set()
    for ac in _ler(pasta / "achados.toml", erros).get("achado", []):
        ident = ac.get("id", "?")
        if not ID_ACHADO.match(ident):
            erros.append(f"achados.toml: id '{ident}' fora do formato A-NNN.")
        if ident in vistos:
            erros.append(f"achados.toml: id '{ident}' repetido.")
        vistos.add(ident)
        for campo in ("titulo", "evidencia", "risco", "opcoes", "recomendacao", "situacao"):
            if not ac.get(campo):
                erros.append(f"achados.toml: {ident} sem '{campo}'.")
        if ac.get("situacao") not in SITUACOES_ACHADO:
            erros.append(f"achados.toml: {ident} com situação '{ac.get('situacao')}' inválida.")
        if ac.get("situacao") == "decidido":
            for campo in ("decisao", "decidido_por"):
                if not (ac.get(campo) or "").strip():
                    erros.append(f"achados.toml: {ident} decidido sem '{campo}'.")
            if not DATA.match(ac.get("decidido_em") or ""):
                erros.append(f"achados.toml: {ident} decidido com 'decidido_em' fora do formato AAAA-MM-DD.")
        for chave in ac.get("objetos", []):
            if chave not in inventario.objetos:
                erros.append(f"achados.toml: {ident} cita objeto inexistente '{chave}'.")
        r.achados.append(ac)

    # Externos.
    for ex in _ler(pasta / "externos.toml", erros).get("externo", []):
        for campo in ("nome", "descricao", "como_obter"):
            if not (ex.get(campo) or "").strip():
                erros.append(f"externos.toml: entrada '{ex.get('nome', '?')}' sem '{campo}'.")
        r.externos.append(ex)

    if erros:
        raise AnotacaoInvalida("\n".join(erros))
    return r
