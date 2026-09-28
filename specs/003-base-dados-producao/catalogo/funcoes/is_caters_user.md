<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# is_caters_user

## `is_caters_user()`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: [get_my_camara_tecnica()](../funcoes/get_my_camara_tecnica.md), [get_my_role()](../funcoes/get_my_role.md)
- **Chamada por (banco)**: [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) (chama), `politica:public.caters_ai_jobs.CATERS ai jobs: gestao` (usa), `politica:public.caters_analysis_history.CATERS historico: inserir` (usa), `politica:public.caters_analysis_history.CATERS historico: leitura` (usa), `politica:public.caters_extra_documents.CATERS documentos: deletar` (usa), `politica:public.caters_extra_documents.CATERS documentos: inserir` (usa), `politica:public.caters_extra_documents.CATERS documentos: leitura` (usa), `politica:public.caters_municipality_responses.CATERS respostas: gestao` (usa), `politica:public.caters_notification_reads.CATERS notif reads: proprias` (usa), `politica:public.caters_processes.CATERS processos: atualizar` (usa), `politica:public.caters_processes.CATERS processos: inserir` (usa), `politica:public.caters_processes.CATERS processos: leitura` (usa), `politica:public.caters_recommendations.CATERS recomendacoes: atualizar` (usa), `politica:public.caters_recommendations.CATERS recomendacoes: deletar` (usa), `politica:public.caters_recommendations.CATERS recomendacoes: inserir` (usa), `politica:public.caters_recommendations.CATERS recomendacoes: leitura` (usa)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.is_caters_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    public.get_my_role() = 'admin'
    OR public.get_my_camara_tecnica() = 'caters'
  );
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
