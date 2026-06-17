-- Migração 120: Sistema CATERS — Câmara Técnica de Resíduos Sólidos
-- Objetivo: Integrar o acompanhamento de processos de fiscalização da CATERS
--           ao banco principal da AGEMS.
-- Acesso restrito a usuários com camara_tecnica_id = 'caters' e admins.

BEGIN;

-- ====================================================================
-- 1. ENUMS
-- ====================================================================

DO $$ BEGIN
  CREATE TYPE public.caters_process_status AS ENUM (
    'aguardando_analise',
    'em_analise',
    'respondido',
    'no_prazo',
    'critico',
    'atrasado',
    'encerrado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.caters_recommendation_priority AS ENUM ('baixa', 'media', 'alta', 'critica');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.caters_recommendation_status AS ENUM ('pendente', 'em_andamento', 'vencido', 'cumprido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.caters_analysis_action_type AS ENUM (
    'criacao',
    'atualizacao_status',
    'resposta_recebida',
    'prazo_estendido',
    'documento_anexado',
    'encerramento',
    'observacao'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====================================================================
-- 2. TABELAS
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.caters_processes (
  id                      uuid NOT NULL DEFAULT gen_random_uuid(),
  process_number          text NOT NULL,
  municipality            text NOT NULL,
  object                  text NOT NULL,
  ar_sent_at              date,
  ar_received_at          date,
  fatal_date              date,
  titular_response_due_at date,
  status                  public.caters_process_status NOT NULL DEFAULT 'aguardando_analise',
  relatorio_url           text,
  termo_notificacao_url   text,
  ar_digitalizado_url     text,
  oficio_resposta_url     text,
  cronograma_url          text,
  observations            text,
  ar_tracking_code        text,
  ar_protocol_number      text,
  report_sent_at          date,
  technician_name         text,
  created_by              uuid REFERENCES auth.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT caters_processes_pkey PRIMARY KEY (id),
  CONSTRAINT caters_processes_process_number_unique UNIQUE (process_number)
);

CREATE TABLE IF NOT EXISTS public.caters_recommendations (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  process_id      uuid NOT NULL REFERENCES public.caters_processes(id) ON DELETE CASCADE,
  item_code       text,
  description     text NOT NULL,
  category        text,
  priority        public.caters_recommendation_priority NOT NULL DEFAULT 'media',
  promised_due_at date,
  status          public.caters_recommendation_status NOT NULL DEFAULT 'pendente',
  fulfilled_at    date,
  evidence_url    text,
  notes           text,
  titular_response text,
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT caters_recommendations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.caters_analysis_history (
  id                   uuid NOT NULL DEFAULT gen_random_uuid(),
  process_id           uuid NOT NULL REFERENCES public.caters_processes(id) ON DELETE CASCADE,
  action_type          public.caters_analysis_action_type NOT NULL,
  description          text NOT NULL,
  new_fatal_date       date,
  related_document_url text,
  performed_by         uuid REFERENCES auth.users(id),
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT caters_analysis_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.caters_extra_documents (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  process_id  uuid NOT NULL REFERENCES public.caters_processes(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  file_url    text NOT NULL,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT caters_extra_documents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.caters_municipality_responses (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  process_id        uuid NOT NULL UNIQUE REFERENCES public.caters_processes(id) ON DELETE CASCADE,
  received_at       date NOT NULL,
  protocol_number   text,
  cronograma_status text NOT NULL DEFAULT 'pendente'
    CHECK (cronograma_status = ANY (ARRAY['pendente','aprovado','adequacao','dispensado'])),
  notes             text,
  created_by        uuid REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT caters_municipality_responses_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.caters_notification_reads (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  key        text NOT NULL,
  read_at    timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT caters_notification_reads_pkey PRIMARY KEY (id),
  CONSTRAINT caters_notification_reads_user_key UNIQUE (user_id, key)
);

-- ====================================================================
-- 3. TRIGGERS updated_at
-- ====================================================================

CREATE OR REPLACE FUNCTION public.caters_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_caters_processes_updated_at ON public.caters_processes;
CREATE TRIGGER trg_caters_processes_updated_at
  BEFORE UPDATE ON public.caters_processes
  FOR EACH ROW EXECUTE FUNCTION public.caters_set_updated_at();

DROP TRIGGER IF EXISTS trg_caters_recommendations_updated_at ON public.caters_recommendations;
CREATE TRIGGER trg_caters_recommendations_updated_at
  BEFORE UPDATE ON public.caters_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.caters_set_updated_at();

DROP TRIGGER IF EXISTS trg_caters_municipality_responses_updated_at ON public.caters_municipality_responses;
CREATE TRIGGER trg_caters_municipality_responses_updated_at
  BEFORE UPDATE ON public.caters_municipality_responses
  FOR EACH ROW EXECUTE FUNCTION public.caters_set_updated_at();

-- ====================================================================
-- 4. RLS
-- ====================================================================

ALTER TABLE public.caters_processes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caters_recommendations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caters_analysis_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caters_extra_documents      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caters_municipality_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caters_notification_reads   ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: usuário tem acesso CATERS?
CREATE OR REPLACE FUNCTION public.is_caters_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT (
    public.get_my_role() = 'admin'
    OR public.get_my_camara_tecnica() = 'caters'
  );
$$;

-- caters_processes
DROP POLICY IF EXISTS "CATERS processos: leitura"    ON public.caters_processes;
DROP POLICY IF EXISTS "CATERS processos: inserir"    ON public.caters_processes;
DROP POLICY IF EXISTS "CATERS processos: atualizar"  ON public.caters_processes;
DROP POLICY IF EXISTS "CATERS processos: deletar"    ON public.caters_processes;

CREATE POLICY "CATERS processos: leitura"   ON public.caters_processes FOR SELECT TO authenticated USING (public.is_caters_user());
CREATE POLICY "CATERS processos: inserir"   ON public.caters_processes FOR INSERT TO authenticated WITH CHECK (public.is_caters_user());
CREATE POLICY "CATERS processos: atualizar" ON public.caters_processes FOR UPDATE TO authenticated USING (public.is_caters_user());
CREATE POLICY "CATERS processos: deletar"   ON public.caters_processes FOR DELETE TO authenticated USING (public.get_my_role() = 'admin');

-- caters_recommendations
DROP POLICY IF EXISTS "CATERS recomendacoes: leitura"   ON public.caters_recommendations;
DROP POLICY IF EXISTS "CATERS recomendacoes: inserir"   ON public.caters_recommendations;
DROP POLICY IF EXISTS "CATERS recomendacoes: atualizar" ON public.caters_recommendations;
DROP POLICY IF EXISTS "CATERS recomendacoes: deletar"   ON public.caters_recommendations;

CREATE POLICY "CATERS recomendacoes: leitura"   ON public.caters_recommendations FOR SELECT TO authenticated USING (public.is_caters_user());
CREATE POLICY "CATERS recomendacoes: inserir"   ON public.caters_recommendations FOR INSERT TO authenticated WITH CHECK (public.is_caters_user());
CREATE POLICY "CATERS recomendacoes: atualizar" ON public.caters_recommendations FOR UPDATE TO authenticated USING (public.is_caters_user());
CREATE POLICY "CATERS recomendacoes: deletar"   ON public.caters_recommendations FOR DELETE TO authenticated USING (public.is_caters_user());

-- caters_analysis_history
DROP POLICY IF EXISTS "CATERS historico: leitura"  ON public.caters_analysis_history;
DROP POLICY IF EXISTS "CATERS historico: inserir"  ON public.caters_analysis_history;

CREATE POLICY "CATERS historico: leitura" ON public.caters_analysis_history FOR SELECT TO authenticated USING (public.is_caters_user());
CREATE POLICY "CATERS historico: inserir" ON public.caters_analysis_history FOR INSERT TO authenticated WITH CHECK (public.is_caters_user());

-- caters_extra_documents
DROP POLICY IF EXISTS "CATERS documentos: leitura"  ON public.caters_extra_documents;
DROP POLICY IF EXISTS "CATERS documentos: inserir"  ON public.caters_extra_documents;
DROP POLICY IF EXISTS "CATERS documentos: deletar"  ON public.caters_extra_documents;

CREATE POLICY "CATERS documentos: leitura" ON public.caters_extra_documents FOR SELECT TO authenticated USING (public.is_caters_user());
CREATE POLICY "CATERS documentos: inserir" ON public.caters_extra_documents FOR INSERT TO authenticated WITH CHECK (public.is_caters_user());
CREATE POLICY "CATERS documentos: deletar" ON public.caters_extra_documents FOR DELETE TO authenticated USING (public.is_caters_user());

-- caters_municipality_responses
DROP POLICY IF EXISTS "CATERS respostas: gestao" ON public.caters_municipality_responses;
CREATE POLICY "CATERS respostas: gestao" ON public.caters_municipality_responses FOR ALL TO authenticated
  USING (public.is_caters_user()) WITH CHECK (public.is_caters_user());

-- caters_notification_reads
DROP POLICY IF EXISTS "CATERS notif reads: proprias" ON public.caters_notification_reads;
CREATE POLICY "CATERS notif reads: proprias" ON public.caters_notification_reads FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_caters_user())
  WITH CHECK (user_id = auth.uid() AND public.is_caters_user());

COMMIT;
