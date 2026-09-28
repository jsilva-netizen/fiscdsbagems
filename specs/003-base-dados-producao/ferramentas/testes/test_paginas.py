"""T012 — páginas do catálogo (contracts/artefatos-gerados.md)."""

import contextlib
import io
import shutil
import tempfile
import textwrap
import unittest
from pathlib import Path

from ferramentas import gerar

FIX = Path(__file__).resolve().parent / "fixtures"

SECOES_TABELA = [
    "## Finalidade", "## Colunas", "## Restrições e índices", "## Dependências",
    "## Gatilhos", "## Políticas de acesso", "## Divergências e achados",
]


class TestPaginas(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        anot = cls.tmp / "anotacoes"
        (anot / "tabelas").mkdir(parents=True)
        (anot / "modulos.toml").write_text(textwrap.dedent("""
            [[modulo]]
            id = "base"
            nome = "Base"
            ordem = 1
            app = "core"
        """), encoding="utf-8")
        (anot / "tabelas" / "filho.toml").write_text(textwrap.dedent("""
            [objeto."tabela:filho"]
            modulo = "base"
            finalidade = "Guarda os filhos."
            fonte = ["src/x.js:1"]

            [objeto."coluna:filho.status"]
            significado = "Situação do filho, provavelmente."
            hipotese = true
        """), encoding="utf-8")
        args = ["--producao-parte1", str(FIX / "parte1-ok.csv"), "--producao-parte2", str(FIX / "parte2-ok.csv"),
                "--migrations", str(cls.tmp / "nada"), "--anotacoes", str(anot), "--saida", str(cls.tmp / "saida")]
        with contextlib.redirect_stdout(io.StringIO()):
            assert gerar.main(args) == 0
        cls.cat = cls.tmp / "saida" / "catalogo"

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def ler(self, nome):
        return (self.cat / nome).read_text(encoding="utf-8")

    def test_pagina_de_tabela_tem_as_secoes_na_ordem(self):
        texto = self.ler("tabelas/filho.md")
        self.assertIn("# filho", texto)
        posicoes = [texto.index(s) for s in SECOES_TABELA]
        self.assertEqual(posicoes, sorted(posicoes))

    def test_cabecalho_da_tabela(self):
        texto = self.ler("tabelas/filho.md")
        self.assertIn("base", texto)          # módulo dono
        self.assertIn("Guarda os filhos.", texto)

    def test_hipotese_marcada(self):
        texto = self.ler("tabelas/filho.md")
        linha = next(l for l in texto.splitlines() if "Situação do filho" in l)
        self.assertIn("hipótese", linha)

    def test_valores_em_uso_e_estrutura_json(self):
        texto = self.ler("tabelas/filho.md")
        self.assertIn("`aberto` (3)", texto)
        self.assertIn("path", texto)

    def test_dependencias_na_pagina(self):
        texto = self.ler("tabelas/filho.md")
        self.assertIn("pai", texto)
        self.assertIn("registrar_filho", texto)

    def test_funcao_com_uma_secao_por_sobrecarga(self):
        texto = self.ler("funcoes/resumo.md")
        self.assertEqual(texto.count("\n## `resumo("), 2)
        self.assertIn("p_ano integer, p_tipo text", texto)

    def test_arquivos_agrupa_politica_de_storage_pelo_bucket(self):
        texto = self.ler("arquivos.md")
        bloco = texto[texto.index("## fotos"):]
        self.assertIn("ler fotos", bloco)

    def test_acesso_lista_privilegios_do_anon(self):
        texto = self.ler("acesso.md")
        self.assertIn("anon", texto)
        self.assertIn("eh_admin", texto)

    def test_readme_tem_links_para_as_paginas(self):
        texto = self.ler("README.md")
        self.assertIn("(tabelas/filho.md)", texto)
        self.assertIn("(funcoes/resumo.md)", texto)


if __name__ == "__main__":
    unittest.main()
