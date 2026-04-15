ALTER TABLE public.recomendacoes
  ADD COLUMN IF NOT EXISTS numero_recomendacao text;

ALTER TABLE public.recomendacoes
  ADD COLUMN IF NOT EXISTS origem text DEFAULT 'manual';

ALTER TABLE public.recomendacoes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.recomendacoes
SET origem = 'manual'
WHERE origem IS NULL OR btrim(origem) = '';

UPDATE public.recomendacoes
SET updated_at = coalesce(updated_at, created_at, now())
WHERE updated_at IS NULL;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY unidade_fiscalizada_id, numero_recomendacao
      ORDER BY coalesce(updated_at, created_at) DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
    ) AS rn
  FROM public.recomendacoes
  WHERE numero_recomendacao IS NOT NULL AND btrim(numero_recomendacao) <> ''
)
DELETE FROM public.recomendacoes r
USING ranked d
WHERE r.id = d.id
  AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS recomendacoes_unidade_numero_unq
  ON public.recomendacoes (unidade_fiscalizada_id, numero_recomendacao)
  WHERE numero_recomendacao IS NOT NULL AND btrim(numero_recomendacao) <> '';

NOTIFY pgrst, 'reload schema';

