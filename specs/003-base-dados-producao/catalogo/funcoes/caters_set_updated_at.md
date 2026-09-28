<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_set_updated_at

## `caters_set_updated_at()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): não
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.caters_ai_jobs.trg_caters_ai_jobs_updated_at` (dispara), `gatilho:public.caters_municipality_responses.trg_caters_municipality_responses_updated_at` (dispara), `gatilho:public.caters_processes.trg_caters_processes_updated_at` (dispara), `gatilho:public.caters_recommendations.trg_caters_recommendations_updated_at` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.caters_set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
