# Bug Fix: View do CATERS lida sem login

- **Slug**: view-caters-sem-login
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied (branch `fix/view-caters-sem-login` a partir da `main`; **não aplicado em
  produção**)

## Summary

A migration 140 faz a view `caters_fiscalizacoes_disponiveis` usar as permissões de quem consulta
(`security_invoker`) e deixa só `SELECT` para `authenticated`. Com isso, vale a política de
`fiscalizacoes`: usuário ativo com acesso à câmara, ou admin. A tela não muda.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/140_fix_view_caters_security_invoker.sql` | added | `security_invoker = true`; revoga tudo de `anon`; `authenticated` só `SELECT` |
| `supabase/tests/view_caters_sem_login.sql` | added test | 6 verificações, em transação com `ROLLBACK`; recria a view como em produção |

## Tests Added or Updated

- **Sem acesso:**
  - anônimo não lê (erro de permissão);
  - conta não aprovada vê 0;
  - fiscal da CRES vê 0 das do CATERS.
- **Com acesso:**
  - fiscal da CATERS vê só a finalizada da CATERS e não escreve pela view;
  - admin vê.

## Local Verification

- `bash supabase/tests/rodar.sh view_caters_sem_login.sql` → 6 `ok`.
- Sem a migration 140 → falha em "anônimo: não lê a view".
- Testes das migrations 137, 138 e 139 → continuam passando.
- Banco local sem alteração (a view local segue sem opções).

## Deviations from Assessment

Nenhuma.

## Follow-ups

- Aplicar em produção, com a sua confirmação, pelo SQL Editor, entre `begin;` e `commit;`.
- Na spec 003, verificar se há outras views com o mesmo problema. No inventário de produção, esta
  é a única view do esquema `public`.
