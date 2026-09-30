"""T045 — página de achados (contracts/artefatos-gerados.md)."""

import unittest

from ferramentas.paginas import pagina_achados

ACHADOS = [
    {"id": "A-002", "titulo": "Segundo", "objetos": ["funcao:f()"], "evidencia": "Ev 2.", "risco": "R 2.",
     "opcoes": ["Uma.", "Outra."], "recomendacao": "Rec 2.", "situacao": "decidido",
     "decisao": "Fazer a outra.", "decidido_por": "responsavel", "decidido_em": "2026-10-01"},
    {"id": "A-001", "titulo": "Primeiro", "objetos": ["tabela:x", "coluna:x.y"], "evidencia": "Ev 1.", "risco": "R 1.",
     "opcoes": ["Única."], "recomendacao": "Rec 1.", "situacao": "aguardando_decisao"},
]


class TestPaginaAchados(unittest.TestCase):
    def setUp(self):
        self.texto = pagina_achados(ACHADOS, "<!-- aviso -->\n")

    def test_contagem_por_situacao_no_topo(self):
        self.assertIn("| aguardando_decisao | 1 |", self.texto)
        self.assertIn("| decidido | 1 |", self.texto)

    def test_ordem_por_id_e_ancora(self):
        self.assertLess(self.texto.index('<a id="a-001"></a>'), self.texto.index('<a id="a-002"></a>'))

    def test_objetos_viram_links_do_catalogo(self):
        self.assertIn("[x](catalogo/tabelas/x.md)", self.texto)
        self.assertIn("[f()](catalogo/funcoes/f.md)", self.texto)
        self.assertIn("`coluna:x.y`", self.texto)

    def test_decisao_registrada(self):
        self.assertIn("Fazer a outra.", self.texto)
        self.assertIn("responsavel", self.texto)


if __name__ == "__main__":
    unittest.main()
