-- Relatórios que passam do limite de 50MB (teto do plano Free do Supabase Storage) são
-- divididos em múltiplas partes no bucket (latest_part1.pdf, latest_part2.pdf, ...) pelo
-- relatorios_worker. parts_count registra quantas partes o job atual tem, para que
-- relatorios_status e relatorios_download saibam se devem servir um signed_url direto
-- (parts_count = 1, comportamento de sempre) ou remontar as partes sob demanda.
ALTER TABLE public.relatorios_jobs
  ADD COLUMN IF NOT EXISTS parts_count integer NOT NULL DEFAULT 1;
