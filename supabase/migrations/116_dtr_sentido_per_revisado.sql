-- Migração 116: Campo Sentido em ocorrências DTR + campos PER em tipos de ocorrência
-- Adiciona sentido (N/S/L/O) para georreferenciamento direcional,
-- nao_atendimento (texto da cláusula PER infringida) e prazo_dias_padrao.
-- Reseed dos tipos com referências reais do PER da concessão MS-112/BR-158/BR-436.

BEGIN;

-- 1. Adicionar sentido em unidades_fiscalizadas
ALTER TABLE public.unidades_fiscalizadas
  ADD COLUMN IF NOT EXISTS sentido TEXT;

COMMENT ON COLUMN public.unidades_fiscalizadas.sentido IS 'Sentido da via no ponto da ocorrência (N, S, L, O, N/S, etc).';

-- 2. Adicionar nao_atendimento e prazo_dias_padrao em tipos_ocorrencia_dtr
ALTER TABLE public.tipos_ocorrencia_dtr
  ADD COLUMN IF NOT EXISTS nao_atendimento TEXT,
  ADD COLUMN IF NOT EXISTS prazo_dias_padrao INTEGER;

COMMENT ON COLUMN public.tipos_ocorrencia_dtr.nao_atendimento IS 'Texto da cláusula/parâmetro do PER que não está sendo cumprido.';
COMMENT ON COLUMN public.tipos_ocorrencia_dtr.item_contrato   IS 'Seção do PER infringida (ex: "3.1.2 Sinalização e Elementos de Proteção e Segurança").';
COMMENT ON COLUMN public.tipos_ocorrencia_dtr.prazo_dias_padrao IS 'Prazo padrão (em dias) para sanar a não conformidade.';

-- 3. Limpar seed antigo (cláusulas genéricas) e reinserir com dados reais do PER
TRUNCATE public.tipos_ocorrencia_dtr;

INSERT INTO public.tipos_ocorrencia_dtr
  (nome, gera_nc, item_contrato, nao_atendimento, prazo_dias_padrao, descricao)
VALUES

  -- ── 3.1.1 PAVIMENTO ──────────────────────────────────────────────────────────
  ('Buraco / Panela na pista',
   TRUE,
   '3.1.1 Pavimento',
   '3.1.1 Ausência de defeitos no revestimento do pavimento do tipo panela, afundamento de trilha de roda, escorregamento, trinca de bordo e desnível pista/acostamento superiores aos limites estabelecidos.',
   3,
   'Depressão ou cavidade na camada asfáltica com risco de dano a veículos.'),

  ('Afundamento de trilha de roda',
   TRUE,
   '3.1.1 Pavimento',
   '3.1.1 Ausência de deformação permanente longitudinal (afundamento) na faixa de rolamento, conforme parâmetros do PER.',
   15,
   'Deformação permanente longitudinal na faixa de rolamento.'),

  ('Remendo precário ou execução irregular',
   TRUE,
   '3.1.1 Pavimento',
   '3.1.1 Reparos localizados devem ser executados em conformidade com normas técnicas DNIT/ABNT, com material e acabamento adequados.',
   30,
   'Reparo executado sem conformidade técnica ou com material inadequado.'),

  ('Trincas no pavimento (FC-2 / FC-3)',
   FALSE,
   '3.1.1 Pavimento',
   NULL,
   NULL,
   'Fissuras ou trincas que podem evoluir para buracos se não tratadas.'),

  ('Desgaste superficial / Exsudação',
   FALSE,
   '3.1.1 Pavimento',
   NULL,
   NULL,
   'Perda de granulometria superficial ou excesso de ligante betuminoso.'),

  -- ── 3.1.2 SINALIZAÇÃO E ELEMENTOS DE PROTEÇÃO E SEGURANÇA ───────────────────
  ('Sinalização vertical danificada ou ausente',
   TRUE,
   '3.1.2 Sinalização e Elementos de Proteção e Segurança',
   '3.1.2 Dispositivos de sinalização vertical devem estar presentes, fixados, legíveis e em conformidade com o CTB e o Manual Brasileiro de Sinalização de Trânsito.',
   3,
   'Placa amassada, desbotada, inclinada ou ausente.'),

  ('Sinalização horizontal apagada ou desgastada',
   TRUE,
   '3.1.2 Sinalização e Elementos de Proteção e Segurança',
   '3.1.2 Marcas viárias (faixas, setas, zebrados, legendas) devem manter retroflectividade e visibilidade mínima estabelecida pelo DNIT/CONTRAN.',
   15,
   'Marcas viárias desbotadas, ausentes ou com espessura insuficiente.'),

  ('Sinalização de operação Pare e Siga inadequada',
   TRUE,
   '3.1.2 Sinalização e Elementos de Proteção e Segurança',
   '3.1.2 Sinalização de segurança Pare e Siga em conformidade com o que estabelece o IPR 738/2010 DNIT.',
   3,
   'Semáforo, agente ou sinalização de Pare/Siga ausente ou defeituoso em frente de obra.'),

  ('Defensa metálica danificada ou ausente',
   TRUE,
   '3.1.2 Sinalização e Elementos de Proteção e Segurança',
   '3.1.2 Guard-rails e dispositivos de contenção devem estar corretamente instalados, sem danos, com terminais adequados e conforme projeto de segurança viária.',
   7,
   'Guard-rail amassado, com seção faltando, mal fixado ou sem terminal adequado.'),

  ('Tachas / Tachões ausentes ou desbotados',
   TRUE,
   '3.1.2 Sinalização e Elementos de Proteção e Segurança',
   '3.1.2 Dispositivos refletivos de demarcação de pista (tachas e tachões) devem estar presentes e com retroflectividade mínima exigida.',
   15,
   'Tachas ou tachões retrorrefletivos faltando ou com retroflectividade abaixo do mínimo.'),

  -- ── 3.1.3 OBRAS DE ARTE ESPECIAIS ────────────────────────────────────────────
  ('Deficiência estrutural em ponte ou viaduto',
   TRUE,
   '3.1.3 Obras de Arte Especiais',
   '3.1.3 Obras de Arte Especiais devem apresentar condições estruturais adequadas, sem fissuras, recalques, carbonatação, armadura exposta ou outros defeitos que comprometam a segurança.',
   30,
   'Fissura, infiltração, armadura exposta ou outro defeito estrutural em ponte ou viaduto.'),

  ('Guarda-corpo ou guarda-roda danificado / ausente',
   TRUE,
   '3.1.3 Obras de Arte Especiais',
   '3.1.3 Guarda-corpos e guarda-rodas de pontes e viadutos devem estar presentes e em perfeito estado de conservação.',
   7,
   'Guarda-corpo ou guarda-roda de OAE amassado, ausente ou solto.'),

  ('Junta de dilatação com defeito',
   FALSE,
   '3.1.3 Obras de Arte Especiais',
   NULL,
   NULL,
   'Junta de dilatação danificada, com selante deteriorado ou faltando.'),

  -- ── 3.1.4 SISTEMA DE DRENAGEM E OBRAS DE ARTE CORRENTES ─────────────────────
  ('Drenagem obstruída ou assoreada',
   TRUE,
   '3.1.4 Sistema de Drenagem e Obras de Arte Correntes',
   '3.1.4 Bueiros, sarjetas, valetas e demais dispositivos de drenagem devem estar desobstruídos e em condições de plena operação.',
   15,
   'Bueiro, sarjeta ou valeta com obstrução por sedimentos, vegetação ou entulho.'),

  ('Sarjeta ou valeta com defeito estrutural',
   FALSE,
   '3.1.4 Sistema de Drenagem e Obras de Arte Correntes',
   NULL,
   NULL,
   'Sarjeta ou valeta trincada, afundada ou desalinhada.'),

  -- ── 3.1.5 TERRAPLENOS E ESTRUTURAS DE CONTENÇÃO ─────────────────────────────
  ('Erosão ou voçoroca no talude',
   TRUE,
   '3.1.5 Terraplenos e Estruturas de Contenção',
   '3.1.5 Taludes de corte e aterro devem ser mantidos estáveis, sem erosão ativa, voçorocas ou risco de deslizamento.',
   30,
   'Erosão ativa ou voçoroca no talude de corte ou aterro da faixa de domínio.'),

  -- ── 3.1.6 CANTEIRO CENTRAL E FAIXA DE DOMÍNIO ───────────────────────────────
  ('Vegetação alta no acostamento / faixa de domínio',
   TRUE,
   '3.1.6 Canteiro Central e Faixa de Domínio',
   '3.1.6 Ausência total de vegetação rasteira com comprimento superior a 40,0 (quarenta) cm, em toda a extensão da faixa de domínio, numa largura mínima de 4,0 (quatro) metros a partir do bordo da drenagem e/ou do acostamento, de cada lado das rodovias.',
   15,
   'Vegetação obstruindo visibilidade ou ultrapassando limite de 40 cm de altura.'),

  ('Lixo ou resíduos sólidos na faixa de domínio',
   FALSE,
   '3.1.6 Canteiro Central e Faixa de Domínio',
   NULL,
   NULL,
   'Resíduos sólidos sobre pista, acostamento ou canteiro.'),

  ('Obra ou instalação irregular na faixa de domínio',
   TRUE,
   '3.1.6 Canteiro Central e Faixa de Domínio',
   '3.1.6 A faixa de domínio deve estar livre de construções, equipamentos ou instalações irregulares não autorizadas pelo órgão gestor.',
   30,
   'Construção, equipamento ou instalação irregular dentro da faixa de domínio.'),

  -- ── 3.1.7 EDIFICAÇÕES E INSTALAÇÕES OPERACIONAIS ────────────────────────────
  ('Edificação ou instalação operacional deteriorada',
   FALSE,
   '3.1.7 Edificações e Instalações Operacionais',
   NULL,
   NULL,
   'Posto de atendimento, guarita, galpão ou outra edificação operacional em mau estado.'),

  -- ── 3.1.8 SISTEMAS ELÉTRICOS E DE ILUMINAÇÃO ────────────────────────────────
  ('Iluminação pública inoperante ou ausente',
   TRUE,
   '3.1.8 Sistemas Elétricos e de Iluminação',
   '3.1.8 Os sistemas de iluminação pública nas interseções e trechos críticos devem estar plenamente operacionais, com manutenção preventiva e corretiva garantida.',
   3,
   'Ponto de iluminação apagado, poste danificado ou ausência de iluminação em trecho obrigatório.'),

  ('Poste ou estrutura elétrica danificada',
   TRUE,
   '3.1.8 Sistemas Elétricos e de Iluminação',
   '3.1.8 Estruturas e equipamentos do sistema elétrico devem ser mantidos em boas condições, sem risco de acidentes.',
   7,
   'Poste inclinado, com luminária solta ou cabo exposto.'),

  -- ── 3.4.5.1 ATENDIMENTO MÉDICO DE EMERGÊNCIA ────────────────────────────────
  ('Ausência de ambulância / serviço médico de emergência',
   TRUE,
   '3.4.5.1 Atendimento Médico de Emergência',
   '3.4.5.1. Disponibilização de serviço de atendimento médico de emergência 24:00 horas por dia, inclusive sábados, domingos e feriados, conforme Anexo B.',
   1,
   'Ambulância ou equipe de atendimento médico de emergência não disponível.'),

  -- ── 3.4.5.2 SOCORRO MECÂNICO ────────────────────────────────────────────────
  ('Veículo de inspeção ou guindaste inoperante',
   TRUE,
   '3.4.5.2 Socorro Mecânico',
   '3.4.5.2. Disponibilização de veículo de inspeção e guindaste leve operacional 24:00 horas por dia para atendimento a usuários em pane, conforme Anexo B.',
   1,
   'Veículo de inspeção da concessionária ou guindaste indisponível.'),

  -- ── OUTROS ───────────────────────────────────────────────────────────────────
  ('Animal morto na pista',
   FALSE,
   NULL,
   NULL,
   NULL,
   'Animal morto na faixa de rolamento ou acostamento, representando risco aos usuários.'),

  ('Outro',
   FALSE,
   NULL,
   NULL,
   NULL,
   'Ocorrência não enquadrada nos demais tipos. Descrever no campo observação.');

-- 4. Atualizar sequence/count (tabela já está populada)
NOTIFY pgrst, 'reload schema';

COMMIT;
