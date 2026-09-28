<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# trg_fiscalizacao_set_camara

## `trg_fiscalizacao_set_camara()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: [camara_from_servicos(p_servicos text[])](../funcoes/camara_from_servicos.md)
- **Chamada por (banco)**: `gatilho:public.fiscalizacoes.tr_camara_fiscalizacoes` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.trg_fiscalizacao_set_camara()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only auto-derive when camara was not explicitly provided
  IF NEW.camara_tecnica_id IS NULL THEN
    NEW.camara_tecnica_id := public.camara_from_servicos(NEW.servicos);
  END IF;
  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
