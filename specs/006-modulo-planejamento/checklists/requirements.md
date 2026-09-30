# Specification Quality Checklist: Módulo planejamento — plano anual de fiscalizações

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

- **Iteração 1 (2026-09-30)**: todos os itens passam. As dúvidas do assessment foram resolvidas pelo
  responsável antes da spec, por isso não restou marcador de esclarecimento: chefia, motorista,
  momento da liberação, aumento de diárias, planilha real, tabela de diárias por município e
  atualização como conjunto de mudanças.
- **Funcionalidade nova**: o sistema atual não tem planejamento, então o módulo `planejamento` não
  tem objetos no catálogo da spec 003. As 3 chaves citadas são de `fiscalizacoes`, para comparar com
  a fiscalização atual, e existem no inventário de produção. A seção "Telas do sistema atual" lista
  só ações novas, todas com regra.
- **Planilha real**: os custos do Anexo I foram recalculados, e 3 das 10 viagens têm erro de conta
  (as duas de agosto e o total de junho). O SC-001 exige os valores corretos.
- **Premissas a confirmar com o responsável** (não bloqueiam o plano):
  - quem configura o planejamento da câmara: o coordenador e o administrador, sem o fiscal,
    diferente do motor de checklists;
  - a configuração padrão dos tipos de mudança (R-planejamento-018);
  - o combustível da viagem conjunta fica com a câmara organizadora.
- **Premissa externa**: o que RH, financeiro e frotas precisam ler é provisório até ouvir as áreas
  (constituição, "Premissas externas").
- **Migração (2026-09-30)**: seção "Migração" acrescentada, dizendo que não há dados a migrar (funcionalidade nova).
- **Urgência (2026-09-30)**: a R-planejamento-009 aceita viagem extra com período já iniciado, para regularizar a fiscalização de urgência da spec 007 (R-fiscalizacao-002).
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
