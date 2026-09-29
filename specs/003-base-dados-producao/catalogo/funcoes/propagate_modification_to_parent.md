<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# propagate_modification_to_parent

## `propagate_modification_to_parent()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **fiscalizacao**

**Finalidade**: Função de gatilho: quando algo muda numa unidade, resposta, constatação, determinação ou
recomendação, atualiza `updated_at` da fiscalização a que pertence. Assim, a sincronização
incremental dos aparelhos baixa de novo a fiscalização inteira. Usada pelos 5 gatilhos
`trg_propagate_*`. *(fonte: gatilho:public.unidades_fiscalizadas.trg_propagate_unidades, gatilho:public.respostas_checklist.trg_propagate_respostas, src/lib/offline/syncEngine.ts:1702)*

- **Lê**: [constatacoes_manuais](../tabelas/constatacoes_manuais.md), [determinacoes](../tabelas/determinacoes.md), [recomendacoes](../tabelas/recomendacoes.md), [respostas_checklist](../tabelas/respostas_checklist.md), [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md)
- **Escreve**: [fiscalizacoes](../tabelas/fiscalizacoes.md)
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.constatacoes_manuais.trg_propagate_constatacoes` (dispara), `gatilho:public.determinacoes.trg_propagate_determinacoes` (dispara), `gatilho:public.recomendacoes.trg_propagate_recomendacoes` (dispara), `gatilho:public.respostas_checklist.trg_propagate_respostas` (dispara), `gatilho:public.unidades_fiscalizadas.trg_propagate_unidades` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.propagate_modification_to_parent()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_fiscalizacao_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'unidades_fiscalizadas' THEN
    v_fiscalizacao_id := COALESCE(NEW.fiscalizacao_id, OLD.fiscalizacao_id);
  ELSIF TG_TABLE_NAME IN ('respostas_checklist', 'constatacoes_manuais', 'recomendacoes', 'determinacoes') THEN
    SELECT fiscalizacao_id INTO v_fiscalizacao_id
    FROM public.unidades_fiscalizadas
    WHERE id = COALESCE(NEW.unidade_fiscalizada_id, OLD.unidade_fiscalizada_id);
  END IF;

  IF v_fiscalizacao_id IS NOT NULL THEN
    UPDATE public.fiscalizacoes
    SET updated_at = now()
    WHERE id = v_fiscalizacao_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
