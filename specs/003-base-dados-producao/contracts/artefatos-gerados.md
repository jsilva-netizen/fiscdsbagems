# Contrato: documentos gerados

**Onde**: `specs/003-base-dados-producao/` (subpastas abaixo). **Nunca editar à mão.** Todo
arquivo gerado começa com:

```markdown
<!-- GERADO por ferramentas/gerar.py a partir de <inventários + data> e anotacoes/. Não editar. -->
```

## `catalogo/`

| Arquivo | Conteúdo | Atende |
|---|---|---|
| `README.md` | índice: contagens por tipo, completude (anotados / total), links por módulo e por tipo | SC-001 |
| `tabelas/<tabela>.md` | uma página por tabela/view (formato abaixo) | FR-001, FR-002, FR-005, FR-008 |
| `funcoes/<nome>.md` | uma página por nome de função, com cada sobrecarga | FR-003, FR-008 |
| `arquivos.md` | buckets: configuração, volume, padrão de caminho, políticas, colunas/funções que os referenciam | FR-006 |
| `acesso.md` | papéis, privilégios por papel (inclui `anon`), privilégios padrão e por coluna, funções executáveis sem login, nomes de segredos e quem os usa, extensões e event triggers | FR-007 |
| `tipos.md` | tipos enumerados, com valores e as colunas que os usam | FR-001 |
| `externos.md` | informações fora do banco (edge functions publicadas, configuração de autenticação), com como obter | FR-023 |

### Página de tabela

1. Cabeçalho: nome, tipo (tabela/view), módulo dono, linhas em produção, RLS ativo.
2. Finalidade (anotação, com fonte ou marca de hipótese).
3. Colunas: tabela com posição, nome, tipo, obrigatória, padrão, significado, valores em uso
   (colunas categóricas) e estrutura (colunas JSON).
4. Restrições e índices.
5. Depende de / é usada por: listas de chaves com natureza e origem (`catalogo` / `codigo`).
6. Gatilhos: evento, função executada, efeito (anotação).
7. Políticas de acesso: para cada uma, papéis, operação, condição em linguagem simples (anotação),
   funções auxiliares e a condição original (colapsada).
8. Divergências deste objeto e achados que o citam.

### Página de função

Por sobrecarga: assinatura, retorno, linguagem, permissão elevada (sim/não), finalidade
(anotação), tabelas lidas/escritas, funções chamadas, quem a chama (gatilhos, políticas, e —
anotado — telas e edge functions), se contém regra de negócio e qual spec de módulo a descreve,
e o código completo (colapsado).

## `mapa-rastreabilidade.md`

Tabela única: chave, tipo, módulo dono ou classificação fora do escopo, spec de módulo (ou
`LACUNA`). Ordenada por módulo e tipo. No topo, contagens: total, com dono, fora do escopo, sem
atribuição (meta 0 — SC-002), em lacuna.

## `ordem-modulos.md`

Módulos na ordem, cada um com: app da constituição, objetos que possui (contagem por tipo),
módulos de que depende (derivado das dependências) e **violações de ordem** (dependência para
módulo posterior), com a justificativa anotada ou a marca `VIOLAÇÃO` (meta 0 sem justificativa —
SC-008).

## `divergencias.md`

Contagens por tipo e por classificação no topo (meta: 0 `nao_classificada` — SC-003); depois
uma seção por tipo de objeto, cada divergência com chave, tipo, detalhe, classificação e
justificativa. Para `codigo_diferente`, o resumo anotado e o diff do código (colapsado).

## `achados.md`

Um bloco por achado (formato de [anotacoes.md](./anotacoes.md#achadostoml)), com a evidência
expandida em links para as páginas do catálogo. No topo, contagem por situação (meta antes da
primeira spec de módulo: 0 `aguardando_decisao` — SC-006).
