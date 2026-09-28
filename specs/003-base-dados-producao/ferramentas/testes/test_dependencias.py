"""T011 — extração de dependências (research.md D4)."""

import unittest
from pathlib import Path

from ferramentas.dependencias import Aresta, extrair
from ferramentas.inventario import carregar

FIX = Path(__file__).resolve().parent / "fixtures"
INV = carregar(FIX / "parte1-ok.csv", FIX / "parte2-ok.csv")
G = extrair(INV)

F_REGISTRAR = "funcao:registrar_filho(p_pai uuid)"
F_ADMIN = "funcao:eh_admin()"


def tem(de, para, natureza, origem):
    return Aresta(de, para, natureza, origem) in G.arestas


class TestExtracao(unittest.TestCase):
    def test_fk(self):
        self.assertTrue(tem("tabela:filho", "tabela:pai", "referencia", "catalogo"))

    def test_fk_para_fora_da_aplicacao(self):
        self.assertTrue(tem("tabela:pai", "externo:auth.users", "referencia", "catalogo"))

    def test_view(self):
        self.assertTrue(tem("tabela:resumo_filhos", "tabela:filho", "consulta", "catalogo"))

    def test_gatilho_dispara_funcao(self):
        self.assertTrue(tem("gatilho:public.filho.trg_filho_atualizado", "funcao:marcar_atualizacao()", "dispara", "catalogo"))
        self.assertTrue(tem("gatilho:auth.users.ao_criar_usuario", "funcao:novo_usuario()", "dispara", "catalogo"))

    def test_politica_usa_funcao(self):
        self.assertTrue(tem("politica:public.filho.admin faz tudo", F_ADMIN, "usa", "codigo"))

    def test_funcao_escreve_e_le(self):
        self.assertTrue(tem(F_REGISTRAR, "tabela:filho", "escreve", "codigo"))
        self.assertTrue(tem(F_REGISTRAR, "tabela:pai", "escreve", "codigo"))  # UPDATE public.pai
        self.assertTrue(tem(F_REGISTRAR, "tabela:pai_x", "le", "codigo"))
        self.assertTrue(tem("funcao:resumo(p_ano integer)", "tabela:pai", "le", "codigo"))
        self.assertTrue(tem("funcao:resumo(p_ano integer, p_tipo text)", "tabela:filho", "le", "codigo"))

    def test_nome_de_tabela_dentro_de_outro_nome_nao_conta(self):
        # "pai" aparece em "pai_x" e "pai_id", mas registrar_filho só LÊ pai_x; não lê "pai".
        self.assertFalse(tem(F_REGISTRAR, "tabela:pai", "le", "codigo"))

    def test_funcao_chama_funcao(self):
        self.assertTrue(tem(F_REGISTRAR, F_ADMIN, "chama", "codigo"))

    def test_funcao_nao_chama_a_si_mesma(self):
        self.assertFalse(any(a.de == a.para for a in G.arestas))

    def test_inversas(self):
        for a in G.arestas:
            self.assertIn(a, G.dependencias_de(a.de))
            self.assertIn(a, G.dependentes_de(a.para))


if __name__ == "__main__":
    unittest.main()
