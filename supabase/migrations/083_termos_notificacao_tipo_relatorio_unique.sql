ALTER TABLE public.termos_notificacao
  ADD COLUMN IF NOT EXISTS tipo_relatorio TEXT;

UPDATE public.termos_notificacao
SET tipo_relatorio = 'RFP'
WHERE tipo_relatorio IS NULL OR btrim(tipo_relatorio) = '';

ALTER TABLE public.termos_notificacao
  ALTER COLUMN tipo_relatorio SET DEFAULT 'RFP';

ALTER TABLE public.termos_notificacao
  ALTER COLUMN tipo_relatorio SET NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.termos_notificacao
    ADD CONSTRAINT termos_notificacao_tipo_relatorio_check
    CHECK (tipo_relatorio IN ('RFP', 'RFE', 'RAO'));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END
$$;

UPDATE public.termos_notificacao
SET numero_rfp = lpad(regexp_replace(numero_rfp, '[^0-9]', '', 'g'), 3, '0')
WHERE numero_rfp IS NOT NULL
  AND btrim(numero_rfp) <> ''
  AND numero_rfp ~ '^[0-9]{1,3}$';

CREATE UNIQUE INDEX IF NOT EXISTS termos_notificacao_tipo_camara_numero_ano_uniq
ON public.termos_notificacao (
  tipo_relatorio,
  camara_tecnica,
  numero_rfp,
  (extract(year from coalesce(data_geracao, created_at))::int)
)
WHERE numero_rfp IS NOT NULL AND btrim(numero_rfp) <> '';
