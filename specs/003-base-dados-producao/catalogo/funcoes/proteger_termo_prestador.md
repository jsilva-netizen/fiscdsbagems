<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# proteger_termo_prestador

## `proteger_termo_prestador()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **processo_sancionador**

**Finalidade**: Função do gatilho `trg_proteger_termo_prestador`. Quando quem altera o termo é o prestador,
descarta tudo o que ele mandou, menos o TN assinado e os arquivos da resposta, e calcula no
servidor, pela data de Mato Grosso do Sul:

- **TN assinado enviado pela primeira vez:** marca a assinatura como válida, grava a data de
  protocolo e a de início do prazo como hoje, e a data-limite como hoje mais o prazo do termo (30
  dias se vazio); o termo passa a `aguardando_resposta`. Reenviar troca o arquivo sem reiniciar o
  prazo.
- **Conclusão da resposta** (pedido de `respondido`): grava a data de recebimento e se chegou no
  prazo, contando o último dia.

Alterações da equipe passam sem mudança. Criada na migration 139; antes, o aparelho do prestador
calculava e gravava prazos e pontualidade. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql:17, src/pages/ResponderTermo.jsx:667)*

**Regra de negócio**: O prazo de resposta ao TN começa no dia em que a entidade envia o TN assinado e termina N dias
depois (padrão 30), contando o último dia; a pontualidade é medida pela data do servidor. A spec do
processo sancionador deve descrever essa regra.

- **Lê**: —
- **Escreve**: —
- **Chama**: [get_my_role()](../funcoes/get_my_role.md)
- **Chamada por (banco)**: `gatilho:public.termos_notificacao.trg_proteger_termo_prestador` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
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
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: decidido; [detalhes](../../achados.md#a-005)).
- Achado **A-014** — Prazos e respostas adulteráveis pelo prestador (situação: decidido; [detalhes](../../achados.md#a-014)).
