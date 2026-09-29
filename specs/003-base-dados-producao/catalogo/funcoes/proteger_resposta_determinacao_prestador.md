<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# proteger_resposta_determinacao_prestador

## `proteger_resposta_determinacao_prestador()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **processo_sancionador**

**Finalidade**: Função do gatilho `trg_proteger_resposta_determinacao_prestador`. Quando quem cria ou altera a
resposta é o prestador:

- recusa alterar resposta já analisada pela AGEMS;
- tira da determinação a unidade e a fiscalização, e do perfil a entidade;
- mantém a análise da equipe (`descricao_atendimento`) como estava;
- só aceita as situações `rascunho` e `aguardando_analise`;
- no envio (`aguardando_analise`), grava a data do servidor e se chegou no prazo, contra a
  data-limite do termo mais recente da entidade naquela fiscalização, contando o último dia.

Alterações da equipe passam sem mudança. Criada na migration 139. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql:76, src/pages/ResponderTermo.jsx:255)*

**Regra de negócio**: A resposta da entidade a cada determinação é rascunho até ser enviada; depois do envio, só a equipe
a analisa; a pontualidade é a data do envio contra a data-limite do termo. A spec do processo
sancionador deve descrever essa regra.

- **Lê**: [determinacoes](../tabelas/determinacoes.md), [termos_notificacao](../tabelas/termos_notificacao.md), [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md)
- **Escreve**: —
- **Chama**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)
- **Chamada por (banco)**: `gatilho:public.respostas_determinacao.trg_proteger_resposta_determinacao_prestador` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.proteger_resposta_determinacao_prestador()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Campo_Grande')::date;
  v_prazo date;
  v_determinacao uuid;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'prestador' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND coalesce(OLD.status, '') NOT IN ('', 'rascunho', 'aguardando_analise') THEN
    RAISE EXCEPTION 'Resposta já analisada pela AGEMS não pode ser alterada'
      USING ERRCODE = '42501';
  END IF;

  -- Vínculos vêm da determinação e do perfil, não do aparelho.
  v_determinacao := CASE WHEN TG_OP = 'UPDATE' THEN OLD.determinacao_id ELSE NEW.determinacao_id END;
  NEW.determinacao_id := v_determinacao;
  SELECT d.unidade_fiscalizada_id, u.fiscalizacao_id
    INTO NEW.unidade_fiscalizada_id, NEW.fiscalizacao_id
  FROM public.determinacoes d
  JOIN public.unidades_fiscalizadas u ON u.id = d.unidade_fiscalizada_id
  WHERE d.id = v_determinacao;
  NEW.prestador_servico_id := public.get_my_prestador_id();

  -- A análise é da equipe.
  NEW.descricao_atendimento := CASE WHEN TG_OP = 'UPDATE' THEN OLD.descricao_atendimento ELSE NULL END;
  IF TG_OP = 'UPDATE' THEN
    NEW.created_at := OLD.created_at;
  END IF;

  -- O prestador só rascunha ou envia.
  IF coalesce(NEW.status, '') NOT IN ('rascunho', 'aguardando_analise') THEN
    NEW.status := 'rascunho';
  END IF;

  IF NEW.status = 'aguardando_analise'
     AND (TG_OP = 'INSERT' OR coalesce(OLD.status, '') <> 'aguardando_analise') THEN
    -- Envio: data do servidor e pontualidade contra a data-limite do termo (inclusive).
    SELECT t.data_maxima_resposta INTO v_prazo
    FROM public.termos_notificacao t
    WHERE t.fiscalizacao_id = NEW.fiscalizacao_id
      AND t.prestador_servico_id = NEW.prestador_servico_id
    ORDER BY t.created_at DESC
    LIMIT 1;
    NEW.data_resposta := now();
    NEW.dentro_prazo := (v_prazo IS NULL OR v_hoje <= v_prazo);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.data_resposta := OLD.data_resposta;
    NEW.dentro_prazo := OLD.dentro_prazo;
  ELSE
    NEW.data_resposta := now();
    NEW.dentro_prazo := NULL;
  END IF;

  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
