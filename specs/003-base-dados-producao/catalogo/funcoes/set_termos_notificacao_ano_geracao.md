<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# set_termos_notificacao_ano_geracao

## `set_termos_notificacao_ano_geracao()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): não
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.termos_notificacao.trg_termos_notificacao_set_ano_geracao` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.set_termos_notificacao_ano_geracao()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.ano_geracao := extract(year from coalesce(NEW.data_geracao, now()))::int;
  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
