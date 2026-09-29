"""T032 — divergências entre produção e o banco das migrations (research D5, data-model "Divergência")."""

import unittest

from ferramentas.divergencias import classificacao, comparar, validar_anotacoes
from ferramentas.paginas import pagina_divergencias
from ferramentas.inventario import Inventario, Objeto

CODIGO = "CREATE FUNCTION f() RETURNS int LANGUAGE sql AS $$\n  SELECT 1;\n$$"


def _inv(*objetos, views=()):
    return Inventario(secoes={"views": list(views)}, objetos={o.chave: o for o in objetos})


def _funcao(nome, definicao, **extra):
    return Objeto(f"funcao:{nome}()", "funcao", {"nome": nome, "argumentos": "", "definicao": definicao, **extra})


def _coluna(tabela, coluna, tipo, **extra):
    return Objeto(f"coluna:{tabela}.{coluna}", "coluna",
                  {"tabela": tabela, "coluna": coluna, "tipo": tipo, "obrigatoria": False, **extra}, f"tabela:{tabela}")


class TestComparar(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        producao = _inv(
            Objeto("tabela:so_prod", "tabela", {"nome": "so_prod", "linhas_exatas": 3}),
            Objeto("tabela:igual", "tabela", {"nome": "igual", "linhas_exatas": 40, "tamanho_bytes": 8192}),
            _funcao("espacos", CODIGO),
            _funcao("mudou", CODIGO),
            _coluna("igual", "valor", "numeric", posicao=5),
            _coluna("igual", "nota", "text", comentario="Linha um.\r\n  Linha dois."),
        )
        migrations = _inv(
            Objeto("tabela:so_mig", "tabela", {"nome": "so_mig", "linhas_exatas": 0}),
            Objeto("tabela:igual", "tabela", {"nome": "igual", "linhas_exatas": 0, "tamanho_bytes": 0}),
            _funcao("espacos", "CREATE FUNCTION f() RETURNS int LANGUAGE sql AS $$ SELECT 1; $$"),
            _funcao("mudou", CODIGO.replace("SELECT 1", "SELECT 2")),
            _coluna("igual", "valor", "integer", posicao=3),
            _coluna("igual", "nota", "text", comentario="Linha um.\n  Linha dois."),
        )
        cls.divs = {d.chave: d for d in comparar(producao, migrations)}

    def test_objeto_so_de_um_lado(self):
        self.assertEqual(self.divs["tabela:so_prod"].tipo, "so_producao")
        self.assertEqual(self.divs["tabela:so_mig"].tipo, "so_migrations")

    def test_contagens_e_tamanhos_nao_divergem(self):
        self.assertNotIn("tabela:igual", self.divs)

    def test_codigo_diferente_so_em_espacos_nao_diverge(self):
        self.assertNotIn("funcao:espacos()", self.divs)

    def test_codigo_realmente_diferente_tem_diff(self):
        d = self.divs["funcao:mudou()"]
        self.assertEqual(d.tipo, "codigo_diferente")
        # O diff vai das migrations (-) para produção (+).
        self.assertIn("-  SELECT 2;", d.diff)
        self.assertIn("+  SELECT 1;", d.diff)

    def test_coluna_com_tipo_diferente_diverge_na_estrutura(self):
        d = self.divs["coluna:igual.valor"]
        self.assertEqual(d.tipo, "estrutura_diferente")
        self.assertIn("tipo", d.detalhe)
        self.assertNotIn("posicao", d.detalhe)  # a ordem física das colunas não muda comportamento

    def test_comentario_diferente_so_no_fim_de_linha_nao_diverge(self):
        self.assertNotIn("coluna:igual.nota", self.divs)

    def test_ordem_estavel(self):
        self.assertEqual(list(self.divs), sorted(self.divs))

    def test_view_com_definicao_diferente(self):
        view = Objeto("tabela:v", "view", {"nome": "v"})
        prod = _inv(view, views=[{"nome": "v", "definicao": "SELECT 1"}])
        mig = _inv(view, views=[{"nome": "v", "definicao": "SELECT 2"}])
        self.assertEqual([d.tipo for d in comparar(prod, mig)], ["codigo_diferente"])


class TestClassificacao(unittest.TestCase):
    def test_sem_anotacao_sai_nao_classificada(self):
        d = comparar(_inv(Objeto("tabela:x", "tabela", {"nome": "x"})), _inv())[0]
        self.assertEqual(classificacao(d, {}), "nao_classificada")
        self.assertEqual(classificacao(d, {"tabela:x": {"classificacao": "producao_vale"}}), "producao_vale")

    def test_anotacao_orfa_e_codigo_sem_resumo_sao_erros(self):
        divs = comparar(_inv(_funcao("f", "SELECT 1")), _inv(_funcao("f", "SELECT 2")))
        erros = validar_anotacoes(divs, {"funcao:f()": {"classificacao": "producao_vale"},
                                         "tabela:sumiu": {"classificacao": "producao_vale"}})
        self.assertEqual(len(erros), 2)
        self.assertTrue(any("resumo_codigo" in e for e in erros))
        self.assertTrue(any("tabela:sumiu" in e for e in erros))
        self.assertEqual(validar_anotacoes(divs, {"funcao:f()": {"resumo_codigo": "Troca 2 por 1."}}), [])


class TestPagina(unittest.TestCase):
    def test_pagina_tem_resumo_classificacao_e_diff(self):
        divs = comparar(_inv(_funcao("f", "SELECT 1"), Objeto("tabela:x", "tabela", {"nome": "x"})),
                        _inv(_funcao("f", "SELECT 2")))
        anotadas = {"funcao:f()": {"classificacao": "producao_vale", "justificativa": "Produção corrigiu.",
                                   "resumo_codigo": "Devolve 1 em vez de 2."}}
        texto = pagina_divergencias(divs, anotadas, "<!-- aviso -->\n", {"funcao": "Funções", "tabela": "Tabelas"})
        self.assertIn("| so_producao | 1 |", texto.replace("  ", " "))
        self.assertIn("nao_classificada", texto)
        self.assertIn("Produção corrigiu.", texto)
        self.assertIn("Devolve 1 em vez de 2.", texto)
        self.assertIn("```diff", texto)
        self.assertLess(texto.index("## Funções"), texto.index("## Tabelas"))


if __name__ == "__main__":
    unittest.main()
