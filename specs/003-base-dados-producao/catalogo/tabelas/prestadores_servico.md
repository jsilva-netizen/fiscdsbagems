<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# prestadores_servico

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 9
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `nome` | text | sim |  |  |  |
| 3 | `ativo` | boolean |  | `true` |  | `true` (9) |
| 4 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 5 | `razao_social` | text |  |  |  |  |
| 6 | `email_contato` | text |  |  |  |  |
| 7 | `cnpj` | text |  |  |  |  |
| 8 | `responsavel` | text |  |  |  |  |
| 9 | `cargo` | text |  |  |  |  |
| 10 | `tipo` | text |  |  |  | `(nulo)` (5), `prestador_servico` (3), `titular` (1) |
| 11 | `documentos` | jsonb |  | `'[]'::jsonb` |  | JSON — formas: array (9) |
| 12 | `endereco` | text |  |  |  |  |
| 13 | `cidade` | text |  |  |  |  |
| 14 | `telefone` | text |  |  |  |  |
| 15 | `user_id` | uuid |  |  |  |  |
| 16 | `updated_at` | timestamp with time zone |  | `now()` |  |  |
| 17 | `tipo_entidade` | text | sim | `'Concessionária'::text` |  | `Órgão ou Entidade Pública` (6), `Concessionária` (3) |
| 18 | `tipo_servico` | text[] |  | `'{}'::text[]` |  | `{"Limpeza Urbana","Drenagem Urbana","Manejo de Resíduos Sólidos"}` (5), `{Rodovias}` (2), `{"Abastecimento de Água","Esgotamento Sanitário"}` (1), `{"Limpeza Urbana","Manejo de Resíduos Sólidos","Drenagem Urbana"}` (1) |
| 19 | `logo_url` | text |  |  |  |  |
| 20 | `status` | text | sim | `'ativa'::text` |  | `ativa` (9) |
| 21 | `website` | text |  |  |  | (5), `https://way112.com.br/` (1), `https://way306.com.br/` (1), `https://www.miranda.ms.gov.br/` (1), `https://www.sidrolandia.ms.gov.br/` (1) |
| 22 | `estado` | text |  | `'MS'::text` |  | `MS` (9) |
| 23 | `cep` | text |  | `'79000-000'::text` |  |  |
| 24 | `observacoes` | text |  |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `prestadores_servico_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `prestadores_servico_user_id_fkey` | chave_estrangeira | `FOREIGN KEY (user_id) REFERENCES auth.users(id)` |

| Índice | Definição |
|---|---|
| `prestadores_servico_pkey` | `CREATE UNIQUE INDEX prestadores_servico_pkey ON public.prestadores_servico USING btree (id)` |
| `ux_prestadores_user_id` | `CREATE UNIQUE INDEX ux_prestadores_user_id ON public.prestadores_servico USING btree (user_id) WHERE (user_id IS NOT NULL)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)

**É usada por:**

- [set_fiscalizacao_cache_fields()](../funcoes/set_fiscalizacao_cache_fields.md) — le (codigo)
- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)
- [contratos](../tabelas/contratos.md) — referencia (catalogo)
- [julgamentos](../tabelas/julgamentos.md) — referencia (catalogo)
- [profiles](../tabelas/profiles.md) — referencia (catalogo)
- [remessas_ai](../tabelas/remessas_ai.md) — referencia (catalogo)
- [respostas_determinacao](../tabelas/respostas_determinacao.md) — referencia (catalogo)
- [termos_notificacao](../tabelas/termos_notificacao.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `update_prestadores_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | _Sem anotação._ |

<details><summary>Definição de update_prestadores_updated_at</summary>

```sql
CREATE TRIGGER update_prestadores_updated_at BEFORE UPDATE ON prestadores_servico FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

</details>

## Políticas de acesso

### Leitura pública de prestadores

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

### Operadores gerenciam prestadores

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(nenhuma)
```

</details>

### Prestadores visíveis para todos

- **Papéis**: public · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

### prestadores_prestador_select_own

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND ((id = current_prestador_servico_id()) OR (user_id = auth.uid())))

WITH CHECK:
(nenhuma)
```

</details>

### prestadores_staff_all

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
