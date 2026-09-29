<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# prestadores_servico

- **Tipo**: tabela
- **Dono**: módulo **core**
- **Linhas em produção**: 9
- **RLS ativo**: sim

## Finalidade

Entidades reguladas pela AGEMS: concessionárias e órgãos ou entidades públicas que prestam os
serviços fiscalizados. Produção tem 9: 3 concessionárias e 6 órgãos públicos, todas de MS.

São o alvo das fiscalizações e dos processos: termos de notificação, respostas a determinações,
autos de infração, julgamentos e remessas apontam para cá. O usuário de papel prestador
representa uma delas no portal do prestador.

- **Manutenção:** telas Prestadores de Serviço e Detalhe do Prestador. Criar, editar e excluir
  entra na fila offline e sincroniza depois.
- **Uso por diretoria:** a lista é filtrada pelos serviços prestados (`tipo_servico`). *(fonte: src/pages/PrestadoresServico.jsx:142, src/pages/DetalhePrestador.jsx:174, src/lib/offline/repository.ts:189, src/lib/offline/syncEngine.ts:188, inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da entidade, gerado no aparelho quando ela é criada offline. É referenciado por<br>perfis de prestador, contratos, termos de notificação, respostas a determinações, autos de<br>infração, julgamentos e remessas. *(fonte: src/lib/offline/repository.ts:210, restricao:profiles.profiles_prestador_servico_id_fkey)* |  |
| 2 | `nome` | text | sim |  | Nome de exibição da entidade, obrigatório. Usado em listas, filtros, relatórios e na lista do<br>cadastro de usuário prestador. *(fonte: src/pages/DetalhePrestador.jsx:174, src/pages/Register.jsx:43)* |  |
| 3 | `ativo` | boolean |  | `true` | Se a entidade está ativa. Só as ativas aparecem no cadastro de usuário prestador<br>(`prestadores_para_cadastro`). O app não envia este campo na sincronização, então na prática fica<br>sempre no padrão `true` (todas as 9 estão ativas). Duplica o sentido de `status`. *(fonte: src/pages/Register.jsx:43, src/lib/offline/syncEngine.ts:188, inventário: dominio_categorico)* | `true` (9) |
| 4 | `created_at` | timestamp with time zone |  | `now()` | Quando a entidade foi cadastrada (gravado pelo aparelho que a criou). *(fonte: src/lib/offline/repository.ts:210)* |  |
| 5 | `razao_social` | text |  |  | Razão social; obrigatória na edição. *(fonte: src/pages/DetalhePrestador.jsx:174)* |  |
| 6 | `email_contato` | text |  |  | E-mail de contato da entidade, mostrado no detalhe do prestador. *(fonte: src/pages/DetalhePrestador.jsx:264)* |  |
| 7 | `cnpj` | text |  |  | CNPJ da entidade; obrigatório na edição. *(fonte: src/pages/DetalhePrestador.jsx:174)* |  |
| 8 | `responsavel` | text |  |  | Nome da pessoa responsável pela entidade (dado pessoal), mostrado com o cargo no detalhe do<br>prestador. *(fonte: src/pages/DetalhePrestador.jsx:405)* |  |
| 9 | `cargo` | text |  |  | Cargo do responsável. *(fonte: src/pages/DetalhePrestador.jsx:406)* |  |
| 10 | `tipo` | text |  |  | Classificação da entidade: `titular` (1), `prestador_servico` (3) ou vazio (5). Nenhuma tela lê<br>nem grava este campo, só a sincronização o transporta. Provavelmente distinguia o titular do<br>serviço (município) de quem o presta, papel hoje coberto por `tipo_entidade`. ⚠️ *hipótese* | `(nulo)` (5), `prestador_servico` (3), `titular` (1) |
| 11 | `documentos` | jsonb |  | `'[]'::jsonb` | Lista de documentos anexados à entidade. Cada item tem `nome`, `tipo`, `url`<br>(`storage://documentos-prestadores/<entidade>/<data>.<ext>`), `bucket`, `path` e `data_upload`.<br>Anexar envia o arquivo ao bucket `documentos-prestadores` e regrava a lista inteira. Excluir apaga<br>o arquivo e regrava a lista. *(fonte: src/pages/DetalhePrestador.jsx:180, src/pages/DetalhePrestador.jsx:205)* | JSON — formas: array (9) |
| 12 | `endereco` | text |  |  | Endereço da entidade. *(fonte: src/pages/DetalhePrestador.jsx:390)* |  |
| 13 | `cidade` | text |  |  | Cidade do endereço da entidade. *(fonte: src/pages/DetalhePrestador.jsx:390)* |  |
| 14 | `telefone` | text |  |  | Telefone de contato da entidade. *(fonte: src/pages/DetalhePrestador.jsx:269)* |  |
| 15 | `user_id` | uuid |  |  | Conta (`auth.users`) do usuário prestador que representa a entidade. É o vínculo inverso de<br>`profiles.prestador_servico_id`, com índice único que permite no máximo uma conta por entidade.<br>- **Quem grava:** a tela de usuários, na aprovação ou no vínculo, em passos separados da gravação<br>do perfil e sem transação, então os dois lados podem ficar diferentes.<br>- **Quem usa:** a política `prestadores_prestador_select_own`.<br>- **Sincronização:** o app não envia este campo. *(fonte: src/pages/GerenciarUsuarios.jsx:149, src/pages/GerenciarUsuarios.jsx:199, indice:ux_prestadores_user_id, politica:public.prestadores_servico.prestadores_prestador_select_own)* |  |
| 16 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração. Gravada pelo aparelho que edita e pelo gatilho<br>`update_prestadores_updated_at`. A sincronização incremental usa esta coluna para baixar só o que<br>mudou. *(fonte: src/lib/offline/repository.ts:215, gatilho:public.prestadores_servico.update_prestadores_updated_at)* |  |
| 17 | `tipo_entidade` | text | sim | `'Concessionária'::text` | Natureza da entidade: `Concessionária` (padrão, 3 em produção) ou `Órgão ou Entidade Pública`<br>(6). Escolhida no cadastro e na edição da entidade. *(fonte: src/pages/DetalhePrestador.jsx:493, inventário: dominio_categorico)* | `Órgão ou Entidade Pública` (6), `Concessionária` (3) |
| 18 | `tipo_servico` | text[] |  | `'{}'::text[]` | Serviços que a entidade presta (lista). Define em que diretoria ela aparece:<br>- **DSB:** Abastecimento de Água, Esgotamento Sanitário, Limpeza Urbana, Manejo de Resíduos<br>Sólidos e Drenagem Urbana;<br>- **DTR:** Rodovias;<br>- **DGE:** Energia Elétrica, Gás Canalizado e Iluminação Pública. *(fonte: src/lib/offline/repository.ts:173, src/pages/DetalhePrestador.jsx:167)* | `{"Limpeza Urbana","Drenagem Urbana","Manejo de Resíduos Sólidos"}` (5), `{Rodovias}` (2), `{"Abastecimento de Água","Esgotamento Sanitário"}` (1), `{"Limpeza Urbana","Manejo de Resíduos Sólidos","Drenagem Urbana"}` (1) |
| 19 | `logo_url` | text |  |  | Logo da entidade, usado no detalhe, na lista de contratos e nos relatórios. Normalmente é o<br>endereço público do arquivo no bucket `logos-entidades`.<br>Se o envio do arquivo falha, a tela mantém a imagem em base64 (`data:`) e a grava nesta coluna. *(fonte: src/pages/DetalhePrestador.jsx:147, src/pages/DetalhePrestador.jsx:155, src/pages/Contratos.jsx:115)* |  |
| 20 | `status` | text | sim | `'ativa'::text` | Situação da entidade; o padrão e o único valor em produção é `ativa`. As telas só usam o campo<br>para colorir o selo. Duplica o sentido de `ativo`. *(fonte: src/pages/DetalhePrestador.jsx:228, src/pages/PrestadoresServico.jsx:373, inventário: dominio_categorico)* | `ativa` (9) |
| 21 | `website` | text |  |  | Site da entidade, mostrado como link (acrescenta `https://` se faltar). *(fonte: src/pages/DetalhePrestador.jsx:384)* | (5), `https://way112.com.br/` (1), `https://way306.com.br/` (1), `https://www.miranda.ms.gov.br/` (1), `https://www.sidrolandia.ms.gov.br/` (1) |
| 22 | `estado` | text |  | `'MS'::text` | UF do endereço; padrão `MS`, único valor em produção. *(fonte: src/pages/DetalhePrestador.jsx:390, inventário: dominio_categorico)* | `MS` (9) |
| 23 | `cep` | text |  | `'79000-000'::text` | CEP do endereço; padrão `79000-000`. *(fonte: src/pages/DetalhePrestador.jsx:390)* |  |
| 24 | `observacoes` | text |  |  | Observações livres sobre a entidade. *(fonte: src/pages/DetalhePrestador.jsx:418)* |  |

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

- [prestadores_para_cadastro()](../funcoes/prestadores_para_cadastro.md) — le (codigo)
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
| `update_prestadores_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:update_updated_at_column())* |

<details><summary>Definição de update_prestadores_updated_at</summary>

```sql
CREATE TRIGGER update_prestadores_updated_at BEFORE UPDATE ON prestadores_servico FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

</details>

## Políticas de acesso

### Leitura pública de prestadores

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Quem tem perfil ativo lê todas as entidades. Desde a migration 138; antes, qualquer logado lia,
inclusive conta não aprovada. *(fonte: supabase/migrations/138_fix_open_policies.sql)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)

WITH CHECK:
(nenhuma)
```

</details>

### Operadores gerenciam prestadores

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos leem, criam, alteram e excluem entidades. *(fonte: funcao:get_my_role(), src/pages/PrestadoresServico.jsx:142)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(nenhuma)
```

</details>

### prestadores_prestador_select_own

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O usuário prestador ativo lê a própria entidade, identificada pelo vínculo do perfil ou por
`user_id`. Hoje está contida em `Leitura pública de prestadores`, que deixa o prestador ler
todas. *(fonte: funcao:current_prestador_servico_id(), src/pages/PortalPrestadorHome.jsx:52)*
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
- **Em linguagem simples**: Admin, fiscal e coordenador ativos (`is_staff()`) têm acesso total. Redundante com `Operadores
gerenciam prestadores`. *(fonte: funcao:is_staff())*
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

- Divergência `coluna:prestadores_servico.user_id`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `indice:ux_prestadores_user_id`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.prestadores_servico.prestadores_prestador_select_own`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.prestadores_servico.prestadores_staff_all`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `restricao:prestadores_servico.prestadores_servico_user_id_fkey`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
