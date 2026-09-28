<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# profiles

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 7
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim |  |  |  |
| 2 | `email` | text |  |  |  |  |
| 3 | `full_name` | text |  |  |  |  |
| 4 | `role` | text |  | `'user'::text` |  |  |
| 5 | `ativo` | boolean |  | `true` |  |  |
| 6 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 7 | `updated_at` | timestamp with time zone |  | `now()` |  |  |
| 8 | `prestador_servico_id` | uuid |  |  |  |  |
| 9 | `diretoria_id` | text |  | `'dsb'::text` |  |  |
| 10 | `camara_tecnica_id` | text |  |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `profiles_camara_tecnica_id_fkey` | chave_estrangeira | `FOREIGN KEY (camara_tecnica_id) REFERENCES camaras_tecnicas(id)` |
| `profiles_diretoria_id_fkey` | chave_estrangeira | `FOREIGN KEY (diretoria_id) REFERENCES diretorias(id)` |
| `profiles_id_fkey` | chave_estrangeira | `FOREIGN KEY (id) REFERENCES auth.users(id)` |
| `profiles_non_prestador_must_not_have_prestador_id` | verificacao | `CHECK (role = 'prestador'::text OR prestador_servico_id IS NULL) NOT VALID` |
| `profiles_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `profiles_prestador_must_have_prestador_id` | verificacao | `CHECK (role <> 'prestador'::text OR prestador_servico_id IS NOT NULL) NOT VALID` |
| `profiles_prestador_servico_id_fkey` | chave_estrangeira | `FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico(id)` |

| Índice | Definição |
|---|---|
| `profiles_pkey` | `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)` |
| `ux_profiles_prestador_servico_id` | `CREATE UNIQUE INDEX ux_profiles_prestador_servico_id ON public.profiles USING btree (prestador_servico_id) WHERE (prestador_servico_id IS NOT NULL)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)
- [camaras_tecnicas](../tabelas/camaras_tecnicas.md) — referencia (catalogo)
- [diretorias](../tabelas/diretorias.md) — referencia (catalogo)
- [prestadores_servico](../tabelas/prestadores_servico.md) — referencia (catalogo)

**É usada por:**

- [admin_delete_user(p_user_id uuid)](../funcoes/admin_delete_user.md) — escreve (codigo)
- [admin_delete_user(p_user_id uuid)](../funcoes/admin_delete_user.md) — le (codigo)
- [admin_delete_user_by_email(p_email text)](../funcoes/admin_delete_user_by_email.md) — escreve (codigo)
- [admin_delete_user_by_email(p_email text)](../funcoes/admin_delete_user_by_email.md) — le (codigo)
- [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md) — le (codigo)
- [current_role()](../funcoes/current_role.md) — le (codigo)
- [enforce_profile_security()](../funcoes/enforce_profile_security.md) — le (codigo)
- [get_my_camara_tecnica()](../funcoes/get_my_camara_tecnica.md) — le (codigo)
- [get_my_diretoria()](../funcoes/get_my_diretoria.md) — le (codigo)
- [get_my_prestador_id()](../funcoes/get_my_prestador_id.md) — le (codigo)
- [get_my_role()](../funcoes/get_my_role.md) — le (codigo)
- [handle_new_user()](../funcoes/handle_new_user.md) — escreve (codigo)
- [process_audit_log()](../funcoes/process_audit_log.md) — le (codigo)
- [set_fiscalizacao_cache_fields()](../funcoes/set_fiscalizacao_cache_fields.md) — le (codigo)
- [set_fiscalizacao_last_modified()](../funcoes/set_fiscalizacao_last_modified.md) — le (codigo)
- [relatorios_jobs](../tabelas/relatorios_jobs.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_enforce_profile_security` | ativo | [enforce_profile_security()](../funcoes/enforce_profile_security.md) | _Sem anotação._ |

<details><summary>Definição de trg_enforce_profile_security</summary>

```sql
CREATE TRIGGER trg_enforce_profile_security BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION enforce_profile_security()
```

</details>

## Políticas de acesso

### Admins can delete profiles

- **Papéis**: public · **Operação**: DELETE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
(EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::text))))

WITH CHECK:
(nenhuma)
```

</details>

### Admins can update any profile

- **Papéis**: public · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
(( SELECT profiles_1.role
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid())) = 'admin'::text)

WITH CHECK:
(( SELECT profiles_1.role
   FROM profiles profiles_1
  WHERE (profiles_1.id = auth.uid())) = 'admin'::text)
```

</details>

### Admins e coordenadores gerenciam perfis

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text]))

WITH CHECK:
(nenhuma)
```

</details>

### Edição Própria

- **Papéis**: public · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
(auth.uid() = id)

WITH CHECK:
(nenhuma)
```

</details>

### Enable insert for authenticated users and during sign up

- **Papéis**: public · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
true
```

</details>

### Inserção Própria

- **Papéis**: public · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
(auth.uid() = id)
```

</details>

### Leitura Geral

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

### Leitura pública de perfis

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

### Usuários comuns atualizam apenas dados de contato próprios

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
(auth.uid() = id)

WITH CHECK:
(auth.uid() = id)
```

</details>

### profiles_admin_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
("current_role"() = 'admin'::text)

WITH CHECK:
("current_role"() = 'admin'::text)
```

</details>

### profiles_self_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
(id = auth.uid())

WITH CHECK:
(nenhuma)
```

</details>

### profiles_self_update

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
(id = auth.uid())

WITH CHECK:
(id = auth.uid())
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
