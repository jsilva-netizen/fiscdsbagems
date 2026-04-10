-- Corrige schema para suportar NCs manuais persistidas na tabela constatacoes_manuais.
-- Sem essas colunas, a RPC gerar_ncs_unidade pode falhar ao acessar r_man.descricao_nc,
-- e o worker pode gerar relatório sem NC/D/R mesmo com constatações manuais marcadas como gera_nc.

ALTER TABLE public.constatacoes_manuais
  ADD COLUMN IF NOT EXISTS descricao_nc text;

ALTER TABLE public.constatacoes_manuais
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.constatacoes_manuais
SET updated_at = coalesce(updated_at, created_at, now())
WHERE updated_at IS NULL;

NOTIFY pgrst, 'reload schema';

