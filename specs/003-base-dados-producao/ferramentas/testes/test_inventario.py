"""T004 — leitura e validação dos inventários (data-model.md, "Inventário" e "Chave do objeto")."""

import re
import shutil
import tempfile
import unittest
from pathlib import Path

from ferramentas.inventario import InventarioInvalido, carregar

FIX = Path(__file__).resolve().parent / "fixtures"
P1, P2 = FIX / "parte1-ok.csv", FIX / "parte2-ok.csv"

FORMATO_CHAVE = re.compile(
    r"^(tabela|coluna|restricao|indice|funcao|gatilho|politica|tipo|bucket|papel|privilegio|privilegio_padrao|"
    r"privilegio_coluna|segredo|evento|extensao|sequencia|publicacao|agendamento):.+"
)


class TestCarregar(unittest.TestCase):
    def setUp(self):
        self.inv = carregar(P1, P2)

    def test_carrega_as_duas_partes(self):
        self.assertIn("tabelas", self.inv.secoes)
        self.assertIn("papeis", self.inv.secoes)

    def test_secoes_de_texto_viram_listas_vazias(self):
        self.assertEqual(self.inv.secoes["migracoes_aplicadas"], [])
        self.assertEqual(self.inv.secoes["agendamentos"], [])

    def test_sobrecargas_de_funcao_tem_chaves_distintas(self):
        chaves = [c for c in self.inv.objetos if c.startswith("funcao:resumo(")]
        self.assertEqual(sorted(chaves), ["funcao:resumo(p_ano integer)", "funcao:resumo(p_ano integer, p_tipo text)"])

    def test_toda_chave_segue_o_formato(self):
        ruins = [c for c in self.inv.objetos if not FORMATO_CHAVE.match(c)]
        self.assertEqual(ruins, [])

    def test_chaves_esperadas(self):
        for chave in [
            "tabela:filho", "tabela:resumo_filhos", "coluna:filho.status", "restricao:filho.filho_pai_id_fkey",
            "indice:idx_filho_pai", "gatilho:public.filho.trg_filho_atualizado", "gatilho:auth.users.ao_criar_usuario",
            "politica:public.filho.admin faz tudo", "politica:storage.objects.ler fotos", "tipo:situacao_filho",
            "bucket:fotos", "papel:anon", "privilegio:filho.anon", "privilegio:eh_admin.anon",
            "privilegio_padrao:postgres.public.tabela", "segredo:CHAVE_WORKER", "evento:watch_ddl", "extensao:pgcrypto",
        ]:
            self.assertIn(chave, self.inv.objetos, chave)

    def test_objetos_filhos_apontam_para_a_tabela(self):
        self.assertEqual(self.inv.objetos["coluna:filho.status"].pai, "tabela:filho")
        self.assertEqual(self.inv.objetos["politica:public.filho.admin faz tudo"].pai, "tabela:filho")
        self.assertIsNone(self.inv.objetos["gatilho:auth.users.ao_criar_usuario"].pai)
        self.assertEqual(self.inv.objetos["tabela:resumo_filhos"].tipo, "view")

    def test_data_do_inventario(self):
        self.assertEqual(self.inv.data, "2026-01-01T00:00:00+00:00")


class TestRecusas(unittest.TestCase):
    def assertRecusa(self, parte1, trecho):
        with self.assertRaises(InventarioInvalido) as ctx:
            carregar(FIX / parte1, P2)
        self.assertIn(trecho, str(ctx.exception))

    def test_secao_ausente(self):
        self.assertRecusa("parte1-sem-secao.csv", "gatilhos")

    def test_total_que_nao_bate(self):
        self.assertRecusa("parte1-total-errado.csv", "colunas")

    def test_json_quebrado(self):
        self.assertRecusa("parte1-json-quebrado.csv", "funcoes")

    def test_colisao_de_chave(self):
        pasta = Path(tempfile.mkdtemp())
        try:
            texto = (FIX / "parte1-ok.csv").read_text(encoding="utf-8")
            # Duplica o índice: mesma chave duas vezes.
            dup = texto.replace('[{""esquema"": ""public"", ""tabela"": ""filho"", ""nome"": ""idx_filho_pai""',
                                '[{""esquema"": ""public"", ""tabela"": ""filho"", ""nome"": ""idx_filho_pai"", ""definicao"": ""x""}, '
                                '{""esquema"": ""public"", ""tabela"": ""filho"", ""nome"": ""idx_filho_pai""')
            dup = dup.replace("7,indices,1,", "7,indices,2,")
            self.assertNotEqual(dup, texto, "fixture mudou; ajustar o teste")
            (pasta / "p1.csv").write_text(dup, encoding="utf-8")
            with self.assertRaises(InventarioInvalido) as ctx:
                carregar(pasta / "p1.csv", P2)
            self.assertIn("indice:idx_filho_pai", str(ctx.exception))
        finally:
            shutil.rmtree(pasta)


class TestTsvDoPsql(unittest.TestCase):
    def test_tsv_carrega_igual_ao_csv(self):
        import csv
        csv.field_size_limit(10**9)
        pasta = Path(tempfile.mkdtemp())
        try:
            for origem, destino in [(P1, "p1.tsv"), (P2, "p2.tsv")]:
                with open(origem, encoding="utf-8", newline="") as f:
                    linhas = list(csv.reader(f))
                # Formato do `psql -A -F <tab>`: ruído antes, cabeçalho, linhas, rodapé "(N rows)".
                corpo = ["SET", "CREATE FUNCTION", "\t".join(linhas[0])] + ["\t".join(l) for l in linhas[1:]]
                corpo.append(f"({len(linhas) - 1} rows)")
                (pasta / destino).write_text("\n".join(corpo) + "\n", encoding="utf-8")
            a, b = carregar(P1, P2), carregar(pasta / "p1.tsv", pasta / "p2.tsv")
            self.assertEqual(sorted(a.objetos), sorted(b.objetos))
        finally:
            shutil.rmtree(pasta)


if __name__ == "__main__":
    unittest.main()
