<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# manifestacoes_auto

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
| 2 | `auto_infracao_id` | uuid |  |  |  |  |
| 3 | `descricao` | text |  |  |  |  |
| 4 | `data_manifestacao` | timestamp with time zone |  | `now()` |  |  |
| 5 | `arquivo_url` | text |  |  |  |  |
| 6 | `created_at` | timestamp with time zone |  | `now()` |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `manifestacoes_auto_auto_infracao_id_fkey` | chave_estrangeira | `FOREIGN KEY (auto_infracao_id) REFERENCES autos_infracao(id) ON DELETE CASCADE` |
| `manifestacoes_auto_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `manifestacoes_auto_pkey` | `CREATE UNIQUE INDEX manifestacoes_auto_pkey ON public.manifestacoes_auto USING btree (id)` |

## Dependências

**Depende de:**

- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso por camara em manifestacoes

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM autos_infracao ai
  WHERE ((ai.id = manifestacoes_auto.auto_infracao_id) AND can_access_camara(ai.camara_tecnica_id))))))

WITH CHECK:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM autos_infracao ai
  WHERE ((ai.id = manifestacoes_auto.auto_infracao_id) AND can_access_camara(ai.camara_tecnica_id))))))
```

</details>

### Prestadores: atualizar suas próprias manifestações

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = get_my_prestador_id())))))
```

</details>

### Prestadores: cadastrar suas próprias manifestações

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = get_my_prestador_id())))))
```

</details>

### Prestadores: ler suas próprias manifestações

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### manifestacoes_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = current_prestador_servico_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### manifestacoes_staff_all

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
