-- Inserir SANESUL e MUNICÍPIO DE PARAÍSO DAS ÁGUAS na tabela prestadores_servico

INSERT INTO public.prestadores_servico (
    nome, 
    razao_social, 
    endereco, 
    cidade, 
    telefone, 
    email_contato, 
    cnpj, 
    responsavel, 
    cargo, 
    tipo, 
    ativo
) VALUES 
-- 1. SANESUL
(
    'SANESUL',
    'Empresa de Saneamento de Mato Grosso do Sul S.A',
    'Rua Dr. Zerbini, 421 - Chácara Cachoeira, CEP 79040-040',
    'Campo Grande - MS',
    '(67) 3318-7700',
    NULL, -- Não informado na imagem, pode ser atualizado depois
    '03.982.931/0001-20',
    'Renato Marcílio da Silva',
    'Diretor-Presidente',
    'prestador_servico',
    TRUE
),
-- 2. Município de Paraíso das Águas
(
    'Município de Paraíso das Águas',
    'Município de Paraíso das Águas',
    'Rua Epaminondas Nogueira de Camargo, 22 - Centro, CEP: 79556-000',
    'Paraíso das Águas - MS',
    '(67) 3248-1040',
    'gabinete@paraisodasaguas.ms.gov.br',
    '17.361.639/0001-03',
    'Ivan da Cruz Pereira',
    'Prefeito Municipal',
    'titular', -- Assumindo 'titular' pois é prefeitura, mas pode ser 'prestador_servico' se operar direto
    TRUE
);
