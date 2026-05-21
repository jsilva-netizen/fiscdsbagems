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

ALTER TABLE public.termos_notificacao
  ADD COLUMN IF NOT EXISTS ano_geracao INTEGER;

UPDATE public.termos_notificacao
SET ano_geracao = extract(year from coalesce(data_geracao, created_at, now()))::int
WHERE ano_geracao IS NULL;

ALTER TABLE public.termos_notificacao
  ALTER COLUMN ano_geracao SET DEFAULT (extract(year from now())::int);

CREATE OR REPLACE FUNCTION public.set_termos_notificacao_ano_geracao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ano_geracao := extract(year from coalesce(NEW.data_geracao, now()))::int;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_termos_notificacao_set_ano_geracao'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_termos_notificacao_set_ano_geracao
      BEFORE INSERT OR UPDATE OF data_geracao ON public.termos_notificacao
      FOR EACH ROW
      EXECUTE FUNCTION public.set_termos_notificacao_ano_geracao()';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS termos_notificacao_tipo_camara_numero_ano_uniq
ON public.termos_notificacao (tipo_relatorio, camara_tecnica, numero_rfp, ano_geracao)
WHERE numero_rfp IS NOT NULL AND btrim(numero_rfp) <> '';
