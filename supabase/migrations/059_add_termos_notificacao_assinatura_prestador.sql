ALTER TABLE public.termos_notificacao
  ADD COLUMN IF NOT EXISTS arquivo_rfp_url TEXT;

ALTER TABLE public.termos_notificacao
  ADD COLUMN IF NOT EXISTS arquivo_tn_prestador_url TEXT;

ALTER TABLE public.termos_notificacao
  ADD COLUMN IF NOT EXISTS assinatura_prestador_valida BOOLEAN DEFAULT false;

ALTER TABLE public.termos_notificacao
  ADD COLUMN IF NOT EXISTS data_assinatura_prestador TIMESTAMPTZ;

ALTER TABLE public.termos_notificacao
  ADD COLUMN IF NOT EXISTS data_inicio_prazo DATE;
