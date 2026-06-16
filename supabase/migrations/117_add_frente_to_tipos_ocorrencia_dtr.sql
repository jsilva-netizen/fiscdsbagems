-- Migração 117: Adiciona coluna frente e restaura dados originais de tipos_ocorrencia_dtr
-- A migration 116 fez TRUNCATE e substituiu os dados sem a coluna frente.
-- Esta migration adiciona frente, descarta os dados da 116 e restaura os originais.
-- Os dados completos serão carregados posteriormente via planilha Excel.

BEGIN;

-- 1. Adicionar coluna frente (pode já existir se rodada parcialmente)
ALTER TABLE public.tipos_ocorrencia_dtr
  ADD COLUMN IF NOT EXISTS frente TEXT;

COMMENT ON COLUMN public.tipos_ocorrencia_dtr.frente IS 'Frente da concessão (ex: RECUPERAÇÃO E MANUTENÇÃO, SERVIÇOS OPERACIONAIS, CONSERVAÇÃO).';

-- 2. Descartar dados incorretos da migration 116 e reinserir os originais
TRUNCATE public.tipos_ocorrencia_dtr;

INSERT INTO public.tipos_ocorrencia_dtr (nome, gera_nc, frente, item_contrato, descricao) VALUES

  -- ── RECUPERAÇÃO E MANUTENÇÃO › 3.1.1 Pavimento ──────────────────────────────
  ('Exsudação',                    FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.1 Pavimento', 'Exsudação'),
  ('Elementos indesejáveis',       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.1 Pavimento', 'Elementos indesejáveis'),
  ('Buraco / Panela na pista',     TRUE,  'RECUPERAÇÃO E MANUTENÇÃO', '3.1.1 Pavimento', 'Buraco / Panela na pista'),
  ('Afundamento de trilha de roda',TRUE,  'RECUPERAÇÃO E MANUTENÇÃO', '3.1.1 Pavimento', 'Afundamento de trilha de roda'),
  ('Outros',                       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.1 Pavimento', 'Outros'),

  -- ── RECUPERAÇÃO E MANUTENÇÃO › 3.1.2 Sinalização ───────────────────────────
  ('Sinalização de segurança Pare e Siga em conformidade com o que estabelece o IPR 738/2010 DNIT',
                                   FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.2 Sinalização e Elementos de Proteção e Segurança', 'Sinalização de segurança Pare e Siga em conformidade com o que estabelece o IPR 738/2010 DNIT'),
  ('Sinalização horizontal',       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.2 Sinalização e Elementos de Proteção e Segurança', 'Sinalização horizontal'),
  ('Sinalização vertical',         FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.2 Sinalização e Elementos de Proteção e Segurança', 'Sinalização vertical'),
  ('Defensa metálica',             FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.2 Sinalização e Elementos de Proteção e Segurança', 'Defensa metálica'),
  ('Tachas refletivas',            FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.2 Sinalização e Elementos de Proteção e Segurança', 'Tachas refletivas'),
  ('Sinalização obstruída',        FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.2 Sinalização e Elementos de Proteção e Segurança', 'Sinalização obstruída'),
  ('Outros',                       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.2 Sinalização e Elementos de Proteção e Segurança', 'Outros'),

  -- ── RECUPERAÇÃO E MANUTENÇÃO › 3.1.3 Obras de Arte Especiais ───────────────
  ('Depressão',                    FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.3 Obras de Arte Especiais', 'Depressão'),
  ('Erosão',                       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.3 Obras de Arte Especiais', 'Erosão'),
  ('Guarda corpo',                 FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.3 Obras de Arte Especiais', 'Guarda corpo'),
  ('Drenagem',                     FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.3 Obras de Arte Especiais', 'Drenagem'),
  ('Alargamento OAE',              FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.3 Obras de Arte Especiais', 'Alargamento OAE'),
  ('Outros',                       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.3 Obras de Arte Especiais', 'Outros'),

  -- ── RECUPERAÇÃO E MANUTENÇÃO › 3.1.4 Sistemas de Drenagem ──────────────────
  ('Drenagem obstruída ou assoreada', FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.4 Sistemas de Drenagem e Obras-de-Arte Correntes', 'Drenagem obstruída ou assoreada'),
  ('Outros',                       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.4 Sistemas de Drenagem e Obras-de-Arte Correntes', 'Outros'),

  -- ── RECUPERAÇÃO E MANUTENÇÃO › 3.1.5 Terraplenos ───────────────────────────
  ('Deslizamento ou erosão em terrapleno', FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.5 Terraplenos e Estruturas de Contenção', 'Deslizamento ou erosão em terrapleno'),
  ('Outros',                       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.5 Terraplenos e Estruturas de Contenção', 'Outros'),

  -- ── RECUPERAÇÃO E MANUTENÇÃO › 3.1.6 Canteiro Central ──────────────────────
  ('Vegetação alta no acostamento / faixa de domínio', TRUE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.6 Canteiro Central e Faixa de Domínio', 'Vegetação alta no acostamento / faixa de domínio'),
  ('Outros',                       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.6 Canteiro Central e Faixa de Domínio', 'Outros'),

  -- ── RECUPERAÇÃO E MANUTENÇÃO › 3.1.8 Sistemas Elétricos ────────────────────
  ('Iluminação com defeito ou ausente', FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.8 Sistemas Elétricos e de Iluminação', 'Iluminação com defeito ou ausente'),
  ('Outros',                       FALSE, 'RECUPERAÇÃO E MANUTENÇÃO', '3.1.8 Sistemas Elétricos e de Iluminação', 'Outros'),

  -- ── MELHORIAS OPERACIONAIS ──────────────────────────────────────────────────
  ('Melhoria operacional',         FALSE, 'MELHORIAS OPERACIONAIS, DE AMPLIAÇÃO DE CAPACIDADE E DE MANUTENÇÃO DO NÍVEL DE SERVIÇO', 'Melhorias Gerais', 'Melhoria operacional identificada'),

  -- ── CONSERVAÇÃO ─────────────────────────────────────────────────────────────
  ('Conservação geral',            FALSE, 'CONSERVAÇÃO', 'Conservação Geral', 'Ponto de conservação'),

  -- ── SERVIÇOS OPERACIONAIS ───────────────────────────────────────────────────
  ('Ausência de ambulância / serviço médico', TRUE, 'SERVIÇOS OPERACIONAIS', '3.4.5.1 Atendimento Médico de Emergência', 'Ausência de ambulância / serviço médico');

NOTIFY pgrst, 'reload schema';

COMMIT;
