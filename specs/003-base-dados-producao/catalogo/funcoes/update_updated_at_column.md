<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# update_updated_at_column

## `update_updated_at_column()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): não
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.contratos.update_contratos_updated_at` (dispara), `gatilho:public.determinacoes.update_determinacoes_updated_at` (dispara), `gatilho:public.fiscalizacoes.update_fiscalizacoes_updated_at` (dispara), `gatilho:public.prestadores_servico.update_prestadores_updated_at` (dispara), `gatilho:public.tipos_ocorrencia_dtr.update_tipos_ocorrencia_dtr_updated_at` (dispara), `gatilho:public.unidades_fiscalizadas.update_unidades_updated_at` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
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
