-- Suporte definitivo a Determinações como "fonte da verdade" na UI:
-- - permite editar/reordenar/gerar determinações sem a RPC sobrescrever
-- - adiciona origem (chave estável), updated_at e status (se faltar)
-- - evita quebra ao recriar NCs: ON DELETE SET NULL em nao_conformidade_id

ALTER TABLE public.determinacoes
  ADD COLUMN IF NOT EXISTS origem text;

UPDATE public.determinacoes
SET origem = 'legacy:' || id::text
WHERE origem IS NULL OR btrim(origem) = '';

ALTER TABLE public.determinacoes
  ALTER COLUMN origem SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS determinacoes_unidade_origem_unq
  ON public.determinacoes (unidade_fiscalizada_id, origem);

ALTER TABLE public.determinacoes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.determinacoes
SET updated_at = coalesce(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.determinacoes
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pendente';

UPDATE public.determinacoes
SET status = coalesce(nullif(btrim(status), ''), 'pendente')
WHERE status IS NULL OR btrim(status) = '';

DO $$
DECLARE
  cname text;
BEGIN
  SELECT tc.constraint_name
    INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.table_schema = tc.table_schema
   AND kcu.table_name = tc.table_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'determinacoes'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'nao_conformidade_id'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.determinacoes DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.determinacoes
    ADD CONSTRAINT determinacoes_nao_conformidade_id_fkey
    FOREIGN KEY (nao_conformidade_id)
    REFERENCES public.nao_conformidades(id)
    ON DELETE SET NULL;
END;
$$;

DROP TRIGGER IF EXISTS update_determinacoes_updated_at ON public.determinacoes;
CREATE TRIGGER update_determinacoes_updated_at
BEFORE UPDATE ON public.determinacoes
FOR EACH ROW
EXECUTE PROCEDURE public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';
