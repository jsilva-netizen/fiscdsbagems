# Implementation Plan: Módulo tramitação de documentos e dados

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/013-modulo-tramitacao/spec.md`

## Summary

O app `tramitacao` reúne, no expediente, a troca de documentos com as entidades, os pedidos de dados
e a movimentação interna. O e-MS continua oficial: o expediente se liga a ele por uma porta com
adaptador. Funcionalidade nova, sem dados a migrar.

Abordagem ([research.md](./research.md)):
- unidades próprias para câmaras, diretorias e outras áreas, até o core ter áreas (X2);
- expediente com mensagens imutáveis; corrigir é mandar outra mensagem (X3);
- ciência gravada pelo servidor na primeira abertura; comprovante em PDF com checksum (X4, X5);
- formatos de dados versionados, validação inteira antes de aceitar, abertura de períodos
  idempotente (X6 a X8);
- conectores das entidades e adaptador do e-MS como peças plugáveis, com fila e novas tentativas
  (X9, X10).

## Technical Context

**Language/Version**: Python 3.12; TypeScript com React 18

**Primary Dependencies**: as dos apps comuns: Django, DRF, Celery (abertura de períodos, avisos,
operações no protocolo), openpyxl, WeasyPrint, django-storages; `jsonschema` (como no motor de
checklists); cliente HTTP `httpx` para o adaptador do e-MS

**Storage**: PostgreSQL 16 (banco único); repositório privado para os documentos

**Testing**: pytest, Vitest, import-linter, adaptador falso de protocolo, conector de teste, testes de
concorrência e idempotência, relógio fixo no fuso de MS

**Target Platform**: servidor próprio; telas de escritório e portal, com rede

**Project Type**: app comum `tramitacao` no projeto do repositório novo

**Performance Goals**: caixa da unidade em menos de 1 s com 5 mil expedientes; validação de uma
planilha de 5 mil linhas em menos de 10 s; abertura dos períodos de 500 pedidos em menos de 1 minuto

**Constraints**: e-MS oficial e fora do caminho crítico; segredos fora do banco e dos registros;
mensagens e documentos imutáveis; nenhuma escrita em modelo de outro app

**Scale/Scope**: dezenas de unidades e entidades, centenas de expedientes e pedidos por ano

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Nada a migrar; mensagens, documentos e eventos imutáveis; reenvios de dados guardados (X3, X8, X14) |
| II. Operação offline | Passa | Trabalho de escritório e do portal, com rede (premissa da spec) |
| III. Autorização verificável | Passa | Matriz por unidade, histórico, diretoria e entidade ([matriz-acesso.md](./contracts/matriz-acesso.md)) |
| IV. Produção intocada | Passa | Repositório novo; sem migração; o e-MS é usado só pela API, com credencial do sistema |
| V. Manutenibilidade | Passa | Mainstream; `httpx` é o cliente HTTP padrão em Python; adaptadores isolam sistemas externos |
| Apps comuns como motores genéricos | Passa | Tipos e formatos configurados pelas unidades, com cópia (R-tramitacao-001) |
| Todo dado tem um app dono | Passa | Lê os anteriores por consultas; registra no portal e no core (X1, X13) |
| Independência e ordem dos apps | Passa | Último da ordem; nenhum app o importa |
| Clarificações | Passa com ressalva | Q1 e Q2 em aberto; a porta e o adaptador falso (X10) e o campo do número do ofício (X3) não bloqueiam o resto; as tarefas da US5 esperam a Q1 |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model e dos contratos. Nenhuma violação nova.
A tramitação registra no portal os cartões dela, como previsto na spec 012 (V3).

## Project Structure

### Documentation (this feature)

```text
specs/013-modulo-tramitacao/
├── spec.md, plan.md, research.md (X1 a X15), data-model.md, quickstart.md
└── contracts/
    ├── api-tramitacao.md      # rotas da equipe e do portal, extensões, consultas
    └── matriz-acesso.md
```

Sem mapa de migração (o módulo não existe no sistema atual).

### Source Code (repositório novo)

```text
backend/apps/tramitacao/
├── models/            # unidade, tipo, expediente, mensagem, documento, ciencia, movimentacao,
│                      # ligacao, evento, formato, pedido, periodo, envio, operacao
├── protocolo.py       # sequência do protocolo (X3)
├── comprovante/       # layout do comprovante (X5)
├── formatos.py        # esquema, validação, planilha modelo (X6)
├── periodos.py        # abertura idempotente (X7)
├── envios.py          # validação e gravação dos dados (X8)
├── conectores.py      # registro de conectores (X9)
├── integracao/        # porta IntegracaoProtocolo, adaptadores/ems.py, adaptadores/falso.py (X10)
├── ligacoes.py        # resolvedores dos registros ligados (X13)
├── servicos.py, acesso.py, consultas.py, avisos.py, tasks.py
├── api/, portal/      # rotas da equipe e da entidade
└── apps.py            # registros no portal e no core

backend/tests/tramitacao/   # matriz, idempotência, validação, protocolo externo, imutabilidade

frontend/src/tramitacao/
├── caixa/, expediente/, pedidos/, formatos/, configuracao/
├── portal/            # páginas e cartões registrados no portal
└── registros.ts       # menu e início (R-core-025) e registro no portal
```

**Structure Decision**: a `tramitacao` é o último app em `backend/apps/` e `frontend/src/`; lê os
apps anteriores e se registra no portal e no core. Sistemas externos (e-MS, sistemas das entidades)
ficam atrás de adaptadores e conectores.

## Complexity Tracking

| Peça | Por que é necessária | Alternativa mais simples descartada porque |
|---|---|---|
| Porta e adaptador do protocolo, com fila e novas tentativas (X10) | O e-MS é externo e pode estar fora do ar; a API ainda não foi levantada (Q1) | chamar a API na requisição pararia o trabalho; escrever direto contra a API agora seria adivinhar |
| Unidades próprias da tramitação (X2) | Há destinos internos que o core ainda não tem (presidência, jurídico) | criar áreas no core agora mudaria o core por um uso só |
