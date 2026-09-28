"""Varredura de dados sensíveis na pasta da spec (research.md D8; SC-005).

Uso, de dentro de specs/003-base-dados-producao/:  python -m ferramentas.varredura
Retorno 0 = nada encontrado; 1 = encontrado (arquivo, linha e tipo — nunca o valor).
"""

import math
import re
import sys
from dataclasses import dataclass
from pathlib import Path

from ferramentas.raiz import PASTA_SPEC, resolver

EXTENSOES_TEXTO = {".md", ".toml", ".py", ".csv", ".tsv", ".json", ".sql", ".txt"}
IGNORAR = {"__pycache__"}

EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
CPF_MASCARA = re.compile(r"(?<!\d)\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)")
CNPJ_MASCARA = re.compile(r"(?<!\d)\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}(?!\d)")
DIGITOS = re.compile(r"(?<![\d-])\d{11}(?!\d)|(?<![\d-])\d{14}(?!\d)")
JWT = re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}")
CANDIDATO_CHAVE = re.compile(r"[A-Za-z0-9+/_-]{32,}={0,2}")

# Mesmo padrão de colunas pessoais do inventario-producao-parte2.sql (seção 32).
PADRAO_PESSOAL = re.compile(
    r"(nome|name|email|mail|cpf|cnpj|telefone|phone|celular|endereco|address|logradouro|responsavel|razao|"
    r"fantasia|contato|representante|procurador|autor|author|usuario|user|_by$|cargo|matricula)",
    re.IGNORECASE,
)


@dataclass
class Achado:
    arquivo: str
    linha: int
    tipo: str

    def __str__(self):
        return f"{self.arquivo}:{self.linha}: {self.tipo}"


def _cpf_valido(d: str) -> bool:
    if len(d) != 11 or len(set(d)) == 1:
        return False
    for n in (9, 10):
        soma = sum(int(d[i]) * (n + 1 - i) for i in range(n))
        if (soma * 10 % 11) % 10 != int(d[n]):
            return False
    return True


def _cnpj_valido(d: str) -> bool:
    if len(d) != 14 or len(set(d)) == 1:
        return False
    for n, pesos in ((12, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]), (13, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])):
        resto = sum(int(d[i]) * pesos[i] for i in range(n)) % 11
        if (0 if resto < 2 else 11 - resto) != int(d[n]):
            return False
    return True


def _entropia(s: str) -> float:
    return -sum(c / len(s) * math.log2(c / len(s)) for c in (s.count(x) for x in set(s)))


def _parece_chave(s: str) -> bool:
    """Texto longo, com maiúscula, minúscula e dígito, e aleatório (entropia alta)."""
    corpo = s.rstrip("=")
    if not (re.search(r"[A-Z]", corpo) and re.search(r"[a-z]", corpo) and re.search(r"\d", corpo)):
        return False
    return _entropia(corpo) >= 4.0


def _linha(texto: str) -> list[str]:
    tipos = []
    if EMAIL.search(texto):
        tipos.append("e-mail")
    for m in CPF_MASCARA.finditer(texto):
        if _cpf_valido(re.sub(r"\D", "", m.group())):
            tipos.append("CPF")
    for m in CNPJ_MASCARA.finditer(texto):
        if _cnpj_valido(re.sub(r"\D", "", m.group())):
            tipos.append("CNPJ")
    for m in DIGITOS.finditer(texto):
        d = m.group()
        if len(d) == 11 and _cpf_valido(d):
            tipos.append("CPF")
        if len(d) == 14 and _cnpj_valido(d):
            tipos.append("CNPJ")
    if JWT.search(texto):
        tipos.append("JWT")
    else:
        for m in CANDIDATO_CHAVE.finditer(texto):
            if _parece_chave(m.group()):
                tipos.append("possível chave ou segredo")
                break
    return sorted(set(tipos))


def varrer(pasta: str | Path) -> list[Achado]:
    pasta = Path(pasta)
    achados = []
    for p in sorted(pasta.rglob("*")):
        if not p.is_file() or IGNORAR & set(p.relative_to(pasta).parts) or p.suffix.lower() not in EXTENSOES_TEXTO:
            continue
        try:
            linhas = p.read_text(encoding="utf-8").splitlines()
        except UnicodeDecodeError:
            continue
        for n, texto in enumerate(linhas, 1):
            for tipo in _linha(texto):
                achados.append(Achado(p.relative_to(pasta).as_posix(), n, tipo))
    return achados


def colunas_pessoais_com_valores(dominio_categorico: list[dict]) -> list[str]:
    """Colunas cujo nome indica dado pessoal e que vieram com valores listados no inventário."""
    return sorted(f"{c['tabela']}.{c['coluna']}" for c in dominio_categorico
                  if "valores" in c and PADRAO_PESSOAL.search(c["coluna"]))


def main(argv=None) -> int:
    achados = varrer(PASTA_SPEC)
    from ferramentas.gerar import PADRAO_P1, PADRAO_P2
    from ferramentas.inventario import carregar
    try:
        inv = carregar(resolver(PADRAO_P1), resolver(PADRAO_P2))
        pessoais = colunas_pessoais_com_valores(inv.secoes.get("dominio_categorico", []))
    except Exception as e:  # inventário ausente não impede a varredura dos arquivos
        print(f"aviso: inventário de produção não verificado ({e})")
        pessoais = []
    for a in achados:
        print(a)
    for c in pessoais:
        print(f"inventário: coluna pessoal com valores listados: {c}")
    total = len(achados) + len(pessoais)
    print(f"Varredura: {total} ocorrência(s).")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
