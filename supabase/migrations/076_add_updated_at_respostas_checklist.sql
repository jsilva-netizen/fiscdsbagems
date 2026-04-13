-- Adiciona updated_at em respostas_checklist para suportar sincronização incremental e dedupe/ordenação.

ALTER TABLE public.respostas_checklist
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.respostas_checklist
SET updated_at = coalesce(updated_at, created_at, now())
WHERE updated_at IS NULL;

NOTIFY pgrst, 'reload schema';

