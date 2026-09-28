"""T006 — leitura e validação das anotações (contracts/anotacoes.md)."""

import shutil
import tempfile
import textwrap
import unittest
from pathlib import Path

from ferramentas.anotacoes import AnotacaoInvalida, carregar
from ferramentas.inventario import carregar as carregar_inventario

FIX = Path(__file__).resolve().parent / "fixtures"
INV = carregar_inventario(FIX / "parte1-ok.csv", FIX / "parte2-ok.csv")

MODULOS = """
[[modulo]]
id = "base"
nome = "Base"
ordem = 1
app = "core"
spec = ""
observacao = ""
"""


class Base(unittest.TestCase):
    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        (self.pasta / "tabelas").mkdir()
        (self.pasta / "funcoes").mkdir()
        self.escrever("modulos.toml", MODULOS)

    def tearDown(self):
        shutil.rmtree(self.pasta)

    def escrever(self, nome, texto):
        (self.pasta / nome).write_text(textwrap.dedent(texto), encoding="utf-8")

    def carregar(self):
        return carregar(self.pasta, INV)

    def assertInvalida(self, trecho):
        with self.assertRaises(AnotacaoInvalida) as ctx:
            self.carregar()
        self.assertIn(trecho, str(ctx.exception))


class TestValidas(Base):
    def test_toml_valido_e_heranca_de_modulo(self):
        self.escrever("tabelas/filho.toml", """
            [objeto."tabela:filho"]
            modulo = "base"
            finalidade = "Filhos."
            fonte = ["src/x.js:1"]

            [objeto."coluna:filho.status"]
            significado = "Situação."
            fonte = ["src/x.js:2"]
        """)
        a = self.carregar()
        self.assertEqual(a.dono("coluna:filho.status", INV), ("base", None))
        self.assertEqual(a.dono("coluna:filho.fotos", INV), ("base", None))
        self.assertEqual(a.dono("indice:idx_filho_pai", INV), ("base", None))

    def test_coluna_sem_significado_e_sem_anotacao_nao_erro(self):
        self.escrever("tabelas/filho.toml", """
            [objeto."tabela:filho"]
            modulo = "base"
            finalidade = "Filhos."
            fonte = ["src/x.js:1"]
        """)
        a = self.carregar()
        pendentes = a.sem_anotacao(INV)
        self.assertIn("coluna:filho.status", pendentes)
        self.assertNotIn("tabela:filho", pendentes)
        self.assertNotIn("indice:idx_filho_pai", pendentes)  # índice não exige texto

    def test_hipotese_dispensa_fonte(self):
        self.escrever("tabelas/filho.toml", """
            [objeto."tabela:filho"]
            modulo = "base"
            finalidade = "Talvez filhos."
            hipotese = true
        """)
        self.assertTrue(self.carregar().objetos["tabela:filho"]["hipotese"])

    def test_politica_de_storage_herda_do_bucket(self):
        self.escrever("arquivos.toml", """
            [objeto."bucket:fotos"]
            modulo = "base"
            finalidade = "Fotos."
            fonte = ["src/x.js:3"]
        """)
        self.assertEqual(self.carregar().dono("politica:storage.objects.ler fotos", INV), ("base", None))

    def test_fora_do_escopo_nao_exige_texto(self):
        self.escrever("plataforma.toml", """
            [objeto."evento:watch_ddl"]
            fora_escopo = { classificacao = "plataforma", motivo = "Mantido pelo provedor." }
        """)
        a = self.carregar()
        self.assertNotIn("evento:watch_ddl", a.sem_anotacao(INV))
        self.assertEqual(a.dono("evento:watch_ddl", INV)[1]["classificacao"], "plataforma")

    def test_arquivos_ausentes_contam_como_vazios(self):
        a = self.carregar()
        self.assertEqual(a.achados, [])
        self.assertEqual(a.divergencias, {})
        self.assertEqual(a.externos, [])


class TestInvalidas(Base):
    def test_chave_orfa(self):
        self.escrever("tabelas/x.toml", """
            [objeto."tabela:nao_existe"]
            modulo = "base"
            finalidade = "?"
            hipotese = true
        """)
        self.assertInvalida("tabela:nao_existe")

    def test_tabela_sem_modulo(self):
        self.escrever("tabelas/filho.toml", """
            [objeto."tabela:filho"]
            finalidade = "Filhos."
            fonte = ["src/x.js:1"]
        """)
        self.assertInvalida("tabela:filho")

    def test_modulo_inexistente(self):
        self.escrever("tabelas/filho.toml", """
            [objeto."tabela:filho"]
            modulo = "outro"
            finalidade = "Filhos."
            fonte = ["src/x.js:1"]
        """)
        self.assertInvalida("outro")

    def test_texto_sem_fonte_nem_hipotese(self):
        self.escrever("tabelas/filho.toml", """
            [objeto."tabela:filho"]
            modulo = "base"
            finalidade = "Filhos."
            fonte = []
        """)
        self.assertInvalida("fonte")

    def test_descartar_sem_achado(self):
        self.escrever("plataforma.toml", """
            [objeto."politica:public.filho.admin faz tudo"]
            fora_escopo = { classificacao = "descartar", motivo = "Resíduo de teste." }
        """)
        self.assertInvalida("achado")

    def test_chave_repetida_em_dois_arquivos(self):
        for nome in ("tabelas/a.toml", "tabelas/b.toml"):
            self.escrever(nome, """
                [objeto."tabela:filho"]
                modulo = "base"
                finalidade = "Filhos."
                fonte = ["src/x.js:1"]
            """)
        self.assertInvalida("tabela:filho")

    def test_classificacao_de_divergencia_invalida(self):
        self.escrever("divergencias.toml", """
            [divergencia."funcao:eh_admin()"]
            classificacao = "tanto_faz"
            justificativa = "x"
        """)
        self.assertInvalida("tanto_faz")

    def test_situacao_de_achado_invalida(self):
        self.escrever("achados.toml", """
            [[achado]]
            id = "A-001"
            titulo = "x"
            objetos = []
            evidencia = "x"
            risco = "x"
            opcoes = ["a"]
            recomendacao = "a"
            situacao = "talvez"
        """)
        self.assertInvalida("talvez")

    def test_decidido_sem_decisao_completa(self):
        self.escrever("achados.toml", """
            [[achado]]
            id = "A-001"
            titulo = "x"
            objetos = []
            evidencia = "x"
            risco = "x"
            opcoes = ["a"]
            recomendacao = "a"
            situacao = "decidido"
            decisao = "a"
            decidido_por = "responsável"
            decidido_em = "28/09/2026"
        """)
        self.assertInvalida("decidido_em")

    def test_toml_com_erro_de_sintaxe(self):
        self.escrever("tabelas/filho.toml", '[objeto."tabela:filho"\nmodulo = ')
        self.assertInvalida("filho.toml")


if __name__ == "__main__":
    unittest.main()
