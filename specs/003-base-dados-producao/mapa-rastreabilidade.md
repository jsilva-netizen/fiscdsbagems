<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Mapa de rastreabilidade

Cada objeto do banco de produção, com o módulo dono (ou a classificação fora do escopo) e a spec do módulo que o descreve. `LACUNA` quer dizer que o módulo ainda não tem spec.

| Total | Com dono | Fora do escopo | Sem atribuição | Em lacuna |
|---:|---:|---:|---:|---:|
| 1264 | 1223 | 41 | 0 | 1223 |

Sem atribuição: nenhum objeto.

| Chave | Tipo | Dono | Spec |
|---|---|---|---|
| `tabela:audit_logs` | tabela | core | LACUNA |
| `tabela:camaras_tecnicas` | tabela | core | LACUNA |
| `tabela:contratos` | tabela | core | LACUNA |
| `tabela:diretorias` | tabela | core | LACUNA |
| `tabela:municipios` | tabela | core | LACUNA |
| `tabela:prestadores_servico` | tabela | core | LACUNA |
| `tabela:profiles` | tabela | core | LACUNA |
| `coluna:audit_logs.action` | coluna | core | LACUNA |
| `coluna:audit_logs.created_at` | coluna | core | LACUNA |
| `coluna:audit_logs.id` | coluna | core | LACUNA |
| `coluna:audit_logs.new_data` | coluna | core | LACUNA |
| `coluna:audit_logs.old_data` | coluna | core | LACUNA |
| `coluna:audit_logs.record_id` | coluna | core | LACUNA |
| `coluna:audit_logs.table_name` | coluna | core | LACUNA |
| `coluna:audit_logs.user_email` | coluna | core | LACUNA |
| `coluna:audit_logs.user_id` | coluna | core | LACUNA |
| `coluna:camaras_tecnicas.diretoria_id` | coluna | core | LACUNA |
| `coluna:camaras_tecnicas.id` | coluna | core | LACUNA |
| `coluna:camaras_tecnicas.nome` | coluna | core | LACUNA |
| `coluna:contratos.ativo` | coluna | core | LACUNA |
| `coluna:contratos.created_at` | coluna | core | LACUNA |
| `coluna:contratos.id` | coluna | core | LACUNA |
| `coluna:contratos.numero_contrato` | coluna | core | LACUNA |
| `coluna:contratos.prestador_servico_id` | coluna | core | LACUNA |
| `coluna:contratos.updated_at` | coluna | core | LACUNA |
| `coluna:diretorias.id` | coluna | core | LACUNA |
| `coluna:diretorias.nome` | coluna | core | LACUNA |
| `coluna:municipios.codigo_ibge` | coluna | core | LACUNA |
| `coluna:municipios.created_at` | coluna | core | LACUNA |
| `coluna:municipios.id` | coluna | core | LACUNA |
| `coluna:municipios.nome` | coluna | core | LACUNA |
| `coluna:prestadores_servico.ativo` | coluna | core | LACUNA |
| `coluna:prestadores_servico.cargo` | coluna | core | LACUNA |
| `coluna:prestadores_servico.cep` | coluna | core | LACUNA |
| `coluna:prestadores_servico.cidade` | coluna | core | LACUNA |
| `coluna:prestadores_servico.cnpj` | coluna | core | LACUNA |
| `coluna:prestadores_servico.created_at` | coluna | core | LACUNA |
| `coluna:prestadores_servico.documentos` | coluna | core | LACUNA |
| `coluna:prestadores_servico.email_contato` | coluna | core | LACUNA |
| `coluna:prestadores_servico.endereco` | coluna | core | LACUNA |
| `coluna:prestadores_servico.estado` | coluna | core | LACUNA |
| `coluna:prestadores_servico.id` | coluna | core | LACUNA |
| `coluna:prestadores_servico.logo_url` | coluna | core | LACUNA |
| `coluna:prestadores_servico.nome` | coluna | core | LACUNA |
| `coluna:prestadores_servico.observacoes` | coluna | core | LACUNA |
| `coluna:prestadores_servico.razao_social` | coluna | core | LACUNA |
| `coluna:prestadores_servico.responsavel` | coluna | core | LACUNA |
| `coluna:prestadores_servico.status` | coluna | core | LACUNA |
| `coluna:prestadores_servico.telefone` | coluna | core | LACUNA |
| `coluna:prestadores_servico.tipo` | coluna | core | LACUNA |
| `coluna:prestadores_servico.tipo_entidade` | coluna | core | LACUNA |
| `coluna:prestadores_servico.tipo_servico` | coluna | core | LACUNA |
| `coluna:prestadores_servico.updated_at` | coluna | core | LACUNA |
| `coluna:prestadores_servico.user_id` | coluna | core | LACUNA |
| `coluna:prestadores_servico.website` | coluna | core | LACUNA |
| `coluna:profiles.ativo` | coluna | core | LACUNA |
| `coluna:profiles.camara_tecnica_id` | coluna | core | LACUNA |
| `coluna:profiles.created_at` | coluna | core | LACUNA |
| `coluna:profiles.diretoria_id` | coluna | core | LACUNA |
| `coluna:profiles.email` | coluna | core | LACUNA |
| `coluna:profiles.full_name` | coluna | core | LACUNA |
| `coluna:profiles.id` | coluna | core | LACUNA |
| `coluna:profiles.prestador_servico_id` | coluna | core | LACUNA |
| `coluna:profiles.role` | coluna | core | LACUNA |
| `coluna:profiles.updated_at` | coluna | core | LACUNA |
| `restricao:audit_logs.audit_logs_pkey` | restricao | core | LACUNA |
| `restricao:audit_logs.audit_logs_user_id_fkey` | restricao | core | LACUNA |
| `restricao:camaras_tecnicas.camaras_tecnicas_diretoria_id_fkey` | restricao | core | LACUNA |
| `restricao:camaras_tecnicas.camaras_tecnicas_pkey` | restricao | core | LACUNA |
| `restricao:contratos.contratos_pkey` | restricao | core | LACUNA |
| `restricao:contratos.contratos_prestador_servico_id_fkey` | restricao | core | LACUNA |
| `restricao:diretorias.diretorias_pkey` | restricao | core | LACUNA |
| `restricao:municipios.municipios_nome_key` | restricao | core | LACUNA |
| `restricao:municipios.municipios_pkey` | restricao | core | LACUNA |
| `restricao:prestadores_servico.prestadores_servico_pkey` | restricao | core | LACUNA |
| `restricao:prestadores_servico.prestadores_servico_user_id_fkey` | restricao | core | LACUNA |
| `restricao:profiles.profiles_camara_tecnica_id_fkey` | restricao | core | LACUNA |
| `restricao:profiles.profiles_diretoria_id_fkey` | restricao | core | LACUNA |
| `restricao:profiles.profiles_id_fkey` | restricao | core | LACUNA |
| `restricao:profiles.profiles_non_prestador_must_not_have_prestador_id` | restricao | core | LACUNA |
| `restricao:profiles.profiles_pkey` | restricao | core | LACUNA |
| `restricao:profiles.profiles_prestador_must_have_prestador_id` | restricao | core | LACUNA |
| `restricao:profiles.profiles_prestador_servico_id_fkey` | restricao | core | LACUNA |
| `indice:audit_logs_created_at_idx` | indice | core | LACUNA |
| `indice:audit_logs_pkey` | indice | core | LACUNA |
| `indice:audit_logs_table_name_record_id_idx` | indice | core | LACUNA |
| `indice:audit_logs_user_id_idx` | indice | core | LACUNA |
| `indice:camaras_tecnicas_pkey` | indice | core | LACUNA |
| `indice:contratos_pkey` | indice | core | LACUNA |
| `indice:diretorias_pkey` | indice | core | LACUNA |
| `indice:municipios_nome_key` | indice | core | LACUNA |
| `indice:municipios_pkey` | indice | core | LACUNA |
| `indice:prestadores_servico_pkey` | indice | core | LACUNA |
| `indice:profiles_pkey` | indice | core | LACUNA |
| `indice:ux_prestadores_user_id` | indice | core | LACUNA |
| `indice:ux_profiles_prestador_servico_id` | indice | core | LACUNA |
| `funcao:admin_delete_user(p_user_id uuid)` | funcao | core | LACUNA |
| `funcao:admin_delete_user_by_email(p_email text)` | funcao | core | LACUNA |
| `funcao:camara_from_servicos(p_servicos text[])` | funcao | core | LACUNA |
| `funcao:can_access_camara(row_camara text)` | funcao | core | LACUNA |
| `funcao:current_prestador_servico_id()` | funcao | core | LACUNA |
| `funcao:current_role()` | funcao | core | LACUNA |
| `funcao:e_chave_de_servico()` | funcao | core | LACUNA |
| `funcao:enforce_profile_security()` | funcao | core | LACUNA |
| `funcao:get_my_camara_tecnica()` | funcao | core | LACUNA |
| `funcao:get_my_diretoria()` | funcao | core | LACUNA |
| `funcao:get_my_prestador_id()` | funcao | core | LACUNA |
| `funcao:get_my_role()` | funcao | core | LACUNA |
| `funcao:handle_new_user()` | funcao | core | LACUNA |
| `funcao:is_caters_user()` | funcao | core | LACUNA |
| `funcao:is_staff()` | funcao | core | LACUNA |
| `funcao:prestadores_para_cadastro()` | funcao | core | LACUNA |
| `funcao:process_audit_log()` | funcao | core | LACUNA |
| `funcao:update_updated_at_column()` | funcao | core | LACUNA |
| `gatilho:auth.users.on_auth_user_created` | gatilho | core | LACUNA |
| `gatilho:public.contratos.update_contratos_updated_at` | gatilho | core | LACUNA |
| `gatilho:public.prestadores_servico.update_prestadores_updated_at` | gatilho | core | LACUNA |
| `gatilho:public.profiles.trg_enforce_profile_security` | gatilho | core | LACUNA |
| `politica:public.audit_logs.Fiscais, Coordenadores e Admins leem logs de auditoria` | politica | core | LACUNA |
| `politica:public.camaras_tecnicas.Admins gerenciam câmaras técnicas` | politica | core | LACUNA |
| `politica:public.camaras_tecnicas.Câmaras técnicas visíveis para todos autenticados` | politica | core | LACUNA |
| `politica:public.contratos.Acesso total autenticado (DEV)` | politica | core | LACUNA |
| `politica:public.diretorias.Diretorias visíveis para todos autenticados` | politica | core | LACUNA |
| `politica:public.municipios.Leitura pública de municípios` | politica | core | LACUNA |
| `politica:public.municipios.Operadores gerenciam municípios` | politica | core | LACUNA |
| `politica:public.prestadores_servico.Leitura pública de prestadores` | politica | core | LACUNA |
| `politica:public.prestadores_servico.Operadores gerenciam prestadores` | politica | core | LACUNA |
| `politica:public.prestadores_servico.prestadores_prestador_select_own` | politica | core | LACUNA |
| `politica:public.prestadores_servico.prestadores_staff_all` | politica | core | LACUNA |
| `politica:public.profiles.Admins can delete profiles` | politica | core | LACUNA |
| `politica:public.profiles.Admins can update any profile` | politica | core | LACUNA |
| `politica:public.profiles.Admins e coordenadores gerenciam perfis` | politica | core | LACUNA |
| `politica:public.profiles.Edição Própria` | politica | core | LACUNA |
| `politica:public.profiles.Inserção Própria` | politica | core | LACUNA |
| `politica:public.profiles.Leitura pública de perfis` | politica | core | LACUNA |
| `politica:public.profiles.Usuários comuns atualizam apenas dados de contato próprios` | politica | core | LACUNA |
| `politica:public.profiles.profiles_admin_all` | politica | core | LACUNA |
| `politica:public.profiles.profiles_self_select` | politica | core | LACUNA |
| `politica:public.profiles.profiles_self_update` | politica | core | LACUNA |
| `politica:storage.objects.Storage delete authenticated` | politica | core | LACUNA |
| `politica:storage.objects.Storage insert authenticated` | politica | core | LACUNA |
| `politica:storage.objects.Storage read authenticated` | politica | core | LACUNA |
| `politica:storage.objects.Storage update authenticated` | politica | core | LACUNA |
| `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_0` | politica | core | LACUNA |
| `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_1` | politica | core | LACUNA |
| `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_2` | politica | core | LACUNA |
| `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_3` | politica | core | LACUNA |
| `politica:storage.objects.logos_entidades_authenticated_delete` | politica | core | LACUNA |
| `politica:storage.objects.logos_entidades_authenticated_insert` | politica | core | LACUNA |
| `politica:storage.objects.logos_entidades_authenticated_update` | politica | core | LACUNA |
| `politica:storage.objects.logos_entidades_public_access` | politica | core | LACUNA |
| `bucket:documentos-prestadores` | bucket | core | LACUNA |
| `bucket:logos-entidades` | bucket | core | LACUNA |
| `papel:anon` | papel | core | LACUNA |
| `papel:authenticated` | papel | core | LACUNA |
| `papel:service_role` | papel | core | LACUNA |
| `privilegio:admin_delete_user.anon` | privilegio | core | LACUNA |
| `privilegio:admin_delete_user.authenticated` | privilegio | core | LACUNA |
| `privilegio:admin_delete_user.service_role` | privilegio | core | LACUNA |
| `privilegio:admin_delete_user_by_email.anon` | privilegio | core | LACUNA |
| `privilegio:admin_delete_user_by_email.authenticated` | privilegio | core | LACUNA |
| `privilegio:admin_delete_user_by_email.service_role` | privilegio | core | LACUNA |
| `privilegio:audit_logs.anon` | privilegio | core | LACUNA |
| `privilegio:audit_logs.authenticated` | privilegio | core | LACUNA |
| `privilegio:audit_logs.service_role` | privilegio | core | LACUNA |
| `privilegio:camara_from_servicos.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:camara_from_servicos.anon` | privilegio | core | LACUNA |
| `privilegio:camara_from_servicos.authenticated` | privilegio | core | LACUNA |
| `privilegio:camara_from_servicos.service_role` | privilegio | core | LACUNA |
| `privilegio:camaras_tecnicas.anon` | privilegio | core | LACUNA |
| `privilegio:camaras_tecnicas.authenticated` | privilegio | core | LACUNA |
| `privilegio:camaras_tecnicas.service_role` | privilegio | core | LACUNA |
| `privilegio:can_access_camara.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:can_access_camara.anon` | privilegio | core | LACUNA |
| `privilegio:can_access_camara.authenticated` | privilegio | core | LACUNA |
| `privilegio:can_access_camara.service_role` | privilegio | core | LACUNA |
| `privilegio:contratos.anon` | privilegio | core | LACUNA |
| `privilegio:contratos.authenticated` | privilegio | core | LACUNA |
| `privilegio:contratos.service_role` | privilegio | core | LACUNA |
| `privilegio:current_prestador_servico_id.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:current_prestador_servico_id.anon` | privilegio | core | LACUNA |
| `privilegio:current_prestador_servico_id.authenticated` | privilegio | core | LACUNA |
| `privilegio:current_prestador_servico_id.service_role` | privilegio | core | LACUNA |
| `privilegio:current_role.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:current_role.anon` | privilegio | core | LACUNA |
| `privilegio:current_role.authenticated` | privilegio | core | LACUNA |
| `privilegio:current_role.service_role` | privilegio | core | LACUNA |
| `privilegio:diretorias.anon` | privilegio | core | LACUNA |
| `privilegio:diretorias.authenticated` | privilegio | core | LACUNA |
| `privilegio:diretorias.service_role` | privilegio | core | LACUNA |
| `privilegio:e_chave_de_servico.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:e_chave_de_servico.anon` | privilegio | core | LACUNA |
| `privilegio:e_chave_de_servico.authenticated` | privilegio | core | LACUNA |
| `privilegio:e_chave_de_servico.service_role` | privilegio | core | LACUNA |
| `privilegio:enforce_profile_security.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:enforce_profile_security.anon` | privilegio | core | LACUNA |
| `privilegio:enforce_profile_security.authenticated` | privilegio | core | LACUNA |
| `privilegio:enforce_profile_security.service_role` | privilegio | core | LACUNA |
| `privilegio:get_my_camara_tecnica.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:get_my_camara_tecnica.anon` | privilegio | core | LACUNA |
| `privilegio:get_my_camara_tecnica.authenticated` | privilegio | core | LACUNA |
| `privilegio:get_my_camara_tecnica.service_role` | privilegio | core | LACUNA |
| `privilegio:get_my_diretoria.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:get_my_diretoria.anon` | privilegio | core | LACUNA |
| `privilegio:get_my_diretoria.authenticated` | privilegio | core | LACUNA |
| `privilegio:get_my_diretoria.service_role` | privilegio | core | LACUNA |
| `privilegio:get_my_prestador_id.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:get_my_prestador_id.anon` | privilegio | core | LACUNA |
| `privilegio:get_my_prestador_id.authenticated` | privilegio | core | LACUNA |
| `privilegio:get_my_prestador_id.service_role` | privilegio | core | LACUNA |
| `privilegio:get_my_role.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:get_my_role.anon` | privilegio | core | LACUNA |
| `privilegio:get_my_role.authenticated` | privilegio | core | LACUNA |
| `privilegio:get_my_role.service_role` | privilegio | core | LACUNA |
| `privilegio:handle_new_user.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:handle_new_user.anon` | privilegio | core | LACUNA |
| `privilegio:handle_new_user.authenticated` | privilegio | core | LACUNA |
| `privilegio:handle_new_user.service_role` | privilegio | core | LACUNA |
| `privilegio:is_caters_user.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:is_caters_user.anon` | privilegio | core | LACUNA |
| `privilegio:is_caters_user.authenticated` | privilegio | core | LACUNA |
| `privilegio:is_caters_user.service_role` | privilegio | core | LACUNA |
| `privilegio:is_staff.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:is_staff.anon` | privilegio | core | LACUNA |
| `privilegio:is_staff.authenticated` | privilegio | core | LACUNA |
| `privilegio:is_staff.service_role` | privilegio | core | LACUNA |
| `privilegio:municipios.anon` | privilegio | core | LACUNA |
| `privilegio:municipios.authenticated` | privilegio | core | LACUNA |
| `privilegio:municipios.service_role` | privilegio | core | LACUNA |
| `privilegio:prestadores_para_cadastro.anon` | privilegio | core | LACUNA |
| `privilegio:prestadores_para_cadastro.authenticated` | privilegio | core | LACUNA |
| `privilegio:prestadores_para_cadastro.service_role` | privilegio | core | LACUNA |
| `privilegio:prestadores_servico.anon` | privilegio | core | LACUNA |
| `privilegio:prestadores_servico.authenticated` | privilegio | core | LACUNA |
| `privilegio:prestadores_servico.service_role` | privilegio | core | LACUNA |
| `privilegio:process_audit_log.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:process_audit_log.anon` | privilegio | core | LACUNA |
| `privilegio:process_audit_log.authenticated` | privilegio | core | LACUNA |
| `privilegio:process_audit_log.service_role` | privilegio | core | LACUNA |
| `privilegio:profiles.anon` | privilegio | core | LACUNA |
| `privilegio:profiles.authenticated` | privilegio | core | LACUNA |
| `privilegio:profiles.service_role` | privilegio | core | LACUNA |
| `privilegio:update_updated_at_column.PUBLIC` | privilegio | core | LACUNA |
| `privilegio:update_updated_at_column.anon` | privilegio | core | LACUNA |
| `privilegio:update_updated_at_column.authenticated` | privilegio | core | LACUNA |
| `privilegio:update_updated_at_column.service_role` | privilegio | core | LACUNA |
| `privilegio_padrao:postgres.public.funcao` | privilegio_padrao | core | LACUNA |
| `privilegio_padrao:postgres.public.sequencia` | privilegio_padrao | core | LACUNA |
| `privilegio_padrao:postgres.public.tabela` | privilegio_padrao | core | LACUNA |
| `extensao:uuid-ossp` | extensao | core | LACUNA |
| `tabela:itens_checklist` | tabela | checklists | LACUNA |
| `tabela:tipos_unidade` | tabela | checklists | LACUNA |
| `coluna:itens_checklist.artigo_portaria` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.ativo` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.created_at` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.created_by` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.created_by_id` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.created_date` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.gera_nc` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.id` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.is_sample` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.ordem` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.pergunta` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.prazo_dias` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.texto_constatacao_nao` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.texto_constatacao_sim` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.texto_determinacao` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.texto_nc` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.texto_recomendacao` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.tipo_unidade_id` | coluna | checklists | LACUNA |
| `coluna:itens_checklist.updated_date` | coluna | checklists | LACUNA |
| `coluna:tipos_unidade.ativo` | coluna | checklists | LACUNA |
| `coluna:tipos_unidade.codigo` | coluna | checklists | LACUNA |
| `coluna:tipos_unidade.created_at` | coluna | checklists | LACUNA |
| `coluna:tipos_unidade.id` | coluna | checklists | LACUNA |
| `coluna:tipos_unidade.nome` | coluna | checklists | LACUNA |
| `coluna:tipos_unidade.servicos_aplicaveis` | coluna | checklists | LACUNA |
| `restricao:itens_checklist.itens_checklist_pkey` | restricao | checklists | LACUNA |
| `restricao:itens_checklist.itens_checklist_tipo_unidade_id_fkey` | restricao | checklists | LACUNA |
| `restricao:tipos_unidade.tipos_unidade_pkey` | restricao | checklists | LACUNA |
| `indice:itens_checklist_pkey` | indice | checklists | LACUNA |
| `indice:tipos_unidade_pkey` | indice | checklists | LACUNA |
| `politica:public.itens_checklist.Leitura pública de itens de checklist` | politica | checklists | LACUNA |
| `politica:public.itens_checklist.Operadores gerenciam itens de checklist` | politica | checklists | LACUNA |
| `politica:public.tipos_unidade.Leitura pública de tipos de unidade` | politica | checklists | LACUNA |
| `politica:public.tipos_unidade.Operadores gerenciam tipos de unidade` | politica | checklists | LACUNA |
| `privilegio:itens_checklist.anon` | privilegio | checklists | LACUNA |
| `privilegio:itens_checklist.authenticated` | privilegio | checklists | LACUNA |
| `privilegio:itens_checklist.service_role` | privilegio | checklists | LACUNA |
| `privilegio:tipos_unidade.anon` | privilegio | checklists | LACUNA |
| `privilegio:tipos_unidade.authenticated` | privilegio | checklists | LACUNA |
| `privilegio:tipos_unidade.service_role` | privilegio | checklists | LACUNA |
| `tabela:constatacoes_manuais` | tabela | fiscalizacao | LACUNA |
| `tabela:determinacoes` | tabela | fiscalizacao | LACUNA |
| `tabela:fiscalizacoes` | tabela | fiscalizacao | LACUNA |
| `tabela:fotos_evidencia` | tabela | fiscalizacao | LACUNA |
| `tabela:nao_conformidades` | tabela | fiscalizacao | LACUNA |
| `tabela:recomendacoes` | tabela | fiscalizacao | LACUNA |
| `tabela:relatorios_jobs` | tabela | fiscalizacao | LACUNA |
| `tabela:respostas_checklist` | tabela | fiscalizacao | LACUNA |
| `tabela:unidades_fiscalizadas` | tabela | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.artigo_portaria` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.descricao` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.descricao_nc` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.gera_nc` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.id` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.numero_constatacao` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.ordem` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.texto_determinacao` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.texto_recomendacao` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.unidade_fiscalizada_id` | coluna | fiscalizacao | LACUNA |
| `coluna:constatacoes_manuais.updated_at` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.data_limite` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.descricao` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.id` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.nao_conformidade_id` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.numero_determinacao` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.origem` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.prazo` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.prazo_dias` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.status` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.unidade_fiscalizada_id` | coluna | fiscalizacao | LACUNA |
| `coluna:determinacoes.updated_at` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.camara_tecnica_id` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.created_by` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.data_fim` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.data_inicio` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.fiscal_email` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.fiscal_nome` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.id` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.last_modified_at` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.last_modified_by` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.latitude_inicio` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.longitude_inicio` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.municipio_id` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.municipio_nome` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.numero_termo` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.prestador_servico_id` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.prestador_servico_nome` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.servicos` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.status` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.tipo_modulo` | coluna | fiscalizacao | LACUNA |
| `coluna:fiscalizacoes.updated_at` | coluna | fiscalizacao | LACUNA |
| `coluna:fotos_evidencia.bucket_path` | coluna | fiscalizacao | LACUNA |
| `coluna:fotos_evidencia.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:fotos_evidencia.descricao` | coluna | fiscalizacao | LACUNA |
| `coluna:fotos_evidencia.fiscalizacao_id` | coluna | fiscalizacao | LACUNA |
| `coluna:fotos_evidencia.id` | coluna | fiscalizacao | LACUNA |
| `coluna:fotos_evidencia.unidade_fiscalizada_id` | coluna | fiscalizacao | LACUNA |
| `coluna:fotos_evidencia.url` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.artigo_portaria` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.descricao` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.fotos` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.gravidade` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.id` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.latitude_foto` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.longitude_foto` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.numero_nc` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.resposta_checklist_id` | coluna | fiscalizacao | LACUNA |
| `coluna:nao_conformidades.unidade_fiscalizada_id` | coluna | fiscalizacao | LACUNA |
| `coluna:recomendacoes.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:recomendacoes.descricao` | coluna | fiscalizacao | LACUNA |
| `coluna:recomendacoes.id` | coluna | fiscalizacao | LACUNA |
| `coluna:recomendacoes.numero_recomendacao` | coluna | fiscalizacao | LACUNA |
| `coluna:recomendacoes.origem` | coluna | fiscalizacao | LACUNA |
| `coluna:recomendacoes.unidade_fiscalizada_id` | coluna | fiscalizacao | LACUNA |
| `coluna:recomendacoes.updated_at` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.error_message` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.fiscalizacao_id` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.id` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.parts_count` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.progress_fotos` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.progress_unidades` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.requested_by` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.status` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.storage_path` | coluna | fiscalizacao | LACUNA |
| `coluna:relatorios_jobs.updated_at` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.comentario` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.gera_nc` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.id` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.item_checklist_id` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.numero_constatacao` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.observacao` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.pergunta` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.resposta` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.unidade_fiscalizada_id` | coluna | fiscalizacao | LACUNA |
| `coluna:respostas_checklist.updated_at` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.codigo_unidade` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.coordenadas` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.created_at` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.data_hora_vistoria` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.endereco` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.fiscalizacao_id` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.fotos_unidade` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.id` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.latitude` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.longitude` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.nome_unidade` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.ordem` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.status` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.tipo_unidade_id` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.tipo_unidade_nome` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.total_constatacoes` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.total_determinacoes` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.total_ncs` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.total_recomendacoes` | coluna | fiscalizacao | LACUNA |
| `coluna:unidades_fiscalizadas.updated_at` | coluna | fiscalizacao | LACUNA |
| `restricao:constatacoes_manuais.constatacoes_manuais_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:constatacoes_manuais.constatacoes_manuais_unidade_fiscalizada_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:determinacoes.determinacoes_nao_conformidade_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:determinacoes.determinacoes_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:determinacoes.determinacoes_status_check` | restricao | fiscalizacao | LACUNA |
| `restricao:determinacoes.determinacoes_unidade_fiscalizada_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:fiscalizacoes.fiscalizacoes_created_by_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:fiscalizacoes.fiscalizacoes_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:fotos_evidencia.fotos_evidencia_fiscalizacao_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:fotos_evidencia.fotos_evidencia_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:fotos_evidencia.fotos_evidencia_unidade_fiscalizada_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:nao_conformidades.nao_conformidades_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:nao_conformidades.nao_conformidades_resposta_checklist_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:nao_conformidades.nao_conformidades_unidade_fiscalizada_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:recomendacoes.recomendacoes_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:recomendacoes.recomendacoes_unidade_fiscalizada_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:relatorios_jobs.relatorios_jobs_fiscalizacao_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:relatorios_jobs.relatorios_jobs_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:relatorios_jobs.relatorios_jobs_requested_by_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:relatorios_jobs.relatorios_jobs_status_check` | restricao | fiscalizacao | LACUNA |
| `restricao:respostas_checklist.respostas_checklist_item_checklist_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:respostas_checklist.respostas_checklist_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:respostas_checklist.respostas_checklist_unidade_fiscalizada_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:unidades_fiscalizadas.unidades_fiscalizadas_fiscalizacao_id_fkey` | restricao | fiscalizacao | LACUNA |
| `restricao:unidades_fiscalizadas.unidades_fiscalizadas_fotos_is_array_check` | restricao | fiscalizacao | LACUNA |
| `restricao:unidades_fiscalizadas.unidades_fiscalizadas_pkey` | restricao | fiscalizacao | LACUNA |
| `restricao:unidades_fiscalizadas.unidades_fiscalizadas_status_check` | restricao | fiscalizacao | LACUNA |
| `indice:constatacoes_manuais_pkey` | indice | fiscalizacao | LACUNA |
| `indice:determinacoes_pkey` | indice | fiscalizacao | LACUNA |
| `indice:determinacoes_unidade_origem_unq` | indice | fiscalizacao | LACUNA |
| `indice:fiscalizacoes_pkey` | indice | fiscalizacao | LACUNA |
| `indice:fotos_evidencia_pkey` | indice | fiscalizacao | LACUNA |
| `indice:idx_determinacoes_nc` | indice | fiscalizacao | LACUNA |
| `indice:idx_determinacoes_numero` | indice | fiscalizacao | LACUNA |
| `indice:idx_determinacoes_unidade` | indice | fiscalizacao | LACUNA |
| `indice:idx_dets_nc` | indice | fiscalizacao | LACUNA |
| `indice:idx_fiscalizacoes_camara` | indice | fiscalizacao | LACUNA |
| `indice:idx_nc_resposta` | indice | fiscalizacao | LACUNA |
| `indice:idx_nc_resposta_checklist` | indice | fiscalizacao | LACUNA |
| `indice:idx_nc_unidade` | indice | fiscalizacao | LACUNA |
| `indice:idx_respostas_checklist_item` | indice | fiscalizacao | LACUNA |
| `indice:idx_unidades_codigo` | indice | fiscalizacao | LACUNA |
| `indice:idx_unidades_fiscalizacao` | indice | fiscalizacao | LACUNA |
| `indice:idx_unidades_fotos_gin` | indice | fiscalizacao | LACUNA |
| `indice:idx_unidades_nome` | indice | fiscalizacao | LACUNA |
| `indice:idx_unidades_status` | indice | fiscalizacao | LACUNA |
| `indice:idx_unidades_tipo` | indice | fiscalizacao | LACUNA |
| `indice:nao_conformidades_pkey` | indice | fiscalizacao | LACUNA |
| `indice:recomendacoes_pkey` | indice | fiscalizacao | LACUNA |
| `indice:recomendacoes_unidade_numero_unq` | indice | fiscalizacao | LACUNA |
| `indice:relatorios_jobs_fiscalizacao_id_idx` | indice | fiscalizacao | LACUNA |
| `indice:relatorios_jobs_pkey` | indice | fiscalizacao | LACUNA |
| `indice:relatorios_jobs_requested_by_idx` | indice | fiscalizacao | LACUNA |
| `indice:relatorios_jobs_status_idx` | indice | fiscalizacao | LACUNA |
| `indice:respostas_checklist_pkey` | indice | fiscalizacao | LACUNA |
| `indice:unidades_fiscalizadas_fiscalizacao_codigo_unq` | indice | fiscalizacao | LACUNA |
| `indice:unidades_fiscalizadas_fiscalizacao_ordem_idx` | indice | fiscalizacao | LACUNA |
| `indice:unidades_fiscalizadas_pkey` | indice | fiscalizacao | LACUNA |
| `indice:ux_recomendacoes_unidade_numero` | indice | fiscalizacao | LACUNA |
| `indice:ux_respostas_checklist_unidade_item` | indice | fiscalizacao | LACUNA |
| `funcao:claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)` | funcao | fiscalizacao | LACUNA |
| `funcao:determinacoes_fill_origem()` | funcao | fiscalizacao | LACUNA |
| `funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid)` | funcao | fiscalizacao | LACUNA |
| `funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)` | funcao | fiscalizacao | LACUNA |
| `funcao:kick_relatorios_worker(p_job_id uuid, p_limit integer)` | funcao | fiscalizacao | LACUNA |
| `funcao:obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)` | funcao | fiscalizacao | LACUNA |
| `funcao:obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])` | funcao | fiscalizacao | LACUNA |
| `funcao:propagate_modification_to_parent()` | funcao | fiscalizacao | LACUNA |
| `funcao:reabrir_fiscalizacao(p_fiscalizacao_id uuid)` | funcao | fiscalizacao | LACUNA |
| `funcao:set_fiscalizacao_cache_fields()` | funcao | fiscalizacao | LACUNA |
| `funcao:set_fiscalizacao_last_modified()` | funcao | fiscalizacao | LACUNA |
| `funcao:trg_fiscalizacao_set_camara()` | funcao | fiscalizacao | LACUNA |
| `gatilho:public.constatacoes_manuais.trg_audit_constatacoes` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.constatacoes_manuais.trg_propagate_constatacoes` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.determinacoes.trg_audit_determinacoes` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.determinacoes.trg_propagate_determinacoes` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.determinacoes.update_determinacoes_updated_at` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.fiscalizacoes.tr_camara_fiscalizacoes` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.fiscalizacoes.trg_audit_fiscalizacoes` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.fiscalizacoes.trg_set_fiscalizacao_cache_fields` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.fiscalizacoes.trg_set_fiscalizacao_last_modified` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.fiscalizacoes.update_fiscalizacoes_updated_at` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.recomendacoes.trg_audit_recomendacoes` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.recomendacoes.trg_propagate_recomendacoes` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.relatorios_jobs.trg_audit_relatorios_jobs` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.respostas_checklist.trg_audit_respostas` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.respostas_checklist.trg_propagate_respostas` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.unidades_fiscalizadas.trg_audit_unidades` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.unidades_fiscalizadas.trg_propagate_unidades` | gatilho | fiscalizacao | LACUNA |
| `gatilho:public.unidades_fiscalizadas.update_unidades_updated_at` | gatilho | fiscalizacao | LACUNA |
| `politica:public.constatacoes_manuais.Fiscais e Admins: acesso total em constatacoes` | politica | fiscalizacao | LACUNA |
| `politica:public.constatacoes_manuais.Prestadores: ler suas próprias constatacoes` | politica | fiscalizacao | LACUNA |
| `politica:public.constatacoes_manuais.constatacoes_staff_all` | politica | fiscalizacao | LACUNA |
| `politica:public.constatacoes_manuais.e2e_test_user_own_rows_only` | politica | fiscalizacao | LACUNA |
| `politica:public.constatacoes_manuais.e2e_test_user_own_rows_only_delete` | politica | fiscalizacao | LACUNA |
| `politica:public.determinacoes.Fiscais e Admins: acesso total em determinacoes` | politica | fiscalizacao | LACUNA |
| `politica:public.determinacoes.Prestadores: ler suas próprias determinacoes` | politica | fiscalizacao | LACUNA |
| `politica:public.determinacoes.determinacoes_staff_all` | politica | fiscalizacao | LACUNA |
| `politica:public.determinacoes.e2e_test_user_own_rows_only` | politica | fiscalizacao | LACUNA |
| `politica:public.determinacoes.e2e_test_user_own_rows_only_delete` | politica | fiscalizacao | LACUNA |
| `politica:public.fiscalizacoes.Fiscais e Admins: acesso por camara em fiscalizacoes` | politica | fiscalizacao | LACUNA |
| `politica:public.fiscalizacoes.Prestadores: ler apenas suas próprias fiscalizações` | politica | fiscalizacao | LACUNA |
| `politica:public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe` | politica | fiscalizacao | LACUNA |
| `politica:public.fiscalizacoes.e2e_test_user_own_rows_only` | politica | fiscalizacao | LACUNA |
| `politica:public.fiscalizacoes.e2e_test_user_own_rows_only_delete` | politica | fiscalizacao | LACUNA |
| `politica:public.fotos_evidencia.Fiscais e Admins: acesso total em fotos` | politica | fiscalizacao | LACUNA |
| `politica:public.fotos_evidencia.Prestadores: ler suas próprias fotos` | politica | fiscalizacao | LACUNA |
| `politica:public.nao_conformidades.Fiscais e Admins: acesso total em ncs` | politica | fiscalizacao | LACUNA |
| `politica:public.nao_conformidades.Prestadores: ler suas próprias ncs` | politica | fiscalizacao | LACUNA |
| `politica:public.nao_conformidades.ncs_staff_all` | politica | fiscalizacao | LACUNA |
| `politica:public.recomendacoes.Fiscais e Admins: acesso total em recomendacoes` | politica | fiscalizacao | LACUNA |
| `politica:public.recomendacoes.Prestadores: ler suas próprias recomendacoes` | politica | fiscalizacao | LACUNA |
| `politica:public.recomendacoes.e2e_test_user_own_rows_only` | politica | fiscalizacao | LACUNA |
| `politica:public.recomendacoes.e2e_test_user_own_rows_only_delete` | politica | fiscalizacao | LACUNA |
| `politica:public.recomendacoes.recomendacoes_staff_all` | politica | fiscalizacao | LACUNA |
| `politica:public.relatorios_jobs.Delete relatorios_jobs (owner/admin)` | politica | fiscalizacao | LACUNA |
| `politica:public.relatorios_jobs.Select relatorios_jobs (any active user)` | politica | fiscalizacao | LACUNA |
| `politica:public.respostas_checklist.Fiscais e Admins: acesso total em respostas` | politica | fiscalizacao | LACUNA |
| `politica:public.respostas_checklist.Prestadores: ler suas próprias respostas` | politica | fiscalizacao | LACUNA |
| `politica:public.respostas_checklist.e2e_test_user_own_rows_only` | politica | fiscalizacao | LACUNA |
| `politica:public.respostas_checklist.e2e_test_user_own_rows_only_delete` | politica | fiscalizacao | LACUNA |
| `politica:public.respostas_checklist.respostas_checklist_staff_all` | politica | fiscalizacao | LACUNA |
| `politica:public.unidades_fiscalizadas.Fiscais e Admins: acesso total em unidades` | politica | fiscalizacao | LACUNA |
| `politica:public.unidades_fiscalizadas.Prestadores: ler suas próprias unidades` | politica | fiscalizacao | LACUNA |
| `politica:public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades` | politica | fiscalizacao | LACUNA |
| `politica:public.unidades_fiscalizadas.e2e_test_user_own_rows_only` | politica | fiscalizacao | LACUNA |
| `politica:public.unidades_fiscalizadas.e2e_test_user_own_rows_only_delete` | politica | fiscalizacao | LACUNA |
| `politica:public.unidades_fiscalizadas.unidades_staff_all` | politica | fiscalizacao | LACUNA |
| `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_0` | politica | fiscalizacao | LACUNA |
| `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_1` | politica | fiscalizacao | LACUNA |
| `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_2` | politica | fiscalizacao | LACUNA |
| `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_3` | politica | fiscalizacao | LACUNA |
| `bucket:fotos_fiscalizacao` | bucket | fiscalizacao | LACUNA |
| `bucket:relatorios_fiscalizacao` | bucket | fiscalizacao | LACUNA |
| `privilegio:claim_relatorios_jobs.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:constatacoes_manuais.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:constatacoes_manuais.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:constatacoes_manuais.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:determinacoes.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:determinacoes.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:determinacoes.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:determinacoes_fill_origem.PUBLIC` | privilegio | fiscalizacao | LACUNA |
| `privilegio:determinacoes_fill_origem.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:determinacoes_fill_origem.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:determinacoes_fill_origem.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:finalizar_fiscalizacao.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:finalizar_fiscalizacao.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:finalizar_fiscalizacao.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:fiscalizacoes.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:fiscalizacoes.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:fiscalizacoes.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:fotos_evidencia.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:fotos_evidencia.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:fotos_evidencia.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:gerar_ncs_unidade.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:gerar_ncs_unidade.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:gerar_ncs_unidade.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:kick_relatorios_worker.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:nao_conformidades.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:nao_conformidades.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:nao_conformidades.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:obter_resumo_indicadores.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:obter_resumo_indicadores.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:propagate_modification_to_parent.PUBLIC` | privilegio | fiscalizacao | LACUNA |
| `privilegio:propagate_modification_to_parent.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:propagate_modification_to_parent.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:propagate_modification_to_parent.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:reabrir_fiscalizacao.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:reabrir_fiscalizacao.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:recomendacoes.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:recomendacoes.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:recomendacoes.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:relatorios_jobs.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:relatorios_jobs.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:relatorios_jobs.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:respostas_checklist.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:respostas_checklist.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:respostas_checklist.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:set_fiscalizacao_cache_fields.PUBLIC` | privilegio | fiscalizacao | LACUNA |
| `privilegio:set_fiscalizacao_cache_fields.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:set_fiscalizacao_cache_fields.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:set_fiscalizacao_cache_fields.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:set_fiscalizacao_last_modified.PUBLIC` | privilegio | fiscalizacao | LACUNA |
| `privilegio:set_fiscalizacao_last_modified.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:set_fiscalizacao_last_modified.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:set_fiscalizacao_last_modified.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:trg_fiscalizacao_set_camara.PUBLIC` | privilegio | fiscalizacao | LACUNA |
| `privilegio:trg_fiscalizacao_set_camara.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:trg_fiscalizacao_set_camara.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:trg_fiscalizacao_set_camara.service_role` | privilegio | fiscalizacao | LACUNA |
| `privilegio:unidades_fiscalizadas.anon` | privilegio | fiscalizacao | LACUNA |
| `privilegio:unidades_fiscalizadas.authenticated` | privilegio | fiscalizacao | LACUNA |
| `privilegio:unidades_fiscalizadas.service_role` | privilegio | fiscalizacao | LACUNA |
| `segredo:RELATORIOS_INVOKE_APIKEY` | segredo | fiscalizacao | LACUNA |
| `segredo:RELATORIOS_WORKER_SECRET` | segredo | fiscalizacao | LACUNA |
| `extensao:pg_net` | extensao | fiscalizacao | LACUNA |
| `extensao:supabase_vault` | extensao | fiscalizacao | LACUNA |
| `tabela:tipos_ocorrencia_dtr` | tabela | dtr | LACUNA |
| `coluna:contratos.km_points` | coluna | dtr | LACUNA |
| `coluna:contratos.kml_url` | coluna | dtr | LACUNA |
| `coluna:contratos.rodovia` | coluna | dtr | LACUNA |
| `coluna:fiscalizacoes.rodovia` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.ativo` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.created_at` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.descricao` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.etapas_obra` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.frente` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.gera_nc` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.id` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.item_contrato` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.nao_atendimento` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.nome` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.observacoes` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.prazo_dias_padrao` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.rodovia` | coluna | dtr | LACUNA |
| `coluna:tipos_ocorrencia_dtr.updated_at` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.frente` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.gps_accuracy_m` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.gravidade` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.km` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.km_impreciso` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.nao_atendimento` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.per` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.prazo_dias_nc` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.rodovia` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.sentido` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.tipo_ocorrencia` | coluna | dtr | LACUNA |
| `coluna:unidades_fiscalizadas.trecho` | coluna | dtr | LACUNA |
| `restricao:tipos_ocorrencia_dtr.tipos_ocorrencia_dtr_pkey` | restricao | dtr | LACUNA |
| `indice:idx_tipos_ocorrencia_dtr_rodovia` | indice | dtr | LACUNA |
| `indice:tipos_ocorrencia_dtr_pkey` | indice | dtr | LACUNA |
| `gatilho:public.tipos_ocorrencia_dtr.update_tipos_ocorrencia_dtr_updated_at` | gatilho | dtr | LACUNA |
| `politica:public.tipos_ocorrencia_dtr.Escrita admin tipos_ocorrencia_dtr` | politica | dtr | LACUNA |
| `politica:public.tipos_ocorrencia_dtr.Leitura autenticada tipos_ocorrencia_dtr` | politica | dtr | LACUNA |
| `politica:storage.objects.kml_rodovias_authenticated_delete` | politica | dtr | LACUNA |
| `politica:storage.objects.kml_rodovias_authenticated_insert` | politica | dtr | LACUNA |
| `politica:storage.objects.kml_rodovias_authenticated_read` | politica | dtr | LACUNA |
| `politica:storage.objects.kml_rodovias_authenticated_update` | politica | dtr | LACUNA |
| `bucket:kml-rodovias` | bucket | dtr | LACUNA |
| `privilegio:tipos_ocorrencia_dtr.anon` | privilegio | dtr | LACUNA |
| `privilegio:tipos_ocorrencia_dtr.authenticated` | privilegio | dtr | LACUNA |
| `privilegio:tipos_ocorrencia_dtr.service_role` | privilegio | dtr | LACUNA |
| `tabela:autos_infracao` | tabela | processo_sancionador | LACUNA |
| `tabela:julgamentos` | tabela | processo_sancionador | LACUNA |
| `tabela:manifestacoes_auto` | tabela | processo_sancionador | LACUNA |
| `tabela:pareceres_tecnicos` | tabela | processo_sancionador | LACUNA |
| `tabela:remessas_ai` | tabela | processo_sancionador | LACUNA |
| `tabela:remessas_ai_itens` | tabela | processo_sancionador | LACUNA |
| `tabela:respostas_determinacao` | tabela | processo_sancionador | LACUNA |
| `tabela:termos_notificacao` | tabela | processo_sancionador | LACUNA |
| `coluna:autos_infracao.arquivo_defesa` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.arquivo_defesa_oficio` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.arquivo_protocolo_ai_recebido` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.arquivo_protocolo_oficio` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.arquivo_url` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.camara_tecnica_id` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.created_at` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.data_emissao` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.defesa_arquivos` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.defesa_texto` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.descricao` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.determinacao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.fiscalizacao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.id` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.numero_auto` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.pena_base_rs` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.pena_base_uferms` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.prestador_servico_id` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.resposta_determinacao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.status` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.unidade_fiscalizada_id` | coluna | processo_sancionador | LACUNA |
| `coluna:autos_infracao.valor` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.auto_id` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.created_at` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.data_julgamento` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.decisao` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.id` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.justificativa_decisao` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.parecer_tecnico_id` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.prestador_servico_id` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.status` | coluna | processo_sancionador | LACUNA |
| `coluna:julgamentos.valor_multa_final` | coluna | processo_sancionador | LACUNA |
| `coluna:manifestacoes_auto.arquivo_url` | coluna | processo_sancionador | LACUNA |
| `coluna:manifestacoes_auto.auto_infracao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:manifestacoes_auto.created_at` | coluna | processo_sancionador | LACUNA |
| `coluna:manifestacoes_auto.data_manifestacao` | coluna | processo_sancionador | LACUNA |
| `coluna:manifestacoes_auto.descricao` | coluna | processo_sancionador | LACUNA |
| `coluna:manifestacoes_auto.id` | coluna | processo_sancionador | LACUNA |
| `coluna:pareceres_tecnicos.analise_tecnica` | coluna | processo_sancionador | LACUNA |
| `coluna:pareceres_tecnicos.arquivo_parecer_assinado_url` | coluna | processo_sancionador | LACUNA |
| `coluna:pareceres_tecnicos.auto_id` | coluna | processo_sancionador | LACUNA |
| `coluna:pareceres_tecnicos.created_at` | coluna | processo_sancionador | LACUNA |
| `coluna:pareceres_tecnicos.id` | coluna | processo_sancionador | LACUNA |
| `coluna:pareceres_tecnicos.recomendacao` | coluna | processo_sancionador | LACUNA |
| `coluna:pareceres_tecnicos.status` | coluna | processo_sancionador | LACUNA |
| `coluna:pareceres_tecnicos.valor_multa_sugerido` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.arquivo_lista_pdf_url` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.arquivo_oficio_defesa_url` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.arquivo_parecer_assinado_url` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.arquivo_recebimento_assinado_url` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.camara_tecnica_id` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.criada_em` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.defesa_enviada_em` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.enviada_em` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.fiscalizacao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.id` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.numero_rfp` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.numero_tn` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.parecer_enviado_em` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.prestador_servico_id` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.recebida_em` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.status` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.termo_id` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai.updated_at` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai_itens.auto_infracao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai_itens.created_at` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai_itens.id` | coluna | processo_sancionador | LACUNA |
| `coluna:remessas_ai_itens.remessa_ai_id` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.created_at` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.data_resposta` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.dentro_prazo` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.descricao_atendimento` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.determinacao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.evidencias` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.fiscalizacao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.id` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.manifestacao_prestador` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.prestador_servico_id` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.resposta` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.status` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.tipo_resposta` | coluna | processo_sancionador | LACUNA |
| `coluna:respostas_determinacao.unidade_fiscalizada_id` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.am_concluida_em` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.ano_geracao` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivo_am_assinada_url` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivo_oficio_protocolo` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivo_oficio_resposta` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivo_protocolo_url` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivo_resposta_url` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivo_rfp_url` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivo_tn_prestador_url` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivo_url` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.arquivos_resposta` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.assinatura_prestador_valida` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.camara_tecnica` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.created_at` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.data_assinatura_prestador` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.data_geracao` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.data_inicio_prazo` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.data_maxima_resposta` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.data_protocolo` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.data_recebimento_resposta` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.fiscalizacao_id` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.fluxo_manual` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.id` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.municipio_id` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.numero_am` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.numero_processo` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.numero_rfp` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.numero_termo_notificacao` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.observacoes` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.prazo_resposta_dias` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.prestador_servico_id` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.recebida_no_prazo` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.status` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.tipo_relatorio` | coluna | processo_sancionador | LACUNA |
| `coluna:termos_notificacao.updated_at` | coluna | processo_sancionador | LACUNA |
| `restricao:autos_infracao.autos_infracao_determinacao_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:autos_infracao.autos_infracao_fiscalizacao_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:autos_infracao.autos_infracao_pena_base_rs_nonneg` | restricao | processo_sancionador | LACUNA |
| `restricao:autos_infracao.autos_infracao_pkey` | restricao | processo_sancionador | LACUNA |
| `restricao:autos_infracao.autos_infracao_prestador_servico_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:autos_infracao.autos_infracao_unidade_fiscalizada_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:julgamentos.julgamentos_auto_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:julgamentos.julgamentos_parecer_tecnico_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:julgamentos.julgamentos_pkey` | restricao | processo_sancionador | LACUNA |
| `restricao:julgamentos.julgamentos_prestador_servico_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:manifestacoes_auto.manifestacoes_auto_auto_infracao_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:manifestacoes_auto.manifestacoes_auto_pkey` | restricao | processo_sancionador | LACUNA |
| `restricao:pareceres_tecnicos.pareceres_tecnicos_auto_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:pareceres_tecnicos.pareceres_tecnicos_pkey` | restricao | processo_sancionador | LACUNA |
| `restricao:remessas_ai.remessas_ai_fiscalizacao_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:remessas_ai.remessas_ai_pkey` | restricao | processo_sancionador | LACUNA |
| `restricao:remessas_ai.remessas_ai_prestador_servico_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:remessas_ai.remessas_ai_termo_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:remessas_ai_itens.remessas_ai_itens_auto_infracao_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:remessas_ai_itens.remessas_ai_itens_pkey` | restricao | processo_sancionador | LACUNA |
| `restricao:remessas_ai_itens.remessas_ai_itens_remessa_ai_id_auto_infracao_id_key` | restricao | processo_sancionador | LACUNA |
| `restricao:remessas_ai_itens.remessas_ai_itens_remessa_ai_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:respostas_determinacao.respostas_determinacao_determinacao_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:respostas_determinacao.respostas_determinacao_fiscalizacao_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:respostas_determinacao.respostas_determinacao_pkey` | restricao | processo_sancionador | LACUNA |
| `restricao:respostas_determinacao.respostas_determinacao_prestador_servico_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:respostas_determinacao.respostas_determinacao_unidade_fiscalizada_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:termos_notificacao.termos_notificacao_fiscalizacao_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:termos_notificacao.termos_notificacao_municipio_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:termos_notificacao.termos_notificacao_pkey` | restricao | processo_sancionador | LACUNA |
| `restricao:termos_notificacao.termos_notificacao_prestador_servico_id_fkey` | restricao | processo_sancionador | LACUNA |
| `restricao:termos_notificacao.termos_notificacao_tipo_relatorio_check` | restricao | processo_sancionador | LACUNA |
| `indice:autos_infracao_pkey` | indice | processo_sancionador | LACUNA |
| `indice:idx_autos_det` | indice | processo_sancionador | LACUNA |
| `indice:idx_autos_infracao_camara` | indice | processo_sancionador | LACUNA |
| `indice:idx_remessas_ai_camara` | indice | processo_sancionador | LACUNA |
| `indice:julgamentos_pkey` | indice | processo_sancionador | LACUNA |
| `indice:manifestacoes_auto_pkey` | indice | processo_sancionador | LACUNA |
| `indice:pareceres_tecnicos_pkey` | indice | processo_sancionador | LACUNA |
| `indice:remessas_ai_itens_pkey` | indice | processo_sancionador | LACUNA |
| `indice:remessas_ai_itens_remessa_ai_id_auto_infracao_id_key` | indice | processo_sancionador | LACUNA |
| `indice:remessas_ai_pkey` | indice | processo_sancionador | LACUNA |
| `indice:respostas_determinacao_pkey` | indice | processo_sancionador | LACUNA |
| `indice:termos_notificacao_pkey` | indice | processo_sancionador | LACUNA |
| `indice:termos_notificacao_tipo_camara_numero_ano_uniq` | indice | processo_sancionador | LACUNA |
| `funcao:gerar_numero_am()` | funcao | processo_sancionador | LACUNA |
| `funcao:gerar_numero_auto()` | funcao | processo_sancionador | LACUNA |
| `funcao:proteger_resposta_determinacao_prestador()` | funcao | processo_sancionador | LACUNA |
| `funcao:proteger_termo_prestador()` | funcao | processo_sancionador | LACUNA |
| `funcao:set_termos_notificacao_ano_geracao()` | funcao | processo_sancionador | LACUNA |
| `funcao:trg_auto_set_camara()` | funcao | processo_sancionador | LACUNA |
| `funcao:trg_remessa_set_camara()` | funcao | processo_sancionador | LACUNA |
| `gatilho:public.autos_infracao.tr_camara_autos` | gatilho | processo_sancionador | LACUNA |
| `gatilho:public.remessas_ai.tr_camara_remessas` | gatilho | processo_sancionador | LACUNA |
| `gatilho:public.respostas_determinacao.trg_proteger_resposta_determinacao_prestador` | gatilho | processo_sancionador | LACUNA |
| `gatilho:public.termos_notificacao.trg_proteger_termo_prestador` | gatilho | processo_sancionador | LACUNA |
| `gatilho:public.termos_notificacao.trg_termos_notificacao_set_ano_geracao` | gatilho | processo_sancionador | LACUNA |
| `politica:public.autos_infracao.Fiscais e Admins: acesso por camara em autos` | politica | processo_sancionador | LACUNA |
| `politica:public.autos_infracao.Prestadores: ler seus próprios autos` | politica | processo_sancionador | LACUNA |
| `politica:public.autos_infracao.autos_prestador_select` | politica | processo_sancionador | LACUNA |
| `politica:public.autos_infracao.autos_staff_all` | politica | processo_sancionador | LACUNA |
| `politica:public.julgamentos.Fiscais e Admins: acesso total em julgamentos` | politica | processo_sancionador | LACUNA |
| `politica:public.julgamentos.Prestadores: ler julgamentos de seus autos` | politica | processo_sancionador | LACUNA |
| `politica:public.julgamentos.julgamentos_prestador_select` | politica | processo_sancionador | LACUNA |
| `politica:public.julgamentos.julgamentos_staff_all` | politica | processo_sancionador | LACUNA |
| `politica:public.manifestacoes_auto.Fiscais e Admins: acesso por camara em manifestacoes` | politica | processo_sancionador | LACUNA |
| `politica:public.manifestacoes_auto.Prestadores: atualizar suas próprias manifestações` | politica | processo_sancionador | LACUNA |
| `politica:public.manifestacoes_auto.Prestadores: cadastrar suas próprias manifestações` | politica | processo_sancionador | LACUNA |
| `politica:public.manifestacoes_auto.Prestadores: ler suas próprias manifestações` | politica | processo_sancionador | LACUNA |
| `politica:public.manifestacoes_auto.manifestacoes_prestador_select` | politica | processo_sancionador | LACUNA |
| `politica:public.manifestacoes_auto.manifestacoes_staff_all` | politica | processo_sancionador | LACUNA |
| `politica:public.pareceres_tecnicos.Fiscais e Admins: acesso por camara em pareceres` | politica | processo_sancionador | LACUNA |
| `politica:public.pareceres_tecnicos.Prestadores: ler pareceres de seus autos` | politica | processo_sancionador | LACUNA |
| `politica:public.pareceres_tecnicos.pareceres_prestador_select` | politica | processo_sancionador | LACUNA |
| `politica:public.pareceres_tecnicos.pareceres_staff_all` | politica | processo_sancionador | LACUNA |
| `politica:public.remessas_ai.Acesso total autenticado (DEV)` | politica | processo_sancionador | LACUNA |
| `politica:public.remessas_ai.Fiscais e Admins: acesso por camara em remessas` | politica | processo_sancionador | LACUNA |
| `politica:public.remessas_ai.Prestadores: ler suas próprias remessas` | politica | processo_sancionador | LACUNA |
| `politica:public.remessas_ai_itens.Acesso total autenticado (DEV)` | politica | processo_sancionador | LACUNA |
| `politica:public.remessas_ai_itens.Fiscais e Admins: acesso por camara em itens de remessas` | politica | processo_sancionador | LACUNA |
| `politica:public.remessas_ai_itens.Prestadores: ler itens de suas próprias remessas` | politica | processo_sancionador | LACUNA |
| `politica:public.respostas_determinacao.Fiscais e Admins: acesso total em respostas determinacoes` | politica | processo_sancionador | LACUNA |
| `politica:public.respostas_determinacao.Prestadores: ler suas próprias respostas determinacoes` | politica | processo_sancionador | LACUNA |
| `politica:public.respostas_determinacao.respostas_det_staff_all` | politica | processo_sancionador | LACUNA |
| `politica:public.termos_notificacao.Fiscais e Admins: acesso total em termos` | politica | processo_sancionador | LACUNA |
| `politica:public.termos_notificacao.Prestadores: ler seus termos` | politica | processo_sancionador | LACUNA |
| `politica:public.termos_notificacao.termos_prestador_select_own` | politica | processo_sancionador | LACUNA |
| `politica:public.termos_notificacao.termos_prestador_update_own_until_respondido` | politica | processo_sancionador | LACUNA |
| `politica:public.termos_notificacao.termos_staff_all` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.documentos-autos authenticated all 1fhxxna_0` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.documentos-autos authenticated all 1fhxxna_1` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.documentos-autos authenticated all 1fhxxna_2` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.documentos-autos authenticated all 1fhxxna_3` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.documentos-termos authenticated all 16irk4e_0` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.documentos-termos authenticated all 16irk4e_1` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.documentos-termos authenticated all 16irk4e_2` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.documentos-termos authenticated all 16irk4e_3` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.p_evid_write` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.tn_delete_authenticated` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.tn_update_authenticated` | politica | processo_sancionador | LACUNA |
| `politica:storage.objects.tn_upload_authenticated` | politica | processo_sancionador | LACUNA |
| `bucket:documentos-autos` | bucket | processo_sancionador | LACUNA |
| `bucket:documentos-termos` | bucket | processo_sancionador | LACUNA |
| `bucket:evidencias-determinacoes` | bucket | processo_sancionador | LACUNA |
| `privilegio:autos_infracao.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:autos_infracao.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:autos_infracao.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:gerar_numero_am.PUBLIC` | privilegio | processo_sancionador | LACUNA |
| `privilegio:gerar_numero_am.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:gerar_numero_am.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:gerar_numero_am.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:gerar_numero_auto.PUBLIC` | privilegio | processo_sancionador | LACUNA |
| `privilegio:gerar_numero_auto.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:gerar_numero_auto.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:gerar_numero_auto.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:julgamentos.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:julgamentos.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:julgamentos.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:manifestacoes_auto.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:manifestacoes_auto.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:manifestacoes_auto.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:pareceres_tecnicos.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:pareceres_tecnicos.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:pareceres_tecnicos.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:proteger_resposta_determinacao_prestador.PUBLIC` | privilegio | processo_sancionador | LACUNA |
| `privilegio:proteger_resposta_determinacao_prestador.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:proteger_resposta_determinacao_prestador.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:proteger_resposta_determinacao_prestador.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:proteger_termo_prestador.PUBLIC` | privilegio | processo_sancionador | LACUNA |
| `privilegio:proteger_termo_prestador.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:proteger_termo_prestador.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:proteger_termo_prestador.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:remessas_ai.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:remessas_ai.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:remessas_ai.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:remessas_ai_itens.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:remessas_ai_itens.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:remessas_ai_itens.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:respostas_determinacao.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:respostas_determinacao.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:respostas_determinacao.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:set_termos_notificacao_ano_geracao.PUBLIC` | privilegio | processo_sancionador | LACUNA |
| `privilegio:set_termos_notificacao_ano_geracao.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:set_termos_notificacao_ano_geracao.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:set_termos_notificacao_ano_geracao.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:termos_notificacao.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:termos_notificacao.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:termos_notificacao.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:trg_auto_set_camara.PUBLIC` | privilegio | processo_sancionador | LACUNA |
| `privilegio:trg_auto_set_camara.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:trg_auto_set_camara.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:trg_auto_set_camara.service_role` | privilegio | processo_sancionador | LACUNA |
| `privilegio:trg_remessa_set_camara.PUBLIC` | privilegio | processo_sancionador | LACUNA |
| `privilegio:trg_remessa_set_camara.anon` | privilegio | processo_sancionador | LACUNA |
| `privilegio:trg_remessa_set_camara.authenticated` | privilegio | processo_sancionador | LACUNA |
| `privilegio:trg_remessa_set_camara.service_role` | privilegio | processo_sancionador | LACUNA |
| `tabela:caters_ai_jobs` | tabela | caters | LACUNA |
| `tabela:caters_analysis_history` | tabela | caters | LACUNA |
| `tabela:caters_deadline_extensions` | tabela | caters | LACUNA |
| `tabela:caters_extra_documents` | tabela | caters | LACUNA |
| `tabela:caters_municipality_responses` | tabela | caters | LACUNA |
| `tabela:caters_notification_reads` | tabela | caters | LACUNA |
| `tabela:caters_processes` | tabela | caters | LACUNA |
| `tabela:caters_recommendations` | tabela | caters | LACUNA |
| `tabela:caters_fiscalizacoes_disponiveis` | view | caters | LACUNA |
| `coluna:caters_ai_jobs.created_at` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.error_message` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.id` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.input_text` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.job_type` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.process_id` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.requested_by` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.result_json` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.reviewed_at` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.reviewed_by` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.status` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.storage_bucket` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.storage_path` | coluna | caters | LACUNA |
| `coluna:caters_ai_jobs.updated_at` | coluna | caters | LACUNA |
| `coluna:caters_analysis_history.action_type` | coluna | caters | LACUNA |
| `coluna:caters_analysis_history.created_at` | coluna | caters | LACUNA |
| `coluna:caters_analysis_history.description` | coluna | caters | LACUNA |
| `coluna:caters_analysis_history.id` | coluna | caters | LACUNA |
| `coluna:caters_analysis_history.new_fatal_date` | coluna | caters | LACUNA |
| `coluna:caters_analysis_history.performed_by` | coluna | caters | LACUNA |
| `coluna:caters_analysis_history.process_id` | coluna | caters | LACUNA |
| `coluna:caters_analysis_history.related_document_url` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.calculated_date` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.created_at` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.created_by` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.extension_days` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.id` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.municipality_protocol` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.municipality_request_at` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.notes` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.process_id` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.reference_date` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.status` | coluna | caters | LACUNA |
| `coluna:caters_deadline_extensions.updated_at` | coluna | caters | LACUNA |
| `coluna:caters_extra_documents.created_at` | coluna | caters | LACUNA |
| `coluna:caters_extra_documents.created_by` | coluna | caters | LACUNA |
| `coluna:caters_extra_documents.description` | coluna | caters | LACUNA |
| `coluna:caters_extra_documents.file_url` | coluna | caters | LACUNA |
| `coluna:caters_extra_documents.id` | coluna | caters | LACUNA |
| `coluna:caters_extra_documents.process_id` | coluna | caters | LACUNA |
| `coluna:caters_extra_documents.title` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.camara_tecnica_id` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.data_fim` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.data_inicio` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.id` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.municipio_nome` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.numero_termo` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.prestador_servico_nome` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.servicos` | coluna | caters | LACUNA |
| `coluna:caters_fiscalizacoes_disponiveis.status` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.created_at` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.created_by` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.cronograma_status` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.id` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.notes` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.process_id` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.protocol_number` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.received_at` | coluna | caters | LACUNA |
| `coluna:caters_municipality_responses.updated_at` | coluna | caters | LACUNA |
| `coluna:caters_notification_reads.created_at` | coluna | caters | LACUNA |
| `coluna:caters_notification_reads.id` | coluna | caters | LACUNA |
| `coluna:caters_notification_reads.key` | coluna | caters | LACUNA |
| `coluna:caters_notification_reads.read_at` | coluna | caters | LACUNA |
| `coluna:caters_notification_reads.user_id` | coluna | caters | LACUNA |
| `coluna:caters_processes.ar_digitalizado_url` | coluna | caters | LACUNA |
| `coluna:caters_processes.ar_protocol_number` | coluna | caters | LACUNA |
| `coluna:caters_processes.ar_received_at` | coluna | caters | LACUNA |
| `coluna:caters_processes.ar_sent_at` | coluna | caters | LACUNA |
| `coluna:caters_processes.ar_tracking_code` | coluna | caters | LACUNA |
| `coluna:caters_processes.created_at` | coluna | caters | LACUNA |
| `coluna:caters_processes.created_by` | coluna | caters | LACUNA |
| `coluna:caters_processes.cronograma_url` | coluna | caters | LACUNA |
| `coluna:caters_processes.fatal_date` | coluna | caters | LACUNA |
| `coluna:caters_processes.fiscalizacao_id` | coluna | caters | LACUNA |
| `coluna:caters_processes.id` | coluna | caters | LACUNA |
| `coluna:caters_processes.municipality` | coluna | caters | LACUNA |
| `coluna:caters_processes.object` | coluna | caters | LACUNA |
| `coluna:caters_processes.observations` | coluna | caters | LACUNA |
| `coluna:caters_processes.oficio_resposta_url` | coluna | caters | LACUNA |
| `coluna:caters_processes.process_number` | coluna | caters | LACUNA |
| `coluna:caters_processes.relatorio_url` | coluna | caters | LACUNA |
| `coluna:caters_processes.report_sent_at` | coluna | caters | LACUNA |
| `coluna:caters_processes.status` | coluna | caters | LACUNA |
| `coluna:caters_processes.technician_name` | coluna | caters | LACUNA |
| `coluna:caters_processes.termo_notificacao_url` | coluna | caters | LACUNA |
| `coluna:caters_processes.titular_response_due_at` | coluna | caters | LACUNA |
| `coluna:caters_processes.updated_at` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.category` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.created_at` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.created_by` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.description` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.determinacao_id` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.evidence_url` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.fulfilled_at` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.id` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.item_code` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.notes` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.priority` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.process_id` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.promised_due_at` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.recomendacao_id` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.status` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.titular_response` | coluna | caters | LACUNA |
| `coluna:caters_recommendations.updated_at` | coluna | caters | LACUNA |
| `restricao:caters_ai_jobs.caters_ai_jobs_pkey` | restricao | caters | LACUNA |
| `restricao:caters_ai_jobs.caters_ai_jobs_process_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_ai_jobs.caters_ai_jobs_requested_by_fkey` | restricao | caters | LACUNA |
| `restricao:caters_ai_jobs.caters_ai_jobs_reviewed_by_fkey` | restricao | caters | LACUNA |
| `restricao:caters_ai_jobs.caters_ai_jobs_status_check` | restricao | caters | LACUNA |
| `restricao:caters_analysis_history.caters_analysis_history_performed_by_fkey` | restricao | caters | LACUNA |
| `restricao:caters_analysis_history.caters_analysis_history_pkey` | restricao | caters | LACUNA |
| `restricao:caters_analysis_history.caters_analysis_history_process_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_deadline_extensions.caters_deadline_extensions_created_by_fkey` | restricao | caters | LACUNA |
| `restricao:caters_deadline_extensions.caters_deadline_extensions_pkey` | restricao | caters | LACUNA |
| `restricao:caters_deadline_extensions.caters_deadline_extensions_process_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_deadline_extensions.caters_deadline_extensions_status_check` | restricao | caters | LACUNA |
| `restricao:caters_extra_documents.caters_extra_documents_created_by_fkey` | restricao | caters | LACUNA |
| `restricao:caters_extra_documents.caters_extra_documents_pkey` | restricao | caters | LACUNA |
| `restricao:caters_extra_documents.caters_extra_documents_process_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_municipality_responses.caters_municipality_responses_created_by_fkey` | restricao | caters | LACUNA |
| `restricao:caters_municipality_responses.caters_municipality_responses_cronograma_status_check` | restricao | caters | LACUNA |
| `restricao:caters_municipality_responses.caters_municipality_responses_pkey` | restricao | caters | LACUNA |
| `restricao:caters_municipality_responses.caters_municipality_responses_process_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_municipality_responses.caters_municipality_responses_process_id_key` | restricao | caters | LACUNA |
| `restricao:caters_notification_reads.caters_notification_reads_pkey` | restricao | caters | LACUNA |
| `restricao:caters_notification_reads.caters_notification_reads_user_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_notification_reads.caters_notification_reads_user_key` | restricao | caters | LACUNA |
| `restricao:caters_processes.caters_processes_created_by_fkey` | restricao | caters | LACUNA |
| `restricao:caters_processes.caters_processes_fiscalizacao_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_processes.caters_processes_pkey` | restricao | caters | LACUNA |
| `restricao:caters_processes.caters_processes_process_number_unique` | restricao | caters | LACUNA |
| `restricao:caters_recommendations.caters_recommendations_created_by_fkey` | restricao | caters | LACUNA |
| `restricao:caters_recommendations.caters_recommendations_determinacao_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_recommendations.caters_recommendations_pkey` | restricao | caters | LACUNA |
| `restricao:caters_recommendations.caters_recommendations_process_id_fkey` | restricao | caters | LACUNA |
| `restricao:caters_recommendations.caters_recommendations_recomendacao_id_fkey` | restricao | caters | LACUNA |
| `indice:caters_ai_jobs_pkey` | indice | caters | LACUNA |
| `indice:caters_ai_jobs_process_id_idx` | indice | caters | LACUNA |
| `indice:caters_ai_jobs_status_idx` | indice | caters | LACUNA |
| `indice:caters_analysis_history_pkey` | indice | caters | LACUNA |
| `indice:caters_deadline_extensions_pkey` | indice | caters | LACUNA |
| `indice:caters_deadline_extensions_process_id_idx` | indice | caters | LACUNA |
| `indice:caters_extra_documents_pkey` | indice | caters | LACUNA |
| `indice:caters_municipality_responses_pkey` | indice | caters | LACUNA |
| `indice:caters_municipality_responses_process_id_key` | indice | caters | LACUNA |
| `indice:caters_notification_reads_pkey` | indice | caters | LACUNA |
| `indice:caters_notification_reads_user_key` | indice | caters | LACUNA |
| `indice:caters_processes_pkey` | indice | caters | LACUNA |
| `indice:caters_processes_process_number_unique` | indice | caters | LACUNA |
| `indice:caters_recommendations_pkey` | indice | caters | LACUNA |
| `indice:idx_caters_processes_fiscalizacao_id` | indice | caters | LACUNA |
| `indice:idx_caters_recommendations_determinacao_id` | indice | caters | LACUNA |
| `indice:idx_caters_recommendations_recomendacao_id` | indice | caters | LACUNA |
| `funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)` | funcao | caters | LACUNA |
| `funcao:caters_set_updated_at()` | funcao | caters | LACUNA |
| `funcao:claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)` | funcao | caters | LACUNA |
| `gatilho:public.caters_ai_jobs.trg_caters_ai_jobs_updated_at` | gatilho | caters | LACUNA |
| `gatilho:public.caters_municipality_responses.trg_caters_municipality_responses_updated_at` | gatilho | caters | LACUNA |
| `gatilho:public.caters_processes.trg_caters_processes_updated_at` | gatilho | caters | LACUNA |
| `gatilho:public.caters_recommendations.trg_caters_recommendations_updated_at` | gatilho | caters | LACUNA |
| `politica:public.caters_ai_jobs.CATERS ai jobs: gestao` | politica | caters | LACUNA |
| `politica:public.caters_analysis_history.CATERS historico: inserir` | politica | caters | LACUNA |
| `politica:public.caters_analysis_history.CATERS historico: leitura` | politica | caters | LACUNA |
| `politica:public.caters_deadline_extensions.authenticated users can manage deadline extensions` | politica | caters | LACUNA |
| `politica:public.caters_deadline_extensions.e2e_test_user_own_rows_only` | politica | caters | LACUNA |
| `politica:public.caters_deadline_extensions.e2e_test_user_own_rows_only_delete` | politica | caters | LACUNA |
| `politica:public.caters_extra_documents.CATERS documentos: deletar` | politica | caters | LACUNA |
| `politica:public.caters_extra_documents.CATERS documentos: inserir` | politica | caters | LACUNA |
| `politica:public.caters_extra_documents.CATERS documentos: leitura` | politica | caters | LACUNA |
| `politica:public.caters_extra_documents.e2e_test_user_own_rows_only` | politica | caters | LACUNA |
| `politica:public.caters_extra_documents.e2e_test_user_own_rows_only_delete` | politica | caters | LACUNA |
| `politica:public.caters_municipality_responses.CATERS respostas: gestao` | politica | caters | LACUNA |
| `politica:public.caters_municipality_responses.e2e_test_user_own_rows_only` | politica | caters | LACUNA |
| `politica:public.caters_municipality_responses.e2e_test_user_own_rows_only_delete` | politica | caters | LACUNA |
| `politica:public.caters_notification_reads.CATERS notif reads: proprias` | politica | caters | LACUNA |
| `politica:public.caters_processes.CATERS processos: atualizar` | politica | caters | LACUNA |
| `politica:public.caters_processes.CATERS processos: deletar` | politica | caters | LACUNA |
| `politica:public.caters_processes.CATERS processos: inserir` | politica | caters | LACUNA |
| `politica:public.caters_processes.CATERS processos: leitura` | politica | caters | LACUNA |
| `politica:public.caters_processes.e2e_test_user_own_rows_only` | politica | caters | LACUNA |
| `politica:public.caters_processes.e2e_test_user_own_rows_only_delete` | politica | caters | LACUNA |
| `politica:public.caters_recommendations.CATERS recomendacoes: atualizar` | politica | caters | LACUNA |
| `politica:public.caters_recommendations.CATERS recomendacoes: deletar` | politica | caters | LACUNA |
| `politica:public.caters_recommendations.CATERS recomendacoes: inserir` | politica | caters | LACUNA |
| `politica:public.caters_recommendations.CATERS recomendacoes: leitura` | politica | caters | LACUNA |
| `politica:public.caters_recommendations.e2e_test_user_own_rows_only` | politica | caters | LACUNA |
| `politica:public.caters_recommendations.e2e_test_user_own_rows_only_delete` | politica | caters | LACUNA |
| `tipo:caters_ai_job_type` | tipo | caters | LACUNA |
| `tipo:caters_analysis_action_type` | tipo | caters | LACUNA |
| `tipo:caters_process_status` | tipo | caters | LACUNA |
| `tipo:caters_recommendation_priority` | tipo | caters | LACUNA |
| `tipo:caters_recommendation_status` | tipo | caters | LACUNA |
| `privilegio:caters_ai_jobs.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_ai_jobs.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_ai_jobs.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_analysis_history.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_analysis_history.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_analysis_history.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_deadline_extensions.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_deadline_extensions.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_deadline_extensions.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_extra_documents.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_extra_documents.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_extra_documents.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_fiscalizacoes_disponiveis.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_fiscalizacoes_disponiveis.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_import_from_fiscalizacao.PUBLIC` | privilegio | caters | LACUNA |
| `privilegio:caters_import_from_fiscalizacao.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_import_from_fiscalizacao.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_import_from_fiscalizacao.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_municipality_responses.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_municipality_responses.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_municipality_responses.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_notification_reads.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_notification_reads.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_notification_reads.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_processes.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_processes.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_processes.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_recommendations.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_recommendations.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_recommendations.service_role` | privilegio | caters | LACUNA |
| `privilegio:caters_set_updated_at.PUBLIC` | privilegio | caters | LACUNA |
| `privilegio:caters_set_updated_at.anon` | privilegio | caters | LACUNA |
| `privilegio:caters_set_updated_at.authenticated` | privilegio | caters | LACUNA |
| `privilegio:caters_set_updated_at.service_role` | privilegio | caters | LACUNA |
| `privilegio:claim_caters_ai_jobs.service_role` | privilegio | caters | LACUNA |
| `tabela:catesa_ai_jobs` | tabela | catesa | LACUNA |
| `coluna:catesa_ai_jobs.created_at` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.error_message` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.id` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.input_text` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.requested_by` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.result_json` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.reviewed_at` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.reviewed_by` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.status` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.termo_id` | coluna | catesa | LACUNA |
| `coluna:catesa_ai_jobs.updated_at` | coluna | catesa | LACUNA |
| `restricao:catesa_ai_jobs.catesa_ai_jobs_pkey` | restricao | catesa | LACUNA |
| `restricao:catesa_ai_jobs.catesa_ai_jobs_requested_by_fkey` | restricao | catesa | LACUNA |
| `restricao:catesa_ai_jobs.catesa_ai_jobs_reviewed_by_fkey` | restricao | catesa | LACUNA |
| `restricao:catesa_ai_jobs.catesa_ai_jobs_status_check` | restricao | catesa | LACUNA |
| `restricao:catesa_ai_jobs.catesa_ai_jobs_termo_id_fkey` | restricao | catesa | LACUNA |
| `indice:catesa_ai_jobs_pkey` | indice | catesa | LACUNA |
| `indice:catesa_ai_jobs_status_idx` | indice | catesa | LACUNA |
| `indice:catesa_ai_jobs_termo_id_idx` | indice | catesa | LACUNA |
| `funcao:catesa_ai_jobs_set_updated_at()` | funcao | catesa | LACUNA |
| `funcao:claim_catesa_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)` | funcao | catesa | LACUNA |
| `gatilho:public.catesa_ai_jobs.trg_catesa_ai_jobs_updated_at` | gatilho | catesa | LACUNA |
| `politica:public.catesa_ai_jobs.CATESA ai jobs: gestao` | politica | catesa | LACUNA |
| `privilegio:catesa_ai_jobs.anon` | privilegio | catesa | LACUNA |
| `privilegio:catesa_ai_jobs.authenticated` | privilegio | catesa | LACUNA |
| `privilegio:catesa_ai_jobs.service_role` | privilegio | catesa | LACUNA |
| `privilegio:catesa_ai_jobs_set_updated_at.PUBLIC` | privilegio | catesa | LACUNA |
| `privilegio:catesa_ai_jobs_set_updated_at.anon` | privilegio | catesa | LACUNA |
| `privilegio:catesa_ai_jobs_set_updated_at.authenticated` | privilegio | catesa | LACUNA |
| `privilegio:catesa_ai_jobs_set_updated_at.service_role` | privilegio | catesa | LACUNA |
| `privilegio:claim_catesa_ai_jobs.service_role` | privilegio | catesa | LACUNA |
| `funcao:can_access_fiscalizacao(fiscalizacao uuid)` | funcao | portal_prestador | LACUNA |
| `funcao:can_access_unidade(unidade uuid)` | funcao | portal_prestador | LACUNA |
| `politica:public.constatacoes_manuais.constatacoes_prestador_select` | politica | portal_prestador | LACUNA |
| `politica:public.determinacoes.determinacoes_prestador_select` | politica | portal_prestador | LACUNA |
| `politica:public.nao_conformidades.ncs_prestador_select` | politica | portal_prestador | LACUNA |
| `politica:public.recomendacoes.recomendacoes_prestador_select` | politica | portal_prestador | LACUNA |
| `politica:public.respostas_checklist.respostas_checklist_prestador_select` | politica | portal_prestador | LACUNA |
| `politica:public.respostas_determinacao.respostas_det_prestador_insert` | politica | portal_prestador | LACUNA |
| `politica:public.respostas_determinacao.respostas_det_prestador_select` | politica | portal_prestador | LACUNA |
| `politica:public.respostas_determinacao.respostas_det_prestador_update` | politica | portal_prestador | LACUNA |
| `politica:public.unidades_fiscalizadas.unidades_prestador_select` | politica | portal_prestador | LACUNA |
| `privilegio:can_access_fiscalizacao.PUBLIC` | privilegio | portal_prestador | LACUNA |
| `privilegio:can_access_fiscalizacao.anon` | privilegio | portal_prestador | LACUNA |
| `privilegio:can_access_fiscalizacao.authenticated` | privilegio | portal_prestador | LACUNA |
| `privilegio:can_access_fiscalizacao.service_role` | privilegio | portal_prestador | LACUNA |
| `privilegio:can_access_unidade.PUBLIC` | privilegio | portal_prestador | LACUNA |
| `privilegio:can_access_unidade.anon` | privilegio | portal_prestador | LACUNA |
| `privilegio:can_access_unidade.authenticated` | privilegio | portal_prestador | LACUNA |
| `privilegio:can_access_unidade.service_role` | privilegio | portal_prestador | LACUNA |
| `papel:authenticator` | papel | fora do escopo: plataforma | — |
| `papel:cli_login_postgres` | papel | fora do escopo: plataforma | — |
| `papel:dashboard_user` | papel | fora do escopo: plataforma | — |
| `papel:pgbouncer` | papel | fora do escopo: plataforma | — |
| `papel:postgres` | papel | fora do escopo: plataforma | — |
| `papel:supabase_admin` | papel | fora do escopo: plataforma | — |
| `papel:supabase_auth_admin` | papel | fora do escopo: plataforma | — |
| `papel:supabase_etl_admin` | papel | fora do escopo: plataforma | — |
| `papel:supabase_functions_admin` | papel | fora do escopo: plataforma | — |
| `papel:supabase_privileged_role` | papel | fora do escopo: plataforma | — |
| `papel:supabase_read_only_user` | papel | fora do escopo: plataforma | — |
| `papel:supabase_realtime_admin` | papel | fora do escopo: plataforma | — |
| `papel:supabase_replication_admin` | papel | fora do escopo: plataforma | — |
| `papel:supabase_storage_admin` | papel | fora do escopo: plataforma | — |
| `privilegio_padrao:postgres.storage.funcao` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:postgres.storage.sequencia` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:postgres.storage.tabela` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.extensions.funcao` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.extensions.sequencia` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.extensions.tabela` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.graphql.funcao` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.graphql.sequencia` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.graphql.tabela` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.graphql_public.funcao` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.graphql_public.sequencia` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.graphql_public.tabela` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.realtime.funcao` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.realtime.sequencia` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_admin.realtime.tabela` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_auth_admin.auth.funcao` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_auth_admin.auth.sequencia` | privilegio_padrao | fora do escopo: plataforma | — |
| `privilegio_padrao:supabase_auth_admin.auth.tabela` | privilegio_padrao | fora do escopo: plataforma | — |
| `evento:issue_graphql_placeholder` | evento | fora do escopo: plataforma | — |
| `evento:issue_pg_cron_access` | evento | fora do escopo: plataforma | — |
| `evento:issue_pg_graphql_access` | evento | fora do escopo: plataforma | — |
| `evento:issue_pg_net_access` | evento | fora do escopo: plataforma | — |
| `evento:pgrst_ddl_watch` | evento | fora do escopo: plataforma | — |
| `evento:pgrst_drop_watch` | evento | fora do escopo: plataforma | — |
| `extensao:pg_stat_statements` | extensao | fora do escopo: plataforma | — |
| `extensao:pgcrypto` | extensao | fora do escopo: plataforma | — |
| `extensao:plpgsql` | extensao | fora do escopo: plataforma | — |
