<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# is_caters_user

## `is_caters_user()`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Diz se o usuário logado pode usar o módulo CATERS: admin ou qualquer usuário da câmara `caters`,
ativo. Usada por 15 políticas nas 7 tabelas do CATERS e por `caters_import_from_fiscalizacao`.

Para quem não é da câmara, devolve nulo em vez de falso, com o mesmo efeito nas políticas. *(fonte: funcao:get_my_camara_tecnica(), funcao:caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer), supabase/migrations/137_fix_signup_privilege_escalation.sql)*

**Regra de negócio**: O CATERS é acessível só à sua câmara e aos admins, qualquer que seja o papel dentro da câmara. A
spec do módulo CATERS deve descrever isso.

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

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: aguardando_decisao; [detalhes](../../achados.md#a-005)).
