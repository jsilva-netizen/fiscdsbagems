<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# camara_from_servicos

## `camara_from_servicos(p_servicos text[])`

- **Retorno**: `text` · **Linguagem**: plpgsql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Deduz a câmara técnica de uma fiscalização a partir dos serviços fiscalizados:

- **`caters`:** só "Manejo de Resíduos Sólidos" ou "Limpeza Urbana";
- **`catesa`:** só "Abastecimento de Água", "Esgotamento Sanitário" ou "Drenagem";
- **Nulo:** serviços misturados, desconhecidos (ex.: "Rodovias") ou lista vazia. O registro fica
  visível a todos os fiscais e coordenadores pelo `can_access_camara`.

Chamada só pelo gatilho `trg_fiscalizacao_set_camara`, quando a fiscalização é criada ou tem os
serviços alterados sem câmara informada.

A lista da CATESA tem "Drenagem", mas os prestadores e a interface usam "Drenagem Urbana". Uma
fiscalização só de drenagem ficaria sem câmara. Nenhuma fiscalização de produção tem esse caso. *(fonte: funcao:trg_fiscalizacao_set_camara(), src/lib/offline/repository.ts:175, inventário: dominio_categorico)*

**Regra de negócio**: Uma fiscalização pertence à câmara dos serviços fiscalizados, e serviços de câmaras diferentes
deixam a fiscalização sem câmara. As specs de fiscalização e do CATERS devem descrever a regra, e
a do sistema novo deve corrigir a grafia "Drenagem".

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
