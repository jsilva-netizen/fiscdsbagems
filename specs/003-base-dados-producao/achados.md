<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Achados

O que o sistema novo não deve herdar sem decisão. Cada achado traz evidência, risco, opções e recomendação; a decisão é do responsável pelo projeto (`anotacoes/achados.toml`). Nada aqui altera produção (FR-018).

| Situação | Achados |
|---|---:|
| aguardando_decisao | 0 |
| decidido | 38 |

| Id | Título | Situação |
|---|---|---|
| [A-001](#a-001) | Políticas de teste automatizado (e2e_test_*) em produção | decidido |
| [A-002](#a-002) | Dados de teste em produção | decidido |
| [A-003](#a-003) | Políticas e índices duplicados, e 2 políticas com nome corrompido | decidido |
| [A-004](#a-004) | View caters_fiscalizacoes_disponiveis sem security_invoker | decidido |
| [A-005](#a-005) | 37 funções com permissão elevada (SECURITY DEFINER) | decidido |
| [A-006](#a-006) | Privilégios de anon em todas as tabelas e funções executáveis sem login | decidido |
| [A-007](#a-007) | 13 tabelas vazias em produção | decidido |
| [A-008](#a-008) | Bucket público logos-entidades | decidido |
| [A-009](#a-009) | Objetos criados só em produção, sem migration, e objetos só nas migrations | decidido |
| [A-010](#a-010) | Câmaras caterm e catesg sem correspondência no código | decidido |
| [A-011](#a-011) | Escalada de privilégio no cadastro de usuário | decidido |
| [A-012](#a-012) | Leitura de todos os perfis por conta não aprovada (parte da 137 não aplicada) | decidido |
| [A-013](#a-013) | Escrita sem login e acesso de conta não aprovada | decidido |
| [A-014](#a-014) | Prazos e respostas adulteráveis pelo prestador | decidido |
| [A-015](#a-015) | Funções sem verificação, finalização pela chave de serviço e fila da CATESA ausente | decidido |
| [A-016](#a-016) | Arquivos abertos a todo usuário ativo, inclusive o prestador | decidido |
| [A-017](#a-017) | Portal da entidade monta endereço público para fotos de bucket privado | decidido |
| [A-018](#a-018) | AI assinado enviado pelo portal fica sem referência | decidido |
| [A-019](#a-019) | Envio de arquivos de termo tenta vários buckets até um aceitar | decidido |
| [A-020](#a-020) | Excluir usuário falha para quem tem registros | decidido |
| [A-021](#a-021) | "Drenagem" × "Drenagem Urbana" na dedução da câmara | decidido |
| [A-022](#a-022) | Coordenador exclui perfis e altera nome e e-mail de qualquer usuário pela API | decidido |
| [A-023](#a-023) | Vínculo do prestador gravado nos dois lados, sem transação | decidido |
| [A-024](#a-024) | Checklist versionado só por inserção | decidido |
| [A-025](#a-025) | Colunas que nenhuma parte do sistema grava | decidido |
| [A-026](#a-026) | Políticas da equipe ignoram a câmara nas tabelas filhas | decidido |
| [A-027](#a-027) | Prestador lê dados da fiscalização sem ter recebido termo | decidido |
| [A-028](#a-028) | Numeração de TN, AM e AI com repetição possível e "DSB" fixo | decidido |
| [A-029](#a-029) | Defesa do auto não é salva e referências a colunas inexistentes | decidido |
| [A-030](#a-030) | Tabelas sem uso: julgamentos, manifestações e fotos de evidência | decidido |
| [A-031](#a-031) | Dilação do CATERS grava status inexistente | decidido |
| [A-032](#a-032) | Excluir evento do histórico do CATERS não tem efeito | decidido |
| [A-033](#a-033) | Análises por IA do CATERS nunca processadas em produção | decidido |
| [A-034](#a-034) | Política "(DEV)" de remessas deixa um prestador alterar remessa de outro | decidido |
| [A-035](#a-035) | Funções sem uso | decidido |
| [A-036](#a-036) | IA da CATESA: botão em qualquer câmara, workers sem verificação e veredito que marca "no prazo" | decidido |
| [A-037](#a-037) | Chaves estrangeiras ausentes e padrões inseguros em produção | decidido |
| [A-038](#a-038) | Confirmação de e-mail na aprovação existe só nas migrations | decidido |

<a id="a-001"></a>

## A-001 — Políticas de teste automatizado (e2e_test_*) em produção

**Situação**: decidido

**Objetos**: `politica:public.caters_deadline_extensions.e2e_test_user_own_rows_only`, `politica:public.caters_deadline_extensions.e2e_test_user_own_rows_only_delete`, `politica:public.caters_extra_documents.e2e_test_user_own_rows_only`, `politica:public.caters_extra_documents.e2e_test_user_own_rows_only_delete`, `politica:public.caters_municipality_responses.e2e_test_user_own_rows_only`, `politica:public.caters_municipality_responses.e2e_test_user_own_rows_only_delete`, `politica:public.caters_processes.e2e_test_user_own_rows_only`, `politica:public.caters_processes.e2e_test_user_own_rows_only_delete`, `politica:public.caters_recommendations.e2e_test_user_own_rows_only`, `politica:public.caters_recommendations.e2e_test_user_own_rows_only_delete`, `politica:public.constatacoes_manuais.e2e_test_user_own_rows_only`, `politica:public.constatacoes_manuais.e2e_test_user_own_rows_only_delete`, `politica:public.determinacoes.e2e_test_user_own_rows_only`, `politica:public.determinacoes.e2e_test_user_own_rows_only_delete`, `politica:public.fiscalizacoes.e2e_test_user_own_rows_only`, `politica:public.fiscalizacoes.e2e_test_user_own_rows_only_delete`, `politica:public.recomendacoes.e2e_test_user_own_rows_only`, `politica:public.recomendacoes.e2e_test_user_own_rows_only_delete`, `politica:public.respostas_checklist.e2e_test_user_own_rows_only`, `politica:public.respostas_checklist.e2e_test_user_own_rows_only_delete`, `politica:public.unidades_fiscalizadas.e2e_test_user_own_rows_only`, `politica:public.unidades_fiscalizadas.e2e_test_user_own_rows_only_delete`

**Evidência**: 22 políticas restritivas em 11 tabelas (fiscalização e CATERS), criadas pela migration 135, limitam o usuário de teste e2e (id fixo) às linhas que ele criou. Existem também nas migrations, então não aparecem como divergência. Mostram que os testes automatizados escrevem em produção.

**Risco**: Testes rodando contra produção criam registros de teste misturados aos reais; as políticas só limitam o usuário de teste, não impedem que os registros existam.

**Opções**:

1. Não levar as políticas; no sistema novo, testes automatizados rodam em ambiente próprio, sem acesso a produção.
2. Levar um mecanismo equivalente: usuário de teste restrito em produção.

**Recomendação**: Opção 1: ambiente de homologação com dados sintéticos e nenhum usuário de teste em produção.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Não levar as políticas; no sistema novo, testes automatizados rodam em ambiente próprio, sem acesso a produção. (Opção 1: ambiente de homologação com dados sintéticos e nenhum usuário de teste em produção.)

<a id="a-002"></a>

## A-002 — Dados de teste em produção

**Situação**: decidido

**Objetos**: [respostas_determinacao](catalogo/tabelas/respostas_determinacao.md), `coluna:respostas_determinacao.manifestacao_prestador`, [evidencias-determinacoes](catalogo/arquivos.md#evidencias-determinacoes)

**Evidência**: As 34 respostas a determinações têm manifestações como "a", "aa", "aaa"; os 20 arquivos do bucket de evidências (2026-03-18 a 2026-03-30) são dessas respostas.

**Risco**: Migrar dado de teste como se fosse real e distorcer indicadores (tempo médio de resposta, pontualidade).

**Opções**:

1. Não migrar os registros de teste (lista de ids fechada com o responsável antes da migração de dados).
2. Migrar marcando como teste.
3. Migrar tudo como está.

**Recomendação**: Opção 1. Produção fica como está até a virada (FR-018); a exclusão acontece só na carga do sistema novo.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Não migrar os registros de teste (lista de ids fechada com o responsável antes da migração de dados). (Opção 1. Produção fica como está até a virada (FR-018); a exclusão acontece só na carga do sistema novo.)

<a id="a-003"></a>

## A-003 — Políticas e índices duplicados, e 2 políticas com nome corrompido

**Situação**: decidido

**Objetos**: `politica:public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe`, `politica:public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades`, `politica:public.profiles.Edição Própria`, `politica:public.profiles.profiles_self_update`, `politica:public.profiles.Usuários comuns atualizam apenas dados de contato próprios`, `politica:storage.objects.tn_upload_authenticated`, `politica:storage.objects.tn_update_authenticated`, `politica:storage.objects.tn_delete_authenticated`, `indice:idx_nc_resposta`

**Evidência**: Um conjunto de políticas criado direto em produção (`*_staff_all`, `*_prestador_select`, com `is_staff`, `current_role` e `can_access_*`) repete as das migrations em 13 tabelas; `profiles` tem 10 políticas, 3 delas para o usuário alterar o próprio perfil; nos arquivos, `tn_*` repete `documentos-termos authenticated all 16irk4e_*` e `Storage * authenticated` repete as políticas por bucket; `idx_nc_resposta` é idêntico a `idx_nc_resposta_checklist`; 2 políticas têm o nome corrompido por erro de codificação. As divergências classificadas como `residuo_descartar` listam cada uma.

**Risco**: O acesso efetivo é a soma (OR) de todas as políticas da tabela, difícil de ler; uma duplicata esquecida mantém um acesso que se quis tirar (foi o que anulou proteções nas correções 137 a 139).

**Opções**:

1. No sistema novo, uma regra por papel e operação, descrita na spec de cada módulo pelo acesso efetivo.
2. Reproduzir o conjunto atual de políticas.

**Recomendação**: Opção 1: a spec de cada módulo descreve o acesso efetivo (o resultado da soma), não as políticas.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, uma regra por papel e operação, descrita na spec de cada módulo pelo acesso efetivo. (Opção 1: a spec de cada módulo descreve o acesso efetivo (o resultado da soma), não as políticas.)

<a id="a-004"></a>

## A-004 — View caters_fiscalizacoes_disponiveis sem security_invoker

**Situação**: decidido

**Objetos**: [caters_fiscalizacoes_disponiveis](catalogo/tabelas/caters_fiscalizacoes_disponiveis.md)

**Evidência**: A view rodava com as permissões do dono e era legível sem login, expondo fiscalizações finalizadas de todas as câmaras.

**Risco**: Leitura sem login de dados de fiscalização.

**Opções**:

1. Corrigir em produção (security_invoker e sem acesso anônimo).
2. Só registrar.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-29): Corrigido em produção pela migration 140 (security_invoker e só SELECT para authenticated), aplicada pelo responsável. No sistema novo, a consulta respeita as permissões de quem pede.

<a id="a-005"></a>

## A-005 — 37 funções com permissão elevada (SECURITY DEFINER)

**Situação**: decidido

**Objetos**: [admin_delete_user(p_user_id uuid)](catalogo/funcoes/admin_delete_user.md), [admin_delete_user_by_email(p_email text)](catalogo/funcoes/admin_delete_user_by_email.md), [camara_from_servicos(p_servicos text[])](catalogo/funcoes/camara_from_servicos.md), [can_access_camara(row_camara text)](catalogo/funcoes/can_access_camara.md), [can_access_fiscalizacao(fiscalizacao uuid)](catalogo/funcoes/can_access_fiscalizacao.md), [can_access_unidade(unidade uuid)](catalogo/funcoes/can_access_unidade.md), [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](catalogo/funcoes/caters_import_from_fiscalizacao.md), [claim_caters_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](catalogo/funcoes/claim_caters_ai_jobs.md), [claim_catesa_ai_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](catalogo/funcoes/claim_catesa_ai_jobs.md), [claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](catalogo/funcoes/claim_relatorios_jobs.md), [current_prestador_servico_id()](catalogo/funcoes/current_prestador_servico_id.md), [current_role()](catalogo/funcoes/current_role.md), [determinacoes_fill_origem()](catalogo/funcoes/determinacoes_fill_origem.md), [enforce_profile_security()](catalogo/funcoes/enforce_profile_security.md), [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](catalogo/funcoes/finalizar_fiscalizacao.md), [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](catalogo/funcoes/gerar_ncs_unidade.md), [get_my_camara_tecnica()](catalogo/funcoes/get_my_camara_tecnica.md), [get_my_diretoria()](catalogo/funcoes/get_my_diretoria.md), [get_my_prestador_id()](catalogo/funcoes/get_my_prestador_id.md), [get_my_role()](catalogo/funcoes/get_my_role.md), [handle_new_user()](catalogo/funcoes/handle_new_user.md), [is_caters_user()](catalogo/funcoes/is_caters_user.md), [is_staff()](catalogo/funcoes/is_staff.md), [kick_relatorios_worker(p_job_id uuid, p_limit integer)](catalogo/funcoes/kick_relatorios_worker.md), [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](catalogo/funcoes/obter_resumo_indicadores.md), [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](catalogo/funcoes/obter_resumo_indicadores.md), [prestadores_para_cadastro()](catalogo/funcoes/prestadores_para_cadastro.md), [process_audit_log()](catalogo/funcoes/process_audit_log.md), [propagate_modification_to_parent()](catalogo/funcoes/propagate_modification_to_parent.md), [proteger_resposta_determinacao_prestador()](catalogo/funcoes/proteger_resposta_determinacao_prestador.md), [proteger_termo_prestador()](catalogo/funcoes/proteger_termo_prestador.md), [reabrir_fiscalizacao(p_fiscalizacao_id uuid)](catalogo/funcoes/reabrir_fiscalizacao.md), [set_fiscalizacao_cache_fields()](catalogo/funcoes/set_fiscalizacao_cache_fields.md), [set_fiscalizacao_last_modified()](catalogo/funcoes/set_fiscalizacao_last_modified.md), [trg_auto_set_camara()](catalogo/funcoes/trg_auto_set_camara.md), [trg_fiscalizacao_set_camara()](catalogo/funcoes/trg_fiscalizacao_set_camara.md), [trg_remessa_set_camara()](catalogo/funcoes/trg_remessa_set_camara.md)

**Evidência**: 37 funções rodam com as permissões do dono e ignoram as regras por linha. Até a migration 141, algumas não verificavam quem chamava (reabrir fiscalização, filas dos workers, indicadores); hoje as que expõem dados verificam, e as demais são de gatilho, de permissão ou só leem o próprio perfil.

**Risco**: Cada função é uma porta que ignora as regras por linha; esquecer a verificação expõe ou altera dados (aconteceu com 5 funções).

**Opções**:

1. No sistema novo, nenhuma regra de negócio em função do banco: serviços do Django com verificação explícita de papel e câmara, testada.
2. Manter funções no banco com verificação obrigatória revisada.

**Recomendação**: Opção 1. As regras que elas implementam (geração de NCs, finalização, numeração, indicadores) vão para as specs dos módulos.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, nenhuma regra de negócio em função do banco: serviços do Django com verificação explícita de papel e câmara, testada. (Opção 1. As regras que elas implementam (geração de NCs, finalização, numeração, indicadores) vão para as specs dos módulos.)

<a id="a-006"></a>

## A-006 — Privilégios de anon em todas as tabelas e funções executáveis sem login

**Situação**: decidido

**Objetos**: `papel:anon`, `privilegio_padrao:postgres.public.tabela`, `privilegio_padrao:postgres.public.funcao`

**Evidência**: 36 tabelas e views dão todos os privilégios a `anon`, e 37 funções são executáveis por `anon`/`PUBLIC`: é o padrão do esquema no Supabase. Quem barra são as regras por linha e as verificações internas; as migrations 137, 138 e 141 fecharam os casos que estavam abertos.

**Risco**: Tabela ou função nova nasce aberta; um descuido basta para expor dados sem login.

**Opções**:

1. No sistema novo, negar por padrão: sem login, só entrar, criar conta e listar as entidades do cadastro.
2. Reproduzir o modelo atual.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, negar por padrão: sem login, só entrar, criar conta e listar as entidades do cadastro. (Opção 1.)

<a id="a-007"></a>

## A-007 — 13 tabelas vazias em produção

**Situação**: decidido

**Objetos**: [autos_infracao](catalogo/tabelas/autos_infracao.md), [caters_analysis_history](catalogo/tabelas/caters_analysis_history.md), [caters_deadline_extensions](catalogo/tabelas/caters_deadline_extensions.md), [caters_extra_documents](catalogo/tabelas/caters_extra_documents.md), [caters_municipality_responses](catalogo/tabelas/caters_municipality_responses.md), [caters_notification_reads](catalogo/tabelas/caters_notification_reads.md), [catesa_ai_jobs](catalogo/tabelas/catesa_ai_jobs.md), [fotos_evidencia](catalogo/tabelas/fotos_evidencia.md), [julgamentos](catalogo/tabelas/julgamentos.md), [manifestacoes_auto](catalogo/tabelas/manifestacoes_auto.md), [pareceres_tecnicos](catalogo/tabelas/pareceres_tecnicos.md), [remessas_ai](catalogo/tabelas/remessas_ai.md), [remessas_ai_itens](catalogo/tabelas/remessas_ai_itens.md)

**Evidência**: 13 tabelas não têm nenhuma linha. Parte é funcionalidade pronta e ainda não usada (autos de infração, pareceres, remessas, extras do CATERS, fila da CATESA); parte não tem uso no código (julgamentos, manifestações, fotos de evidência — ver A-030).

**Risco**: Descartar funcionalidade pronta por achar que é resíduo, ou levar estrutura sem uso.

**Opções**:

1. Preservar a funcionalidade das tabelas com uso no código, sem dado a migrar; decidir as sem uso no A-030.
2. Descartar todas as vazias.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Preservar a funcionalidade das tabelas com uso no código, sem dado a migrar; decidir as sem uso no A-030. (Opção 1.)

<a id="a-008"></a>

## A-008 — Bucket público logos-entidades

**Situação**: decidido

**Objetos**: [logos-entidades](catalogo/arquivos.md#logos-entidades), `politica:storage.objects.logos_entidades_public_access`

**Evidência**: Único bucket público: qualquer pessoa com o endereço abre o arquivo, sem login. Os nomes são aleatórios (uuid) e o bucket não tem limite de tamanho nem de tipo.

**Risco**: Baixo: logotipos são institucionais. Sem limite de tipo, o bucket aceita qualquer arquivo de usuário logado.

**Opções**:

1. Manter público, limitando tipo (imagem) e tamanho.
2. Servir por endereço assinado, como os demais.

**Recomendação**: Opção 1: logotipo aparece em relatórios e telas, e endereço público simplifica.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Manter público, limitando tipo (imagem) e tamanho. (Opção 1: logotipo aparece em relatórios e telas, e endereço público simplifica.)

<a id="a-009"></a>

## A-009 — Objetos criados só em produção, sem migration, e objetos só nas migrations

**Situação**: decidido

**Objetos**: [claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)](catalogo/funcoes/claim_relatorios_jobs.md), [is_staff()](catalogo/funcoes/is_staff.md), [can_access_fiscalizacao(fiscalizacao uuid)](catalogo/funcoes/can_access_fiscalizacao.md), [can_access_unidade(unidade uuid)](catalogo/funcoes/can_access_unidade.md), [documentos-prestadores](catalogo/arquivos.md#documentos-prestadores), [documentos-termos](catalogo/arquivos.md#documentos-termos)

**Evidência**: A comparação com o banco montado pelas migrations (divergencias.md) achou 119 objetos só em produção (funções, políticas, colunas, índices, buckets criados pelo painel ou SQL Editor) e 40 só nas migrations (entre eles a confirmação de e-mail na aprovação e o gatilho de datas de itens_checklist). A fila da CATESA, que existia só nas migrations, foi criada em produção pela 141. Um banco montado só pelas migrations não gera relatórios (falta `claim_relatorios_jobs`).

**Risco**: Especificar a partir das migrations descreveria um sistema que não é o de produção.

**Opções**:

1. Especificar a partir de produção (catálogo), com as divergências classificadas.
2. Especificar a partir das migrations.

**Recomendação**: Opção 1, que é o método desta spec; as migrations servem só de histórico.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Especificar a partir de produção (catálogo), com as divergências classificadas. (Opção 1, que é o método desta spec; as migrations servem só de histórico.)

<a id="a-010"></a>

## A-010 — Câmaras caterm e catesg sem correspondência no código

**Situação**: decidido

**Objetos**: [camaras_tecnicas](catalogo/tabelas/camaras_tecnicas.md)

**Evidência**: Produção tem 12 câmaras; `caterm` (terminais rodoviários, DTR) e `catesg` (serviços de gás, DGE) não estão na lista da interface, no mapa de dashboards nem na tela de cadastro, então nenhum usuário consegue escolhê-las.

**Risco**: Câmaras que existem no cadastro mas não no sistema: usuários dessas câmaras não têm como ser cadastrados.

**Opções**:

1. Levar as 12 câmaras e completar a interface.
2. Levar só as 10 usadas.
3. Confirmar com as diretorias quais câmaras existem hoje.

**Recomendação**: Opção 3 antes da spec do core.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 3 — Confirmar com as diretorias quais câmaras existem hoje. (Opção 3 antes da spec do core.) Pendente: confirmar com as diretorias as câmaras existentes antes da spec do core.

<a id="a-011"></a>

## A-011 — Escalada de privilégio no cadastro de usuário

**Situação**: decidido

**Objetos**: [handle_new_user()](catalogo/funcoes/handle_new_user.md), [enforce_profile_security()](catalogo/funcoes/enforce_profile_security.md), [get_my_role()](catalogo/funcoes/get_my_role.md)

**Evidência**: O cadastro aceitava papel escolhido pelo usuário (inclusive admin) e as funções de identidade respondiam para perfil não aprovado (.specify/bugs/escalada-privilegio-cadastro).

**Risco**: Qualquer pessoa criava conta de administrador.

**Opções**:

1. Corrigir em produção.
2. Só registrar.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-29): Corrigido em produção pela migration 137, aplicada pelo responsável. A parte que restringe a leitura de perfis não chegou a produção (A-012). No sistema novo, o papel é definido só pelo admin na aprovação.

<a id="a-012"></a>

## A-012 — Leitura de todos os perfis por conta não aprovada (parte da 137 não aplicada)

**Situação**: decidido

**Objetos**: `politica:public.profiles.Leitura pública de perfis`

**Evidência**: O inventário de 2026-09-29 mostra `Leitura pública de perfis` com `USING (true)`: qualquer conta logada, mesmo sem aprovação, lê nome, e-mail e papel de todos os usuários. A migration 137 (commit 7df89f0) restringe ao próprio perfil ou a quem tem perfil ativo; o banco das migrations já tem a versão restrita.

**Risco**: Quem cria uma conta (sem aprovação) obtém a lista de usuários da AGEMS com e-mails.

**Opções**:

1. Aplicar em produção o trecho da 137.
2. Só registrar.

**Recomendação**: Opção 1: rodar o DROP/CREATE POLICY da 137 no SQL Editor e refazer o inventário.

**Decisão** (jsilva, 2026-09-28): Aprovado pelo responsável ao ampliar a correção 137: restringir a leitura de perfis. Falta aplicar em produção o trecho da migration 137 (linhas 198 a 201).

<a id="a-013"></a>

## A-013 — Escrita sem login e acesso de conta não aprovada

**Situação**: decidido

**Objetos**: [itens_checklist](catalogo/tabelas/itens_checklist.md), [tipos_unidade](catalogo/tabelas/tipos_unidade.md), [prestadores_servico](catalogo/tabelas/prestadores_servico.md)

**Evidência**: Políticas `Public Access` permitiam escrita sem login em itens de checklist e tipos de unidade, e várias políticas `true` valiam para conta não aprovada (.specify/bugs/acesso-aberto-sem-aprovacao).

**Risco**: Alteração do checklist por qualquer pessoa; leitura de dados por conta não aprovada.

**Opções**:

1. Corrigir em produção.
2. Só registrar.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-29): Corrigido em produção pela migration 138, aplicada pelo responsável.

<a id="a-014"></a>

## A-014 — Prazos e respostas adulteráveis pelo prestador

**Situação**: decidido

**Objetos**: [proteger_termo_prestador()](catalogo/funcoes/proteger_termo_prestador.md), [proteger_resposta_determinacao_prestador()](catalogo/funcoes/proteger_resposta_determinacao_prestador.md), [termos_notificacao](catalogo/tabelas/termos_notificacao.md)

**Evidência**: O aparelho do prestador calculava e gravava prazos e pontualidade, e políticas amplas deixavam o prestador mudar status e a análise da equipe (.specify/bugs/prazos-calculados-pelo-prestador).

**Risco**: A entidade regulada alterava o próprio processo sancionador.

**Opções**:

1. Corrigir em produção.
2. Só registrar.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-29): Corrigido em produção pela migration 139, aplicada pelo responsável. No sistema novo, prazos e pontualidade são calculados no servidor.

<a id="a-015"></a>

## A-015 — Funções sem verificação, finalização pela chave de serviço e fila da CATESA ausente

**Situação**: decidido

**Objetos**: [reabrir_fiscalizacao(p_fiscalizacao_id uuid)](catalogo/funcoes/reabrir_fiscalizacao.md), [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](catalogo/funcoes/finalizar_fiscalizacao.md), [e_chave_de_servico()](catalogo/funcoes/e_chave_de_servico.md), [catesa_ai_jobs](catalogo/tabelas/catesa_ai_jobs.md)

**Evidência**: Funções com permissão elevada eram executáveis sem login; a finalização recusava a chave de serviço; a tabela da fila da CATESA não existia (.specify/bugs/funcoes-sem-verificacao).

**Risco**: Reabrir fiscalizações e ler filas sem login; NCs não regeneradas no pedido de relatório; análise da CATESA sempre falhando.

**Opções**:

1. Corrigir em produção.
2. Só registrar.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-29): Corrigido em produção pela migration 141, aplicada pelo responsável.

<a id="a-016"></a>

## A-016 — Arquivos abertos a todo usuário ativo, inclusive o prestador

**Situação**: decidido

**Objetos**: `politica:storage.objects.Storage delete authenticated`, `politica:storage.objects.Storage insert authenticated`, `politica:storage.objects.Storage read authenticated`, `politica:storage.objects.Storage update authenticated`, `politica:storage.objects.documentos-autos authenticated all 1fhxxna_0`, `politica:storage.objects.documentos-autos authenticated all 1fhxxna_1`, `politica:storage.objects.documentos-autos authenticated all 1fhxxna_2`, `politica:storage.objects.documentos-autos authenticated all 1fhxxna_3`, `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_0`, `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_1`, `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_2`, `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_3`, `politica:storage.objects.documentos-termos authenticated all 16irk4e_0`, `politica:storage.objects.documentos-termos authenticated all 16irk4e_1`, `politica:storage.objects.documentos-termos authenticated all 16irk4e_2`, `politica:storage.objects.documentos-termos authenticated all 16irk4e_3`, `politica:storage.objects.kml_rodovias_authenticated_delete`, `politica:storage.objects.kml_rodovias_authenticated_insert`, `politica:storage.objects.kml_rodovias_authenticated_read`, `politica:storage.objects.kml_rodovias_authenticated_update`, `politica:storage.objects.logos_entidades_authenticated_delete`, `politica:storage.objects.logos_entidades_authenticated_insert`, `politica:storage.objects.logos_entidades_authenticated_update`, `politica:storage.objects.logos_entidades_public_access`, `politica:storage.objects.p_evid_write`, `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_0`, `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_1`, `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_2`, `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_3`, `politica:storage.objects.tn_delete_authenticated`, `politica:storage.objects.tn_update_authenticated`, `politica:storage.objects.tn_upload_authenticated`

**Evidência**: As políticas de `storage.objects` só olham o bucket e o perfil ativo: nenhuma olha caminho, câmara ou entidade. O prestador lê, troca e apaga qualquer arquivo dos buckets privados (termos, autos, relatórios, fotos, documentos de outras entidades).

**Risco**: Vazamento e adulteração de documentos do processo sancionador por uma entidade regulada.

**Opções**:

1. Corrigir em produção agora (políticas por caminho/entidade).
2. Não corrigir em produção; no sistema novo, acesso ao arquivo decidido pelo registro que o referencia.

**Recomendação**: No sistema novo, arquivo só é servido por endereço assinado emitido depois de verificar o acesso ao registro dono.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: No sistema novo, arquivo só é servido por endereço assinado emitido depois de verificar o acesso ao registro dono.

<a id="a-017"></a>

## A-017 — Portal da entidade monta endereço público para fotos de bucket privado

**Situação**: decidido

**Objetos**: [fotos_fiscalizacao](catalogo/arquivos.md#fotos_fiscalizacao), `coluna:unidades_fiscalizadas.fotos_unidade`

**Evidência**: A tela de resposta ao termo resolve as fotos com endereço público, supondo o bucket público (migration 044); em produção ele é privado, e esses endereços não abrem.

**Risco**: O prestador não vê as fotos das unidades ao responder o termo.

**Opções**:

1. No sistema novo, fotos servidas por endereço assinado depois de verificar o acesso.
2. Tornar o bucket público.

**Recomendação**: Opção 1 (não tornar público: fotos de vistoria podem ter dados sensíveis).

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, fotos servidas por endereço assinado depois de verificar o acesso. (Opção 1 (não tornar público: fotos de vistoria podem ter dados sensíveis).)

<a id="a-018"></a>

## A-018 — AI assinado enviado pelo portal fica sem referência

**Situação**: decidido

**Objetos**: [documentos-autos](catalogo/arquivos.md#documentos-autos), [autos_infracao](catalogo/tabelas/autos_infracao.md)

**Evidência**: O portal envia o AI assinado pela entidade e procura uma coluna para guardar o endereço entre quatro nomes; nenhuma existe em produção, então o arquivo fica no bucket sem registro que aponte para ele.

**Risco**: Documento do processo sancionador perdido; a equipe não vê o AI assinado.

**Opções**:

1. No sistema novo, o AI assinado pela entidade é um campo do auto.
2. Descartar a etapa.

**Recomendação**: Opção 1, a descrever na spec do processo sancionador.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, o AI assinado pela entidade é um campo do auto. (Opção 1, a descrever na spec do processo sancionador.)

<a id="a-019"></a>

## A-019 — Envio de arquivos de termo tenta vários buckets até um aceitar

**Situação**: decidido

**Objetos**: [documentos-termos](catalogo/arquivos.md#documentos-termos)

**Evidência**: O envio tenta uma lista de nomes (`termos-notificacao`, `documentos-termos`, `documentos`...) e usa o primeiro que aceita; as políticas de arquivos citam `termos-notificacao`, que não existe.

**Risco**: Arquivo gravado em repositório inesperado se outro bucket da lista passar a existir.

**Opções**:

1. No sistema novo, repositório fixo por tipo de documento.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, repositório fixo por tipo de documento. (Opção 1.)

<a id="a-020"></a>

## A-020 — Excluir usuário falha para quem tem registros

**Situação**: decidido

**Objetos**: [admin_delete_user(p_user_id uuid)](catalogo/funcoes/admin_delete_user.md), `restricao:fiscalizacoes.fiscalizacoes_created_by_fkey`, `restricao:caters_processes.caters_processes_created_by_fkey`

**Evidência**: Autoria em fiscalizações, pedidos de relatório, vínculo de entidade e tabelas do CATERS aponta para a conta sem regra de exclusão; a exclusão falha inteira se houver qualquer registro.

**Risco**: Não há como remover quem saiu; a saída real é desativar.

**Opções**:

1. No sistema novo, desativar em vez de excluir, preservando a autoria.
2. Excluir e anonimizar a autoria.

**Recomendação**: Opção 1; excluir só cadastro sem nenhum registro.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, desativar em vez de excluir, preservando a autoria. (Opção 1; excluir só cadastro sem nenhum registro.)

<a id="a-021"></a>

## A-021 — "Drenagem" × "Drenagem Urbana" na dedução da câmara


**Situação**: decidido

**Objetos**: [camara_from_servicos(p_servicos text[])](catalogo/funcoes/camara_from_servicos.md)

**Evidência**: A lista da CATESA tem "Drenagem", mas prestadores e interface usam "Drenagem Urbana": uma fiscalização só de drenagem fica sem câmara.

**Risco**: Fiscalização sem câmara fica visível a todos os fiscais e fora dos painéis da CATESA.

**Opções**:

1. No sistema novo, câmara escolhida explicitamente ou deduzida de tabela de serviços versionada.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, câmara escolhida explicitamente ou deduzida de tabela de serviços versionada. (Opção 1.)

<a id="a-022"></a>

## A-022 — Coordenador exclui perfis e altera nome e e-mail de qualquer usuário pela API

**Situação**: decidido

**Objetos**: `politica:public.profiles.Admins e coordenadores gerenciam perfis`

**Evidência**: A política dá acesso total ao coordenador; o gatilho impede mudar papel, aprovação e vínculos, mas não excluir nem alterar nome e e-mail. A tela não oferece isso ao coordenador.

**Risco**: Coordenador remove ou altera usuários fora da própria câmara.

**Opções**:

1. No sistema novo, gestão de usuários só pelo admin.
2. Coordenador gerencia só a própria câmara.

**Recomendação**: Opção 1, que é o que a tela faz hoje.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, gestão de usuários só pelo admin. (Opção 1, que é o que a tela faz hoje.)

<a id="a-023"></a>

## A-023 — Vínculo do prestador gravado nos dois lados, sem transação

**Situação**: decidido

**Objetos**: `coluna:profiles.prestador_servico_id`, `coluna:prestadores_servico.user_id`

**Evidência**: A tela grava a entidade no perfil e a conta na entidade em passos separados; as restrições do perfil são NOT VALID.

**Risco**: Vínculos inconsistentes (perfil aponta para uma entidade, entidade para outra conta).

**Opções**:

1. No sistema novo, um único vínculo (perfil → entidade).

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, um único vínculo (perfil → entidade). (Opção 1.)

<a id="a-024"></a>

## A-024 — Checklist versionado só por inserção

**Situação**: decidido

**Objetos**: [itens_checklist](catalogo/tabelas/itens_checklist.md), `coluna:itens_checklist.ativo`

**Evidência**: Nenhum item é alterado nem apagado: editar ou excluir insere versão nova. Produção tem 525 itens vigentes e 243 versões antigas; a vistoria usa a versão vigente na criação da unidade.

**Risco**: Regra implícita (chave por tipo e ordem) difícil de manter; mas preserva o texto das vistorias antigas.

**Opções**:

1. Levar o versionamento com modelo explícito (versão, vigência).
2. Levar só a versão vigente e congelar o texto na resposta.

**Recomendação**: Opção 1, descrita na spec de checklists.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Levar o versionamento com modelo explícito (versão, vigência). (Opção 1, descrita na spec de checklists.)

<a id="a-025"></a>

## A-025 — Colunas que nenhuma parte do sistema grava

**Situação**: decidido

**Objetos**: `coluna:fiscalizacoes.latitude_inicio`, `coluna:fiscalizacoes.longitude_inicio`, `coluna:unidades_fiscalizadas.tipo_unidade_nome`, `coluna:unidades_fiscalizadas.total_determinacoes`, `coluna:unidades_fiscalizadas.total_recomendacoes`, `coluna:determinacoes.prazo`

**Evidência**: Nenhuma tela, sincronização ou função grava essas colunas; `determinacoes.prazo` está sempre vazia, mas a importação do CATERS e a IA da CATESA a leem como prazo.

**Risco**: Dado ausente tratado como informação (prazo vazio nas recomendações do CATERS).

**Opções**:

1. Não levar as colunas; calcular totais e usar `data_limite` como prazo.
2. Passar a gravá-las.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Não levar as colunas; calcular totais e usar `data_limite` como prazo. (Opção 1.)

<a id="a-026"></a>

## A-026 — Políticas da equipe ignoram a câmara nas tabelas filhas

**Situação**: decidido

**Objetos**: `politica:public.unidades_fiscalizadas.unidades_staff_all`, `politica:public.autos_infracao.autos_staff_all`

**Evidência**: As políticas `*_staff_all` dão acesso total a admin, fiscal e coordenador ativos sem olhar a câmara; como se somam às políticas por câmara, anulam o isolamento entre câmaras.

**Risco**: Fiscal de uma câmara lê e altera dados de outra.

**Opções**:

1. No sistema novo, isolamento por câmara em toda consulta, com admin como exceção.
2. Manter acesso de toda a equipe a tudo.

**Recomendação**: Confirmar com o responsável se o isolamento por câmara é requisito; se for, opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: Confirmar com o responsável se o isolamento por câmara é requisito; se for, opção 1. Pendente: confirmar com as diretorias se o isolamento por câmara é requisito, antes da spec de fiscalização; se for, vale a opção 1.

<a id="a-027"></a>

## A-027 — Prestador lê dados da fiscalização sem ter recebido termo

**Situação**: decidido

**Objetos**: `politica:public.unidades_fiscalizadas.Prestadores: ler suas próprias unidades`, [can_access_fiscalizacao(fiscalizacao uuid)](catalogo/funcoes/can_access_fiscalizacao.md)

**Evidência**: Políticas antigas liberam ao prestador as unidades, NCs etc. de qualquer fiscalização da própria entidade; somadas, anulam a exigência de termo de `can_access_*`.

**Risco**: A entidade vê a fiscalização antes da notificação formal.

**Opções**:

1. No sistema novo, o prestador só vê a fiscalização depois do termo.
2. Liberar desde a finalização.

**Recomendação**: Opção 1 (regra do portal do prestador).

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, o prestador só vê a fiscalização depois do termo. (Opção 1 (regra do portal do prestador).)

<a id="a-028"></a>

## A-028 — Numeração de TN, AM e AI com repetição possível e "DSB" fixo


**Situação**: decidido

**Objetos**: [gerar_numero_am()](catalogo/funcoes/gerar_numero_am.md), [gerar_numero_auto()](catalogo/funcoes/gerar_numero_auto.md), `coluna:termos_notificacao.numero_termo_notificacao`

**Evidência**: Números são a contagem do ano mais 1 (AM, AI) ou o maior mais 1 calculado no navegador (TN); pedidos simultâneos repetem números, e a sigla "DSB" é fixa para qualquer diretoria.

**Risco**: Documentos oficiais com número repetido; numeração errada fora da DSB.

**Opções**:

1. No sistema novo, sequência no servidor por tipo, diretoria e ano, com unicidade garantida.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, sequência no servidor por tipo, diretoria e ano, com unicidade garantida. (Opção 1.)

<a id="a-029"></a>

## A-029 — Defesa do auto não é salva e referências a colunas inexistentes

**Situação**: decidido

**Objetos**: `coluna:autos_infracao.defesa_texto`, `coluna:autos_infracao.defesa_arquivos`, `coluna:remessas_ai.numero_tn`

**Evidência**: O prestador não tem política de alteração em autos, então a defesa escrita no portal se perde sem erro; a tela usa `data_envio` e `data_limite_manifestacao`, que não existem em autos; `numero_tn` da remessa fica sempre vazio (a tela lê um campo inexistente).

**Risco**: Defesa do regulado perdida no processo sancionador.

**Opções**:

1. No sistema novo, defesa como registro próprio do processo, gravada pelo portal.

**Recomendação**: Opção 1, descrita nas specs do processo sancionador e do portal.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, defesa como registro próprio do processo, gravada pelo portal. (Opção 1, descrita nas specs do processo sancionador e do portal.)

<a id="a-030"></a>

## A-030 — Tabelas sem uso: julgamentos, manifestações e fotos de evidência

**Situação**: decidido

**Objetos**: [julgamentos](catalogo/tabelas/julgamentos.md), [manifestacoes_auto](catalogo/tabelas/manifestacoes_auto.md), [fotos_evidencia](catalogo/tabelas/fotos_evidencia.md)

**Evidência**: As três estão vazias e nenhuma tela as grava; o julgamento é etapa ainda não coberta, a defesa fica no auto e as fotos ficam na unidade.

**Risco**: Levar estrutura sem requisito, ou perder a intenção (julgamento) sem registro.

**Opções**:

1. Não levar as tabelas; o julgamento entra como requisito do processo sancionador, se for escopo.
2. Levar como estão.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Não levar as tabelas; o julgamento entra como requisito do processo sancionador, se for escopo. (Opção 1.)

<a id="a-031"></a>

## A-031 — Dilação do CATERS grava status inexistente

**Situação**: decidido

**Objetos**: `tipo:caters_process_status`, `coluna:caters_processes.status`, [caters_deadline_extensions](catalogo/tabelas/caters_deadline_extensions.md)

**Evidência**: Ao aprovar uma dilação, a tela grava `dilacao_solicitada`, que o tipo não tem; a dilação fica registrada, mas o prazo do processo e o histórico não mudam (a migration 123 supôs texto livre).

**Risco**: Prazo do processo errado depois de dilação aprovada.

**Opções**:

1. No sistema novo, a dilação aprovada atualiza o prazo; incluir ou não a situação "dilação solicitada".

**Recomendação**: Incluir a situação e atualizar o prazo na mesma operação.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: Incluir a situação e atualizar o prazo na mesma operação.

<a id="a-032"></a>

## A-032 — Excluir evento do histórico do CATERS não tem efeito

**Situação**: decidido

**Objetos**: [caters_analysis_history](catalogo/tabelas/caters_analysis_history.md)

**Evidência**: Não há política de exclusão; a tela oferece excluir, nada acontece e nenhum erro aparece.

**Risco**: Usuário acredita ter excluído.

**Opções**:

1. Histórico imutável, sem opção de excluir.
2. Permitir excluir com registro de quem excluiu.

**Recomendação**: Opção 1: histórico é trilha de auditoria.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Histórico imutável, sem opção de excluir. (Opção 1: histórico é trilha de auditoria.)

<a id="a-033"></a>

## A-033 — Análises por IA do CATERS nunca processadas em produção

**Situação**: decidido

**Objetos**: [caters_ai_jobs](catalogo/tabelas/caters_ai_jobs.md)

**Evidência**: Produção tem 7 trabalhos: 6 `queued` e 1 `error`, nenhum concluído; o worker não roda (função não publicada, chave da IA ausente ou nada o aciona) e os workers de IA são publicados sem verificação de quem chama.

**Risco**: Funcionalidade anunciada que não funciona.

**Opções**:

1. Verificar a publicação das edge functions e a chave do Gemini (externos.toml).
2. No sistema novo, fila de tarefas com monitoramento.

**Recomendação**: As duas: verificar agora e especificar a fila no sistema novo.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: As duas: verificar agora e especificar a fila no sistema novo. Pendente: verificar a publicação das edge functions de IA e a chave do Gemini em produção.

<a id="a-034"></a>

## A-034 — Política "(DEV)" de remessas deixa um prestador alterar remessa de outro


**Situação**: decidido

**Objetos**: `politica:public.remessas_ai.Acesso total autenticado (DEV)`

**Evidência**: Qualquer perfil ativo, de qualquer papel e câmara, lê, cria, altera e exclui qualquer remessa; é o que permite ao prestador registrar recebimento e defesa.

**Risco**: Prestador lê e altera remessas de outras entidades.

**Opções**:

1. No sistema novo, prestador só registra recebimento e defesa das próprias remessas.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, prestador só registra recebimento e defesa das próprias remessas. (Opção 1.)

<a id="a-035"></a>

## A-035 — Funções sem uso

**Situação**: decidido

**Objetos**: [determinacoes_fill_origem()](catalogo/funcoes/determinacoes_fill_origem.md), [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](catalogo/funcoes/obter_resumo_indicadores.md)

**Evidência**: `determinacoes_fill_origem` não é chamada por nenhum gatilho; a versão antiga de `obter_resumo_indicadores` não é chamada pela tela.

**Risco**: Nenhum imediato; ruído na especificação.

**Opções**:

1. Não levar.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — Não levar. (Opção 1.)

<a id="a-036"></a>

## A-036 — IA da CATESA: botão em qualquer câmara, workers sem verificação e veredito que marca "no prazo"


**Situação**: decidido

**Objetos**: [catesa_ai_jobs](catalogo/tabelas/catesa_ai_jobs.md), [respostas_determinacao](catalogo/tabelas/respostas_determinacao.md)

**Evidência**: O botão "Analisar com IA" aparece em termos de qualquer câmara e o pedido é recusado para quem não é da CATESA; as edge functions de IA são publicadas com `verify_jwt = false` e os workers não verificam quem chama; aplicar o veredito a uma determinação sem resposta cria uma resposta com `dentro_prazo = true`.

**Risco**: Qualquer pessoa aciona o processamento (custo da IA); pontualidade registrada sem resposta real.

**Opções**:

1. No sistema novo, análise por IA como tarefa interna, acionada só por usuário autorizado; veredito não cria resposta.

**Recomendação**: Opção 1.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, análise por IA como tarefa interna, acionada só por usuário autorizado; veredito não cria resposta. (Opção 1.)

<a id="a-037"></a>

## A-037 — Chaves estrangeiras ausentes e padrões inseguros em produção

**Situação**: decidido

**Objetos**: [fiscalizacoes](catalogo/tabelas/fiscalizacoes.md), [unidades_fiscalizadas](catalogo/tabelas/unidades_fiscalizadas.md), `coluna:profiles.ativo`, `coluna:profiles.role`

**Evidência**: Produção não tem as chaves estrangeiras fiscalização → município, fiscalização → entidade e unidade → tipo, que as migrations criam; `profiles.ativo` tem padrão aprovado (`true`) e `profiles.role` tem padrão `user`, papel inválido (divergências `defeito_corrigir`).

**Risco**: Referências a registros inexistentes; perfil criado por outro caminho nasceria aprovado.

**Opções**:

1. No sistema novo, chaves estrangeiras obrigatórias e perfil sem padrões (aprovação e papel explícitos).
2. Corrigir também em produção.

**Recomendação**: Opção 1; conferir órfãos na migração de dados.

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: opção 1 — No sistema novo, chaves estrangeiras obrigatórias e perfil sem padrões (aprovação e papel explícitos). (Opção 1; conferir órfãos na migração de dados.)

<a id="a-038"></a>

## A-038 — Confirmação de e-mail na aprovação existe só nas migrations

**Situação**: decidido

**Objetos**: [profiles](catalogo/tabelas/profiles.md)

**Evidência**: Nas migrations (027), aprovar o perfil confirma o e-mail da conta; produção não tem a função nem o gatilho. As 8 contas de produção têm e-mail confirmado.

**Risco**: Sem saber se o login exige e-mail confirmado, o fluxo de aprovação do sistema novo pode travar ou dispensar a confirmação sem querer.

**Opções**:

1. Exigir confirmação de e-mail pelo próprio usuário.
2. Aprovação do admin confirma o e-mail.
3. Não exigir confirmação.

**Recomendação**: Decidir com a configuração de autenticação de produção (externos.toml).

**Decisão** (jsilva, 2026-09-30): Aprovada a recomendação: Decidir com a configuração de autenticação de produção (externos.toml). Pendente: exportar a configuração de autenticação de produção (externos.toml) para escolher a opção.
