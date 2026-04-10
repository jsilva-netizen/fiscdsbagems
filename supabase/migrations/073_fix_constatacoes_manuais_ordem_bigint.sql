-- Corrige tipo da coluna ordem em constatacoes_manuais.
-- Em alguns bancos ela pode ter sido criada como INTEGER (causando overflow quando o app envia Date.now()).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'constatacoes_manuais'
      AND column_name = 'ordem'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.constatacoes_manuais
      ALTER COLUMN ordem TYPE bigint
      USING ordem::bigint;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

