INSERT INTO storage.buckets (id, name, public)
VALUES ('relatorios_fiscalizacao', 'relatorios_fiscalizacao', false)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = EXCLUDED.public;
