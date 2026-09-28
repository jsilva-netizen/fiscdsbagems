<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# nao_conformidades

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 478
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `unidade_fiscalizada_id` | uuid |  |  |  |  |
| 3 | `descricao` | text | sim |  |  |  |
| 4 | `gravidade` | text |  |  |  | `Média` (478) |
| 5 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 6 | `resposta_checklist_id` | uuid |  |  |  |  |
| 7 | `fotos` | jsonb |  | `'[]'::jsonb` |  | JSON — formas: array (478) |
| 8 | `latitude_foto` | double precision |  |  |  |  |
| 9 | `longitude_foto` | double precision |  |  |  |  |
| 10 | `numero_nc` | text |  |  |  |  |
| 11 | `artigo_portaria` | text |  |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `nao_conformidades_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `nao_conformidades_resposta_checklist_id_fkey` | chave_estrangeira | `FOREIGN KEY (resposta_checklist_id) REFERENCES respostas_checklist(id) ON DELETE SET NULL` |
| `nao_conformidades_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `idx_nc_resposta` | `CREATE INDEX idx_nc_resposta ON public.nao_conformidades USING btree (resposta_checklist_id)` |
| `idx_nc_resposta_checklist` | `CREATE INDEX idx_nc_resposta_checklist ON public.nao_conformidades USING btree (resposta_checklist_id)` |
| `idx_nc_unidade` | `CREATE INDEX idx_nc_unidade ON public.nao_conformidades USING btree (unidade_fiscalizada_id)` |
| `nao_conformidades_pkey` | `CREATE UNIQUE INDEX nao_conformidades_pkey ON public.nao_conformidades USING btree (id)` |

## Dependências

**Depende de:**

- [respostas_checklist](../tabelas/respostas_checklist.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- [determinacoes_fill_origem()](../funcoes/determinacoes_fill_origem.md) — le (codigo)
- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — le (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — escreve (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [determinacoes](../tabelas/determinacoes.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso total em ncs

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

### Prestadores: ler suas próprias ncs

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = nao_conformidades.unidade_fiscalizada_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### ncs_prestador_select

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

### ncs_staff_all

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
