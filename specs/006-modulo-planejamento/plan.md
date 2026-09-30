# Implementation Plan: Módulo planejamento

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-modulo-planejamento/spec.md`

## Summary

O planejamento é o terceiro app do sistema novo. Cada câmara registra o plano anual de viagens de
fiscalização, com:
- destinos oferecidos pelos apps (município e entidade do core; concessão e rodovia da CATERF);
- atividades, com uma lista de tipos da câmara;
- viagens conjuntas entre câmaras da mesma diretoria;
- custos estimados de combustível e diárias, calculados e congelados na aprovação.

O fluxo é este:
- o diretor aprova o plano, os extras e as mudanças que pedem aprovação;
- as mudanças seguem uma lista fechada de tipos, classificados automaticamente, e o aumento de
  diárias sempre pede aprovação;
- depois da aprovação, o coordenador escala nominalmente a equipe, com liberação pelo coordenador de
  origem quando o servidor é de outra câmara.

Depois de aprovado, o plano é usado assim:
- o fiscal consulta sem rede as viagens em que está escalado;
- o prestador vê as atividades previstas para a entidade dele;
- RH, financeiro e frotas leem o plano aprovado;
- a fiscalização, depois, liga cada execução à atividade planejada;
- o sistema emite o cronograma no formato do Anexo I.

Abordagem ([research.md](./research.md)):
- **Versões**: dois níveis de versões imutáveis, a logística da viagem e a parte de cada câmara,
  com vigente e pendente convivendo.
- **Cálculo**: um só cálculo de custos no servidor, com `Decimal`.
- **Peças registradas**: um registro de tipos de destino que os apps posteriores alimentam.
- **Leitura por outros apps**: pelas `consultas` e por uma rota de integração com credencial de
  sistema.
- **Base do core**: tudo sobre os escopos, a auditoria e a sincronização do core.

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript com React 18 (frontend), como no core

**Primary Dependencies**: as do core (Django 5.2 LTS, DRF 3.16, SimpleJWT, Celery 5.4,
import-linter; Vite, Dexie 4), mais openpyxl e WeasyPrint para o cronograma ([research P9](./research.md))

**Storage**: PostgreSQL 16, banco único do sistema (constituição v2.6.2); o app só grava nas tabelas
dele

**Testing**: pytest, pytest-django, factory_boy; Vitest; import-linter; fixture com as 10 viagens do
Anexo I para os custos

**Target Platform**: servidor Linux próprio da AGEMS; navegador no computador (elaborar e aprovar) e
no celular (consulta sem rede)

**Project Type**: app `planejamento` no projeto web do repositório novo (API Django + SPA React
offline)

**Performance Goals**:
- registrar uma viagem com três destinos e duas atividades em menos de 5 minutos (SC-007);
- prévia de custos em menos de 1 segundo;
- cronograma de um trimestre gerado em poucos segundos.

**Constraints**:
- consulta sem rede das viagens do fiscal (Princípio II); nenhuma escrita sem rede;
- isolamento por câmara e diretoria no servidor (Princípio III);
- não depende de `fiscalizacao` nem de apps de câmara (constituição, "Independência entre apps");
- nada de câmara no código (v2.6.0 a v2.6.2).

**Scale/Scope**: hoje, dezenas de viagens por câmara por ano (o Anexo I tem 10 viagens em 8 meses) e
3 câmaras com fiscalização (CATESA, CATERS, CATERF). Sem dados a migrar: funcionalidade nova.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Nada a migrar. Versões imutáveis e auditoria de toda ação preservam o que foi aprovado e mudado (P3, R-planejamento-010) |
| II. Operação offline | Passa | O fiscal recebe no aparelho as viagens em que está escalado pelo protocolo do core (P10); elaborar e aprovar com rede está fora do escopo por decisão |
| III. Autorização verificável | Passa | Matriz de acesso com câmara, diretoria, escala, prestador, outra área e credencial, testada caso a caso ([matriz-acesso.md](./contracts/matriz-acesso.md), P15) |
| IV. Produção intocada | Passa | Código no repositório novo; nada lê nem escreve a produção atual |
| V. Manutenibilidade | Passa | Máquina de estados em funções de serviço, sem biblioteca a mais (P6); openpyxl e WeasyPrint são mainstream; a versão em dois níveis está justificada em Complexity Tracking |
| Stack obrigatória | Passa | A mesma do core |
| Organização em apps e independência | Passa | Depende só do core; os posteriores dependem dele; import-linter verifica (P1) |
| Apps comuns como motores genéricos | Passa | Tipos de destino registrados pelos apps (P2); tipos de atividade, marcação de mudanças e layout por configuração da câmara, com cópia (P13); teste que falha se o código citar uma câmara |
| Extensão para outras áreas | Passa | RH, financeiro e frotas leem por `consultas` e pela rota de integração; nunca escrevem (R-planejamento-020) |
| Fronteiras de domínio (planejamento ≠ execução) | Passa | O planejamento não conhece a fiscalização; ela aponta para `atividade_id` (P12) |
| Banco único; nenhum app com cópia de dado de outro | Passa com observação | Veículos e tabela de diárias ficam no planejamento até frotas e financeiro existirem; a posse será transferida, não copiada (P14) |
| IA fora | Passa | Nenhuma |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model, dos contratos e da matriz. Nenhuma
violação nova. Ficou uma observação para a spec do core ou da fiscalização: uma central de avisos
comum (P8) seria útil a vários apps e deve nascer no core, não no planejamento.

## Project Structure

### Documentation (this feature)

```text
specs/006-modulo-planejamento/
├── spec.md                    # Especificação (regras R-planejamento)
├── plan.md                    # Este arquivo
├── research.md                # Phase 0: decisões P1 a P16
├── data-model.md              # Phase 1: entidades do planejamento
├── quickstart.md              # Phase 1: roteiro de validação no repositório novo
├── contracts/
│   ├── api-planejamento.md    # Rotas, consultas e ponto de extensão
│   └── matriz-acesso.md       # Quem pode o quê; fonte dos testes de autorização
└── tasks.md                   # Phase 2 (/speckit-tasks; não criado aqui)
```

### Source Code (repositório novo)

```text
backend/
├── apps/
│   ├── core/                          # (spec 004)
│   └── planejamento/
│       ├── models/                    # configuracao, cadastros (veiculo, diaria), plano, viagem,
│       │                              # participacao, versoes, atividade, lancamento, mudanca, escala
│       ├── custos.py                  # cálculo puro com Decimal (P4)
│       ├── mudancas.py                # classificação dos tipos de mudança (P5)
│       ├── destinos.py                # registro de tipos de destino (P2)
│       ├── fluxo.py                   # enviar, aprovar, devolver, propor, retirar (P6)
│       ├── equipe.py                  # escala, conflito, liberação (P7)
│       ├── cronograma/                # colunas, layout, XLSX e PDF (P9)
│       ├── acesso.py                  # escopos do planejamento sobre o componente do core (P15)
│       ├── consultas.py               # leitura para outros apps (P12)
│       ├── servicos.py                # escrita (dono), sempre auditada
│       ├── api/                       # views e serializadores (inclui portal e integração)
│       ├── tasks.py                   # expiração de pedidos, avisos por e-mail
│       └── management/commands/       # carregar_tabela_diarias
└── tests/
    └── planejamento/                  # custos (Anexo I), mudanças, fluxo, equipe, matriz, extensão

frontend/
└── src/
    └── planejamento/                  # plano, viagem, mudanças, equipe, liberações,
                                       # configuração, cronograma, minhas viagens (offline)
```

**Structure Decision**: o app `planejamento` fica ao lado de `core` em `backend/apps/`, e o frontend
em `src/planejamento/`. As telas entram pelo registro do core (R-core-025): menu, painel do diretor
e Definições. As telas do portal do prestador são da spec do portal; o planejamento fornece a rota.

## Complexity Tracking

| Peça | Por que é necessária | Alternativa mais simples descartada porque |
|---|---|---|
| Versões em dois níveis (logística e participação) (P3) | Viagem conjunta com a parte de cada câmara mantida e aprovada separadamente, e versão aprovada vigente enquanto a mudança espera | uma versão única da viagem: uma câmara bloquearia a outra, e aprovar um plano mexeria na parte do outro |
| Registro de tipos de destino (P2) | Destinos de câmaras (rodovia, concessão) sem o app comum conhecer os apps de câmara | colunas fixas: chumbam câmara no app comum; `GenericForeignKey`: acopla aos modelos dos outros apps |
| WeasyPrint (P9) | PDF do cronograma no layout configurável da câmara | ReportLab: layout em código, mais difícil de manter que HTML e CSS |
