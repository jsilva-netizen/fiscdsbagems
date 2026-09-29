# Bug Assessment: View do CATERS lida sem login

- **Slug**: view-caters-sem-login
- **Created**: 2026-09-29
- **Source**: pasted text (achado da anotação do CATERS, spec 003 T025)
- **Verdict**: valid
- **Severity**: medium

## Report (verbatim or summarized)

A view `caters_fiscalizacoes_disponiveis` (fiscalizações finalizadas da câmara CATERS) pertence ao
`postgres`, não tem a opção `security_invoker` e dá todos os privilégios de tabela a `anon` e
`authenticated`. Por isso roda com as permissões do dono, não passa pelas políticas de
`fiscalizacoes`, e qualquer pessoa, sem login, lista essas fiscalizações: id, município,
prestador, serviços, status, datas, número do termo e câmara.

Fonte: inventário de produção (`opcoes_tabelas`: dono `postgres`, opções vazias;
`permissoes_tabelas`: `anon` com SELECT).

## Symptom

`GET /rest/v1/caters_fiscalizacoes_disponiveis` com a chave pública, sem sessão, devolve as
fiscalizações finalizadas do CATERS. O esperado: só usuários ativos com acesso à câmara CATERS (e
admins) as veem, como na própria tabela `fiscalizacoes`.

## Reproduction

1. Como `anon`, sem `request.jwt.claims`: `SELECT * FROM caters_fiscalizacoes_disponiveis` → todas
   as linhas.
2. O mesmo como conta não aprovada, ou como fiscal de outra câmara → todas as linhas.

Reprodução automatizada no teste da correção (sem a migration, falha), com a definição de produção
num banco local em transação com `ROLLBACK`.

## Suspected Code Paths

- `tabela:caters_fiscalizacoes_disponiveis` (view): definição
  `SELECT … FROM fiscalizacoes WHERE camara_tecnica_id = 'caters' AND status = 'finalizada'`, sem
  `security_invoker`.
- `privilegio:caters_fiscalizacoes_disponiveis.anon` e `.authenticated`: todos os privilégios.
- Único uso: [src/lib/caters/processes.js:109](src/lib/caters/processes.js#L109) (lista
  "vincular fiscalização" do processo CATERS), usado por usuário da CATERS ou admin.

## Root Cause Hypothesis

View criada sem `security_invoker`, que só existe desde o Postgres 15. Com os privilégios padrão
do Supabase, que dão tudo a `anon` e `authenticated`, ela fica aberta. Confiança: **alta**.

## Proposed Remediation

**Preferred**: migration 140:

1. `ALTER VIEW … SET (security_invoker = true)`: a view passa a respeitar as políticas de
   `fiscalizacoes` para quem consulta.
2. Revogar todos os privilégios de `anon` na view e, de `authenticated`, tudo menos `SELECT`.

A tela do CATERS continua funcionando: quem a usa é fiscal ou coordenador da câmara CATERS ou
admin, e a política de `fiscalizacoes` (`can_access_camara`) já dá acesso a eles.

**Alternatives**:
- Pôr o filtro de papel e câmara dentro da view. Duplica a regra das políticas.

**Files likely to change**:
- `supabase/migrations/140_fix_view_caters_security_invoker.sql`
- `supabase/tests/view_caters_sem_login.sql`

**Tests to add or update**:
- **Sem acesso:**
  - anônimo não lê (erro de permissão);
  - conta não aprovada lê 0 linhas;
  - fiscal de outra câmara lê 0 linhas.
- **Com acesso:**
  - fiscal da CATERS lê só as finalizadas da CATERS;
  - admin lê.
- **Sem mudança:** os testes de 137, 138 e 139 continuam passando.

## Risks & Considerations

- Um fiscal ou coordenador **sem câmara** vê todas as fiscalizações pela regra de
  `can_access_camara`, e continuará vendo as da CATERS na view. É o mesmo que já vê na tabela.
- Diretor e prestador deixam de ver a view. Nenhum deles usa essa tela.
- Produção: aplicar com confirmação do usuário, pelo SQL Editor.

## Open Questions

- Nenhuma.
