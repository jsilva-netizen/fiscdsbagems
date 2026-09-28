<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Tipos

## caters_ai_job_type

- **Espécie**: enum
- **Valores**: `extract_pdf`, `analyze_response`, `match_response_pdf`
- **Usado em**: [caters_ai_jobs](tabelas/caters_ai_jobs.md).`job_type`
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

## caters_analysis_action_type

- **Espécie**: enum
- **Valores**: `criacao`, `atualizacao_status`, `resposta_recebida`, `prazo_estendido`, `documento_anexado`, `encerramento`, `observacao`
- **Usado em**: [caters_analysis_history](tabelas/caters_analysis_history.md).`action_type`
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

## caters_process_status

- **Espécie**: enum
- **Valores**: `aguardando_analise`, `em_analise`, `respondido`, `no_prazo`, `critico`, `atrasado`, `encerrado`
- **Usado em**: [caters_processes](tabelas/caters_processes.md).`status`
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

## caters_recommendation_priority

- **Espécie**: enum
- **Valores**: `baixa`, `media`, `alta`, `critica`
- **Usado em**: [caters_recommendations](tabelas/caters_recommendations.md).`priority`
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

## caters_recommendation_status

- **Espécie**: enum
- **Valores**: `pendente`, `em_andamento`, `vencido`, `cumprido`
- **Usado em**: [caters_recommendations](tabelas/caters_recommendations.md).`status`
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._
