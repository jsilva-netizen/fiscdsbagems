-- Migração 124: Coluna etapas_obra em tipos_ocorrencia_dtr
-- Armazena etapas de obra como texto com opções separadas por \n.
-- NULL = item não é do tipo Obra; preenchido = exibe passo extra no wizard.

BEGIN;

ALTER TABLE public.tipos_ocorrencia_dtr
  ADD COLUMN IF NOT EXISTS etapas_obra TEXT;

COMMENT ON COLUMN public.tipos_ocorrencia_dtr.etapas_obra IS
  'Etapas de obra disponíveis para seleção no wizard, separadas por nova linha (\n). NULL = não é item de obra.';

NOTIFY pgrst, 'reload schema';

COMMIT;
