<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# obter_resumo_indicadores

2 versões com o mesmo nome (sobrecarga). Cada uma é um objeto do catálogo.

## `obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)`

- **Retorno**: `jsonb` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **fiscalizacao**

**Finalidade**: Versão antiga dos indicadores, com o filtro "apenas finalizadas" em vez de módulos e sem unidades
nem fotos. **Sem uso**: a tela chama a versão com `p_tipo_modulo`. Desde a migration 141, também
exige perfil ativo que não seja prestador. *(fonte: src/pages/Relatorios.jsx:574, supabase/migrations/141_fix_funcoes_sem_verificacao.sql)*

- **Lê**: [constatacoes_manuais](../tabelas/constatacoes_manuais.md), [determinacoes](../tabelas/determinacoes.md), [fiscalizacoes](../tabelas/fiscalizacoes.md), [municipios](../tabelas/municipios.md), [nao_conformidades](../tabelas/nao_conformidades.md), [recomendacoes](../tabelas/recomendacoes.md), [respostas_checklist](../tabelas/respostas_checklist.md), [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md)
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_fiscalizacoes int := 0;
  v_finalizadas int := 0;
  v_total_ncs int := 0;
  v_total_constatacoes int := 0;
  v_total_determinacoes int := 0;
  v_total_recomendacoes int := 0;
  v_total_conformidades int := 0;
  v_por_servico jsonb := '[]'::jsonb;
  v_ranking_determ jsonb := '[]'::jsonb;
BEGIN
  -- Criar tabelas temporárias para armazenar os IDs das entidades filtradas no escopo desta transação
  CREATE TEMP TABLE temp_fisc ON COMMIT DROP AS
  SELECT f.id, f.status, f.municipio_id, f.municipio_nome, f.prestador_servico_id, f.prestador_servico_nome, f.servicos, f.created_at
  FROM public.fiscalizacoes f
  WHERE
    (cardinality(p_anos) = 0 OR extract(year from f.created_at)::text = ANY(p_anos))
    AND (
      cardinality(p_servicos) = 0 
      OR (
        f.servicos IS NOT NULL AND f.servicos && p_servicos
      )
    )
    AND (cardinality(p_municipio_ids) = 0 OR f.municipio_id = ANY(p_municipio_ids))
    AND (cardinality(p_prestador_ids) = 0 OR f.prestador_servico_id = ANY(p_prestador_ids))
    AND (NOT p_apenas_finalizadas OR f.status = 'finalizada');

  CREATE TEMP TABLE temp_unidades ON COMMIT DROP AS
  SELECT uf.id, uf.fiscalizacao_id
  FROM public.unidades_fiscalizadas uf
  JOIN temp_fisc tf ON tf.id = uf.fiscalizacao_id;

  -- Obter totais de fiscalizações
  SELECT count(*) INTO v_total_fiscalizacoes FROM temp_fisc;
  SELECT count(*) INTO v_finalizadas FROM temp_fisc WHERE status = 'finalizada';

  -- Se existirem unidades correspondentes, calcular indicadores dependentes
  IF EXISTS (SELECT 1 FROM temp_unidades) THEN
    SELECT count(*) INTO v_total_ncs 
    FROM public.nao_conformidades nc
    WHERE nc.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_determinacoes 
    FROM public.determinacoes d
    WHERE d.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_recomendacoes 
    FROM public.recomendacoes r
    WHERE r.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_conformidades 
    FROM public.respostas_checklist rc
    WHERE rc.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades)
      AND rc.resposta = 'SIM';

    SELECT coalesce(sum(t.cte), 0) INTO v_total_constatacoes
    FROM (
      SELECT count(*) as cte
      FROM public.respostas_checklist rc
      WHERE rc.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades)
        AND upper(coalesce(rc.resposta, '')) IN ('SIM','NAO','NÃO')
        AND rc.pergunta IS NOT NULL AND btrim(rc.pergunta) <> ''
      UNION ALL
      SELECT count(*) as cte
      FROM public.constatacoes_manuais cm
      WHERE cm.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades)
    ) t;

    -- Ranking de determinações por município (Top 10)
    SELECT coalesce(jsonb_agg(jsonb_build_object('municipio', rk.muni_nome, 'determinacoes', rk.qty)), '[]'::jsonb)
    INTO v_ranking_determ
    FROM (
      SELECT 
        coalesce(tf.municipio_nome, m.nome, 'Sem Nome') AS muni_nome,
        count(d.id) AS qty
      FROM public.determinacoes d
      JOIN temp_unidades tu ON tu.id = d.unidade_fiscalizada_id
      JOIN temp_fisc tf ON tf.id = tu.fiscalizacao_id
      LEFT JOIN public.municipios m ON m.id = tf.municipio_id
      GROUP BY muni_nome
      ORDER BY qty DESC, muni_nome ASC
      LIMIT 10
    ) rk;
  END IF;

  -- Distribuição de dados por serviço
  SELECT coalesce(jsonb_agg(jsonb_build_object('servico', svc.servico_nome, 'quantidade', svc.qty)), '[]'::jsonb)
  INTO v_por_servico
  FROM (
    SELECT unnest_servico AS servico_nome, count(*) AS qty
    FROM (
      SELECT unnest(tf.servicos) AS unnest_servico
      FROM temp_fisc tf
    ) s
    WHERE unnest_servico IS NOT NULL AND unnest_servico <> ''
    GROUP BY unnest_servico
    ORDER BY qty DESC
  ) svc;

  -- Retornar payload JSON compactado contendo todos os indicadores calculados
  RETURN jsonb_build_object(
    'total_fiscalizacoes', v_total_fiscalizacoes,
    'finalizadas', v_finalizadas,
    'total_ncs', v_total_ncs,
    'total_constatacoes', v_total_constatacoes,
    'total_determinacoes', v_total_determinacoes,
    'total_recomendacoes', v_total_recomendacoes,
    'total_conformidades', v_total_conformidades,
    'por_servico', v_por_servico,
    'ranking_determinacoes', v_ranking_determ
  );
END;
$function$
```

</details>

## `obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])`

- **Retorno**: `jsonb` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **fiscalizacao**

**Finalidade**: Indicadores da tela de Relatórios, filtrados por ano, serviços, municípios, prestadores e
módulos:

- **Fiscalizações:** total e finalizadas.
- **Das finalizadas:** unidades, fotos, NCs, determinações, recomendações, constatações e
  conformidades (constatações menos NCs).
- **Distribuição por serviço.**
- **Ranking dos 10 municípios com mais determinações.**

É a versão em uso: a tela passa os módulos da diretoria do usuário, ou a câmara escolhida pelo
admin. Roda com permissão elevada e não filtra por câmara.

Desde a migration 141, exige perfil ativo que não seja prestador (ou a chave de serviço). Antes,
qualquer pessoa, inclusive sem login, podia executá-la. *(fonte: src/pages/Relatorios.jsx:574, supabase/migrations/141_fix_funcoes_sem_verificacao.sql)*

**Regra de negócio**: Definição dos indicadores (o que conta como constatação, conformidade e NC, e o recorte por
finalizadas). A spec de relatórios e indicadores deve descrevê-la.

- **Lê**: [determinacoes](../tabelas/determinacoes.md), [fiscalizacoes](../tabelas/fiscalizacoes.md), [municipios](../tabelas/municipios.md), [nao_conformidades](../tabelas/nao_conformidades.md), [recomendacoes](../tabelas/recomendacoes.md), [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md)
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/pages/Relatorios.jsx:574 (painel de indicadores)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_fiscalizacoes int := 0;
  v_finalizadas         int := 0;
  v_total_ncs           int := 0;
  v_total_constatacoes  int := 0;
  v_total_determinacoes int := 0;
  v_total_recomendacoes int := 0;
  v_total_conformidades int := 0;
  v_total_unidades      int := 0;
  v_total_fotos         int := 0;
  v_por_servico         jsonb := '[]'::jsonb;
  v_ranking_determ      jsonb := '[]'::jsonb;
BEGIN
  -- Tabela temporária com todas as fiscalizações do filtro (para contar totais)
  CREATE TEMP TABLE temp_fisc_todas ON COMMIT DROP AS
  SELECT f.id, f.status, f.municipio_id, f.municipio_nome,
         f.prestador_servico_id, f.prestador_servico_nome,
         f.servicos, f.created_at, f.tipo_modulo
  FROM public.fiscalizacoes f
  WHERE
    (cardinality(p_anos) = 0 OR extract(year from f.created_at)::text = ANY(p_anos))
    AND (
      cardinality(p_servicos) = 0
      OR (f.servicos IS NOT NULL AND f.servicos && p_servicos)
    )
    AND (cardinality(p_municipio_ids) = 0 OR f.municipio_id = ANY(p_municipio_ids))
    AND (cardinality(p_prestador_ids) = 0 OR f.prestador_servico_id = ANY(p_prestador_ids))
    AND (cardinality(p_tipo_modulo) = 0 OR f.tipo_modulo = ANY(p_tipo_modulo));

  -- Tabela temporária apenas com as fiscalizações finalizadas
  CREATE TEMP TABLE temp_fisc_finalizadas ON COMMIT DROP AS
  SELECT * FROM temp_fisc_todas WHERE status = 'finalizada';

  CREATE TEMP TABLE temp_unidades ON COMMIT DROP AS
  SELECT uf.id, uf.fiscalizacao_id
  FROM public.unidades_fiscalizadas uf
  JOIN temp_fisc_finalizadas tff ON tff.id = uf.fiscalizacao_id;

  -- Contar fiscalizações (todas vs finalizadas)
  SELECT count(*) INTO v_total_fiscalizacoes FROM temp_fisc_todas;
  SELECT count(*) INTO v_finalizadas         FROM temp_fisc_finalizadas;

  -- Contar unidades fiscalizadas e fotos registradas nessas unidades
  SELECT count(*) INTO v_total_unidades FROM temp_unidades;

  SELECT coalesce(sum(jsonb_array_length(coalesce(uf.fotos_unidade, '[]'::jsonb))), 0)
  INTO v_total_fotos
  FROM public.unidades_fiscalizadas uf
  WHERE uf.id IN (SELECT id FROM temp_unidades);

  -- Calcular indicadores se houver unidades correspondentes
  IF EXISTS (SELECT 1 FROM temp_unidades) THEN
    SELECT count(*) INTO v_total_ncs
    FROM public.nao_conformidades nc
    WHERE nc.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_determinacoes
    FROM public.determinacoes d
    WHERE d.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    SELECT count(*) INTO v_total_recomendacoes
    FROM public.recomendacoes r
    WHERE r.unidade_fiscalizada_id IN (SELECT id FROM temp_unidades);

    -- Constatações totais dos campos consolidados nas unidades
    SELECT coalesce(sum(uf.total_constatacoes), 0) INTO v_total_constatacoes
    FROM public.unidades_fiscalizadas uf
    WHERE uf.id IN (SELECT id FROM temp_unidades);

    -- Conformidades = Constatações - Não Conformidades
    v_total_conformidades := v_total_constatacoes - v_total_ncs;
    IF v_total_conformidades < 0 THEN
      v_total_conformidades := 0;
    END IF;

    -- Ranking de determinações por município (Top 10)
    SELECT coalesce(jsonb_agg(jsonb_build_object('municipio', rk.muni_nome, 'determinacoes', rk.qty)), '[]'::jsonb)
    INTO v_ranking_determ
    FROM (
      SELECT
        coalesce(tff.municipio_nome, m.nome, 'Sem Nome') AS muni_nome,
        count(d.id) AS qty
      FROM public.determinacoes d
      JOIN temp_unidades tu  ON tu.id = d.unidade_fiscalizada_id
      JOIN temp_fisc_finalizadas tff ON tff.id = tu.fiscalizacao_id
      LEFT JOIN public.municipios m ON m.id = tff.municipio_id
      GROUP BY muni_nome
      ORDER BY qty DESC, muni_nome ASC
      LIMIT 10
    ) rk;
  END IF;

  -- Distribuição por serviço (apenas finalizadas)
  SELECT coalesce(jsonb_agg(jsonb_build_object('servico', svc.servico_nome, 'quantidade', svc.qty)), '[]'::jsonb)
  INTO v_por_servico
  FROM (
    SELECT unnest_servico AS servico_nome, count(*) AS qty
    FROM (
      SELECT unnest(tff.servicos) AS unnest_servico
      FROM temp_fisc_finalizadas tff
    ) s
    WHERE unnest_servico IS NOT NULL AND unnest_servico <> ''
    GROUP BY unnest_servico
    ORDER BY qty DESC
  ) svc;

  RETURN jsonb_build_object(
    'total_fiscalizacoes', v_total_fiscalizacoes,
    'finalizadas',         v_finalizadas,
    'total_ncs',           v_total_ncs,
    'total_constatacoes',  v_total_constatacoes,
    'total_determinacoes', v_total_determinacoes,
    'total_recomendacoes', v_total_recomendacoes,
    'total_conformidades', v_total_conformidades,
    'total_unidades',      v_total_unidades,
    'total_fotos',         v_total_fotos,
    'por_servico',         v_por_servico,
    'ranking_determinacoes', v_ranking_determ
  );
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
