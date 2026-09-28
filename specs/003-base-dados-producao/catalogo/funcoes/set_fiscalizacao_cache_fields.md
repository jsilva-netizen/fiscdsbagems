<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# set_fiscalizacao_cache_fields

## `set_fiscalizacao_cache_fields()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: [municipios](../tabelas/municipios.md), [prestadores_servico](../tabelas/prestadores_servico.md), [profiles](../tabelas/profiles.md), `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.fiscalizacoes.trg_set_fiscalizacao_cache_fields` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.set_fiscalizacao_cache_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.municipio_id IS NOT NULL THEN
    SELECT nome INTO NEW.municipio_nome FROM public.municipios WHERE id = NEW.municipio_id;
  END IF;
  
  IF NEW.prestador_servico_id IS NOT NULL THEN
    SELECT nome INTO NEW.prestador_servico_nome FROM public.prestadores_servico WHERE id = NEW.prestador_servico_id;
  END IF;

  IF NEW.fiscal_nome IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT full_name INTO NEW.fiscal_nome FROM public.profiles WHERE id = auth.uid();
  END IF;

  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
