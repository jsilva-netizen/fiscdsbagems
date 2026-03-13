-- Atualizar tabela unidades_fiscalizadas para incluir data_hora_vistoria
ALTER TABLE public.unidades_fiscalizadas 
ADD COLUMN IF NOT EXISTS data_hora_vistoria TIMESTAMPTZ DEFAULT NOW();
