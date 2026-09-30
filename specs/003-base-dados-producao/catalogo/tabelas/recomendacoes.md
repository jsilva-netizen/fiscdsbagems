<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# recomendacoes

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 350
- **RLS ativo**: sim

## Finalidade

Recomendações à entidade: orientações sem prazo nem sanção, geradas quando o item ou a constatação
gera NC e tem texto de recomendação, mas não de determinação. Produção tem 350.

Como as determinações, são preservadas pela `origem` nas regenerações (texto e numeração
editados na tela ficam) e apagadas quando perdem a origem. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/lib/offline/repository.ts:870, src/lib/offline/repository.ts:785)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da recomendação. *(fonte: src/lib/offline/repository.ts:870)* |  |
| 2 | `unidade_fiscalizada_id` | uuid |  |  | Unidade da recomendação. Excluir a unidade exclui as recomendações. *(fonte: restricao:recomendacoes.recomendacoes_unidade_fiscalizada_id_fkey)* |  |
| 3 | `descricao` | text | sim |  | Texto da recomendação, vindo do item ou da constatação; editável e preservado. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/lib/offline/repository.ts:785)* |  |
| 4 | `created_at` | timestamp with time zone |  | `now()` | Quando a recomendação foi criada. *(fonte: src/lib/offline/repository.ts:870)* |  |
| 5 | `numero_recomendacao` | text |  |  | Número na unidade (R1, R2…), dado pelo aparelho (`recomputeRecomendacoesNumeracao`) e mantido na<br>ordem definida pelo fiscal, reordenável por arrastar. Único por unidade; há dois índices únicos<br>equivalentes, um deles parcial. *(fonte: src/lib/offline/repository.ts:795, indice:recomendacoes_unidade_numero_unq, indice:ux_recomendacoes_unidade_numero)* |  |
| 6 | `origem` | text |  | `'checklist'::text` | De onde veio a recomendação:<br>- `checklist:<id do item>`;<br>- `manual_constatacao:<id>`;<br>- `legacy_rec:<id>`.<br>O padrão da coluna, `checklist` sem id, marca linhas antigas; a função as reaproveita e as<br>renomeia. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 7 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração, gravada pelo aparelho e pela função (não há gatilho de `updated_at`). *(fonte: src/lib/offline/repository.ts:785)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `recomendacoes_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `recomendacoes_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `recomendacoes_pkey` | `CREATE UNIQUE INDEX recomendacoes_pkey ON public.recomendacoes USING btree (id)` |
| `recomendacoes_unidade_numero_unq` | `CREATE UNIQUE INDEX recomendacoes_unidade_numero_unq ON public.recomendacoes USING btree (unidade_fiscalizada_id, numero_recomendacao) WHERE ((numero_recomendacao IS NOT NULL) AND (btrim(numero_recomendacao) <> ''::text))` |
| `ux_recomendacoes_unidade_numero` | `CREATE UNIQUE INDEX ux_recomendacoes_unidade_numero ON public.recomendacoes USING btree (unidade_fiscalizada_id, numero_recomendacao)` |

## Dependências

**Depende de:**

- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — le (codigo)
- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — le (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — escreve (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [caters_recommendations](../tabelas/caters_recommendations.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_audit_recomendacoes` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | Depois de cada inclusão, alteração ou exclusão, grava o registro de auditoria. *(fonte: funcao:process_audit_log())* |
| `trg_propagate_recomendacoes` | ativo | [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) | Depois de cada mudança, atualiza `updated_at` da fiscalização da unidade. *(fonte: funcao:propagate_modification_to_parent())* |

<details><summary>Definição de trg_audit_recomendacoes</summary>

```sql
CREATE TRIGGER trg_audit_recomendacoes AFTER INSERT OR DELETE OR UPDATE ON recomendacoes FOR EACH ROW EXECUTE FUNCTION process_audit_log()
```

</details>

<details><summary>Definição de trg_propagate_recomendacoes</summary>

```sql
CREATE TRIGGER trg_propagate_recomendacoes AFTER INSERT OR DELETE OR UPDATE ON recomendacoes FOR EACH ROW EXECUTE FUNCTION propagate_modification_to_parent()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso total em recomendacoes

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos têm acesso total, sem olhar a câmara. *(fonte: funcao:get_my_role())*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))
```

</details>

### Prestadores: ler suas próprias recomendacoes

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê as recomendações de unidades de fiscalizações da própria entidade, sem exigir
termo de notificação. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = recomendacoes.unidade_fiscalizada_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera recomendações de fiscalizações que ele criou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = recomendacoes.unidade_fiscalizada_id) AND (f.created_by = auth.uid())))))

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
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = recomendacoes.unidade_fiscalizada_id) AND (f.created_by = auth.uid())))))

WITH CHECK:
(nenhuma)
```

</details>

### recomendacoes_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Leitura pelo prestador com termo de notificação; sem efeito próprio hoje. *(fonte: funcao:can_access_unidade(unidade uuid))*
- **Funções auxiliares**: [can_access_unidade(unidade uuid)](../funcoes/can_access_unidade.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND can_access_unidade(unidade_fiscalizada_id))

WITH CHECK:
(nenhuma)
```

</details>

### recomendacoes_staff_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Acesso total para admin, fiscal e coordenador ativos (`is_staff`); redundante. *(fonte: funcao:is_staff())*
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

- Divergência `indice:ux_recomendacoes_unidade_numero`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.recomendacoes.recomendacoes_prestador_select`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.recomendacoes.recomendacoes_staff_all`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Achado **A-001** — Políticas de teste automatizado (e2e_test_*) em produção (situação: aguardando_decisao; [detalhes](../../achados.md#a-001)).
