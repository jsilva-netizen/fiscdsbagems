-- Função para reabrir fiscalização (permitir edição pós-finalização)
DROP FUNCTION IF EXISTS public.reabrir_fiscalizacao(uuid);
CREATE OR REPLACE FUNCTION public.reabrir_fiscalizacao(p_fiscalizacao_id uuid)
RETURNS void AS $$
DECLARE
  v_retries INT := 3;
  v_retry_delay INT := 100;
BEGIN
  -- Tentar até 3 vezes em caso de deadlock
  FOR i IN 1..v_retries LOOP
    BEGIN
      -- 1. Reabrir a fiscalização
      UPDATE public.fiscalizacoes
      SET status = 'em_andamento',
          data_fim = NULL,
          updated_at = now()
      WHERE id = p_fiscalizacao_id;

      -- 2. Reabrir todas as unidades da fiscalização
      UPDATE public.unidades_fiscalizadas
      SET status = 'em_andamento',
          updated_at = now()
      WHERE fiscalizacao_id = p_fiscalizacao_id;

      -- 3. Remover jobs de relatório anteriores para forçar nova geração
      DELETE FROM public.relatorios_jobs
      WHERE fiscalizacao_id = p_fiscalizacao_id;

      -- Se chegou até aqui sem erro, sair do loop
      EXIT;
    EXCEPTION
      WHEN deadlock_detected OR serialization_failure THEN
        -- Se não for a última tentativa, esperar e tentar novamente
        IF i < v_retries THEN
          PERFORM pg_sleep(v_retry_delay / 1000.0 * i);
        ELSE
          -- Se for a última tentativa, re-lançar o erro
          RAISE;
        END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
