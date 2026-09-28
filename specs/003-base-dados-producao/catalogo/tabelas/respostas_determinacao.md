<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# respostas_determinacao

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 34
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `determinacao_id` | uuid |  |  |  |  |
| 3 | `unidade_fiscalizada_id` | uuid |  |  |  |  |
| 4 | `fiscalizacao_id` | uuid |  |  |  |  |
| 5 | `prestador_servico_id` | uuid |  |  |  |  |
| 6 | `resposta` | text |  |  |  |  |
| 7 | `status` | text |  |  |  | `aguardando_analise` (33), `nao_atendida` (1) |
| 8 | `manifestacao_prestador` | text |  |  |  | `a` (14), `aa` (13), `aaa` (6), `aaaaaaaaa` (1) |
| 9 | `descricao_atendimento` | text |  |  |  |  |
| 10 | `dentro_prazo` | boolean |  |  |  | `true` (34) |
| 11 | `tipo_resposta` | text |  |  |  |  |
| 12 | `data_resposta` | timestamp with time zone |  | `now()` |  |  |
| 13 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 14 | `evidencias` | jsonb |  | `'[]'::jsonb` |  | JSON — formas: array (34) |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `respostas_determinacao_determinacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id) ON DELETE CASCADE` |
| `respostas_determinacao_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id)` |
| `respostas_determinacao_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `respostas_determinacao_prestador_servico_id_fkey` | chave_estrangeira | `FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico(id)` |
| `respostas_determinacao_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id)` |

| Índice | Definição |
|---|---|
| `respostas_determinacao_pkey` | `CREATE UNIQUE INDEX respostas_determinacao_pkey ON public.respostas_determinacao USING btree (id)` |

## Dependências

**Depende de:**

- [determinacoes](../tabelas/determinacoes.md) — referencia (catalogo)
- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)
- [prestadores_servico](../tabelas/prestadores_servico.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso total em respostas determinacoes

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

### Prestadores: atualizar suas próprias respostas determinacoes

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))

WITH CHECK:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))
```

</details>

### Prestadores: cadastrar respostas determinacoes

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))
```

</details>

### Prestadores: ler suas próprias respostas determinacoes

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))

WITH CHECK:
(nenhuma)
```

</details>

### respostas_det_prestador_insert

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md), [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id) AND (status = ANY (ARRAY['rascunho'::text, 'aguardando_analise'::text])))
```

</details>

### respostas_det_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md), [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id))

WITH CHECK:
(nenhuma)
```

</details>

### respostas_det_prestador_update

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md), [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id))

WITH CHECK:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id) AND (status = ANY (ARRAY['rascunho'::text, 'aguardando_analise'::text])))
```

</details>

### respostas_det_staff_all

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
