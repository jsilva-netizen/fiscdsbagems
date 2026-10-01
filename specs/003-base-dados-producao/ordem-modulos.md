<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Ordem de especificação dos módulos

Um módulo só depende de módulos anteriores na ordem. Dependência para um módulo posterior é **violação de ordem**: vale só com justificativa anotada em `anotacoes/modulos.toml` (`[[excecao]]`).

Violações: 0 · sem justificativa: 0.

## 1. Core

- **Id**: `core` · **App**: core · **Spec**: LACUNA
- **Observação**: Identidade, perfis, diretorias e câmaras técnicas, municípios, prestadores (entidades reguladas), contratos (instrumentos), auditoria e as funções de permissão usadas pelas políticas de todos os módulos.
- **Objetos** (250): Tabelas: 7 · Colunas: 58 · Restrições: 18 · Índices: 13 · Funções: 18 · Gatilhos: 4 · Políticas de acesso: 33 · Repositórios de arquivos: 2 · Papéis: 3 · Privilégios: 90 · Privilégios padrão: 3 · Extensões: 1
- **Depende de**: —

## 2. Checklists

- **Id**: `checklists` · **App**: checklists · **Spec**: LACUNA
- **Observação**: Motor genérico de verificação ("lego"): catálogos, itens versionados, campos, respostas, saídas, importação e cópia offline, sem nada de nenhuma câmara; cada app de câmara registra o seu modelo de catálogo (DSB: checklist por tipo de unidade; DTR: ocorrências do PER). Spec 005.
- **Objetos** (61): Tabelas: 3 · Colunas: 35 · Restrições: 4 · Índices: 3 · Gatilhos: 1 · Políticas de acesso: 6 · Privilégios: 9
- **Depende de**: `core`

## 3. Planejamento de fiscalizações

- **Id**: `planejamento` · **App**: planejamento · **Spec**: LACUNA
- **Observação**: Funcionalidade nova, sem objeto no banco atual (decisão do responsável, 2026-09-30). O coordenador elabora o planejamento anual de fiscalizações (municípios, concessões ou rodovias a fiscalizar, equipe, datas, veículos e diárias), o diretor aprova, os fiscais consultam, e o planejamento aprovado segue para as áreas pertinentes (RH para a folha de ponto, financeiro para as diárias, frotas para a reserva de veículos), que virão como apps próprios, interligados, ou por integração externa. Vem antes da fiscalização, que executa o que foi planejado.
- **Objetos** (0): nenhum
- **Depende de**: —

## 4. Fiscalização

- **Id**: `fiscalizacao` · **App**: fiscalização · **Spec**: LACUNA
- **Observação**: Fiscalização de campo comum às câmaras, incluindo a operação offline, a geração de relatórios e a localização dos registros de campo (ponto GPS com precisão e origem, sem travar a captura, e mapa-base); o que depende do traçado da rodovia (KML, KM, sentido, KM impreciso, marca d'água) é do app da CATERF. `coluna:unidades_fiscalizadas.gps_accuracy_m` passou da DTR para este módulo com a spec 007 (decisão do responsável, 2026-09-30).
- **Objetos** (319): Tabelas: 9 · Colunas: 113 · Restrições: 27 · Índices: 33 · Funções: 12 · Gatilhos: 18 · Políticas de acesso: 42 · Repositórios de arquivos: 2 · Privilégios: 59 · Segredos (nomes): 2 · Extensões: 2
- **Depende de**: `core`, `checklists`

## 5. DTR

- **Id**: `dtr` · **App**: app da CATERF (câmara da DTR que fiscaliza as rodovias; decisão do responsável, 2026-09-30) · **Spec**: LACUNA
- **Observação**: Especificidades da DTR (campos da rodovia no catálogo de ocorrências e nas ocorrências, mapa e KML); o catálogo de tipos é do motor de verificação (checklists) e o fluxo usa as tabelas do módulo fiscalização.
- **Objetos** (25): Colunas: 19 · Índices: 1 · Políticas de acesso: 4 · Repositórios de arquivos: 1
- **Depende de**: `core`

## 6. Processo sancionador

- **Id**: `processo_sancionador` · **App**: processo sancionador · **Spec**: LACUNA
- **Observação**: Termos de notificação, respostas a determinações, autos de infração (AI), manifestações, pareceres técnicos, julgamentos e remessas de autos de infração à entidade (remessas_ai: AI aqui é auto de infração).
- **Objetos** (281): Tabelas: 8 · Colunas: 117 · Restrições: 32 · Índices: 13 · Funções: 7 · Gatilhos: 5 · Políticas de acesso: 44 · Repositórios de arquivos: 3 · Privilégios: 52
- **Depende de**: `core`, `fiscalizacao`

## 7. CATERS

- **Id**: `caters` · **App**: app da câmara CATERS · **Spec**: LACUNA
- **Observação**: Processos e recomendações da câmara de resíduos sólidos. As análises por IA (caters_ai_jobs) não serão refeitas no sistema novo (A-039).
- **Objetos** (205): Tabelas: 7 · Views: 1 · Colunas: 90 · Restrições: 27 · Índices: 14 · Funções: 2 · Gatilhos: 3 · Políticas de acesso: 26 · Tipos: 4 · Privilégios: 31
- **Depende de**: `core`, `fiscalizacao`

## 8. CATESA

- **Id**: `catesa` · **App**: app da câmara CATESA · **Spec**: LACUNA
- **Observação**: Sem objeto próprio no sistema novo: a única funcionalidade específica da CATESA no banco atual é a análise por IA da resposta ao termo (catesa_ai_jobs), que não será refeita (A-039). A câmara segue existindo no core e nos demais módulos.
- **Objetos** (0): nenhum
- **Depende de**: —

## 9. Portal do prestador

- **Id**: `portal_prestador` · **App**: portal do prestador · **Spec**: LACUNA
- **Observação**: Sem tabela própria no banco atual: existe como políticas de acesso para o papel prestador e como telas. É dono da regra 'o prestador só vê a fiscalização depois de receber termo de notificação' (can_access_fiscalizacao, can_access_unidade e as políticas que as usam), que depende de fiscalização e processo sancionador e por isso fica depois deles.
- **Objetos** (19): Funções: 2 · Políticas de acesso: 9 · Privilégios: 8
- **Depende de**: `core`, `fiscalizacao`, `processo_sancionador`

## 10. Tramitação de documentos e dados

- **Id**: `tramitacao` · **App**: tramitação de documentos e dados · **Spec**: LACUNA
- **Observação**: Funcionalidade nova, sem objeto no banco atual (decisão do responsável, 2026-10-01; spec 013): troca de documentos com as entidades, pedidos de dados (pontuais e periódicos, com formato), movimentação interna e integração com o e-MS, que continua sendo o protocolo oficial.
- **Objetos** (0): nenhum
- **Depende de**: —
