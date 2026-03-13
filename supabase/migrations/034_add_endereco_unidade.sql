-- Adicionar coluna 'endereco' que falta na tabela unidades_fiscalizadas
ALTER TABLE public.unidades_fiscalizadas 
ADD COLUMN IF NOT EXISTS endereco TEXT;
