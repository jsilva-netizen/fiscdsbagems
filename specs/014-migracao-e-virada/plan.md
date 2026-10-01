# Implementation Plan: Migração de dados e virada

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-migracao-e-virada/spec.md`

## Summary

O app `virada` orquestra a carga dos dados de produção, feita pelos comandos de migração de cada app,
e reúne a conferência num relatório único. Ele também registra as confirmações de fila vazia dos
aparelhos, os seis portões e a aprovação do responsável, e controla a abertura do sistema novo. O
sistema atual só é tocado por roteiros que o responsável executa.

Abordagem ([research.md](./research.md)):
- dump restaurado num banco separado, lido por papel só de leitura; cópia dos arquivos separada (M2);
- orquestrador com as 10 etapas e as pré-condições, sempre do zero (M3);
- contrato JSON de conferência igual para todos os apps, com biblioteca comum (M4);
- impressão digital dos valores dos dois lados, mais amostra lado a lado para revisão humana (M5);
- conferência do backup do aplicativo atual, sem mudança em produção (M8), e importação das exceções
  pela fila da fiscalização (M9);
- roteiros de congelar e descongelar testados contra restauração do dump (M10);
- chave de abertura ligada só com a aprovação (M11, M12).

## Technical Context

**Language/Version**: Python 3.12; TypeScript com React 18; SQL do PostgreSQL para os roteiros do
sistema atual

**Primary Dependencies**: as dos apps comuns: Django, DRF, Celery, WeasyPrint, django-storages;
`jsonschema`; `psycopg` para a conexão de leitura com o banco de origem

**Storage**: PostgreSQL 16 do sistema novo, mais um banco `origem` só leitura por ensaio; repositório
de arquivos do sistema novo, mais um `origem-arquivos` só leitura; evidências cifradas no repositório
privado

**Testing**: pytest, Vitest; dump sintético com todos os tipos de dado; backups sintéticos do
aplicativo atual; PostgreSQL de teste com as políticas do sistema atual para os roteiros

**Target Platform**: servidor do sistema novo (homologação nos ensaios, produção na virada)

**Project Type**: app `virada` e biblioteca `compartilhado/migracao` no projeto do repositório novo

**Performance Goals**: carga, cópia dos arquivos (cerca de 1 GB) e conferência em menos de 1 dia útil
no volume de produção, deixando a outra metade da janela para decisões e aprovação; volta em menos de
1 hora

**Constraints**: nenhuma conexão das ferramentas com o sistema atual; dados pessoais do dump só no
ambiente da virada, cifrados; relatório reproduzível; abertura só com aprovação

**Scale/Scope**: 456 colunas e repositórios mapeados; cerca de 25 mil registros (a maior parte
auditoria) e 1.554 arquivos; dezenas de aparelhos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Conferência registro a registro, valor a valor e arquivo a arquivo; pendências exigem decisão; nada é descartado em silêncio (M4 a M7) |
| II. Operação offline | Passa | Fila vazia comprovada por aparelho; exceções importadas pela fila da fiscalização (M8, M9) |
| III. Autorização verificável | Passa | Portão 4 executa todas as matrizes contra o sistema carregado (M12); a tela da virada é restrita |
| IV. Produção intocada | Passa | Ferramentas sem credencial do sistema atual; leitura só do dump; roteiros executados pelo responsável e testados fora de produção (M2, M10) |
| V. Manutenibilidade | Passa | Comandos Django, JSON com esquema, SQL revisado; nenhuma ferramenta externa de orquestração |
| Portões antes da virada | Passa | Os seis portões com evidência e aprovação; a chave de abertura depende deles (M12) |
| Todo dado tem um app dono | Passa | Cada app carrega e confere os seus dados; o orquestrador só chama e junta (M1, M4) |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model e dos contratos. Nenhuma violação nova.
Itens para as tarefas de outros apps:
- cada comando `migrar_<app> --conferir` grava o JSON do contrato M4;
- CATERS e processo sancionador oferecem `marcar_avisos_ate(data)` (M13);
- a CATERF separa a migração em `--fase base` e `--fase extensoes`;
- o core ganha a chave `sistema_aberto` (M11).

## Project Structure

### Documentation (this feature)

```text
specs/014-migracao-e-virada/
├── spec.md, plan.md, research.md (M1 a M14), data-model.md, quickstart.md
└── contracts/
    └── comandos-e-conferencia.md   # comandos, etapas, esquema da conferência, roteiros, tela
```

### Source Code (repositório novo)

```text
backend/compartilhado/migracao/     # mapas, impressão digital, checksum, amostra, esquema (M4, M5)
backend/apps/virada/
├── models/            # ensaio, etapa, pendencia, confirmacao, importacao, portao, aprovacao
├── etapas.py          # as 10 etapas e as pré-condições (M3)
├── orquestrador.py    # executar e descartar (M3, M11)
├── relatorio/         # junção e documentos (M6)
├── arquivos.py        # conferência final dos arquivos (M7)
├── backup_legado/     # leitura e conversão do backup do aplicativo atual (M8, M9)
├── portoes.py         # M12
├── tasks.py           # conferência pós-virada (M14)
├── api/
└── management/commands/virada.py

roteiros/              # congelar.sql, descongelar.sql, conferir-congelado.sql, dump-e-copia.md (M10)

backend/tests/virada/  # orquestrador, relatório, backups sintéticos, conversor, portões, abertura
tests/dados_sinteticos/  # dump sintético e backups do aplicativo atual

frontend/src/virada/   # telas restritas: aparelhos, ensaios, pendências, portões, aprovação
```

**Structure Decision**: o app `virada` vem depois de todos os outros e não é importado por nenhum. A
biblioteca `compartilhado/migracao` não tem modelos e é usada pelos comandos de migração de todos os
apps. Os roteiros do sistema atual ficam numa pasta própria, fora do código do sistema novo.

## Complexity Tracking

| Peça | Por que é necessária | Alternativa mais simples descartada porque |
|---|---|---|
| Banco `origem` separado e só leitura (M2) | A migração lê muitas tabelas com junções e transformações | ler o dump como arquivo exigiria interpretar o formato à mão; ler a produção fere o Princípio IV |
| Conversor do backup do aplicativo atual (M9) | Aparelho que não puder sincronizar antes do congelamento não pode perder trabalho (Princípio II) | adiar a virada até todo aparelho sincronizar deixa a data refém de um aparelho perdido |
