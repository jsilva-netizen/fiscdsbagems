-- Migração 119: Coluna rodovia em tipos_ocorrencia_dtr
-- Permite filtrar os tipos de ocorrência por rodovia na fiscalização DTR.
-- NULL = aplica-se a todas as rodovias; valor preenchido (ex: "112") = exclusivo.

BEGIN;

ALTER TABLE public.tipos_ocorrencia_dtr
  ADD COLUMN IF NOT EXISTS rodovia TEXT;

COMMENT ON COLUMN public.tipos_ocorrencia_dtr.rodovia IS
  'Rodovia à qual o tipo de ocorrência se aplica (ex: "112", "306", "40"). NULL = aplica-se a todas as rodovias da concessão.';

CREATE INDEX IF NOT EXISTS idx_tipos_ocorrencia_dtr_rodovia
  ON public.tipos_ocorrencia_dtr (rodovia);

NOTIFY pgrst, 'reload schema';

COMMIT;
