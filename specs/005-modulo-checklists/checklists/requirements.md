# Specification Quality Checklist: Módulo checklists — motor genérico de verificação

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Iteração 1 (2026-09-30)**: todos os itens passam, exceto o marcador de esclarecimento da
  R-checklists-007 (quem mantém os checklists da câmara), apresentado ao responsável.
- **Chaves do catálogo**: as 34 chaves citadas foram conferidas contra o inventário de produção de
  2026-09-29; a única fora dele, `funcao:sync_dates_columns()`, é citada como divergência e existe
  só nas migrations. Todos os objetos do módulo `checklists` no mapa de rastreabilidade são citados.
- **Dependência do core**: o vínculo serviço → câmara (R-checklists-002) foi acrescentado à spec do
  core (R-core-014, data-model `Servico.camara`, tarefas T011 e T026), porque checklists vem antes da
  fiscalização na ordem e não pode depender dela.
- **Iteração 2 (2026-09-30), motor genérico**: a spec foi reescrita para cobrir os checklists da DSB
  e o catálogo de ocorrências da DTR e qualquer câmara futura (decisão do responsável). Regras novas:
  R-checklists-012 (modos de aplicação), 013 (tipos de resposta e o que geram), 014 (campos próprios
  da câmara); as regras 001 a 011 mantêm o número e foram estendidas à DTR. História nova: US5
  (câmara nova sem mudar o módulo). Na spec 003, `tabela:tipos_ocorrencia_dtr` passou ao módulo
  `checklists`; as colunas frente, item do PER, rodovia e etapas de obra e o índice por rodovia
  ficaram na `dtr`. Medição regenerada: 0 violações de ordem.
- **Chaves do catálogo (iteração 2)**: 72 chaves citadas, todas no inventário de produção de
  2026-09-29, exceto `funcao:sync_dates_columns()`, citada como divergência (só nas migrations). Os
  61 objetos do módulo `checklists` no mapa de rastreabilidade são citados.
- **Telas do sistema atual**: seção acrescentada pelo molde; 0 `LACUNA`. Um ponto fica **a
  confirmar** sem bloquear o plano: o responsável informa que o formulário de item da DSB edita prazo
  e texto da NC, e o código deste repositório não tem esses campos (R-checklists-003). O comportamento
  desejado (todos os campos editáveis) não depende da conferência.
- **Iteração 3 (2026-09-30), motor como "lego"**: o responsável pediu que o módulo não tenha nada
  chumbado de nenhuma câmara. As regras passaram a descrever só peças genéricas; os campos, respostas,
  saídas e planilhas da DSB e da DTR saíram das regras para a seção "Modelos de hoje", como
  configuração registrada pelos apps das câmaras. Regras novas: R-checklists-015 (modelo registrado
  pelo app), 016 (nada de câmara no motor, com teste) e 017 (mudança de modelo). Chaves: as mesmas 72,
  com os 61 objetos do módulo citados.
- **Iteração 4 (2026-09-30), montagem pela tela**: o responsável decidiu que a própria câmara monta
  os modelos na tela, pode ter vários modelos (cada um com a sua forma de resposta), copia o modelo de
  outra câmara (CATERS a partir da CATESA) e que a CATERF fiscaliza as rodovias. R-checklists-015
  reescrita (modelo montado na tela), novas R-checklists-018 (cópia entre câmaras) e 019 (peças
  registradas pelos apps: saídas, valores de contexto, modos). Premissa adotada, a confirmar: montar
  modelo cabe ao coordenador e ao administrador, não ao fiscal; copiar catálogos com itens entre
  câmaras, só ao administrador.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
