<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# fiscalizacoes

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 26
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `municipio_id` | uuid |  |  |  |  |
| 3 | `municipio_nome` | text |  |  |  |  |
| 4 | `prestador_servico_id` | uuid |  |  |  |  |
| 5 | `prestador_servico_nome` | text |  |  |  |  |
| 6 | `fiscal_nome` | text |  |  |  |  |
| 7 | `fiscal_email` | text |  |  |  |  |
| 8 | `data_inicio` | timestamp with time zone |  |  |  |  |
| 9 | `data_fim` | timestamp with time zone |  |  |  |  |
| 10 | `latitude_inicio` | double precision |  |  |  |  |
| 11 | `longitude_inicio` | double precision |  |  |  |  |
| 12 | `status` | text |  | `'em_andamento'::text` |  | `finalizada` (19), `em_andamento` (7) |
| 13 | `servicos` | text[] |  |  |  | `{"Abastecimento de Água","Esgotamento Sanitário"}` (14), `{"Manejo de Resíduos Sólidos","Limpeza Urbana"}` (6), `{"Esgotamento Sanitário"}` (2), `{Rodovias}` (2), `{"Abastecimento de Água"}` (1), `{"Esgotamento Sanitário","Abastecimento de Água"}` (1) |
| 14 | `numero_termo` | text |  |  |  |  |
| 15 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 16 | `updated_at` | timestamp with time zone |  | `now()` |  |  |
| 17 | `created_by` | uuid |  | `auth.uid()` |  |  |
| 18 | `last_modified_by` | text |  |  |  |  |
| 19 | `last_modified_at` | timestamp with time zone |  |  |  |  |
| 20 | `tipo_modulo` | text |  | `'saneamento_dsb'::text` | Comentário no banco: Módulo/diretoria de origem da fiscalização.<br>DSB: saneamento_dsb \| residuos_dsb<br>DTR: rodovias_dtr \| transportes_dtr \| fiscal_dtr<br>DGE: gas_dge \| energia_dge | `saneamento_dsb` (24), `rodovias_dtr` (2) |
| 21 | `rodovia` | text |  |  | Comentário no banco: Rodovia principal vistoriada (ex: BR-163, MS-306, MS-112). |  |
| 22 | `camara_tecnica_id` | text |  |  |  |  |

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
| `tr_camara_fiscalizacoes` | ativo | [trg_fiscalizacao_set_camara()](../funcoes/trg_fiscalizacao_set_camara.md) | _Sem anotação._ |
| `trg_audit_fiscalizacoes` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | _Sem anotação._ |
| `trg_set_fiscalizacao_cache_fields` | ativo | [set_fiscalizacao_cache_fields()](../funcoes/set_fiscalizacao_cache_fields.md) | _Sem anotação._ |
| `trg_set_fiscalizacao_last_modified` | ativo | [set_fiscalizacao_last_modified()](../funcoes/set_fiscalizacao_last_modified.md) | _Sem anotação._ |
| `update_fiscalizacoes_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | _Sem anotação._ |

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
- **Em linguagem simples**: _Sem anotação._
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
- **Em linguagem simples**: _Sem anotação._
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
- **Em linguagem simples**: _Sem anotação._
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
- **Em linguagem simples**: _Sem anotação._

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
- **Em linguagem simples**: _Sem anotação._

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
