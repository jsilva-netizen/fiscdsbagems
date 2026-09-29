# Bug Fix: Escrita anônima e acesso de contas não aprovadas

- **Slug**: acesso-aberto-sem-aprovacao
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied (no repositório, branch `fix/acesso-aberto-sem-aprovacao` a partir da `main`;
  **não aplicado em produção**)

## Summary

A migration 138 remove a escrita anônima do motor de checklists e a leitura anônima dos
prestadores. Também faz as políticas que liberavam qualquer usuário logado passarem a exigir
perfil ativo, nas 8 tabelas e nos arquivos. A tela de cadastro obtém a lista de prestadores por
uma função que devolve só `id` e `nome`. Quem está ativo continua fazendo o mesmo que antes.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/138_fix_open_policies.sql` | added | Remove 3 políticas abertas, cria `prestadores_para_cadastro()`, recria 9 políticas `true` exigindo perfil ativo e altera as políticas de `storage.objects` para `authenticated` (32 em produção) |
| `src/pages/Register.jsx` | modified | Lista de prestadores via `rpc('prestadores_para_cadastro')`, com a leitura antiga como reserva enquanto a função não existir |
| `supabase/tests/acesso_aberto_sem_aprovacao.sql` | added test | 45 verificações, em transação com `ROLLBACK` |
| `supabase/tests/fixtures/acesso_producao_20260928.sql` | added | Estado de produção das 8 tabelas e de `storage.objects`: colunas que faltam no local, privilégios, 55 políticas e os 8 buckets |

## Diff Highlights

```sql
DROP POLICY IF EXISTS "Public Access" ON public.itens_checklist;
DROP POLICY IF EXISTS "Public Access" ON public.tipos_unidade;
DROP POLICY IF EXISTS "Prestadores visíveis para todos" ON public.prestadores_servico;

-- mesmo nome, comando e papel; "true" vira perfil ativo
USING ((SELECT public.get_my_role()) IS NOT NULL)

-- storage.objects: para cada política de authenticated que só olha o bucket
ALTER POLICY ... USING ((<condição original>) AND (SELECT public.get_my_role()) IS NOT NULL)
```

## Tests Added or Updated

`supabase/tests/acesso_aberto_sem_aprovacao.sql`:

- **Anônimo:**
  - não lê, não altera, não apaga e não cria em `itens_checklist` e `tipos_unidade`;
  - não lê `prestadores_servico` nem arquivos;
  - `prestadores_para_cadastro()` devolve só `id` e `nome` dos ativos.
- **Conta não aprovada:**
  - não lê nenhuma das 8 tabelas;
  - não altera contratos, tipos de ocorrência nem remessas;
  - não cria contrato nem prorrogação de prazo;
  - não lê, não envia, não altera e não apaga arquivos.
- **Fiscal ativo:**
  - lê e edita checklist, tipo de unidade, contrato e tipo de ocorrência;
  - lê remessa;
  - a política permite prorrogação de prazo;
  - lê, envia e altera arquivos.
- **Prestador ativo:**
  - lê e altera a própria remessa, como hoje pelo portal;
  - lê os itens dela;
  - envia e lê arquivo.
- **Admin ativo:** edita checklist, apaga contrato e arquivo.
- **Estado final:** nenhuma política de `storage.objects` para `authenticated` sem perfil ativo, e
  nenhuma política permissiva `true` nas 8 tabelas.

## Local Verification

- `bash supabase/tests/rodar.sh acesso_aberto_sem_aprovacao.sql` → 45 `ok`, "todos os testes
  passaram".
- O mesmo teste sem a migration 138 → falha em "anônimo: não lê itens de checklist".
- `bash supabase/tests/rodar.sh escalada_privilegio_cadastro.sql` → continua passando.
- Visibilidade por tabela, antes e depois da 138, sobre o estado de produção mais a 137, com os
  usuários locais:
  - admin e fiscal ativos: nenhuma mudança nas 36 tabelas nem em `storage.objects`;
  - fiscal inativo: deixa de ver `contratos`, `itens_checklist`, `prestadores_servico`,
    `tipos_ocorrencia_dtr`, `tipos_unidade` e os 20 arquivos locais;
  - continua vendo `camaras_tecnicas`, `diretorias`, `municipios` e o próprio perfil.
- `npx eslint src/pages/Register.jsx` → 0 erros, os mesmos 8 avisos de antes.
- `npx vitest run` → 29 passaram. `npx vite build` → sucesso.
- Banco local sem alteração: tudo em transações com `ROLLBACK`.

## Deviations from Assessment

- **Arquivos por laço, não por nome.** A migration altera as políticas de `storage.objects` num
  laço sobre `pg_policies`: toda política só de `authenticated` que não cita `get_my_role`. Assim
  ela cobre as 32 de produção sem depender de nomes, e o teste confirma que nenhuma ficou de fora.
- **Remessas com `WITH CHECK` explícito.** As políticas "(DEV)" de `remessas_ai` e
  `remessas_ai_itens` não tinham `WITH CHECK` (valia o `USING`). Agora têm o mesmo texto
  explícito, com efeito idêntico.
- **Fixture complementar.** O banco local não tem colunas de produção, como
  `prestadores_servico.user_id`, usada por uma política. O fixture acrescenta essas colunas dentro
  da transação.

## Follow-ups

- **Aplicar em produção**, com a sua confirmação, pelo SQL Editor, entre `begin;` e `commit;`,
  **depois da 137**, que já foi aplicada. Depois de rodar, conferir que o `NOTICE` final informa
  32 políticas de `storage.objects` alteradas.
- **Publicar a `main`:** a tela de cadastro funciona em qualquer ordem entre publicação e
  migration.
- **Integridade dos checklists:** comparar `itens_checklist` e `tipos_unidade` com uma cópia
  confiável, se existir, porque essas tabelas não são auditadas.
- **Achados para a spec 003:**
  - restringir por papel, além de "ativo": prestador só nas próprias remessas e nos próprios
    arquivos, contratos e tipos de ocorrência só para quem não é prestador;
  - auditar alterações em checklists;
  - as políticas de storage citam o bucket inexistente `termos-notificacao`.
