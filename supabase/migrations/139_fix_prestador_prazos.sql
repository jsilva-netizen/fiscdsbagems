-- 139: prazos e respostas do processo sancionador decididos pelo servidor
-- (.specify/bugs/prazos-calculados-pelo-prestador).
--
-- Antes: o portal do prestador calculava e gravava início do prazo, data-limite, assinatura
-- válida, recebimento e pontualidade, e as políticas do prestador não limitavam colunas nem
-- estados. Pela API, a entidade regulada estendia o próprio prazo, se marcava "no prazo" e
-- desfazia a análise da AGEMS.
--
-- Depois: quando quem grava é prestador, o servidor aceita só o que é dele (TN assinado, arquivos
-- e texto da resposta, evidências) e calcula datas e pontualidade com a data de MS. O portal e as
-- telas da equipe não mudam; a equipe continua podendo editar tudo.
--
-- Requer a migration 137 (get_my_role() só de perfil ativo).

-- 1. Termo de notificação -----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.proteger_termo_prestador()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Campo_Grande')::date;
  v_status_pedido text := NEW.status;
  v_tn_assinado text := NEW.arquivo_tn_prestador_url;
  v_arquivos jsonb := NEW.arquivos_resposta;
BEGIN
  IF public.get_my_role() IS DISTINCT FROM 'prestador' THEN
    RETURN NEW;
  END IF;

  -- Só o que é do prestador: o TN que ele assinou e os arquivos da resposta.
  NEW := OLD;
  NEW.arquivo_tn_prestador_url := v_tn_assinado;
  NEW.arquivos_resposta := v_arquivos;
  NEW.updated_at := now();

  -- Envio do TN assinado: a assinatura vale e, na primeira vez, o prazo começa hoje (MS).
  -- Reenviar troca o arquivo, mas não reinicia o prazo.
  IF v_tn_assinado IS NOT NULL AND v_tn_assinado IS DISTINCT FROM OLD.arquivo_tn_prestador_url THEN
    NEW.assinatura_prestador_valida := true;
    NEW.data_assinatura_prestador := now();
    IF OLD.data_inicio_prazo IS NULL THEN
      NEW.data_protocolo := v_hoje;
      NEW.data_inicio_prazo := v_hoje;
      NEW.data_maxima_resposta := v_hoje + coalesce(OLD.prazo_resposta_dias, 30);
    END IF;
    IF coalesce(OLD.status, '') <> 'respondido' THEN
      NEW.status := 'aguardando_resposta';
    END IF;
  END IF;

  -- Conclusão da resposta: recebida hoje (MS); no prazo se até a data-limite, inclusive.
  IF v_status_pedido = 'respondido' AND coalesce(OLD.status, '') <> 'respondido' THEN
    NEW.data_recebimento_resposta := v_hoje;
    NEW.recebida_no_prazo := (NEW.data_maxima_resposta IS NULL OR v_hoje <= NEW.data_maxima_resposta);
    NEW.status := 'respondido';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_proteger_termo_prestador ON public.termos_notificacao;
CREATE TRIGGER trg_proteger_termo_prestador
  BEFORE UPDATE ON public.termos_notificacao
  FOR EACH ROW EXECUTE FUNCTION public.proteger_termo_prestador();

-- Permitia ao prestador alterar o termo em qualquer status. Fica a política que só permite até o
-- termo ser respondido ("termos_prestador_update_own_until_respondido").
DROP POLICY IF EXISTS "Prestadores: responder seus termos" ON public.termos_notificacao;

-- 2. Respostas às determinações -----------------------------------------------------------------

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
$function$;

DROP TRIGGER IF EXISTS trg_proteger_resposta_determinacao_prestador ON public.respostas_determinacao;
CREATE TRIGGER trg_proteger_resposta_determinacao_prestador
  BEFORE INSERT OR UPDATE ON public.respostas_determinacao
  FOR EACH ROW EXECUTE FUNCTION public.proteger_resposta_determinacao_prestador();

-- Permitiam ao prestador gravar respostas sem termo e em qualquer status. Ficam as políticas que
-- exigem termo e status de rascunho/envio (respostas_det_prestador_insert/update).
DROP POLICY IF EXISTS "Prestadores: cadastrar respostas determinacoes" ON public.respostas_determinacao;
DROP POLICY IF EXISTS "Prestadores: atualizar suas próprias respostas determinacoes" ON public.respostas_determinacao;
