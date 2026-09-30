# Specification Quality Checklist: Módulo core — identidade, acesso, estrutura organizacional e cadastros de base

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-30
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
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

- **Iteração 1 (2026-09-30)**: todos os itens passam, exceto os 2 marcadores de esclarecimento
  (R-core-004, usuários prestadores por entidade; R-core-012, alcance do diretor), apresentados ao
  responsável.
- **Chaves do catálogo nas regras**: a seção "Regras do módulo" cita objetos do banco atual
  (tabelas, funções, políticas) porque o molde da spec 003 exige rastrear cada regra até o
  catálogo. São o objeto descrito (o sistema atual), não a forma de implementar o sistema novo.
  As 106 chaves citadas foram conferidas contra o inventário de produção de 2026-09-29; a única
  fora dele, `funcao:confirm_email_on_approval()`, é citada como divergência e existe só nas
  migrations.
- **Cobertura do mapa**: todo objeto de tipo tabela, função, repositório, política e gatilho
  atribuído ao core no mapa de rastreabilidade é citado por pelo menos uma regra (SC-008).
- **Parâmetros adotados como premissa** (código de 6 dígitos por 10 minutos, limites de arquivo):
  ficam para confirmação no plano; não mudam o escopo.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
