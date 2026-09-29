"""Inventário do banco reconstruído só pelas migrations do repositório (T034; research D5).

Roda os mesmos dois scripts de inventário de produção no Postgres do Supabase LOCAL e grava
`inventario/migrations-parte1.tsv` e `inventario/migrations-parte2.tsv`.

Uso, de dentro de specs/003-base-dados-producao/:
    python -m ferramentas.inventario_migrations                # inventaria o banco local como está
    python -m ferramentas.inventario_migrations --reconstruir  # antes, `npx supabase db reset` (pede confirmação)

Retornos: 0 ok · 1 falha ao rodar · 4 recusado (contêiner não local ou confirmação negada).
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from ferramentas.inventario import InventarioInvalido, carregar
from ferramentas.raiz import PASTA_SPEC, raiz_repositorio

SCRIPTS = {
    "migrations-parte1.tsv": ".specify/assessments/novo-sistema-django-apps/inventario-producao.sql",
    "migrations-parte2.tsv": ".specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.sql",
}
PASTA_SAIDA = PASTA_SPEC / "inventario"


def _docker(*args, entrada: bytes | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(["docker", *args], input=entrada, capture_output=True, check=False)


def conferir_local(container: str) -> str | None:
    """Motivo da recusa, ou None se o contêiner roda no Docker desta máquina."""
    r = _docker("context", "inspect")
    if r.returncode != 0:
        return f"docker indisponível: {r.stderr.decode(errors='replace').strip()}"
    try:
        host = json.loads(r.stdout)[0]["Endpoints"]["docker"]["Host"]
    except (ValueError, KeyError, IndexError):
        return "não foi possível ler o endereço do Docker"
    if not host.startswith(("unix://", "npipe://")):
        return f"o Docker aponta para {host}, que não é local"
    r = _docker("inspect", "-f", "{{.State.Running}}", container)
    if r.returncode != 0 or r.stdout.decode().strip() != "true":
        return f"contêiner {container} não está rodando (npx supabase start)"
    return None


def reconstruir(confirmar=input) -> bool:
    resposta = confirmar("Isto apaga os dados do banco LOCAL e o recria só pelas migrations. Digite 'sim' para seguir: ")
    if resposta.strip().lower() != "sim":
        return False
    npx = "npx.cmd" if os.name == "nt" else "npx"
    r = subprocess.run([npx, "supabase", "db", "reset"], cwd=raiz_repositorio(), check=False)
    return r.returncode == 0


def inventariar(container: str) -> list[Path]:
    PASTA_SAIDA.mkdir(exist_ok=True)
    gravados = []
    for nome, script in SCRIPTS.items():
        sql = (raiz_repositorio() / script).read_bytes()
        r = _docker("exec", "-i", "-e", "PGCLIENTENCODING=UTF8", container,
                    "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1",
                    "-A", "-F", "\t", "-P", "pager=off", "-f", "-", entrada=sql)
        if r.returncode != 0:
            raise RuntimeError(f"{script}: {r.stderr.decode('utf-8', errors='replace').strip()}")
        destino = PASTA_SAIDA / nome
        destino.write_text(r.stdout.decode("utf-8").replace("\r\n", "\n"), encoding="utf-8", newline="\n")
        gravados.append(destino)
    return gravados


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="python -m ferramentas.inventario_migrations", description=__doc__.splitlines()[0])
    ap.add_argument("--container", default="supabase_db_fiscdsbagems")
    ap.add_argument("--reconstruir", action="store_true")
    a = ap.parse_args(argv)

    motivo = conferir_local(a.container)
    if motivo:
        print(f"Recusado: {motivo}.", file=sys.stderr)
        return 4
    if a.reconstruir and not reconstruir():
        print("Recusado: banco local não reconstruído.", file=sys.stderr)
        return 4
    try:
        p1, p2 = inventariar(a.container)
        inv = carregar(p1, p2)
    except (RuntimeError, InventarioInvalido) as e:
        print(f"Falha: {e}", file=sys.stderr)
        return 1
    print(f"{len(inv.objetos)} objetos inventariados em {p1.parent}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
