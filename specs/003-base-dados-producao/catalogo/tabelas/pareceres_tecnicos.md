<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# pareceres_tecnicos

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
| 2 | `auto_id` | uuid |  |  |  |  |
| 3 | `recomendacao` | text |  |  |  |  |
| 4 | `valor_multa_sugerido` | numeric(10,2) |  |  |  |  |
| 5 | `analise_tecnica` | text |  |  |  |  |
| 6 | `status` | text |  | `'pendente'::text` |  |  |
| 7 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 8 | `arquivo_parecer_assinado_url` | text |  |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `pareceres_tecnicos_auto_id_fkey` | chave_estrangeira | `FOREIGN KEY (auto_id) REFERENCES autos_infracao(id) ON DELETE CASCADE` |
| `pareceres_tecnicos_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `pareceres_tecnicos_pkey` | `CREATE UNIQUE INDEX pareceres_tecnicos_pkey ON public.pareceres_tecnicos USING btree (id)` |

## Dependências

**Depende de:**

- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)

**É usada por:**

- [julgamentos](../tabelas/julgamentos.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso por camara em pareceres

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM autos_infracao ai
  WHERE ((ai.id = pareceres_tecnicos.auto_id) AND can_access_camara(ai.camara_tecnica_id))))))

WITH CHECK:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM autos_infracao ai
  WHERE ((ai.id = pareceres_tecnicos.auto_id) AND can_access_camara(ai.camara_tecnica_id))))))
```

</details>

### Prestadores: ler pareceres de seus autos

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = pareceres_tecnicos.auto_id) AND (a.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### pareceres_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = pareceres_tecnicos.auto_id) AND (a.prestador_servico_id = current_prestador_servico_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### pareceres_staff_all

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
