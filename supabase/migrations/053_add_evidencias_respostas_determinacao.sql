ALTER TABLE public.respostas_determinacao
ADD COLUMN IF NOT EXISTS evidencias JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_respostas_determinacao_determinacao_id
ON public.respostas_determinacao (determinacao_id);

CREATE INDEX IF NOT EXISTS idx_respostas_determinacao_prestador_id
ON public.respostas_determinacao (prestador_servico_id);

