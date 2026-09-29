<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# fiscalizacoes

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 26
- **RLS ativo**: sim

## Finalidade

Cada fiscalização de campo: uma visita de um fiscal a uma entidade regulada, num município, para
um conjunto de serviços. Nela o fiscal vistoria unidades (`unidades_fiscalizadas`) com checklist,
constatações, fotos, NCs, determinações e recomendações. Produção tem 26: 19 finalizadas e 7 em
andamento; 24 de saneamento (DSB) e 2 de rodovias (DTR).

- **Criação e edição:** é criada offline no aparelho (`createFiscalizacao`) e sincronizada pela
  fila.
- **Finalização:** `finalizar_fiscalizacao` regenera as NCs, determinações e recomendações de cada
  unidade, conta os totais, grava o número do termo e a data de fim e muda o status.
- **Reabertura:** `reabrir_fiscalizacao` volta tudo para "em andamento" e apaga os relatórios
  gerados.
- **Relatórios:** são pedidos em `relatorios_jobs` e gerados pelas edge functions.
- **Auditoria:** toda alteração vai para `audit_logs`. *(fonte: src/lib/offline/repository.ts:489, src/lib/offline/repository.ts:2392, funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid), funcao:reabrir_fiscalizacao(p_fiscalizacao_id uuid), inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da fiscalização, gerado no aparelho na criação offline. As unidades, os termos de<br>notificação, as remessas e os relatórios apontam para ele. *(fonte: src/lib/offline/repository.ts:495)* |  |
| 2 | `municipio_id` | uuid |  |  | Município fiscalizado. Não há chave estrangeira para `municipios`, diferente de<br>`termos_notificacao`. *(fonte: src/lib/offline/repository.ts:496, tabela:municipios)* |  |
| 3 | `municipio_nome` | text |  |  | Nome do município copiado na gravação, para listas e relatórios sem consulta extra. O aparelho<br>preenche, e o gatilho `trg_set_fiscalizacao_cache_fields` confirma a partir de `municipio_id`. *(fonte: funcao:set_fiscalizacao_cache_fields(), src/lib/offline/repository.ts:497)* |  |
| 4 | `prestador_servico_id` | uuid |  |  | Entidade regulada fiscalizada. Não há chave estrangeira. O prestador vê as fiscalizações da<br>própria entidade (política de prestador). *(fonte: src/lib/offline/repository.ts:498)* |  |
| 5 | `prestador_servico_nome` | text |  |  | Nome da entidade copiado na gravação. O aparelho preenche e o gatilho de cache confirma a partir<br>de `prestador_servico_id`. *(fonte: funcao:set_fiscalizacao_cache_fields(), src/lib/offline/repository.ts:499)* |  |
| 6 | `fiscal_nome` | text |  |  | Nome do fiscal responsável. O aparelho envia; se vier vazio, o gatilho de cache usa o nome do<br>perfil de quem grava. *(fonte: funcao:set_fiscalizacao_cache_fields(), src/lib/offline/repository.ts:504)* |  |
| 7 | `fiscal_email` | text |  |  | E-mail do fiscal responsável, enviado pelo aparelho na criação. *(fonte: src/lib/offline/repository.ts:503)* |  |
| 8 | `data_inicio` | timestamp with time zone |  |  | Quando a fiscalização foi criada no aparelho (início da visita). *(fonte: src/lib/offline/repository.ts:502)* |  |
| 9 | `data_fim` | timestamp with time zone |  |  | Quando a fiscalização foi finalizada. Gravada pelo aparelho e pela função de finalização, que<br>preserva uma data já existente. A reabertura apaga. *(fonte: funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid), funcao:reabrir_fiscalizacao(p_fiscalizacao_id uuid), src/lib/offline/repository.ts:2409)* |  |
| 10 | `latitude_inicio` | double precision |  |  | Latitude do início da visita. O app atual não grava: a criação recebe o valor, mas não o põe no<br>registro, e a sincronização não envia esta coluna. Só a leitura a traz do banco. *(fonte: src/lib/offline/repository.ts:489, src/lib/offline/syncEngine.ts:60, src/lib/offline/syncEngine.ts:1702)* |  |
| 11 | `longitude_inicio` | double precision |  |  | Longitude do início da visita; mesma situação de `latitude_inicio` (o app não grava). *(fonte: src/lib/offline/repository.ts:489, src/lib/offline/syncEngine.ts:60)* |  |
| 12 | `status` | text |  | `'em_andamento'::text` | `em_andamento` (padrão) ou `finalizada`. Finalizar e reabrir mudam também o status das unidades.<br>Em produção: 19 finalizadas e 7 em andamento. *(fonte: funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid), funcao:reabrir_fiscalizacao(p_fiscalizacao_id uuid), inventário: dominio_categorico)* | `finalizada` (19), `em_andamento` (7) |
| 13 | `servicos` | text[] |  |  | Serviços fiscalizados (lista), escolhidos na criação. Definem:<br>- os tipos de unidade oferecidos;<br>- a câmara técnica, quando ela não é informada: o gatilho `tr_camara_fiscalizacoes` chama<br>`camara_from_servicos`.<br>No aparelho, os serviços ficam como um texto só, separado por vírgula (`servico`), e a<br>sincronização os converte de volta para lista. A DTR sempre usa `Rodovias`. A ordem da lista não<br>é normalizada: "água e esgoto" aparece nas duas ordens em produção. *(fonte: funcao:camara_from_servicos(p_servicos text[]), src/pages/NovaFiscalizacao.jsx:58, src/pages/NovaFiscalizacaoDTR.jsx:97, src/lib/offline/repository.ts:500, src/lib/offline/syncEngine.ts:1201, src/pages/ExecutarFiscalizacao.jsx:183, inventário: dominio_categorico)* | `{"Abastecimento de Água","Esgotamento Sanitário"}` (14), `{"Manejo de Resíduos Sólidos","Limpeza Urbana"}` (6), `{"Esgotamento Sanitário"}` (2), `{Rodovias}` (2), `{"Abastecimento de Água"}` (1), `{"Esgotamento Sanitário","Abastecimento de Água"}` (1) |
| 14 | `numero_termo` | text |  |  | Número do termo de fiscalização, no formato `NNN/AAAA`. Nasce vazio e é calculado a cada<br>finalização: é a posição da fiscalização entre todas as fiscalizações do mesmo ano, de todas as<br>câmaras, ordenadas pela criação.<br>Por ser uma posição, e não uma sequência gravada, pode mudar se uma fiscalização anterior do ano<br>for excluída e esta for finalizada de novo. *(fonte: funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid), src/lib/offline/repository.ts:509, src/pages/AcompanhamentoDeterminacoes.jsx:358)* |  |
| 15 | `created_at` | timestamp with time zone |  | `now()` | Quando a fiscalização foi criada no aparelho. Define o ano e a ordem usados no número do termo. *(fonte: src/lib/offline/repository.ts:507, funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid))* |  |
| 16 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração. Gravada pelo aparelho, pelas funções de finalizar e reabrir e pelo gatilho<br>`update_fiscalizacoes_updated_at`. A sincronização incremental usa esta coluna. *(fonte: gatilho:public.fiscalizacoes.update_fiscalizacoes_updated_at, src/lib/offline/syncEngine.ts:1702)* |  |
| 17 | `created_by` | uuid |  | `auth.uid()` | Conta de quem criou a fiscalização; o banco preenche com o usuário logado. Tem chave estrangeira<br>para `auth.users` sem regra de exclusão, o que impede excluir definitivamente um usuário que já<br>criou fiscalização.<br>As políticas do usuário de teste e2e usam esta coluna para limitá-lo às próprias fiscalizações. *(fonte: restricao:fiscalizacoes.fiscalizacoes_created_by_fkey, funcao:admin_delete_user(p_user_id uuid), politica:public.fiscalizacoes.e2e_test_user_own_rows_only)* |  |
| 18 | `last_modified_by` | text |  |  | E-mail de quem fez a última alteração; `sistema` quando foi sem usuário logado. Gravado pelo<br>gatilho `trg_set_fiscalizacao_last_modified`. *(fonte: funcao:set_fiscalizacao_last_modified())* |  |
| 19 | `last_modified_at` | timestamp with time zone |  |  | Quando foi a última alteração, gravado pelo mesmo gatilho. *(fonte: funcao:set_fiscalizacao_last_modified())* |  |
| 20 | `tipo_modulo` | text |  | `'saneamento_dsb'::text` | Módulo de origem da fiscalização:<br>- DSB: `saneamento_dsb` (padrão), `residuos_dsb`;<br>- DTR: `rodovias_dtr`, `transportes_dtr`, `fiscal_dtr`;<br>- DGE: `gas_dge`, `energia_dge`.<br>Vem da câmara ou da diretoria do usuário e filtra listas e indicadores por diretoria. Em produção:<br>24 `saneamento_dsb` e 2 `rodovias_dtr`. As fiscalizações do CATERS também estão como<br>`saneamento_dsb`, porque o valor segue a diretoria. *(fonte: src/hooks/useModulo.js:57, src/lib/offline/repository.ts:505, inventário: dominio_categorico)* | `saneamento_dsb` (24), `rodovias_dtr` (2) |
| 21 | `rodovia` | text |  |  | Rodovia principal vistoriada numa fiscalização da DTR (ex.: BR-163, MS-306). *(fonte: src/lib/offline/repository.ts:506)* |  |
| 22 | `camara_tecnica_id` | text |  |  | Câmara técnica da fiscalização. Controla quem vê e altera a fiscalização (`can_access_camara`).<br>Se não vier preenchida, o gatilho `tr_camara_fiscalizacoes` a deduz dos serviços, na criação e<br>quando os serviços mudam. Serviços de câmaras diferentes, ou de rodovias, deixam a câmara vazia,<br>e aí a fiscalização fica visível a todos os fiscais e coordenadores. *(fonte: gatilho:public.fiscalizacoes.tr_camara_fiscalizacoes, funcao:can_access_camara(row_camara text))* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `fiscalizacoes_created_by_fkey` | chave_estrangeira | `FOREIGN KEY (created_by) REFERENCES auth.users(id)` |
| `fiscalizacoes_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `fiscalizacoes_pkey` | `CREATE UNIQUE INDEX fiscalizacoes_pkey ON public.fiscalizacoes USING btree (id)` |
| `idx_fiscalizacoes_camara` | `CREATE INDEX idx_fiscalizacoes_camara ON public.fiscalizacoes USING btree (camara_tecnica_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)

**É usada por:**

- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — le (codigo)
- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — escreve (codigo)
- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) — escreve (codigo)
- [reabrir_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/reabrir_fiscalizacao.md) — escreve (codigo)
- [trg_auto_set_camara()](../funcoes/trg_auto_set_camara.md) — le (codigo)
- [trg_remessa_set_camara()](../funcoes/trg_remessa_set_camara.md) — le (codigo)
- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)
- [caters_fiscalizacoes_disponiveis](../tabelas/caters_fiscalizacoes_disponiveis.md) — consulta (catalogo)
- [caters_processes](../tabelas/caters_processes.md) — referencia (catalogo)
- [fotos_evidencia](../tabelas/fotos_evidencia.md) — referencia (catalogo)
- [relatorios_jobs](../tabelas/relatorios_jobs.md) — referencia (catalogo)
- [remessas_ai](../tabelas/remessas_ai.md) — referencia (catalogo)
- [respostas_determinacao](../tabelas/respostas_determinacao.md) — referencia (catalogo)
- [termos_notificacao](../tabelas/termos_notificacao.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `tr_camara_fiscalizacoes` | ativo | [trg_fiscalizacao_set_camara()](../funcoes/trg_fiscalizacao_set_camara.md) | Antes de inserir, ou de alterar os serviços, preenche a câmara técnica a partir dos serviços,<br>quando ela vem vazia. *(fonte: funcao:trg_fiscalizacao_set_camara(), funcao:camara_from_servicos(p_servicos text[]))* |
| `trg_audit_fiscalizacoes` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | Depois de cada inclusão, alteração ou exclusão, grava o registro de auditoria. *(fonte: funcao:process_audit_log())* |
| `trg_set_fiscalizacao_cache_fields` | ativo | [set_fiscalizacao_cache_fields()](../funcoes/set_fiscalizacao_cache_fields.md) | Antes de gravar, copia os nomes do município e do prestador a partir dos ids. Se o nome do fiscal<br>vier vazio, usa o nome do perfil de quem grava. *(fonte: funcao:set_fiscalizacao_cache_fields())* |
| `trg_set_fiscalizacao_last_modified` | ativo | [set_fiscalizacao_last_modified()](../funcoes/set_fiscalizacao_last_modified.md) | Antes de gravar, registra quem alterou (e-mail ou `sistema`) e quando. *(fonte: funcao:set_fiscalizacao_last_modified())* |
| `update_fiscalizacoes_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:update_updated_at_column())* |

<details><summary>Definição de tr_camara_fiscalizacoes</summary>

```sql
CREATE TRIGGER tr_camara_fiscalizacoes BEFORE INSERT OR UPDATE OF servicos ON fiscalizacoes FOR EACH ROW EXECUTE FUNCTION trg_fiscalizacao_set_camara()
```

</details>

<details><summary>Definição de trg_audit_fiscalizacoes</summary>

```sql
CREATE TRIGGER trg_audit_fiscalizacoes AFTER INSERT OR DELETE OR UPDATE ON fiscalizacoes FOR EACH ROW EXECUTE FUNCTION process_audit_log()
```

</details>

<details><summary>Definição de trg_set_fiscalizacao_cache_fields</summary>

```sql
CREATE TRIGGER trg_set_fiscalizacao_cache_fields BEFORE INSERT OR UPDATE ON fiscalizacoes FOR EACH ROW EXECUTE FUNCTION set_fiscalizacao_cache_fields()
```

</details>

<details><summary>Definição de trg_set_fiscalizacao_last_modified</summary>

```sql
CREATE TRIGGER trg_set_fiscalizacao_last_modified BEFORE INSERT OR UPDATE ON fiscalizacoes FOR EACH ROW EXECUTE FUNCTION set_fiscalizacao_last_modified()
```

</details>

<details><summary>Definição de update_fiscalizacoes_updated_at</summary>

```sql
CREATE TRIGGER update_fiscalizacoes_updated_at BEFORE UPDATE ON fiscalizacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso por camara em fiscalizacoes

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin ativo tem acesso total. Coordenador e fiscal ativos leem, criam, alteram e excluem as
fiscalizações da sua câmara e as sem câmara; se não têm câmara, todas (`can_access_camara`). *(fonte: funcao:can_access_camara(row_camara text))*
- **Funções auxiliares**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md)

<details><summary>Condição original</summary>

```sql
USING:
can_access_camara(camara_tecnica_id)

WITH CHECK:
can_access_camara(camara_tecnica_id)
```

</details>

### Prestadores: ler apenas suas próprias fiscalizações

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê as fiscalizações da própria entidade, mesmo antes de ser notificado. Já para
as unidades e os itens delas, ele precisa de termo de notificação (`can_access_fiscalizacao`). *(fonte: funcao:get_my_prestador_id(), funcao:can_access_fiscalizacao(fiscalizacao uuid))*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))

WITH CHECK:
(nenhuma)
```

</details>

### Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Cópia idêntica da política anterior, com o nome corrompido por erro de codificação na migration
que a criou. É resíduo; o efeito é o mesmo. *(fonte: politica:public.fiscalizacoes.Prestadores: ler apenas suas próprias fiscalizações)*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))

WITH CHECK:
(nenhuma)
```

</details>

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: Política restritiva: o usuário de teste e2e (id fixo) só altera fiscalizações que ele criou. Os
demais usuários não são afetados. Existe para os testes automatizados poderem escrever em
produção sem tocar dados reais. *(fonte: supabase/migrations/135_e2e_test_user_write_restriction.sql)*

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
- **Em linguagem simples**: Mesma restrição, para exclusão: o usuário de teste só exclui o que criou. *(fonte: supabase/migrations/135_e2e_test_user_write_restriction.sql)*

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
