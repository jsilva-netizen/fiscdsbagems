<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# tipos_unidade

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 33
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

Comentário no banco: Tabela de tipos de unidade fiscalizável

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `nome` | text | sim |  |  |  |
| 3 | `servicos_aplicaveis` | text[] |  |  |  | `{"Abastecimento de Água"}` (14), `{"Esgotamento Sanitário"}` (8), `{"Manejo de Resíduos Sólidos"}` (7), `{"Abastecimento de Água","Esgotamento Sanitário"}` (3), `{"Limpeza Urbana"}` (1) |
| 4 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 5 | `ativo` | boolean |  | `true` |  | `true` (33) |
| 6 | `codigo` | text |  |  | Comentário no banco: Código do tipo de unidade (ex: AMX-ETE) |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `tipos_unidade_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `tipos_unidade_pkey` | `CREATE UNIQUE INDEX tipos_unidade_pkey ON public.tipos_unidade USING btree (id)` |

## Dependências

**Depende de:**

- _nada_

**É usada por:**

- [itens_checklist](../tabelas/itens_checklist.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Leitura pública de tipos de unidade

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

### Operadores gerenciam tipos de unidade

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(nenhuma)
```

</details>

### Public Access

- **Papéis**: public · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
true
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
