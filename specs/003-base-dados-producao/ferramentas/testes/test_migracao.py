"""Mapa de migração: destino de cada coluna e repositório de arquivos (ferramentas/migracao.py)."""

import shutil
import tempfile
import textwrap
import unittest
from pathlib import Path

from ferramentas.anotacoes import carregar
from ferramentas.inventario import carregar as carregar_inventario
from ferramentas.migracao import analisar, modelos_do_data_model
from ferramentas.paginas import pagina_migracao

FIX = Path(__file__).resolve().parent / "fixtures"
INV = carregar_inventario(FIX / "parte1-ok.csv", FIX / "parte2-ok.csv")

MODULOS = """
[[modulo]]
id = "base"
nome = "Base"
ordem = 1
app = "base"

[[modulo]]
id = "outro"
nome = "Outro"
ordem = 2
app = "outro"
"""

# filho, a view e o bucket são de "base"; pai é de "outro"; pai_x está fora do escopo.
TABELAS = """
[objeto."tabela:filho"]
modulo = "base"
finalidade = "Filhos."
fonte = ["src/x.js:1"]

[objeto."tabela:resumo_filhos"]
modulo = "base"
finalidade = "Resumo."
fonte = ["src/x.js:3"]

[objeto."tabela:pai"]
modulo = "outro"
finalidade = "Pais."
fonte = ["src/x.js:2"]

[objeto."tabela:pai_x"]
fora_escopo = { classificacao = "descartar", motivo = "Sem uso.", achado = "A-001" }
"""

ARQUIVOS = """
[objeto."bucket:fotos"]
modulo = "base"
finalidade = "Fotos."
fonte = ["src/x.js:4"]
"""

DATA_MODEL = """
# Data Model

### Filho
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| pai | → Pai | |
| situacao | texto | |
| criado_em, atualizado_em | data e hora | |

### Foto
| Campo | Tipo | Regras |
|---|---|---|
| arquivo | chave | |

## Relações
| x | y |
"""

COMPLETO = """
modulo = "base"
data_model = "DM"
notas = ["Nota de teste."]

[destino."coluna:filho.id"]
para = "base.Filho.id"

[destino."coluna:filho.pai_id"]
para = "base.Filho.pai"

[destino."coluna:filho.status"]
para = "base.Filho.situacao"
transformacao = "Valores em minúsculas."

[destino."coluna:filho.atualizado"]
para = ["base.Filho.atualizado_em", "base.Filho.criado_em"]

[destino."coluna:filho.fotos"]
descarte = "Substituído pelo repositório."

[destino."bucket:fotos"]
para = "base.Foto.arquivo"
"""


class TestMigracao(unittest.TestCase):
    def setUp(self):
        self.pasta = Path(tempfile.mkdtemp())
        (self.pasta / "tabelas").mkdir()
        (self.pasta / "migracao").mkdir()
        (self.pasta / "modulos.toml").write_text(textwrap.dedent(MODULOS), encoding="utf-8")
        (self.pasta / "tabelas" / "t.toml").write_text(textwrap.dedent(TABELAS), encoding="utf-8")
        (self.pasta / "arquivos.toml").write_text(textwrap.dedent(ARQUIVOS), encoding="utf-8")
        self.dm = self.pasta / "data-model.md"
        self.dm.write_text(DATA_MODEL, encoding="utf-8")
        self.anot = carregar(self.pasta, INV)

    def tearDown(self):
        shutil.rmtree(self.pasta)

    def mapa(self, texto, nome="base.toml"):
        (self.pasta / "migracao" / nome).write_text(textwrap.dedent(texto).replace("DM", self.dm.as_posix()),
                                                    encoding="utf-8")

    def analisar(self):
        return analisar(INV, self.anot, self.pasta)

    def test_data_model_lido(self):
        m = modelos_do_data_model(DATA_MODEL)
        self.assertEqual(set(m), {"Filho", "Foto"})
        self.assertEqual(m["Filho"], {"id", "pai", "situacao", "criado_em", "atualizado_em"})

    def test_mapa_completo_nao_tem_pendente(self):
        self.mapa(COMPLETO)
        r = self.analisar()
        self.assertEqual(r.erros, [])
        self.assertEqual(r.pendentes, [])
        self.assertEqual(r.sem_mapa, ["outro"])

    def test_coluna_sem_destino_fica_pendente(self):
        self.mapa(COMPLETO.replace('[destino."coluna:filho.fotos"]\ndescarte = "Substituído pelo repositório."', ""))
        self.assertEqual(self.analisar().pendentes, ["coluna:filho.fotos"])

    def test_sem_mapa_nao_gera_pendente(self):
        r = self.analisar()
        self.assertEqual(r.pendentes, [])
        self.assertEqual(r.sem_mapa, ["base", "outro"])

    def test_coluna_de_view_e_fora_do_escopo_nao_entram(self):
        chaves = {i.chave for i in self.analisar().itens}
        self.assertNotIn("coluna:resumo_filhos.total", chaves)
        self.assertIn("coluna:pai_x.id", chaves)
        fora = [i for i in self.analisar().itens if i.chave == "coluna:pai_x.id"][0]
        self.assertEqual(fora.fora["classificacao"], "descartar")

    def test_chave_inexistente_ou_de_outro_modulo(self):
        self.mapa(COMPLETO + '\n[destino."coluna:filho.nao_existe"]\ndescarte = "x"\n'
                  '\n[destino."coluna:pai.id"]\ndescarte = "x"\n'
                  '\n[destino."coluna:resumo_filhos.total"]\ndescarte = "x"\n')
        erros = "\n".join(self.analisar().erros)
        self.assertIn("coluna:filho.nao_existe' não existe no inventário", erros)
        self.assertIn("coluna:pai.id' pertence a 'outro'", erros)
        self.assertIn("coluna:resumo_filhos.total' não é coluna de tabela nem repositório", erros)

    def test_para_e_descarte(self):
        self.mapa(COMPLETO.replace('para = "base.Filho.id"', 'para = "base.Filho.id"\ndescarte = "x"')
                  .replace('para = "base.Filho.pai"', ""))
        erros = "\n".join(self.analisar().erros)
        self.assertIn("coluna:filho.id' tem 'para' e 'descarte'", erros)
        self.assertIn("coluna:filho.pai_id' sem 'para' nem 'descarte'", erros)

    def test_destino_conferido_no_data_model(self):
        self.mapa(COMPLETO.replace('"base.Filho.situacao"', '"base.Filho.estado"')
                  .replace('"base.Foto.arquivo"', '"base.Imagem.arquivo"')
                  .replace('"base.Filho.pai"', '"Filho.pai"'))
        erros = "\n".join(self.analisar().erros)
        self.assertIn("campo 'estado' não está em 'base.Filho'", erros)
        self.assertIn("modelo 'Imagem' não está no data-model de 'base'", erros)
        self.assertIn("destino 'Filho.pai' fora do formato", erros)

    def test_destino_em_app_sem_data_model_fica_nao_verificado(self):
        self.mapa(COMPLETO.replace('"base.Foto.arquivo"', '"outro.Arquivo.chave"'))
        r = self.analisar()
        self.assertEqual(r.erros, [])
        self.assertEqual(r.nao_verificados, [("bucket:fotos", "outro.Arquivo.chave")])

    def test_modulo_invalido_ou_repetido(self):
        self.mapa(COMPLETO)
        self.mapa(COMPLETO, "copia.toml")
        self.mapa('modulo = "nenhum"\n', "zz.toml")
        erros = "\n".join(self.analisar().erros)
        self.assertIn("já tem mapa", erros)
        self.assertIn("módulo 'nenhum' não existe", erros)

    def test_pagina(self):
        self.mapa(COMPLETO.replace('[destino."coluna:filho.fotos"]\ndescarte = "Substituído pelo repositório."', ""))
        texto = pagina_migracao(self.analisar(), self.anot, "<!-- aviso -->\n")
        self.assertIn("Pendentes: 1", texto)
        self.assertIn("| `coluna:filho.fotos` | 5 linhas | **PENDENTE** | |", texto)
        self.assertIn("`base.Filho.atualizado_em`<br>`base.Filho.criado_em`", texto)
        self.assertIn("## Módulos sem mapa", texto)
        self.assertIn("| `coluna:pai_x.id` | 0 linhas | Sem uso. |", texto)
        self.assertIn("- Nota de teste.", texto)


if __name__ == "__main__":
    unittest.main()
