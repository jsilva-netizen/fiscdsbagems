-- Migração 125: Coluna km_points em contratos
-- Armazena os pontos KM do KML como JSON para uso offline sem necessidade de download do arquivo.
-- Formato: [{"lat": -20.123, "lng": -54.456, "km": "200+800"}, ...]

BEGIN;

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS km_points JSONB;

COMMENT ON COLUMN public.contratos.km_points IS
  'Pontos KM do KML carregado. Array de {lat, lng, km} para detecção offline do KM mais próximo via GPS.';

NOTIFY pgrst, 'reload schema';

COMMIT;
