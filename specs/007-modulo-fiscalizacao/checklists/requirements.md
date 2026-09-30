# Specification Quality Checklist: Módulo fiscalização — execução de campo comum às câmaras

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

- **Iteração 1 (2026-09-30)**: todos os itens passam. Quatro decisões foram tomadas pelo
  responsável antes da escrita:
  - fiscalização nasce da atividade planejada, com exceção de urgência registrada;
  - exportar e importar ficam, com a importação passando pelas regras;
  - relatórios guardados em versões;
  - reabertura por fiscal e coordenador, com motivo.
- **Chaves do catálogo**: 201 chaves citadas, todas no inventário de produção. Das 318 do módulo
  `fiscalizacao`, as não citadas são índices, privilégios, restrições de detalhe e as colunas da
  tabela `fotos_evidencia`, que é descartada inteira (A-030) e citada pela tabela. Tabelas, funções,
  gatilhos, políticas, repositórios, extensões e segredos do módulo estão todos citados.
- **Telas do sistema atual**: 8 telas e os componentes da vistoria percorridos, 0 `LACUNA`. As
  telas da DTR ficam com o app da CATERF, e o acompanhamento de determinações com o processo
  sancionador.
- **Mudanças em outras specs**: a R-planejamento-009 passou a aceitar viagem extra com período já
  iniciado, para a regularização da urgência.
- **Premissas**:
  - a data-limite da determinação continua como hoje (criação mais prazo);
  - o limite de imprecisão do GPS é 20 m para todas as câmaras;
  - as fotos são guardadas com e sem marca d'água (o dobro do armazenamento).
- **Mapa de migração**: criado com o data-model do plano (passo 7 do molde); até lá, o módulo
  aparece como "sem mapa".
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
