<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# camara_from_servicos

## `camara_from_servicos(p_servicos text[])`

- **Retorno**: `text` · **Linguagem**: plpgsql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: [trg_fiscalizacao_set_camara()](../funcoes/trg_fiscalizacao_set_camara.md) (chama)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.camara_from_servicos(p_servicos text[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caters TEXT[] := ARRAY['Manejo de Resíduos Sólidos', 'Limpeza Urbana'];
  v_catesa TEXT[] := ARRAY['Abastecimento de Água', 'Esgotamento Sanitário', 'Drenagem'];
  v_has_caters BOOLEAN := FALSE;
  v_has_catesa BOOLEAN := FALSE;
BEGIN
  IF p_servicos IS NULL OR array_length(p_servicos, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM unnest(p_servicos) s WHERE s = ANY(v_caters)),
    EXISTS (SELECT 1 FROM unnest(p_servicos) s WHERE s = ANY(v_catesa))
  INTO v_has_caters, v_has_catesa;

  IF     v_has_caters AND NOT v_has_catesa THEN RETURN 'caters';
  ELSIF  v_has_catesa AND NOT v_has_caters THEN RETURN 'catesa';
  ELSE   RETURN NULL; -- mixed or unknown → legacy, visible to all
  END IF;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
