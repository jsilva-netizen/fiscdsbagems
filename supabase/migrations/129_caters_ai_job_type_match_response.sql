-- Migração 129: CATERS — novo tipo de job de IA "match_response_pdf"
-- Contexto: 'extract_pdf' volta a significar "ler o Relatório de Fiscalização
-- e cadastrar todas as recomendações encontradas" (documento fundador do
-- processo). O fluxo de ler o Ofício de Resposta do município e casar o
-- conteúdo com recomendações JÁ CADASTRADAS (ação relatada + prazo) vira um
-- tipo de job próprio, pra não sobrecarregar 'extract_pdf' com dois
-- comportamentos diferentes.

BEGIN;

ALTER TYPE public.caters_ai_job_type ADD VALUE IF NOT EXISTS 'match_response_pdf';

COMMIT;
