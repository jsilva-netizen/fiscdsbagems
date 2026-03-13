-- Script de Diagnóstico de Tabela
-- Vamos listar as colunas da tabela unidades_fiscalizadas para ter certeza absoluta que latitude/longitude existem
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'unidades_fiscalizadas';
