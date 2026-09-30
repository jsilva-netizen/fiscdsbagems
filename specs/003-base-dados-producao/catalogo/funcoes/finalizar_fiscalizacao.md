<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# finalizar_fiscalizacao

## `finalizar_fiscalizacao(p_fiscalizacao_id uuid)`

- **Retorno**: `jsonb` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **fiscalizacao**

**Finalidade**: Finaliza uma fiscalização no servidor:

1. calcula o número do termo (`NNN/AAAA`, posição da fiscalização no ano, entre todas as
   câmaras);
2. roda `gerar_ncs_unidade` em cada unidade;
3. conta unidades, constatações, NCs, determinações e recomendações;
4. marca a fiscalização como `finalizada`, com data de fim (a existente é preservada) e número do
   termo;
5. devolve os totais.

Também tenta gravar totais em colunas que não existem em `fiscalizacoes`, e por isso não grava.

**Quem chama:**

- a sincronização do app, quando o fiscal finaliza offline e a fila envia;
- desde a migration 141, também o pedido de relatório (`relatorios_enqueue`), com a chave de
  serviço, para regenerar NCs e totais antes do PDF.

**Quem pode:** admin, coordenador e fiscal ativos e a chave de serviço. Os demais recebem "acesso
negado" como resposta, sem erro. O app trata essa resposta como erro. *(fonte: src/lib/offline/syncEngine.ts:991, supabase/functions/relatorios_enqueue/index.ts:99, supabase/migrations/141_fix_funcoes_sem_verificacao.sql, coluna:fiscalizacoes.numero_termo)*

**Regra de negócio**: Finalização da fiscalização e numeração do termo por posição no ano. A spec de fiscalização deve
descrever as duas regras e corrigir a numeração, que muda se uma fiscalização anterior for
excluída.

- **Lê**: [constatacoes_manuais](../tabelas/constatacoes_manuais.md), [determinacoes](../tabelas/determinacoes.md), [fiscalizacoes](../tabelas/fiscalizacoes.md), [nao_conformidades](../tabelas/nao_conformidades.md), [recomendacoes](../tabelas/recomendacoes.md), [respostas_checklist](../tabelas/respostas_checklist.md), [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md)
- **Escreve**: [fiscalizacoes](../tabelas/fiscalizacoes.md)
- **Chama**: [e_chave_de_servico()](../funcoes/e_chave_de_servico.md), [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md), [get_my_role()](../funcoes/get_my_role.md)
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/lib/offline/syncEngine.ts:991 (fila offline: finalizacao_fiscalizacao), supabase/functions/relatorios_enqueue/index.ts:99 (antes de gerar o relatório)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.finalizar_fiscalizacao(p_fiscalizacao_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fisc_id uuid := p_fiscalizacao_id;
  r_u record;
  v_total_nc int := 0;
  v_total_dets int := 0;
  v_total_recs int := 0;
  v_total_const int := 0;
  v_total_unidades int := 0;
  v_numero_termo text;
  v_ano int;
  v_rank int := 0;
  v_created_at timestamptz;
  v_data_fim timestamptz := now();
  has_total_constatacoes boolean;
  has_total_ncs boolean;
  has_total_determinacoes boolean;
  has_total_recomendacoes boolean;
BEGIN
  -- Segurança: Bloquear se o executor não for admin, coordenador ou fiscal
  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'coordenador', 'fiscal')
     AND NOT public.e_chave_de_servico() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: privilégios insuficientes.');
  END IF;

  IF v_fisc_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiscalização não informada');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fiscalizacoes f WHERE f.id = v_fisc_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiscalização não encontrada');
  END IF;

  SELECT f.created_at INTO v_created_at
  FROM public.fiscalizacoes f
  WHERE f.id = v_fisc_id
  FOR UPDATE;

  v_created_at := coalesce(v_created_at, now());
  v_ano := extract(year from v_created_at);

  SELECT t.rn INTO v_rank
  FROM (
    SELECT
      f.id,
      row_number() OVER (
        PARTITION BY extract(year from f.created_at)::int
        ORDER BY f.created_at ASC, f.id ASC
      ) AS rn
    FROM public.fiscalizacoes f
    WHERE f.created_at IS NOT NULL
  ) t
  WHERE t.id = v_fisc_id;

  IF v_rank IS NULL OR v_rank < 1 THEN
    v_rank := 1;
  END IF;

  v_numero_termo := lpad(v_rank::text, 3, '0') || '/' || v_ano::text;

  -- Regerar NC/D/R por unidade antes de consolidar (mantém consistência após reaberturas/edições)
  FOR r_u IN
    SELECT uf.*
    FROM public.unidades_fiscalizadas uf
    WHERE uf.fiscalizacao_id = v_fisc_id
    ORDER BY uf.created_at ASC
  LOOP
    PERFORM public.gerar_ncs_unidade(r_u.id, (to_jsonb(r_u)->'fotos_unidade'), false);
  END LOOP;

  SELECT count(*) INTO v_total_unidades
  FROM public.unidades_fiscalizadas uf
  WHERE uf.fiscalizacao_id = v_fisc_id;

  SELECT coalesce(sum(t.cte),0) INTO v_total_const
  FROM (
    SELECT count(*) AS cte
    FROM public.respostas_checklist rc
    WHERE rc.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id)
      AND upper(coalesce(rc.resposta, '')) IN ('SIM','NAO','NÃO')
      AND rc.pergunta IS NOT NULL AND btrim(rc.pergunta) <> ''
    UNION ALL
    SELECT count(*) AS cte
    FROM public.constatacoes_manuais cm
    WHERE cm.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id)
  ) t;

  SELECT count(*) INTO v_total_nc
  FROM public.nao_conformidades nc
  WHERE nc.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  SELECT count(*) INTO v_total_dets
  FROM public.determinacoes d
  WHERE d.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  SELECT count(*) INTO v_total_recs
  FROM public.recomendacoes r
  WHERE r.unidade_fiscalizada_id IN (SELECT uf.id FROM public.unidades_fiscalizadas uf WHERE uf.fiscalizacao_id = v_fisc_id);

  UPDATE public.fiscalizacoes f
  SET status = 'finalizada',
      data_fim = CASE WHEN f.data_fim IS NULL THEN v_data_fim ELSE f.data_fim END,
      numero_termo = v_numero_termo,
      updated_at = now()
  WHERE f.id = v_fisc_id;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_constatacoes'
  ) INTO has_total_constatacoes;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_ncs'
  ) INTO has_total_ncs;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_determinacoes'
  ) INTO has_total_determinacoes;

  SELECT exists(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fiscalizacoes' AND column_name = 'total_recomendacoes'
  ) INTO has_total_recomendacoes;

  IF has_total_constatacoes THEN
    UPDATE public.fiscalizacoes SET total_constatacoes = v_total_const WHERE id = v_fisc_id;
  END IF;
  IF has_total_ncs THEN
    UPDATE public.fiscalizacoes SET total_ncs = v_total_nc WHERE id = v_fisc_id;
  END IF;
  IF has_total_determinacoes THEN
    UPDATE public.fiscalizacoes SET total_determinacoes = v_total_dets WHERE id = v_fisc_id;
  END IF;
  IF has_total_recomendacoes THEN
    UPDATE public.fiscalizacoes SET total_recomendacoes = v_total_recs WHERE id = v_fisc_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fiscalizacao_id', v_fisc_id,
    'numero_termo', v_numero_termo,
    'total_unidades', v_total_unidades,
    'total_constatacoes', v_total_const,
    'total_ncs', v_total_nc,
    'total_determinacoes', v_total_dets,
    'total_recomendacoes', v_total_recs
  );
END;
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: aguardando_decisao; [detalhes](../../achados.md#a-005)).
- Achado **A-015** — Funções sem verificação, finalização pela chave de serviço e fila da CATESA ausente (situação: decidido; [detalhes](../../achados.md#a-015)).
