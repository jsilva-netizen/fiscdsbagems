-- Habilitar extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de Perfis de Usuário (Sync com Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user', -- 'admin', 'user', 'fiscal'
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Municípios
CREATE TABLE IF NOT EXISTS public.municipios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE, -- Adicionado UNIQUE para evitar duplicatas
    codigo_ibge TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Prestadores de Serviço
CREATE TABLE IF NOT EXISTS public.prestadores_servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    razao_social TEXT,
    endereco TEXT,
    cidade TEXT,
    telefone TEXT,
    email_contato TEXT,
    cnpj TEXT,
    responsavel TEXT,
    cargo TEXT,
    tipo TEXT, -- 'titular' ou 'prestador_servico'
    documentos JSONB DEFAULT '[]'::jsonb, -- Array de documentos {nome, tipo, url, data_upload}
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Tipos de Unidade
CREATE TABLE IF NOT EXISTS public.tipos_unidade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    codigo TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    servicos_aplicaveis TEXT[], -- Array de strings
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Itens de Checklist
CREATE TABLE IF NOT EXISTS public.itens_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_unidade_id UUID REFERENCES public.tipos_unidade(id) ON DELETE CASCADE,
    ordem INTEGER DEFAULT 0,
    pergunta TEXT NOT NULL,
    texto_constatacao_sim TEXT,
    texto_constatacao_nao TEXT,
    gera_nc BOOLEAN DEFAULT FALSE,
    artigo_portaria TEXT,
    texto_determinacao TEXT,
    texto_recomendacao TEXT,
    prazo_dias INTEGER DEFAULT 30,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Fiscalizações
CREATE TABLE IF NOT EXISTS public.fiscalizacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    municipio_id UUID REFERENCES public.municipios(id),
    municipio_nome TEXT, -- Cache para evitar joins complexos
    prestador_servico_id UUID REFERENCES public.prestadores_servico(id),
    prestador_servico_nome TEXT, -- Cache
    fiscal_nome TEXT,
    fiscal_email TEXT,
    data_inicio TIMESTAMPTZ,
    data_fim TIMESTAMPTZ,
    latitude_inicio DOUBLE PRECISION,
    longitude_inicio DOUBLE PRECISION,
    status TEXT DEFAULT 'em_andamento',
    servicos TEXT[],
    numero_termo TEXT,
    observacoes_gerais TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela de Unidades Fiscalizadas
CREATE TABLE IF NOT EXISTS public.unidades_fiscalizadas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscalizacao_id UUID REFERENCES public.fiscalizacoes(id) ON DELETE CASCADE,
    tipo_unidade_id UUID REFERENCES public.tipos_unidade(id),
    tipo_unidade_nome TEXT,
    nome_unidade TEXT,
    codigo_unidade TEXT,
    endereco TEXT,
    status TEXT DEFAULT 'pendente',
    total_constatacoes INTEGER DEFAULT 0,
    total_ncs INTEGER DEFAULT 0,
    fotos_unidade JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Respostas de Checklist
CREATE TABLE IF NOT EXISTS public.respostas_checklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id) ON DELETE CASCADE,
    item_checklist_id UUID REFERENCES public.itens_checklist(id),
    resposta TEXT, -- 'SIM', 'NAO', 'NAO_SE_APLICA'
    observacao TEXT,
    pergunta TEXT, -- Snapshot da pergunta
    numero_constatacao TEXT,
    gera_nc BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Não Conformidades
CREATE TABLE IF NOT EXISTS public.nao_conformidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id) ON DELETE CASCADE,
    resposta_checklist_id UUID REFERENCES public.respostas_checklist(id),
    descricao TEXT NOT NULL,
    gravidade TEXT,
    numero_nc TEXT,
    artigo_portaria TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Determinações
CREATE TABLE IF NOT EXISTS public.determinacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id) ON DELETE CASCADE,
    nao_conformidade_id UUID REFERENCES public.nao_conformidades(id),
    descricao TEXT NOT NULL,
    prazo DATE,
    prazo_dias INTEGER,
    numero_determinacao TEXT,
    data_limite DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Recomendações
CREATE TABLE IF NOT EXISTS public.recomendacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    numero_recomendacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Constatações Manuais
CREATE TABLE IF NOT EXISTS public.constatacoes_manuais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id) ON DELETE CASCADE,
    numero_constatacao TEXT,
    descricao TEXT NOT NULL,
    gera_nc BOOLEAN DEFAULT FALSE,
    artigo_portaria TEXT,
    texto_determinacao TEXT,
    texto_recomendacao TEXT,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Fotos de Evidência
CREATE TABLE IF NOT EXISTS public.fotos_evidencia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fiscalizacao_id UUID REFERENCES public.fiscalizacoes(id) ON DELETE CASCADE, -- Opcional, mas útil para queries rápidas
    unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    bucket_path TEXT NOT NULL,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Autos de Infração
CREATE TABLE IF NOT EXISTS public.autos_infracao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prestador_servico_id UUID REFERENCES public.prestadores_servico(id),
    unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id),
    fiscalizacao_id UUID REFERENCES public.fiscalizacoes(id),
    determinacao_id UUID REFERENCES public.determinacoes(id),
    resposta_determinacao_id UUID, -- Referência circular resolvida depois ou deixada como UUID simples
    numero_auto TEXT,
    descricao TEXT,
    valor NUMERIC(10,2),
    status TEXT DEFAULT 'pendente',
    data_emissao TIMESTAMPTZ DEFAULT NOW(),
    arquivo_url TEXT,
    arquivo_protocolo_oficio TEXT,
    arquivo_protocolo_ai_recebido TEXT,
    arquivo_defesa_oficio TEXT,
    arquivo_defesa TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Respostas de Determinação
CREATE TABLE IF NOT EXISTS public.respostas_determinacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    determinacao_id UUID REFERENCES public.determinacoes(id) ON DELETE CASCADE,
    unidade_fiscalizada_id UUID REFERENCES public.unidades_fiscalizadas(id),
    fiscalizacao_id UUID REFERENCES public.fiscalizacoes(id),
    prestador_servico_id UUID REFERENCES public.prestadores_servico(id),
    resposta TEXT, -- Campo legado ou genérico
    status TEXT, -- 'atendida', 'nao_atendida', 'aguardando_analise'
    manifestacao_prestador TEXT,
    descricao_atendimento TEXT,
    dentro_prazo BOOLEAN,
    tipo_resposta TEXT,
    data_resposta TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Termos de Notificação
CREATE TABLE IF NOT EXISTS public.termos_notificacao (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_termo_notificacao TEXT,
    numero_rfp TEXT,
    municipio_id UUID REFERENCES public.municipios(id),
    prestador_servico_id UUID REFERENCES public.prestadores_servico(id),
    fiscalizacao_id UUID REFERENCES public.fiscalizacoes(id),
    numero_processo TEXT,
    camara_tecnica TEXT,
    data_protocolo DATE,
    prazo_resposta_dias INTEGER DEFAULT 30,
    observacoes TEXT,
    arquivo_url TEXT, -- URL do TN assinado
    arquivo_protocolo_url TEXT, -- URL do protocolo
    arquivo_oficio_protocolo TEXT, -- URL do ofício de protocolo
    data_maxima_resposta DATE,
    data_geracao TIMESTAMPTZ DEFAULT NOW(),
    data_recebimento_resposta DATE,
    recebida_no_prazo BOOLEAN,
    arquivos_resposta JSONB DEFAULT '[]'::jsonb, -- Array de objetos {url, nome, data_upload}
    arquivo_oficio_resposta TEXT, -- URL do ofício de resposta
    numero_am TEXT, -- Número da Análise de Manifestação
    status TEXT DEFAULT 'pendente_tn', -- pendente_tn, pendente_protocolo, aguardando_resposta, respondido
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Manifestações de Auto
CREATE TABLE IF NOT EXISTS public.manifestacoes_auto (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auto_infracao_id UUID REFERENCES public.autos_infracao(id) ON DELETE CASCADE,
    descricao TEXT,
    data_manifestacao TIMESTAMPTZ DEFAULT NOW(),
    arquivo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Pareceres Técnicos
CREATE TABLE IF NOT EXISTS public.pareceres_tecnicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auto_id UUID REFERENCES public.autos_infracao(id) ON DELETE CASCADE,
    recomendacao TEXT, -- 'aplicar_multa', 'rejeitar_multa', 'analise_adicional'
    valor_multa_sugerido NUMERIC(10,2),
    analise_tecnica TEXT,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'finalizado'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Julgamentos
CREATE TABLE IF NOT EXISTS public.julgamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parecer_tecnico_id UUID REFERENCES public.pareceres_tecnicos(id),
    auto_id UUID REFERENCES public.autos_infracao(id),
    prestador_servico_id UUID REFERENCES public.prestadores_servico(id),
    decisao TEXT, -- 'multa_aplicada', 'multa_rejeitada'
    valor_multa_final NUMERIC(10,2),
    justificativa_decisao TEXT,
    data_julgamento TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'julgado',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Função para gerar número do auto
CREATE OR REPLACE FUNCTION gerar_numero_auto()
RETURNS TEXT AS $$
DECLARE
    ano TEXT := to_char(NOW(), 'YYYY');
    seq INTEGER;
    novo_numero TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO seq FROM public.autos_infracao WHERE to_char(created_at, 'YYYY') = ano;
    novo_numero := 'AI ' || lpad(seq::text, 3, '0') || '/' || ano || '/DSB/AGEMS';
    RETURN novo_numero;
END;
$$ LANGUAGE plpgsql;

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestadores_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_unidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscalizacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_fiscalizadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nao_conformidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.determinacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recomendacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constatacoes_manuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos_evidencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autos_infracao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respostas_determinacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.termos_notificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manifestacoes_auto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pareceres_tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.julgamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (RLS) - Permissivas para DEV
CREATE POLICY "Acesso total autenticado (DEV)" ON public.municipios FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.prestadores_servico FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.tipos_unidade FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.fiscalizacoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.unidades_fiscalizadas FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.respostas_checklist FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.nao_conformidades FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.determinacoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.recomendacoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.constatacoes_manuais FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.fotos_evidencia FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.autos_infracao FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.respostas_determinacao FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.termos_notificacao FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.manifestacoes_auto FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.pareceres_tecnicos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.julgamentos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso total autenticado (DEV)" ON public.itens_checklist FOR ALL TO authenticated USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_fiscalizacoes_updated_at ON public.fiscalizacoes;
CREATE TRIGGER update_fiscalizacoes_updated_at BEFORE UPDATE ON public.fiscalizacoes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_unidades_updated_at ON public.unidades_fiscalizadas;
CREATE TRIGGER update_unidades_updated_at BEFORE UPDATE ON public.unidades_fiscalizadas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Função para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', COALESCE(NEW.raw_user_meta_data->>'role', 'user'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Policies para Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Perfis visíveis para todos autenticados" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuários editam seu próprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- INSERIR DADOS INICIAIS DE MUNICÍPIOS (MS)
INSERT INTO public.municipios (nome, codigo_ibge) VALUES
('Água Clara', '5000203'),
('Alcinópolis', '5000252'),
('Amambai', '5000609'),
('Anastácio', '5000708'),
('Anaurilândia', '5000807'),
('Angélica', '5000856'),
('Antônio João', '5000906'),
('Aparecida do Taboado', '5001003'),
('Aquidauana', '5001102'),
('Aral Moreira', '5001243'),
('Bandeirantes', '5001508'),
('Bataguassu', '5001904'),
('Batayporã', '5002001'),
('Bela Vista', '5002100'),
('Bodoquena', '5002159'),
('Bonito', '5002209'),
('Brasilândia', '5002308'),
('Caarapó', '5002407'),
('Camapuã', '5002605'),
('Campo Grande', '5002704'),
('Caracol', '5002803'),
('Cassilândia', '5002902'),
('Chapadão do Sul', '5002951'),
('Corguinho', '5003108'),
('Coronel Sapucaia', '5003157'),
('Corumbá', '5003207'),
('Costa Rica', '5003256'),
('Coxim', '5003306'),
('Deodápolis', '5003454'),
('Dois Irmãos do Buriti', '5003488'),
('Douradina', '5003504'),
('Dourados', '5003702'),
('Eldorado', '5003751'),
('Fátima do Sul', '5003801'),
('Figueirão', '5003900'),
('Glória de Dourados', '5004007'),
('Guia Lopes da Laguna', '5004106'),
('Iguatemi', '5004304'),
('Inocência', '5004403'),
('Itaporã', '5004502'),
('Itaquiraí', '5004601'),
('Ivinhema', '5004700'),
('Japorã', '5004809'),
('Jaraguari', '5004908'),
('Jardim', '5005004'),
('Jateí', '5005103'),
('Juti', '5005152'),
('Ladário', '5005202'),
('Laguna Carapã', '5005251'),
('Maracaju', '5005400'),
('Miranda', '5005608'),
('Mundo Novo', '5005681'),
('Naviraí', '5005707'),
('Nioaque', '5005806'),
('Nova Alvorada do Sul', '5006002'),
('Nova Andradina', '5006200'),
('Novo Horizonte do Sul', '5006259'),
('Paraíso das Águas', '5006275'),
('Paranaíba', '5006309'),
('Paranhos', '5006358'),
('Pedro Gomes', '5006408'),
('Ponta Porã', '5006606'),
('Porto Murtinho', '5006903'),
('Ribas do Rio Pardo', '5007109'),
('Rio Brilhante', '5007208'),
('Rio Negro', '5007307'),
('Rio Verde de Mato Grosso', '5007406'),
('Rochedo', '5007505'),
('Santa Rita do Pardo', '5007554'),
('São Gabriel do Oeste', '5007695'),
('Sete Quedas', '5007703'),
('Selvíria', '5007802'),
('Sidrolândia', '5007901'),
('Sonora', '5007935'),
('Tacuru', '5007950'),
('Taquarussu', '5007976'),
('Terenos', '5008008'),
('Três Lagoas', '5008305'),
('Vicentina', '5008404')
ON CONFLICT (nome) DO UPDATE SET codigo_ibge = EXCLUDED.codigo_ibge;
