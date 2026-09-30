# Implementation Plan: Módulo DTR — app da CATERF

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/008-modulo-dtr-caterf/spec.md`

## Summary

O app `caterf` é o primeiro app de câmara do sistema novo e prova o desenho em peças: ele não
repete nada dos apps comuns e pluga, pelos pontos de extensão, o que é da fiscalização de rodovias —
extensão do contrato com traçado KML versionado e pontos de KM; destinos "concessão" e "rodovia"
no planejamento; modelo "Ocorrências do PER" e o contexto da rodovia no motor de checklists;
extensão da fiscalização, registro avulso de ocorrência, KM calculado no aparelho sem rede, campos
da marca d'água, laudo e painéis na fiscalização.

Abordagem ([research.md](./research.md)): leitura do KML no servidor com `defusedxml` e pacote
compactado para o aparelho (C3, C4); cálculo do KM no aparelho por grade espacial, com os mesmos
casos de teste em Python e TypeScript (C5, C8); extensões ligadas por chave protegida aos modelos
donos, sem escrita neles (C2); recálculo em duas etapas a partir das fotos originais (C8).

## Technical Context

**Language/Version**: Python 3.12; TypeScript com React 18

**Primary Dependencies**: as dos apps comuns, mais `defusedxml` (leitura segura do KML) e
`@turf/nearest-point-on-line` (projeção no traçado, já usada hoje)

**Storage**: PostgreSQL 16 (banco único); repositório privado (KML e pacotes do traçado)

**Testing**: pytest, Vitest, casos de KM compartilhados em JSON, import-linter, teste de dono dos
dados (o app não grava em modelos de outros apps)

**Target Platform**: servidor próprio; celular em campo, sem rede, com o traçado no aparelho

**Project Type**: app de câmara `caterf` no projeto do repositório novo

**Performance Goals**: KM calculado a cada leitura do GPS em menos de 50 ms com 15 mil pontos (grade
espacial); ocorrência completa em menos de 1 minuto (SC-001); pacote do traçado de 15 mil pontos
com menos de 1 MB compactado

**Constraints**: nenhum app comum importa o `caterf`; nenhuma escrita em modelo de outro app;
cálculo do KM sem rede; KML tratado como XML não confiável

**Scale/Scope**: 2 contratos, ~15 mil pontos de KM, 2 fiscalizações, 78 ocorrências e 79 tipos em
produção; o desenho comporta dezenas de contratos e rodovias

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Mapa com 20 destinos conferidos, 0 pendentes; KML migrado relido e conferido ponto a ponto; textos da época das ocorrências guardados; traçados versionados (C3, C11) |
| II. Operação offline | Passa | Pacote do traçado no aparelho; KM, assistente, marca d'água e mapa sem rede (C4, C5, C6) |
| III. Autorização verificável | Passa | Matriz por câmara, equipe e diretoria, testada caso a caso; traçados só por coordenador e admin ([matriz-acesso.md](./contracts/matriz-acesso.md)) |
| IV. Produção intocada | Passa | Repositório novo; migração lê só dump |
| V. Manutenibilidade | Passa com justificativa | Mainstream; cálculo do KM em duas linguagens justificado em Complexity Tracking |
| Um app por câmara; apps comuns genéricos | Passa | O `caterf` é da CATERF e só pluga peças; os comuns não o importam (C1) |
| Localização comum; KM pelo KML na CATERF (v2.6.2) | Passa | O ponto é da fiscalização; o KM é o enriquecedor da CATERF (C5) |
| Todo dado tem um app dono | Passa | Extensões próprias ligadas por chave protegida; escrita nos comuns só pelos serviços deles (C2) |
| Stack obrigatória | Passa | A mesma; `defusedxml` é biblioteca padrão de segurança em Python |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model, dos contratos e do mapa de migração.
Nenhuma violação nova. Ajuste no ferramental da spec 003: o mapa de migração aceita `app` diferente
do id do módulo (`dtr` → `caterf`), com teste.

## Project Structure

### Documentation (this feature)

```text
specs/008-modulo-dtr-caterf/
├── spec.md, plan.md, research.md (C1 a C11), data-model.md, quickstart.md
└── contracts/
    ├── api-caterf.md          # rotas, sincronização e registros nos apps comuns
    └── matriz-acesso.md

specs/003-base-dados-producao/anotacoes/migracao/dtr.toml   # mapa de migração (20 destinos)
```

### Source Code (repositório novo)

```text
backend/apps/caterf/
├── models/            # configuracao, contrato_rodoviario, tracado, ponto_km, fiscalizacao, ocorrencia, recalculo
├── kml.py             # leitura segura, pontos e segmentos (C3)
├── pacote.py          # pacote compactado do traçado (C4)
├── km.py              # cálculo do KM no servidor, mesmos casos do aparelho (C5, C8)
├── registros.py       # registros nos apps comuns (AppConfig.ready)
├── recalculo.py       # prévia e aplicação (C8)
├── laudo/             # template e contexto do laudo (C9)
├── indicadores.py     # painéis (C10)
├── sincronizacao.py, acesso.py, servicos.py, consultas.py, api/
└── management/commands/migrar_caterf.py

backend/tests/caterf/  # casos_km.json, kml de teste, matriz, dono dos dados, migração

frontend/src/caterf/
├── km/                # grade espacial e cálculo (C5)
├── ocorrencia/        # assistente do registro avulso (C6)
├── mapa/              # camada do traçado
├── tracados/          # tela de traçados (Definições)
└── registros.ts       # registros no frontend da fiscalização
```

**Structure Decision**: o `caterf` é irmão dos apps comuns em `backend/apps/` e `frontend/src/`,
mas depende deles e nunca o contrário. Cada peça que ele pluga está listada em
[contracts/api-caterf.md](./contracts/api-caterf.md), "Registros nos apps comuns".

## Complexity Tracking

| Peça | Por que é necessária | Alternativa mais simples descartada porque |
|---|---|---|
| Cálculo do KM em TypeScript e Python (C5, C8) | O KM é calculado sem rede no aparelho; o recálculo roda no servidor sobre as fotos originais | só no aparelho: o recálculo exigiria baixar todas as fotos; só no servidor: não funciona sem rede. Os casos compartilhados impedem divergência |
