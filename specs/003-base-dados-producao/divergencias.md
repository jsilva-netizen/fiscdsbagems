<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv + specs/003-base-dados-producao/inventario/migrations-parte*.tsv e anotacoes/. Não editar. -->

# Divergências entre produção e migrations

Produção: inventário de 2026-09-29T17:09:53.583234+00:00. Migrations: inventário de 2026-09-29T17:33:29.481994+00:00, do banco local reconstruído (`python -m ferramentas.inventario_migrations --reconstruir`).

Diferenças entre o banco de produção e o banco montado só pelas migrations do repositório. Nos diffs, `-` é a versão das migrations e `+` a de produção.

## Resumo

| Tipo | Total | producao_vale | residuo_descartar | defeito_corrigir | aguardando_decisao | nao_classificada |
|---|---:|---:|---:|---:|---:|---:|
| so_producao | 119 | 0 | 0 | 0 | 0 | 119 |
| so_migrations | 40 | 0 | 0 | 0 | 0 | 40 |
| codigo_diferente | 1 | 0 | 0 | 0 | 0 | 1 |
| estrutura_diferente | 21 | 0 | 0 | 0 | 0 | 21 |
| **total** | **181** | **0** | **0** | **0** | **0** | **181** |

## Colunas (19)

### `autos_infracao.arquivo_defesa`

- **Chave**: `coluna:autos_infracao.arquivo_defesa`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `autos_infracao.arquivo_defesa_oficio`

- **Chave**: `coluna:autos_infracao.arquivo_defesa_oficio`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `autos_infracao.arquivo_protocolo_ai_recebido`

- **Chave**: `coluna:autos_infracao.arquivo_protocolo_ai_recebido`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `autos_infracao.arquivo_protocolo_oficio`

- **Chave**: `coluna:autos_infracao.arquivo_protocolo_oficio`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `autos_infracao.arquivo_url`

- **Chave**: `coluna:autos_infracao.arquivo_url`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `autos_infracao.pena_base_rs`

- **Chave**: `coluna:autos_infracao.pena_base_rs`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `autos_infracao.pena_base_uferms`

- **Chave**: `coluna:autos_infracao.pena_base_uferms`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `constatacoes_manuais.descricao`

- **Chave**: `coluna:constatacoes_manuais.descricao`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: obrigatoria: produção True × migrations False

### `constatacoes_manuais.ordem`

- **Chave**: `coluna:constatacoes_manuais.ordem`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: padrao: produção '0' × migrations None

### `determinacoes.origem`

- **Chave**: `coluna:determinacoes.origem`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: padrao: produção "('legacy:'::text || (uuid_generate_v4())::text)" × migrations None

### `fiscalizacoes.tipo_modulo`

- **Chave**: `coluna:fiscalizacoes.tipo_modulo`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: comentario: produção 'Módulo/diretoria de origem da fiscalização.\r\n   DSB: saneamento_dsb | residuos_dsb\r\n   DTR: rodovias_dtr | transportes_dtr | fiscal_dtr\r\n   DGE: gas_dge | energia_dge' × migrations 'Módulo/diretoria de origem da fiscalização.\n   DSB: saneamento_dsb | residuos_dsb\n   DTR: rodovias_dtr | transportes_dtr | fiscal_dtr\n   DGE: gas_dge | energia_dge'

### `prestadores_servico.user_id`

- **Chave**: `coluna:prestadores_servico.user_id`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `profiles.ativo`

- **Chave**: `coluna:profiles.ativo`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: padrao: produção 'true' × migrations 'false'

### `profiles.role`

- **Chave**: `coluna:profiles.role`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: padrao: produção "'user'::text" × migrations "'fiscal'::text"

### `respostas_checklist.comentario`

- **Chave**: `coluna:respostas_checklist.comentario`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `respostas_checklist.pergunta`

- **Chave**: `coluna:respostas_checklist.pergunta`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: obrigatoria: produção True × migrations False

### `tipos_unidade.codigo`

- **Chave**: `coluna:tipos_unidade.codigo`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: comentario: produção 'Código do tipo de unidade (ex: AMX-ETE)' × migrations None

### `unidades_fiscalizadas.total_determinacoes`

- **Chave**: `coluna:unidades_fiscalizadas.total_determinacoes`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `unidades_fiscalizadas.total_recomendacoes`

- **Chave**: `coluna:unidades_fiscalizadas.total_recomendacoes`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

## Restrições (11)

### `autos_infracao.autos_infracao_determinacao_id_fkey`

- **Chave**: `restricao:autos_infracao.autos_infracao_determinacao_id_fkey`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: definicao: produção 'FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id) ON DELETE SET NULL' × migrations 'FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id)'

### `autos_infracao.autos_infracao_pena_base_rs_nonneg`

- **Chave**: `restricao:autos_infracao.autos_infracao_pena_base_rs_nonneg`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `determinacoes.determinacoes_status_check`

- **Chave**: `restricao:determinacoes.determinacoes_status_check`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `fiscalizacoes.fiscalizacoes_municipio_id_fkey`

- **Chave**: `restricao:fiscalizacoes.fiscalizacoes_municipio_id_fkey`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `fiscalizacoes.fiscalizacoes_prestador_servico_id_fkey`

- **Chave**: `restricao:fiscalizacoes.fiscalizacoes_prestador_servico_id_fkey`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `nao_conformidades.nao_conformidades_resposta_checklist_id_fkey`

- **Chave**: `restricao:nao_conformidades.nao_conformidades_resposta_checklist_id_fkey`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: definicao: produção 'FOREIGN KEY (resposta_checklist_id) REFERENCES respostas_checklist(id) ON DELETE SET NULL' × migrations 'FOREIGN KEY (resposta_checklist_id) REFERENCES respostas_checklist(id)'

### `prestadores_servico.prestadores_servico_user_id_fkey`

- **Chave**: `restricao:prestadores_servico.prestadores_servico_user_id_fkey`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `profiles.profiles_non_prestador_must_not_have_prestador_id`

- **Chave**: `restricao:profiles.profiles_non_prestador_must_not_have_prestador_id`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `profiles.profiles_prestador_must_have_prestador_id`

- **Chave**: `restricao:profiles.profiles_prestador_must_have_prestador_id`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `unidades_fiscalizadas.unidades_fiscalizadas_fotos_is_array_check`

- **Chave**: `restricao:unidades_fiscalizadas.unidades_fiscalizadas_fotos_is_array_check`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `unidades_fiscalizadas.unidades_fiscalizadas_tipo_unidade_id_fkey`

- **Chave**: `restricao:unidades_fiscalizadas.unidades_fiscalizadas_tipo_unidade_id_fkey`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

## Índices (17)

### `idx_determinacoes_nc`

- **Chave**: `indice:idx_determinacoes_nc`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_determinacoes_numero`

- **Chave**: `indice:idx_determinacoes_numero`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_determinacoes_unidade`

- **Chave**: `indice:idx_determinacoes_unidade`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_nc_resposta`

- **Chave**: `indice:idx_nc_resposta`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_nc_resposta_checklist`

- **Chave**: `indice:idx_nc_resposta_checklist`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_nc_unidade`

- **Chave**: `indice:idx_nc_unidade`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_respostas_determinacao_determinacao_id`

- **Chave**: `indice:idx_respostas_determinacao_determinacao_id`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `idx_respostas_determinacao_prestador_id`

- **Chave**: `indice:idx_respostas_determinacao_prestador_id`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `idx_unidades_codigo`

- **Chave**: `indice:idx_unidades_codigo`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_unidades_fiscalizacao`

- **Chave**: `indice:idx_unidades_fiscalizacao`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_unidades_fotos_gin`

- **Chave**: `indice:idx_unidades_fotos_gin`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_unidades_nome`

- **Chave**: `indice:idx_unidades_nome`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_unidades_status`

- **Chave**: `indice:idx_unidades_status`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `idx_unidades_tipo`

- **Chave**: `indice:idx_unidades_tipo`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `ux_prestadores_user_id`

- **Chave**: `indice:ux_prestadores_user_id`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `ux_profiles_prestador_servico_id`

- **Chave**: `indice:ux_profiles_prestador_servico_id`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `ux_recomendacoes_unidade_numero`

- **Chave**: `indice:ux_recomendacoes_unidade_numero`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

## Funções (8)

### `can_access_fiscalizacao(fiscalizacao uuid)`

- **Chave**: `funcao:can_access_fiscalizacao(fiscalizacao uuid)`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `can_access_unidade(unidade uuid)`

- **Chave**: `funcao:can_access_unidade(unidade uuid)`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`

- **Chave**: `funcao:claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `confirm_email_on_approval()`

- **Chave**: `funcao:confirm_email_on_approval()`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `determinacoes_fill_origem()`

- **Chave**: `funcao:determinacoes_fill_origem()`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `is_staff()`

- **Chave**: `funcao:is_staff()`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `sync_dates_columns()`

- **Chave**: `funcao:sync_dates_columns()`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `update_updated_at_column()`

- **Chave**: `funcao:update_updated_at_column()`
- **Divergência**: codigo_diferente
- **Classificação**: **nao_classificada**

<details><summary>Diff do código</summary>

```diff
--- migrations
+++ producao
@@ -3,7 +3,7 @@
  LANGUAGE plpgsql
 AS $function$
 BEGIN
-    NEW.updated_at = NOW();
-    RETURN NEW;
+  NEW.updated_at = now();
+  RETURN NEW;
 END;
 $function$
```

</details>

## Gatilhos (2)

### `public.itens_checklist.sync_dates_itens_checklist`

- **Chave**: `gatilho:public.itens_checklist.sync_dates_itens_checklist`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `public.profiles.on_profile_approved`

- **Chave**: `gatilho:public.profiles.on_profile_approved`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

## Políticas de acesso (78)

### `public.autos_infracao.Acesso genérico autenticado (DEV)`

- **Chave**: `politica:public.autos_infracao.Acesso genérico autenticado (DEV)`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `public.autos_infracao.autos_prestador_select`

- **Chave**: `politica:public.autos_infracao.autos_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.autos_infracao.autos_staff_all`

- **Chave**: `politica:public.autos_infracao.autos_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.constatacoes_manuais.constatacoes_prestador_select`

- **Chave**: `politica:public.constatacoes_manuais.constatacoes_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.constatacoes_manuais.constatacoes_staff_all`

- **Chave**: `politica:public.constatacoes_manuais.constatacoes_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.determinacoes.determinacoes_prestador_select`

- **Chave**: `politica:public.determinacoes.determinacoes_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.determinacoes.determinacoes_staff_all`

- **Chave**: `politica:public.determinacoes.determinacoes_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe`

- **Chave**: `politica:public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.julgamentos.julgamentos_prestador_select`

- **Chave**: `politica:public.julgamentos.julgamentos_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.julgamentos.julgamentos_staff_all`

- **Chave**: `politica:public.julgamentos.julgamentos_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.manifestacoes_auto.manifestacoes_prestador_select`

- **Chave**: `politica:public.manifestacoes_auto.manifestacoes_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.manifestacoes_auto.manifestacoes_staff_all`

- **Chave**: `politica:public.manifestacoes_auto.manifestacoes_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.nao_conformidades.ncs_prestador_select`

- **Chave**: `politica:public.nao_conformidades.ncs_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.nao_conformidades.ncs_staff_all`

- **Chave**: `politica:public.nao_conformidades.ncs_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.pareceres_tecnicos.pareceres_prestador_select`

- **Chave**: `politica:public.pareceres_tecnicos.pareceres_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.pareceres_tecnicos.pareceres_staff_all`

- **Chave**: `politica:public.pareceres_tecnicos.pareceres_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.prestadores_servico.prestadores_prestador_select_own`

- **Chave**: `politica:public.prestadores_servico.prestadores_prestador_select_own`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.prestadores_servico.prestadores_staff_all`

- **Chave**: `politica:public.prestadores_servico.prestadores_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.profiles.Edição Própria`

- **Chave**: `politica:public.profiles.Edição Própria`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.profiles.Inserção Própria`

- **Chave**: `politica:public.profiles.Inserção Própria`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.profiles.Leitura pública de perfis`

- **Chave**: `politica:public.profiles.Leitura pública de perfis`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: condicao_using: produção 'true' × migrations '((id = auth.uid()) OR (( SELECT get_my_role() AS get_my_role) IS NOT NULL))'

### `public.profiles.profiles_admin_all`

- **Chave**: `politica:public.profiles.profiles_admin_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.profiles.profiles_self_select`

- **Chave**: `politica:public.profiles.profiles_self_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.profiles.profiles_self_update`

- **Chave**: `politica:public.profiles.profiles_self_update`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.recomendacoes.recomendacoes_prestador_select`

- **Chave**: `politica:public.recomendacoes.recomendacoes_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.recomendacoes.recomendacoes_staff_all`

- **Chave**: `politica:public.recomendacoes.recomendacoes_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.respostas_checklist.respostas_checklist_prestador_select`

- **Chave**: `politica:public.respostas_checklist.respostas_checklist_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.respostas_checklist.respostas_checklist_staff_all`

- **Chave**: `politica:public.respostas_checklist.respostas_checklist_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.respostas_determinacao.respostas_det_prestador_insert`

- **Chave**: `politica:public.respostas_determinacao.respostas_det_prestador_insert`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.respostas_determinacao.respostas_det_prestador_select`

- **Chave**: `politica:public.respostas_determinacao.respostas_det_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.respostas_determinacao.respostas_det_prestador_update`

- **Chave**: `politica:public.respostas_determinacao.respostas_det_prestador_update`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.respostas_determinacao.respostas_det_staff_all`

- **Chave**: `politica:public.respostas_determinacao.respostas_det_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.termos_notificacao.termos_prestador_select_own`

- **Chave**: `politica:public.termos_notificacao.termos_prestador_select_own`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.termos_notificacao.termos_prestador_update_own_until_respondido`

- **Chave**: `politica:public.termos_notificacao.termos_prestador_update_own_until_respondido`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.termos_notificacao.termos_staff_all`

- **Chave**: `politica:public.termos_notificacao.termos_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades`

- **Chave**: `politica:public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.unidades_fiscalizadas.unidades_prestador_select`

- **Chave**: `politica:public.unidades_fiscalizadas.unidades_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `public.unidades_fiscalizadas.unidades_staff_all`

- **Chave**: `politica:public.unidades_fiscalizadas.unidades_staff_all`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Delete`

- **Chave**: `politica:storage.objects.Authenticated Delete`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Delete evidencias`

- **Chave**: `politica:storage.objects.Authenticated Delete evidencias`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Delete relatorios_fiscalizacao`

- **Chave**: `politica:storage.objects.Authenticated Delete relatorios_fiscalizacao`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Insert`

- **Chave**: `politica:storage.objects.Authenticated Insert`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Insert evidencias`

- **Chave**: `politica:storage.objects.Authenticated Insert evidencias`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Insert relatorios_fiscalizacao`

- **Chave**: `politica:storage.objects.Authenticated Insert relatorios_fiscalizacao`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Select relatorios_fiscalizacao`

- **Chave**: `politica:storage.objects.Authenticated Select relatorios_fiscalizacao`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Update`

- **Chave**: `politica:storage.objects.Authenticated Update`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Update evidencias`

- **Chave**: `politica:storage.objects.Authenticated Update evidencias`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Authenticated Update relatorios_fiscalizacao`

- **Chave**: `politica:storage.objects.Authenticated Update relatorios_fiscalizacao`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Documentos Autos Delete`

- **Chave**: `politica:storage.objects.Documentos Autos Delete`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Documentos Autos Insert`

- **Chave**: `politica:storage.objects.Documentos Autos Insert`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Documentos Autos Select`

- **Chave**: `politica:storage.objects.Documentos Autos Select`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Documentos Autos Update`

- **Chave**: `politica:storage.objects.Documentos Autos Update`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Public Access`

- **Chave**: `politica:storage.objects.Public Access`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Public Access evidencias`

- **Chave**: `politica:storage.objects.Public Access evidencias`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `storage.objects.Storage delete authenticated`

- **Chave**: `politica:storage.objects.Storage delete authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.Storage insert authenticated`

- **Chave**: `politica:storage.objects.Storage insert authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.Storage read authenticated`

- **Chave**: `politica:storage.objects.Storage read authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.Storage update authenticated`

- **Chave**: `politica:storage.objects.Storage update authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-autos authenticated all 1fhxxna_0`

- **Chave**: `politica:storage.objects.documentos-autos authenticated all 1fhxxna_0`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-autos authenticated all 1fhxxna_1`

- **Chave**: `politica:storage.objects.documentos-autos authenticated all 1fhxxna_1`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-autos authenticated all 1fhxxna_2`

- **Chave**: `politica:storage.objects.documentos-autos authenticated all 1fhxxna_2`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-autos authenticated all 1fhxxna_3`

- **Chave**: `politica:storage.objects.documentos-autos authenticated all 1fhxxna_3`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-prestadores authenticated all 1rt2ofe_0`

- **Chave**: `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_0`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-prestadores authenticated all 1rt2ofe_1`

- **Chave**: `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_1`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-prestadores authenticated all 1rt2ofe_2`

- **Chave**: `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_2`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-prestadores authenticated all 1rt2ofe_3`

- **Chave**: `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_3`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-termos authenticated all 16irk4e_0`

- **Chave**: `politica:storage.objects.documentos-termos authenticated all 16irk4e_0`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-termos authenticated all 16irk4e_1`

- **Chave**: `politica:storage.objects.documentos-termos authenticated all 16irk4e_1`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-termos authenticated all 16irk4e_2`

- **Chave**: `politica:storage.objects.documentos-termos authenticated all 16irk4e_2`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.documentos-termos authenticated all 16irk4e_3`

- **Chave**: `politica:storage.objects.documentos-termos authenticated all 16irk4e_3`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.p_evid_write`

- **Chave**: `politica:storage.objects.p_evid_write`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.relatorios_fiscalizacao authenticated all 1760aao_0`

- **Chave**: `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_0`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.relatorios_fiscalizacao authenticated all 1760aao_1`

- **Chave**: `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_1`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.relatorios_fiscalizacao authenticated all 1760aao_2`

- **Chave**: `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_2`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.relatorios_fiscalizacao authenticated all 1760aao_3`

- **Chave**: `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_3`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.tn_delete_authenticated`

- **Chave**: `politica:storage.objects.tn_delete_authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.tn_update_authenticated`

- **Chave**: `politica:storage.objects.tn_update_authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `storage.objects.tn_upload_authenticated`

- **Chave**: `politica:storage.objects.tn_upload_authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

## Repositórios de arquivos (8)

### `documentos-autos`

- **Chave**: `bucket:documentos-autos`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: versioning_status: produção 'DISABLED' × migrations None

### `documentos-prestadores`

- **Chave**: `bucket:documentos-prestadores`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `documentos-termos`

- **Chave**: `bucket:documentos-termos`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `evidencias-determinacoes`

- **Chave**: `bucket:evidencias-determinacoes`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: public: produção False × migrations True; versioning_status: produção 'DISABLED' × migrations None

### `fotos_fiscalizacao`

- **Chave**: `bucket:fotos_fiscalizacao`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: public: produção False × migrations True; versioning_status: produção 'DISABLED' × migrations None

### `kml-rodovias`

- **Chave**: `bucket:kml-rodovias`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: versioning_status: produção 'DISABLED' × migrations None

### `logos-entidades`

- **Chave**: `bucket:logos-entidades`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: versioning_status: produção 'DISABLED' × migrations None

### `relatorios_fiscalizacao`

- **Chave**: `bucket:relatorios_fiscalizacao`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: versioning_status: produção 'DISABLED' × migrations None

## Papéis (4)

### `cli_login_postgres`

- **Chave**: `papel:cli_login_postgres`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `postgres`

- **Chave**: `papel:postgres`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: membro_de: produção ['anon', 'authenticated', 'authenticator', 'pg_create_subscription', 'pg_monitor', 'pg_read_all_data', 'pg_signal_backend', 'service_role', 'supabase_privileged_role'] × migrations ['anon', 'authenticated', 'authenticator', 'pg_create_subscription', 'pg_monitor', 'pg_read_all_data', 'pg_signal_backend', 'service_role', 'supabase_functions_admin', 'supabase_privileged_role', 'supabase_realtime_admin']

### `supabase_admin`

- **Chave**: `papel:supabase_admin`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: configuracao: produção ['search_path="$user", public, auth, extensions', 'log_statement=none'] × migrations ['search_path="\\$user", public, auth, extensions', 'log_statement=none']

### `supabase_functions_admin`

- **Chave**: `papel:supabase_functions_admin`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: configuracao: produção None × migrations ['search_path=supabase_functions']

## Privilégios (25)

### `can_access_fiscalizacao.PUBLIC`

- **Chave**: `privilegio:can_access_fiscalizacao.PUBLIC`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `can_access_fiscalizacao.anon`

- **Chave**: `privilegio:can_access_fiscalizacao.anon`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `can_access_fiscalizacao.authenticated`

- **Chave**: `privilegio:can_access_fiscalizacao.authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `can_access_fiscalizacao.service_role`

- **Chave**: `privilegio:can_access_fiscalizacao.service_role`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `can_access_unidade.PUBLIC`

- **Chave**: `privilegio:can_access_unidade.PUBLIC`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `can_access_unidade.anon`

- **Chave**: `privilegio:can_access_unidade.anon`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `can_access_unidade.authenticated`

- **Chave**: `privilegio:can_access_unidade.authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `can_access_unidade.service_role`

- **Chave**: `privilegio:can_access_unidade.service_role`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `claim_relatorios_jobs.service_role`

- **Chave**: `privilegio:claim_relatorios_jobs.service_role`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `confirm_email_on_approval.PUBLIC`

- **Chave**: `privilegio:confirm_email_on_approval.PUBLIC`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `confirm_email_on_approval.anon`

- **Chave**: `privilegio:confirm_email_on_approval.anon`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `confirm_email_on_approval.authenticated`

- **Chave**: `privilegio:confirm_email_on_approval.authenticated`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `confirm_email_on_approval.service_role`

- **Chave**: `privilegio:confirm_email_on_approval.service_role`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `determinacoes_fill_origem.PUBLIC`

- **Chave**: `privilegio:determinacoes_fill_origem.PUBLIC`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `determinacoes_fill_origem.anon`

- **Chave**: `privilegio:determinacoes_fill_origem.anon`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `determinacoes_fill_origem.authenticated`

- **Chave**: `privilegio:determinacoes_fill_origem.authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `determinacoes_fill_origem.service_role`

- **Chave**: `privilegio:determinacoes_fill_origem.service_role`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `is_staff.PUBLIC`

- **Chave**: `privilegio:is_staff.PUBLIC`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `is_staff.anon`

- **Chave**: `privilegio:is_staff.anon`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `is_staff.authenticated`

- **Chave**: `privilegio:is_staff.authenticated`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `is_staff.service_role`

- **Chave**: `privilegio:is_staff.service_role`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `sync_dates_columns.PUBLIC`

- **Chave**: `privilegio:sync_dates_columns.PUBLIC`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `sync_dates_columns.anon`

- **Chave**: `privilegio:sync_dates_columns.anon`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `sync_dates_columns.authenticated`

- **Chave**: `privilegio:sync_dates_columns.authenticated`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `sync_dates_columns.service_role`

- **Chave**: `privilegio:sync_dates_columns.service_role`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

## Privilégios padrão (7)

### `supabase_admin.public.funcao`

- **Chave**: `privilegio_padrao:supabase_admin.public.funcao`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `supabase_admin.public.sequencia`

- **Chave**: `privilegio_padrao:supabase_admin.public.sequencia`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `supabase_admin.public.tabela`

- **Chave**: `privilegio_padrao:supabase_admin.public.tabela`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `supabase_admin.realtime.tabela`

- **Chave**: `privilegio_padrao:supabase_admin.realtime.tabela`
- **Divergência**: estrutura_diferente
- **Classificação**: **nao_classificada**
- **Diferença**: privilegios: produção ['postgres=a*r*wdDxtm/supabase_admin', 'dashboard_user=arwdDxtm/supabase_admin'] × migrations ['postgres=arwdDxtm/supabase_admin', 'dashboard_user=arwdDxtm/supabase_admin']

### `supabase_admin.supabase_functions.funcao`

- **Chave**: `privilegio_padrao:supabase_admin.supabase_functions.funcao`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `supabase_admin.supabase_functions.sequencia`

- **Chave**: `privilegio_padrao:supabase_admin.supabase_functions.sequencia`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

### `supabase_admin.supabase_functions.tabela`

- **Chave**: `privilegio_padrao:supabase_admin.supabase_functions.tabela`
- **Divergência**: so_migrations
- **Classificação**: **nao_classificada**

## Segredos (nomes) (2)

### `RELATORIOS_INVOKE_APIKEY`

- **Chave**: `segredo:RELATORIOS_INVOKE_APIKEY`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**

### `RELATORIOS_WORKER_SECRET`

- **Chave**: `segredo:RELATORIOS_WORKER_SECRET`
- **Divergência**: so_producao
- **Classificação**: **nao_classificada**
