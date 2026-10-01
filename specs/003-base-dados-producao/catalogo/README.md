<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Catálogo do banco de produção

Inventário de 2026-09-29T17:09:53.583234+00:00 · 1264 objetos.

Páginas gerais: [repositórios de arquivos](arquivos.md) · [controle de acesso](acesso.md) · [tipos](tipos.md) · [informações fora do banco](externos.md)

## Objetos por tipo

| Tipo | Total | Sem anotação |
|---|---:|---:|
| Tabelas | 36 | 0 |
| Views | 1 | 0 |
| Colunas | 457 | 0 |
| Restrições | 118 | — |
| Índices | 83 | — |
| Funções | 44 | 0 |
| Gatilhos | 33 | 0 |
| Políticas de acesso | 166 | 0 |
| Tipos | 5 | 0 |
| Repositórios de arquivos | 8 | 0 |
| Papéis | 17 | 0 |
| Privilégios | 261 | — |
| Privilégios padrão | 21 | 0 |
| Segredos (nomes) | 2 | 0 |
| Event triggers | 6 | 0 |
| Extensões | 6 | 0 |

## Completude

Completude: 0 objetos sem anotação | 0 sem dono | 0 divergências não classificadas | 0 violações de ordem | 0 achados aguardando decisão | 0 sem destino de migração | 1 módulos sem mapa de migração

## Por módulo

### core

Tabelas e views: [audit_logs](tabelas/audit_logs.md) · [camaras_tecnicas](tabelas/camaras_tecnicas.md) · [contratos](tabelas/contratos.md) · [diretorias](tabelas/diretorias.md) · [municipios](tabelas/municipios.md) · [prestadores_servico](tabelas/prestadores_servico.md) · [profiles](tabelas/profiles.md)

Funções: [admin_delete_user](funcoes/admin_delete_user.md) · [admin_delete_user_by_email](funcoes/admin_delete_user_by_email.md) · [camara_from_servicos](funcoes/camara_from_servicos.md) · [can_access_camara](funcoes/can_access_camara.md) · [current_prestador_servico_id](funcoes/current_prestador_servico_id.md) · [current_role](funcoes/current_role.md) · [e_chave_de_servico](funcoes/e_chave_de_servico.md) · [enforce_profile_security](funcoes/enforce_profile_security.md) · [get_my_camara_tecnica](funcoes/get_my_camara_tecnica.md) · [get_my_diretoria](funcoes/get_my_diretoria.md) · [get_my_prestador_id](funcoes/get_my_prestador_id.md) · [get_my_role](funcoes/get_my_role.md) · [handle_new_user](funcoes/handle_new_user.md) · [is_caters_user](funcoes/is_caters_user.md) · [is_staff](funcoes/is_staff.md) · [prestadores_para_cadastro](funcoes/prestadores_para_cadastro.md) · [process_audit_log](funcoes/process_audit_log.md) · [update_updated_at_column](funcoes/update_updated_at_column.md)

### checklists

Tabelas e views: [itens_checklist](tabelas/itens_checklist.md) · [tipos_ocorrencia_dtr](tabelas/tipos_ocorrencia_dtr.md) · [tipos_unidade](tabelas/tipos_unidade.md)

### fiscalizacao

Tabelas e views: [constatacoes_manuais](tabelas/constatacoes_manuais.md) · [determinacoes](tabelas/determinacoes.md) · [fiscalizacoes](tabelas/fiscalizacoes.md) · [fotos_evidencia](tabelas/fotos_evidencia.md) · [nao_conformidades](tabelas/nao_conformidades.md) · [recomendacoes](tabelas/recomendacoes.md) · [relatorios_jobs](tabelas/relatorios_jobs.md) · [respostas_checklist](tabelas/respostas_checklist.md) · [unidades_fiscalizadas](tabelas/unidades_fiscalizadas.md)

Funções: [claim_relatorios_jobs](funcoes/claim_relatorios_jobs.md) · [determinacoes_fill_origem](funcoes/determinacoes_fill_origem.md) · [finalizar_fiscalizacao](funcoes/finalizar_fiscalizacao.md) · [gerar_ncs_unidade](funcoes/gerar_ncs_unidade.md) · [kick_relatorios_worker](funcoes/kick_relatorios_worker.md) · [obter_resumo_indicadores](funcoes/obter_resumo_indicadores.md) · [propagate_modification_to_parent](funcoes/propagate_modification_to_parent.md) · [reabrir_fiscalizacao](funcoes/reabrir_fiscalizacao.md) · [set_fiscalizacao_cache_fields](funcoes/set_fiscalizacao_cache_fields.md) · [set_fiscalizacao_last_modified](funcoes/set_fiscalizacao_last_modified.md) · [trg_fiscalizacao_set_camara](funcoes/trg_fiscalizacao_set_camara.md)

### processo_sancionador

Tabelas e views: [autos_infracao](tabelas/autos_infracao.md) · [julgamentos](tabelas/julgamentos.md) · [manifestacoes_auto](tabelas/manifestacoes_auto.md) · [pareceres_tecnicos](tabelas/pareceres_tecnicos.md) · [remessas_ai](tabelas/remessas_ai.md) · [remessas_ai_itens](tabelas/remessas_ai_itens.md) · [respostas_determinacao](tabelas/respostas_determinacao.md) · [termos_notificacao](tabelas/termos_notificacao.md)

Funções: [gerar_numero_am](funcoes/gerar_numero_am.md) · [gerar_numero_auto](funcoes/gerar_numero_auto.md) · [proteger_resposta_determinacao_prestador](funcoes/proteger_resposta_determinacao_prestador.md) · [proteger_termo_prestador](funcoes/proteger_termo_prestador.md) · [set_termos_notificacao_ano_geracao](funcoes/set_termos_notificacao_ano_geracao.md) · [trg_auto_set_camara](funcoes/trg_auto_set_camara.md) · [trg_remessa_set_camara](funcoes/trg_remessa_set_camara.md)

### caters

Tabelas e views: [caters_analysis_history](tabelas/caters_analysis_history.md) · [caters_deadline_extensions](tabelas/caters_deadline_extensions.md) · [caters_extra_documents](tabelas/caters_extra_documents.md) · [caters_fiscalizacoes_disponiveis](tabelas/caters_fiscalizacoes_disponiveis.md) · [caters_municipality_responses](tabelas/caters_municipality_responses.md) · [caters_notification_reads](tabelas/caters_notification_reads.md) · [caters_processes](tabelas/caters_processes.md) · [caters_recommendations](tabelas/caters_recommendations.md)

Funções: [caters_import_from_fiscalizacao](funcoes/caters_import_from_fiscalizacao.md) · [caters_set_updated_at](funcoes/caters_set_updated_at.md)

### portal_prestador

Funções: [can_access_fiscalizacao](funcoes/can_access_fiscalizacao.md) · [can_access_unidade](funcoes/can_access_unidade.md)

### fora do escopo: descartar

Tabelas e views: [caters_ai_jobs](tabelas/caters_ai_jobs.md) · [catesa_ai_jobs](tabelas/catesa_ai_jobs.md)

Funções: [catesa_ai_jobs_set_updated_at](funcoes/catesa_ai_jobs_set_updated_at.md) · [claim_caters_ai_jobs](funcoes/claim_caters_ai_jobs.md) · [claim_catesa_ai_jobs](funcoes/claim_catesa_ai_jobs.md)

## Anotações marcadas como hipótese (para revisão)

- `coluna:autos_infracao.resposta_determinacao_id` (tabelas/autos_infracao.toml)
- `coluna:autos_infracao.valor` (tabelas/autos_infracao.toml)
- `coluna:caters_ai_jobs.input_text` (tabelas/caters_ai_jobs.toml)
- `coluna:caters_analysis_history.new_fatal_date` (tabelas/caters_analysis_history.toml)
- `coluna:caters_analysis_history.related_document_url` (tabelas/caters_analysis_history.toml)
- `coluna:caters_processes.observations` (tabelas/caters_processes.toml)
- `coluna:caters_recommendations.evidence_url` (tabelas/caters_recommendations.toml)
- `coluna:constatacoes_manuais.ordem` (tabelas/constatacoes_manuais.toml)
- `coluna:determinacoes.prazo` (tabelas/determinacoes.toml)
- `coluna:itens_checklist.created_by` (tabelas/itens_checklist.toml)
- `coluna:itens_checklist.created_by_id` (tabelas/itens_checklist.toml)
- `coluna:itens_checklist.created_date` (tabelas/itens_checklist.toml)
- `coluna:itens_checklist.is_sample` (tabelas/itens_checklist.toml)
- `coluna:itens_checklist.updated_date` (tabelas/itens_checklist.toml)
- `coluna:nao_conformidades.latitude_foto` (tabelas/nao_conformidades.toml)
- `coluna:nao_conformidades.longitude_foto` (tabelas/nao_conformidades.toml)
- `coluna:pareceres_tecnicos.analise_tecnica` (tabelas/pareceres_tecnicos.toml)
- `coluna:pareceres_tecnicos.recomendacao` (tabelas/pareceres_tecnicos.toml)
- `coluna:pareceres_tecnicos.valor_multa_sugerido` (tabelas/pareceres_tecnicos.toml)
- `coluna:prestadores_servico.tipo` (tabelas/prestadores_servico.toml)
- `coluna:remessas_ai.arquivo_parecer_assinado_url` (tabelas/remessas_ai.toml)
- `coluna:remessas_ai.arquivo_recebimento_assinado_url` (tabelas/remessas_ai.toml)
- `coluna:respostas_checklist.comentario` (tabelas/respostas_checklist.toml)
- `coluna:respostas_determinacao.resposta` (tabelas/respostas_determinacao.toml)
- `coluna:respostas_determinacao.tipo_resposta` (tabelas/respostas_determinacao.toml)
- `coluna:termos_notificacao.observacoes` (tabelas/termos_notificacao.toml)
- `coluna:unidades_fiscalizadas.tipo_unidade_nome` (tabelas/unidades_fiscalizadas.toml)
