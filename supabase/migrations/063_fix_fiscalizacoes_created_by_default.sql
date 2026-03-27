ALTER TABLE IF EXISTS public.fiscalizacoes
  ALTER COLUMN created_by SET DEFAULT auth.uid();

NOTIFY pgrst, 'reload schema';
