<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Catálogo do banco de produção

Inventário de 2026-09-28T13:32:10.472969+00:00 · 1230 objetos.

Páginas gerais: [repositórios de arquivos](arquivos.md) · [controle de acesso](acesso.md) · [tipos](tipos.md) · [informações fora do banco](externos.md)

## Objetos por tipo

| Tipo | Total | Sem anotação |
|---|---:|---:|
| Tabelas | 35 | 28 |
| Views | 1 | 1 |
| Colunas | 446 | 385 |
| Restrições | 113 | — |
| Índices | 80 | — |
| Funções | 38 | 20 |
| Gatilhos | 30 | 27 |
| Políticas de acesso | 173 | 152 |
| Tipos | 5 | 5 |
| Repositórios de arquivos | 8 | 8 |
| Papéis | 17 | 17 |
| Privilégios | 249 | — |
| Privilégios padrão | 21 | 21 |
| Segredos (nomes) | 2 | 2 |
| Event triggers | 6 | 6 |
| Extensões | 6 | 6 |

## Completude

Completude: 678 objetos sem anotação | 995 sem dono | 0 divergências não classificadas | 0 violações de ordem | 0 achados aguardando decisão

## Por módulo

### core

Tabelas e views: [audit_logs](tabelas/audit_logs.md) · [camaras_tecnicas](tabelas/camaras_tecnicas.md) · [contratos](tabelas/contratos.md) · [diretorias](tabelas/diretorias.md) · [municipios](tabelas/municipios.md) · [prestadores_servico](tabelas/prestadores_servico.md) · [profiles](tabelas/profiles.md)

Funções: [admin_delete_user](funcoes/admin_delete_user.md) · [admin_delete_user_by_email](funcoes/admin_delete_user_by_email.md) · [camara_from_servicos](funcoes/camara_from_servicos.md) · [can_access_camara](funcoes/can_access_camara.md) · [can_access_fiscalizacao](funcoes/can_access_fiscalizacao.md) · [can_access_unidade](funcoes/can_access_unidade.md) · [current_prestador_servico_id](funcoes/current_prestador_servico_id.md) · [current_role](funcoes/current_role.md) · [enforce_profile_security](funcoes/enforce_profile_security.md) · [get_my_camara_tecnica](funcoes/get_my_camara_tecnica.md) · [get_my_diretoria](funcoes/get_my_diretoria.md) · [get_my_prestador_id](funcoes/get_my_prestador_id.md) · [get_my_role](funcoes/get_my_role.md) · [handle_new_user](funcoes/handle_new_user.md) · [is_caters_user](funcoes/is_caters_user.md) · [is_staff](funcoes/is_staff.md) · [process_audit_log](funcoes/process_audit_log.md) · [update_updated_at_column](funcoes/update_updated_at_column.md)

### sem dono (lacuna)

Tabelas e views: [autos_infracao](tabelas/autos_infracao.md) · [caters_ai_jobs](tabelas/caters_ai_jobs.md) · [caters_analysis_history](tabelas/caters_analysis_history.md) · [caters_deadline_extensions](tabelas/caters_deadline_extensions.md) · [caters_extra_documents](tabelas/caters_extra_documents.md) · [caters_fiscalizacoes_disponiveis](tabelas/caters_fiscalizacoes_disponiveis.md) · [caters_municipality_responses](tabelas/caters_municipality_responses.md) · [caters_notification_reads](tabelas/caters_notification_reads.md) · [caters_processes](tabelas/caters_processes.md) · [caters_recommendations](tabelas/caters_recommendations.md) · [constatacoes_manuais](tabelas/constatacoes_manuais.md) · [determinacoes](tabelas/determinacoes.md) · [fiscalizacoes](tabelas/fiscalizacoes.md) · [fotos_evidencia](tabelas/fotos_evidencia.md) · [itens_checklist](tabelas/itens_checklist.md) · [julgamentos](tabelas/julgamentos.md) · [manifestacoes_auto](tabelas/manifestacoes_auto.md) · [nao_conformidades](tabelas/nao_conformidades.md) · [pareceres_tecnicos](tabelas/pareceres_tecnicos.md) · [recomendacoes](tabelas/recomendacoes.md) · [relatorios_jobs](tabelas/relatorios_jobs.md) · [remessas_ai](tabelas/remessas_ai.md) · [remessas_ai_itens](tabelas/remessas_ai_itens.md) · [respostas_checklist](tabelas/respostas_checklist.md) · [respostas_determinacao](tabelas/respostas_determinacao.md) · [termos_notificacao](tabelas/termos_notificacao.md) · [tipos_ocorrencia_dtr](tabelas/tipos_ocorrencia_dtr.md) · [tipos_unidade](tabelas/tipos_unidade.md) · [unidades_fiscalizadas](tabelas/unidades_fiscalizadas.md)

Funções: [caters_import_from_fiscalizacao](funcoes/caters_import_from_fiscalizacao.md) · [caters_set_updated_at](funcoes/caters_set_updated_at.md) · [claim_caters_ai_jobs](funcoes/claim_caters_ai_jobs.md) · [claim_relatorios_jobs](funcoes/claim_relatorios_jobs.md) · [determinacoes_fill_origem](funcoes/determinacoes_fill_origem.md) · [finalizar_fiscalizacao](funcoes/finalizar_fiscalizacao.md) · [gerar_ncs_unidade](funcoes/gerar_ncs_unidade.md) · [gerar_numero_am](funcoes/gerar_numero_am.md) · [gerar_numero_auto](funcoes/gerar_numero_auto.md) · [kick_relatorios_worker](funcoes/kick_relatorios_worker.md) · [obter_resumo_indicadores](funcoes/obter_resumo_indicadores.md) · [propagate_modification_to_parent](funcoes/propagate_modification_to_parent.md) · [reabrir_fiscalizacao](funcoes/reabrir_fiscalizacao.md) · [set_fiscalizacao_cache_fields](funcoes/set_fiscalizacao_cache_fields.md) · [set_fiscalizacao_last_modified](funcoes/set_fiscalizacao_last_modified.md) · [set_termos_notificacao_ano_geracao](funcoes/set_termos_notificacao_ano_geracao.md) · [trg_auto_set_camara](funcoes/trg_auto_set_camara.md) · [trg_fiscalizacao_set_camara](funcoes/trg_fiscalizacao_set_camara.md) · [trg_remessa_set_camara](funcoes/trg_remessa_set_camara.md)

## Anotações marcadas como hipótese (para revisão)

- `coluna:prestadores_servico.tipo` (tabelas/prestadores_servico.toml)
