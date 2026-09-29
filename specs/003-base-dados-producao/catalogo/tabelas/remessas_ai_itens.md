<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# remessas_ai_itens

- **Tipo**: tabela
- **Dono**: módulo **processo_sancionador**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Autos de infração que compõem cada remessa: um registro por auto, e um auto no máximo uma vez por
remessa. Criados ao montar a remessa na Gestão de Autos e lidos pelo portal e pelos pareceres.
**Vazia em produção.** *(fonte: src/pages/GestaoAutos.jsx:437, src/pages/PortalPrestadorHome.jsx:225, src/pages/PareceresTecnicos.jsx:32)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador do item. *(fonte: src/lib/offline/repository.ts:1595)* |  |
| 2 | `remessa_ai_id` | uuid |  |  | Remessa; excluir a remessa exclui os itens. *(fonte: restricao:remessas_ai_itens.remessas_ai_itens_remessa_ai_id_fkey)* |  |
| 3 | `auto_infracao_id` | uuid |  |  | Auto incluído na remessa; excluir o auto o retira da remessa. *(fonte: restricao:remessas_ai_itens.remessas_ai_itens_auto_infracao_id_fkey, indice:remessas_ai_itens_remessa_ai_id_auto_infracao_id_key)* |  |
| 4 | `created_at` | timestamp with time zone |  | `now()` | Quando o auto foi incluído na remessa. *(fonte: src/lib/offline/repository.ts:1595)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `remessas_ai_itens_auto_infracao_id_fkey` | chave_estrangeira | `FOREIGN KEY (auto_infracao_id) REFERENCES autos_infracao(id) ON DELETE CASCADE` |
| `remessas_ai_itens_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `remessas_ai_itens_remessa_ai_id_auto_infracao_id_key` | unica | `UNIQUE (remessa_ai_id, auto_infracao_id)` |
| `remessas_ai_itens_remessa_ai_id_fkey` | chave_estrangeira | `FOREIGN KEY (remessa_ai_id) REFERENCES remessas_ai(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `remessas_ai_itens_pkey` | `CREATE UNIQUE INDEX remessas_ai_itens_pkey ON public.remessas_ai_itens USING btree (id)` |
| `remessas_ai_itens_remessa_ai_id_auto_infracao_id_key` | `CREATE UNIQUE INDEX remessas_ai_itens_remessa_ai_id_auto_infracao_id_key ON public.remessas_ai_itens USING btree (remessa_ai_id, auto_infracao_id)` |

## Dependências

**Depende de:**

- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)
- [remessas_ai](../tabelas/remessas_ai.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### Acesso total autenticado (DEV)

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Quem tem perfil ativo, de qualquer papel, lê, cria, altera e exclui qualquer item de remessa.
Desde a migration 138; antes, qualquer logado. *(fonte: supabase/migrations/138_fix_open_policies.sql)*

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

### Fiscais e Admins: acesso por camara em itens de remessas

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin total; coordenador e fiscal ativos, pelos itens de remessas da sua câmara. Sem efeito prático por causa da política "(DEV)". *(fonte: funcao:get_my_role(), funcao:get_my_camara_tecnica())*
- **Funções auxiliares**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM remessas_ai r
  WHERE ((r.id = remessas_ai_itens.remessa_ai_id) AND can_access_camara(r.camara_tecnica_id))))))

WITH CHECK:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM remessas_ai r
  WHERE ((r.id = remessas_ai_itens.remessa_ai_id) AND can_access_camara(r.camara_tecnica_id))))))
```

</details>

### Prestadores: ler itens de suas próprias remessas

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê os itens das remessas da própria entidade; contida na política "(DEV)". *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM remessas_ai r
  WHERE ((r.id = remessas_ai_itens.remessa_ai_id) AND (r.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
