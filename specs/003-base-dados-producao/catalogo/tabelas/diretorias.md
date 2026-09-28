<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# diretorias

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 3
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | text | sim |  |  |  |
| 2 | `nome` | text | sim |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `diretorias_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `diretorias_pkey` | `CREATE UNIQUE INDEX diretorias_pkey ON public.diretorias USING btree (id)` |

## Dependências

**Depende de:**

- _nada_

**É usada por:**

- [camaras_tecnicas](../tabelas/camaras_tecnicas.md) — referencia (catalogo)
- [profiles](../tabelas/profiles.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Diretorias visíveis para todos autenticados

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
