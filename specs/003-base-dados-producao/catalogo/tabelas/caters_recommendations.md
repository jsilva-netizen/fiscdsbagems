<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_recommendations

- **Tipo**: tabela
- **Dono**: módulo **caters**
- **Linhas em produção**: 27
- **RLS ativo**: sim

## Finalidade

Recomendações e determinações acompanhadas em cada processo da CATERS, com prazo prometido pelo
município, situação, resposta do titular e evidência. Produção tem 27.

- **Importação:** a partir das recomendações e determinações da fiscalização ligada
  (`caters_import_from_fiscalizacao`), com prazo de 30 dias contados do fim da fiscalização e
  prioridade média.
- **Cadastro manual:** também podem ser cadastradas à mão ou extraídas do relatório por IA.
- **Situação:** é derivada na tela a partir do prazo e do cumprimento. *(fonte: funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer), src/lib/caters/recommendations.js:4, src/lib/caters/recommendations.js:40, inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador da recomendação acompanhada. *(fonte: src/lib/caters/recommendations.js:40)* |  |
| 2 | `process_id` | uuid | sim |  | Processo CATERS; excluir o processo exclui as recomendações. *(fonte: restricao:caters_recommendations.caters_recommendations_process_id_fkey)* |  |
| 3 | `item_code` | text |  |  | Código do item no relatório (ex.: 3.1.2), informado à mão. *(fonte: src/pages/CatersProcessoDetalhe.jsx:1419)* |  |
| 4 | `description` | text | sim |  | Texto da recomendação ou determinação; na importação, copiado da fiscalização. *(fonte: funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer))* |  |
| 5 | `category` | text |  |  | Categoria livre (ex.: UTR Municipal, Unidade de Transbordo, Coleta de RSD, Coleta Seletiva,<br>Limpeza Urbana). *(fonte: src/pages/CatersProcessoDetalhe.jsx:545, inventário: dominio_categorico)* | `UTR Municipal` (8), `Unidade de Transbordo` (8), `Coleta de RSD` (4), `Coleta Seletiva` (3), `Limpeza Urbana` (2), `Entrega de Dados e Informações` (1), `Vazadouro a Céu Aberto` (1) |
| 6 | `priority` | caters_recommendation_priority | sim | `'media'::caters_recommendation_priority` | Prioridade: `baixa`, `media` (padrão), `alta` ou `critica` (tipo `caters_recommendation_priority`). *(fonte: src/lib/caters/recommendations.js:17)* |  |
| 7 | `promised_due_at` | date |  |  | Prazo para cumprir: na importação de recomendação, fim da fiscalização mais 30 dias; na de<br>determinação, a coluna antiga `determinacoes.prazo`, hoje sempre vazia. *(fonte: funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer), coluna:determinacoes.prazo)* |  |
| 8 | `status` | caters_recommendation_status | sim | `'pendente'::caters_recommendation_status` | Situação (tipo `caters_recommendation_status`): `pendente` (padrão), `em_andamento`, `vencido` ou<br>`cumprido`. É derivada na tela ao gravar, sem rotina que a atualize:<br>- com data de cumprimento, `cumprido`;<br>- com prazo passado, `vencido`;<br>- senão, o que estava. *(fonte: src/lib/caters/recommendations.js:4)* |  |
| 9 | `fulfilled_at` | date |  |  | Data do cumprimento; "marcar como cumprida" grava o dia (data UTC do aparelho). *(fonte: src/pages/CatersProcessoDetalhe.jsx:557)* |  |
| 10 | `evidence_url` | text |  |  | Evidência do cumprimento. ⚠️ *hipótese* |  |
| 11 | `notes` | text |  |  | Observações da equipe sobre a recomendação. *(fonte: src/pages/CatersProcessoDetalhe.jsx:551)* |  |
| 12 | `titular_response` | text |  |  | Resposta do município titular sobre a recomendação; pode ser preenchida pela IA ao cruzar o ofício. *(fonte: src/pages/CatersProcessoDetalhe.jsx:550)* |  |
| 13 | `created_by` | uuid |  |  | Conta de quem cadastrou ou importou; na importação, o usuário logado. *(fonte: funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer))* |  |
| 14 | `created_at` | timestamp with time zone | sim | `now()` | Quando foi cadastrada ou importada; ordena a lista. *(fonte: src/lib/caters/recommendations.js:31)* |  |
| 15 | `updated_at` | timestamp with time zone | sim | `now()` | Última alteração, mantida pelo gatilho `trg_caters_recommendations_updated_at`. *(fonte: gatilho:public.caters_recommendations.trg_caters_recommendations_updated_at)* |  |
| 16 | `recomendacao_id` | uuid |  |  | Recomendação da fiscalização de origem. Evita importar duas vezes e fica vazio se a recomendação<br>for apagada. *(fonte: funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer), restricao:caters_recommendations.caters_recommendations_recomendacao_id_fkey)* |  |
| 17 | `determinacao_id` | uuid |  |  | Determinação da fiscalização de origem, quando importada dela; fica vazio se ela for apagada. *(fonte: restricao:caters_recommendations.caters_recommendations_determinacao_id_fkey)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_recommendations_created_by_fkey` | chave_estrangeira | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `caters_recommendations_determinacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id) ON DELETE SET NULL` |
| `caters_recommendations_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_recommendations_process_id_fkey` | chave_estrangeira | `FOREIGN KEY (process_id) REFERENCES caters_processes(id) ON DELETE CASCADE` |
| `caters_recommendations_recomendacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (recomendacao_id) REFERENCES recomendacoes(id) ON DELETE SET NULL` |

| Índice | Definição |
|---|---|
| `caters_recommendations_pkey` | `CREATE UNIQUE INDEX caters_recommendations_pkey ON public.caters_recommendations USING btree (id)` |
| `idx_caters_recommendations_determinacao_id` | `CREATE INDEX idx_caters_recommendations_determinacao_id ON public.caters_recommendations USING btree (determinacao_id)` |
| `idx_caters_recommendations_recomendacao_id` | `CREATE INDEX idx_caters_recommendations_recomendacao_id ON public.caters_recommendations USING btree (recomendacao_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)
- [determinacoes](../tabelas/determinacoes.md) — referencia (catalogo)
- [recomendacoes](../tabelas/recomendacoes.md) — referencia (catalogo)

**É usada por:**

- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — escreve (codigo)
- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — le (codigo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_caters_recommendations_updated_at` | ativo | [caters_set_updated_at()](../funcoes/caters_set_updated_at.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:caters_set_updated_at())* |

<details><summary>Definição de trg_caters_recommendations_updated_at</summary>

```sql
CREATE TRIGGER trg_caters_recommendations_updated_at BEFORE UPDATE ON caters_recommendations FOR EACH ROW EXECUTE FUNCTION caters_set_updated_at()
```

</details>

## Políticas de acesso

### CATERS recomendacoes: atualizar

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin altera recomendações. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

### CATERS recomendacoes: deletar

- **Papéis**: authenticated · **Operação**: DELETE · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin exclui recomendações. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

### CATERS recomendacoes: inserir

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin cadastra recomendações. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
is_caters_user()
```

</details>

### CATERS recomendacoes: leitura

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin lê as recomendações. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera recomendações que ele criou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (created_by = auth.uid()))

WITH CHECK:
(nenhuma)
```

</details>

### e2e_test_user_own_rows_only_delete

- **Papéis**: authenticated · **Operação**: DELETE · **RESTRICTIVE**
- **Em linguagem simples**: Mesma restrição, para exclusão. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (created_by = auth.uid()))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

- Achado **A-001** — Políticas de teste automatizado (e2e_test_*) em produção (situação: decidido; [detalhes](../../achados.md#a-001)).
