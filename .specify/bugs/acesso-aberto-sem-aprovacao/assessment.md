# Bug Assessment: Escrita anônima e acesso de contas não aprovadas

- **Slug**: acesso-aberto-sem-aprovacao
- **Created**: 2026-09-29
- **Source**: pasted text (achado durante a anotação do core na spec 003, depois da correção
  `escalada-privilegio-cadastro`)
- **Verdict**: valid
- **Severity**: critical

## Report (verbatim or summarized)

Varredura das 173 políticas de produção (inventário de 2026-09-28,
`.specify/assessments/novo-sistema-django-apps/inventario-producao*.csv`) procurando políticas
cuja condição não depende de papel nem de usuário:

1. **Escrita anônima.** `itens_checklist` (768 linhas) e `tipos_unidade` (33) têm a política
   `Public Access` (ALL, papel `public`, `USING true`, `WITH CHECK true`). O papel `anon` tem todos
   os privilégios de tabela nelas e não há política restritiva. Basta a chave pública do app, que
   está no bundle do frontend.
2. **Escrita por qualquer logado.** Com o cadastro público, "logado" inclui contas recém-criadas e
   não aprovadas. Isso vale para:
   - `contratos`, `remessas_ai` e `remessas_ai_itens`: políticas `Acesso total autenticado (DEV)`;
   - `tipos_ocorrencia_dtr`: `Escrita admin tipos_ocorrencia_dtr`, com `USING true`;
   - `caters_deadline_extensions`: `authenticated users can manage deadline extensions`;
   - 7 buckets de arquivos: incluir, sobrescrever e apagar.
3. **Leitura por qualquer logado.** Todos os arquivos dos 7 buckets privados:
   - fotos de fiscalização;
   - relatórios;
   - documentos de autos e de termos;
   - evidências;
   - documentos de prestadores;
   - KML.

   Também as tabelas acima.
4. **Leitura anônima de `prestadores_servico`.** A política `Prestadores visíveis para todos`
   (SELECT, `public`, `true`) expõe nome do responsável, telefone, e-mail de contato, CNPJ e
   endereço.

## Symptom

Sem login, qualquer pessoa altera ou apaga itens de checklist e tipos de unidade. Apagar um tipo
apaga em cascata os itens dele, exceto os que já têm respostas. O texto alterado de um item sai
nos relatórios, e essas tabelas não são auditadas.

Uma conta recém-cadastrada e não aprovada lê e apaga os arquivos de fiscalização e dos processos,
e altera contratos (inclusive o traçado KM usado em campo), tipos de ocorrência da DTR e remessas.

O esperado: sem login, nenhuma escrita e nenhum dado de contato; sem aprovação, nenhum acesso a
dados ou arquivos.

## Reproduction

Confirmado no Supabase local, com as políticas de produção de `itens_checklist` e `tipos_unidade`
recriadas numa transação com `ROLLBACK`, como `anon` e sem `request.jwt.claims`:

1. `SELECT count(*) FROM itens_checklist` → todas as linhas.
2. `UPDATE itens_checklist SET pergunta = pergunta` → todas as linhas alteradas.
3. `DELETE FROM tipos_unidade WHERE <sem unidade vinculada>` → linhas apagadas, com os itens em
   cascata (`itens_checklist.tipo_unidade_id ... ON DELETE CASCADE`).

Não reproduzido em produção, nem deve ser.

Os itens 2 a 4 do relato decorrem direto das condições `true` e `bucket_id = ...`, sem papel.
A reprodução automatizada entra no teste da correção.

[NEEDS CLARIFICATION: o cadastro público está ligado em produção? Os itens 2 e 3 dependem disso;
o item 1 não.]

## Suspected Code Paths

Políticas de produção (inventário). Chaves no formato do catálogo da spec 003:

- `politica:public.itens_checklist.Public Access` e `politica:public.tipos_unidade.Public Access`
  — escrita anônima. Já existem `Operadores gerenciam itens de checklist` e `Operadores gerenciam
  tipos de unidade` (admin, coordenador e fiscal), que cobrem as telas `src/pages/Checklists.jsx`
  e `src/pages/TiposUnidade.jsx`.
- `politica:public.prestadores_servico.Prestadores visíveis para todos` — leitura anônima. Única
  dependência legítima: a lista de prestadores do cadastro,
  [src/pages/Register.jsx:43-52](src/pages/Register.jsx#L43-L52), que lê `id, nome` sem login.
- `Leitura pública de ...` em `itens_checklist`, `tipos_unidade` e `prestadores_servico`, e
  `Leitura autenticada tipos_ocorrencia_dtr` — leitura por qualquer logado.
- `Acesso total autenticado (DEV)` em `contratos`, `remessas_ai` e `remessas_ai_itens`, `Escrita
  admin tipos_ocorrencia_dtr` e `authenticated users can manage deadline extensions`.
  - O prestador altera `remessas_ai` pelo portal
    ([src/pages/PortalPrestadorHome.jsx:583](src/pages/PortalPrestadorHome.jsx#L583), `704`,
    `737`), e a única política própria dele em `remessas_ai` é SELECT. Hoje ele depende da
    política "(DEV)" para gravar.
- 32 políticas de `storage.objects` para `authenticated` com condição só `bucket_id = ...`, entre
  elas `Storage read authenticated`, `documentos-autos authenticated all ...`,
  `relatorios_fiscalizacao authenticated all ...`, `p_evid_write` e `kml_rodovias_authenticated_*`.
  O prestador lê e envia arquivos pelo portal
  ([src/pages/ResponderTermo.jsx:668](src/pages/ResponderTermo.jsx#L668),
  [src/pages/PortalPrestadorHome.jsx:571](src/pages/PortalPrestadorHome.jsx#L571)).
- Rotas: [src/App.jsx](src/App.jsx) só restringe o papel prestador (portal e resposta a termo).
  As demais telas abrem para qualquer usuário ativo.

## Root Cause Hypothesis

Políticas criadas para desenvolvimento ("DEV", "Public Access") ou com condição `true` ficaram em
produção ao lado das políticas por papel. Como políticas permissivas se somam, a mais aberta
vale. A correção anterior (migration 137) fez o papel exigir perfil ativo, mas estas políticas não
olham papel nenhum. Confiança: **alta** (definições de produção e reprodução local do item 1).

## Proposed Remediation

**Preferred**: migration 138, idempotente, partindo das definições de produção. A regra é
"perfil ativo" no lugar de "qualquer um", o que mantém tudo o que usuários ativos fazem hoje,
inclusive o prestador.

1. **Escrita anônima:** remover `Public Access` de `itens_checklist` e `tipos_unidade`. A escrita
   fica com `Operadores gerenciam ...`, que já existe.
2. **Leitura anônima de prestadores:** remover `Prestadores visíveis para todos`. Criar a função
   `prestadores_para_cadastro()`, SECURITY DEFINER, que devolve só `id, nome` dos prestadores
   ativos e é executável por `anon`. `Register.jsx` passa a chamá-la. Se a função ainda não
   existir, a tela cai na leitura antiga, para que a ordem entre publicar o app e aplicar a
   migration não importe.
3. **Leitura e escrita por qualquer logado** passam a exigir perfil ativo,
   `(SELECT public.get_my_role()) IS NOT NULL`:
   - leitura: `Leitura pública de itens de checklist`, `Leitura pública de tipos de unidade`,
     `Leitura pública de prestadores` e `Leitura autenticada tipos_ocorrencia_dtr`;
   - `Acesso total autenticado (DEV)` em `contratos`, `remessas_ai` e `remessas_ai_itens`;
   - `Escrita admin tipos_ocorrencia_dtr` e `authenticated users can manage deadline extensions`.
4. **Arquivos:** as 32 políticas de `storage.objects` para `authenticated` passam a exigir perfil
   ativo além do `bucket_id`. A leitura pública de `logos-entidades` (bucket público, logos nos
   relatórios) não muda.

**Alternatives**:
- **Restringir por papel além de "ativo".** Seria restringir `contratos` e `tipos_ocorrencia_dtr`
  a quem não é prestador, e limitar o prestador às próprias remessas e aos próprios arquivos. É
  mais seguro, mas muda o que usuários ativos fazem hoje e exige política nova de escrita do
  prestador em `remessas_ai`. Fica como achado da spec 003, para o sistema novo.
- **Só os itens 1 e 2.** Fecha o acesso anônimo, que é o mais urgente e independe do cadastro,
  mas deixa arquivos e tabelas abertos a contas não aprovadas.

**Files likely to change** (na `main`):
- `supabase/migrations/138_fix_open_policies.sql` (nova)
- `src/pages/Register.jsx` (lista de prestadores via função)
- `supabase/tests/acesso_aberto_sem_aprovacao.sql` (novo)
- `supabase/tests/fixtures/estado_producao_20260928.sql` (acrescentar as políticas dessas 8
  tabelas e de `storage.objects`)

**Tests to add or update**:
- **Anônimo:**
  - não lê nem altera `itens_checklist` e `tipos_unidade`;
  - não lê `prestadores_servico`;
  - `prestadores_para_cadastro()` devolve só `id` e `nome` dos ativos.
- **Conta não aprovada:**
  - não lê nem escreve em nenhuma das 8 tabelas;
  - não lê, não envia e não apaga arquivos dos 7 buckets.
- **Fiscal ativo:**
  - lê e edita checklists, tipos de unidade, contratos e tipos de ocorrência;
  - lê e envia arquivos.
- **Prestador ativo:**
  - lê as próprias remessas e altera `remessas_ai`, como hoje;
  - lê e envia arquivos.
- **Admin ativo:** acesso inalterado.
- **Regressão:** o mesmo script de visibilidade por tabela usado na correção anterior; nada muda
  para usuários ativos.

## Risks & Considerations

- **Produção:** a migration só entra em produção com a confirmação do usuário, pelo SQL Editor.
- **Políticas de `storage.objects`:** ALTER POLICY em `storage.objects` exige que o papel do SQL
  Editor possa alterar políticas nessa tabela, o que normalmente vale no Supabase. Se não puder,
  a alternativa é recriar as políticas pelo painel (Storage → Policies).
- **Ordem de publicação:** tratada pelo fallback em `Register.jsx` (item 2).
- **App offline:** o sincronismo roda com a sessão de um usuário ativo e continua lendo tudo.
  Usuário desativado com sessão válida deixa de sincronizar, o que é o comportamento esperado.
- **Edge functions:** usam a chave de serviço, que ignora políticas. Sem efeito.
- **Integridade dos checklists:** `itens_checklist` e `tipos_unidade` não são auditadas. Não há
  como saber, pelo banco, se alguém já alterou algo. Vale comparar com uma cópia conhecida, se
  existir (exportação, `ExportarImportar.jsx`, relatórios antigos).
- **Política residual:** as políticas de storage citam o bucket `termos-notificacao`, que não
  existe. É resíduo inofensivo; fica como está.

## Open Questions

- [NEEDS CLARIFICATION: o cadastro público está ligado em produção?]
- [NEEDS CLARIFICATION: existe uma cópia confiável dos checklists (exportação ou planilha) para
  conferir se `itens_checklist` e `tipos_unidade` foram alterados?]
