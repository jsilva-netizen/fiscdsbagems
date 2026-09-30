<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# determinacoes

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 183
- **RLS ativo**: sim

## Finalidade

Determinações que a AGEMS impõe à entidade para sanar cada NC, com prazo. São geradas a partir do
checklist ou das constatações manuais (item ou constatação com NC e texto de determinação), e
depois acompanhadas na tela de acompanhamento e respondidas pelo prestador
(`respostas_determinacao`). Produção tem 183, todas pendentes.

Diferente das NCs, **não são recriadas**: `gerar_ncs_unidade` identifica cada uma pela `origem` e
preserva o texto, o prazo e a numeração editados na tela. Ela só cria as que faltam e apaga as que
deixaram de ter origem válida (por exemplo, a resposta voltou para Sim). *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/lib/offline/repository.ts:1219, src/lib/offline/repository.ts:1123, src/pages/AcompanhamentoDeterminacoes.jsx:142, inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da determinação; as respostas do prestador apontam para ele. *(fonte: src/lib/offline/repository.ts:1219)* |  |
| 2 | `unidade_fiscalizada_id` | uuid |  |  | Unidade da determinação. Excluir a unidade exclui as determinações. *(fonte: restricao:determinacoes.determinacoes_unidade_fiscalizada_id_fkey)* |  |
| 3 | `descricao` | text | sim |  | Texto da determinação. Nasce como "Sanar NC<n>. <texto do item ou da constatação>"; o aparelho<br>usa "NC?" até saber o número. É editável, e a edição é preservada nas regenerações. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/lib/offline/repository.ts:1219)* |  |
| 4 | `prazo` | date |  |  | Coluna antiga de prazo (data). A geração atual grava `prazo_dias` e `data_limite`, e não esta<br>coluna. ⚠️ *hipótese* |  |
| 5 | `created_at` | timestamp with time zone |  | `now()` | Quando a determinação foi criada; filtra o acompanhamento por período. *(fonte: src/pages/AcompanhamentoDeterminacoes.jsx:142)* |  |
| 6 | `nao_conformidade_id` | uuid |  |  | NC que a determinação manda sanar. Fica vazio quando as NCs são recriadas e é religado na mesma<br>execução. Há dois índices idênticos nesta coluna. *(fonte: restricao:determinacoes.determinacoes_nao_conformidade_id_fkey, indice:idx_determinacoes_nc, indice:idx_dets_nc)* |  |
| 7 | `numero_determinacao` | text |  |  | Número da determinação na unidade (D1, D2…), dado pelo aparelho (`recomputeDeterminacoesNumeracao`)<br>e mantido na ordem definida pelo fiscal. O servidor cria sem número. *(fonte: src/lib/offline/repository.ts:1133, src/lib/offline/repository.ts:1189)* |  |
| 8 | `prazo_dias` | integer |  |  | Prazo em dias para cumprir, vindo do item do checklist (padrão 30; em produção, 30 em 182 e vazio<br>em 1). *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), inventário: dominio_categorico)* | `30` (182), `(nulo)` (1) |
| 9 | `data_limite` | date |  |  | Data-limite: a data de criação mais `prazo_dias`. O acompanhamento marca como vencida a<br>determinação pendente depois desta data. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/pages/AcompanhamentoDeterminacoes.jsx:159)* |  |
| 10 | `status` | text |  | `'pendente'::text` | `pendente`, `cumprida`, `nao_cumprida` ou `prorrogada`: o banco aceita só esses valores. Nenhuma<br>tela nem função muda o status: as 183 de produção estão `pendente`. O cumprimento é acompanhado<br>pelas respostas do prestador. *(fonte: restricao:determinacoes.determinacoes_status_check, inventário: dominio_categorico)* | `pendente` (183) |
| 11 | `origem` | text | sim | `('legacy:'::text \|\| (uuid_generate_v4())::text)` | De onde veio a determinação. É o que permite preservar edições:<br>- `checklist:<id do item>`;<br>- `manual_constatacao:<id da constatação>`;<br>- `legacy:<id>`: o padrão da coluna, para linhas antigas ou sem origem conhecida.<br>Única por unidade (`determinacoes_unidade_origem_unq`). *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), indice:determinacoes_unidade_origem_unq)* |  |
| 12 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração: gravada pelo aparelho, pela função e pelo gatilho `update_determinacoes_updated_at`. *(fonte: gatilho:public.determinacoes.update_determinacoes_updated_at)* |  |

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
- [proteger_resposta_determinacao_prestador()](../funcoes/proteger_resposta_determinacao_prestador.md) — le (codigo)
- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)
- [caters_recommendations](../tabelas/caters_recommendations.md) — referencia (catalogo)
- [respostas_determinacao](../tabelas/respostas_determinacao.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_audit_determinacoes` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | Depois de cada inclusão, alteração ou exclusão, grava o registro de auditoria. *(fonte: funcao:process_audit_log())* |
| `trg_propagate_determinacoes` | ativo | [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) | Depois de cada mudança, atualiza `updated_at` da fiscalização da unidade. *(fonte: funcao:propagate_modification_to_parent())* |
| `update_determinacoes_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:update_updated_at_column())* |

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

### Prestadores: ler suas próprias determinacoes

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê as determinações de unidades de fiscalizações da própria entidade, sem exigir
termo de notificação. *(fonte: funcao:get_my_prestador_id(), src/pages/PortalPrestadorHome.jsx:114)*
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

### determinacoes_staff_all

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
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera determinações de fiscalizações que ele criou. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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
- **Em linguagem simples**: Mesma restrição, para exclusão. *(fonte: supabase/migrations/136_e2e_test_user_write_restriction_child_tables.sql)*

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

- Divergência `coluna:determinacoes.origem`: **estrutura_diferente**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_determinacoes_nc`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_determinacoes_numero`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_determinacoes_unidade`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.determinacoes.determinacoes_prestador_select`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.determinacoes.determinacoes_staff_all`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `restricao:determinacoes.determinacoes_status_check`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Achado **A-001** — Políticas de teste automatizado (e2e_test_*) em produção (situação: aguardando_decisao; [detalhes](../../achados.md#a-001)).
- Achado **A-025** — Colunas que nenhuma parte do sistema grava (situação: aguardando_decisao; [detalhes](../../achados.md#a-025)).
