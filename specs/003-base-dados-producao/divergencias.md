<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv + specs/003-base-dados-producao/inventario/migrations-parte*.tsv e anotacoes/. Não editar. -->

# Divergências entre produção e migrations

Produção: inventário de 2026-09-29T17:09:53.583234+00:00. Migrations: inventário de 2026-09-29T17:33:29.481994+00:00, do banco local reconstruído (`python -m ferramentas.inventario_migrations --reconstruir`).

Diferenças entre o banco de produção e o banco montado só pelas migrations do repositório. Nos diffs, `-` é a versão das migrations e `+` a de produção.

## Resumo

| Tipo | Total | producao_vale | residuo_descartar | defeito_corrigir | aguardando_decisao | nao_classificada |
|---|---:|---:|---:|---:|---:|---:|
| so_producao | 119 | 100 | 17 | 2 | 0 | 0 |
| so_migrations | 40 | 6 | 23 | 5 | 6 | 0 |
| codigo_diferente | 1 | 1 | 0 | 0 | 0 | 0 |
| estrutura_diferente | 20 | 17 | 0 | 3 | 0 | 0 |
| **total** | **180** | **124** | **40** | **10** | **6** | **0** |

## Colunas (18)

### `autos_infracao.arquivo_defesa`

- **Chave**: `coluna:autos_infracao.arquivo_defesa`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Usada pelo envio de documentos do auto (FluxoUploadDocumentos e Gestão de autos); criada direto em produção.

### `autos_infracao.arquivo_defesa_oficio`

- **Chave**: `coluna:autos_infracao.arquivo_defesa_oficio`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Usada pelo envio de documentos do auto (FluxoUploadDocumentos e Gestão de autos); criada direto em produção.

### `autos_infracao.arquivo_protocolo_ai_recebido`

- **Chave**: `coluna:autos_infracao.arquivo_protocolo_ai_recebido`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Usada pelo envio de documentos do auto (FluxoUploadDocumentos e Gestão de autos); criada direto em produção.

### `autos_infracao.arquivo_protocolo_oficio`

- **Chave**: `coluna:autos_infracao.arquivo_protocolo_oficio`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Usada pelo envio de documentos do auto (FluxoUploadDocumentos e Gestão de autos); criada direto em produção.

### `autos_infracao.arquivo_url`

- **Chave**: `coluna:autos_infracao.arquivo_url`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Usada pelo envio de documentos do auto (FluxoUploadDocumentos e Gestão de autos); criada direto em produção.

### `autos_infracao.pena_base_rs`

- **Chave**: `coluna:autos_infracao.pena_base_rs`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Usada na Gestão de autos; criada direto em produção.

### `autos_infracao.pena_base_uferms`

- **Chave**: `coluna:autos_infracao.pena_base_uferms`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Usada na Gestão de autos; criada direto em produção.

### `constatacoes_manuais.descricao`

- **Chave**: `coluna:constatacoes_manuais.descricao`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Obrigatória em produção e opcional nas migrations; a constatação sem texto não faz sentido.
- **Diferença**: obrigatoria: produção True × migrations False

### `constatacoes_manuais.ordem`

- **Chave**: `coluna:constatacoes_manuais.ordem`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Produção tem padrão 0; as migrations, nenhum. Sem efeito na numeração.
- **Diferença**: padrao: produção '0' × migrations None

### `determinacoes.origem`

- **Chave**: `coluna:determinacoes.origem`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Produção preenche `legacy:<uuid>` como padrão, o que garante a unicidade da origem por unidade para linhas sem origem conhecida; as migrations não têm padrão.
- **Diferença**: padrao: produção "('legacy:'::text || (uuid_generate_v4())::text)" × migrations None

### `prestadores_servico.user_id`

- **Chave**: `coluna:prestadores_servico.user_id`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Vínculo da entidade com a conta do prestador, gravado pela tela de usuários e lido pelas políticas; criada direto em produção. O vínculo gravado nos dois lados é achado registrado na T044.

### `profiles.ativo`

- **Chave**: `coluna:profiles.ativo`
- **Divergência**: estrutura_diferente
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Em produção o padrão é aprovado (`true`); o cadastro grava `false`, mas um perfil criado por outro caminho nasceria aprovado. As migrations têm `false`, que é o seguro.
- **Diferença**: padrao: produção 'true' × migrations 'false'

### `profiles.role`

- **Chave**: `coluna:profiles.role`
- **Divergência**: estrutura_diferente
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Produção tem padrão `user`, que não é papel válido; as migrations, `fiscal`. O gatilho de cadastro sempre define o papel. No sistema novo o papel é obrigatório, sem padrão.
- **Diferença**: padrao: produção "'user'::text" × migrations "'fiscal'::text"

### `respostas_checklist.comentario`

- **Chave**: `coluna:respostas_checklist.comentario`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Campo antigo, criado direto em produção; a tela grava em `observacao` e a sincronização não envia este campo.

### `respostas_checklist.pergunta`

- **Chave**: `coluna:respostas_checklist.pergunta`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Obrigatória em produção; os relatórios e as contagens dependem da pergunta copiada.
- **Diferença**: obrigatoria: produção True × migrations False

### `tipos_unidade.codigo`

- **Chave**: `coluna:tipos_unidade.codigo`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Só o comentário da coluna, que existe apenas em produção.
- **Diferença**: comentario: produção 'Código do tipo de unidade (ex: AMX-ETE)' × migrations None

### `unidades_fiscalizadas.total_determinacoes`

- **Chave**: `coluna:unidades_fiscalizadas.total_determinacoes`
- **Divergência**: so_producao
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Criada direto em produção, mas nenhuma função atual a grava: fica em 0 ou no valor de uma versão antiga. No sistema novo, o total é calculado.

### `unidades_fiscalizadas.total_recomendacoes`

- **Chave**: `coluna:unidades_fiscalizadas.total_recomendacoes`
- **Divergência**: so_producao
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Mesma situação de `total_determinacoes`.

## Restrições (11)

### `autos_infracao.autos_infracao_determinacao_id_fkey`

- **Chave**: `restricao:autos_infracao.autos_infracao_determinacao_id_fkey`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Em produção, excluir a determinação deixa a referência do auto vazia (`ON DELETE SET NULL`); pelas migrations, a exclusão seria recusada.
- **Diferença**: definicao: produção 'FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id) ON DELETE SET NULL' × migrations 'FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id)'

### `autos_infracao.autos_infracao_pena_base_rs_nonneg`

- **Chave**: `restricao:autos_infracao.autos_infracao_pena_base_rs_nonneg`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Pena base não negativa; criada direto em produção.

### `determinacoes.determinacoes_status_check`

- **Chave**: `restricao:determinacoes.determinacoes_status_check`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Limita a situação a `pendente`, `cumprida`, `nao_cumprida` e `prorrogada`; criada direto em produção.

### `fiscalizacoes.fiscalizacoes_municipio_id_fkey`

- **Chave**: `restricao:fiscalizacoes.fiscalizacoes_municipio_id_fkey`
- **Divergência**: so_migrations
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Produção não tem a chave estrangeira: nada impede fiscalização com município inexistente. No sistema novo, a chave é obrigatória.

### `fiscalizacoes.fiscalizacoes_prestador_servico_id_fkey`

- **Chave**: `restricao:fiscalizacoes.fiscalizacoes_prestador_servico_id_fkey`
- **Divergência**: so_migrations
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Produção não tem a chave estrangeira: nada impede fiscalização de entidade inexistente.

### `nao_conformidades.nao_conformidades_resposta_checklist_id_fkey`

- **Chave**: `restricao:nao_conformidades.nao_conformidades_resposta_checklist_id_fkey`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Em produção, excluir a resposta do checklist deixa a referência da NC vazia (`ON DELETE SET NULL`); pelas migrations, a exclusão seria recusada. A regeneração de NCs depende disso.
- **Diferença**: definicao: produção 'FOREIGN KEY (resposta_checklist_id) REFERENCES respostas_checklist(id) ON DELETE SET NULL' × migrations 'FOREIGN KEY (resposta_checklist_id) REFERENCES respostas_checklist(id)'

### `prestadores_servico.prestadores_servico_user_id_fkey`

- **Chave**: `restricao:prestadores_servico.prestadores_servico_user_id_fkey`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Chave da coluna `user_id`, que só existe em produção.

### `profiles.profiles_non_prestador_must_not_have_prestador_id`

- **Chave**: `restricao:profiles.profiles_non_prestador_must_not_have_prestador_id`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Só prestador tem entidade vinculada; criada direto em produção como `NOT VALID` (não conferida nas linhas antigas).

### `profiles.profiles_prestador_must_have_prestador_id`

- **Chave**: `restricao:profiles.profiles_prestador_must_have_prestador_id`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Prestador precisa de entidade vinculada; criada direto em produção como `NOT VALID`.

### `unidades_fiscalizadas.unidades_fiscalizadas_fotos_is_array_check`

- **Chave**: `restricao:unidades_fiscalizadas.unidades_fiscalizadas_fotos_is_array_check`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Garante que as fotos da unidade são uma lista; criada direto em produção.

### `unidades_fiscalizadas.unidades_fiscalizadas_tipo_unidade_id_fkey`

- **Chave**: `restricao:unidades_fiscalizadas.unidades_fiscalizadas_tipo_unidade_id_fkey`
- **Divergência**: so_migrations
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Produção não tem a chave estrangeira: nada impede unidade com tipo inexistente.

## Índices (17)

### `idx_determinacoes_nc`

- **Chave**: `indice:idx_determinacoes_nc`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_determinacoes_numero`

- **Chave**: `indice:idx_determinacoes_numero`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_determinacoes_unidade`

- **Chave**: `indice:idx_determinacoes_unidade`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_nc_resposta`

- **Chave**: `indice:idx_nc_resposta`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Idêntico a `idx_nc_resposta_checklist` (A-003).

### `idx_nc_resposta_checklist`

- **Chave**: `indice:idx_nc_resposta_checklist`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_nc_unidade`

- **Chave**: `indice:idx_nc_unidade`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_respostas_determinacao_determinacao_id`

- **Chave**: `indice:idx_respostas_determinacao_determinacao_id`
- **Divergência**: so_migrations
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Índice da chave estrangeira criado pela migration 053 e ausente em produção.

### `idx_respostas_determinacao_prestador_id`

- **Chave**: `indice:idx_respostas_determinacao_prestador_id`
- **Divergência**: so_migrations
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Índice criado pela migration 053 e ausente em produção.

### `idx_unidades_codigo`

- **Chave**: `indice:idx_unidades_codigo`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_unidades_fiscalizacao`

- **Chave**: `indice:idx_unidades_fiscalizacao`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_unidades_fotos_gin`

- **Chave**: `indice:idx_unidades_fotos_gin`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_unidades_nome`

- **Chave**: `indice:idx_unidades_nome`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_unidades_status`

- **Chave**: `indice:idx_unidades_status`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `idx_unidades_tipo`

- **Chave**: `indice:idx_unidades_tipo`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Índice de consulta criado direto em produção, que as migrations não têm.

### `ux_prestadores_user_id`

- **Chave**: `indice:ux_prestadores_user_id`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Garante no máximo uma conta por entidade; criado direto em produção.

### `ux_profiles_prestador_servico_id`

- **Chave**: `indice:ux_profiles_prestador_servico_id`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Garante no máximo um perfil por entidade; criado direto em produção.

### `ux_recomendacoes_unidade_numero`

- **Chave**: `indice:ux_recomendacoes_unidade_numero`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Garante número de recomendação único por unidade; criado direto em produção.

## Funções (8)

### `can_access_fiscalizacao(fiscalizacao uuid)`

- **Chave**: `funcao:can_access_fiscalizacao(fiscalizacao uuid)`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada direto em produção; é usada pelas políticas do prestador que exigem termo de notificação. Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm.

### `can_access_unidade(unidade uuid)`

- **Chave**: `funcao:can_access_unidade(unidade uuid)`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada direto em produção; é usada pelas políticas do prestador que exigem termo de notificação. Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm.

### `claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`

- **Chave**: `funcao:claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: O worker de relatórios depende dela, e nenhuma migration a cria: um banco montado só pelas migrations não gera relatórios. Foi criada direto em produção.

### `confirm_email_on_approval()`

- **Chave**: `funcao:confirm_email_on_approval()`
- **Divergência**: so_migrations
- **Classificação**: **aguardando_decisao**
- **Justificativa**: Nas migrations (027), aprovar o perfil confirma o e-mail da conta; produção não tem a função nem o gatilho. As 8 contas de produção têm e-mail confirmado. Decidir junto com a configuração de autenticação (confirmação de e-mail exigida ou não, externos.toml).

### `determinacoes_fill_origem()`

- **Chave**: `funcao:determinacoes_fill_origem()`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Sem uso: nenhum gatilho de produção a chama; a origem das determinações vem de `gerar_ncs_unidade`.

### `is_staff()`

- **Chave**: `funcao:is_staff()`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada direto em produção; é usada pelas políticas de acesso total da equipe. Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm.

### `sync_dates_columns()`

- **Chave**: `funcao:sync_dates_columns()`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Mantinha `created_date` e `updated_date` de `itens_checklist`, colunas herdadas da plataforma antiga (migration 004). Produção não tem a função nem o gatilho, e o código atual não usa essas colunas.

### `update_updated_at_column()`

- **Chave**: `funcao:update_updated_at_column()`
- **Divergência**: codigo_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Mesma função nos dois lados, com diferença só de forma.
- **O que muda**: Mesma lógica: grava a hora atual em `updated_at`. Muda só `NOW()` para `now()` e o recuo das linhas.

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
- **Classificação**: **residuo_descartar**
- **Justificativa**: Gatilho de `sync_dates_columns`, só nas migrations; mesmo motivo.

### `public.profiles.on_profile_approved`

- **Chave**: `gatilho:public.profiles.on_profile_approved`
- **Divergência**: so_migrations
- **Classificação**: **aguardando_decisao**
- **Justificativa**: Gatilho de `confirm_email_on_approval`, só nas migrations; mesma decisão da função.

## Políticas de acesso (78)

### `public.autos_infracao.Acesso genérico autenticado (DEV)`

- **Chave**: `politica:public.autos_infracao.Acesso genérico autenticado (DEV)`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Política de desenvolvimento das migrations (061) que libera todos os autos a qualquer logado. Não existe em produção e não vai para o sistema novo.

### `public.autos_infracao.autos_prestador_select`

- **Chave**: `politica:public.autos_infracao.autos_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.autos_infracao.autos_staff_all`

- **Chave**: `politica:public.autos_infracao.autos_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.constatacoes_manuais.constatacoes_prestador_select`

- **Chave**: `politica:public.constatacoes_manuais.constatacoes_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.constatacoes_manuais.constatacoes_staff_all`

- **Chave**: `politica:public.constatacoes_manuais.constatacoes_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.determinacoes.determinacoes_prestador_select`

- **Chave**: `politica:public.determinacoes.determinacoes_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.determinacoes.determinacoes_staff_all`

- **Chave**: `politica:public.determinacoes.determinacoes_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe`

- **Chave**: `politica:public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Cópia idêntica de outra política da tabela, com o nome corrompido por erro de codificação (A-003).

### `public.julgamentos.julgamentos_prestador_select`

- **Chave**: `politica:public.julgamentos.julgamentos_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.julgamentos.julgamentos_staff_all`

- **Chave**: `politica:public.julgamentos.julgamentos_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.manifestacoes_auto.manifestacoes_prestador_select`

- **Chave**: `politica:public.manifestacoes_auto.manifestacoes_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.manifestacoes_auto.manifestacoes_staff_all`

- **Chave**: `politica:public.manifestacoes_auto.manifestacoes_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.nao_conformidades.ncs_prestador_select`

- **Chave**: `politica:public.nao_conformidades.ncs_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.nao_conformidades.ncs_staff_all`

- **Chave**: `politica:public.nao_conformidades.ncs_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.pareceres_tecnicos.pareceres_prestador_select`

- **Chave**: `politica:public.pareceres_tecnicos.pareceres_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.pareceres_tecnicos.pareceres_staff_all`

- **Chave**: `politica:public.pareceres_tecnicos.pareceres_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.prestadores_servico.prestadores_prestador_select_own`

- **Chave**: `politica:public.prestadores_servico.prestadores_prestador_select_own`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.prestadores_servico.prestadores_staff_all`

- **Chave**: `politica:public.prestadores_servico.prestadores_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.profiles.Edição Própria`

- **Chave**: `politica:public.profiles.Edição Própria`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Repete `Usuários comuns atualizam apenas dados de contato próprios` e `profiles_self_update` (A-003); os campos protegidos são limitados pelo gatilho `enforce_profile_security`.

### `public.profiles.Inserção Própria`

- **Chave**: `politica:public.profiles.Inserção Própria`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Caminho de reserva para criar o próprio perfil; sem uso desde que a tela de cadastro deixou de inserir o perfil (migration 137): o perfil nasce pelo gatilho de cadastro.

### `public.profiles.Leitura pública de perfis`

- **Chave**: `politica:public.profiles.Leitura pública de perfis`
- **Divergência**: estrutura_diferente
- **Classificação**: **defeito_corrigir**
- **Justificativa**: Produção ainda tem `USING (true)`: qualquer conta logada, mesmo sem aprovação, lê todos os perfis (nome, e-mail, papel). A migration 137 restringe ao próprio perfil ou a quem tem perfil ativo, mas essa parte (commit 7df89f0) não chegou a produção. Corrigir em produção com o trecho da 137.
- **Diferença**: condicao_using: produção 'true' × migrations '((id = auth.uid()) OR (( SELECT get_my_role() AS get_my_role) IS NOT NULL))'

### `public.profiles.profiles_admin_all`

- **Chave**: `politica:public.profiles.profiles_admin_all`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Contida em `Admins e coordenadores gerenciam perfis` (A-003).

### `public.profiles.profiles_self_select`

- **Chave**: `politica:public.profiles.profiles_self_select`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Contida em `Leitura pública de perfis`, que já libera o próprio perfil (A-003).

### `public.profiles.profiles_self_update`

- **Chave**: `politica:public.profiles.profiles_self_update`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Terceira política com o mesmo efeito de `Usuários comuns atualizam apenas dados de contato próprios` (A-003).

### `public.recomendacoes.recomendacoes_prestador_select`

- **Chave**: `politica:public.recomendacoes.recomendacoes_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.recomendacoes.recomendacoes_staff_all`

- **Chave**: `politica:public.recomendacoes.recomendacoes_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.respostas_checklist.respostas_checklist_prestador_select`

- **Chave**: `politica:public.respostas_checklist.respostas_checklist_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.respostas_checklist.respostas_checklist_staff_all`

- **Chave**: `politica:public.respostas_checklist.respostas_checklist_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.respostas_determinacao.respostas_det_prestador_insert`

- **Chave**: `politica:public.respostas_determinacao.respostas_det_prestador_insert`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.respostas_determinacao.respostas_det_prestador_select`

- **Chave**: `politica:public.respostas_determinacao.respostas_det_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.respostas_determinacao.respostas_det_prestador_update`

- **Chave**: `politica:public.respostas_determinacao.respostas_det_prestador_update`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.respostas_determinacao.respostas_det_staff_all`

- **Chave**: `politica:public.respostas_determinacao.respostas_det_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.termos_notificacao.termos_prestador_select_own`

- **Chave**: `politica:public.termos_notificacao.termos_prestador_select_own`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.termos_notificacao.termos_prestador_update_own_until_respondido`

- **Chave**: `politica:public.termos_notificacao.termos_prestador_update_own_until_respondido`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.termos_notificacao.termos_staff_all`

- **Chave**: `politica:public.termos_notificacao.termos_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades`

- **Chave**: `politica:public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Cópia idêntica de outra política da tabela, com o nome corrompido por erro de codificação (A-003).

### `public.unidades_fiscalizadas.unidades_prestador_select`

- **Chave**: `politica:public.unidades_fiscalizadas.unidades_prestador_select`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `public.unidades_fiscalizadas.unidades_staff_all`

- **Chave**: `politica:public.unidades_fiscalizadas.unidades_staff_all`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Faz parte do conjunto de políticas criado direto em produção, com `is_staff`, `current_role` e `can_access_*`, que as migrations não têm. É o que vale hoje; parte dessas políticas repete outras da mesma tabela (A-003), e as da equipe não olham a câmara (achado registrado na T044).

### `storage.objects.Authenticated Delete`

- **Chave**: `politica:storage.objects.Authenticated Delete`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Delete evidencias`

- **Chave**: `politica:storage.objects.Authenticated Delete evidencias`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Delete relatorios_fiscalizacao`

- **Chave**: `politica:storage.objects.Authenticated Delete relatorios_fiscalizacao`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Insert`

- **Chave**: `politica:storage.objects.Authenticated Insert`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Insert evidencias`

- **Chave**: `politica:storage.objects.Authenticated Insert evidencias`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Insert relatorios_fiscalizacao`

- **Chave**: `politica:storage.objects.Authenticated Insert relatorios_fiscalizacao`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Select relatorios_fiscalizacao`

- **Chave**: `politica:storage.objects.Authenticated Select relatorios_fiscalizacao`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Update`

- **Chave**: `politica:storage.objects.Authenticated Update`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Update evidencias`

- **Chave**: `politica:storage.objects.Authenticated Update evidencias`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Authenticated Update relatorios_fiscalizacao`

- **Chave**: `politica:storage.objects.Authenticated Update relatorios_fiscalizacao`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Documentos Autos Delete`

- **Chave**: `politica:storage.objects.Documentos Autos Delete`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Documentos Autos Insert`

- **Chave**: `politica:storage.objects.Documentos Autos Insert`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Documentos Autos Select`

- **Chave**: `politica:storage.objects.Documentos Autos Select`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Documentos Autos Update`

- **Chave**: `politica:storage.objects.Documentos Autos Update`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Versão das migrations da regra de acesso ao bucket; produção usa as políticas criadas pelo painel, com o mesmo efeito depois da migration 138.

### `storage.objects.Public Access`

- **Chave**: `politica:storage.objects.Public Access`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Leitura sem login do bucket, criada pelas migrations; em produção o bucket é privado e essa política não existe.

### `storage.objects.Public Access evidencias`

- **Chave**: `politica:storage.objects.Public Access evidencias`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Leitura sem login do bucket, criada pelas migrations; em produção o bucket é privado e essa política não existe.

### `storage.objects.Storage delete authenticated`

- **Chave**: `politica:storage.objects.Storage delete authenticated`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, cobre vários buckets de uma vez e é a única regra de acesso a `fotos_fiscalizacao` em produção; nos outros buckets repete as políticas por bucket (A-003). Cita o bucket `termos-notificacao`, que não existe. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.Storage insert authenticated`

- **Chave**: `politica:storage.objects.Storage insert authenticated`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, cobre vários buckets de uma vez e é a única regra de acesso a `fotos_fiscalizacao` em produção; nos outros buckets repete as políticas por bucket (A-003). Cita o bucket `termos-notificacao`, que não existe. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.Storage read authenticated`

- **Chave**: `politica:storage.objects.Storage read authenticated`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, cobre vários buckets de uma vez e é a única regra de acesso a `fotos_fiscalizacao` em produção; nos outros buckets repete as políticas por bucket (A-003). Cita o bucket `termos-notificacao`, que não existe. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.Storage update authenticated`

- **Chave**: `politica:storage.objects.Storage update authenticated`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, cobre vários buckets de uma vez e é a única regra de acesso a `fotos_fiscalizacao` em produção; nos outros buckets repete as políticas por bucket (A-003). Cita o bucket `termos-notificacao`, que não existe. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-autos authenticated all 1fhxxna_0`

- **Chave**: `politica:storage.objects.documentos-autos authenticated all 1fhxxna_0`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-autos authenticated all 1fhxxna_1`

- **Chave**: `politica:storage.objects.documentos-autos authenticated all 1fhxxna_1`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-autos authenticated all 1fhxxna_2`

- **Chave**: `politica:storage.objects.documentos-autos authenticated all 1fhxxna_2`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-autos authenticated all 1fhxxna_3`

- **Chave**: `politica:storage.objects.documentos-autos authenticated all 1fhxxna_3`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-prestadores authenticated all 1rt2ofe_0`

- **Chave**: `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_0`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket, que também só existe em produção. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-prestadores authenticated all 1rt2ofe_1`

- **Chave**: `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_1`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket, que também só existe em produção. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-prestadores authenticated all 1rt2ofe_2`

- **Chave**: `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_2`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket, que também só existe em produção. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-prestadores authenticated all 1rt2ofe_3`

- **Chave**: `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_3`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket, que também só existe em produção. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-termos authenticated all 16irk4e_0`

- **Chave**: `politica:storage.objects.documentos-termos authenticated all 16irk4e_0`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket, que também só existe em produção. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-termos authenticated all 16irk4e_1`

- **Chave**: `politica:storage.objects.documentos-termos authenticated all 16irk4e_1`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket, que também só existe em produção. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-termos authenticated all 16irk4e_2`

- **Chave**: `politica:storage.objects.documentos-termos authenticated all 16irk4e_2`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket, que também só existe em produção. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.documentos-termos authenticated all 16irk4e_3`

- **Chave**: `politica:storage.objects.documentos-termos authenticated all 16irk4e_3`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket, que também só existe em produção. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.p_evid_write`

- **Chave**: `politica:storage.objects.p_evid_write`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.relatorios_fiscalizacao authenticated all 1760aao_0`

- **Chave**: `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_0`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.relatorios_fiscalizacao authenticated all 1760aao_1`

- **Chave**: `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_1`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.relatorios_fiscalizacao authenticated all 1760aao_2`

- **Chave**: `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_2`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.relatorios_fiscalizacao authenticated all 1760aao_3`

- **Chave**: `politica:storage.objects.relatorios_fiscalizacao authenticated all 1760aao_3`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criada pelo painel, sem migration; é a regra de acesso ao bucket em produção. As migrations têm um conjunto com outros nomes e, depois da migration 138, o mesmo efeito. A abertura de todos os arquivos a qualquer usuário ativo é achado registrado na T044.

### `storage.objects.tn_delete_authenticated`

- **Chave**: `politica:storage.objects.tn_delete_authenticated`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Repete uma das políticas `documentos-termos authenticated all 16irk4e_*`, com o mesmo efeito (A-003).

### `storage.objects.tn_update_authenticated`

- **Chave**: `politica:storage.objects.tn_update_authenticated`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Repete uma das políticas `documentos-termos authenticated all 16irk4e_*`, com o mesmo efeito (A-003).

### `storage.objects.tn_upload_authenticated`

- **Chave**: `politica:storage.objects.tn_upload_authenticated`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Repete uma das políticas `documentos-termos authenticated all 16irk4e_*`, com o mesmo efeito (A-003).

## Repositórios de arquivos (8)

### `documentos-autos`

- **Chave**: `bucket:documentos-autos`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Só o campo `versioning_status`, que o Storage local não preenche; o comportamento é o mesmo.
- **Diferença**: versioning_status: produção 'DISABLED' × migrations None

### `documentos-prestadores`

- **Chave**: `bucket:documentos-prestadores`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criado pelo painel, sem migration; o cadastro da entidade e o CATERS gravam nele.

### `documentos-termos`

- **Chave**: `bucket:documentos-termos`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criado pelo painel, sem migration; os termos de notificação gravam nele.

### `evidencias-determinacoes`

- **Chave**: `bucket:evidencias-determinacoes`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Em produção o bucket é privado; a migration 054 o cria público. Privado é o correto.
- **Diferença**: public: produção False × migrations True; versioning_status: produção 'DISABLED' × migrations None

### `fotos_fiscalizacao`

- **Chave**: `bucket:fotos_fiscalizacao`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Em produção o bucket é privado; a migration 044 o cria público. Privado é o correto; o portal da entidade ainda monta endereço público para as fotos (achado registrado na T044).
- **Diferença**: public: produção False × migrations True; versioning_status: produção 'DISABLED' × migrations None

### `kml-rodovias`

- **Chave**: `bucket:kml-rodovias`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Só o campo `versioning_status`, que o Storage local não preenche; o comportamento é o mesmo.
- **Diferença**: versioning_status: produção 'DISABLED' × migrations None

### `logos-entidades`

- **Chave**: `bucket:logos-entidades`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Só o campo `versioning_status`, que o Storage local não preenche; o comportamento é o mesmo.
- **Diferença**: versioning_status: produção 'DISABLED' × migrations None

### `relatorios_fiscalizacao`

- **Chave**: `bucket:relatorios_fiscalizacao`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Só o campo `versioning_status`, que o Storage local não preenche; o comportamento é o mesmo.
- **Diferença**: versioning_status: produção 'DISABLED' × migrations None

## Papéis (4)

### `cli_login_postgres`

- **Chave**: `papel:cli_login_postgres`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).

### `postgres`

- **Chave**: `papel:postgres`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).
- **Diferença**: membro_de: produção ['anon', 'authenticated', 'authenticator', 'pg_create_subscription', 'pg_monitor', 'pg_read_all_data', 'pg_signal_backend', 'service_role', 'supabase_privileged_role'] × migrations ['anon', 'authenticated', 'authenticator', 'pg_create_subscription', 'pg_monitor', 'pg_read_all_data', 'pg_signal_backend', 'service_role', 'supabase_functions_admin', 'supabase_privileged_role', 'supabase_realtime_admin']

### `supabase_admin`

- **Chave**: `papel:supabase_admin`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).
- **Diferença**: configuracao: produção ['search_path="$user", public, auth, extensions', 'log_statement=none'] × migrations ['search_path="\\$user", public, auth, extensions', 'log_statement=none']

### `supabase_functions_admin`

- **Chave**: `papel:supabase_functions_admin`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).
- **Diferença**: configuracao: produção None × migrations ['search_path=supabase_functions']

## Privilégios (25)

### `can_access_fiscalizacao.PUBLIC`

- **Chave**: `privilegio:can_access_fiscalizacao.PUBLIC`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `can_access_fiscalizacao(fiscalizacao uuid)`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `can_access_fiscalizacao.anon`

- **Chave**: `privilegio:can_access_fiscalizacao.anon`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `can_access_fiscalizacao(fiscalizacao uuid)`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `can_access_fiscalizacao.authenticated`

- **Chave**: `privilegio:can_access_fiscalizacao.authenticated`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `can_access_fiscalizacao(fiscalizacao uuid)`, que só existe de um lado; segue a classificação dela.

### `can_access_fiscalizacao.service_role`

- **Chave**: `privilegio:can_access_fiscalizacao.service_role`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `can_access_fiscalizacao(fiscalizacao uuid)`, que só existe de um lado; segue a classificação dela.

### `can_access_unidade.PUBLIC`

- **Chave**: `privilegio:can_access_unidade.PUBLIC`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `can_access_unidade(unidade uuid)`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `can_access_unidade.anon`

- **Chave**: `privilegio:can_access_unidade.anon`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `can_access_unidade(unidade uuid)`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `can_access_unidade.authenticated`

- **Chave**: `privilegio:can_access_unidade.authenticated`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `can_access_unidade(unidade uuid)`, que só existe de um lado; segue a classificação dela.

### `can_access_unidade.service_role`

- **Chave**: `privilegio:can_access_unidade.service_role`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `can_access_unidade(unidade uuid)`, que só existe de um lado; segue a classificação dela.

### `claim_relatorios_jobs.service_role`

- **Chave**: `privilegio:claim_relatorios_jobs.service_role`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `claim_relatorios_jobs(p_limit integer, p_job_id uuid, p_stale_minutes integer)`, que só existe de um lado; segue a classificação dela.

### `confirm_email_on_approval.PUBLIC`

- **Chave**: `privilegio:confirm_email_on_approval.PUBLIC`
- **Divergência**: so_migrations
- **Classificação**: **aguardando_decisao**
- **Justificativa**: Privilégio de `confirm_email_on_approval()`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `confirm_email_on_approval.anon`

- **Chave**: `privilegio:confirm_email_on_approval.anon`
- **Divergência**: so_migrations
- **Classificação**: **aguardando_decisao**
- **Justificativa**: Privilégio de `confirm_email_on_approval()`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `confirm_email_on_approval.authenticated`

- **Chave**: `privilegio:confirm_email_on_approval.authenticated`
- **Divergência**: so_migrations
- **Classificação**: **aguardando_decisao**
- **Justificativa**: Privilégio de `confirm_email_on_approval()`, que só existe de um lado; segue a classificação dela.

### `confirm_email_on_approval.service_role`

- **Chave**: `privilegio:confirm_email_on_approval.service_role`
- **Divergência**: so_migrations
- **Classificação**: **aguardando_decisao**
- **Justificativa**: Privilégio de `confirm_email_on_approval()`, que só existe de um lado; segue a classificação dela.

### `determinacoes_fill_origem.PUBLIC`

- **Chave**: `privilegio:determinacoes_fill_origem.PUBLIC`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Privilégio de `determinacoes_fill_origem()`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `determinacoes_fill_origem.anon`

- **Chave**: `privilegio:determinacoes_fill_origem.anon`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Privilégio de `determinacoes_fill_origem()`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `determinacoes_fill_origem.authenticated`

- **Chave**: `privilegio:determinacoes_fill_origem.authenticated`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Privilégio de `determinacoes_fill_origem()`, que só existe de um lado; segue a classificação dela.

### `determinacoes_fill_origem.service_role`

- **Chave**: `privilegio:determinacoes_fill_origem.service_role`
- **Divergência**: so_producao
- **Classificação**: **residuo_descartar**
- **Justificativa**: Privilégio de `determinacoes_fill_origem()`, que só existe de um lado; segue a classificação dela.

### `is_staff.PUBLIC`

- **Chave**: `privilegio:is_staff.PUBLIC`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `is_staff()`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `is_staff.anon`

- **Chave**: `privilegio:is_staff.anon`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `is_staff()`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `is_staff.authenticated`

- **Chave**: `privilegio:is_staff.authenticated`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `is_staff()`, que só existe de um lado; segue a classificação dela.

### `is_staff.service_role`

- **Chave**: `privilegio:is_staff.service_role`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Privilégio de `is_staff()`, que só existe de um lado; segue a classificação dela.

### `sync_dates_columns.PUBLIC`

- **Chave**: `privilegio:sync_dates_columns.PUBLIC`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Privilégio de `sync_dates_columns()`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `sync_dates_columns.anon`

- **Chave**: `privilegio:sync_dates_columns.anon`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Privilégio de `sync_dates_columns()`, que só existe de um lado; segue a classificação dela. Execução por `anon`/`PUBLIC` faz parte do A-006.

### `sync_dates_columns.authenticated`

- **Chave**: `privilegio:sync_dates_columns.authenticated`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Privilégio de `sync_dates_columns()`, que só existe de um lado; segue a classificação dela.

### `sync_dates_columns.service_role`

- **Chave**: `privilegio:sync_dates_columns.service_role`
- **Divergência**: so_migrations
- **Classificação**: **residuo_descartar**
- **Justificativa**: Privilégio de `sync_dates_columns()`, que só existe de um lado; segue a classificação dela.

## Privilégios padrão (7)

### `supabase_admin.public.funcao`

- **Chave**: `privilegio_padrao:supabase_admin.public.funcao`
- **Divergência**: so_migrations
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).

### `supabase_admin.public.sequencia`

- **Chave**: `privilegio_padrao:supabase_admin.public.sequencia`
- **Divergência**: so_migrations
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).

### `supabase_admin.public.tabela`

- **Chave**: `privilegio_padrao:supabase_admin.public.tabela`
- **Divergência**: so_migrations
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).

### `supabase_admin.realtime.tabela`

- **Chave**: `privilegio_padrao:supabase_admin.realtime.tabela`
- **Divergência**: estrutura_diferente
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).
- **Diferença**: privilegios: produção ['postgres=a*r*wdDxtm/supabase_admin', 'dashboard_user=arwdDxtm/supabase_admin'] × migrations ['postgres=arwdDxtm/supabase_admin', 'dashboard_user=arwdDxtm/supabase_admin']

### `supabase_admin.supabase_functions.funcao`

- **Chave**: `privilegio_padrao:supabase_admin.supabase_functions.funcao`
- **Divergência**: so_migrations
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).

### `supabase_admin.supabase_functions.sequencia`

- **Chave**: `privilegio_padrao:supabase_admin.supabase_functions.sequencia`
- **Divergência**: so_migrations
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).

### `supabase_admin.supabase_functions.tabela`

- **Chave**: `privilegio_padrao:supabase_admin.supabase_functions.tabela`
- **Divergência**: so_migrations
- **Classificação**: **producao_vale**
- **Justificativa**: Configuração da plataforma Supabase, diferente entre o banco hospedado e o local; fora do escopo do sistema novo (plataforma.toml).

## Segredos (nomes) (2)

### `RELATORIOS_INVOKE_APIKEY`

- **Chave**: `segredo:RELATORIOS_INVOKE_APIKEY`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criado à mão no cofre de produção, como a migration 132 orienta; o cofre não é copiado entre bancos.

### `RELATORIOS_WORKER_SECRET`

- **Chave**: `segredo:RELATORIOS_WORKER_SECRET`
- **Divergência**: so_producao
- **Classificação**: **producao_vale**
- **Justificativa**: Criado à mão no cofre de produção, como a migration 132 orienta; o cofre não é copiado entre bancos.
