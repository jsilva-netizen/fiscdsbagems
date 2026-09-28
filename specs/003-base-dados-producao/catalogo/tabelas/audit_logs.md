<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# audit_logs

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 19962
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` |  |  |
| 2 | `table_name` | text | sim |  |  |  |
| 3 | `record_id` | uuid | sim |  |  |  |
| 4 | `action` | text | sim |  |  | `UPDATE` (14056), `INSERT` (5319), `DELETE` (587) |
| 5 | `user_id` | uuid |  |  |  |  |
| 6 | `user_email` | text |  |  |  |  |
| 7 | `old_data` | jsonb |  |  |  | JSON — formas: object (14643); chaves: `artigo_portaria`:null (62), `artigo_portaria`:string (45), `camara_tecnica_id`:null (260), `camara_tecnica_id`:string (9642), `codigo_unidade`:string (2600), `comentario`:null (262), `coordenadas`:null (2523), `coordenadas`:string (77), `created_at`:string (14643), `created_by`:null (1182), `created_by`:string (8720), `data_fim`:null (7054), `data_fim`:string (2848), `data_hora_vistoria`:string (2600), `data_inicio`:string (9902), `data_limite`:string (746), `descricao`:string (1835), `descricao_nc`:null (62), `descricao_nc`:string (45), `endereco`:string (2600), `error_message`:null (44), `fiscal_email`:string (9902), `fiscal_nome`:null (546), `fiscal_nome`:string (9356), `fiscalizacao_id`:string (2644), `fotos_unidade`:array (2600), `frente`:null (2428), `frente`:string (172), `gera_nc`:boolean (369), `gps_accuracy_m`:null (2428), `gps_accuracy_m`:number (172), `gravidade`:null (2600), `id`:string (14643), `item_checklist_id`:string (262), `km`:null (2428), `km`:string (172), `km_impreciso`:boolean (2600), `last_modified_at`:string (9902), `last_modified_by`:string (9902), `latitude`:null (1520), `latitude`:number (1080), `latitude_inicio`:null (9902), `longitude`:null (1520), `longitude`:number (1080), `longitude_inicio`:null (9902), `municipio_id`:null (260), `municipio_id`:string (9642), `municipio_nome`:null (260), `municipio_nome`:string (9642), `nao_atendimento`:null (2585), `nao_atendimento`:string (15), `nao_conformidade_id`:null (385), `nao_conformidade_id`:string (361), `nome_unidade`:string (2600), `numero_constatacao`:null (3), `numero_constatacao`:string (366), `numero_determinacao`:null (102), `numero_determinacao`:string (644), `numero_recomendacao`:null (17), `numero_recomendacao`:string (965), `numero_termo`:string (9902), `observacao`:string (262), `ordem`:number (2707), `origem`:string (1728), `parts_count`:number (44), `per`:null (2428), `per`:string (172), `pergunta`:string (262), `prazo`:null (746), `prazo_dias`:number (746), `prazo_dias_nc`:null (2585), `prazo_dias_nc`:number (15), `prestador_servico_id`:string (9902), `prestador_servico_nome`:string (9902), `progress_fotos`:number (44), `progress_unidades`:number (44), `requested_by`:string (44), `resposta`:string (262), `rodovia`:null (12070), `rodovia`:string (432), `sentido`:null (2428), `sentido`:string (172), `servicos`:array (9902), `status`:string (13292), `storage_path`:null (3), `storage_path`:string (41), `texto_determinacao`:null (69), `texto_determinacao`:string (38), `texto_recomendacao`:null (100), `texto_recomendacao`:string (7), `tipo_modulo`:string (9902), `tipo_ocorrencia`:null (2428), `tipo_ocorrencia`:string (172), `tipo_unidade_id`:null (172), `tipo_unidade_id`:string (2428), `tipo_unidade_nome`:null (2600), `total_constatacoes`:number (2600), `total_determinacoes`:number (2600), `total_ncs`:number (2600), `total_recomendacoes`:number (2600), `trecho`:null (2584), `trecho`:string (16), `unidade_fiscalizada_id`:string (2097), `updated_at`:string (14643) |
| 8 | `new_data` | jsonb |  |  |  | JSON — formas: object (19375); chaves: `artigo_portaria`:null (221), `artigo_portaria`:string (185), `camara_tecnica_id`:null (262), `camara_tecnica_id`:string (9666), `codigo_unidade`:null (1), `codigo_unidade`:string (3001), `comentario`:null (3716), `coordenadas`:null (2920), `coordenadas`:string (82), `created_at`:string (19375), `created_by`:null (1188), `created_by`:string (8740), `data_fim`:null (7061), `data_fim`:string (2867), `data_hora_vistoria`:string (3002), `data_inicio`:string (9928), `data_limite`:null (1), `data_limite`:string (928), `descricao`:string (2667), `descricao_nc`:null (227), `descricao_nc`:string (179), `endereco`:null (1), `endereco`:string (3001), `error_message`:null (62), `fiscal_email`:string (9928), `fiscal_nome`:null (550), `fiscal_nome`:string (9378), `fiscalizacao_id`:null (1), `fiscalizacao_id`:string (3063), `fotos_unidade`:array (3002), `frente`:null (2752), `frente`:string (250), `gera_nc`:boolean (4122), `gps_accuracy_m`:null (2752), `gps_accuracy_m`:number (250), `gravidade`:null (3002), `id`:string (19375), `item_checklist_id`:string (3716), `km`:null (2752), `km`:string (250), `km_impreciso`:boolean (3002), `last_modified_at`:string (9928), `last_modified_by`:string (9928), `latitude`:null (1695), `latitude`:number (1307), `latitude_inicio`:null (9928), `longitude`:null (1695), `longitude`:number (1307), `longitude_inicio`:null (9928), `municipio_id`:null (262), `municipio_id`:string (9666), `municipio_nome`:null (262), `municipio_nome`:string (9666), `nao_atendimento`:null (2981), `nao_atendimento`:string (21), `nao_conformidade_id`:null (387), `nao_conformidade_id`:string (542), `nome_unidade`:string (3002), `numero_constatacao`:null (91), `numero_constatacao`:string (4031), `numero_determinacao`:null (129), `numero_determinacao`:string (800), `numero_recomendacao`:null (20), `numero_recomendacao`:string (1312), `numero_termo`:string (9928), `observacao`:string (3716), `ordem`:number (3408), `origem`:string (2261), `parts_count`:number (62), `per`:null (2752), `per`:string (250), `pergunta`:string (3716), `prazo`:null (929), `prazo_dias`:null (1), `prazo_dias`:number (928), `prazo_dias_nc`:null (2981), `prazo_dias_nc`:number (21), `prestador_servico_id`:string (9928), `prestador_servico_nome`:string (9928), `progress_fotos`:number (62), `progress_unidades`:number (62), `requested_by`:string (62), `resposta`:string (3716), `rodovia`:null (12418), `rodovia`:string (512), `sentido`:null (2752), `sentido`:string (250), `servicos`:array (9928), `status`:string (13921), `storage_path`:null (49), `storage_path`:string (13), `texto_determinacao`:null (276), `texto_determinacao`:string (130), `texto_recomendacao`:null (351), `texto_recomendacao`:string (55), `tipo_modulo`:string (9928), `tipo_ocorrencia`:null (2752), `tipo_ocorrencia`:string (250), `tipo_unidade_id`:null (251), `tipo_unidade_id`:string (2751), `tipo_unidade_nome`:null (3002), `total_constatacoes`:number (3002), `total_determinacoes`:number (3002), `total_ncs`:number (3002), `total_recomendacoes`:number (3002), `trecho`:null (2981), `trecho`:string (21), `unidade_fiscalizada_id`:null (16), `unidade_fiscalizada_id`:string (6367), `updated_at`:string (19375) |
| 9 | `created_at` | timestamp with time zone | sim | `now()` |  |  |

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
- **Em linguagem simples**: _Sem anotação._
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
