-- Corrige desvio de schema (drift) entre a base hospedada e a pasta de migrations,
-- descoberto em 2026-09-23 ao tentar reconstruir o schema do zero num Supabase local
-- (Docker) para rodar T026 (specs/001-data-access-abstraction/tasks.md).
--
-- As colunas abaixo já existem na base hospedada (confirmado por consulta direta a
-- information_schema.columns/table_constraints em 2026-09-23) mas nenhuma migration deste
-- repositório as cria — foram adicionadas em algum momento via SQL Editor do Dashboard sem
-- a migration correspondente ser commitada. A função gerar_ncs_unidade (migration 051) e o
-- índice idx_dets_nc que ela cria exigem que determinacoes.nao_conformidade_id já exista;
-- sem esta migration, uma reconstrução do zero (like this one) falha logo na 051.
--
-- Tipos e nullability abaixo replicam exatamente o que foi conferido na base real — não é
-- inferência.

ALTER TABLE public.determinacoes
  ADD COLUMN IF NOT EXISTS nao_conformidade_id UUID REFERENCES public.nao_conformidades(id),
  ADD COLUMN IF NOT EXISTS numero_determinacao TEXT,
  ADD COLUMN IF NOT EXISTS prazo_dias INTEGER,
  ADD COLUMN IF NOT EXISTS data_limite DATE;

ALTER TABLE public.nao_conformidades
  ADD COLUMN IF NOT EXISTS resposta_checklist_id UUID REFERENCES public.respostas_checklist(id),
  ADD COLUMN IF NOT EXISTS numero_nc TEXT,
  ADD COLUMN IF NOT EXISTS artigo_portaria TEXT,
  ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS latitude_foto DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude_foto DOUBLE PRECISION;

-- unidades_fiscalizadas.fotos_unidade: mesmo tipo de drift, achado depois (2026-09-23) ao
-- rodar o ciclo offline completo (T026) e ver a sincronização travar em silêncio — a query
-- de leitura de unidades_fiscalizadas (syncEngine.ts) falhava com 400 por selecionar esta
-- coluna inexistente, abortando o full sync antes mesmo de tentar enviar a fila local.
-- Tipo/default inferidos com alta confiança pelo uso consistente em todas as migrations que
-- já a referenciam (051, 066, 133 etc.): sempre jsonb, sempre com fallback para
-- coalesce(uf.fotos_unidade, '[]'::jsonb) — nunca conferido diretamente contra
-- information_schema como as colunas acima, mas o padrão de uso não deixa ambiguidade.
ALTER TABLE public.unidades_fiscalizadas
  ADD COLUMN IF NOT EXISTS fotos_unidade JSONB DEFAULT '[]'::jsonb;

NOTIFY pgrst, 'reload schema';
