
-- Adicionar a coluna item_checklist_id que está faltando
ALTER TABLE public.respostas_checklist 
ADD COLUMN IF NOT EXISTS item_checklist_id UUID REFERENCES public.itens_checklist(id);

-- Criar índice para performance (opcional mas recomendado)
CREATE INDEX IF NOT EXISTS idx_respostas_checklist_item 
ON public.respostas_checklist(item_checklist_id);

-- Forçar atualização do cache
NOTIFY pgrst, 'reload schema';
