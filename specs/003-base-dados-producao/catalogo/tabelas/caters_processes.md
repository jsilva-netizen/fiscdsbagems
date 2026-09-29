<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_processes

- **Tipo**: tabela
- **Dono**: módulo **caters**
- **Linhas em produção**: 2
- **RLS ativo**: sim

## Finalidade

Processos de acompanhamento da CATERS (resíduos sólidos): cada um acompanha, junto a um
município titular, o cumprimento das recomendações de uma fiscalização programada de limpeza
urbana e manejo de resíduos. Guarda o número do processo, o município, o AR (aviso de
recebimento) do envio, os prazos, os documentos e o status. Produção tem 2 processos.

Fluxo, na tela Processos CATERS e no detalhe do processo:

- **Cadastro:** o processo é cadastrado e pode ser ligado a uma fiscalização finalizada da CATERS.
  Ao ligar, importa as recomendações e determinações dela (`caters_import_from_fiscalizacao`).
- **Envio e resposta:** registram-se o envio e o recebimento do AR e a resposta do município.
- **Prorrogações:** a dilação de prazo registra a prorrogação, mas **não atualiza o processo**. A
  tela grava o status `dilacao_solicitada`, que não existe no tipo enumerado, e a gravação falha.
- **IA:** relatório e ofício de resposta podem ser lidos por IA (`caters_ai_jobs`).
- **Encerramento:** ao final, o processo é encerrado.

O acesso é só da câmara CATERS e dos admins (`is_caters_user`). *(fonte: src/lib/caters/processes.js:83, src/lib/caters/processes.js:117, src/pages/CatersProcessoDetalhe.jsx:361, supabase/migrations/123_caters_deadline_extensions.sql, funcao:is_caters_user(), inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do processo; recomendações, histórico, documentos, respostas e trabalhos de IA apontam para ele. *(fonte: restricao:caters_recommendations.caters_recommendations_process_id_fkey)* |  |
| 2 | `process_number` | text | sim |  | Número do processo administrativo (ex.: 51.001.121-2025); único. *(fonte: indice:caters_processes_process_number_unique, inventário: dominio_categorico)* | `51.001.121-2025` (1), `51.001.853-2025` (1) |
| 3 | `municipality` | text | sim |  | Município titular do serviço, em texto livre (não aponta para `municipios`). Em produção:<br>Alcinópolis e Três Lagoas. *(fonte: src/pages/CatersProcessos.jsx:93, inventário: dominio_categorico)* | `Alcinópolis` (1), `Três Lagoas` (1) |
| 4 | `object` | text | sim |  | Objeto da fiscalização (ex.: "Fiscalização Programada dos Serviços Públicos de Limpeza Urbana…"). *(fonte: inventário: dominio_categorico)* | `Fiscalização Programada dos Serviços Públicos de Limpeza Urbana e Manejo de Resíduos Sólidos Urbanos` (2) |
| 5 | `ar_sent_at` | date |  |  | Quando o AR (aviso de recebimento dos Correios) com os documentos foi enviado ao município. *(fonte: src/pages/CatersProcessos.jsx:97)* |  |
| 6 | `ar_received_at` | date |  |  | Quando o município recebeu o AR. Sem prazo de resposta informado, a tela conta 30 dias a partir<br>desta data. *(fonte: src/pages/CatersProcessoDetalhe.jsx:442)* |  |
| 7 | `fatal_date` | date |  |  | Data fatal do processo, informada pela equipe; só é mostrada. *(fonte: src/pages/CatersProcessoDetalhe.jsx:702, src/pages/CatersProcessoDetalhe.jsx:730)* |  |
| 8 | `titular_response_due_at` | date |  |  | Prazo para o município responder. É informado pela equipe e deveria mudar com a dilação<br>aprovada, mas a gravação da dilação falha por causa do status inválido. Sem valor, a tela usa o<br>recebimento do AR mais 30 dias. O painel conta os atrasos por ele. *(fonte: src/pages/CatersProcessoDetalhe.jsx:361, src/pages/CatersProcessoDetalhe.jsx:441, src/lib/caters/dashboard.js:39)* |  |
| 9 | `status` | caters_process_status | sim | `'aguardando_analise'::caters_process_status` | Situação do processo, pelo tipo `caters_process_status`: `aguardando_analise` (padrão),<br>`em_analise`, `respondido`, `no_prazo`, `critico`, `atrasado` e `encerrado`. É escolhida pela<br>equipe.<br>A tela também oferece `dilacao_solicitada`, que o tipo não tem, e a gravação falha. A migration<br>123 supôs, por engano, que a coluna era texto livre. *(fonte: src/pages/CatersProcessoDetalhe.jsx:65, supabase/migrations/123_caters_deadline_extensions.sql)* |  |
| 10 | `relatorio_url` | text |  |  | Relatório de fiscalização anexado; pode ser lido por IA para cadastrar as recomendações (`extract_pdf`). *(fonte: src/pages/CatersProcessoDetalhe.jsx:579)* |  |
| 11 | `termo_notificacao_url` | text |  |  | Termo de notificação anexado. *(fonte: src/pages/CatersProcessoDetalhe.jsx:580)* |  |
| 12 | `ar_digitalizado_url` | text |  |  | AR digitalizado anexado. *(fonte: src/pages/CatersProcessoDetalhe.jsx:581)* |  |
| 13 | `oficio_resposta_url` | text |  |  | Ofício de resposta do município; pode ser cruzado por IA com as recomendações (`match_response_pdf`). *(fonte: src/pages/CatersProcessoDetalhe.jsx:582)* |  |
| 14 | `cronograma_url` | text |  |  | Cronograma de adequação enviado pelo município. *(fonte: src/pages/CatersProcessoDetalhe.jsx:583)* |  |
| 15 | `observations` | text |  |  | Observações livres sobre o processo. ⚠️ *hipótese* |  |
| 16 | `ar_tracking_code` | text |  |  | Código de rastreio do AR nos Correios. *(fonte: src/pages/CatersProcessos.jsx:99)* |  |
| 17 | `ar_protocol_number` | text |  |  | Número de protocolo do envio do AR. *(fonte: src/pages/CatersProcessos.jsx:100)* |  |
| 18 | `report_sent_at` | date |  |  | Quando o relatório foi enviado ao município; usado no painel. *(fonte: src/lib/caters/dashboard.js:12)* |  |
| 19 | `technician_name` | text |  |  | Nome do técnico responsável pelo processo (texto livre). *(fonte: src/pages/CatersProcessos.jsx:96)* |  |
| 20 | `created_by` | uuid |  |  | Conta de quem cadastrou. As políticas do usuário de teste e2e usam esta coluna. A chave<br>estrangeira sem regra de exclusão impede excluir definitivamente o usuário. *(fonte: restricao:caters_processes.caters_processes_created_by_fkey, politica:public.caters_processes.e2e_test_user_own_rows_only)* |  |
| 21 | `created_at` | timestamp with time zone | sim | `now()` | Quando o processo foi cadastrado. *(fonte: src/lib/caters/processes.js:83)* |  |
| 22 | `updated_at` | timestamp with time zone | sim | `now()` | Última alteração, mantida pelo gatilho `trg_caters_processes_updated_at`. *(fonte: gatilho:public.caters_processes.trg_caters_processes_updated_at)* |  |
| 23 | `fiscalizacao_id` | uuid |  |  | Fiscalização finalizada da CATERS ligada ao processo, escolhida na view<br>`caters_fiscalizacoes_disponiveis`. Fica vazio se a fiscalização for excluída. *(fonte: src/lib/caters/processes.js:109, restricao:caters_processes.caters_processes_fiscalizacao_id_fkey)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `caters_processes_created_by_fkey` | chave_estrangeira | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `caters_processes_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id) ON DELETE SET NULL` |
| `caters_processes_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `caters_processes_process_number_unique` | unica | `UNIQUE (process_number)` |

| Índice | Definição |
|---|---|
| `caters_processes_pkey` | `CREATE UNIQUE INDEX caters_processes_pkey ON public.caters_processes USING btree (id)` |
| `caters_processes_process_number_unique` | `CREATE UNIQUE INDEX caters_processes_process_number_unique ON public.caters_processes USING btree (process_number)` |
| `idx_caters_processes_fiscalizacao_id` | `CREATE INDEX idx_caters_processes_fiscalizacao_id ON public.caters_processes USING btree (fiscalizacao_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)

**É usada por:**

- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — escreve (codigo)
- [caters_ai_jobs](../tabelas/caters_ai_jobs.md) — referencia (catalogo)
- [caters_analysis_history](../tabelas/caters_analysis_history.md) — referencia (catalogo)
- [caters_deadline_extensions](../tabelas/caters_deadline_extensions.md) — referencia (catalogo)
- [caters_extra_documents](../tabelas/caters_extra_documents.md) — referencia (catalogo)
- [caters_municipality_responses](../tabelas/caters_municipality_responses.md) — referencia (catalogo)
- [caters_recommendations](../tabelas/caters_recommendations.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_caters_processes_updated_at` | ativo | [caters_set_updated_at()](../funcoes/caters_set_updated_at.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:caters_set_updated_at())* |

<details><summary>Definição de trg_caters_processes_updated_at</summary>

```sql
CREATE TRIGGER trg_caters_processes_updated_at BEFORE UPDATE ON caters_processes FOR EACH ROW EXECUTE FUNCTION caters_set_updated_at()
```

</details>

## Políticas de acesso

### CATERS processos: atualizar

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin altera processos. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
is_caters_user()

WITH CHECK:
(nenhuma)
```

</details>

### CATERS processos: deletar

- **Papéis**: authenticated · **Operação**: DELETE · **PERMISSIVE**
- **Em linguagem simples**: Só admin ativo exclui processos (e, em cascata, tudo o que pende deles). *(fonte: funcao:get_my_role())*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = 'admin'::text)

WITH CHECK:
(nenhuma)
```

</details>

### CATERS processos: inserir

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin cadastra processos. *(fonte: funcao:is_caters_user())*
- **Funções auxiliares**: [is_caters_user()](../funcoes/is_caters_user.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
is_caters_user()
```

</details>

### CATERS processos: leitura

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Usuário ativo da CATERS ou admin lê os processos. *(fonte: funcao:is_caters_user())*
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
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera processos que ele criou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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

_Nenhuma divergência entre produção e migrations, nenhum achado._
