"""T039 — donos dos objetos e ordem dos módulos (research D6; contracts/artefatos-gerados.md)."""

import shutil
import tempfile
import textwrap
import unittest
from pathlib import Path

from ferramentas.anotacoes import carregar
from ferramentas.dependencias import extrair
from ferramentas.inventario import carregar as carregar_inventario
from ferramentas.modulos import analisar
from ferramentas.paginas import pagina_mapa, pagina_ordem

FIX = Path(__file__).resolve().parent / "fixtures"
INV = carregar_inventario(FIX / "parte1-ok.csv", FIX / "parte2-ok.csv")

# "base" (ordem 1) tem spec; "outro" (ordem 2) não tem.
MODULOS = """
[[modulo]]
id = "base"
nome = "Base"
ordem = 1
app = "core"
spec = "specs/004-base/spec.md"

[[modulo]]
id = "outro"
nome = "Outro"
ordem = 2
app = "outro"
spec = ""
"""

# filho (base, ordem 1) referencia pai (outro, ordem 2): dependência para módulo posterior.
TABELAS = """
[objeto."tabela:filho"]
modulo = "base"
finalidade = "Filhos."
fonte = ["src/x.js:1"]

[objeto."tabela:pai"]
modulo = "outro"
finalidade = "Pais."
fonte = ["src/x.js:2"]
"""


class TestModulos(unittest.TestCase):
    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        (self.pasta / "tabelas").mkdir()
        (self.pasta / "tabelas" / "t.toml").write_text(textwrap.dedent(TABELAS), encoding="utf-8")
        (self.pasta / "plataforma.toml").write_text(textwrap.dedent("""
            [objeto."evento:watch_ddl"]
            fora_escopo = { classificacao = "plataforma", motivo = "Mantido pelo provedor." }
        """), encoding="utf-8")

    def tearDown(self):
        shutil.rmtree(self.pasta)

    def analisar(self, excecoes=""):
        (self.pasta / "modulos.toml").write_text(textwrap.dedent(MODULOS + excecoes), encoding="utf-8")
        anot = carregar(self.pasta, INV)
        return analisar(INV, anot, extrair(INV))

    def test_dono_direto_herdado_e_fora_do_escopo(self):
        r = self.analisar()
        self.assertEqual(r.atribuicao["tabela:filho"].modulo, "base")
        self.assertEqual(r.atribuicao["indice:idx_filho_pai"].modulo, "base")   # herdado da tabela
        self.assertEqual(r.atribuicao["evento:watch_ddl"].fora["classificacao"], "plataforma")

    def test_objeto_sem_dono_fica_sem_atribuicao(self):
        r = self.analisar()
        self.assertIn("funcao:eh_admin()", r.sem_atribuicao)
        self.assertNotIn("tabela:filho", r.sem_atribuicao)
        self.assertNotIn("evento:watch_ddl", r.sem_atribuicao)

    def test_dependencia_para_modulo_posterior_e_violacao(self):
        r = self.analisar()
        v = [x for x in r.violacoes if (x.de, x.para) == ("tabela:filho", "tabela:pai")]
        self.assertEqual(len(v), 1)
        self.assertEqual((v[0].modulo_de, v[0].modulo_para), ("base", "outro"))
        self.assertIsNone(v[0].justificativa)
        self.assertEqual(r.nao_justificadas, 1)
        self.assertIn("outro", r.depende["base"])

    def test_violacao_com_excecao_anotada_nao_conta(self):
        r = self.analisar("""
[[excecao]]
de = "tabela:filho"
para = "tabela:pai"
justificativa = "O filho nasce antes do pai por decisão do negócio."
""")
        v = next(x for x in r.violacoes if (x.de, x.para) == ("tabela:filho", "tabela:pai"))
        self.assertIn("decisão do negócio", v.justificativa)
        self.assertEqual(r.nao_justificadas, 0)

    def test_excecao_que_nao_corresponde_a_violacao_e_erro(self):
        r = self.analisar("""
[[excecao]]
de = "tabela:pai"
para = "tabela:filho"
justificativa = "Não existe essa dependência."
""")
        self.assertTrue(any("tabela:pai" in e for e in r.erros))

    def test_paginas_do_mapa_e_da_ordem(self):
        r = self.analisar()
        anot = carregar(self.pasta, INV)
        rotulos = {"tabela": "Tabelas", "indice": "Índices", "funcao": "Funções"}
        mapa = pagina_mapa(INV, anot, r, "<!-- aviso -->\n", rotulos)
        self.assertIn("| `tabela:pai` | tabela | outro | LACUNA |", mapa)
        self.assertIn("| `tabela:filho` | tabela | base | specs/004-base/spec.md |", mapa)
        self.assertIn("fora do escopo: plataforma", mapa)
        self.assertIn("Sem atribuição", mapa)
        ordem = pagina_ordem(INV, anot, r, "<!-- aviso -->\n", rotulos)
        self.assertLess(ordem.index("## 1. Base"), ordem.index("## 2. Outro"))
        self.assertIn("VIOLAÇÃO", ordem)
        self.assertIn("tabela:filho", ordem)

    def test_modulo_sem_spec_deixa_objetos_em_lacuna(self):
        r = self.analisar()
        self.assertEqual(r.atribuicao["tabela:filho"].spec, "specs/004-base/spec.md")
        self.assertEqual(r.atribuicao["tabela:pai"].spec, "LACUNA")
        self.assertIsNone(r.atribuicao["evento:watch_ddl"].spec)   # fora do escopo não tem spec


if __name__ == "__main__":
    unittest.main()
