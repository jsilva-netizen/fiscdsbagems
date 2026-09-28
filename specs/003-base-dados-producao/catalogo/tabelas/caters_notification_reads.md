<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_notification_reads

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` |  |  |
| 2 | `user_id` | uuid | sim |  |  |  |
| 3 | `key` | text | sim |  |  |  |
| 4 | `read_at` | timestamp with time zone | sim |  |  |  |
| 5 | `created_at` | timestamp with time zone | sim | `now()` |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_notification_reads_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_notification_reads_user_id_fkey` | chave_estrangeira | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` |
| `caters_notification_reads_user_key` | unica | `UNIQUE (user_id, key)` |

| Índice | Definição |
|---|---|
| `caters_notification_reads_pkey` | `CREATE UNIQUE INDEX caters_notification_reads_pkey ON public.caters_notification_reads USING btree (id)` |
| `caters_notification_reads_user_key` | `CREATE UNIQUE INDEX caters_notification_reads_user_key ON public.caters_notification_reads USING btree (user_id, key)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### CATERS notif reads: proprias

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
((user_id = auth.uid()) AND is_caters_user())

WITH CHECK:
((user_id = auth.uid()) AND is_caters_user())
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
