# Bug Fix: Escalada de privilégio no cadastro de usuário

- **Slug**: escalada-privilegio-cadastro
- **Fixed**: 2026-09-28
- **Assessment**: ./assessment.md
- **Status**: applied (no repositório, branch `fix/escalada-privilegio-cadastro` a partir da `main`;
  **não aplicado em produção**)

## Summary

Uma migration nova faz o banco só reconhecer papel e vínculos de perfil ativo, restringe os papéis
aceitos no cadastro aos oferecidos na tela, impede que inativo se autoaprove e fecha a leitura e a
inserção de perfis por anônimo. O cadastro pela tela deixa de gravar o perfil pelo navegador, pois o
gatilho já o cria na mesma transação.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/137_fix_signup_privilege_escalation.sql` | added | Trava (exige admin ativo), 6 funções de identidade com `ativo IS TRUE`, `handle_new_user` com lista de papéis, `enforce_profile_security` lendo o papel só de perfil ativo, 4 políticas de `profiles` |
| `src/pages/Register.jsx` | modified | Removido o fallback que lia e inseria o perfil pelo cliente (dependia das políticas públicas removidas) |
| `supabase/tests/escalada_privilegio_cadastro.sql` | added test | 29 verificações, em transação com `ROLLBACK` |
| `supabase/tests/fixtures/estado_producao_20260928.sql` | added | Estado de produção (inventário de 2026-09-28) das 11 funções, dos gatilhos e das políticas de `profiles` e `fiscalizacoes` |
| `supabase/tests/rodar.sh` | added | Copia `tests/` e `migrations/` para o contêiner do banco local e roda um teste com `psql` |

## Diff Highlights

```sql
-- funções de identidade (get_my_role, current_role, get_my_camara_tecnica, get_my_diretoria,
-- get_my_prestador_id, current_prestador_servico_id)
SELECT role FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;

-- handle_new_user
IF v_role IS NULL OR v_role NOT IN ('fiscal', 'coordenador', 'diretor', 'prestador') THEN
  v_role := 'fiscal';
END IF;
-- ON CONFLICT não sobrescreve mais role, diretoria, câmara nem prestador

-- enforce_profile_security
SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;

-- políticas de profiles
DROP POLICY IF EXISTS "Leitura Geral" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users and during sign up" ON public.profiles;
-- "Admins can delete profiles" e "Admins can update any profile": TO authenticated, get_my_role() = 'admin'
```

## Tests Added or Updated

`supabase/tests/escalada_privilegio_cadastro.sql`:

- Cadastro: com `role: admin` vira fiscal inativo; fiscal, coordenador, diretor e prestador
  escolhidos na tela são mantidos, inativos, com diretoria, câmara e prestador escolhidos; vínculo
  com prestador é ignorado para quem não é prestador.
- Inativo: `get_my_role()` nulo, `current_role()` vazio, `is_staff()` falso, não vê
  fiscalizações, não se autoaprova, não troca o próprio papel, não aprova outro, não exclui perfil.
- Coordenador CATERS não aprovado: `is_caters_user()` não verdadeiro, sem câmara, não exclui nem
  edita perfis.
- Anônimo: não lê perfis e não insere perfil.
- Admin ativo: lista, aprova, altera papel e exclui perfis.
- Fiscal depois de aprovado: `get_my_role() = 'fiscal'`, `is_staff()` verdadeiro, vê a
  fiscalização da sua câmara, lê o próprio perfil.

## Local Verification

- `bash supabase/tests/rodar.sh escalada_privilegio_cadastro.sql` → 29 `ok`, "todos os testes
  passaram".
- O mesmo teste sem a linha que aplica a migration → falha em "cadastro pedindo admin vira
  fiscal" (papel gravado: `admin`), confirmando que o teste pega o defeito de produção.
- Migration aplicada sobre o estado atual do banco local (divergente de produção), em transação com
  `ROLLBACK` → sem erro.
- Banco local conferido depois dos testes: 3 perfis e 5 políticas em `profiles`, como antes.
- `npx eslint src/pages/Register.jsx` → 0 erros, os mesmos 8 avisos da `main`.
- `npx vite build` → sucesso.

## Deviations from Assessment

- **Teste e2e de cadastro não criado.** O teste SQL cobre o cadastro (pelo gatilho que o
  `signUp` dispara), a aprovação e o acesso depois dela, sem criar usuários reais no Supabase
  local. Um e2e pela tela exigiria confirmação de e-mail e limpeza de usuários de `auth`.
- **Teste contra o estado de produção.** O banco local não tem `current_role`, `is_staff`,
  `current_prestador_servico_id` nem 7 das 12 políticas de `profiles` de produção, então o teste
  carrega o estado de produção do inventário (fixture) antes de aplicar a migration.
- **Políticas de admin recriadas, não removidas.** A avaliação admitia as duas opções; recriá-las
  com `get_my_role()` mantém o acesso do admin mesmo onde `profiles_admin_all` não existe (caso
  do banco local).
- **Ampliações pequenas em `enforce_profile_security`:**
  - na inserção feita por não admin, qualquer papel fora de fiscal, diretor e prestador vira
    fiscal (antes, só `admin` e `coordenador` viravam);
  - as comparações passaram a `IS DISTINCT FROM`, porque `ativo` aceita nulo e `<>` com nulo
    deixava a troca passar.
- **Trava na migration:** aborta se não houver admin ativo, para não deixar o sistema sem quem
  aprove usuários (risco levantado na avaliação).
- **`Register.jsx` alterado** conforme listado na avaliação.

## Follow-ups

- **Antes de aplicar em produção** (decisão do usuário):
  - conferir no painel se o cadastro público está ligado;
  - conferir se há admin inativo;
  - rodar, só leitura, `select role, ativo, count(*) from profiles group by 1, 2` e procurar
    perfis com papel fora da tela ou que se ativaram sozinhos (`audit_logs`).
- **Aplicar em produção:** a migration 137, pelo SQL Editor do painel (a rede não permite conexão
  direta). A tela só precisa do deploy da `main` depois do merge.
- **Trazer a correção para `migracao-sisreg`** e registrar o achado A-011 em `achados.toml` da
  spec 003.
- **Para o sistema novo:** o papel deve ser atribuído pelo admin na aprovação, não escolhido no
  cadastro (alternativa da avaliação).
