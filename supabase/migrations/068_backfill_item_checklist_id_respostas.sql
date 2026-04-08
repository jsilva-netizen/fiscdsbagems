-- Backfill item_checklist_id para respostas antigas (quando era NULL),
-- usando o tipo_unidade da unidade e o texto da pergunta.

UPDATE public.respostas_checklist rc
SET item_checklist_id = ic.id,
    updated_at = now()
FROM public.unidades_fiscalizadas uf
JOIN public.itens_checklist ic
  ON ic.tipo_unidade_id = uf.tipo_unidade_id
WHERE rc.unidade_fiscalizada_id = uf.id
  AND rc.item_checklist_id IS NULL
  AND ic.pergunta = rc.pergunta
  AND rc.pergunta IS NOT NULL
  AND btrim(rc.pergunta) <> '';

-- Após o backfill, deduplica novamente por (unidade,item).
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

NOTIFY pgrst, 'reload schema';
