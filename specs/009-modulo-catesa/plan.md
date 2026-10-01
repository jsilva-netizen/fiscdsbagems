# Implementation Plan: Módulo CATESA — app da câmara de saneamento

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-modulo-catesa/spec.md`

## Summary

O app `catesa` é o app de câmara mais simples do sistema novo: não tem modelo de dados e não repete
nada dos apps comuns. Ele entrega a configuração inicial da CATESA (modelo "Checklist por tipo de
unidade", configuração de fiscalização com o "TERMO DE VISTORIA AGEMS/DSB" e a marca d'água da DSB,
configuração de planejamento) e registra o painel da CATESA no início.

Abordagem ([research.md](./research.md)):
- pacote de configuração em JSON, um arquivo por app comum, validado pelo app dono (S3);
- aplicação idempotente pelo serviço `aplicar_configuracao_inicial` de cada app comum, que cria só
  o que falta e nunca sobrescreve o que a câmara mantém na tela (S4);
- catálogos e itens vindos da migração dos checklists, não do pacote (S5);
- painel servido por uma rota só de leitura, sobre as consultas da fiscalização e do processo
  sancionador (S7).

## Technical Context

**Language/Version**: Python 3.12; TypeScript com React 18

**Primary Dependencies**: as dos apps comuns; nenhuma nova

**Storage**: nenhum modelo próprio; a configuração fica nos modelos dos apps comuns (PostgreSQL 16,
banco único)

**Testing**: pytest, Vitest, import-linter, teste de dono dos dados (as rotas do app não gravam)

**Target Platform**: servidor próprio; o painel é online

**Project Type**: app de câmara `catesa` no projeto do repositório novo

**Performance Goals**: painel em menos de 1 s com o volume de produção (26 fiscalizações) e com 100
vezes esse volume, por contagens agregadas no banco

**Constraints**: nenhum app comum importa o `catesa`; o `catesa` não importa outro app de câmara nem
grava em modelo de outro app; a aplicação da configuração nunca desfaz o que a câmara mudou

**Scale/Scope**: 1 modelo de checklist, 25 catálogos (pela migração), 2 configurações, 1 painel

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | O pacote reproduz o relatório, a marca d'água e o modelo de hoje; os itens chegam pela migração dos checklists, com os identificadores de produção (S5, S10) |
| II. Operação offline | Passa | O app não acrescenta nada ao campo; a vistoria sem rede é da fiscalização, com a configuração aplicada; o painel é consulta online, como as demais telas de gestão |
| III. Autorização verificável | Passa | Matriz testada caso a caso; contagens pelo alcance das consultas dos donos ([matriz-acesso.md](./contracts/matriz-acesso.md)) |
| IV. Produção intocada | Passa | Repositório novo; nenhuma migração própria |
| V. Manutenibilidade | Passa | Sem modelo, sem dependência nova; o pacote é dado revisável |
| Um app por câmara; apps comuns genéricos | Passa | A sigla CATESA e o conteúdo da DSB ficam só no app (S1, S8) |
| Cópia independente (v2.6.1) | Passa | Pacote próprio, sem ler o da CATERS; teste de independência (S6) |
| Todo dado tem um app dono | Passa | A configuração é gravada pelo serviço de cada app comum; o painel só lê (S4, S7) |
| Ordem dos módulos | Passa | A CATESA é a 8ª; lê consultas de apps anteriores, inclusive o processo sancionador (6º) |
| IA (A-039) | Passa | A análise por IA da resposta ao termo não é refeita (R-catesa-006) |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model e dos contratos. Nenhuma violação nova.
Ajustes em outras specs:
- spec 007: a consulta `contagem_por_situacao(usuario, camara)` e o serviço
  `aplicar_configuracao_inicial` no contrato de extensões;
- spec 006: o serviço `aplicar_configuracao_inicial`;
- spec 008: a configuração inicial da CATERF passa pelo mesmo serviço;
- spec 005: o mesmo serviço no motor de checklists (R-checklists-020, FR-019) e a ordem da migração
  dos checklists, depois da configuração das câmaras (seção "Migração", "Ordem");
- spec do processo sancionador: as consultas de contagem de termos e autos por situação.

## Project Structure

### Documentation (this feature)

```text
specs/009-modulo-catesa/
├── spec.md, plan.md, research.md (S1 a S10), data-model.md, quickstart.md
└── contracts/
    ├── api-catesa.md          # painel, comando, serviços e consultas usados, registros
    └── matriz-acesso.md
```

Sem mapa de migração (a spec não tem dados próprios a migrar).

### Source Code (repositório novo)

```text
backend/apps/catesa/
├── configuracao/      # checklists.json, fiscalizacao.json, planejamento.json (S3)
├── constantes.py      # sigla da câmara (S8)
├── painel.py          # contadores do painel (S7)
├── api/               # GET painel/catesa
├── apps.py            # AppConfig (sem registros no servidor além da rota)
└── management/commands/configurar_catesa.py   # S4

backend/tests/catesa/  # pacote, aplicação, independência, matriz, dono dos dados, planilha fictícia

frontend/src/catesa/
├── painel/            # painel do início
└── registros.ts       # registro no início do core (R-core-025)
```

**Structure Decision**: o `catesa` é irmão dos apps comuns em `backend/apps/` e `frontend/src/` e
depende deles, nunca o contrário. Tudo o que ele usa dos apps comuns está em
[contracts/api-catesa.md](./contracts/api-catesa.md).

## Complexity Tracking

Nenhuma violação a justificar.
