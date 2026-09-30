<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_notification_reads

- **Tipo**: tabela
- **Dono**: módulo **caters**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Quais avisos do painel da CATERS cada usuário já leu, para não mostrá-los de novo. Os avisos não
ficam no banco: são calculados no painel, e aqui só se guarda a chave lida. Vazia em produção.

Chaves usadas:

- `overdue_response:<processo>:<prazo>`;
- `overdue_recommendation:<recomendação>:<prazo>`;
- `awaiting_analysis:<processo>`.

Como o prazo faz parte da chave, um aviso volta a aparecer quando o prazo muda. *(fonte: src/pages/CatersDashboard.jsx:123, src/lib/caters/notificationReads.js:19)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do registro de leitura. *(fonte: src/lib/caters/notificationReads.js:19)* |  |
| 2 | `user_id` | uuid | sim |  | Usuário que leu; único junto com a chave. *(fonte: indice:caters_notification_reads_user_key, restricao:caters_notification_reads.caters_notification_reads_user_id_fkey)* |  |
| 3 | `key` | text | sim |  | Chave do aviso lido (formatos na finalidade da tabela). *(fonte: src/pages/CatersDashboard.jsx:123)* |  |
| 4 | `read_at` | timestamp with time zone | sim |  | Quando o aviso foi marcado como lido. *(fonte: src/lib/caters/notificationReads.js:16)* |  |
| 5 | `created_at` | timestamp with time zone | sim | `now()` | Quando o registro foi criado. *(fonte: src/lib/caters/notificationReads.js:19)* |  |

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
- **Em linguagem simples**: Usuário ativo da CATERS ou admin lê e grava só as próprias leituras. *(fonte: funcao:is_caters_user())*
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

- Achado **A-007** — 13 tabelas vazias em produção (situação: decidido; [detalhes](../../achados.md#a-007)).
