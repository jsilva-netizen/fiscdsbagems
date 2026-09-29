<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# julgamentos

- **Tipo**: tabela
- **Dono**: módulo **processo_sancionador**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Julgamento de um auto de infração, a partir do parecer técnico: decisão, multa final e
justificativa. **Sem uso**: está vazia em produção, e a função que a grava
(`createJulgamentoOnline`) existe no código, mas nenhuma tela a chama. O julgamento é a etapa do
processo sancionador que o sistema atual ainda não cobre. *(fonte: src/lib/offline/repository.ts:1610, inventário: tabelas)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador do julgamento (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 2 | `parecer_tecnico_id` | uuid |  |  | Parecer que fundamenta o julgamento (tabela sem uso). *(fonte: restricao:julgamentos.julgamentos_parecer_tecnico_id_fkey)* |  |
| 3 | `auto_id` | uuid |  |  | Auto julgado (tabela sem uso). A chave estrangeira não tem regra de exclusão, então não é possível<br>excluir um auto julgado. *(fonte: restricao:julgamentos.julgamentos_auto_id_fkey)* |  |
| 4 | `prestador_servico_id` | uuid |  |  | Entidade julgada (tabela sem uso). *(fonte: restricao:julgamentos.julgamentos_prestador_servico_id_fkey)* |  |
| 5 | `decisao` | text |  |  | Decisão do julgamento (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 6 | `valor_multa_final` | numeric(10,2) |  |  | Multa aplicada na decisão (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 7 | `justificativa_decisao` | text |  |  | Fundamentação da decisão (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 8 | `data_julgamento` | timestamp with time zone |  | `now()` | Quando foi julgado (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 9 | `status` | text |  | `'julgado'::text` | Situação do julgamento; padrão `julgado` (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 10 | `created_at` | timestamp with time zone |  | `now()` | Quando o registro foi criado (tabela sem uso). *(fonte: inventário: tabelas)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `julgamentos_auto_id_fkey` | chave_estrangeira | `FOREIGN KEY (auto_id) REFERENCES autos_infracao(id)` |
| `julgamentos_parecer_tecnico_id_fkey` | chave_estrangeira | `FOREIGN KEY (parecer_tecnico_id) REFERENCES pareceres_tecnicos(id)` |
| `julgamentos_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `julgamentos_prestador_servico_id_fkey` | chave_estrangeira | `FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico(id)` |

| Índice | Definição |
|---|---|
| `julgamentos_pkey` | `CREATE UNIQUE INDEX julgamentos_pkey ON public.julgamentos USING btree (id)` |

## Dependências

**Depende de:**

- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)
- [pareceres_tecnicos](../tabelas/pareceres_tecnicos.md) — referencia (catalogo)
- [prestadores_servico](../tabelas/prestadores_servico.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso total em julgamentos

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos teriam acesso total, sem olhar a câmara. *(fonte: funcao:get_my_role())*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))
```

</details>

### Prestadores: ler julgamentos de seus autos

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo leria os julgamentos dos autos da própria entidade. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = julgamentos.auto_id) AND (a.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### julgamentos_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Mesma leitura pelo prestador, também pela entidade do julgamento; redundante. *(fonte: funcao:current_prestador_servico_id())*
- **Funções auxiliares**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND ((prestador_servico_id = current_prestador_servico_id()) OR (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = julgamentos.auto_id) AND (a.prestador_servico_id = current_prestador_servico_id()))))))

WITH CHECK:
(nenhuma)
```

</details>

### julgamentos_staff_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Acesso total para admin, fiscal e coordenador ativos (`is_staff`). *(fonte: funcao:is_staff())*
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

- Divergência `politica:public.julgamentos.julgamentos_prestador_select`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.julgamentos.julgamentos_staff_all`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
