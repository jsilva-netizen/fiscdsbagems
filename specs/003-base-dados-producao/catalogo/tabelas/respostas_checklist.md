<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# respostas_checklist

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 3454
- **RLS ativo**: sim

## Finalidade

Resposta do fiscal a cada item do checklist de uma unidade: Sim ou Não, com observação. Cada
resposta Sim ou Não é uma constatação numerada (C1, C2…) no relatório. Um Não em item que gera NC
produz a não conformidade e, pelo item, uma determinação ou recomendação. Produção tem 3.454
respostas, 355 delas gerando NC.

- **Gravação:** feita offline (`saveResposta`), com uma resposta por item e unidade (índice
  único).
- **Cópia do item:** a resposta guarda a pergunta e aponta para a versão do item respondida, e
  assim preserva o texto da época.
- **Numeração:** a numeração C é refeita no aparelho quando constatações entram ou saem. *(fonte: src/lib/offline/repository.ts:1739, src/lib/offline/repository.ts:1820, src/pages/VistoriarUnidade.jsx:370, funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da resposta, gerado no aparelho. A NC gerada aponta para ele<br>(`nao_conformidades.resposta_checklist_id`). *(fonte: src/lib/offline/repository.ts:1739, restricao:nao_conformidades.nao_conformidades_resposta_checklist_id_fkey)* |  |
| 2 | `unidade_fiscalizada_id` | uuid |  |  | Unidade respondida. Excluir a unidade exclui as respostas (`ON DELETE CASCADE`). *(fonte: restricao:respostas_checklist.respostas_checklist_unidade_fiscalizada_id_fkey)* |  |
| 3 | `pergunta` | text | sim |  | Texto da pergunta copiado do item no momento da resposta. Relatórios e contagens usam esta cópia,<br>e só contam como constatação respostas com pergunta preenchida. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/pages/VistoriarUnidade.jsx:207)* |  |
| 4 | `resposta` | text |  |  | `SIM` ou `NAO`, gravados pela tela. O servidor também aceita `NÃO`. Vazio ou outro valor não conta<br>como constatação. *(fonte: src/pages/VistoriarUnidade.jsx:370, funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 5 | `comentario` | text |  |  | Campo antigo de comentário. A tela atual grava em `observacao`, e a sincronização não envia este<br>campo. ⚠️ *hipótese* |  |
| 6 | `created_at` | timestamp with time zone |  | `now()` | Quando a resposta foi gravada. *(fonte: src/lib/offline/repository.ts:1739)* |  |
| 7 | `numero_constatacao` | text |  |  | Número da constatação na unidade (C1, C2…). O aparelho numera as respostas Sim ou Não junto com<br>as constatações manuais (`recomputeConstatacoesNumeracao`), mantendo a ordem já definida. Compõe<br>a descrição da NC ("Constatação C<n>: …"). *(fonte: src/lib/offline/repository.ts:1820, src/lib/offline/repository.ts:1880)* |  |
| 8 | `gera_nc` | boolean |  | `false` | Se esta resposta gera NC: resposta Não em item que gera NC. Gravado pela tela a partir do item. *(fonte: src/pages/VistoriarUnidade.jsx:387, inventário: dominio_categorico)* | `false` (3099), `true` (355) |
| 9 | `observacao` | text |  |  | Observação livre do fiscal sobre a resposta. *(fonte: src/lib/offline/syncEngine.ts:111)* |  |
| 10 | `item_checklist_id` | uuid |  |  | Versão do item de checklist respondida. Garante que a vistoria continue mostrando o texto da época<br>mesmo depois de o item ser editado. *(fonte: restricao:respostas_checklist.respostas_checklist_item_checklist_id_fkey, src/lib/offline/repository.ts:670)* |  |
| 11 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração. Não há gatilho que a mantenha: o aparelho grava. O servidor usa esta coluna para<br>escolher a resposta mais recente quando há duplicatas. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |

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
| `trg_audit_respostas` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | Depois de cada inclusão, alteração ou exclusão, grava o registro de auditoria. *(fonte: funcao:process_audit_log())* |
| `trg_propagate_respostas` | ativo | [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) | Depois de cada mudança, atualiza `updated_at` da fiscalização da unidade. *(fonte: funcao:propagate_modification_to_parent())* |

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

### Prestadores: ler suas próprias respostas

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê as respostas de unidades de fiscalizações da própria entidade, sem exigir
termo de notificação. *(fonte: funcao:get_my_prestador_id())*
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
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera respostas de fiscalizações que ele criou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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
- **Em linguagem simples**: Mesma restrição, para exclusão. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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
- **Em linguagem simples**: O prestador ativo lê as respostas se houver termo de notificação para a entidade dele
(`can_access_unidade`). Sem efeito próprio hoje: a política anterior já libera sem termo. *(fonte: funcao:can_access_unidade(unidade uuid))*
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

_Nenhuma divergência entre produção e migrations, nenhum achado._
