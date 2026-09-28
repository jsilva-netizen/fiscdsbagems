"""Extração de dependências entre objetos do banco (T013; research.md D4).

Origem `catalogo`: registrado pelo próprio banco (chave estrangeira, view, gatilho).
Origem `codigo`: lido do texto (condições de políticas, código das funções). Verificado em
2026-09-28 que nenhuma função de produção monta SQL dinâmico, então a leitura do texto basta.
"""

import re
from collections import defaultdict
from dataclasses import dataclass

REFERENCIA_FK = re.compile(r"REFERENCES\s+(?:(\w+)\.)?(\w+)", re.IGNORECASE)
ESQUEMA_EXTERNO = re.compile(r"\b(auth|storage)\.(\w+)\b")


@dataclass(frozen=True, order=True)
class Aresta:
    de: str
    para: str
    natureza: str   # referencia | consulta | dispara | usa | le | escreve | chama
    origem: str     # catalogo | codigo


class Grafo:
    def __init__(self, arestas):
        self.arestas = sorted(set(arestas))
        self._saida = defaultdict(list)
        self._entrada = defaultdict(list)
        for a in self.arestas:
            self._saida[a.de].append(a)
            self._entrada[a.para].append(a)

    def dependencias_de(self, chave: str) -> list[Aresta]:
        return self._saida.get(chave, [])

    def dependentes_de(self, chave: str) -> list[Aresta]:
        return self._entrada.get(chave, [])


def _nome_tabela(nome: str) -> re.Pattern:
    # Nome inteiro, opcionalmente qualificado com public.; nunca pedaço de outro identificador.
    return re.compile(rf"(?<![\w.])(?:public\.)?{re.escape(nome)}(?![\w])", re.IGNORECASE)


def _escrita(nome: str) -> re.Pattern:
    return re.compile(rf"\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:ONLY\s+)?(?:public\.)?{re.escape(nome)}(?![\w])",
                      re.IGNORECASE)


def _chamada(nome: str) -> re.Pattern:
    return re.compile(rf"(?<![\w.])(?:public\.)?{re.escape(nome)}\s*\(", re.IGNORECASE)


def _corpo(definicao: str) -> str:
    """Código da função sem a linha de cabeçalho (que repete o próprio nome) e sem comentários."""
    linhas = definicao.split("\n")
    corpo = "\n".join(linhas[1:]) if linhas and linhas[0].upper().startswith("CREATE") else definicao
    corpo = re.sub(r"--[^\n]*", " ", corpo)
    return re.sub(r"/\*.*?\*/", " ", corpo, flags=re.DOTALL)


def extrair(inv) -> Grafo:
    objs = inv.objetos
    arestas = []
    tabelas = sorted(o.atributos["nome"] for o in objs.values() if o.tipo in ("tabela", "view"))
    funcoes_por_nome = defaultdict(list)
    for o in objs.values():
        if o.tipo == "funcao":
            funcoes_por_nome[o.atributos["nome"]].append(o.chave)

    # Chaves estrangeiras (tabela → tabela).
    for o in objs.values():
        if o.tipo == "restricao" and o.atributos.get("tipo") == "chave_estrangeira":
            m = REFERENCIA_FK.search(o.atributos["definicao"])
            if not m:
                continue
            esquema, alvo = m.group(1), m.group(2)
            destino = f"tabela:{alvo}" if (esquema in (None, "public") and f"tabela:{alvo}" in objs) else f"externo:{esquema}.{alvo}"
            if destino != o.pai:
                arestas.append(Aresta(o.pai, destino, "referencia", "catalogo"))

    # Views e funções SQL → tabelas (registro do banco, parte 2).
    for d in inv.secoes.get("dependencias", []):
        alvo = f"tabela:{d['depende_de']}"
        if d["tipo_dependente"] == "view":
            arestas.append(Aresta(f"tabela:{d['dependente']}", alvo, "consulta", "catalogo"))
        else:
            for chave in funcoes_por_nome.get(d["dependente"], []):
                arestas.append(Aresta(chave, alvo, "le", "catalogo"))

    # Gatilhos → função.
    for o in objs.values():
        if o.tipo == "gatilho":
            esquema, _, nome = o.atributos["funcao"].rpartition(".")
            destinos = funcoes_por_nome.get(nome, []) if esquema in ("", "public") else []
            for chave in destinos or [f"externo:{o.atributos['funcao']}"]:
                arestas.append(Aresta(o.chave, chave, "dispara", "catalogo"))

    # Políticas → funções (leitura das condições).
    padroes_chamada = {nome: _chamada(nome) for nome in funcoes_por_nome}
    for o in objs.values():
        if o.tipo == "politica":
            texto = f"{o.atributos.get('condicao_using') or ''} {o.atributos.get('condicao_with_check') or ''}"
            for nome, padrao in padroes_chamada.items():
                if padrao.search(texto):
                    arestas += [Aresta(o.chave, chave, "usa", "codigo") for chave in funcoes_por_nome[nome]]

    # Funções → tabelas e → funções (leitura do código).
    padroes_tabela = {t: (_nome_tabela(t), _escrita(t)) for t in tabelas}
    for o in objs.values():
        if o.tipo != "funcao":
            continue
        corpo = _corpo(o.atributos.get("definicao") or "")
        for t, (menciona, escreve) in padroes_tabela.items():
            escritas = len(escreve.findall(corpo))
            mencoes = len(menciona.findall(corpo))
            if escritas:
                arestas.append(Aresta(o.chave, f"tabela:{t}", "escreve", "codigo"))
            if mencoes > escritas:
                arestas.append(Aresta(o.chave, f"tabela:{t}", "le", "codigo"))
        for esquema, nome in sorted(set(ESQUEMA_EXTERNO.findall(corpo))):
            arestas.append(Aresta(o.chave, f"externo:{esquema}.{nome}", "le", "codigo"))
        for nome, padrao in padroes_chamada.items():
            if nome != o.atributos["nome"] and padrao.search(corpo):
                arestas += [Aresta(o.chave, chave, "chama", "codigo") for chave in funcoes_por_nome[nome]]

    return Grafo(arestas)
