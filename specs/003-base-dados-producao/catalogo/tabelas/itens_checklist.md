<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# itens_checklist

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 768
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

Comentário no banco: Itens dos checklists normativos

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `tipo_unidade_id` | uuid |  |  |  |  |
| 3 | `ordem` | integer |  | `0` |  |  |
| 4 | `pergunta` | text | sim |  |  |  |
| 5 | `texto_constatacao_sim` | text |  |  |  |  |
| 6 | `texto_constatacao_nao` | text |  |  |  |  |
| 7 | `gera_nc` | boolean |  | `false` |  | `true` (768) |
| 8 | `artigo_portaria` | text |  |  |  |  |
| 9 | `texto_nc` | text |  |  |  |  |
| 10 | `texto_determinacao` | text |  |  |  |  |
| 11 | `texto_recomendacao` | text |  |  |  |  |
| 12 | `prazo_dias` | integer |  | `30` |  | `30` (768) |
| 13 | `ativo` | boolean |  | `true` |  | `true` (768) |
| 14 | `is_sample` | boolean |  | `false` |  | `false` (768) |
| 15 | `created_by_id` | uuid |  |  |  |  |
| 16 | `created_by` | text |  |  |  |  |
| 17 | `created_date` | timestamp with time zone |  | `now()` |  |  |
| 18 | `updated_date` | timestamp with time zone |  | `now()` |  |  |
| 19 | `created_at` | timestamp with time zone |  | `now()` |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `itens_checklist_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `itens_checklist_tipo_unidade_id_fkey` | chave_estrangeira | `FOREIGN KEY (tipo_unidade_id) REFERENCES tipos_unidade(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `itens_checklist_pkey` | `CREATE UNIQUE INDEX itens_checklist_pkey ON public.itens_checklist USING btree (id)` |

## Dependências

**Depende de:**

- [tipos_unidade](../tabelas/tipos_unidade.md) — referencia (catalogo)

**É usada por:**

- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [respostas_checklist](../tabelas/respostas_checklist.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Leitura pública de itens de checklist

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

### Operadores gerenciam itens de checklist

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
