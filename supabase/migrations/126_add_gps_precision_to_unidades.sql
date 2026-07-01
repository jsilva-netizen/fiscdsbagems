-- Migração 126: Precisão de GPS em unidades_fiscalizadas (ocorrências DTR)
-- Como o registro de fotos/KM na rodovia nunca bloqueia a captura esperando um
-- GPS preciso (o carro pode estar em movimento), gravamos a precisão obtida no
-- momento e uma flag para identificar/filtrar depois quais ocorrências precisam
-- de revisão manual do KM/rodovia.

BEGIN;

ALTER TABLE public.unidades_fiscalizadas
  ADD COLUMN IF NOT EXISTS gps_accuracy_m NUMERIC,
  ADD COLUMN IF NOT EXISTS km_impreciso   BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.unidades_fiscalizadas.gps_accuracy_m IS 'Precisão (em metros) do GPS no momento em que o KM/rodovia foram determinados.';
COMMENT ON COLUMN public.unidades_fiscalizadas.km_impreciso   IS 'TRUE quando o KM/rodovia foram gravados sem um GPS de precisão <= 20m — sinaliza necessidade de revisão manual.';

NOTIFY pgrst, 'reload schema';

COMMIT;
