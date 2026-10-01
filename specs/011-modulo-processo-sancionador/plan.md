# Implementation Plan: Módulo processo sancionador

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/011-modulo-processo-sancionador/spec.md`

## Summary

O app `processo_sancionador` leva o processo inteiro, do termo de notificação à deliberação da
diretoria executiva. Cada etapa tem um responsável e uma passagem registrada: câmara técnica,
câmara de julgamento e diretoria executiva. A entidade age pelo portal, só no que é dela.

Abordagem ([research.md](./research.md)):
- processo como raiz e etapas como máquina de estados, com um único serviço de passagem que confere
  completude e permissão (N2);
- numeração por tipo, diretoria e ano no servidor (N3);
- retrato das determinações na emissão do TN, para o processo não mudar com a fiscalização reaberta
  (N4);
- prazos e pontualidade só no servidor, no fuso de MS (N5);
- escritas da entidade em rotas próprias, campo a campo (N6);
- AM com versões: refazer nunca apaga (N7);
- AM e lista da remessa geradas pelo motor de documentos (N8);
- documentos ligados ao registro dono, com endereço assinado (N9);
- julgamento e deliberação com decisão por auto, desenhados para receber a resposta da Q1 sem mudar
  o resto (N11).

## Technical Context

**Language/Version**: Python 3.12; TypeScript com React 18

**Primary Dependencies**: as dos apps comuns: Django, DRF, Celery (documentos e avisos diários),
WeasyPrint (motor de documentos), django-storages; nenhuma nova

**Storage**: PostgreSQL 16 (banco único); repositório privado para os documentos do processo

**Testing**: pytest, Vitest, import-linter, testes de concorrência da numeração, relógio fixo no fuso
de MS, teste de dono dos dados, varredura de câmara no código

**Target Platform**: servidor próprio; telas de escritório e portal, com rede

**Project Type**: app comum `processo_sancionador` no projeto do repositório novo

**Performance Goals**: detalhe do processo em menos de 1 s com 50 determinações e 50 autos; AM
gerada em menos de 30 s; listas em menos de 1 s com 100 vezes o volume de produção

**Constraints**: nada de câmara no app; nenhuma escrita em modelo de outro app; resposta e defesa da
entidade nunca alteradas pela AGEMS; documentos emitidos nunca apagados

**Scale/Scope**: 5 termos em produção (todos possivelmente de teste); dezenas de processos por ano
por câmara; 3 instâncias e 7 perfis

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Mapa com 90 destinos e 30 descartes conferidos, 0 pendentes; identificadores mantidos; retrato do conteúdo notificado; nada emitido é apagado (N4, N7, N9, N16) |
| II. Operação offline | Passa | Processo administrativo e portal com rede (premissa da spec); a vistoria sem rede segue na fiscalização |
| III. Autorização verificável | Passa | Matriz por perfil, etapa e entidade, com os casos dos defeitos de hoje ([matriz-acesso.md](./contracts/matriz-acesso.md)) |
| IV. Produção intocada | Passa | Repositório novo; migração lê só o dump, com a lista de teste obrigatória |
| V. Manutenibilidade | Passa | Mainstream; máquina de estados como tabela no código, sem dependência nova |
| Apps comuns como motores genéricos (v2.6.0, v2.6.2) | Passa | Prazos, layouts e base legal por câmara; sigla da diretoria do core; teste de varredura (R-sancionador-001) |
| Todo dado tem um app dono | Passa | Lê a fiscalização por consultas; a entidade grava pelas rotas deste app; painéis e portal leem pelas consultas (N4, N6, N15) |
| Independência e ordem dos apps | Passa | Depende só de core e fiscalização; registra peças nos dois (N1) |
| IA (A-039) | Passa | Sem análise por IA (R-sancionador-021) |
| Clarificações | Passa com ressalva | Q1 e Q2 seguem em aberto por decisão do responsável; o desenho provisório (N11) não bloqueia as etapas da câmara técnica, e as tarefas da US5 esperam as respostas |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model, dos contratos e do mapa de migração.
Nenhuma violação nova.
- O mapa `anotacoes/migracao/processo_sancionador.toml` tem 120 itens (90 com destino, 30
  descartados), 0 pendentes. Com ele, todos os módulos da spec 003 têm mapa, e nenhum destino está
  sem verificação.
- Os contratos das specs 009 e 010 passaram a citar as consultas `contagem_termos` e
  `contagem_autos`.

## Project Structure

### Documentation (this feature)

```text
specs/011-modulo-processo-sancionador/
├── spec.md, plan.md, research.md (N1 a N16), data-model.md, quickstart.md
└── contracts/
    ├── api-sancionador.md     # rotas da equipe, dos colegiados e do portal, consultas, registros
    └── matriz-acesso.md

specs/003-base-dados-producao/anotacoes/migracao/processo_sancionador.toml   # mapa de migração
```

### Source Code (repositório novo)

```text
backend/apps/processo_sancionador/
├── models/            # processo, termo, determinacao_notificada, resposta, analise, auto,
│                      # remessa, defesa, parecer, colegiado, decisao, evento, documento, sequencia
├── etapas.py          # passagens e completude (N2)
├── numeracao.py       # N3
├── prazos.py          # N5
├── servicos/          # notificacao, analise, autos, remessa, defesa, parecer, decisao, documentos
├── portal/            # serializadores e rotas da entidade (N6)
├── layouts/           # am_padrao, remessa_padrao (N8)
├── avisos.py, tasks.py   # N13
├── acesso.py, consultas.py, api/
├── apps.py            # registros no core e na fiscalização
└── management/commands/migrar_processo_sancionador.py

backend/tests/processo_sancionador/   # matriz, etapas, numeração concorrente, prazos, imutabilidade, migração

frontend/src/processo_sancionador/
├── processos/, termo/, analise/, autos/, parecer/, julgamento/, acompanhamento/
└── registros.ts       # menu, início por papel, abas da entidade (R-core-025)
```

**Structure Decision**: o `processo_sancionador` é app comum em `backend/apps/` e `frontend/src/`,
depende de core e fiscalização e é lido pelos apps de câmara e pelo portal só pelas consultas de
[contracts/api-sancionador.md](./contracts/api-sancionador.md). As telas do portal são da spec dele e
chamam as rotas `portal/sancionador/` deste app.

## Complexity Tracking

| Peça | Por que é necessária | Alternativa mais simples descartada porque |
|---|---|---|
| Retrato das determinações na emissão (N4) | O TN é um ato com o conteúdo daquela data, e a fiscalização reaberta pode mudar as determinações | ler a determinação viva mostraria texto diferente do notificado; chave estrangeira travaria ou apagaria registros do processo na consolidação |
| Desenho provisório de julgamento e deliberação (N11) | O processo precisa terminar no sistema, e a Q1 ainda não tem resposta | esperar a Q1 deixaria sem modelo o fim do processo, de que dependem autos, encerramento e a consulta da cobrança |

## Premissas do plano

- Cancelar o processo é do coordenador da câmara; o fiscal cancela autos e documentos.
- O administrador mantém a composição dos colegiados e não registra decisões.
- Limites de arquivo: PDF ou imagem até 20 MB; 20 evidências por resposta e 20 anexos por defesa.
