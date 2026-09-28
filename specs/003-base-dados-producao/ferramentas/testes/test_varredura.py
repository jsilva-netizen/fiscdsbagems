"""T010 — varredura de dados sensíveis (research.md D8)."""

import shutil
import tempfile
import unittest
from pathlib import Path

from ferramentas import varredura

# Valores de teste montados em partes para que este próprio arquivo não seja apontado pela varredura.
EMAIL = "fulano" + "@" + "exemplo.gov.br"
CPF_VALIDO = "529.982.247" + "-25"
CPF_SEM_MASCARA = "529982" + "24725"
CNPJ_VALIDO = "11.222.333" + "/0001-81"
JWT = "eyJ" + "hbGciOiJIUzI1NiJ9" + "." + "eyJzdWIiOiIxMjM0NTY3ODkwIn0" + "." + "dozjgNryP4J3jVmN" + "Hl0w5N_XgL0n3I9P" + "lFUP0THsR8U"
CHAVE = "sk" + "_live_" + "9fQ2xLmZ7Rk3TbWv" + "8YhN4cPjD6sAeGu1"


class TestVarredura(unittest.TestCase):
    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())

    def tearDown(self):
        shutil.rmtree(self.pasta)

    def achados(self, texto):
        (self.pasta / "a.md").write_text(texto, encoding="utf-8")
        return varredura.varrer(self.pasta)

    def tipos(self, texto):
        return {a.tipo for a in self.achados(texto)}

    def test_texto_limpo(self):
        texto = ("# Tabela caters_municipality_responses\n"
                 "Coluna `status`: situação do processo. Índice idx_unidades_fiscalizacao.\n"
                 "UUID 3f2b8c1e-5a7d-4e9b-8c2a-1d4f6b7e9a0c e contagem 12345678901234 linhas.\n")
        self.assertEqual(self.achados(texto), [])

    def test_email(self):
        self.assertIn("e-mail", self.tipos(f"contato: {EMAIL}\n"))

    def test_cpf_com_e_sem_mascara(self):
        self.assertIn("CPF", self.tipos(f"cpf {CPF_VALIDO}\n"))
        self.assertIn("CPF", self.tipos(f"cpf {CPF_SEM_MASCARA}\n"))

    def test_cnpj(self):
        self.assertIn("CNPJ", self.tipos(f"cnpj {CNPJ_VALIDO}\n"))

    def test_numero_qualquer_de_11_digitos_nao_e_cpf(self):
        self.assertNotIn("CPF", self.tipos("total 12345678901 linhas\n"))

    def test_jwt(self):
        self.assertIn("JWT", self.tipos(f"token {JWT}\n"))

    def test_chave_de_alta_entropia(self):
        self.assertIn("possível chave ou segredo", self.tipos(f"x = {CHAVE}\n"))

    def test_mensagem_nao_repete_o_valor(self):
        (a,) = self.achados(f"contato: {EMAIL}\n")
        self.assertNotIn(EMAIL, str(a))
        self.assertIn("a.md:1", str(a))

    def test_ignora_pycache_e_binarios(self):
        (self.pasta / "__pycache__").mkdir()
        (self.pasta / "__pycache__" / "x.pyc").write_bytes(EMAIL.encode())
        self.assertEqual(varredura.varrer(self.pasta), [])


class TestColunasPessoais(unittest.TestCase):
    def test_coluna_pessoal_com_valores_e_apontada(self):
        dominio = [{"tabela": "prestadores_servico", "coluna": "responsavel", "valores": {"x": 1}},
                   {"tabela": "fiscalizacoes", "coluna": "status", "valores": {"aberta": 1}}]
        self.assertEqual(varredura.colunas_pessoais_com_valores(dominio), ["prestadores_servico.responsavel"])


if __name__ == "__main__":
    unittest.main()
