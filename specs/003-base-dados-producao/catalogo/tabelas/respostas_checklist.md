<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# respostas_checklist

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 3454
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `unidade_fiscalizada_id` | uuid |  |  |  |  |
| 3 | `pergunta` | text | sim |  |  |  |
| 4 | `resposta` | text |  |  |  |  |
| 5 | `comentario` | text |  |  |  |  |
| 6 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 7 | `numero_constatacao` | text |  |  |  |  |
| 8 | `gera_nc` | boolean |  | `false` |  | `false` (3099), `true` (355) |
| 9 | `observacao` | text |  |  |  |  |
| 10 | `item_checklist_id` | uuid |  |  |  |  |
| 11 | `updated_at` | timestamp with time zone |  | `now()` |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `respostas_checklist_item_checklist_id_fkey` | chave_estrangeira | `FOREIGN KEY (item_checklist_id) REFERENCES itens_checklist(id)` |
| `respostas_checklist_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `respostas_checklist_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `idx_respostas_checklist_item` | `CREATE INDEX idx_respostas_checklist_item ON public.respostas_checklist USING btree (item_checklist_id)` |
| `respostas_checklist_pkey` | `CREATE UNIQUE INDEX respostas_checklist_pkey ON public.respostas_checklist USING btree (id)` |
| `ux_respostas_checklist_unidade_item` | `CREATE UNIQUE INDEX ux_respostas_checklist_unidade_item ON public.respostas_checklist USING btree (unidade_fiscalizada_id, item_checklist_id)` |

## Dependências

**Depende de:**

- [itens_checklist](../tabelas/itens_checklist.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- [determinacoes_fill_origem()](../funcoes/determinacoes_fill_origem.md) — le (codigo)
- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — le (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) — le (codigo)
- [nao_conformidades](../tabelas/nao_conformidades.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_audit_respostas` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | _Sem anotação._ |
| `trg_propagate_respostas` | ativo | [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) | _Sem anotação._ |

<details><summary>Definição de trg_audit_respostas</summary>

```sql
CREATE TRIGGER trg_audit_respostas AFTER INSERT OR DELETE OR UPDATE ON respostas_checklist FOR EACH ROW EXECUTE FUNCTION process_audit_log()
```

</details>

<details><summary>Definição de trg_propagate_respostas</summary>

```sql
CREATE TRIGGER trg_propagate_respostas AFTER INSERT OR DELETE OR UPDATE ON respostas_checklist FOR EACH ROW EXECUTE FUNCTION propagate_modification_to_parent()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso total em respostas

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

### Prestadores: ler suas próprias respostas

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = respostas_checklist.unidade_fiscalizada_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

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
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = respostas_checklist.unidade_fiscalizada_id) AND (f.created_by = auth.uid())))))

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
  WHERE ((u.id = respostas_checklist.unidade_fiscalizada_id) AND (f.created_by = auth.uid())))))

WITH CHECK:
(nenhuma)
```

</details>

### respostas_checklist_prestador_select

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

### respostas_checklist_staff_all

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

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
