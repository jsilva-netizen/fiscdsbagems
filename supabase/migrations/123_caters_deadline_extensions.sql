-- Dilações de prazo para processos CATERS
CREATE TABLE public.caters_deadline_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES public.caters_processes(id) ON DELETE CASCADE,
    reference_date DATE NOT NULL,        -- data da cobrança (ex: email enviado)
    extension_days INTEGER NOT NULL,     -- quantos dias a contar da reference_date
    calculated_date DATE NOT NULL,       -- reference_date + extension_days (armazenado para queries)
    municipality_request_at DATE,        -- data do ofício do município (opcional)
    municipality_protocol TEXT,          -- número do ofício/protocolo (opcional)
    status TEXT NOT NULL DEFAULT 'aprovado' CHECK (status IN ('aprovado', 'negado')),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX caters_deadline_extensions_process_id_idx
    ON public.caters_deadline_extensions(process_id);

ALTER TABLE public.caters_deadline_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users can manage deadline extensions"
    ON public.caters_deadline_extensions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Adicionar status dilacao_solicitada à constraint de caters_processes se houver
-- (sem constraint explícita, o status é texto livre — ok)
