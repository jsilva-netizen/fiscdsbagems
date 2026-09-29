<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# determinacoes_fill_origem

## `determinacoes_fill_origem()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **fiscalizacao**

**Finalidade**: Função de gatilho que preencheria a `origem` de uma determinação sem origem: `checklist:<item>`,
quando a NC veio de resposta do checklist, ou `legacy:<id>`. **Sem uso**: nenhum gatilho de
produção a chama. Hoje a origem vem de `gerar_ncs_unidade`, do aparelho ou do padrão da coluna
(`legacy:<uuid novo>`). *(fonte: tabela:determinacoes, coluna:determinacoes.origem)*

- **Lê**: [nao_conformidades](../tabelas/nao_conformidades.md), [respostas_checklist](../tabelas/respostas_checklist.md)
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.determinacoes_fill_origem()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item_checklist_id uuid;
begin
  if new.origem is null or btrim(new.origem) = '' then
    v_item_checklist_id := null;

    if new.nao_conformidade_id is not null then
      select rc.item_checklist_id
        into v_item_checklist_id
      from public.nao_conformidades nc
      join public.respostas_checklist rc on rc.id = nc.resposta_checklist_id
      where nc.id = new.nao_conformidade_id
      limit 1;
    end if;

    if v_item_checklist_id is not null then
      new.origem := 'checklist:' || v_item_checklist_id::text;
    else
      new.origem := 'legacy:' || new.id::text;
    end if;
  end if;

  return new;
end;
$function$
```

</details>

## Divergências e achados

- Divergência `funcao:determinacoes_fill_origem()`: **so_producao**, classificação **residuo_descartar** ([detalhes](../../divergencias.md)).
