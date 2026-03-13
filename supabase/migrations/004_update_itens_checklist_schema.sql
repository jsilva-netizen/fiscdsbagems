-- Adicionar colunas faltantes na tabela itens_checklist
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS texto_nc TEXT;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS created_by_id UUID;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Manter created_at e updated_at (padrão Postgres/Supabase), mas podemos criar views ou aliases se necessário
-- O usuário mencionou created_date e updated_date, vamos criar aliases apenas se estritamente necessário via view,
-- mas geralmente adicionar as colunas para compatibilidade direta é mais seguro se o frontend espera isso.
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

-- Trigger para manter datas sincronizadas (opcional, mas boa prática se tiver duplicidade)
CREATE OR REPLACE FUNCTION sync_dates_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_date = NEW.created_at;
    NEW.updated_date = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS sync_dates_itens_checklist ON public.itens_checklist;
CREATE TRIGGER sync_dates_itens_checklist BEFORE INSERT OR UPDATE ON public.itens_checklist FOR EACH ROW EXECUTE PROCEDURE sync_dates_columns();
