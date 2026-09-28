"""T008 — esqueleto do gerador: retornos, determinismo, --verificar e aviso de arquivo gerado."""

import contextlib
import io
import shutil
import tempfile
import unittest
from pathlib import Path

from ferramentas import gerar

FIX = Path(__file__).resolve().parent / "fixtures"
AVISO = "<!-- GERADO por ferramentas/gerar.py"


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.saida = self.tmp / "saida"
        self.anot = self.tmp / "anotacoes"
        self.anot.mkdir()

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def rodar(self, *extra, parte1="parte1-ok.csv"):
        args = ["--producao-parte1", str(FIX / parte1), "--producao-parte2", str(FIX / "parte2-ok.csv"),
                "--migrations", str(self.tmp / "sem-migrations"), "--anotacoes", str(self.anot),
                "--saida", str(self.saida), *extra]
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
            codigo = gerar.main(args)
        return codigo, buf.getvalue()

    def arquivos(self):
        return {p.relative_to(self.saida).as_posix(): p.read_bytes() for p in sorted(self.saida.rglob("*")) if p.is_file()}


class TestGerar(Base):
    def test_gera_com_anotacoes_vazias(self):
        codigo, saida = self.rodar()
        self.assertEqual(codigo, 0, saida)
        ultima = saida.strip().splitlines()[-1]
        self.assertIn("sem anotação", ultima)
        self.assertTrue((self.saida / "catalogo" / "README.md").exists())

    def test_inventario_invalido_retorna_1(self):
        self.assertEqual(self.rodar(parte1="parte1-total-errado.csv")[0], 1)

    def test_anotacao_invalida_retorna_2(self):
        (self.anot / "tabelas").mkdir()
        (self.anot / "tabelas" / "x.toml").write_text('[objeto."tabela:nao_existe"]\nmodulo = "x"\n', encoding="utf-8")
        self.assertEqual(self.rodar()[0], 2)

    def test_duas_execucoes_geram_os_mesmos_bytes(self):
        self.rodar()
        primeira = self.arquivos()
        self.rodar()
        self.assertEqual(primeira, self.arquivos())

    def test_verificar(self):
        self.rodar()
        self.assertEqual(self.rodar("--verificar")[0], 0)
        readme = self.saida / "catalogo" / "README.md"
        readme.write_text(readme.read_text(encoding="utf-8") + "\nmexido\n", encoding="utf-8")
        self.assertEqual(self.rodar("--verificar")[0], 3)

    def test_verificar_nao_escreve(self):
        codigo, _ = self.rodar("--verificar")
        self.assertEqual(codigo, 3)
        self.assertFalse(self.saida.exists() and any(self.saida.rglob("*.md")))

    def test_todo_arquivo_gerado_tem_o_aviso(self):
        self.rodar()
        for nome, conteudo in self.arquivos().items():
            if nome.endswith(".md"):
                self.assertTrue(conteudo.decode("utf-8").startswith(AVISO), nome)


if __name__ == "__main__":
    unittest.main()
