<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# catesa_ai_jobs_set_updated_at

## `catesa_ai_jobs_set_updated_at()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): não
- **Dono**: fora do escopo: **descartar** — Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30)., achado A-039

**Finalidade**: Função do gatilho `trg_catesa_ai_jobs_updated_at`: grava a hora atual em `updated_at`. Repete
`update_updated_at_column` do core e `caters_set_updated_at` do CATERS. *(fonte: gatilho:public.catesa_ai_jobs.trg_catesa_ai_jobs_updated_at, funcao:update_updated_at_column())*

- **Lê**: —
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.catesa_ai_jobs.trg_catesa_ai_jobs_updated_at` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.catesa_ai_jobs_set_updated_at()
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

- Achado **A-039** — Análises por IA ficam fora do sistema novo (situação: decidido; [detalhes](../../achados.md#a-039)).
