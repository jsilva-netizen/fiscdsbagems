# Fiscalização AGEMS - Estrutura Detalhada do Banco de Dados

**Versão:** 1.2  
**Data de Atualização:** 10/07/2026  
**Banco de Dados:** PostgreSQL (Supabase)  
**Esquema Principal:** `public`  
**Segurança:** RLS (Row Level Security) Ativo  

---

## 📊 1. Hierarquia das Tabelas

A árvore abaixo ilustra a estrutura de dependências, relacionamentos e chaves estrangeiras (FK) das tabelas no banco de dados completo (incluindo os módulos Multi-Diretoria, DTR, CATERS e as filas de IA):

```
profiles (Perfis de Usuários)
  ├── municipios
  ├── prestadores_servico 
  │     └── contratos (Contratos de Concessão - DTR)
  ├── diretorias (DSB, DTR, DGE)
  ├── camaras_tecnicas (Câmaras por Diretoria)
  └── fiscalizacoes (Cabeçalho da Inspeção)
        ├── unidades_fiscalizadas (Instalações ou Ocorrências)
        │     ├── respostas_checklist (Respostas do checklist padrão)
        │     ├── constatacoes_manuais (Irregularidades livres)
        │     ├── nao_conformidades (Irregularidades compiladas)
        │     │     └── determinacoes (Ações Corretivas)
        │     │           ├── respostas_determinacao (Provas de Cumprimento)
        │     │           └── autos_infracao (Autuações fiscais)
        │     │                 ├── manifestacoes_auto (Defesas do Prestador)
        │     │                 ├── pareceres_tecnicos (Análise do Fiscal)
        │     │                 └── julgamentos (Voto do Colegiado)
        │     └── recomendacoes (Melhorias sugeridas)
        ├── fotos_evidencia (Fotos de Campo com Geo-tagging)
        ├── relatorios_jobs (Fila de renderização de PDF)
        ├── termos_notificacao (Notificação oficial / AM)
        │     └── catesa_ai_jobs (Fila de análise IA CATESA)
        └── remessas_ai (Lotes de Trâmite de Autos)
              └── remessas_ai_itens (Itens M2M com Autos)

caters_processes (Processos de Resíduos Sólidos - CATERS)
  ├── caters_recommendations (Recomendações CATERS)
  ├── caters_analysis_history (Histórico de Trâmite)
  ├── caters_extra_documents (Documentos Anexos)
  ├── caters_municipality_responses (Respostas e Cronogramas)
  ├── caters_notification_reads (Controle de Notificações Lidas)
  └── caters_ai_jobs (Fila de análise IA CATERS)

audit_logs (Logs de Auditoria Transacional)
```

---

## 🗂️ 2. Dicionário de Dados (Estrutura de Tabelas)

### 2.1 CADASTROS BASE E DE APOIO

#### 2.1.1 **profiles**
Tabela de perfis operacionais, integrada com a tabela de credenciais `auth.users` do Supabase Auth.
Adicionado suporte a controle de permissões por Diretoria, Câmaras Técnicas e colunas de controle do menu.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Identificador exclusivo do usuário | PK, FK (auth.users) |
| email | TEXT | E-mail de cadastro/login | NULL |
| full_name | TEXT | Nome completo do usuário | NULL |
| role | TEXT | Papel (admin, fiscal, coordenador, prestador) | DEFAULT='user' |
| ativo | BOOLEAN | Indica se o usuário está ativo no sistema | DEFAULT=True |
| diretoria_id | TEXT | Diretoria padrão à qual o perfil pertence | DEFAULT='dsb', FK (diretorias) |
| camara_tecnica_id | TEXT | Câmara Técnica principal vinculada ao perfil | NULL, FK (camaras_tecnicas) |
| modulos_permitidos | TEXT[] | Vetor de permissões/módulos para acesso lateral | DEFAULT='{}'::text[] |
| created_at | TIMESTAMPTZ | Registro de criação | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação do cadastro | DEFAULT=now() |

---

#### 2.1.2 **diretorias**
Cadastro das diretorias finalísticas reguladoras da AGEMS.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | TEXT | Abreviação única da diretoria (ex: 'dsb', 'dtr', 'dge') | PK |
| nome | TEXT | Nome completo da diretoria | NOT NULL |

---

#### 2.1.3 **camaras_tecnicas**
Cadastro das Câmaras Técnicas subordinadas a cada Diretoria.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | TEXT | Abreviação única da câmara (ex: 'catesa', 'caters') | PK |
| diretoria_id | TEXT | Diretoria a que pertence | NOT NULL, FK (diretorias) |
| nome | TEXT | Nome descritivo da câmara | NOT NULL |

---

#### 2.1.4 **municipios**
Municípios do estado de Mato Grosso do Sul onde a AGEMS atua.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| nome | TEXT | Nome oficial do município | NOT NULL |
| codigo_ibge | TEXT | Código do município no IBGE (7 dígitos) | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.1.5 **prestadores_servico**
Concessionárias e prestadoras públicas/privadas de serviços regulados.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| nome | TEXT | Nome fantasia do prestador | NOT NULL |
| razao_social | TEXT | Razão social oficial da empresa | NULL |
| endereco | TEXT | Endereço completo da sede | NULL |
| cidade | TEXT | Cidade da sede | NULL |
| telefone | TEXT | Telefone comercial | NULL |
| email_contato | TEXT | E-mail corporativo principal | NULL |
| cnpj | TEXT | CNPJ da empresa | NULL |
| responsavel | TEXT | Nome do gestor responsável | NULL |
| cargo | TEXT | Cargo do gestor responsável | NULL |
| tipo | TEXT | Regime (titular, prestador_servico) | NULL |
| documentos | JSONB | Lista de contratos e alvarás | DEFAULT='[]'::jsonb |
| tipo_entidade | TEXT | Categoria jurídica (Concessionária, Órgão Público, etc) | DEFAULT='Concessionária' |
| tipo_servico | TEXT[] | Lista de serviços prestados (Rodovias, Resíduos, etc) | DEFAULT='{}'::text[] |
| logo_url | TEXT | URL do logotipo no Storage | NULL |
| status | TEXT | Situação cadastral (ativa, inativa) | DEFAULT='ativa' |
| website | TEXT | Link do portal oficial | NULL |
| estado | TEXT | UF (Padrão MS) | DEFAULT='MS' |
| cep | TEXT | CEP da sede | DEFAULT='79000-000' |
| observacoes | TEXT | Notas de cadastro administrativas | NULL |
| ativo | BOOLEAN | Indica se está sob regulação ativa | DEFAULT=True |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.1.6 **contratos**
Contratos de concessão vigentes (principalmente para o módulo DTR).

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| numero_contrato | TEXT | Identificador de numeração (ex: 001/2014) | NOT NULL |
| prestador_servico_id| UUID | Concessionária signatária | FK (prestadores_servico) ON DELETE CASCADE |
| rodovia | TEXT | Nome/Identificação da Rodovia (ex: BR-163, MS-306) | NOT NULL |
| kml_url | TEXT | URL do arquivo KML do traçado no Storage | NULL |
| km_points | JSONB | Cache de pontos lat/lng/km do KML para uso offline | NULL |
| ativo | BOOLEAN | Indica se o contrato está vigente | DEFAULT=True |
| created_at | TIMESTAMPTZ | Data de criação | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Data de atualização | DEFAULT=now() |

---

#### 2.1.7 **tipos_ocorrencia_dtr**
Catálogo estruturado de tipos de irregularidades viárias da DTR vinculadas ao PER.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| nome | TEXT | Nome amigável do defeito (ex: 'Buraco na pista') | NOT NULL |
| gera_nc | BOOLEAN | Define se o preenchimento acarreta NC automática | DEFAULT=False |
| item_contrato | TEXT | Artigo/Cláusula de enquadramento contratual (PER) | NULL |
| descricao | TEXT | Explicação técnica do enquadramento | NULL |
| rodovia | TEXT | Rodovia aplicável (se restrito) | NULL |
| etapas_obra | TEXT | Metadados adicionais de fases de pavimentação | NULL |
| ativo | BOOLEAN | Define se o item está ativo para uso | DEFAULT=True |
| created_at | TIMESTAMPTZ | Data de cadastro | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.1.8 **tipos_unidade**
Tipos de instalações reguladas visitadas em campo (ex: ETA, ETE, Reservatório) no saneamento.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| nome | TEXT | Nome descritivo (ex: Estação de Tratamento) | NOT NULL |
| codigo | TEXT | Sigla da unidade (ex: ETA, ETE, RES) | NULL |
| ativo | BOOLEAN | Se está disponível para seleção | DEFAULT=True |
| servicos_aplicaveis | TEXT[] | Serviços relacionados (Saneamento, Gás, etc) | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.1.9 **itens_checklist**
Itens do checklist que devem ser preenchidos para cada tipo de instalação na DSB.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| tipo_unidade_id | UUID | Tipo da instalação relacionada | FK (tipos_unidade), ON DELETE=CASCADE |
| ordem | INTEGER | Posição de ordenação nas telas | DEFAULT=0 |
| pergunta | TEXT | Pergunta técnica a ser respondida | NOT NULL |
| texto_constatacao_sim | TEXT | Texto gerado no relatório para conformidade | NULL |
| texto_constatacao_nao | TEXT | Texto gerado no relatório para irregularidade | NULL |
| gera_nc | BOOLEAN | Se resposta 'NÃO' gera Não Conformidade | DEFAULT=False |
| artigo_portaria | TEXT | Dispositivo legal regulatório infringido | NULL |
| texto_determinacao | TEXT | Texto padrão para a Ação Corretiva | NULL |
| texto_recomendacao | TEXT | Texto padrão de sugestão técnica | NULL |
| prazo_dias | INTEGER | Prazo em dias padrão para cumprimento | DEFAULT=30 |
| ativo | BOOLEAN | Registro ativo | DEFAULT=True |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

### 2.2 FLUXO DE VISTORIAS DE CAMPO

#### 2.2.1 **fiscalizacoes**
Inspeção técnica geral. Funciona como a pasta principal das vistorias de campo.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| municipio_id | UUID | ID do município | FK (municipios) |
| municipio_nome | TEXT | Nome do município (cache via trigger) | NULL |
| prestador_servico_id | UUID | ID do prestador fiscalizado | FK (prestadores_servico) |
| prestador_servico_nome| TEXT | Nome da concessionária (cache via trigger) | NULL |
| fiscal_nome | TEXT | Nome do fiscal responsável (cache) | NULL |
| fiscal_email | TEXT | E-mail do fiscal responsável | NULL |
| data_inicio | TIMESTAMPTZ | Data/hora de abertura da vistoria | NULL |
| data_fim | TIMESTAMPTZ | Data/hora de conclusão/fechamento | NULL |
| latitude_inicio | DOUBLE PRECISION | Coordenada GPS latitude no check-in | NULL |
| longitude_inicio | DOUBLE PRECISION | Coordenada GPS longitude no check-in | NULL |
| status | TEXT | Status (em_andamento, finalizada) | DEFAULT='em_andamento' |
| servicos | TEXT[] | Lista de serviços avaliados | NULL |
| numero_termo | TEXT | Número sequencial anual (ex: 002/2026) | NULL |
| tipo_modulo | TEXT | Tipo de módulo (ex: 'saneamento_dsb', 'rodovias_dtr') | DEFAULT='saneamento_dsb' |
| rodovia | TEXT | Nome da Rodovia vistoriada (para DTR) | NULL |
| camara_tecnica_id | TEXT | Câmara vinculada (derivada dos serviços ou manual) | NULL |
| created_by | UUID | UUID do usuário autenticado criador | FK (auth.users) |
| last_modified_by | TEXT | E-mail do último usuário que modificou | NULL |
| last_modified_at | TIMESTAMPTZ | Data/hora da última alteração | NULL |
| total_constatacoes | INTEGER | Total de constatações (cache via trigger) | NULL |
| total_ncs | INTEGER | Total de Não Conformidades (cache) | NULL |
| total_determinacoes | INTEGER | Total de Determinações (cache) | NULL |
| total_recomendacoes | INTEGER | Total de Recomendações (cache) | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.2.2 **unidades_fiscalizadas**
Instalações avaliadas ou Ocorrências pontuais registradas dentro de cada fiscalização. Contém campos estendidos para Saneamento e Rodovias (DTR).

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| fiscalizacao_id | UUID | Fiscalização pai | FK (fiscalizacoes), ON DELETE=CASCADE |
| tipo_unidade_id | UUID | Tipo da instalação vistoriada | FK (tipos_unidade) |
| tipo_unidade_nome | TEXT | Nome do tipo da unidade (cache) | NULL |
| nome_unidade | TEXT | Nome específico fornecido em campo | NULL |
| codigo_unidade | TEXT | Código físico de patrimônio do ativo | NULL |
| status | TEXT | Progresso da vistoria (pendente, finalizada) | DEFAULT='pendente' |
| rodovia | TEXT | Rodovia do ponto da ocorrência (DTR) | NULL |
| trecho | TEXT | Trecho específico da rodovia (DTR) | NULL |
| km | TEXT | KM aproximado (DTR) | NULL |
| tipo_ocorrencia | TEXT | Tipo de defeito (DTR) | NULL |
| gravidade | TEXT | Escala de severidade (leve, media, grave, gravissima) | NULL |
| per | TEXT | Seção do PER violada (DTR) | NULL |
| frente | TEXT | Frente de trabalho (DTR) | NULL |
| nao_atendimento | TEXT | Cláusula contratual não atendida (DTR) | NULL |
| prazo_dias_nc | INTEGER | Prazo em dias para saneamento da NC (DTR) | NULL |
| gps_accuracy_m | NUMERIC | Margem de precisão do GPS na gravação (metros) | NULL |
| km_impreciso | BOOLEAN | Indica se a coordenada necessita de revisão manual | DEFAULT=False |
| total_constatacoes | INTEGER | Total de constatações da unidade | DEFAULT=0 |
| total_ncs | INTEGER | Total de Não Conformidades da unidade | DEFAULT=0 |
| created_at | TIMESTAMPTZ | Data de criação | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.2.3 **respostas_checklist**
Respostas fornecidas aos checklists das instalações vistoriadas (Saneamento - DSB).

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| unidade_fiscalizada_id| UUID | Unidade fiscalizada correspondente | FK (unidades_fiscalizadas), ON DELETE=CASCADE |
| item_checklist_id | UUID | Pergunta de origem | FK (itens_checklist) |
| resposta | TEXT | Resposta (SIM, NAO, NAO_SE_APLICA) | NULL |
| observacao | TEXT | Comentários e observações adicionais | NULL |
| pergunta | TEXT | Pergunta copiada na data da vistoria (segurança) | NULL |
| numero_constatacao | TEXT | Código sequencial (ex: C1, C2) | NULL |
| gera_nc | BOOLEAN | Cópia do flag de geração de NC | DEFAULT=False |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.2.4 **constatacoes_manuais**
Irregularidades registradas livremente pelo fiscal (não cobertas no checklist).

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| unidade_fiscalizada_id| UUID | Unidade fiscalizada correspondente | FK (unidades_fiscalizadas), ON DELETE=CASCADE |
| numero_constatacao | TEXT | Código gerado (ex: C5, C6) | NULL |
| descricao | TEXT | Detalhamento técnico da irregularidade | NULL |
| gera_nc | BOOLEAN | Se o fiscal definiu que gera NC | DEFAULT=False |
| artigo_portaria | TEXT | Regulamentação infringida | NULL |
| texto_determinacao | TEXT | Ação determinada para saneamento | NULL |
| texto_recomendacao | TEXT | Recomendação de melhoria | NULL |
| ordem | BIGINT | Sequência de ordenação | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.2.5 **nao_conformidades**
Tabela consolidada de irregularidades, preenchida de forma automática na finalização.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| unidade_fiscalizada_id| UUID | Unidade fiscalizada pai | FK (unidades_fiscalizadas), ON DELETE=CASCADE |
| resposta_checklist_id | UUID | Resposta de checklist vinculada | FK (respostas_checklist), ON DELETE=SET_NULL |
| numero_nc | TEXT | Código da Não Conformidade (ex: NC1) | NULL |
| artigo_portaria | TEXT | Dispositivo legal regulatório infringido | NULL |
| descricao | TEXT | Texto descritivo da infração | NOT NULL |
| gravidade | TEXT | Gravidade (Leve, Média, Grave, Gravíssima) | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.2.6 **determinacoes**
Ações corretivas obrigatórias com prazo estipulado para o prestador sanar a Não Conformidade.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| unidade_fiscalizada_id| UUID | Unidade fiscalizada pai | FK (unidades_fiscalizadas), ON DELETE=CASCADE |
| nao_conformidade_id | UUID | Não conformidade que origina a ação | FK (nao_conformidades), ON DELETE=CASCADE |
| numero_determinacao | TEXT | Código da determinação (ex: D1) | NULL |
| descricao | TEXT | Ações corretivas exigidas | NOT NULL |
| prazo_dias | INTEGER | Prazo regulamentar em dias para saneamento | NULL |
| data_limite | DATE | Data final calculada para entrega | NULL |
| status | TEXT | Status (pendente, atendida, nao_atendida) | DEFAULT='pendente' |
| origem | TEXT | Referência de rastreabilidade técnica | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.2.7 **recomendacoes**
Sugestões técnicas não vinculantes de melhoria na operação.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| unidade_fiscalizada_id| UUID | Unidade fiscalizada pai | FK (unidades_fiscalizadas), ON DELETE=CASCADE |
| numero_recomendacao | TEXT | Código da recomendação (ex: R1) | NULL |
| descricao | TEXT | Texto técnico da recomendação | NOT NULL |
| origem | TEXT | Origem (checklist, manual) | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.2.8 **fotos_evidencia**
Armazena a referência das fotos capturadas nas vistorias com coordenadas georreferenciadas.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| fiscalizacao_id | UUID | Fiscalização geral pai | FK (fiscalizacoes), ON DELETE=CASCADE |
| unidade_fiscalizada_id| UUID | Unidade vistoriada correspondente | FK (unidades_fiscalizadas), ON DELETE=CASCADE |
| url | TEXT | Link público ou assinado de acesso à imagem | NOT NULL |
| bucket_path | TEXT | Caminho do objeto no Storage do Supabase | NOT NULL |
| descricao | TEXT | Legenda explicativa inserida pelo fiscal | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

### 2.3 PROCESSAMENTO ADMINISTRATIVO E SANÇÕES

#### 2.3.1 **termos_notificacao**
Registro formal e envio do Termo de Notificação (TN) e Relatório de Fiscalização e Providências (RFP).

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| numero_termo_notificacao | TEXT | Identificador do TN (ex: TN 015/2026) | NULL |
| numero_rfp | TEXT | Identificador do RFP (ex: RFP 015/2026) | NULL |
| municipio_id | UUID | Município vistoriado | FK (municipios) |
| prestador_servico_id | UUID | Concessionária notificada | FK (prestadores_servico) |
| fiscalizacao_id | UUID | Fiscalização geradora | FK (fiscalizacoes) |
| numero_processo | TEXT | Processo regulatório no sistema oficial E-MS | NULL |
| camara_tecnica | TEXT | Câmara de Saneamento/Resíduos de destino | NULL |
| data_protocolo | DATE | Data em que o prestador assinou o recebimento | NULL |
| prazo_resposta_dias | INTEGER | Prazo dado para envio de defesa | DEFAULT=30 |
| observacoes | TEXT | Notas administrativas internas | NULL |
| arquivo_url | TEXT | Link do PDF do TN assinado enviado | NULL |
| arquivo_protocolo_url | TEXT | Link do recibo de protocolo digitalizado | NULL |
| arquivo_oficio_protocolo| TEXT | Link do ofício de envio do protocolo | NULL |
| data_maxima_resposta | DATE | Data limite calculada para defesa | NULL |
| data_geracao | TIMESTAMPTZ | Registro do trâmite no sistema | DEFAULT=now() |
| data_recebimento_resposta| DATE | Data do protocolo de defesa do prestador | NULL |
| recebida_no_prazo | BOOLEAN | Flag de conformidade temporal de defesa | NULL |
| arquivos_resposta | JSONB | Documentação de defesa enviada pelo prestador | DEFAULT='[]'::jsonb |
| arquivo_oficio_resposta | TEXT | Ofício de defesa do prestador | NULL |
| numero_am | TEXT | Número do Parecer de Análise de Manifestação | NULL |
| status | TEXT | Status (pendente_tn, pendente_protocolo, aguardando_resposta, respondido) | DEFAULT='pendente_tn' |
| fluxo_manual | BOOLEAN | Se o trâmite é simplificado/manual | DEFAULT=False |
| arquivo_am_assinada_url | TEXT | Link do documento AM final assinado | NULL |
| am_concluida_em | TIMESTAMPTZ | Data de conclusão da AM | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.3.2 **respostas_determinacao**
Respostas e documentos de prova enviados pelas concessionárias sobre o atendimento das determinações.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| determinacao_id | UUID | Determinação relacionada | FK (determinacoes), ON DELETE=CASCADE |
| unidade_fiscalizada_id| UUID | Instalação vistoriada correspondente | FK (unidades_fiscalizadas) |
| fiscalizacao_id | UUID | Fiscalização de origem | FK (fiscalizacoes) |
| prestador_servico_id | UUID | Concessionária respondente | FK (prestadores_servico) |
| resposta | TEXT | Texto explicativo ou justificativa | NULL |
| status | TEXT | Análise fiscal (atendida, nao_atendida, aguardando_analise) | NULL |
| manifestacao_prestador | TEXT | Argumentação inicial da empresa | NULL |
| descricao_atendimento | TEXT | Laudo do fiscal atestando a qualidade | NULL |
| dentro_prazo | BOOLEAN | Se a correção ocorreu no prazo legal | NULL |
| tipo_resposta | TEXT | Tipo de petição enviada | NULL |
| data_resposta | TIMESTAMPTZ | Data de recebimento da resposta | DEFAULT=now() |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.3.3 **autos_infracao**
Autos de Infração lavrados devido ao descumprimento de prazos ou determinações.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| prestador_servico_id | UUID | Concessionária penalizada | FK (prestadores_servico) |
| unidade_fiscalizada_id| UUID | Instalação com a irregularidade | FK (unidades_fiscalizadas) |
| fiscalizacao_id | UUID | Fiscalização original | FK (fiscalizacoes) |
| determinacao_id | UUID | Determinação descumprida originária | FK (determinacoes) |
| resposta_determinacao_id| UUID | ID da manifestação de recusa | NULL |
| numero_auto | TEXT | Número do AI (AI XXX/YYYY/DSB/AGEMS) | NULL |
| descricao | TEXT | Fundamentação técnica e legal da autuação | NULL |
| valor | NUMERIC(10,2) | Valor inicial proposto da penalidade pecuniária | NULL |
| status | TEXT | Status (pendente, sob_recurso, julgado) | DEFAULT='pendente' |
| camara_tecnica_id | TEXT | Câmara Técnica herdada da fiscalização | NULL |
| data_emissao | TIMESTAMPTZ | Data da autuação | DEFAULT=now() |
| defesa_texto | TEXT | Petição de recurso/defesa escrita | NULL |
| defesa_arquivos | JSONB | Documentos e arquivos de recurso | DEFAULT='[]'::jsonb |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.3.4 **manifestacoes_auto**
Recursos protocolados pelas concessionárias contra os Autos de Infração.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| auto_infracao_id | UUID | Auto de Infração recorrido | FK (autos_infracao), ON DELETE=CASCADE |
| descricao | TEXT | Argumentação técnica/jurídica do recurso | NULL |
| data_manifestacao | TIMESTAMPTZ | Data do envio da manifestação | DEFAULT=now() |
| arquivo_url | TEXT | Cópia digitalizada do recurso oficial | NULL |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.3.5 **pareceres_tecnicos**
Análise do fiscal responsável sobre a petição de defesa do Auto de Infração.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| auto_id | UUID | Auto de Infração sob análise | FK (autos_infracao), ON DELETE=CASCADE |
| recomendacao | TEXT | Parecer (aplicar_multa, rejeitar_multa, analise_adicional) | NULL |
| valor_multa_sugerido | NUMERIC(10,2) | Valor da penalidade após análise de atenuantes | NULL |
| analise_tecnica | TEXT | Relatório descritivo de fundamentação | NULL |
| arquivo_parecer_assinado_url| TEXT| Link do parecer final homologado e assinado | NULL |
| status | TEXT | Progresso do parecer (pendente, finalizado) | DEFAULT='pendente' |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.3.6 **julgamentos**
Julgamento definitivo da penalidade proferido pela Diretoria Colegiada da AGEMS.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| parecer_tecnico_id | UUID | Parecer técnico avaliado | FK (pareceres_tecnicos) |
| auto_id | UUID | Auto julgado | FK (autos_infracao) |
| prestador_servico_id | UUID | Concessionária ré | FK (prestadores_servico) |
| decisao | TEXT | Decisão (multa_aplicada, multa_rejeitada) | NULL |
| valor_multa_final | NUMERIC(10,2) | Valor final julgado da sanção pecuniária | NULL |
| justificativa_decisao | TEXT | Acórdão e justificativa jurídica da decisão | NULL |
| data_julgamento | TIMESTAMPTZ | Data da sessão deliberativa | DEFAULT=now() |
| status | TEXT | Status | DEFAULT='julgado' |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |

---

#### 2.3.7 **remessas_ai**
Controle de lotes (Remessas) agrupando múltiplos Autos de Infração para trâmite administrativo.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| termo_id | UUID | Termo de Notificação associado | FK (termos_notificacao), ON DELETE=CASCADE |
| fiscalizacao_id | UUID | Fiscalização de origem | FK (fiscalizacoes), ON DELETE=SET_NULL |
| prestador_servico_id | UUID | Concessionária destinatária | FK (prestadores_servico), ON DELETE=SET_NULL |
| numero_rfp | TEXT | Número do RFP | NULL |
| numero_tn | TEXT | Número do TN | NULL |
| status | TEXT | Status (preparada, enviada, recebida, etc) | DEFAULT='preparada' |
| camara_tecnica_id | TEXT | Câmara vinculada herdada | NULL |
| arquivo_lista_pdf_url | TEXT | PDF compilando todos os autos do lote | NULL |
| arquivo_recebimento_assinado_url| TEXT| Protocolo assinado de recepção do lote | NULL |
| arquivo_oficio_defesa_url| TEXT | Ofício de recebimento de defesa | NULL |
| arquivo_parecer_assinado_url| TEXT| Pareceres técnicos consolidados em PDF | NULL |
| criada_em | TIMESTAMPTZ | Data de montagem da remessa | DEFAULT=now() |
| enviada_em | TIMESTAMPTZ | Data de envio formal | NULL |
| recebida_em | TIMESTAMPTZ | Data de recepção pelo prestador | NULL |
| defesa_enviada_em | TIMESTAMPTZ | Data de entrega das defesas | NULL |
| parecer_enviado_em | TIMESTAMPTZ | Data de notificação de pareceres | NULL |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.3.8 **remessas_ai_itens**
Tabela intermediária Many-to-Many vinculando Autos de Infração às suas Remessas.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| remessa_ai_id | UUID | ID da remessa | FK (remessas_ai), ON DELETE=CASCADE |
| auto_infracao_id | UUID | ID do auto de infração | FK (autos_infracao), ON DELETE=CASCADE |
| created_at | TIMESTAMPTZ | Data de inserção | DEFAULT=now() |

---

### 2.4 ACOMPANHAMENTO DE PROCESSOS - CATERS

#### 2.4.1 **caters_processes**
Processo administrativo principal de acompanhamento de Resíduos Sólidos na CATERS.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| process_number | TEXT | Número do Processo (deve ser único) | NOT NULL, UNIQUE |
| municipality | TEXT | Município associado | NOT NULL |
| object | TEXT | Objeto do processo (ex: 'Lixão Municipal') | NOT NULL |
| ar_sent_at | DATE | Data de envio do Aviso de Recebimento (AR) | NULL |
| ar_received_at | DATE | Data de recepção do AR assinado | NULL |
| fatal_date | DATE | Data limite fatal calculada | NULL |
| titular_response_due_at| DATE | Prazo limite de resposta do titular | NULL |
| status | ENUM | Status do processo (ver cater_process_status) | DEFAULT='aguardando_analise' |
| relatorio_url | TEXT | URL do relatório de fiscalização anexado | NULL |
| termo_notificacao_url | TEXT | URL do PDF do termo de notificação | NULL |
| ar_digitalizado_url | TEXT | URL do AR digitalizado no Storage | NULL |
| oficio_resposta_url | TEXT | URL do ofício de resposta do município | NULL |
| cronograma_url | TEXT | URL do cronograma físico-financeiro acordado | NULL |
| observations | TEXT | Observações gerais do analista | NULL |
| ar_tracking_code | TEXT | Código de rastreio postal dos Correios | NULL |
| ar_protocol_number | TEXT | Número de protocolo de envio do AR | NULL |
| report_sent_at | DATE | Data de envio do relatório oficial | NULL |
| technician_name | TEXT | Nome do técnico responsável pela análise | NULL |
| fiscalizacao_id | UUID | Link opcional à fiscalização de origem no App | FK (fiscalizacoes) ON DELETE SET NULL |
| created_by | UUID | Usuário criador do processo | FK (auth.users) |
| created_at | TIMESTAMPTZ | Data de inserção no sistema | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.4.2 **caters_recommendations**
Tabela de Recomendações e metas vinculadas a um processo CATERS.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| process_id | UUID | Processo associado | FK (caters_processes) ON DELETE CASCADE |
| item_code | TEXT | Código identificador (ex: 'R1.1') | NULL |
| description | TEXT | Descrição detalhada da meta/sugestão | NOT NULL |
| category | TEXT | Categoria/Área temática da meta | NULL |
| priority | ENUM | Prioridade (baixa, media, alta, critica) | DEFAULT='media' |
| promised_due_at | DATE | Prazo acordado para atendimento | NULL |
| status | ENUM | Status de cumprimento (pendente, em_andamento, vencido, cumprido) | DEFAULT='pendente' |
| fulfilled_at | DATE | Data de efetivo atendimento | NULL |
| evidence_url | TEXT | Link do comprovante/prova de atendimento | NULL |
| notes | TEXT | Notas de auditoria de atendimento | NULL |
| titular_response | TEXT | Argumentação inicial de defesa do titular | NULL |
| recomendacao_id | UUID | Link à recomendação geradora (caso importado do App) | FK (recomendacoes) ON DELETE SET NULL |
| determinacao_id | UUID | Link à determinação geradora (caso importado do App) | FK (determinacoes) ON DELETE SET NULL |
| created_by | UUID | Autor do registro | FK (auth.users) |
| created_at | TIMESTAMPTZ | Data de registro | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.4.3 **caters_analysis_history**
Registro histórico de eventos e trâmites de um processo CATERS.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| process_id | UUID | Processo associado | FK (caters_processes) ON DELETE CASCADE |
| action_type | ENUM | Tipo de ação (ver caters_analysis_action_type) | NOT NULL |
| description | TEXT | Memorial descritivo da ação executada | NOT NULL |
| new_fatal_date | DATE | Nova data limite fatal (em caso de prorrogação) | NULL |
| related_document_url| TEXT | URL de documento gerado no trâmite | NULL |
| performed_by | UUID | Técnico executor do trâmite | FK (auth.users) |
| created_at | TIMESTAMPTZ | Registro do log histórico | DEFAULT=now() |

---

#### 2.4.4 **caters_extra_documents**
Documentações extras anexadas ao longo do andamento processual na CATERS.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| process_id | UUID | Processo pai | FK (caters_processes) ON DELETE CASCADE |
| title | TEXT | Título do documento | NOT NULL |
| description | TEXT | Resumo do conteúdo do arquivo | NULL |
| file_url | TEXT | URL de acesso ao binário no Storage | NOT NULL |
| created_by | UUID | Usuário que fez o upload | FK (auth.users) |
| created_at | TIMESTAMPTZ | Data do envio | DEFAULT=now() |

---

#### 2.4.5 **caters_municipality_responses**
Registro consolidado de respostas e análise de cronogramas enviados pelos municípios.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| process_id | UUID | Processo correspondente (relação 1:1) | NOT NULL, UNIQUE, FK (caters_processes) ON DELETE CASCADE |
| received_at | DATE | Data do protocolo de recebimento da resposta | NOT NULL |
| protocol_number | TEXT | Número do protocolo físico/digital | NULL |
| cronograma_status | TEXT | Situação do cronograma (pendente, aprovado, adequacao, dispensado) | DEFAULT='pendente' |
| notes | TEXT | Notas de homologação do cronograma | NULL |
| created_by | UUID | Usuário validador | FK (auth.users) |
| created_at | TIMESTAMPTZ | Data de gravação | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.4.6 **caters_notification_reads**
Tabela de persistência para registrar a leitura de avisos e notificações internas pelos técnicos da CATERS.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| user_id | UUID | Usuário que visualizou | NOT NULL, FK (auth.users) |
| key | TEXT | Chave de identificação do aviso | NOT NULL |
| read_at | TIMESTAMPTZ | Data/hora exata em que leu | NOT NULL |
| created_at | TIMESTAMPTZ | Data do registro | DEFAULT=now() |

*Constraint adicional:* UNIQUE(user_id, key)

---

### 2.5 SERVIÇOS DO SISTEMA, FILAS E IA

#### 2.5.1 **relatorios_jobs**
Fila de processamento assíncrono para geração e download de PDFs de relatórios no servidor.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=uuid_generate_v4() |
| fiscalizacao_id | UUID | Fiscalização alvo do PDF | FK (fiscalizacoes), ON DELETE=CASCADE |
| requested_by | UUID | Usuário solicitante | FK (profiles) |
| status | TEXT | Status (queued, processing, done, error) | DEFAULT='queued' |
| progress_unidades | INTEGER | Unidades convertidas | DEFAULT=0 |
| progress_fotos | INTEGER | Fotos processadas | DEFAULT=0 |
| error_message | TEXT | Mensagem detalhada de falha técnica | NULL |
| storage_path | TEXT | Caminho final do PDF no bucket | NULL |
| created_at | TIMESTAMPTZ | Registro do pedido | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última atualização | DEFAULT=now() |

---

#### 2.5.2 **caters_ai_jobs**
Fila de processamento de IA (Gemini) do módulo CATERS para extração automática de recomendações de PDFs e classificação de respostas municipais.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| job_type | ENUM | Tipo de job (extract_pdf, analyze_response) | NOT NULL |
| process_id | UUID | Processo associado | NULL, FK (caters_processes) ON DELETE CASCADE |
| storage_bucket | TEXT | Nome do bucket de origem do arquivo analisado | NULL |
| storage_path | TEXT | Caminho do arquivo analisado no bucket | NULL |
| input_text | TEXT | Texto complementar enviado ao prompt | NULL |
| status | TEXT | Status (queued, processing, done, error) | DEFAULT='queued' |
| result_json | JSONB | Estrutura de sugestões retornada pelo Gemini | NULL |
| reviewed_at | TIMESTAMPTZ | Data da revisão humana (aprovação) | NULL |
| reviewed_by | UUID | Usuário que revisou e consolidou o job | FK (auth.users) |
| error_message | TEXT | Mensagem de erro (se status='error') | NULL |
| requested_by | UUID | Usuário solicitante do job | FK (auth.users) |
| created_at | TIMESTAMPTZ | Data de solicitação | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última atualização | DEFAULT=now() |

---

#### 2.5.3 **catesa_ai_jobs**
Fila de processamento de IA (Gemini) do módulo CATESA para auditoria automatizada de provas de atendimento enviadas por prestadores de saneamento básico.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| termo_id | UUID | Termo de Notificação associado ao job | NOT NULL, FK (termos_notificacao) ON DELETE CASCADE |
| input_text | TEXT | Metadados complementares do prompt | NULL |
| status | TEXT | Status (queued, processing, done, error) | DEFAULT='queued' |
| result_json | JSONB | Estrutura de auditoria sugerida pelo Gemini | NULL |
| reviewed_at | TIMESTAMPTZ | Data da revisão/homologação humana | NULL |
| reviewed_by | UUID | Técnico homologador | FK (auth.users) |
| error_message | TEXT | Mensagem de falha do processamento | NULL |
| requested_by | UUID | Solicitante do job | FK (auth.users) |
| created_at | TIMESTAMPTZ | Data do registro | DEFAULT=now() |
| updated_at | TIMESTAMPTZ | Última modificação | DEFAULT=now() |

---

#### 2.5.4 **audit_logs**
Sistema de logs automáticos por gatilhos (triggers) de modificação em tabelas operacionais para LGPD e auditoria jurídica.

| Campo | Tipo | Descrição | Constraints |
|-------|------|-----------|-------------|
| id | UUID | Chave primária | PK, DEFAULT=gen_random_uuid() |
| table_name | TEXT | Nome da tabela que sofreu a ação | NOT NULL |
| record_id | UUID | ID do registro alterado | NOT NULL |
| action | TEXT | Tipo de operação (INSERT, UPDATE, DELETE) | NOT NULL |
| user_id | UUID | Usuário executor (auth.uid) | FK (auth.users), ON DELETE=SET_NULL |
| user_email | TEXT | E-mail do executor registrado em cache | NULL |
| old_data | JSONB | Registro anterior à operação (para Updates/Deletes) | NULL |
| new_data | JSONB | Registro pós-operação (para Inserts/Updates) | NULL |
| created_at | TIMESTAMPTZ | Data da gravação do log | DEFAULT=now() |

---

## ⚙️ 3. Funções de Banco de Dados (PL/pgSQL)

O banco de dados centraliza lógicas de negócio críticas em procedimentos armazenados. As funções mais importantes estão descritas abaixo:

### 3.1 `finalizar_fiscalizacao(p_fiscalizacao_id uuid)`
Executada no servidor com permissões elevadas (`SECURITY DEFINER`).
- Gera a numeração sequencial anual do Termo de Fiscalização (ex: `002/2026`).
- Varre as unidades fiscalizadas e dispara o procedimento `gerar_ncs_unidade` para limpar e regenerar todas as Não Conformidades, Determinações e Recomendações definitivas.
- Consolida e atualiza os totalizadores de controle (`total_constatacoes`, `total_ncs`, `total_determinacoes` e `total_recomendacoes`) diretamente no cabeçalho da tabela `fiscalizacoes`.

### 3.2 `gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)`
Responsável pela consistência técnica de cada instalação vistoriada.
- Deleta apontamentos antigos de NC, Determinações e Recomendações de checklist da unidade para evitar duplicidades após edições ou reaberturas.
- Executa uma query analítica usando `row_number() OVER (PARTITION BY ... ORDER BY updated_at DESC)` na tabela `respostas_checklist` para filtrar **apenas a última resposta válida** de cada pergunta.
- Para cada resposta "NÃO" com a flag `gera_nc = true`, insere o registro correspondente em `nao_conformidades` e gera sua ação corretiva em `determinacoes`.
- Varre as constatações manuais e gera suas respectivas NCs e Determinações/Recomendações correspondentes.

### 3.3 `obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[])`
Consulta compilada que alimenta o painel de relatórios do dashboard.
- Bypassa o limite padrão de 1.000 registros do PostgREST.
- Retorna um JSON compacto contendo contagens totais (qualquer status) e contagens de finalizadas.
- Calcula Não Conformidades, Determinações, Recomendações e Conformidades (`total_constatacoes - total_ncs`) **apenas de vistorias finalizadas** correspondentes aos filtros ativos.
- Retorna a distribuição de serviços e o ranking Top 10 de municípios com mais determinações pendentes.

### 3.4 `process_audit_log()`
Gatilho de auditoria global.
- Captura a operação executada (`INSERT`, `UPDATE` ou `DELETE`) e a tabela de origem.
- Resolve o e-mail e o ID do usuário conectado.
- Salva em `audit_logs` os objetos JSON correspondentes aos registros antes e depois da modificação.

### 3.5 `claim_caters_ai_jobs(p_limit int, p_job_id uuid, p_stale_minutes int)`
Garante o consumo de fila assíncrona com exclusão mútua (`FOR UPDATE SKIP LOCKED`) para o robô de IA do CATERS, marcando o status como `processing`.

### 3.6 `claim_catesa_ai_jobs(p_limit int, p_job_id uuid, p_stale_minutes int)`
Garante o consumo de fila assíncrona com exclusão mútua (`FOR UPDATE SKIP LOCKED`) para o robô de IA do CATESA, marcando o status como `processing`.

### 3.7 `can_access_camara(row_camara TEXT)`
Resolve a política RLS baseada na Câmara Técnica do usuário, isolando visualmente os dados de cada coordenadoria/câmara (CATESA, CATERS, etc.), mas garantindo visão total para administradores e perfis legado (sem câmara definida).

---

## 🔔 4. Gatilhos de Banco (Triggers)

| Nome do Gatilho | Tabela Alvo | Evento | Função Executada | Objetivo |
|-----------------|-------------|--------|------------------|----------|
| `trg_audit_` (vários) | `fiscalizacoes`, `unidades_...`, `respostas_...`, `constatacoes_...`, `recomendacoes`, `determinacoes` | `AFTER INSERT OR UPDATE OR DELETE` | `process_audit_log()` | Gravar alterações na tabela `audit_logs` |
| `trg_set_fiscalizacao_last_modified` | `fiscalizacoes` | `BEFORE INSERT OR UPDATE` | `set_fiscalizacao_last_modified()` | Preencher `last_modified_by` e `last_modified_at` |
| `trg_set_fiscalizacao_cache_fields` | `fiscalizacoes` | `BEFORE INSERT OR UPDATE` | `set_fiscalizacao_cache_fields()` | Atualizar caches de nomes de municípios, prestadores e fiscais |
| `trg_propagate_` (vários) | `unidades_...`, `respostas_...`, `constatacoes_...`, `recomendacoes`, `determinacoes` | `AFTER INSERT OR UPDATE OR DELETE` | `propagate_modification_to_parent()` | Atualizar `updated_at` na tabela pai `fiscalizacoes` ao alterar tabelas filhas |
| `on_auth_user_created` | `auth.users` | `AFTER INSERT` | `handle_new_user()` | Criar perfil correspondente na tabela `profiles` |
| `trg_enforce_profile_security` | `profiles` | `BEFORE INSERT OR UPDATE` | `enforce_profile_security()` | Impedir que não-admins modifiquem privilégios, diretoria ou câmara do próprio perfil |
| `tr_camara_fiscalizacoes` | `fiscalizacoes` | `BEFORE INSERT OR UPDATE OF servicos` | `trg_fiscalizacao_set_camara()` | Determinar automaticamente a Câmara Técnica baseada no array de serviços |
| `tr_camara_autos` | `autos_infracao` | `BEFORE INSERT` | `trg_auto_set_camara()` | Herdar a Câmara Técnica da fiscalização vinculada |
| `tr_camara_remessas` | `remessas_ai` | `BEFORE INSERT` | `trg_remessa_set_camara()` | Herdar a Câmara Técnica da fiscalização vinculada |

---

## 🗄️ 5. Supabase Storage (Buckets)

O sistema utiliza a API do Supabase Storage para gerenciar e armazenar arquivos binários de mídia e documentos públicos/privados:

1. **`fotos-evidencia` (Privado):** Guarda as fotos tiradas em campo anexadas às vistorias de instalações. Acesso restrito via URLs assinadas geradas sob demanda.
2. **`documentos-termos` (Privado):** Armazena os documentos PDF de Termos de Notificação assinados, Ofícios e protocolos de envio e recebimento.
3. **`documentos-autos` (Privado):** Guarda os arquivos digitalizados de Autos de Infração, petições de defesa e recursos do prestador e relatórios de Pareceres Fiscais assinados.
4. **`relatorios-pdf` (Privado):** Armazena os PDFs de relatórios consolidados finais gerados de forma assíncrona por meio do `relatorios_jobs`.
5. **`logos-entidades` (Público):** Guarda os logotipos em formato PNG/JPG carregados para as concessionárias e prestadores de serviço regulados.
6. **`kml-rodovias` (Privado):** Guarda arquivos de mapa KML/KMZ de traçado de rodovias oficiais para uso off-line no monitoramento de infraestrutura viária (DTR).

---

**Última atualização:** 10/07/2026
