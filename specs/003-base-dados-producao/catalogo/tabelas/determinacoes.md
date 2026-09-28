<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# determinacoes

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 183
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `unidade_fiscalizada_id` | uuid |  |  |  |  |
| 3 | `descricao` | text | sim |  |  |  |
| 4 | `prazo` | date |  |  |  |  |
| 5 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 6 | `nao_conformidade_id` | uuid |  |  |  |  |
| 7 | `numero_determinacao` | text |  |  |  |  |
| 8 | `prazo_dias` | integer |  |  |  | `30` (182), `(nulo)` (1) |
| 9 | `data_limite` | date |  |  |  |  |
| 10 | `status` | text |  | `'pendente'::text` |  | `pendente` (183) |
| 11 | `origem` | text | sim | `('legacy:'::text \|\| (uuid_generate_v4())::text)` |  |  |
| 12 | `updated_at` | timestamp with time zone |  | `now()` |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `determinacoes_nao_conformidade_id_fkey` | chave_estrangeira | `FOREIGN KEY (nao_conformidade_id) REFERENCES nao_conformidades(id) ON DELETE SET NULL` |
| `determinacoes_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `determinacoes_status_check` | verificacao | `CHECK (status = ANY (ARRAY['pendente'::text, 'cumprida'::text, 'nao_cumprida'::text, 'prorrogada'::text]))` |
| `determinacoes_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `determinacoes_pkey` | `CREATE UNIQUE INDEX determinacoes_pkey ON public.determinacoes USING btree (id)` |
| `determinacoes_unidade_origem_unq` | `CREATE UNIQUE INDEX determinacoes_unidade_origem_unq ON public.determinacoes USING btree (unidade_fiscalizada_id, origem)` |
| `idx_determinacoes_nc` | `CREATE INDEX idx_determinacoes_nc ON public.determinacoes USING btree (nao_conformidade_id)` |
| `idx_determinacoes_numero` | `CREATE INDEX idx_determinacoes_numero ON public.determinacoes USING btree (numero_determinacao)` |
| `idx_determinacoes_unidade` | `CREATE INDEX idx_determinacoes_unidade ON public.determinacoes USING btree (unidade_fiscalizada_id)` |
| `idx_dets_nc` | `CREATE INDEX idx_dets_nc ON public.determinacoes USING btree (nao_conformidade_id)` |

## Dependências

**Depende de:**

- [nao_conformidades](../tabelas/nao_conformidades.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — le (codigo)
- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — le (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — escreve (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) — le (codigo)
- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)
- [caters_recommendations](../tabelas/caters_recommendations.md) — referencia (catalogo)
- [respostas_determinacao](../tabelas/respostas_determinacao.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_audit_determinacoes` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | _Sem anotação._ |
| `trg_propagate_determinacoes` | ativo | [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) | _Sem anotação._ |
| `update_determinacoes_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | _Sem anotação._ |

<details><summary>Definição de trg_audit_determinacoes</summary>

```sql
CREATE TRIGGER trg_audit_determinacoes AFTER INSERT OR DELETE OR UPDATE ON determinacoes FOR EACH ROW EXECUTE FUNCTION process_audit_log()
```

</details>

<details><summary>Definição de trg_propagate_determinacoes</summary>

```sql
CREATE TRIGGER trg_propagate_determinacoes AFTER INSERT OR DELETE OR UPDATE ON determinacoes FOR EACH ROW EXECUTE FUNCTION propagate_modification_to_parent()
```

</details>

<details><summary>Definição de update_determinacoes_updated_at</summary>

```sql
CREATE TRIGGER update_determinacoes_updated_at BEFORE UPDATE ON determinacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso total em determinacoes

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))
```

</details>

### Prestadores: ler suas próprias determinacoes

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = determinacoes.unidade_fiscalizada_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### determinacoes_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [can_access_unidade(unidade uuid)](../funcoes/can_access_unidade.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND can_access_unidade(unidade_fiscalizada_id))

WITH CHECK:
(nenhuma)
```

</details>

### determinacoes_staff_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [is_staff()](../funcoes/is_staff.md)

<details><summary>Condição original</summary>

```sql
USING:
is_staff()

WITH CHECK:
is_staff()
```

</details>

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = determinacoes.unidade_fiscalizada_id) AND (f.created_by = auth.uid())))))

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
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = determinacoes.unidade_fiscalizada_id) AND (f.created_by = auth.uid())))))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
