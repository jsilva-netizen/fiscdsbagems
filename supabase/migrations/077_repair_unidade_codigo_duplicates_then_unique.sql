-- Reparo para bancos que já possuem duplicidade por (fiscalizacao_id, codigo_unidade)
-- e/ou tentativa anterior de criar índice único.
--
-- Passos:
-- 1) Remove índice único anterior (se existir)
-- 2) Normaliza codigo_unidade (trim + upper + normalização de espaços e hífen)
-- 3) Remove duplicadas mantendo a mais recente
-- 4) Recria índice único parcial

DROP INDEX IF EXISTS public.unidades_fiscalizadas_fiscalizacao_codigo_unq;

WITH normalized AS (
  SELECT
    id,
    fiscalizacao_id,
    codigo_unidade,
    upper(
      regexp_replace(
        regexp_replace(btrim(codigo_unidade), '\s*-\s*', '-', 'g'),
        '\s+',
        ' ',
        'g'
      )
    ) AS codigo_norm,
    updated_at,
    created_at
  FROM public.unidades_fiscalizadas
  WHERE codigo_unidade IS NOT NULL AND btrim(codigo_unidade) <> ''
),
ranked AS (
  SELECT
    id,
    fiscalizacao_id,
    codigo_norm,
    row_number() OVER (
      PARTITION BY fiscalizacao_id, codigo_norm
      ORDER BY coalesce(updated_at, created_at) DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
    ) AS rn
  FROM normalized
)
DELETE FROM public.unidades_fiscalizadas u
USING ranked r
WHERE u.id = r.id
  AND r.rn > 1;

UPDATE public.unidades_fiscalizadas
SET codigo_unidade = upper(
  regexp_replace(
    regexp_replace(btrim(codigo_unidade), '\s*-\s*', '-', 'g'),
    '\s+',
    ' ',
    'g'
  )
)
WHERE codigo_unidade IS NOT NULL
  AND codigo_unidade <> upper(
    regexp_replace(
      regexp_replace(btrim(codigo_unidade), '\s*-\s*', '-', 'g'),
      '\s+',
      ' ',
      'g'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS unidades_fiscalizadas_fiscalizacao_codigo_unq
  ON public.unidades_fiscalizadas (fiscalizacao_id, codigo_unidade)
  WHERE codigo_unidade IS NOT NULL AND btrim(codigo_unidade) <> '';

NOTIFY pgrst, 'reload schema';

