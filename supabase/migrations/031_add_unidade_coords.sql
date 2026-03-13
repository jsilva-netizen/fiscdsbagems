-- Adicionar colunas de geolocalização na tabela unidades_fiscalizadas
ALTER TABLE public.unidades_fiscalizadas 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
