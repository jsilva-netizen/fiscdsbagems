<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_fiscalizacoes_disponiveis

- **Tipo**: view
- **Dono**: **sem dono** (lacuna)
- **Opções**: nenhuma — a view **não** declara `security_invoker`, então roda com as permissões do dono

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid |  |  |  |  |
| 2 | `municipio_nome` | text |  |  |  |  |
| 3 | `prestador_servico_nome` | text |  |  |  |  |
| 4 | `servicos` | text[] |  |  |  |  |
| 5 | `status` | text |  |  |  |  |
| 6 | `data_inicio` | timestamp with time zone |  |  |  |  |
| 7 | `data_fim` | timestamp with time zone |  |  |  |  |
| 8 | `numero_termo` | text |  |  |  |  |
| 9 | `camara_tecnica_id` | text |  |  |  |  |

## Restrições e índices

_Nenhuma._

## Dependências

**Depende de:**

- [fiscalizacoes](../tabelas/fiscalizacoes.md) — consulta (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

_Nenhuma._

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
