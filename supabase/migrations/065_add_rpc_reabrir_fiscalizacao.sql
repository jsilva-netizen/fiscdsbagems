-- Função para reabrir fiscalização (permitir edição pós-finalização)
CREATE OR REPLACE FUNCTION public.reabrir_fiscalizacao(p_fiscalizacao_id uuid)
RETURNS void AS $$
BEGIN
  -- 1. Reabrir a fiscalização
  UPDATE public.fiscalizacoes
  SET status = 'em_andamento',
      data_fim = NULL,
      updated_at = now()
  WHERE id = p_fiscalizacao_id;

  -- 2. Remover jobs de relatório anteriores para forçar nova geração
  DELETE FROM public.relatorios_jobs
  WHERE fiscalizacao_id = p_fiscalizacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
