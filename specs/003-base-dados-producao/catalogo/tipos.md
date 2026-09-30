<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Tipos

## caters_ai_job_type

- **Espécie**: enum
- **Valores**: `extract_pdf`, `analyze_response`, `match_response_pdf`
- **Usado em**: [caters_ai_jobs](tabelas/caters_ai_jobs.md).`job_type`
- **Dono**: fora do escopo: **descartar** — Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30)., achado A-039

**Finalidade**: Tipos de análise por IA do CATERS:

- `extract_pdf`: lê o relatório de fiscalização e cadastra todas as recomendações encontradas;
- `match_response_pdf`: lê o ofício de resposta do município e liga cada trecho a uma
  recomendação já cadastrada, com a ação e o prazo relatados;
- `analyze_response`: avalia, para cada recomendação, se a resposta registrada e as evidências
  anexadas atendem ao que foi determinado, com um veredito por recomendação e um geral.

Usado só em `caters_ai_jobs.job_type`. *(fonte: coluna:caters_ai_jobs.job_type, supabase/functions/caters_ai_worker/index.ts:49, supabase/functions/caters_ai_worker/index.ts:75, supabase/functions/caters_ai_worker/index.ts:251, src/pages/CatersProcessoDetalhe.jsx:391, src/pages/CatersProcessoDetalhe.jsx:420)*

## caters_analysis_action_type

- **Espécie**: enum
- **Valores**: `criacao`, `atualizacao_status`, `resposta_recebida`, `prazo_estendido`, `documento_anexado`, `encerramento`, `observacao`
- **Usado em**: [caters_analysis_history](tabelas/caters_analysis_history.md).`action_type`
- **Dono**: módulo **caters**

**Finalidade**: Tipos de evento do histórico do CATERS: `criacao`, `atualizacao_status`, `resposta_recebida`,
`prazo_estendido`, `documento_anexado`, `encerramento` e `observacao`. Usado só em
`caters_analysis_history.action_type`. *(fonte: coluna:caters_analysis_history.action_type, src/lib/caters/history.js:3)*

## caters_process_status

- **Espécie**: enum
- **Valores**: `aguardando_analise`, `em_analise`, `respondido`, `no_prazo`, `critico`, `atrasado`, `encerrado`
- **Usado em**: [caters_processes](tabelas/caters_processes.md).`status`
- **Dono**: módulo **caters**

**Finalidade**: Situações de um processo CATERS: `aguardando_analise`, `em_analise`, `respondido`, `no_prazo`,
`critico`, `atrasado` e `encerrado`. Usado só em `caters_processes.status`.

A tela e o painel também usam `dilacao_solicitada`, que não está no tipo; gravar esse valor
falha. No sistema novo, a lista de situações inclui a dilação solicitada ou a tela deixa de
oferecê-la (decisão no achado da dilação). *(fonte: coluna:caters_processes.status, src/lib/caters/processes.js:9, src/lib/caters/dashboard.js:126)*

## caters_recommendation_priority

- **Espécie**: enum
- **Valores**: `baixa`, `media`, `alta`, `critica`
- **Usado em**: [caters_recommendations](tabelas/caters_recommendations.md).`priority`
- **Dono**: módulo **caters**

**Finalidade**: Prioridades de uma recomendação do CATERS: `baixa`, `media`, `alta` e `critica`. Usado só em `caters_recommendations.priority`. *(fonte: coluna:caters_recommendations.priority, src/lib/caters/recommendations.js:17)*

## caters_recommendation_status

- **Espécie**: enum
- **Valores**: `pendente`, `em_andamento`, `vencido`, `cumprido`
- **Usado em**: [caters_recommendations](tabelas/caters_recommendations.md).`status`
- **Dono**: módulo **caters**

**Finalidade**: Situações de uma recomendação do CATERS: `pendente`, `em_andamento`, `vencido` e `cumprido`. Usado
só em `caters_recommendations.status`, que a tela deriva ao gravar. *(fonte: coluna:caters_recommendations.status, src/lib/caters/recommendations.js:4)*
