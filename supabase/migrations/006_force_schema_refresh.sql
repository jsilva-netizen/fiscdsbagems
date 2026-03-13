-- Forçar atualização do schema cache e garantir colunas
-- Este script é seguro para rodar múltiplas vezes

-- 1. Recriar/Garantir a tabela tipos_unidade com todas as colunas
CREATE TABLE IF NOT EXISTS public.tipos_unidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    codigo TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    servicos_aplicaveis TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que a coluna 'ativo' existe (caso a tabela já existisse sem ela)
ALTER TABLE public.tipos_unidade ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- 2. Recriar/Garantir a tabela itens_checklist com todas as colunas
CREATE TABLE IF NOT EXISTS public.itens_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_unidade_id UUID REFERENCES public.tipos_unidade(id) ON DELETE CASCADE,
    ordem INTEGER DEFAULT 0,
    pergunta TEXT NOT NULL,
    texto_constatacao_sim TEXT,
    texto_constatacao_nao TEXT,
    gera_nc BOOLEAN DEFAULT FALSE,
    artigo_portaria TEXT,
    texto_nc TEXT,
    texto_determinacao TEXT,
    texto_recomendacao TEXT,
    prazo_dias INTEGER DEFAULT 30,
    ativo BOOLEAN DEFAULT TRUE,
    is_sample BOOLEAN DEFAULT FALSE,
    created_by_id UUID,
    created_by TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas na itens_checklist
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS texto_nc TEXT;
ALTER TABLE public.itens_checklist ADD COLUMN IF NOT EXISTS is_sample BOOLEAN DEFAULT FALSE;

-- 3. Forçar refresh do schema cache do PostgREST
-- O método mais confiável sem ser superuser é fazer um NOTIFY ou alterar algo trivial
NOTIFY pgrst, 'reload schema';

-- Alternativa: Comentar na tabela força o refresh
COMMENT ON TABLE public.tipos_unidade IS 'Tabela de tipos de unidade fiscalizável';
COMMENT ON TABLE public.itens_checklist IS 'Itens dos checklists normativos';
