# Phase 1 — Modelo da Camada

**Feature**: Camada de Abstração de Acesso a Dados
**Date**: 2026-09-18

Esta fase não cria nem altera entidades de negócio. O "modelo" aqui é o da **própria
camada**: como as operações são agrupadas, que formas de dado atravessam a fronteira e que
regras de validação se aplicam. As tabelas listadas são as que hoje aparecem no código e
que a camada precisa passar a cobrir.

## Domínios

Os módulos são organizados por conceito de negócio. O agrupamento abaixo saiu do
levantamento real dos 158 acessos a tabela no código atual.

| Domínio | Tabelas hoje acessadas | Observação |
|---|---|---|
| `fiscalizacoes` | `fiscalizacoes`, `unidades_fiscalizadas`, `respostas_checklist`, `itens_checklist`, `tipos_unidade`, `nao_conformidades`, `constatacoes_manuais`, `fotos_fiscalizacao`, `recomendacoes`, `determinacoes`, `respostas_determinacao`, `relatorios_fiscalizacao`, `tipos_ocorrencia_dtr`, `audit_logs` | Núcleo de campo. É o domínio atravessado pelo caminho offline. |
| `autos` | `autos_infracao`, `manifestacoes_auto`, `pareceres_tecnicos`, `julgamentos`, `remessas_ai`, `remessas_ai_itens` | Processo sancionador. Fluxo majoritariamente de escrita. |
| `termos` | `termos_notificacao` | Tabela única, mas com o maior número de acessos concentrados numa página (`GerenciarTermos.jsx`). |
| `cadastros` | `prestadores_servico`, `municipios`, `contratos`, `unidades`, `profiles`, `diretorias`, `camaras_tecnicas` | Dados de referência. É o domínio que a fase 2 vai substituir por entidades do SISREG. |
| `caters` | `caters_processes`, `caters_recommendations`, `caters_analysis_history`, `caters_extra_documents`, `caters_deadline_extensions`, `caters_municipality_responses`, `caters_notification_reads`, `caters_ai_jobs`, `caters_fiscalizacoes_disponiveis` | Já possui organização própria em `src/lib/caters/` — o módulo de domínio nasce reaproveitando essa estrutura. |
| `catesa` | `catesa_ai_jobs` | Análise assistida por IA da câmara de saneamento. |
| `relatorios` | `relatorios_jobs` | Processamento assíncrono de PDF. |

**Nota de fronteira**: `cadastros` merece atenção especial no desenho, porque é o domínio
que a fase 2 mais altera — `prestadores_servico` e `contratos` serão substituídos por
`Entidade` e `Instrumento` do SISREG, com tabela de extensão 1:1. Um contrato bem desenhado
aqui absorve essa troca sem propagar mudança para as telas.

**Nota de fronteira — `itens_checklist` não segue o padrão CRUD deste modelo**: ao
contrário de toda outra tabela listada acima, editar ou remover um item de checklist **não**
usa as operações `Atualizar`/`Remover` da forma descrita em *Regras de validação herdadas*
abaixo — insere uma linha nova (append-only), para que vistorias já respondidas continuem
referenciando o texto vigente à época. Ver `contracts/domains.md` (domínio `fiscalizacoes`)
e `debitos-tecnicos-e-inconsistencias.md` item 5 para o comportamento completo e a decisão
pendente sobre como representá-lo na fase 2.

## Formas compartilhadas

Atravessam a fronteira da camada em todos os domínios.

### Resultado de operação

Toda operação retorna sucesso com dado ou falha com erro estruturado. A camada **não**
lança exceção para falha esperada (permissão negada, registro inexistente, rede indisponível):
essas são resultado, não acidente. Isso preserva o tratamento atual, em que as telas
verificam o erro em vez de capturar exceção.

### Erro

| Campo | Descrição |
|---|---|
| `tipo` | Categoria estável e independente de backend: `nao_encontrado`, `sem_permissao`, `conflito`, `invalido`, `rede_indisponivel`, `falha_servidor` |
| `mensagem` | Texto destinado ao usuário, preservando exatamente o que ele vê hoje (FR-004) |
| `origem` | Erro bruto do provedor, para diagnóstico — nunca exibido |

O campo `tipo` é o que torna a fase 2 possível: as telas passam a reagir a categorias
estáveis em vez de a códigos do Supabase, que não existirão no Django.

### Filtro e paginação

Critérios expressos em termos neutros — igualdade, pertencimento a conjunto, intervalo,
busca textual, ordenação, limite e deslocamento. A camada traduz para o provedor. Nenhuma
tela monta consulta no formato do backend.

**Restrição de fidelidade**: o conjunto de critérios suportado é exatamente o que os 158
acessos atuais usam. Não se antecipam capacidades — Princípio V da constituição, e
qualquer critério a mais é código sem consumidor.

### Referência de arquivo

Identifica um arquivo por repositório lógico e caminho, sem expor como ele é armazenado ou
como a URL de acesso é construída. É o que permite a troca de armazenamento na fase
seguinte sem tocar nas telas.

## Entidades de apoio à verificação

Existem apenas para a suíte de testes. Não são conceitos de negócio e não aparecem na
interface.

### Execução de teste

| Campo | Descrição |
|---|---|
| `id` | Identificador único da execução, usado como marcador nos registros criados |
| `iniciada_em` | Momento de início, base para a varredura de resíduo de execuções anteriores |
| `base_alvo` | Identificador da base confirmada pela trava de execução (FR-018) |

### Registro rastreado

Todo registro criado pela suíte é rastreável por dois critérios combinados:

- **autoria** — `created_by` igual ao usuário dedicado de teste, disponível nas tabelas
  principais;
- **marcador** — identificador da execução gravado em campo de texto já existente do
  registro, sem alteração de schema.

**Regra de validação (FR-017)**: a rotina de limpeza só pode remover registro que satisfaça
os dois critérios. Onde `created_by` não existir na tabela, a tabela precisa ser mapeada
explicitamente durante a implementação, com o critério textual documentado — e enquanto não
estiver mapeada, a suíte não deve escrever nela.

## Regras de validação herdadas

Nenhuma regra de negócio nova é introduzida. A camada:

- **não** valida conteúdo de campo — quem valida hoje continua validando;
- **não** aplica autorização — ela permanece onde está (FR-009);
- **não** altera obrigatoriedade, formato ou valor padrão de campo algum.

A camada é passagem, não guardião. Qualquer validação acrescentada aqui seria mudança de
comportamento e violaria FR-004.

## Transições de estado

A camada é sem estado, com uma exceção: a **seleção do provedor ativo**, definida na
inicialização da aplicação e imutável durante a execução. Na fase 2 é exatamente esse ponto
— e apenas ele — que passa a apontar para o Django.
