<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_import_from_fiscalizacao

## `caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)`

- **Retorno**: `integer` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **caters**

**Finalidade**: Importa para um processo CATERS as recomendações e as determinações de uma fiscalização:

- **Duplicidade:** não importa duas vezes o mesmo item.
- **Recomendações:** entram com prazo igual ao fim da fiscalização mais os dias informados (30
  pela tela) e prioridade média.
- **Determinações:** entram com o prazo da coluna antiga `prazo`, hoje sempre vazio.
- **Retorno:** devolve quantos itens importou.

Só usuário da CATERS ou admin (`is_caters_user`); os demais recebem erro. Roda com permissão
elevada. *(fonte: src/lib/caters/processes.js:117, funcao:is_caters_user(), coluna:determinacoes.prazo)*

**Regra de negócio**: O acompanhamento do CATERS parte das recomendações e determinações da fiscalização, com prazo
contado do fim dela. A spec do CATERS deve descrever essa regra.

- **Lê**: [caters_recommendations](../tabelas/caters_recommendations.md), [determinacoes](../tabelas/determinacoes.md), [fiscalizacoes](../tabelas/fiscalizacoes.md), [recomendacoes](../tabelas/recomendacoes.md), [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md), `externo:auth.uid`
- **Escreve**: [caters_processes](../tabelas/caters_processes.md), [caters_recommendations](../tabelas/caters_recommendations.md)
- **Chama**: [is_caters_user()](../funcoes/is_caters_user.md)
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/lib/caters/processes.js:117 (ao ligar uma fiscalização ao processo)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer DEFAULT 30)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_data_base     date;
  v_prazo_date    date;
  v_rec           RECORD;
  v_det           RECORD;
  v_imported      integer := 0;
BEGIN
  -- Verifica se o caller tem acesso CATERS
  IF NOT public.is_caters_user() THEN
    RAISE EXCEPTION 'Acesso negado: usuário não pertence à CATERS.';
  END IF;

  -- Data base para calcular o prazo de 30 dias das recomendações
  SELECT COALESCE(data_fim::date, data_inicio::date, now()::date)
    INTO v_data_base
    FROM public.fiscalizacoes
   WHERE id = p_fiscalizacao_id;

  v_prazo_date := v_data_base + (p_prazo_dias || ' days')::interval;

  -- ----------------------------------------------------------------
  -- Importar RECOMENDAÇÕES (fonte atual)
  -- ----------------------------------------------------------------
  FOR v_rec IN
    SELECT r.id, r.descricao, r.created_at
      FROM public.recomendacoes r
      JOIN public.unidades_fiscalizadas uf ON uf.id = r.unidade_fiscalizada_id
     WHERE uf.fiscalizacao_id = p_fiscalizacao_id
       AND r.descricao IS NOT NULL
       AND r.descricao <> ''
       AND NOT EXISTS (
             SELECT 1
               FROM public.caters_recommendations cr
              WHERE cr.process_id      = p_caters_process_id
                AND cr.recomendacao_id = r.id
           )
  LOOP
    INSERT INTO public.caters_recommendations (
      process_id,
      recomendacao_id,
      description,
      promised_due_at,
      priority,
      status,
      created_by
    ) VALUES (
      p_caters_process_id,
      v_rec.id,
      v_rec.descricao,
      v_prazo_date,
      'media',
      'pendente',
      auth.uid()
    );
    v_imported := v_imported + 1;
  END LOOP;

  -- ----------------------------------------------------------------
  -- Importar DETERMINAÇÕES (futuro — já preparado)
  -- determinacoes têm prazo DATE explícito; usamos ele diretamente.
  -- ----------------------------------------------------------------
  FOR v_det IN
    SELECT d.id, d.descricao, d.prazo
      FROM public.determinacoes d
      JOIN public.unidades_fiscalizadas uf ON uf.id = d.unidade_fiscalizada_id
     WHERE uf.fiscalizacao_id = p_fiscalizacao_id
       AND d.descricao IS NOT NULL
       AND d.descricao <> ''
       AND NOT EXISTS (
             SELECT 1
               FROM public.caters_recommendations cr
              WHERE cr.process_id     = p_caters_process_id
                AND cr.determinacao_id = d.id
           )
  LOOP
    INSERT INTO public.caters_recommendations (
      process_id,
      determinacao_id,
      description,
      promised_due_at,
      priority,
      status,
      created_by
    ) VALUES (
      p_caters_process_id,
      v_det.id,
      v_det.descricao,
      COALESCE(v_det.prazo, v_prazo_date),
      'alta',   -- determinações têm prioridade mais alta por padrão
      'pendente',
      auth.uid()
    );
    v_imported := v_imported + 1;
  END LOOP;

  -- Vincula o processo à fiscalização (garante consistência)
  UPDATE public.caters_processes
     SET fiscalizacao_id = p_fiscalizacao_id
   WHERE id = p_caters_process_id;

  RETURN v_imported;
END;
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: decidido; [detalhes](../../achados.md#a-005)).
