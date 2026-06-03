-- Migração 105: Colunas do Módulo DTR (Rodovias/Transportes)
-- Adiciona colunas para registrar rodovia, trecho, km, tipo de ocorrência e gravidade

BEGIN;

-- 1. Tabela public.fiscalizacoes
-- Adiciona o identificador de qual rodovia principal está sendo vistoriada
ALTER TABLE public.fiscalizacoes
  ADD COLUMN IF NOT EXISTS rodovia text;

-- 2. Tabela public.unidades_fiscalizadas (que representam as Ocorrências no DTR)
ALTER TABLE public.unidades_fiscalizadas
  ADD COLUMN IF NOT EXISTS rodovia text,
  ADD COLUMN IF NOT EXISTS trecho text,
  ADD COLUMN IF NOT EXISTS km text,
  ADD COLUMN IF NOT EXISTS tipo_ocorrencia text,
  ADD COLUMN IF NOT EXISTS gravidade text;

-- Adicionar comentários explicativos
COMMENT ON COLUMN public.fiscalizacoes.rodovia IS 'Rodovia principal vistoriada (ex: BR-163, MS-306, MS-112).';
COMMENT ON COLUMN public.unidades_fiscalizadas.rodovia IS 'Rodovia do ponto da ocorrência.';
COMMENT ON COLUMN public.unidades_fiscalizadas.trecho IS 'Trecho específico da rodovia.';
COMMENT ON COLUMN public.unidades_fiscalizadas.km IS 'KM aproximado (ex: 42.5).';
COMMENT ON COLUMN public.unidades_fiscalizadas.tipo_ocorrencia IS 'Tipo de ocorrência/problema detectado.';
COMMENT ON COLUMN public.unidades_fiscalizadas.gravidade IS 'Gravidade da ocorrência (leve, media, grave, gravissima).';

-- 3. Seed de Concessionárias de Rodovias (DTR) se não existirem
INSERT INTO public.prestadores_servico (id, nome, razao_social, cnpj, cidade, tipo, ativo) VALUES
  ('44444444-4444-4444-4444-444444444401', 'CCR MSVia', 'Concessionária de Rodovia Sul-Matogrossense S.A.', '19.866.525/0001-38', 'Campo Grande - MS', 'prestador_servico', TRUE),
  ('44444444-4444-4444-4444-444444444402', 'Way-306', 'Concessionária da Rodovia MS-306 S.A.', '35.795.539/0001-44', 'Chapadão do Sul - MS', 'prestador_servico', TRUE),
  ('44444444-4444-4444-4444-444444444403', 'Way-112', 'Concessionária das Rodovias do Estado de MS S.A.', '46.901.815/0001-84', 'Inocência - MS', 'prestador_servico', TRUE)
ON CONFLICT (id) DO UPDATE SET 
  nome = EXCLUDED.nome,
  razao_social = EXCLUDED.razao_social,
  cnpj = EXCLUDED.cnpj,
  cidade = EXCLUDED.cidade;

-- Recarregar esquema do PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
