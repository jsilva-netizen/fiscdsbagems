# Implementation Plan: Módulo CATERS — app da câmara de resíduos sólidos e limpeza urbana

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/010-modulo-caters/spec.md`

## Summary

O app `caters` entrega a configuração inicial da CATERS nos apps comuns, como a CATESA e com cópia
própria, e é dono do processo de acompanhamento junto ao município titular: processo ligado à
fiscalização, recomendações acompanhadas, resposta do município, dilações, documentos, linha do
tempo, painel e avisos.

Abordagem ([research.md](./research.md)):
- ligação protegida com a fiscalização e origem das recomendações sem chave estrangeira, para não
  travar a consolidação da fiscalização reaberta (T3);
- importação idempotente pelas consultas da fiscalização, que marca a origem removida sem apagar (T4);
- prazos e situação da recomendação calculados no servidor, no fuso de MS (T5);
- dilação, situação e linha do tempo numa só transação (T6); linha do tempo imutável (T7);
- documentos no repositório privado, com endereço assinado (T8);
- avisos pela central do core, um por prazo (T9).

## Technical Context

**Language/Version**: Python 3.12; TypeScript com React 18

**Primary Dependencies**: as dos apps comuns (Django, DRF, Celery para a tarefa diária de avisos,
django-storages); nenhuma nova

**Storage**: PostgreSQL 16 (banco único); repositório privado para os documentos dos processos

**Testing**: pytest, Vitest, import-linter, teste de dono dos dados, testes de data com relógio fixo
no fuso de MS

**Target Platform**: servidor próprio; trabalho de escritório, com rede

**Project Type**: app de câmara `caters` no projeto do repositório novo

**Performance Goals**: lista de processos e de recomendações em menos de 1 s com 100 vezes o volume
de produção; tarefa diária de avisos em menos de 1 minuto

**Constraints**: nenhum app comum importa o `caters`; nenhuma escrita em modelo de outro app; linha do
tempo e dilação imutáveis; documentos só por endereço assinado

**Scale/Scope**: 2 processos, 27 recomendações e 4 arquivos em produção; o desenho comporta centenas
de processos por ano

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Mapa com 75 destinos e 6 descartes conferidos, 0 pendentes; identificadores mantidos; situação gravada guardada em `situacao_legado`; arquivos com checksum (T12) |
| II. Operação offline | Passa | O acompanhamento é trabalho de escritório (premissa da spec); a vistoria sem rede segue na fiscalização, com a configuração aplicada |
| III. Autorização verificável | Passa | Matriz testada caso a caso, com o caso da dilação por outra câmara ([matriz-acesso.md](./contracts/matriz-acesso.md)) |
| IV. Produção intocada | Passa | Repositório novo; migração lê só o dump |
| V. Manutenibilidade | Passa | Mainstream; nenhuma dependência nova |
| Um app por câmara; apps comuns genéricos | Passa | O processo é do app da CATERS; os comuns não o importam (T1) |
| Cópia independente (v2.6.1) | Passa | Pacote próprio, sem ler o da CATESA (T2) |
| Todo dado tem um app dono | Passa | Leitura da fiscalização por consultas; escrita só nos modelos próprios; configuração pelos serviços dos comuns (T2, T4) |
| Ordem dos módulos | Passa | A CATERS é a 7ª; lê o processo sancionador (6º) só se instalado |
| IA (A-039) | Passa | Sem os botões de IA (R-caters-014) |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model, dos contratos e do mapa de migração.
Nenhuma violação nova.
- O mapa `anotacoes/migracao/caters.toml` tem 81 itens (75 com destino e 6 descartados), 0
  pendentes. O destino `caters.DocumentoProcesso.arquivo`, do mapa do core, está conferido: os mapas
  não têm mais nenhum destino não verificado.
- O processo sancionador continua sendo o único módulo sem mapa.

## Project Structure

### Documentation (this feature)

```text
specs/010-modulo-caters/
├── spec.md, plan.md, research.md (T1 a T12), data-model.md, quickstart.md
└── contracts/
    ├── api-caters.md          # rotas, painel, comandos, registros, consultas usadas
    └── matriz-acesso.md

specs/003-base-dados-producao/anotacoes/migracao/caters.toml   # mapa de migração
```

### Source Code (repositório novo)

```text
backend/apps/caters/
├── configuracao/      # checklists.json, fiscalizacao.json, planejamento.json (T2)
├── constantes.py      # sigla da câmara
├── models/            # processo, recomendacao, resposta, dilacao, evento, documento, controle_aviso
├── prazos.py          # prazo efetivo, dias restantes, situação calculada, fuso de MS (T5)
├── importacao.py      # importação da fiscalização (T4)
├── servicos.py        # escrita, dilação, eventos, documentos (T6, T7, T8)
├── avisos.py, tasks.py   # tipos de aviso e tarefa diária (T9)
├── painel.py          # T10
├── acesso.py, consultas.py, api/
├── apps.py            # registros nos apps comuns
└── management/commands/   # configurar_caters, migrar_caters

backend/tests/caters/  # matriz, importação, prazos, dilação, imutabilidade, avisos, migração

frontend/src/caters/
├── processos/, recomendacoes/, painel/
└── registros.ts       # menu, início e painel (R-core-025)
```

**Structure Decision**: o `caters` é irmão dos apps comuns em `backend/apps/` e `frontend/src/` e
depende deles, nunca o contrário. O que ele usa e registra nos apps comuns está em
[contracts/api-caters.md](./contracts/api-caters.md).

## Complexity Tracking

Nenhuma violação a justificar.
