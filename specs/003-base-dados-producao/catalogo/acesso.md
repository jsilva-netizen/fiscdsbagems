<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Controle de acesso fora das políticas

## Papéis do banco

| Papel | Superusuário | Faz login | Ignora RLS | Membro de | Dono / finalidade |
|---|:---:|:---:|:---:|---|---|
| `anon` |  |  |  |  | **sem dono** (lacuna) |
| `authenticated` |  |  |  |  | **sem dono** (lacuna) |
| `authenticator` |  | sim |  | anon, authenticated, service_role | **sem dono** (lacuna) |
| `cli_login_postgres` |  | sim |  | postgres | **sem dono** (lacuna) |
| `dashboard_user` |  |  |  |  | **sem dono** (lacuna) |
| `pgbouncer` |  | sim |  |  | **sem dono** (lacuna) |
| `postgres` |  | sim | **sim** | anon, authenticated, authenticator, pg_create_subscription, pg_monitor, pg_read_all_data, pg_signal_backend, service_role, supabase_privileged_role | **sem dono** (lacuna) |
| `service_role` |  |  | **sim** |  | **sem dono** (lacuna) |
| `supabase_admin` | sim | sim | **sim** |  | **sem dono** (lacuna) |
| `supabase_auth_admin` |  | sim |  |  | **sem dono** (lacuna) |
| `supabase_etl_admin` |  | sim | **sim** | pg_monitor, pg_read_all_data, supabase_privileged_role | **sem dono** (lacuna) |
| `supabase_functions_admin` |  | sim |  |  | **sem dono** (lacuna) |
| `supabase_privileged_role` |  |  |  |  | **sem dono** (lacuna) |
| `supabase_read_only_user` |  | sim | **sim** | pg_monitor, pg_read_all_data | **sem dono** (lacuna) |
| `supabase_realtime_admin` |  |  |  |  | **sem dono** (lacuna) |
| `supabase_replication_admin` |  | sim |  |  | **sem dono** (lacuna) |
| `supabase_storage_admin` |  | sim |  | authenticator | **sem dono** (lacuna) |

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
| [caters_fiscalizacoes_disponiveis](tabelas/caters_fiscalizacoes_disponiveis.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_municipality_responses](tabelas/caters_municipality_responses.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_notification_reads](tabelas/caters_notification_reads.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_processes](tabelas/caters_processes.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
| [caters_recommendations](tabelas/caters_recommendations.md) | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE | DELETE,INSERT,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE |  |
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
- [claim_caters_ai_jobs](funcoes/claim_caters_ai_jobs.md)
- [claim_relatorios_jobs](funcoes/claim_relatorios_jobs.md)
- [current_prestador_servico_id](funcoes/current_prestador_servico_id.md)
- [current_role](funcoes/current_role.md)
- [determinacoes_fill_origem](funcoes/determinacoes_fill_origem.md)
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
- [kick_relatorios_worker](funcoes/kick_relatorios_worker.md)
- [obter_resumo_indicadores](funcoes/obter_resumo_indicadores.md)
- [process_audit_log](funcoes/process_audit_log.md)
- [propagate_modification_to_parent](funcoes/propagate_modification_to_parent.md)
- [reabrir_fiscalizacao](funcoes/reabrir_fiscalizacao.md)
- [set_fiscalizacao_cache_fields](funcoes/set_fiscalizacao_cache_fields.md)
- [set_fiscalizacao_last_modified](funcoes/set_fiscalizacao_last_modified.md)
- [set_termos_notificacao_ano_geracao](funcoes/set_termos_notificacao_ano_geracao.md)
- [trg_auto_set_camara](funcoes/trg_auto_set_camara.md)
- [trg_fiscalizacao_set_camara](funcoes/trg_fiscalizacao_set_camara.md)
- [trg_remessa_set_camara](funcoes/trg_remessa_set_camara.md)
- [update_updated_at_column](funcoes/update_updated_at_column.md)

## Privilégios padrão

| Dono | Esquema | Objeto | Privilégios |
|---|---|---|---|
| `postgres` | `public` | funcao | postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres |
| `postgres` | `public` | sequencia | postgres=rwU/postgres, anon=rwU/postgres, authenticated=rwU/postgres, service_role=rwU/postgres |
| `postgres` | `public` | tabela | postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres |
| `postgres` | `storage` | funcao | postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres |
| `postgres` | `storage` | sequencia | postgres=rwU/postgres, anon=rwU/postgres, authenticated=rwU/postgres, service_role=rwU/postgres |
| `postgres` | `storage` | tabela | postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, service_role=arwdDxtm/postgres |
| `supabase_admin` | `extensions` | funcao | postgres=X*/supabase_admin |
| `supabase_admin` | `extensions` | sequencia | postgres=r*w*U*/supabase_admin |
| `supabase_admin` | `extensions` | tabela | postgres=a*r*w*d*D*x*t*m*/supabase_admin |
| `supabase_admin` | `graphql` | funcao | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| `supabase_admin` | `graphql` | sequencia | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| `supabase_admin` | `graphql` | tabela | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| `supabase_admin` | `graphql_public` | funcao | postgres=X/supabase_admin, anon=X/supabase_admin, authenticated=X/supabase_admin, service_role=X/supabase_admin |
| `supabase_admin` | `graphql_public` | sequencia | postgres=rwU/supabase_admin, anon=rwU/supabase_admin, authenticated=rwU/supabase_admin, service_role=rwU/supabase_admin |
| `supabase_admin` | `graphql_public` | tabela | postgres=arwdDxtm/supabase_admin, anon=arwdDxtm/supabase_admin, authenticated=arwdDxtm/supabase_admin, service_role=arwdDxtm/supabase_admin |
| `supabase_admin` | `realtime` | funcao | postgres=X/supabase_admin, dashboard_user=X/supabase_admin |
| `supabase_admin` | `realtime` | sequencia | postgres=rwU/supabase_admin, dashboard_user=rwU/supabase_admin |
| `supabase_admin` | `realtime` | tabela | postgres=a*r*wdDxtm/supabase_admin, dashboard_user=arwdDxtm/supabase_admin |
| `supabase_auth_admin` | `auth` | funcao | postgres=X/supabase_auth_admin, dashboard_user=X/supabase_auth_admin |
| `supabase_auth_admin` | `auth` | sequencia | postgres=rwU/supabase_auth_admin, dashboard_user=rwU/supabase_auth_admin |
| `supabase_auth_admin` | `auth` | tabela | postgres=arwdDxtm/supabase_auth_admin, dashboard_user=arwdDxtm/supabase_auth_admin |

## Privilégios por coluna

_Nenhum privilégio de coluna diferente do da tabela._

## Segredos guardados no banco (só os nomes)

- **RELATORIOS_INVOKE_APIKEY** — usado por: [kick_relatorios_worker](funcoes/kick_relatorios_worker.md). _Sem anotação._
- **RELATORIOS_WORKER_SECRET** — usado por: [kick_relatorios_worker](funcoes/kick_relatorios_worker.md). _Sem anotação._

## Extensões

- `pg_net` 0.20.4 (esquema extensions) — **sem dono** (lacuna)
- `pg_stat_statements` 1.11 (esquema extensions) — **sem dono** (lacuna)
- `pgcrypto` 1.3 (esquema extensions) — **sem dono** (lacuna)
- `plpgsql` 1.0 (esquema pg_catalog) — **sem dono** (lacuna)
- `supabase_vault` 0.3.1 (esquema vault) — **sem dono** (lacuna)
- `uuid-ossp` 1.1 (esquema extensions) — **sem dono** (lacuna)

## Event triggers

- `issue_graphql_placeholder` (sql_drop) → `extensions.set_graphql_placeholder` — **sem dono** (lacuna)
- `issue_pg_cron_access` (ddl_command_end) → `extensions.grant_pg_cron_access` — **sem dono** (lacuna)
- `issue_pg_graphql_access` (ddl_command_end) → `extensions.grant_pg_graphql_access` — **sem dono** (lacuna)
- `issue_pg_net_access` (ddl_command_end) → `extensions.grant_pg_net_access` — **sem dono** (lacuna)
- `pgrst_ddl_watch` (ddl_command_end) → `extensions.pgrst_ddl_watch` — **sem dono** (lacuna)
- `pgrst_drop_watch` (sql_drop) → `extensions.pgrst_drop_watch` — **sem dono** (lacuna)
