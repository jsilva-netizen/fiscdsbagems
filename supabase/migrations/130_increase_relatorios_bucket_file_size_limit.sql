-- O bucket relatorios_fiscalizacao foi criado sem file_size_limit explicito (migration 057),
-- entao herdava o limite global do projeto (50MiB). Laudos DSB/DTR embutem as fotos de todas
-- as unidades fiscalizadas (ate 20 fotos/unidade) no PDF final, o que facilmente ultrapassa
-- 50MB em fiscalizacoes maiores, causando "The object exceeded the maximum allowed size" no
-- upload. Definimos um limite explicito e generoso no bucket para acomodar esses relatorios.
UPDATE storage.buckets
SET file_size_limit = 314572800 -- 300 MiB
WHERE id = 'relatorios_fiscalizacao';
