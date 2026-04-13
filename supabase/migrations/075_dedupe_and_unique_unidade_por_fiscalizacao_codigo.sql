-- Garante unicidade de unidade por (fiscalizacao_id, codigo_unidade).
-- Motivo: evitar conflitos quando a mesma unidade (mesmo código) é excluída/recriada na mesma fiscalização.

-- 1) Normaliza codigo_unidade (trim + upper) para reduzir duplicidades por espaços/caixa.
UPDATE public.unidades_fiscalizadas
SET codigo_unidade = upper(btrim(codigo_unidade))
WHERE codigo_unidade IS NOT NULL
  AND codigo_unidade <> upper(btrim(codigo_unidade));

-- 2) Remove duplicadas mantendo a mais recente (updated_at/created_at).
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY fiscalizacao_id, codigo_unidade
      ORDER BY coalesce(updated_at, created_at) DESC NULLS LAST,
               created_at DESC NULLS LAST,
               id DESC
    ) AS rn
  FROM public.unidades_fiscalizadas
  WHERE codigo_unidade IS NOT NULL
    AND btrim(codigo_unidade) <> ''
)
DELETE FROM public.unidades_fiscalizadas u
USING ranked r
WHERE u.id = r.id
  AND r.rn > 1;

-- 3) Cria índice único (parcial) para impedir novas duplicidades.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'unidades_fiscalizadas_fiscalizacao_codigo_unq'
  ) THEN
    CREATE UNIQUE INDEX unidades_fiscalizadas_fiscalizacao_codigo_unq
      ON public.unidades_fiscalizadas (fiscalizacao_id, codigo_unidade)
      WHERE codigo_unidade IS NOT NULL AND btrim(codigo_unidade) <> '';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

