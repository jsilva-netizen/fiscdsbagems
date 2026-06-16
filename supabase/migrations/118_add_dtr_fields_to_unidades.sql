-- Migração 118: Colunas DTR adicionais em unidades_fiscalizadas
-- Adiciona per, frente, nao_atendimento, prazo_dias_nc para registro completo
-- de ocorrências DTR com rastreabilidade ao PER (Programa de Exploração da Rodovia).

BEGIN;

ALTER TABLE public.unidades_fiscalizadas
  ADD COLUMN IF NOT EXISTS per              TEXT,
  ADD COLUMN IF NOT EXISTS frente           TEXT,
  ADD COLUMN IF NOT EXISTS nao_atendimento  TEXT,
  ADD COLUMN IF NOT EXISTS prazo_dias_nc    INTEGER;

COMMENT ON COLUMN public.unidades_fiscalizadas.per             IS 'Seção do PER da ocorrência (ex: "3.1.1 Pavimento"). Espelha item_contrato do tipo selecionado.';
COMMENT ON COLUMN public.unidades_fiscalizadas.frente          IS 'Frente da concessão (ex: "RECUPERAÇÃO E MANUTENÇÃO").';
COMMENT ON COLUMN public.unidades_fiscalizadas.nao_atendimento IS 'Cláusula específica do PER não cumprida — coluna NÃO ATENDIMENTO no relatório.';
COMMENT ON COLUMN public.unidades_fiscalizadas.prazo_dias_nc   IS 'Prazo em dias para sanar a não conformidade.';

NOTIFY pgrst, 'reload schema';

COMMIT;
