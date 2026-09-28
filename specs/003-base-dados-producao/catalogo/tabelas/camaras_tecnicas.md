<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# camaras_tecnicas

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 12
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | text | sim |  |  |  |
| 2 | `diretoria_id` | text | sim |  |  |  |
| 3 | `nome` | text | sim |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `camaras_tecnicas_diretoria_id_fkey` | chave_estrangeira | `FOREIGN KEY (diretoria_id) REFERENCES diretorias(id) ON DELETE RESTRICT` |
| `camaras_tecnicas_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `camaras_tecnicas_pkey` | `CREATE UNIQUE INDEX camaras_tecnicas_pkey ON public.camaras_tecnicas USING btree (id)` |

## Dependências

**Depende de:**

- [diretorias](../tabelas/diretorias.md) — referencia (catalogo)

**É usada por:**

- [profiles](../tabelas/profiles.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Admins gerenciam câmaras técnicas

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = 'admin'::text)

WITH CHECK:
(nenhuma)
```

</details>

### Câmaras técnicas visíveis para todos autenticados

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
