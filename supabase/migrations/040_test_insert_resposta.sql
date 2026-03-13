
-- Tentar inserir um registro na tabela respostas_checklist para ver se dá erro
-- Se as colunas existirem, deve funcionar
-- Se alguma coluna não existir, vai dar erro no Supabase
DO $$
DECLARE
    v_unidade_id UUID;
    v_item_id UUID;
BEGIN
    SELECT id INTO v_unidade_id FROM public.unidades_fiscalizadas LIMIT 1;
    SELECT id INTO v_item_id FROM public.itens_checklist LIMIT 1;

    IF v_unidade_id IS NOT NULL AND v_item_id IS NOT NULL THEN
        INSERT INTO public.respostas_checklist (
            unidade_fiscalizada_id,
            item_checklist_id,
            resposta,
            pergunta,
            numero_constatacao,
            gera_nc,
            observacao
        ) VALUES (
            v_unidade_id,
            v_item_id,
            'NAO',
            'Teste SQL',
            'C999',
            true,
            'Obs SQL'
        );
        -- Remover logo em seguida
        DELETE FROM public.respostas_checklist WHERE numero_constatacao = 'C999';
    END IF;
END $$;
