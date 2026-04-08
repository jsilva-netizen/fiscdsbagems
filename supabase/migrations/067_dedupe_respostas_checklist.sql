-- Deduplicar respostas do checklist no servidor e impedir duplicações futuras.
-- Mantém apenas a resposta mais recente por (unidade_fiscalizada_id, item_checklist_id).

ALTER TABLE public.respostas_checklist
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.respostas_checklist
SET updated_at = coalesce(updated_at, created_at, now())
WHERE updated_at IS NULL;

WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY unidade_fiscalizada_id, item_checklist_id
      ORDER BY coalesce(updated_at, created_at) DESC, created_at DESC, id DESC
    ) AS rn
  FROM public.respostas_checklist
  WHERE item_checklist_id IS NOT NULL
)
DELETE FROM public.respostas_checklist rc
USING ranked r
WHERE rc.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_respostas_checklist_unidade_item
  ON public.respostas_checklist (unidade_fiscalizada_id, item_checklist_id)
  WHERE item_checklist_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';

