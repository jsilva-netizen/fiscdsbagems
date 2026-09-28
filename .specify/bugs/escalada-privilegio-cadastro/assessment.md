# Bug Assessment: Escalada de privilégio no cadastro de usuário

- **Slug**: escalada-privilegio-cadastro
- **Created**: 2026-09-28
- **Source**: pasted text (achado durante a anotação do core na spec 003)
- **Verdict**: valid
- **Severity**: critical

## Report (verbatim or summarized)

> Escalada de privilégio no cadastro de usuário (produção). handle_new_user copia role e
> prestador_servico_id de raw_user_meta_data, que o próprio usuário envia no signUp
> (src/pages/Register.jsx envia role escolhido na tela; a API aceita qualquer valor, inclusive
> 'admin'). enforce_profile_security libera tudo quando auth.uid() IS NULL, que é o caso durante o
> cadastro. O perfil nasce com ativo=false, mas get_my_role(), current_role(), is_staff() e
> get_my_camara_tecnica() não verificam ativo, e as políticas de RLS usam essas funções; só o
> frontend (AuthContext.jsx) barra perfil inativo. Resultado: cadastro com role 'admin' dá acesso
> de admin pela API sem aprovação, inclusive para ativar o próprio perfil [...]. Problemas
> relacionados na mesma tabela: política 'Leitura Geral' (SELECT, papel public, USING true) expõe
> todos os perfis a usuário não autenticado; política 'Enable insert for authenticated users and
> during sign up' (INSERT, papel public, CHECK true). A corrigir na main (produção), sem quebrar o
> cadastro legítimo.

Fonte das definições de produção: `.specify/assessments/novo-sistema-django-apps/inventario-producao.csv`
(inventário de 2026-09-28). Nenhuma URL envolvida.

## Symptom

Qualquer pessoa com a chave pública do app (que está no bundle do frontend) consegue se cadastrar
pela API de autenticação com `role: 'admin'` nos metadados e, sem aprovação, recebe de imediato
permissões de administrador em todas as políticas de acesso do banco, podendo inclusive se
autoaprovar. O esperado: perfil recém-cadastrado não tem permissão nenhuma até ser aprovado por
um admin, e o cadastro nunca cria admin.

## Reproduction

Confirmado no Supabase local (Docker), com as definições de produção das funções, em transação
com `ROLLBACK`:

1. Chamar `auth.signUp` (ou inserir em `auth.users`) com
   `raw_user_meta_data = {"role": "admin", "full_name": "x"}`.
2. O gatilho `on_auth_user_created` executa `handle_new_user()`, que cria o perfil com
   `role = 'admin'`, `ativo = false`. `trg_enforce_profile_security` não altera nada, porque
   `auth.uid()` é nulo dentro do cadastro.
3. Com a sessão desse usuário (`request.jwt.claims.sub` = id dele): `get_my_role() = 'admin'`,
   `current_role() = 'admin'`, `is_staff() = true`.
4. Pela política `Edição Própria` (ou `Admins e coordenadores gerenciam perfis`), o usuário faz
   `UPDATE profiles SET ativo = true WHERE id = auth.uid()`; `enforce_profile_security` permite,
   porque lê o papel `admin` do próprio perfil.

Não confirmado em produção (e não deve ser testado lá):
[NEEDS CLARIFICATION: o cadastro público ("Allow new users to sign up") está ligado no painel de
produção? A existência da tela `/register` indica que sim. A confirmação de e-mail é exigida? Se
for, o atacante só precisa de um e-mail que controle, o que não reduz a gravidade.]

## Suspected Code Paths

Definições de produção (inventário), todas em `public`:

- `handle_new_user()` (gatilho `on_auth_user_created` em `auth.users`) — copia `role`,
  `diretoria_id`, `camara_tecnica_id` e `prestador_servico_id` de `raw_user_meta_data` sem
  validar; `ON CONFLICT` também sobrescreve `role` com o valor dos metadados.
- `enforce_profile_security()` (gatilho `trg_enforce_profile_security`, BEFORE INSERT OR UPDATE em
  `profiles`) — `IF auth.uid() IS NULL THEN RETURN NEW` libera o cadastro; no UPDATE, decide pelo
  papel lido do próprio perfil, sem olhar `ativo`.
- `get_my_role()`, `current_role()`, `get_my_camara_tecnica()`, `get_my_diretoria()`,
  `get_my_prestador_id()`, `current_prestador_servico_id()` — leem o perfil sem filtrar
  `ativo = true`. São usadas por 44 (`get_my_role`) + 17 (`current_role`) políticas diretamente e,
  via `is_staff()` (13), `is_caters_user()` (15), `can_access_camara()` (6),
  `can_access_unidade()` (5) e `can_access_fiscalizacao()` (4), por boa parte das 173 políticas.
- Políticas de `profiles` com subconsulta direta sem `ativo`: `Admins can delete profiles`
  (DELETE, public) e `Admins can update any profile` (UPDATE, public).
- Políticas de `profiles` abertas: `Leitura Geral` (SELECT, public, `USING true`) — anônimo lê
  todos os perfis (nome, e-mail, papel, vínculos); `Enable insert for authenticated users and
  during sign up` (INSERT, public, `CHECK true`).
- Restrições de `profiles`: não há `CHECK` sobre os valores de `role`.
- [src/pages/Register.jsx:100-143](src/pages/Register.jsx#L100-L143) — envia `role` escolhido na
  tela nos metadados e, se o perfil não existir, tenta inserir o perfil pelo cliente (depende das
  políticas públicas de SELECT e INSERT acima).
- [src/lib/AuthContext.jsx:138](src/lib/AuthContext.jsx#L138) e
  [src/lib/AuthContext.jsx:303](src/lib/AuthContext.jsx#L303) — única barreira para perfil
  inativo, e só na interface.
- Edge functions do repositório (`relatorios_*`, `caters_ai_*`, `catesa_ai_*`) já exigem
  `ativo === true`; não fazem parte do problema (ressalva: o código publicado pode diferir, ver
  `specs/003-base-dados-producao/anotacoes/externos.toml`).

## Root Cause Hypothesis

A aprovação de usuários é garantida só na interface. No banco, o papel do perfil vale desde o
cadastro, mesmo inativo, e o papel é escolhido pelo próprio usuário nos metadados do cadastro, que
o gatilho copia sem validação num contexto (`auth.uid()` nulo) em que o gatilho de segurança não
age. O mesmo vale, em escala menor, para o fluxo legítimo: quem escolhe `coordenador`, câmara
`caters` ou um prestador na tela ganha os acessos correspondentes antes da aprovação. Confiança:
**alta** (reproduzido com as definições de produção).

## Proposed Remediation

**Preferred**: uma migration nova, idempotente, que:

1. Faz as funções de identidade considerarem só perfil ativo: `get_my_role()`, `current_role()`,
   `get_my_camara_tecnica()`, `get_my_diretoria()`, `get_my_prestador_id()` e
   `current_prestador_servico_id()` passam a filtrar `AND ativo = true`. `current_role()` mantém
   o `coalesce(..., '')`. Como `is_staff`, `is_caters_user` e `can_access_*` chamam essas funções,
   herdam a correção sem mudança.
2. Reescreve as duas políticas de `profiles` com subconsulta direta (`Admins can delete profiles`,
   `Admins can update any profile`) para usar `get_my_role() = 'admin'`, ou as remove por
   redundância com `profiles_admin_all`.
3. Faz `handle_new_user()` aceitar só os papéis de cadastro (`fiscal`, `coordenador`, `diretor`,
   `prestador`); qualquer outro valor vira `fiscal`. O perfil continua nascendo com
   `ativo = false`, e o `ON CONFLICT` deixa de sobrescrever `role` com os metadados.
4. Em `enforce_profile_security()`, o papel de quem executa passa a ser lido só de perfil ativo,
   para que um inativo nunca se autoaprove ou mude o próprio papel.
5. Remove as políticas `Leitura Geral` (SELECT, public) e `Enable insert for authenticated users
   and during sign up` (INSERT, public). Continuam valendo `profiles_self_select`,
   `Leitura pública de perfis` (authenticated), `Inserção Própria` e `profiles_admin_all`.

O cadastro legítimo não muda para o usuário: ele escolhe o papel na tela, o gatilho cria o perfil
inativo e o admin aprova. Só o que o perfil pode fazer antes da aprovação muda (nada).

**Alternatives**:
- Mover `role` e vínculos para `raw_app_meta_data` (só gravável pelo servidor) e cadastrar sempre
  como "pendente", com o admin escolhendo o papel na aprovação. Mais seguro, mas muda o fluxo de
  cadastro e a tela de aprovação; fica para o sistema novo.
- Só a validação de papéis no `handle_new_user` (itens 3 e 5). Fecha o `admin`, mas mantém o
  acesso antes da aprovação para quem escolhe `coordenador`, uma câmara ou um prestador.

**Files likely to change** (na `main`):
- `supabase/migrations/137_fix_signup_privilege_escalation.sql` (nova; ver riscos sobre a
  numeração)
- [src/pages/Register.jsx](src/pages/Register.jsx) — remover o fallback de inserção do perfil pelo
  cliente, que depende das políticas removidas e perde o sentido com o gatilho.
- testes: um teste SQL executado no Supabase local e um e2e de cadastro em `tests/e2e/`
  (Playwright, padrão já usado em `tests/e2e/offline/`).

**Tests to add or update**:
- Cadastro com metadados `role: 'admin'` → perfil criado com `role = 'fiscal'`, `ativo = false`.
- Usuário inativo (qualquer papel) → `get_my_role()` nulo, `current_role() = ''`,
  `is_staff() = false`, `is_caters_user() = false`; `SELECT` em tabela de fiscalização retorna 0
  linhas; `UPDATE profiles SET ativo = true` no próprio perfil não tem efeito.
- Anônimo → `SELECT` em `profiles` retorna 0 linhas; `INSERT` em `profiles` falha.
- Caminho feliz: cadastro como `fiscal` com diretoria e câmara → perfil inativo com os vínculos
  escolhidos; admin ativo aprova (`ativo = true`); o fiscal passa a ver as fiscalizações da sua
  câmara como antes.
- Regressão: admin ativo continua listando, editando e excluindo perfis; `admin_delete_user`
  continua funcionando.

## Risks & Considerations

- **Produção**: a migration só pode ser aplicada em produção com a confirmação explícita do
  usuário (Princípio IV da constituição: produção recebe só correção crítica, e esta é).
- **Perfis existentes**: antes de aplicar, conferir em produção quantos perfis estão inativos e
  quais papéis têm (8 usuários no inventário) e se algum `admin` atual está com `ativo = false`,
  porque perderia o acesso. Consulta só de leitura, feita pelo usuário.
- **Usuário do e2e**: as migrations 135/136 (restrição de escrita do usuário de teste) existem só
  em `migracao-sisreg`; a `main` termina em 134. Usar número 137 evita colisão quando a correção
  voltar para `migracao-sisreg`.
- **Divergência migrations × produção**: a spec 003 mostra que o repositório não reflete
  produção fielmente. A migration deve partir das definições do inventário de produção
  (`CREATE OR REPLACE` com o corpo de produção mais o filtro), não das migrations antigas.
- **Telas que listam perfis sem login**: nenhuma conhecida; o `SELECT` do `Register.jsx` que
  depende de `Leitura Geral` é o fallback a remover. Conferir com busca por `from('profiles')`.
- **Cache offline**: usuário já desativado com sessão válida perde o acesso no banco na hora (era
  o comportamento esperado e hoje não acontece). O app offline continua mostrando o que já está
  em cache até sincronizar.
- **Detecção**: verificar em `audit_logs` e em `profiles` de produção se já existe perfil criado
  com papel não oferecido na tela ou alteração de `ativo` feita pelo próprio usuário.

## Open Questions

- [NEEDS CLARIFICATION: o cadastro público está ligado em produção (Authentication → Providers →
  Email → "Allow new users to sign up")? Se estiver, considerar desligar até a correção entrar.]
- [NEEDS CLARIFICATION: existe hoje algum admin com `ativo = false` em produção? Se existir, a
  correção corta o acesso dele.]
- [NEEDS CLARIFICATION: o papel `diretor` deve ser oferecido no cadastro público? Hoje é, e o
  item 3 mantém.]
