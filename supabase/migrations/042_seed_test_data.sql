
-- 1. Inserir Tipo de Unidade se não existir
INSERT INTO public.tipos_unidade (id, nome, codigo, ativo, servicos_aplicaveis)
VALUES ('c34226a0-cc21-47c8-948f-7eaaa95c1327', 'Teste Unit Type', 'TESTE', true, '{Saneamento}')
ON CONFLICT (id) DO NOTHING;

-- 2. Inserir Item Checklist
INSERT INTO public.itens_checklist (id, tipo_unidade_id, pergunta, ordem, ativo)
VALUES ('c2db269a-311d-415d-9a53-ea17738022ea', 'c34226a0-cc21-47c8-948f-7eaaa95c1327', 'Teste Pergunta', 1, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Inserir Fiscalização se não existir
INSERT INTO public.fiscalizacoes (id, status, created_at)
VALUES ('dfc97903-9ee5-49e1-9b62-217cc935ad3c', 'em_andamento', NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Inserir Unidade Fiscalizada
INSERT INTO public.unidades_fiscalizadas (id, fiscalizacao_id, nome_unidade, status)
VALUES ('18f0d849-8ad2-4234-91f6-7945c8330e30', 'dfc97903-9ee5-49e1-9b62-217cc935ad3c', 'Unidade Teste', 'pendente')
ON CONFLICT (id) DO NOTHING;
