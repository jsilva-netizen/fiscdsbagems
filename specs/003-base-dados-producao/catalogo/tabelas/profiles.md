<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# profiles

- **Tipo**: tabela
- **Dono**: módulo **core**
- **Linhas em produção**: 7
- **RLS ativo**: sim

## Finalidade

Perfil de cada usuário do sistema, um para um com a conta de autenticação (`auth.users`): papel,
se foi aprovado (`ativo`), diretoria, câmara técnica e, para o papel prestador, a entidade regulada
que ele representa.

É a base de todas as regras de acesso: `get_my_role`, `current_role`, `get_my_camara_tecnica`,
`get_my_diretoria`, `get_my_prestador_id` e `current_prestador_servico_id` leem esta tabela, e as
políticas de quase todas as outras tabelas chamam essas funções.

Ciclo de vida: o gatilho de cadastro (`handle_new_user`) cria o perfil inativo com os dados
escolhidos na tela de cadastro; um admin aprova, ajusta papel e vínculos ou exclui na tela de
usuários. *(fonte: funcao:handle_new_user(), src/pages/Register.jsx:100, src/pages/GerenciarUsuarios.jsx:92, src/pages/GerenciarUsuarios.jsx:149, src/lib/AuthContext.jsx:128)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim |  | Identificador do usuário. É o mesmo id da conta em `auth.users` (chave estrangeira<br>`profiles_id_fkey`). As regras de acesso comparam `auth.uid()` com ele. *(fonte: restricao:profiles.profiles_id_fkey, funcao:get_my_role())* |  |
| 2 | `email` | text |  |  | E-mail da conta, copiado de `auth.users` pelo gatilho de cadastro. Não há gatilho que o atualize<br>se o e-mail da conta mudar depois.<br>Usado para excluir usuário por e-mail (`admin_delete_user_by_email`) e para registrar quem fez a<br>alteração na auditoria (`process_audit_log`) e em `fiscalizacoes.last_modified_by`<br>(`set_fiscalizacao_last_modified`). *(fonte: funcao:handle_new_user(), funcao:admin_delete_user_by_email(p_email text), funcao:process_audit_log(), funcao:set_fiscalizacao_last_modified())* |  |
| 3 | `full_name` | text |  |  | Nome completo informado no cadastro (metadado `full_name`; se vier vazio, o e-mail). Mostrado na<br>tela de usuários e copiado para `fiscalizacoes.fiscal_nome` quando o fiscal cria a fiscalização<br>(`set_fiscalizacao_cache_fields`). *(fonte: funcao:handle_new_user(), funcao:set_fiscalizacao_cache_fields(), src/pages/GerenciarUsuarios.jsx:341)* |  |
| 4 | `role` | text |  | `'user'::text` | Papel do usuário: `admin`, `coordenador`, `fiscal`, `diretor` ou `prestador`. Em produção há 2<br>admins, 4 fiscais e 1 prestador.<br>- **Origem:** o cadastro oferece fiscal, coordenador, diretor e prestador. Desde a migration 137,<br>qualquer outro valor pedido no cadastro vira `fiscal`, e `admin` só é atribuído por outro admin<br>na tela de usuários.<br>- **Validação:** o banco não restringe os valores da coluna, e o padrão da coluna em produção é<br>`'user'`, que nenhuma regra reconhece.<br>- **Uso:** o papel só vale nas regras de acesso quando o perfil está ativo (migration 137). A<br>interface usa o papel para montar menus e rotas: o prestador fica restrito ao portal. *(fonte: src/pages/Register.jsx:106, funcao:handle_new_user(), funcao:enforce_profile_security(), src/App.jsx:135, src/hooks/useModulo.js:86, supabase/migrations/137_fix_signup_privilege_escalation.sql)* |  |
| 5 | `ativo` | boolean |  | `true` | Se o usuário foi aprovado por um admin.<br>- **Valor inicial:** o cadastro sempre grava `false`, embora o padrão da coluna em produção seja<br>`true`.<br>- **Quem altera:** o admin ativa ou desativa na tela de usuários. Ninguém além de um admin ativo<br>altera este campo (`enforce_profile_security`).<br>- **Efeito no banco:** perfil inativo não tem papel nem vínculos nas regras de acesso e só lê o<br>próprio perfil (migrations 137 e 138).<br>- **Efeito na interface:** o login recusa perfil inativo com "Sua conta aguarda aprovação do<br>administrador", e a sessão de um usuário desativado é encerrada quando o app está online. *(fonte: funcao:handle_new_user(), src/pages/GerenciarUsuarios.jsx:149, src/lib/AuthContext.jsx:138, src/lib/AuthContext.jsx:303, supabase/migrations/137_fix_signup_privilege_escalation.sql)* |  |
| 6 | `created_at` | timestamp with time zone |  | `now()` | Quando o perfil foi criado (no cadastro). *(fonte: funcao:handle_new_user())* |  |
| 7 | `updated_at` | timestamp with time zone |  | `now()` | Momento da última atualização, mas só é gravado quando o gatilho de cadastro encontra um perfil<br>já existente com o mesmo id. `profiles` não tem gatilho de `updated_at`, então edições feitas<br>pela tela de usuários não mudam esta coluna. *(fonte: funcao:handle_new_user(), gatilho:public.profiles.trg_enforce_profile_security)* |  |
| 8 | `prestador_servico_id` | uuid |  |  | Entidade regulada (`prestadores_servico`) que um usuário de papel `prestador` representa. É o que<br>limita o prestador aos dados da própria entidade (`get_my_prestador_id`,<br>`current_prestador_servico_id`).<br>- **Restrições:** obrigatória para prestador e proibida para os demais papéis, mas as duas<br>restrições são `NOT VALID` e só valem para linhas novas ou alteradas. O índice único<br>`ux_profiles_prestador_servico_id` permite no máximo um usuário por entidade.<br>- **Origem:** o usuário escolhe a entidade no cadastro, e o admin confirma ou troca na aprovação.<br>A tela grava também o vínculo inverso em `prestadores_servico.user_id`, em passos separados e<br>sem transação.<br>- **Quem altera:** só um admin ativo (`enforce_profile_security`). *(fonte: restricao:profiles.profiles_prestador_must_have_prestador_id, restricao:profiles.profiles_non_prestador_must_not_have_prestador_id, indice:ux_profiles_prestador_servico_id, src/pages/GerenciarUsuarios.jsx:149, src/pages/GerenciarUsuarios.jsx:199)* |  |
| 9 | `diretoria_id` | text |  | `'dsb'::text` | Diretoria do usuário (`dsb`, `dtr` ou `dge`; padrão `dsb`). A interface usa a diretoria para<br>escolher os módulos e dashboards que o usuário vê. Nenhuma política do banco a usa:<br>`get_my_diretoria` existe, mas nenhuma política a chama. Só um admin ativo altera<br>(`enforce_profile_security`). *(fonte: src/hooks/useModulo.js:87, funcao:get_my_diretoria(), funcao:enforce_profile_security())* |  |
| 10 | `camara_tecnica_id` | text |  |  | Câmara técnica do usuário. Limita o que fiscal e coordenador veem por câmara<br>(`can_access_camara`): sem câmara, veem todas; com câmara, veem a sua e os registros sem câmara.<br>Também define quem é usuário do CATERS (`is_caters_user`) e a câmara que a interface abre.<br>Escolhida no cadastro por fiscal e coordenador; só um admin ativo altera<br>(`enforce_profile_security`). *(fonte: funcao:can_access_camara(row_camara text), funcao:is_caters_user(), src/hooks/useModulo.js:88, src/pages/Register.jsx:108)* |  |

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
| `trg_enforce_profile_security` | ativo | [enforce_profile_security()](../funcoes/enforce_profile_security.md) | Antes de inserir ou alterar um perfil, impede que quem não é admin ativo se dê privilégios.<br>- **Na inserção:** papel diferente de fiscal, diretor ou prestador vira `fiscal`, e o perfil fica<br>inativo.<br>- **Na alteração:** papel, `ativo`, prestador, diretoria e câmara voltam ao valor anterior.<br>- **Sem usuário logado** (gatilho de cadastro, chave de serviço), não interfere.<br>Comportamento desde a migration 137. Antes, o papel de quem executava era lido mesmo com o perfil<br>inativo. *(fonte: funcao:enforce_profile_security(), supabase/migrations/137_fix_signup_privilege_escalation.sql)* |

<details><summary>Definição de trg_enforce_profile_security</summary>

```sql
CREATE TRIGGER trg_enforce_profile_security BEFORE INSERT OR UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION enforce_profile_security()
```

</details>

## Políticas de acesso

### Admins can delete profiles

- **Papéis**: authenticated · **Operação**: DELETE · **PERMISSIVE**
- **Em linguagem simples**: Admin ativo exclui qualquer perfil. Desde a migration 137, só para logados e via `get_my_role()`;
antes, lia o papel direto da tabela, sem olhar `ativo`, e valia também para o papel `public`. *(fonte: supabase/migrations/137_fix_signup_privilege_escalation.sql)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = 'admin'::text)

WITH CHECK:
(nenhuma)
```

</details>

### Admins can update any profile

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: Admin ativo altera qualquer perfil. Mesma mudança da migration 137 que a política de exclusão. É
redundante com `profiles_admin_all` e `Admins e coordenadores gerenciam perfis`. *(fonte: supabase/migrations/137_fix_signup_privilege_escalation.sql)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = 'admin'::text)

WITH CHECK:
(get_my_role() = 'admin'::text)
```

</details>

### Admins e coordenadores gerenciam perfis

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin e coordenador ativos leem, criam, alteram e excluem qualquer perfil. O gatilho
`trg_enforce_profile_security` impede o coordenador de mudar papel, aprovação e vínculos. Ainda
assim, ele pode excluir perfis e alterar nome e e-mail de qualquer usuário, e a tela de usuários
não oferece isso a ele. *(fonte: funcao:get_my_role(), gatilho:public.profiles.trg_enforce_profile_security)*
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
- **Em linguagem simples**: O usuário altera o próprio perfil. Não tem `WITH CHECK` e vale para o papel `public`, mas
anônimo não tem `auth.uid()`, então na prática só vale para logados. O gatilho impede a troca de
papel, aprovação e vínculos. Redundante com `profiles_self_update` e `Usuários comuns atualizam
apenas dados de contato próprios`. *(fonte: gatilho:public.profiles.trg_enforce_profile_security)*

<details><summary>Condição original</summary>

```sql
USING:
(auth.uid() = id)

WITH CHECK:
(nenhuma)
```

</details>

### Inserção Própria

- **Papéis**: public · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: O usuário logado insere um perfil com o próprio id. É o caminho de reserva caso o perfil não
exista; o gatilho força papel permitido e inativo. Na prática não é usado: o perfil é criado pelo
gatilho de cadastro na mesma transação da conta. *(fonte: gatilho:public.profiles.trg_enforce_profile_security, funcao:handle_new_user())*

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
(auth.uid() = id)
```

</details>

### Leitura pública de perfis

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Em produção, qualquer logado lê todos os perfis (`USING (true)`), inclusive contas ainda não
aprovadas. A migration 137 muda para: logado lê o próprio perfil, e quem tem perfil ativo lê
todos (lista de usuários, nomes de fiscais). Essa parte da 137 não chegou a produção (inventário
de 2026-09-29; ver a divergência). A tela de usuários precisa da leitura de todos. *(fonte: supabase/migrations/137_fix_signup_privilege_escalation.sql:198, src/pages/GerenciarUsuarios.jsx:27, inventário: politicas)*

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
- **Em linguagem simples**: O usuário altera o próprio perfil. O nome promete "apenas dados de contato", mas quem limita os
campos é o gatilho, não a política. Redundante com `Edição Própria` e `profiles_self_update`. *(fonte: gatilho:public.profiles.trg_enforce_profile_security)*

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
- **Em linguagem simples**: Admin ativo lê, cria, altera e exclui qualquer perfil (via `current_role()`). *(fonte: funcao:current_role())*

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
- **Em linguagem simples**: O usuário lê o próprio perfil. Contida em `Leitura pública de perfis`. *(fonte: src/lib/AuthContext.jsx:128)*

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
- **Em linguagem simples**: O usuário altera o próprio perfil, sem poder trocar de dono. Terceira política com o mesmo
efeito; os campos protegidos são limitados pelo gatilho. *(fonte: gatilho:public.profiles.trg_enforce_profile_security)*

<details><summary>Condição original</summary>

```sql
USING:
(id = auth.uid())

WITH CHECK:
(id = auth.uid())
```

</details>

## Divergências e achados

- Divergência `coluna:profiles.ativo`: **estrutura_diferente**, classificação **defeito_corrigir** ([detalhes](../../divergencias.md)).
- Divergência `coluna:profiles.role`: **estrutura_diferente**, classificação **defeito_corrigir** ([detalhes](../../divergencias.md)).
- Divergência `indice:ux_profiles_prestador_servico_id`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.profiles.Edição Própria`: **so_producao**, classificação **residuo_descartar** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.profiles.Inserção Própria`: **so_producao**, classificação **residuo_descartar** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.profiles.Leitura pública de perfis`: **estrutura_diferente**, classificação **defeito_corrigir** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.profiles.profiles_admin_all`: **so_producao**, classificação **residuo_descartar** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.profiles.profiles_self_select`: **so_producao**, classificação **residuo_descartar** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.profiles.profiles_self_update`: **so_producao**, classificação **residuo_descartar** ([detalhes](../../divergencias.md)).
- Divergência `restricao:profiles.profiles_non_prestador_must_not_have_prestador_id`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `restricao:profiles.profiles_prestador_must_have_prestador_id`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Achado **A-003** — Políticas e índices duplicados, e 2 políticas com nome corrompido (situação: decidido; [detalhes](../../achados.md#a-003)).
- Achado **A-012** — Leitura de todos os perfis por conta não aprovada (parte da 137 não aplicada) (situação: decidido; [detalhes](../../achados.md#a-012)).
- Achado **A-022** — Coordenador exclui perfis e altera nome e e-mail de qualquer usuário pela API (situação: decidido; [detalhes](../../achados.md#a-022)).
- Achado **A-023** — Vínculo do prestador gravado nos dois lados, sem transação (situação: decidido; [detalhes](../../achados.md#a-023)).
- Achado **A-037** — Chaves estrangeiras ausentes e padrões inseguros em produção (situação: decidido; [detalhes](../../achados.md#a-037)).
- Achado **A-038** — Confirmação de e-mail na aprovação existe só nas migrations (situação: decidido; [detalhes](../../achados.md#a-038)).
