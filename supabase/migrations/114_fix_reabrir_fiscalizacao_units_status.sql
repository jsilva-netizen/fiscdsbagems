-- Migração 114: Corrigir a RPC reabrir_fiscalizacao para usar status 'em_andamento' nas unidades
-- Ao reabrir, as unidades devem entrar em modo de edição imediato
BEGIN;

CREATE OR REPLACE FUNCTION public.reabrir_fiscalizacao(
  p_fiscalizacao_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fisc_id uuid := p_fiscalizacao_id;
BEGIN
  IF COALESCE(public.get_my_role(), '') NOT IN ('admin', 'coordenador', 'fiscal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado: privilégios insuficientes.');
  END IF;

  IF v_fisc_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiscalização não informada');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fiscalizacoes f WHERE f.id = v_fisc_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiscalização não encontrada');
  END IF;

  -- Reabrir a fiscalização definindo o status como em_andamento
  UPDATE public.fiscalizacoes
  SET 
    status = 'em_andamento',
    data_fim = NULL,
    updated_at = now()
  WHERE id = v_fisc_id;

  -- Redefinir o status das unidades para 'em_andamento' para modo de edição imediato
  -- (o botão "Finalizar Vistoria" ficará visível em cada unidade)
  UPDATE public.unidades_fiscalizadas
  SET 
    status = 'em_andamento',
    updated_at = now()
  WHERE fiscalizacao_id = v_fisc_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reabrir_fiscalizacao(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.reabrir_fiscalizacao(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
