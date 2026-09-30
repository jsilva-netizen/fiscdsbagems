# Contrato: matriz de acesso da fiscalização

É a fonte dos testes de autorização (R8 do core): cada linha vira casos de teste para cada papel,
mais um caso "sem login", que responde sempre **401**. Uma regra removida ou enfraquecida no código
faz algum caso falhar (constituição, Princípio III).

**Legenda:**
- **T**: tudo;
- **C**: fiscalizações da própria câmara;
- **Eq**: fiscalizações em que o usuário está na equipe, de qualquer câmara;
- **D**: câmaras da própria diretoria;
- **L**: leitura;
- **—**: recusado (404 para registro, 403 para operação sem registro).

Tudo o que pende de uma fiscalização (registros, respostas, constatações, saídas, fotos,
relatórios, histórico) segue a linha da fiscalização.

| Recurso e operação | admin | coordenador | fiscal | diretor | prestador |
|---|---|---|---|---|---|
| configuração da câmara: ler | T | C | C (L) | D (L) | — |
| configuração da câmara: alterar, copiar | T | C | — | — | — |
| fiscalizações: listar e ler | T (L) | C e Eq | C e Eq | D (L) | — |
| criar a partir de atividade aprovada | — | C (escalado) | C (escalado) | — | — |
| criar urgência; ligar urgência a atividade | — | C | — | — | — |
| alterar, registros, respostas, constatações, saídas, fotos (em andamento) | — | C e Eq | C e Eq | — | — |
| finalizar registro e fiscalização | — | C e Eq | C e Eq | — | — |
| reabrir (com motivo) | — | C | C | — | — |
| excluir fiscalização (nunca finalizada, sem documento) | T | C | Eq | — | — |
| excluir registro (fiscalização em andamento) | — | C e Eq | C e Eq | — | — |
| histórico | T | C e Eq | C e Eq | D | — |
| relatório: pedir | T | C e Eq | C e Eq | D | — |
| relatório: listar e baixar | T | C e Eq | C e Eq | D | — |
| endereço de foto | T | C e Eq | C e Eq | D | — |
| relatório consolidado da lista | T | C | C | D | — |
| indicadores e exportação do painel | T | C | C | D (e por câmara) | — |
| exportar fiscalizações; importar arquivo; importar fila de aparelho | T | — | — | — | — |
| `sync/fiscalizacao` baixar | Eq | Eq | Eq | — | — |
| `sync/fiscalizacao` enviar | — | C e Eq | C e Eq | — | — |

**Observações:**
- O prestador não alcança nada por este app. O portal do prestador lê pelas consultas depois do
  termo (A-027), e aquela spec tem a matriz dele.
- O diretor pode pedir relatório, porque isso não altera registro operacional. As demais escritas
  lhe são recusadas (R-core-012).
- O administrador lê tudo, exclui fiscalização nas condições da regra e exporta e importa. Ele não
  vistoria nem finaliza, porque não está na equipe.
- Os apps de câmara escrevem registros avulsos pela função de serviço registrada
  ([extensoes.md](./extensoes.md)), com o alcance do usuário que opera o app deles.
