-- Migração 109: Redefinir status de unidades para 'pendente' ao reabrir fiscalização
BEGIN;

CREATE OR REPLACE FUNCTION public.reabrir_fiscalizacao(p_fiscalizacao_id uuid)
RETURNS void AS $$
BEGIN
  -- Segurança: Apenas admins, coordenadores e fiscais podem reabrir
  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'coordenador', 'fiscal') THEN
    RAISE EXCEPTION 'Acesso negado: privilégios insuficientes para reabrir fiscalização.';
  END IF;

  -- 1. Reabrir a fiscalização
  UPDATE public.fiscalizacoes
  SET status = 'em_andamento',
      data_fim = NULL,
      updated_at = now()
  WHERE id = p_fiscalizacao_id;

  -- 1.5. Redefinir status de todas as unidades fiscalizadas associadas para 'pendente'
  UPDATE public.unidades_fiscalizadas
  SET status = 'pendente',
      updated_at = now()
  WHERE fiscalizacao_id = p_fiscalizacao_id;

  -- 2. Remover jobs de relatório anteriores para forçar nova geração
  DELETE FROM public.relatorios_jobs
  WHERE fiscalizacao_id = p_fiscalizacao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recarregar o cache do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
