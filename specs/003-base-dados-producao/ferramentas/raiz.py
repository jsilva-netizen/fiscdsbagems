"""Localiza a raiz do repositório e resolve caminhos a partir dela.

As ferramentas rodam de dentro da pasta da spec, mas os caminhos padrão (inventários em
`.specify/assessments/...`) são relativos à raiz — contracts/ferramentas-cli.md, "Como rodar".
"""

from pathlib import Path

PASTA_SPEC = Path(__file__).resolve().parent.parent


def raiz_repositorio() -> Path:
    """Sobe a partir desta pasta até achar `.specify/`."""
    for pasta in [PASTA_SPEC, *PASTA_SPEC.parents]:
        if (pasta / ".specify").is_dir():
            return pasta
    raise FileNotFoundError("Raiz do repositório não encontrada (nenhuma pasta .specify/ acima de " f"{PASTA_SPEC}).")


def resolver(caminho: str | Path) -> Path:
    """Caminho absoluto é devolvido como está; relativo é resolvido a partir da raiz."""
    caminho = Path(caminho)
    return caminho if caminho.is_absolute() else raiz_repositorio() / caminho
