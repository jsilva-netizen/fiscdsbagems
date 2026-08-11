ALTER TABLE public.termos_notificacao
  ADD COLUMN IF NOT EXISTS arquivo_resposta_url TEXT;
