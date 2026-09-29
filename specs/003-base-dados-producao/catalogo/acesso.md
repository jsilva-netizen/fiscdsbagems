<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Controle de acesso fora das políticas

## Papéis do banco

| Papel | Superusuário | Faz login | Ignora RLS | Membro de | Dono / finalidade |
|---|:---:|:---:|:---:|---|---|
| `anon` |  |  |  |  | módulo **core** — Quem usa o aplicativo sem login. O navegador fala com o banco pela chave pública do projeto, e<br>toda requisição sem sessão roda como `anon` (limite de 3 segundos por comando).<br>Depois das migrations 137, 138 e 141, `anon` só faz três coisas: entrar, criar conta (a lista de<br>entidades do cadastro vem de `prestadores_para_cadastro`) e ler os logotipos das entidades. Os<br>privilégios de tabela continuam concedidos a `anon` (privilégio padrão do esquema `public`); o que<br>o impede de ler e gravar são as regras de acesso por linha.<br>No sistema novo, requisição sem login só alcança login, cadastro e a lista de entidades do<br>cadastro. *(fonte: src/lib/supabase.js:4, src/lib/AuthContext.jsx:284, src/pages/Register.jsx:47, src/pages/Register.jsx:106, supabase/migrations/138_fix_open_policies.sql, supabase/migrations/141_fix_funcoes_sem_verificacao.sql)* |
| `authenticated` |  |  |  |  | módulo **core** — Todo usuário com sessão: equipe da AGEMS (admin, coordenador, fiscal, diretor) e prestador. O<br>banco não distingue os papéis da aplicação por papel do Postgres: as regras de acesso leem o<br>papel, a câmara, a diretoria e a entidade do perfil com `get_my_role` e funções irmãs, que desde a<br>migration 137 só respondem para perfil ativo. Conta sem perfil ativo tem sessão e não passa nas<br>regras que dependem do papel; em produção ainda lê todos os perfis, porque a restrição da leitura<br>de perfis da 137 não chegou lá. Limite de 8 segundos por comando. *(fonte: funcao:get_my_role(), politica:public.profiles.Leitura pública de perfis, funcao:can_access_camara(row_camara text), supabase/migrations/137_fix_signup_privilege_escalation.sql)* |
| `authenticator` |  | sim |  | anon, authenticated, service_role | fora do escopo: **plataforma** — Papel com que a API REST se conecta e depois assume anon, authenticated ou service_role conforme a chave ou a sessão. |
| `cli_login_postgres` |  | sim |  | postgres | fora do escopo: **plataforma** — Login temporário da CLI do Supabase, membro de postgres. |
| `dashboard_user` |  |  |  |  | fora do escopo: **plataforma** — Usado pelo painel do Supabase. |
| `pgbouncer` |  | sim |  |  | fora do escopo: **plataforma** — Usado pelo agrupador de conexões do Supabase. |
| `postgres` |  | sim | **sim** | anon, authenticated, authenticator, pg_create_subscription, pg_monitor, pg_read_all_data, pg_signal_backend, service_role, supabase_privileged_role | fora do escopo: **plataforma** — Dono dos objetos da aplicação e papel das migrations e do SQL Editor. Ignora as regras de acesso por linha. No sistema novo, o banco tem dono próprio. |
| `service_role` |  |  | **sim** |  | módulo **core** — Chave de serviço, usada só pelas edge functions: filas de relatórios (`relatorios_*`) e de IA do<br>CATERS e da CATESA (`caters_ai_*`, `catesa_ai_*`). Ignora as regras de acesso por linha. Desde a<br>migration 141, as funções que reivindicam trabalhos das filas e que disparam o worker só<br>executam com ela, e `e_chave_de_servico()` a reconhece dentro das funções que também aceitam<br>usuários.<br>No sistema novo, esse papel corresponde aos processos de fundo (Celery), que rodam com permissão<br>de sistema. *(fonte: supabase/functions/relatorios_worker/index.ts:2531, supabase/functions/caters_ai_worker/index.ts:339, supabase/migrations/141_fix_funcoes_sem_verificacao.sql:23)* |
| `supabase_admin` | sim | sim | **sim** |  | fora do escopo: **plataforma** — Superusuário da plataforma Supabase. |
| `supabase_auth_admin` |  | sim |  |  | fora do escopo: **plataforma** — Dono do esquema auth, usado pelo serviço de autenticação. |
| `supabase_etl_admin` |  | sim | **sim** | pg_monitor, pg_read_all_data, supabase_privileged_role | fora do escopo: **plataforma** — Replicação e ETL da plataforma Supabase. |
| `supabase_functions_admin` |  | sim |  |  | fora do escopo: **plataforma** — Dono do esquema das funções da plataforma (webhooks). |
| `supabase_privileged_role` |  |  |  |  | fora do escopo: **plataforma** — Papel de privilégios internos da plataforma Supabase. |
| `supabase_read_only_user` |  | sim | **sim** | pg_monitor, pg_read_all_data | fora do escopo: **plataforma** — Acesso só de leitura da plataforma (ex.: réplicas e suporte). |
| `supabase_realtime_admin` |  |  |  |  | fora do escopo: **plataforma** — Serviço de tempo real do Supabase. A aplicação não usa tempo real. |
| `supabase_replication_admin` |  | sim |  |  | fora do escopo: **plataforma** — Replicação lógica da plataforma Supabase. |
| `supabase_storage_admin` |  | sim |  | authenticator | fora do escopo: **plataforma** — Dono do esquema storage, usado pelo serviço de arquivos. |

## Privilégios em tabelas e views, por papel

Quem tem o privilégio ainda passa pelas políticas de acesso (RLS) de cada tabela.

| Tabela | anon | authenticated | service_role | PUBLIC |
|---|---|---|---|---|
| [audit_logs](tabelas/audit_logs.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [autos_infracao](tabelas/autos_infracao.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [camaras_tecnicas](tabelas/camaras_tecnicas.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_ai_jobs](tabelas/caters_ai_jobs.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_analysis_history](tabelas/caters_analysis_history.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_deadline_extensions](tabelas/caters_deadline_extensions.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_extra_documents](tabelas/caters_extra_documents.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_fiscalizacoes_disponiveis](tabelas/caters_fiscalizacoes_disponiveis.md) |  | SELECT | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_municipality_responses](tabelas/caters_municipality_responses.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_notification_reads](tabelas/caters_notification_reads.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_processes](tabelas/caters_processes.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_recommendations](tabelas/caters_recommendations.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [catesa_ai_jobs](tabelas/catesa_ai_jobs.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [constatacoes_manuais](tabelas/constatacoes_manuais.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [contratos](tabelas/contratos.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [determinacoes](tabelas/determinacoes.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [diretorias](tabelas/diretorias.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [fiscalizacoes](tabelas/fiscalizacoes.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [fotos_evidencia](tabelas/fotos_evidencia.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [itens_checklist](tabelas/itens_checklist.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [julgamentos](tabelas/julgamentos.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [manifestacoes_auto](tabelas/manifestacoes_auto.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [municipios](tabelas/municipios.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [nao_conformidades](tabelas/nao_conformidades.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [pareceres_tecnicos](tabelas/pareceres_tecnicos.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [prestadores_servico](tabelas/prestadores_servico.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [profiles](tabelas/profiles.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [recomendacoes](tabelas/recomendacoes.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [relatorios_jobs](tabelas/relatorios_jobs.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [remessas_ai](tabelas/remessas_ai.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [remessas_ai_itens](tabelas/remessas_ai_itens.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [respostas_checklist](tabelas/respostas_checklist.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [respostas_determinacao](tabelas/respostas_determinacao.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [termos_notificacao](tabelas/termos_notificacao.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [tipos_ocorrencia_dtr](tabelas/tipos_ocorrencia_dtr.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [tipos_unidade](tabelas/tipos_unidade.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [unidades_fiscalizadas](tabelas/unidades_fiscalizadas.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |

## Funções executáveis por usuário não autenticado (`anon` ou `PUBLIC`)

- [admin_delete_user](funcoes/admin_delete_user.md)
- [admin_delete_user_by_email](funcoes/admin_delete_user_by_email.md)
- [camara_from_servicos](funcoes/camara_from_servicos.md)
- [can_access_camara](funcoes/can_access_camara.md)
- [can_access_fiscalizacao](funcoes/can_access_fiscalizacao.md)
- [can_access_unidade](funcoes/can_access_unidade.md)
- [caters_import_from_fiscalizacao](funcoes/caters_import_from_fiscalizacao.md)
- [caters_set_updated_at](funcoes/caters_set_updated_at.md)
- [catesa_ai_jobs_set_updated_at](funcoes/catesa_ai_jobs_set_updated_at.md)
- [current_prestador_servico_id](funcoes/current_prestador_servico_id.md)
- [current_role](funcoes/current_role.md)
- [determinacoes_fill_origem](funcoes/determinacoes_fill_origem.md)
- [e_chave_de_servico](funcoes/e_chave_de_servico.md)
- [enforce_profile_security](funcoes/enforce_profile_security.md)
- [finalizar_fiscalizacao](funcoes/finalizar_fiscalizacao.md)
- [gerar_ncs_unidade](funcoes/gerar_ncs_unidade.md)
- [gerar_numero_am](funcoes/gerar_numero_am.md)
- [gerar_numero_auto](funcoes/gerar_numero_auto.md)
- [get_my_camara_tecnica](funcoes/get_my_camara_tecnica.md)
- [get_my_diretoria](funcoes/get_my_diretoria.md)
- [get_my_prestador_id](funcoes/get_my_prestador_id.md)
- [get_my_role](funcoes/get_my_role.md)
- [handle_new_user](funcoes/handle_new_user.md)
- [is_caters_user](funcoes/is_caters_user.md)
- [is_staff](funcoes/is_staff.md)
- [prestadores_para_cadastro](funcoes/prestadores_para_cadastro.md)
- [process_audit_log](funcoes/process_audit_log.md)
- [propagate_modification_to_parent](funcoes/propagate_modification_to_parent.md)
- [proteger_resposta_determinacao_prestador](funcoes/proteger_resposta_determinacao_prestador.md)
- [proteger_termo_prestador](funcoes/proteger_termo_prestador.md)
- [set_fiscalizacao_cache_fields](funcoes/set_fiscalizacao_cache_fields.md)
- [set_fiscalizacao_last_modified](funcoes/set_fiscalizacao_last_modified.md)
- [set_termos_notificacao_ano_geracao](funcoes/set_termos_notificacao_ano_geracao.md)
- [trg_auto_set_camara](funcoes/trg_auto_set_camara.md)
- [trg_fiscalizacao_set_camara](funcoes/trg_fiscalizacao_set_camara.md)
- [trg_remessa_set_camara](funcoes/trg_remessa_set_camara.md)
- [update_updated_at_column](funcoes/update_updated_at_column.md)

## Privilégios padrão

| Dono | Esquema | Objeto | Privilégios | Dono / finalidade |
|---|---|---|---|---|
| `postgres` | `public` | funcao | postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres | módulo **core** — Toda função nova do esquema `public` nasce executável por `anon`, `authenticated` e<br>`service_role`. Foi a origem das funções executáveis sem login corrigidas nas migrations 137 e<br>141: cada função com permissão elevada precisa revogar o acesso ou verificar quem chama. *(fonte: inventário: privilegios_padrao, supabase/migrations/141_fix_funcoes_sem_verificacao.sql)* |
| `postgres` | `public` | sequencia | postgres=rwU/postgres, anon=rwU/postgres, authenticated=rwU/postgres, service_role=rwU/postgres | módulo **core** — Toda sequência nova do esquema `public` nasce utilizável por `anon`, `authenticated` e<br>`service_role`. Produção não tem sequência no esquema `public` (os ids são UUID). *(fonte: inventário: privilegios_padrao)* |
| `postgres` | `public` | tabela | postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres | módulo **core** — Toda tabela nova do esquema `public` nasce com todos os privilégios para `anon`, `authenticated`<br>e `service_role`. É o padrão do Supabase: quem protege os dados são as regras de acesso por<br>linha, e tabela criada sem ativá-las fica aberta a qualquer um, até sem login. No sistema novo, o<br>acesso é negado por padrão. *(fonte: inventário: privilegios_padrao)* |
| `postgres` | `storage` | funcao | postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres | fora do escopo: **plataforma** — Privilégio padrão do esquema storage, da plataforma Supabase. |
| `postgres` | `storage` | sequencia | postgres=rwU/postgres, anon=rwU/postgres, authenticated=rwU/postgres, service_role=rwU/postgres | fora do escopo: **plataforma** — Privilégio padrão do esquema storage, da plataforma Supabase. |
| `postgres` | `storage` | tabela | postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres | fora do escopo: **plataforma** — Privilégio padrão do esquema storage, da plataforma Supabase. |
| `supabase_admin` | `extensions` | funcao | postgres=X*/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema extensions, da plataforma Supabase. |
| `supabase_admin` | `extensions` | sequencia | postgres=r*w*U*/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema extensions, da plataforma Supabase. |
| `supabase_admin` | `extensions` | tabela | postgres=a*r*w*d*D*x*t*m*/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema extensions, da plataforma Supabase. |
| `supabase_admin` | `graphql` | funcao | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema graphql, da plataforma Supabase. |
| `supabase_admin` | `graphql` | sequencia | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema graphql, da plataforma Supabase. |
| `supabase_admin` | `graphql` | tabela | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema graphql, da plataforma Supabase. |
| `supabase_admin` | `graphql_public` | funcao | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema graphql_public, da plataforma Supabase. |
| `supabase_admin` | `graphql_public` | sequencia | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema graphql_public, da plataforma Supabase. |
| `supabase_admin` | `graphql_public` | tabela | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema graphql_public, da plataforma Supabase. |
| `supabase_admin` | `realtime` | funcao | postgres=X/supabase_admin, dashboard_user=X/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema realtime, da plataforma Supabase. |
| `supabase_admin` | `realtime` | sequencia | postgres=rwU/supabase_admin, dashboard_user=rwU/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema realtime, da plataforma Supabase. |
| `supabase_admin` | `realtime` | tabela | postgres=a*r*wdDxtm/supabase_admin, dashboard_user=arwdDxtm/supabase_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema realtime, da plataforma Supabase. |
| `supabase_auth_admin` | `auth` | funcao | postgres=X/supabase_auth_admin, dashboard_user=X/supabase_auth_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema auth, da plataforma Supabase. |
| `supabase_auth_admin` | `auth` | sequencia | postgres=rwU/supabase_auth_admin, dashboard_user=rwU/supabase_auth_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema auth, da plataforma Supabase. |
| `supabase_auth_admin` | `auth` | tabela | postgres=arwdDxtm/supabase_auth_admin, dashboard_user=arwdDxtm/supabase_auth_admin | fora do escopo: **plataforma** — Privilégio padrão do esquema auth, da plataforma Supabase. |

## Privilégios por coluna

_Nenhum privilégio de coluna diferente do da tabela._

## Segredos guardados no banco (só os nomes)

- **RELATORIOS_INVOKE_APIKEY** — usado por: [kick_relatorios_worker](funcoes/kick_relatorios_worker.md). Chave pública do projeto, guardada no cofre para que `kick_relatorios_worker` chame o worker de
relatórios por HTTP. Criada à mão em cada projeto (o cofre não é copiado entre projetos). Sem
ela, o disparo não acontece e o pedido de relatório fica na fila até o worker ser disparado de
novo. *(fonte: funcao:kick_relatorios_worker(p_job_id uuid, p_limit integer), supabase/migrations/132_kick_relatorios_worker.sql:10)*
- **RELATORIOS_WORKER_SECRET** — usado por: [kick_relatorios_worker](funcoes/kick_relatorios_worker.md). Segredo compartilhado entre o banco e o worker de relatórios: `kick_relatorios_worker` o envia no
cabeçalho `x-worker-secret`, e o worker o compara com o segredo de mesmo nome da edge function.
Quando o worker não tem o segredo configurado, aceita só admin logado. *(fonte: funcao:kick_relatorios_worker(p_job_id uuid, p_limit integer), supabase/migrations/132_kick_relatorios_worker.sql:10, supabase/functions/relatorios_worker/index.ts:2534)*

## Extensões

- `pg_net` 0.20.4 (esquema extensions) — módulo **fiscalizacao** — Chamadas HTTP de dentro do banco. Usada só por `kick_relatorios_worker`, para disparar o worker
de relatórios logo depois do pedido. No sistema novo, a fila de tarefas faz esse papel. *(fonte: funcao:kick_relatorios_worker(p_job_id uuid, p_limit integer), supabase/migrations/132_kick_relatorios_worker.sql:18)*
- `pg_stat_statements` 1.11 (esquema extensions) — fora do escopo: **plataforma** — Estatísticas de consultas do painel do Supabase. A aplicação não a usa.
- `pgcrypto` 1.3 (esquema extensions) — fora do escopo: **plataforma** — Instalada por padrão no Supabase. Nenhuma função, coluna ou política da aplicação a usa.
- `plpgsql` 1.0 (esquema pg_catalog) — fora do escopo: **plataforma** — Linguagem das funções do banco, parte do Postgres. O sistema novo leva as regras para o Django.
- `supabase_vault` 0.3.1 (esquema vault) — módulo **fiscalizacao** — Cofre de segredos criptografados do banco. Guarda os dois segredos do disparo do worker de
relatórios. No sistema novo, segredos ficam na configuração do servidor. *(fonte: segredo:RELATORIOS_INVOKE_APIKEY, segredo:RELATORIOS_WORKER_SECRET)*
- `uuid-ossp` 1.1 (esquema extensions) — módulo **core** — Geração de UUID no banco (`uuid_generate_v4`), padrão da chave de 23 colunas criadas nas
primeiras migrations; as mais novas usam `gen_random_uuid`, nativo. Os ids normalmente vêm do
aparelho, e o padrão do banco só vale quando o registro chega sem id. *(fonte: coluna:fiscalizacoes.id, supabase/migrations/001_initial_schema.sql:17)*

## Event triggers

- `issue_graphql_placeholder` (sql_drop) → `extensions.set_graphql_placeholder` — fora do escopo: **plataforma** — Recria o marcador da API GraphQL do Supabase quando a extensão é removida. A aplicação não usa GraphQL.
- `issue_pg_cron_access` (ddl_command_end) → `extensions.grant_pg_cron_access` — fora do escopo: **plataforma** — Concede acesso ao agendador pg_cron quando a extensão é criada. Produção não tem pg_cron nem agendamentos.
- `issue_pg_graphql_access` (ddl_command_end) → `extensions.grant_pg_graphql_access` — fora do escopo: **plataforma** — Concede acesso à API GraphQL quando a extensão é criada. A aplicação não usa GraphQL.
- `issue_pg_net_access` (ddl_command_end) → `extensions.grant_pg_net_access` — fora do escopo: **plataforma** — Concede acesso a pg_net quando a extensão é criada. A aplicação usa pg_net (ver acesso.toml), mas este gatilho é da plataforma.
- `pgrst_ddl_watch` (ddl_command_end) → `extensions.pgrst_ddl_watch` — fora do escopo: **plataforma** — Avisa a API REST (PostgREST) para recarregar o esquema depois de mudanças de estrutura. No sistema novo, a API é o Django.
- `pgrst_drop_watch` (sql_drop) → `extensions.pgrst_drop_watch` — fora do escopo: **plataforma** — Avisa a API REST (PostgREST) para recarregar o esquema depois de remoções. No sistema novo, a API é o Django.

## Gatilhos em tabelas da plataforma

- `auth.users.on_auth_user_created` → [handle_new_user](funcoes/handle_new_user.md) — módulo **core** — Depois de cada conta nova criada no serviço de autenticação, chama `handle_new_user`, que cria o
perfil inativo com nome, papel pedido e vínculos escolhidos na tela de cadastro. É a única forma
de um perfil nascer. No sistema novo, o cadastro cria conta e perfil juntos. *(fonte: funcao:handle_new_user(), src/pages/Register.jsx:103)*
  - Definição: `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()`
