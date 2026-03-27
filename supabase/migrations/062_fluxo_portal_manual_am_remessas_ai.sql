ALTER TABLE IF EXISTS public.termos_notificacao
  ADD COLUMN IF NOT EXISTS fluxo_manual boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivo_am_assinada_url text,
  ADD COLUMN IF NOT EXISTS am_concluida_em timestamptz;

CREATE OR REPLACE FUNCTION public.gerar_numero_am()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  ano text;
  seq int;
BEGIN
  ano := to_char(now(), 'YYYY');
  SELECT COALESCE(count(*), 0) + 1
    INTO seq
  FROM public.termos_notificacao
  WHERE numero_am IS NOT NULL
    AND numero_am <> ''
    AND to_char(created_at, 'YYYY') = ano;

  RETURN 'AM ' || lpad(seq::text, 3, '0') || '/' || ano || '/DSB/AGEMS';
END;
$$;

CREATE TABLE IF NOT EXISTS public.remessas_ai (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  termo_id uuid REFERENCES public.termos_notificacao(id) ON DELETE CASCADE,
  fiscalizacao_id uuid REFERENCES public.fiscalizacoes(id) ON DELETE SET NULL,
  prestador_servico_id uuid REFERENCES public.prestadores_servico(id) ON DELETE SET NULL,
  numero_rfp text,
  numero_tn text,
  status text DEFAULT 'preparada',
  arquivo_lista_pdf_url text,
  arquivo_recebimento_assinado_url text,
  arquivo_oficio_defesa_url text,
  arquivo_parecer_assinado_url text,
  criada_em timestamptz DEFAULT now(),
  enviada_em timestamptz,
  recebida_em timestamptz,
  defesa_enviada_em timestamptz,
  parecer_enviado_em timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.remessas_ai_itens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  remessa_ai_id uuid REFERENCES public.remessas_ai(id) ON DELETE CASCADE,
  auto_infracao_id uuid REFERENCES public.autos_infracao(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(remessa_ai_id, auto_infracao_id)
);

ALTER TABLE IF EXISTS public.autos_infracao
  ADD COLUMN IF NOT EXISTS defesa_texto text,
  ADD COLUMN IF NOT EXISTS defesa_arquivos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.pareceres_tecnicos
  ADD COLUMN IF NOT EXISTS arquivo_parecer_assinado_url text;

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('documentos-autos', 'documentos-autos', false)
  ON CONFLICT (id) DO NOTHING;

  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Documentos Autos Select" ON storage.objects;
  DROP POLICY IF EXISTS "Documentos Autos Insert" ON storage.objects;
  DROP POLICY IF EXISTS "Documentos Autos Update" ON storage.objects;
  DROP POLICY IF EXISTS "Documentos Autos Delete" ON storage.objects;

  CREATE POLICY "Documentos Autos Select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documentos-autos');

  CREATE POLICY "Documentos Autos Insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documentos-autos');

  CREATE POLICY "Documentos Autos Update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documentos-autos');

  CREATE POLICY "Documentos Autos Delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documentos-autos');
EXCEPTION
  WHEN insufficient_privilege THEN
    NULL;
  WHEN undefined_table THEN
    NULL;
END
$$;

NOTIFY pgrst, 'reload schema';

