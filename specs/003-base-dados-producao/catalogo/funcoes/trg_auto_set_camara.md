<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# trg_auto_set_camara

## `trg_auto_set_camara()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **processo_sancionador**

**Finalidade**: Função do gatilho `tr_camara_autos`. Se o auto de infração vier sem câmara, copia a câmara da
fiscalização de origem. Pertence ao processo sancionador (a tarefa T027 a listava na
fiscalização): age sobre `autos_infracao` e só lê a fiscalização. *(fonte: gatilho:public.autos_infracao.tr_camara_autos)*

- **Lê**: [fiscalizacoes](../tabelas/fiscalizacoes.md)
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.autos_infracao.tr_camara_autos` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.trg_auto_set_camara()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.camara_tecnica_id IS NULL AND NEW.fiscalizacao_id IS NOT NULL THEN
    SELECT camara_tecnica_id INTO NEW.camara_tecnica_id
    FROM public.fiscalizacoes
    WHERE id = NEW.fiscalizacao_id;
  END IF;
  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
