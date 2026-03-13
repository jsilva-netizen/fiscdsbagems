-- Script FINAL de ajuste da tabela unidades_fiscalizadas
-- Este script garante que todas as colunas necessárias existam e estejam configuradas corretamente
-- Compatível com o app legado (Base44)

DO $$
BEGIN
    -- 1. Adicionar geolocalização (se não existir)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades_fiscalizadas' AND column_name = 'latitude') THEN
        ALTER TABLE public.unidades_fiscalizadas ADD COLUMN latitude DOUBLE PRECISION;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades_fiscalizadas' AND column_name = 'longitude') THEN
        ALTER TABLE public.unidades_fiscalizadas ADD COLUMN longitude DOUBLE PRECISION;
    END IF;

    -- 2. Adicionar endereço (causa do erro 400 anterior)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades_fiscalizadas' AND column_name = 'endereco') THEN
        ALTER TABLE public.unidades_fiscalizadas ADD COLUMN endereco TEXT;
    END IF;

    -- 3. Adicionar data_hora_vistoria (novo campo identificado nos prints)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unidades_fiscalizadas' AND column_name = 'data_hora_vistoria') THEN
        ALTER TABLE public.unidades_fiscalizadas ADD COLUMN data_hora_vistoria TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- 4. Ajustar default do status para 'em_andamento' (padrão do legado)
    ALTER TABLE public.unidades_fiscalizadas ALTER COLUMN status SET DEFAULT 'em_andamento';

END $$;

-- 5. Atualizar registros antigos para consistência (Opcional, mas recomendado)
UPDATE public.unidades_fiscalizadas 
SET status = 'em_andamento' 
WHERE status = 'pendente';

-- 6. Forçar reload do schema cache do PostgREST (para garantir que a API veja as novas colunas)
NOTIFY pgrst, 'reload config';
