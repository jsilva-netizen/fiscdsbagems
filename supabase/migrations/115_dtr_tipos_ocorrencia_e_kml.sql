-- Migração 115: Tipos de Ocorrência DTR e KML por Rodovia
-- Cria tabela de tipos de ocorrência configuráveis com metadados de contrato,
-- adiciona campo kml_url na tabela contratos e cria bucket de armazenamento KML.

BEGIN;

-- 1. Tabela de tipos de ocorrência DTR
CREATE TABLE IF NOT EXISTS public.tipos_ocorrencia_dtr (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  gera_nc     BOOLEAN NOT NULL DEFAULT FALSE,
  item_contrato TEXT,      -- ex: "Cláusula 8.2 - Conservação da Pista"
  descricao   TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE  public.tipos_ocorrencia_dtr IS 'Catálogo configurável de tipos de ocorrência para fiscalização de rodovias (DTR).';
COMMENT ON COLUMN public.tipos_ocorrencia_dtr.gera_nc IS 'Indica se este tipo de ocorrência gera não conformidade automática.';
COMMENT ON COLUMN public.tipos_ocorrencia_dtr.item_contrato IS 'Item/cláusula do contrato com a concessionária que é infringido.';

-- Trigger de updated_at
DROP TRIGGER IF EXISTS update_tipos_ocorrencia_dtr_updated_at ON public.tipos_ocorrencia_dtr;
CREATE TRIGGER update_tipos_ocorrencia_dtr_updated_at
  BEFORE UPDATE ON public.tipos_ocorrencia_dtr
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- RLS
ALTER TABLE public.tipos_ocorrencia_dtr ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura autenticada tipos_ocorrencia_dtr" ON public.tipos_ocorrencia_dtr;
CREATE POLICY "Leitura autenticada tipos_ocorrencia_dtr"
  ON public.tipos_ocorrencia_dtr FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Escrita admin tipos_ocorrencia_dtr" ON public.tipos_ocorrencia_dtr;
CREATE POLICY "Escrita admin tipos_ocorrencia_dtr"
  ON public.tipos_ocorrencia_dtr FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Seed inicial de tipos de ocorrência (podem ser sobrescritos via upload de planilha)
INSERT INTO public.tipos_ocorrencia_dtr (nome, gera_nc, item_contrato, descricao) VALUES
  ('Buraco na pista',                  TRUE,  'Cláusula 8.1 – Conservação do Pavimento',          'Depressão ou cavidade na camada asfáltica com risco de dano a veículos.'),
  ('Afundamento de trilha de roda',    TRUE,  'Cláusula 8.1 – Conservação do Pavimento',          'Deformação permanente longitudinal na faixa de rolamento.'),
  ('Remendo precário',                 TRUE,  'Cláusula 8.1 – Conservação do Pavimento',          'Reparo executado sem conformidade técnica ou com material inadequado.'),
  ('Rachaduras no asfalto',            FALSE, 'Cláusula 8.1 – Conservação do Pavimento',          'Fissuras ou trincas que podem evoluir para buracos.'),
  ('Desgaste excessivo do pavimento',  FALSE, 'Cláusula 8.1 – Conservação do Pavimento',          'Perda de granulometria superficial com redução de aderência.'),
  ('Vegetação alta no acostamento',    TRUE,  'Cláusula 9.3 – Conservação de Faixa de Domínio',  'Vegetação obstruindo visibilidade ou ultrapassando limite regulamentar.'),
  ('Sinalização vertical danificada',  TRUE,  'Cláusula 10.2 – Sinalização Vertical',            'Placa amassada, desbotada, inclinada ou ausente.'),
  ('Sinalização horizontal apagada',   TRUE,  'Cláusula 10.3 – Sinalização Horizontal',          'Marcas viárias (faixas, setas, zebrados) desbotadas ou ausentes.'),
  ('Drenagem obstruída',               TRUE,  'Cláusula 11.1 – Drenagem e Obras de Arte Correntes','Bueiros, sarjetas ou valetas com obstrução por sedimentos ou vegetação.'),
  ('Defeito na defensa metálica',      TRUE,  'Cláusula 12.1 – Dispositivos de Segurança',       'Guard-rail amassado, faltando, mal fixado ou sem terminal adequado.'),
  ('Poste ou estrutura danificada',    TRUE,  'Cláusula 12.2 – Dispositivos de Contenção',       'Estrutura de iluminação, pórtico ou marco danificado.'),
  ('Lixo ou entulho na via',           FALSE, 'Cláusula 9.3 – Conservação de Faixa de Domínio',  'Resíduos sólidos sobre pista ou acostamento.'),
  ('Animal morto na pista',            FALSE, 'Cláusula 9.5 – Emergências na Faixa de Domínio',  'Animal morto que representa risco à segurança viária.'),
  ('Obra irregular na faixa',          TRUE,  'Cláusula 9.1 – Faixa de Domínio',                'Construção, equipamento ou instalação irregular dentro da faixa.'),
  ('Outro',                            FALSE, NULL,                                               'Ocorrência não enquadrada nos demais tipos. Descrever no campo observação.')
ON CONFLICT DO NOTHING;

-- 3. Campo kml_url na tabela contratos (URL do KML do traçado da rodovia)
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS kml_url TEXT;

COMMENT ON COLUMN public.contratos.kml_url IS 'URL do arquivo KML do traçado da rodovia no Supabase Storage (bucket kml-rodovias).';

-- 4. Bucket de armazenamento de arquivos KML
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kml-rodovias',
  'kml-rodovias',
  false,                          -- acesso privado (autenticado)
  10485760,                       -- 10 MB max
  ARRAY['application/vnd.google-earth.kml+xml', 'application/xml', 'text/xml', 'text/plain']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket kml-rodovias
DROP POLICY IF EXISTS "kml_rodovias_authenticated_read"   ON storage.objects;
DROP POLICY IF EXISTS "kml_rodovias_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "kml_rodovias_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "kml_rodovias_authenticated_delete" ON storage.objects;

CREATE POLICY "kml_rodovias_authenticated_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'kml-rodovias');

CREATE POLICY "kml_rodovias_authenticated_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kml-rodovias');

CREATE POLICY "kml_rodovias_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kml-rodovias');

CREATE POLICY "kml_rodovias_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'kml-rodovias');

NOTIFY pgrst, 'reload schema';

COMMIT;
