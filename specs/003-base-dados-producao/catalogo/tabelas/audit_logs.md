<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# audit_logs

- **Tipo**: tabela
- **Dono**: módulo **core**
- **Linhas em produção**: 19966
- **RLS ativo**: sim

## Finalidade

Registro de auditoria: cada inclusão, alteração e exclusão nas tabelas auditadas, com quem fez,
quando e os dados antes e depois. Produção tem cerca de 20 mil registros: 14 mil alterações,
5,3 mil inclusões e 590 exclusões.

- **Quem grava:** os gatilhos `trg_audit_*`, com a função `process_audit_log`, que ignora as
  políticas.
- **Tabelas auditadas:** `fiscalizacoes`, `unidades_fiscalizadas`, `respostas_checklist`,
  `constatacoes_manuais`, `determinacoes`, `recomendacoes` e `relatorios_jobs`.
- **Tabelas não auditadas:** perfis, prestadores, contratos, checklists e os processos
  (termos, autos, CATERS).
- **Onde aparece:** no histórico da fiscalização. *(fonte: funcao:process_audit_log(), src/components/fiscalizacao/HistoricoFiscalizacao.jsx:412, inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do registro de auditoria. *(fonte: funcao:process_audit_log())* |  |
| 2 | `table_name` | text | sim |  | Tabela alterada (nome sem esquema). O histórico filtra por ela. *(fonte: funcao:process_audit_log(), src/components/fiscalizacao/HistoricoFiscalizacao.jsx:395)* |  |
| 3 | `record_id` | uuid | sim |  | Id da linha alterada (o `id` novo ou, na exclusão, o antigo). *(fonte: funcao:process_audit_log(), src/components/fiscalizacao/HistoricoFiscalizacao.jsx:395)* |  |
| 4 | `action` | text | sim |  | Operação: `INSERT`, `UPDATE` ou `DELETE`. *(fonte: funcao:process_audit_log(), inventário: dominio_categorico)* | `UPDATE` (14060), `INSERT` (5319), `DELETE` (587) |
| 5 | `user_id` | uuid |  |  | Quem fez a alteração: o usuário logado ou, nos trabalhos de relatório executados pela chave de<br>serviço, quem pediu o relatório (`requested_by`). Fica vazio se a conta for excluída (`ON DELETE<br>SET NULL`). *(fonte: funcao:process_audit_log(), restricao:audit_logs.audit_logs_user_id_fkey)* |  |
| 6 | `user_email` | text |  |  | E-mail de quem fez a alteração, gravado no momento do registro para continuar legível mesmo se a<br>conta sumir. O histórico mostra "Sistema" quando está vazio. *(fonte: funcao:process_audit_log(), src/components/fiscalizacao/HistoricoFiscalizacao.jsx:360)* |  |
| 7 | `old_data` | jsonb |  |  | A linha inteira antes da alteração ou exclusão (JSON); vazio na inclusão. O histórico também<br>filtra por campos dentro dela, como `fiscalizacao_id` e `unidade_fiscalizada_id`. *(fonte: funcao:process_audit_log(), src/components/fiscalizacao/HistoricoFiscalizacao.jsx:397)* | JSON — formas: object (14647); chaves: `artigo_portaria`:null (62), `artigo_portaria`:string (45), `camara_tecnica_id`:null (260), `camara_tecnica_id`:string (9644), `codigo_unidade`:string (2602), `comentario`:null (262), `coordenadas`:null (2525), `coordenadas`:string (77), `created_at`:string (14647), `created_by`:null (1182), `created_by`:string (8722), `data_fim`:null (7056), `data_fim`:string (2848), `data_hora_vistoria`:string (2602), `data_inicio`:string (9904), `data_limite`:string (746), `descricao`:string (1835), `descricao_nc`:null (62), `descricao_nc`:string (45), `endereco`:string (2602), `error_message`:null (44), `fiscal_email`:string (9904), `fiscal_nome`:null (546), `fiscal_nome`:string (9358), `fiscalizacao_id`:string (2646), `fotos_unidade`:array (2602), `frente`:null (2430), `frente`:string (172), `gera_nc`:boolean (369), `gps_accuracy_m`:null (2430), `gps_accuracy_m`:number (172), `gravidade`:null (2602), `id`:string (14647), `item_checklist_id`:string (262), `km`:null (2430), `km`:string (172), `km_impreciso`:boolean (2602), `last_modified_at`:string (9904), `last_modified_by`:string (9904), `latitude`:null (1520), `latitude`:number (1082), `latitude_inicio`:null (9904), `longitude`:null (1520), `longitude`:number (1082), `longitude_inicio`:null (9904), `municipio_id`:null (260), `municipio_id`:string (9644), `municipio_nome`:null (260), `municipio_nome`:string (9644), `nao_atendimento`:null (2587), `nao_atendimento`:string (15), `nao_conformidade_id`:null (385), `nao_conformidade_id`:string (361), `nome_unidade`:string (2602), `numero_constatacao`:null (3), `numero_constatacao`:string (366), `numero_determinacao`:null (102), `numero_determinacao`:string (644), `numero_recomendacao`:null (17), `numero_recomendacao`:string (965), `numero_termo`:string (9904), `observacao`:string (262), `ordem`:number (2709), `origem`:string (1728), `parts_count`:number (44), `per`:null (2430), `per`:string (172), `pergunta`:string (262), `prazo`:null (746), `prazo_dias`:number (746), `prazo_dias_nc`:null (2587), `prazo_dias_nc`:number (15), `prestador_servico_id`:string (9904), `prestador_servico_nome`:string (9904), `progress_fotos`:number (44), `progress_unidades`:number (44), `requested_by`:string (44), `resposta`:string (262), `rodovia`:null (12074), `rodovia`:string (432), `sentido`:null (2430), `sentido`:string (172), `servicos`:array (9904), `status`:string (13296), `storage_path`:null (3), `storage_path`:string (41), `texto_determinacao`:null (69), `texto_determinacao`:string (38), `texto_recomendacao`:null (100), `texto_recomendacao`:string (7), `tipo_modulo`:string (9904), `tipo_ocorrencia`:null (2430), `tipo_ocorrencia`:string (172), `tipo_unidade_id`:null (172), `tipo_unidade_id`:string (2430), `tipo_unidade_nome`:null (2602), `total_constatacoes`:number (2602), `total_determinacoes`:number (2602), `total_ncs`:number (2602), `total_recomendacoes`:number (2602), `trecho`:null (2586), `trecho`:string (16), `unidade_fiscalizada_id`:string (2097), `updated_at`:string (14647) |
| 8 | `new_data` | jsonb |  |  | A linha inteira depois da inclusão ou alteração (JSON); vazio na exclusão. *(fonte: funcao:process_audit_log(), src/components/fiscalizacao/HistoricoFiscalizacao.jsx:396)* | JSON — formas: object (19379); chaves: `artigo_portaria`:null (221), `artigo_portaria`:string (185), `camara_tecnica_id`:null (262), `camara_tecnica_id`:string (9668), `codigo_unidade`:null (1), `codigo_unidade`:string (3003), `comentario`:null (3716), `coordenadas`:null (2922), `coordenadas`:string (82), `created_at`:string (19379), `created_by`:null (1188), `created_by`:string (8742), `data_fim`:null (7063), `data_fim`:string (2867), `data_hora_vistoria`:string (3004), `data_inicio`:string (9930), `data_limite`:null (1), `data_limite`:string (928), `descricao`:string (2667), `descricao_nc`:null (227), `descricao_nc`:string (179), `endereco`:null (1), `endereco`:string (3003), `error_message`:null (62), `fiscal_email`:string (9930), `fiscal_nome`:null (550), `fiscal_nome`:string (9380), `fiscalizacao_id`:null (1), `fiscalizacao_id`:string (3065), `fotos_unidade`:array (3004), `frente`:null (2754), `frente`:string (250), `gera_nc`:boolean (4122), `gps_accuracy_m`:null (2754), `gps_accuracy_m`:number (250), `gravidade`:null (3004), `id`:string (19379), `item_checklist_id`:string (3716), `km`:null (2754), `km`:string (250), `km_impreciso`:boolean (3004), `last_modified_at`:string (9930), `last_modified_by`:string (9930), `latitude`:null (1695), `latitude`:number (1309), `latitude_inicio`:null (9930), `longitude`:null (1695), `longitude`:number (1309), `longitude_inicio`:null (9930), `municipio_id`:null (262), `municipio_id`:string (9668), `municipio_nome`:null (262), `municipio_nome`:string (9668), `nao_atendimento`:null (2983), `nao_atendimento`:string (21), `nao_conformidade_id`:null (387), `nao_conformidade_id`:string (542), `nome_unidade`:string (3004), `numero_constatacao`:null (91), `numero_constatacao`:string (4031), `numero_determinacao`:null (129), `numero_determinacao`:string (800), `numero_recomendacao`:null (20), `numero_recomendacao`:string (1312), `numero_termo`:string (9930), `observacao`:string (3716), `ordem`:number (3410), `origem`:string (2261), `parts_count`:number (62), `per`:null (2754), `per`:string (250), `pergunta`:string (3716), `prazo`:null (929), `prazo_dias`:null (1), `prazo_dias`:number (928), `prazo_dias_nc`:null (2983), `prazo_dias_nc`:number (21), `prestador_servico_id`:string (9930), `prestador_servico_nome`:string (9930), `progress_fotos`:number (62), `progress_unidades`:number (62), `requested_by`:string (62), `resposta`:string (3716), `rodovia`:null (12422), `rodovia`:string (512), `sentido`:null (2754), `sentido`:string (250), `servicos`:array (9930), `status`:string (13925), `storage_path`:null (49), `storage_path`:string (13), `texto_determinacao`:null (276), `texto_determinacao`:string (130), `texto_recomendacao`:null (351), `texto_recomendacao`:string (55), `tipo_modulo`:string (9930), `tipo_ocorrencia`:null (2754), `tipo_ocorrencia`:string (250), `tipo_unidade_id`:null (251), `tipo_unidade_id`:string (2753), `tipo_unidade_nome`:null (3004), `total_constatacoes`:number (3004), `total_determinacoes`:number (3004), `total_ncs`:number (3004), `total_recomendacoes`:number (3004), `trecho`:null (2983), `trecho`:string (21), `unidade_fiscalizada_id`:null (16), `unidade_fiscalizada_id`:string (6367), `updated_at`:string (19379) |
| 9 | `created_at` | timestamp with time zone | sim | `now()` | Quando a alteração foi registrada; o histórico ordena por aqui. *(fonte: indice:audit_logs_created_at_idx)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `audit_logs_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `audit_logs_user_id_fkey` | chave_estrangeira | `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL` |

| Índice | Definição |
|---|---|
| `audit_logs_created_at_idx` | `CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at DESC)` |
| `audit_logs_pkey` | `CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)` |
| `audit_logs_table_name_record_id_idx` | `CREATE INDEX audit_logs_table_name_record_id_idx ON public.audit_logs USING btree (table_name, record_id)` |
| `audit_logs_user_id_idx` | `CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id)` |

## Dependências

**Depende de:**

- `externo:auth.users` — referencia (catalogo)

**É usada por:**

- [process_audit_log()](../funcoes/process_audit_log.md) — escreve (codigo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais, Coordenadores e Admins leem logs de auditoria

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos leem todos os registros de auditoria, de qualquer câmara.
Ninguém grava pela API: não há política de escrita, e só a função de auditoria insere. *(fonte: funcao:get_my_role(), funcao:process_audit_log())*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
