<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# remessas_ai_itens

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `remessa_ai_id` | uuid |  |  |  |  |
| 3 | `auto_infracao_id` | uuid |  |  |  |  |
| 4 | `created_at` | timestamp with time zone |  | `now()` |  |  |

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
- **Em linguagem simples**: _Sem anotação._

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
- **Em linguagem simples**: _Sem anotação._
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
- **Em linguagem simples**: _Sem anotação._
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
