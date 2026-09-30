"""Dono de cada objeto e ordem de especificação dos módulos (T040; research D6).

Um objeto depende de outro quando o grafo de `dependencias.py` tem uma aresta dele para o outro
(chave estrangeira, view, gatilho, política que usa função, função que lê, escreve ou chama).
Se o módulo do dependente vem ANTES, na ordem, do módulo de que ele depende, a ordem é violada:
a spec de um módulo precisaria de outro ainda não escrito. A violação pode ser aceita com uma
`[[excecao]]` em `modulos.toml`, que liga dois objetos (`de`, `para`) e diz por quê.
"""

from collections import defaultdict
from dataclasses import dataclass, field


@dataclass
class Atribuicao:
    modulo: str | None
    fora: dict | None
    spec: str | None   # caminho da spec, "LACUNA" se o módulo ainda não tem, None se fora do escopo/sem dono


@dataclass
class Violacao:
    de: str
    para: str
    natureza: str
    modulo_de: str
    modulo_para: str
    justificativa: str | None = None


@dataclass
class Analise:
    atribuicao: dict = field(default_factory=dict)       # chave -> Atribuicao
    sem_atribuicao: list = field(default_factory=list)
    depende: dict = field(default_factory=dict)          # módulo -> {módulos de que depende}
    violacoes: list = field(default_factory=list)
    erros: list = field(default_factory=list)            # exceções que não correspondem a violação

    @property
    def nao_justificadas(self) -> int:
        return sum(1 for v in self.violacoes if not v.justificativa)


def analisar(inv, anot, grafo) -> Analise:
    r = Analise()
    specs = {m["id"]: (m.get("spec") or "").strip() for m in anot.modulos}
    ordem = {m["id"]: m.get("ordem", 999) for m in anot.modulos}

    for chave in inv.objetos:
        modulo, fora = anot.dono(chave, inv)
        spec = (specs.get(modulo) or "LACUNA") if modulo else None
        r.atribuicao[chave] = Atribuicao(modulo, fora, spec)
        if not modulo and not fora:
            r.sem_atribuicao.append(chave)
    r.sem_atribuicao.sort()

    excecoes = {(e.get("de"), e.get("para")): (e.get("justificativa") or "").strip() for e in anot.excecoes}
    usadas = set()
    depende = defaultdict(set)
    for a in grafo.arestas:
        mde = r.atribuicao.get(a.de)
        mpara = r.atribuicao.get(a.para)
        if not (mde and mpara and mde.modulo and mpara.modulo) or mde.modulo == mpara.modulo:
            continue
        depende[mde.modulo].add(mpara.modulo)
        if ordem.get(mde.modulo, 999) < ordem.get(mpara.modulo, 999):
            justificativa = excecoes.get((a.de, a.para)) or None
            if justificativa:
                usadas.add((a.de, a.para))
            r.violacoes.append(Violacao(a.de, a.para, a.natureza, mde.modulo, mpara.modulo, justificativa))
    r.depende = {m: sorted(d, key=lambda x: (ordem.get(x, 999), x)) for m, d in depende.items()}
    r.violacoes.sort(key=lambda v: (ordem.get(v.modulo_de, 999), v.de, v.para, v.natureza))

    for (de, para), justificativa in sorted(excecoes.items(), key=lambda x: (str(x[0][0]), str(x[0][1]))):
        if not justificativa:
            r.erros.append(f"modulos.toml: exceção {de} -> {para} sem 'justificativa'.")
        elif (de, para) not in usadas:
            r.erros.append(f"modulos.toml: exceção {de} -> {para} não corresponde a nenhuma violação de ordem.")
    return r
