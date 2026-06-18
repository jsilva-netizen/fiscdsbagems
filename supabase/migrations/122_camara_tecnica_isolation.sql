-- Migration 122: Per-chamber data isolation (service-based)
--
-- Chamber assignment is derived from the SERVICES of a fiscalização,
-- NOT from the user who created it.
--
-- Service → Chamber mapping:
--   'Abastecimento de Água'       → catesa
--   'Esgotamento Sanitário'       → catesa
--   'Drenagem'                    → catesa
--   'Manejo de Resíduos Sólidos'  → caters
--   'Limpeza Urbana'              → caters
--
-- Rules:
--   • If a fiscalização has ONLY CATESA services → camara_tecnica_id = 'catesa'
--   • If a fiscalização has ONLY CATERS services → camara_tecnica_id = 'caters'
--   • Mixed or no services → NULL (legacy, visible to all staff)
--
-- autos_infracao and remessas_ai inherit their chamber from their fiscalização.
--
-- Access rules (RLS):
--   admin                              → sees everything
--   fiscal/coordenador with NO chamber → sees everything (backward compat)
--   fiscal/coordenador with chamber    → sees own chamber + NULL (legacy) rows
--   prestador                          → existing policies unchanged
--
-- NUMBERING INVARIANT (must never be broken):
--   numero_termo (TV) and numero_am (TN/AM) are DSB-wide annual sequences.
--   finalizar_fiscalizacao() and gerar_numero_am() use MAX()/COUNT() over
--   the entire table — this migration does NOT touch those functions.

-- ─────────────────────────────────────────────
-- 1. Add camara_tecnica_id columns
-- ─────────────────────────────────────────────

ALTER TABLE public.fiscalizacoes
  ADD COLUMN IF NOT EXISTS camara_tecnica_id TEXT;

ALTER TABLE public.autos_infracao
  ADD COLUMN IF NOT EXISTS camara_tecnica_id TEXT;

ALTER TABLE public.remessas_ai
  ADD COLUMN IF NOT EXISTS camara_tecnica_id TEXT;

-- ─────────────────────────────────────────────
-- 2. Indexes
-- ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_fiscalizacoes_camara
  ON public.fiscalizacoes(camara_tecnica_id);

CREATE INDEX IF NOT EXISTS idx_autos_infracao_camara
  ON public.autos_infracao(camara_tecnica_id);

CREATE INDEX IF NOT EXISTS idx_remessas_ai_camara
  ON public.remessas_ai(camara_tecnica_id);

-- ─────────────────────────────────────────────
-- 3. Helper: derive chamber from service list
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.camara_from_servicos(p_servicos TEXT[])
RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caters TEXT[] := ARRAY['Manejo de Resíduos Sólidos', 'Limpeza Urbana'];
  v_catesa TEXT[] := ARRAY['Abastecimento de Água', 'Esgotamento Sanitário', 'Drenagem'];
  v_has_caters BOOLEAN := FALSE;
  v_has_catesa BOOLEAN := FALSE;
BEGIN
  IF p_servicos IS NULL OR array_length(p_servicos, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT
    EXISTS (SELECT 1 FROM unnest(p_servicos) s WHERE s = ANY(v_caters)),
    EXISTS (SELECT 1 FROM unnest(p_servicos) s WHERE s = ANY(v_catesa))
  INTO v_has_caters, v_has_catesa;

  IF     v_has_caters AND NOT v_has_catesa THEN RETURN 'caters';
  ELSIF  v_has_catesa AND NOT v_has_caters THEN RETURN 'catesa';
  ELSE   RETURN NULL; -- mixed or unknown → legacy, visible to all
  END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- 4. Trigger: auto-set camara_tecnica_id on INSERT/UPDATE
-- ─────────────────────────────────────────────

-- fiscalizacoes: derive from servicos[]
CREATE OR REPLACE FUNCTION public.trg_fiscalizacao_set_camara()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only auto-derive when camara was not explicitly provided
  IF NEW.camara_tecnica_id IS NULL THEN
    NEW.camara_tecnica_id := public.camara_from_servicos(NEW.servicos);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_camara_fiscalizacoes ON public.fiscalizacoes;
CREATE TRIGGER tr_camara_fiscalizacoes
  BEFORE INSERT OR UPDATE OF servicos ON public.fiscalizacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_fiscalizacao_set_camara();

-- autos_infracao: inherit from linked fiscalizacao
CREATE OR REPLACE FUNCTION public.trg_auto_set_camara()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.camara_tecnica_id IS NULL AND NEW.fiscalizacao_id IS NOT NULL THEN
    SELECT camara_tecnica_id INTO NEW.camara_tecnica_id
    FROM public.fiscalizacoes
    WHERE id = NEW.fiscalizacao_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_camara_autos ON public.autos_infracao;
CREATE TRIGGER tr_camara_autos
  BEFORE INSERT ON public.autos_infracao
  FOR EACH ROW EXECUTE FUNCTION public.trg_auto_set_camara();

-- remessas_ai: inherit from linked fiscalizacao
CREATE OR REPLACE FUNCTION public.trg_remessa_set_camara()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.camara_tecnica_id IS NULL AND NEW.fiscalizacao_id IS NOT NULL THEN
    SELECT camara_tecnica_id INTO NEW.camara_tecnica_id
    FROM public.fiscalizacoes
    WHERE id = NEW.fiscalizacao_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_camara_remessas ON public.remessas_ai;
CREATE TRIGGER tr_camara_remessas
  BEFORE INSERT ON public.remessas_ai
  FOR EACH ROW EXECUTE FUNCTION public.trg_remessa_set_camara();

-- ─────────────────────────────────────────────
-- 5. Backfill existing data
-- ─────────────────────────────────────────────

-- Fiscalizacoes: derive from their servicos array
UPDATE public.fiscalizacoes
SET camara_tecnica_id = public.camara_from_servicos(servicos)
WHERE camara_tecnica_id IS NULL;

-- Autos de infração: inherit from fiscalizacao
UPDATE public.autos_infracao a
SET camara_tecnica_id = f.camara_tecnica_id
FROM public.fiscalizacoes f
WHERE a.fiscalizacao_id = f.id
  AND f.camara_tecnica_id IS NOT NULL
  AND a.camara_tecnica_id IS NULL;

-- Remessas AI: inherit from fiscalizacao
UPDATE public.remessas_ai r
SET camara_tecnica_id = f.camara_tecnica_id
FROM public.fiscalizacoes f
WHERE r.fiscalizacao_id = f.id
  AND f.camara_tecnica_id IS NOT NULL
  AND r.camara_tecnica_id IS NULL;

-- ─────────────────────────────────────────────
-- 6. Access helper used in all RLS policies
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_access_camara(row_camara TEXT)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND (
        public.get_my_camara_tecnica() IS NULL  -- no chamber = backward compat, see all
        OR row_camara IS NULL                   -- legacy record
        OR row_camara = public.get_my_camara_tecnica()
      )
    )
  );
$$;

-- ─────────────────────────────────────────────
-- 7. Update RLS policies
-- ─────────────────────────────────────────────

-- ── fiscalizacoes ────────────────────────────
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em fiscalizacoes" ON public.fiscalizacoes;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso por camara em fiscalizacoes" ON public.fiscalizacoes;

CREATE POLICY "Fiscais e Admins: acesso por camara em fiscalizacoes"
  ON public.fiscalizacoes FOR ALL TO authenticated
  USING  (public.can_access_camara(camara_tecnica_id))
  WITH CHECK (public.can_access_camara(camara_tecnica_id));

-- ── autos_infracao ───────────────────────────
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em autos" ON public.autos_infracao;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso por camara em autos" ON public.autos_infracao;

CREATE POLICY "Fiscais e Admins: acesso por camara em autos"
  ON public.autos_infracao FOR ALL TO authenticated
  USING  (public.can_access_camara(camara_tecnica_id))
  WITH CHECK (public.can_access_camara(camara_tecnica_id));

-- ── remessas_ai ──────────────────────────────
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em remessas" ON public.remessas_ai;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso por camara em remessas" ON public.remessas_ai;

CREATE POLICY "Fiscais e Admins: acesso por camara em remessas"
  ON public.remessas_ai FOR ALL TO authenticated
  USING  (public.can_access_camara(camara_tecnica_id))
  WITH CHECK (public.can_access_camara(camara_tecnica_id));

-- ── pareceres_tecnicos ───────────────────────
-- Derives chamber from its auto
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em pareceres" ON public.pareceres_tecnicos;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso por camara em pareceres" ON public.pareceres_tecnicos;

CREATE POLICY "Fiscais e Admins: acesso por camara em pareceres"
  ON public.pareceres_tecnicos FOR ALL TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND EXISTS (
        SELECT 1 FROM public.autos_infracao ai
        WHERE ai.id = auto_id
          AND public.can_access_camara(ai.camara_tecnica_id)
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND EXISTS (
        SELECT 1 FROM public.autos_infracao ai
        WHERE ai.id = auto_id
          AND public.can_access_camara(ai.camara_tecnica_id)
      )
    )
  );

-- ── remessas_ai_itens ────────────────────────
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em itens de remessas" ON public.remessas_ai_itens;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso por camara em itens de remessas" ON public.remessas_ai_itens;

CREATE POLICY "Fiscais e Admins: acesso por camara em itens de remessas"
  ON public.remessas_ai_itens FOR ALL TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND EXISTS (
        SELECT 1 FROM public.remessas_ai r
        WHERE r.id = remessa_ai_id
          AND public.can_access_camara(r.camara_tecnica_id)
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND EXISTS (
        SELECT 1 FROM public.remessas_ai r
        WHERE r.id = remessa_ai_id
          AND public.can_access_camara(r.camara_tecnica_id)
      )
    )
  );

-- ── manifestacoes_auto ───────────────────────
DROP POLICY IF EXISTS "Fiscais e Admins: acesso total em manifestacoes" ON public.manifestacoes_auto;
DROP POLICY IF EXISTS "Fiscais e Admins: acesso por camara em manifestacoes" ON public.manifestacoes_auto;

CREATE POLICY "Fiscais e Admins: acesso por camara em manifestacoes"
  ON public.manifestacoes_auto FOR ALL TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND EXISTS (
        SELECT 1 FROM public.autos_infracao ai
        WHERE ai.id = auto_infracao_id
          AND public.can_access_camara(ai.camara_tecnica_id)
      )
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND EXISTS (
        SELECT 1 FROM public.autos_infracao ai
        WHERE ai.id = auto_infracao_id
          AND public.can_access_camara(ai.camara_tecnica_id)
      )
    )
  );

-- ─────────────────────────────────────────────
-- 8. Update caters_fiscalizacoes_disponiveis view
--    (was filtering by servicos array; now simpler via camara_tecnica_id)
-- ─────────────────────────────────────────────

DROP VIEW IF EXISTS public.caters_fiscalizacoes_disponiveis;
CREATE VIEW public.caters_fiscalizacoes_disponiveis AS
SELECT
  f.id,
  f.municipio_nome,
  f.prestador_servico_nome,
  f.servicos,
  f.status,
  f.data_inicio,
  f.data_fim,
  f.numero_termo,
  f.camara_tecnica_id
FROM public.fiscalizacoes f
WHERE f.camara_tecnica_id = 'caters'
  AND f.status = 'finalizada';
