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
- **Observação**: Motor de checklists comum: tipos de unidade e itens de checklist (versionados, append-only).
- **Objetos** (42): Tabelas: 2 · Colunas: 25 · Restrições: 3 · Índices: 2 · Políticas de acesso: 4 · Privilégios: 6
- **Depende de**: `core`

## 3. Fiscalização

- **Id**: `fiscalizacao` · **App**: fiscalização · **Spec**: LACUNA
- **Observação**: Fiscalização de campo comum às câmaras, incluindo a operação offline e a geração de relatórios.
- **Objetos** (318): Tabelas: 9 · Colunas: 112 · Restrições: 27 · Índices: 33 · Funções: 12 · Gatilhos: 18 · Políticas de acesso: 42 · Repositórios de arquivos: 2 · Privilégios: 59 · Segredos (nomes): 2 · Extensões: 2
- **Depende de**: `core`, `checklists`

## 4. DTR

- **Id**: `dtr` · **App**: app da diretoria/câmara DTR · **Spec**: LACUNA
- **Observação**: Especificidades da DTR (tipos de ocorrência, mapa e KML); o fluxo usa as tabelas do módulo fiscalização.
- **Objetos** (45): Tabelas: 1 · Colunas: 30 · Restrições: 1 · Índices: 2 · Gatilhos: 1 · Políticas de acesso: 6 · Repositórios de arquivos: 1 · Privilégios: 3
- **Depende de**: `core`

## 5. Processo sancionador

- **Id**: `processo_sancionador` · **App**: processo sancionador · **Spec**: LACUNA
- **Observação**: Termos de notificação, respostas a determinações, autos de infração, manifestações, pareceres técnicos, julgamentos e remessas para análise com IA.
- **Objetos** (281): Tabelas: 8 · Colunas: 117 · Restrições: 32 · Índices: 13 · Funções: 7 · Gatilhos: 5 · Políticas de acesso: 44 · Repositórios de arquivos: 3 · Privilégios: 52
- **Depende de**: `core`, `fiscalizacao`

## 6. CATERS

- **Id**: `caters` · **App**: app da câmara CATERS · **Spec**: LACUNA
- **Observação**: Processos, recomendações e análises com IA da câmara de resíduos sólidos.
- **Objetos** (236): Tabelas: 8 · Views: 1 · Colunas: 104 · Restrições: 32 · Índices: 17 · Funções: 3 · Gatilhos: 4 · Políticas de acesso: 27 · Tipos: 5 · Privilégios: 35
- **Depende de**: `core`, `fiscalizacao`

## 7. CATESA

- **Id**: `catesa` · **App**: app da câmara CATESA · **Spec**: LACUNA
- **Observação**: Análise por IA da resposta ao termo de notificação (edge functions catesa_ai_* e tabela catesa_ai_jobs, criada em produção pela migration 141).
- **Objetos** (32): Tabelas: 1 · Colunas: 11 · Restrições: 5 · Índices: 3 · Funções: 2 · Gatilhos: 1 · Políticas de acesso: 1 · Privilégios: 8
- **Depende de**: `core`, `processo_sancionador`

## 8. Portal do prestador

- **Id**: `portal_prestador` · **App**: portal do prestador · **Spec**: LACUNA
- **Observação**: Sem tabela própria no banco atual: existe como políticas de acesso para o papel prestador e como telas. É dono da regra 'o prestador só vê a fiscalização depois de receber termo de notificação' (can_access_fiscalizacao, can_access_unidade e as políticas que as usam), que depende de fiscalização e processo sancionador e por isso fica depois deles.
- **Objetos** (19): Funções: 2 · Políticas de acesso: 9 · Privilégios: 8
- **Depende de**: `core`, `fiscalizacao`, `processo_sancionador`

## 9. Tramitação de documentos e dados

- **Id**: `tramitacao` · **App**: tramitação de documentos e dados · **Spec**: LACUNA
- **Observação**: Sem tabela própria no banco atual. Se corresponde a algo que já existe (remessas, respostas, histórico de análise) ou é funcionalidade nova é pergunta aberta da avaliação.
- **Objetos** (0): nenhum
- **Depende de**: —
