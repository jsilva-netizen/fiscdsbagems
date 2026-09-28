# Bug Verification: Escalada de privilégio no cadastro de usuário

- **Slug**: escalada-privilegio-cadastro
- **Tested**: 2026-09-28
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

A escalada de privilégio não se reproduz mais. Depois da correção, o cadastro pedindo `admin` vira
fiscal inativo, a conta inativa não tem papel nem se autoaprova, e o anônimo não lê perfis.
Usuários ativos continuam vendo exatamente o mesmo em todas as tabelas.

Resta uma lacuna ligada ao mesmo relato: qualquer pessoa ainda pode se cadastrar e, com a conta
inativa, ler todos os perfis (nome, e-mail, papel, vínculos). Isso acontece pela política
`Leitura pública de perfis`, aberta a qualquer usuário logado, o que torna parcial a correção da
exposição de dados pessoais. Por isso o resultado é `partial`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (pré-correção) | script de verificação (scratchpad), estado de produção do inventário, passos 1–4 da avaliação | pass (reproduz) | perfil `admin/false`; `get_my_role() = admin`; `is_staff() = true`; autoaprovação funciona; anônimo vê 5 perfis |
| Reproduction (pós-correção) | mesmo script, depois de aplicar a migration 137 na mesma transação | pass | detalhes abaixo |
| Variantes de papel no cadastro | `admin`, `Admin`, `" admin "`, `service_role`, sem papel | pass | todas viram `fiscal/false` |
| New / updated tests | `bash supabase/tests/rodar.sh escalada_privilegio_cadastro.sql` | pass | 29 `ok`, "todos os testes passaram" |
| Regressão de acesso (usuários ativos) | contagem de linhas visíveis em 36 tabelas, antes e depois, para o admin e o fiscal ativos locais | pass | só `profiles` mudou (5 → 10), pelas 5 linhas criadas pelo próprio script |
| Exposição residual (usuário inativo) | mesma contagem para a conta explorada e o fiscal inativo local | fail (lacuna) | linhas visíveis caem de 860 para ~140; continuam visíveis: `profiles` (todos), `contratos`, `prestadores_servico`, `municipios`, `camaras_tecnicas`, `diretorias`, `itens_checklist`, `tipos_unidade`, `tipos_ocorrencia_dtr` |
| Regression suite (unit) | `npx vitest run` | pass | 1 arquivo, 29 testes |
| Lint | `npx eslint . --quiet` | fail (preexistente) | 1 erro em `src/components/fiscalizacao/PhotoGrid.jsx` (regra `react-hooks/exhaustive-deps` não configurada), arquivo não tocado pela correção; `Register.jsx` sem erros |
| Type-check | `npx tsc -p ./jsconfig.json` | fail (preexistente) | 2 erros em `src/lib/offline/repository.ts`, não tocado; nenhum em `Register.jsx` |
| Build | `npx vite build` (na correção) | pass | — |
| Caminho real pela API (GoTrue + PostgREST) | — | skipped | exigiria aplicar a migration de forma permanente no banco local e criar usuários reais em `auth`; a simulação usa os mesmos papéis (`authenticated`, `anon`) e o mesmo `request.jwt.claims` que o PostgREST define |
| Produção | — | not-run | proibido pela constituição e pela avaliação; nada foi executado em produção |

## Output Excerpts

```text
antes  | perfil criado (papel/ativo)                         | admin/false
antes  | get_my_role() da conta inativa                      | admin
antes  | is_staff() da conta inativa                         | true
antes  | autoaprovação (ativo depois do UPDATE próprio)      | true
antes  | anônimo: perfis visíveis                            | 5
depois | get_my_role() da conta explorada antes da correção  | NULL
depois | is_staff() da conta explorada                       | false
depois | autoaprovação da conta explorada (ativo)            | false
depois | conta que já se autoaprovou antes (papel/ativo)     | admin/true
depois | cadastros com admin/Admin/" admin "/service_role/sem papel | fiscal/false (x5)
depois | anônimo: perfis visíveis                            | 0

== usuários ativos: tabelas em que a visibilidade mudou
admin local ativo  | profiles | antes=5 depois=10
fiscal local ativo | profiles | antes=5 depois=10

== inativos: total de linhas visíveis antes / depois
conta explorada (inativa) | antes=860 depois=139
fiscal local inativo      | antes=860 depois=144
```

## Residual Risks

- **Perfis legíveis por qualquer conta recém-criada.** A política `Leitura pública de perfis`
  (SELECT, authenticated, `USING true`) continua valendo para perfil inativo. Com o cadastro
  público, "autenticado" é qualquer pessoa, então a exposição de dados pessoais da avaliação
  continua acessível com um passo a mais.
- **Tabelas de referência abertas a qualquer logado.** `contratos`, `prestadores_servico`,
  `municipios` e as demais listadas acima usam políticas abertas a qualquer usuário logado, sem
  papel. É menos grave, mas vale para contas não aprovadas.
- **Conta que já se autoaprovou.** Se a falha já foi explorada em produção até a autoaprovação
  (`admin/true`), a migration não a desfaz. Só a auditoria de `profiles` e `audit_logs` detecta.
- **Caminho real pela API e produção não exercitados.** A cobertura é a simulação no nível do
  banco, com o estado de produção carregado do inventário de 2026-09-28. Mudança em produção
  depois dessa data não está coberta.
- **Diferenças do banco local.** O local não tem as restrições `NOT VALID` de produção sobre
  prestador, então esse ponto só é coberto pelo que `handle_new_user` grava, não pela recusa do
  banco.

## Recommendation

Segurar o merge e ampliar a correção antes de aplicar em produção. Rodar de novo
`/speckit-bug-fix`, com o `fix.md` atualizado, para restringir `Leitura pública de perfis` a quem
tem perfil ativo, mantendo a leitura do próprio perfil, que a tela de login usa para mostrar
"aguarda aprovação". Depois, repetir `/speckit-bug-test`. A escalada de privilégio, que é o núcleo
crítico, está resolvida e verificada.

As tabelas de referência abertas a qualquer logado podem ficar como achado da spec 003 para o
sistema novo, se o usuário preferir não ampliar mais a correção de produção. Antes da aplicação em
produção, fazer a auditoria de contas autoaprovadas.
