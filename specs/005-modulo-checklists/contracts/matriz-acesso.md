# Contrato: matriz de acesso do motor de checklists

É a fonte dos testes de autorização (R8 do core). Cada linha vira casos de teste para cada papel,
mais um caso "sem login", que responde sempre **401**.

**Legenda:**
- **T**: tudo;
- **C**: câmara do usuário;
- **D**: câmaras da diretoria do usuário;
- **E**: estrutura (sem catálogos nem itens);
- **L**: leitura;
- **—**: recusado (404 para registro, 403 para operação sem registro).

| Recurso e operação | admin | coordenador | fiscal | diretor | prestador |
|---|---|---|---|---|---|
| peças registradas: ler | T | T | T | T | — |
| modelos: ler | T | C | C | D (L) | — |
| modelos de outras câmaras: ler | T | E | E | — | — |
| modelos: criar, nova versão, alterar | T | C | C | — | — |
| modelos: copiar para a própria câmara | T | C | C | — | — |
| modelos: copiar com catálogos ou para outra câmara | T | — | — | — | — |
| catálogos e itens: ler, histórico | T | C | C | D (L) | — |
| catálogos: criar e alterar; itens: criar, nova versão, retirar, reordenar | T | C | C | — | — |
| importação: prévia, confirmar, descartar | T | C | C | — | — |
| planilha modelo: baixar | T | C | C | D | — |
| `sync/checklists` | T | C + alcance do aparelho | C + alcance do aparelho | — | — |

**Observações:**
- "Alcance do aparelho" são as câmaras e versões a mais informadas pelos apps que aplicam catálogos
  (K8): o fiscal escalado numa fiscalização de outra câmara recebe o catálogo dela, só para leitura.
- Escrita em catálogo ou modelo de outra câmara responde 404 (fora do escopo), inclusive pela
  importação, em que a linha de outra câmara aparece como erro na prévia.
- Não há rota de exclusão de catálogo, item ou versão: o método `DELETE` responde 405.
- O serviço `aplicar_configuracao_inicial` e o comando de migração rodam só no servidor, sem rota.
