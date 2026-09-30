<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# constatacoes_manuais

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 299
- **RLS ativo**: sim

## Finalidade

Constatações que o fiscal escreve livremente na unidade, fora do checklist. Cada uma é numerada
junto com as respostas do checklist (C1, C2…). Pode gerar NC e, com ela, uma determinação ou uma
recomendação, com os textos da própria constatação. Produção tem 299, 123 delas gerando NC.

Criadas e editadas offline e sincronizadas pela fila. A NC, a determinação e a recomendação
correspondentes são feitas por `gerar_ncs_unidade`, com origem `manual_constatacao:<id>`. *(fonte: src/lib/offline/repository.ts:2268, src/lib/offline/repository.ts:1820, funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador, gerado no aparelho. Compõe a origem da determinação e da recomendação geradas<br>(`manual_constatacao:<id>`). *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 2 | `unidade_fiscalizada_id` | uuid |  |  | Unidade da constatação. Excluir a unidade exclui as constatações. *(fonte: restricao:constatacoes_manuais.constatacoes_manuais_unidade_fiscalizada_id_fkey)* |  |
| 3 | `descricao` | text | sim |  | Texto da constatação escrito pelo fiscal; sai no relatório. *(fonte: src/lib/offline/repository.ts:2268)* |  |
| 4 | `ordem` | bigint |  | `0` | Posição da constatação. A numeração C usa `numero_constatacao`, não esta coluna. ⚠️ *hipótese* |  |
| 5 | `created_at` | timestamp with time zone |  | `now()` | Quando a constatação foi criada; desempata a numeração. *(fonte: src/lib/offline/repository.ts:1820)* |  |
| 6 | `numero_constatacao` | text |  |  | Número da constatação (C<n>), na mesma sequência das respostas do checklist, refeito pelo<br>aparelho. *(fonte: src/lib/offline/repository.ts:1820, src/lib/offline/repository.ts:1927)* |  |
| 7 | `gera_nc` | boolean |  | `false` | Se a constatação gera NC (e determinação ou recomendação). *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), inventário: dominio_categorico)* | `false` (176), `true` (123) |
| 8 | `artigo_portaria` | text |  |  | Dispositivo normativo descumprido, usado na descrição da NC. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 9 | `texto_determinacao` | text |  |  | Texto da determinação a gerar ("Sanar NC<n>. <texto>"). Quando preenchido, a recomendação não é<br>gerada. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 10 | `texto_recomendacao` | text |  |  | Texto da recomendação a gerar quando não há texto de determinação. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 11 | `descricao_nc` | text |  |  | Descrição da NC escrita pelo fiscal. Se vazia, a NC usa "Constatação C<n>: não cumprimento do<br><artigo>;". *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/pages/VistoriarUnidade.jsx:771)* |  |
| 12 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração, gravada pelo aparelho (não há gatilho). Ordena o processamento das<br>constatações no servidor. *(fonte: src/lib/offline/repository.ts:2268, funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `constatacoes_manuais_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `constatacoes_manuais_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `constatacoes_manuais_pkey` | `CREATE UNIQUE INDEX constatacoes_manuais_pkey ON public.constatacoes_manuais USING btree (id)` |

## Dependências

**Depende de:**

- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — le (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_audit_constatacoes` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | Depois de cada inclusão, alteração ou exclusão, grava o registro de auditoria. *(fonte: funcao:process_audit_log())* |
| `trg_propagate_constatacoes` | ativo | [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) | Depois de cada mudança, atualiza `updated_at` da fiscalização da unidade. *(fonte: funcao:propagate_modification_to_parent())* |

<details><summary>Definição de trg_audit_constatacoes</summary>

```sql
CREATE TRIGGER trg_audit_constatacoes AFTER INSERT OR DELETE OR UPDATE ON constatacoes_manuais FOR EACH ROW EXECUTE FUNCTION process_audit_log()
```

</details>

<details><summary>Definição de trg_propagate_constatacoes</summary>

```sql
CREATE TRIGGER trg_propagate_constatacoes AFTER INSERT OR DELETE OR UPDATE ON constatacoes_manuais FOR EACH ROW EXECUTE FUNCTION propagate_modification_to_parent()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso total em constatacoes

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

### Prestadores: ler suas próprias constatacoes

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê as constatações de unidades de fiscalizações da própria entidade, sem exigir
termo de notificação. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = constatacoes_manuais.unidade_fiscalizada_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### constatacoes_prestador_select

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

### constatacoes_staff_all

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

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera constatações de fiscalizações que ele criou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = constatacoes_manuais.unidade_fiscalizada_id) AND (f.created_by = auth.uid())))))

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
  WHERE ((u.id = constatacoes_manuais.unidade_fiscalizada_id) AND (f.created_by = auth.uid())))))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

- Divergência `coluna:constatacoes_manuais.descricao`: **estrutura_diferente**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `coluna:constatacoes_manuais.ordem`: **estrutura_diferente**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.constatacoes_manuais.constatacoes_prestador_select`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.constatacoes_manuais.constatacoes_staff_all`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
