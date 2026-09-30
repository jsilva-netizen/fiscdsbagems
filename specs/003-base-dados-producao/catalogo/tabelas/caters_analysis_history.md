<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_analysis_history

- **Tipo**: tabela
- **Dono**: módulo **caters**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Histórico de cada processo CATERS: criação, mudança de status, resposta recebida, prazo
estendido, documento anexado, encerramento e observações, com autor e data. Vazio em produção.

Não há política de exclusão, então "excluir" um registro pela tela não tem efeito e não mostra
erro. *(fonte: src/lib/caters/history.js:27, src/lib/caters/history.js:36, inventário: tabelas)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do registro de histórico. *(fonte: src/lib/caters/history.js:27)* |  |
| 2 | `process_id` | uuid | sim |  | Processo do histórico; excluir o processo exclui o histórico. *(fonte: restricao:caters_analysis_history.caters_analysis_history_process_id_fkey)* |  |
| 3 | `action_type` | caters_analysis_action_type | sim |  | Tipo do evento (tipo `caters_analysis_action_type`):<br>- `criacao`;<br>- `atualizacao_status`;<br>- `resposta_recebida`;<br>- `prazo_estendido`;<br>- `documento_anexado`;<br>- `encerramento`;<br>- `observacao`. *(fonte: src/lib/caters/history.js:3)* |  |
| 4 | `description` | text | sim |  | Texto do evento (ex.: "Dilação aprovada: +N dias… → novo prazo…"). *(fonte: src/pages/CatersProcessoDetalhe.jsx:364)* |  |
| 5 | `new_fatal_date` | date |  |  | Nova data fatal registrada no evento, quando houver. ⚠️ *hipótese* |  |
| 6 | `related_document_url` | text |  |  | Documento relacionado ao evento, quando houver. ⚠️ *hipótese* |  |
| 7 | `performed_by` | uuid |  |  | Conta de quem fez; a chave estrangeira sem regra de exclusão impede excluir o usuário. *(fonte: src/pages/CatersProcessoDetalhe.jsx:366, restricao:caters_analysis_history.caters_analysis_history_performed_by_fkey)* |  |
| 8 | `created_at` | timestamp with time zone | sim | `now()` | Quando o evento foi registrado; ordena o histórico (mais recente primeiro). *(fonte: src/lib/caters/history.js:21)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_analysis_history_performed_by_fkey` | chave_estrangeira | `FOREIGN KEY (performed_by) REFERENCES auth.users(id)` |
| `caters_analysis_history_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_analysis_history_process_id_fkey` | chave_estrangeira | `FOREIGN KEY (process_id) REFERENCES caters_processes(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `caters_analysis_history_pkey` | `CREATE UNIQUE INDEX caters_analysis_history_pkey ON public.caters_analysis_history USING btree (id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### CATERS historico: inserir

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin registra eventos. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
is_caters_user()
```

</details>

### CATERS historico: leitura

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin lê o histórico. Não há política de alteração nem de exclusão. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

- Achado **A-007** — 13 tabelas vazias em produção (situação: aguardando_decisao; [detalhes](../../achados.md#a-007)).
- Achado **A-032** — Excluir evento do histórico do CATERS não tem efeito (situação: aguardando_decisao; [detalhes](../../achados.md#a-032)).
