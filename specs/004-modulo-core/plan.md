# Implementation Plan: Módulo core

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-modulo-core/spec.md`

## Summary

O core é o primeiro app do sistema novo da AGEMS e a base de todos os outros: usuários criados só
pelo administrador, entrada com verificação por código no e-mail e aparelho confirmado, papéis e
áreas que outros apps podem ampliar, isolamento por câmara técnica aplicado no servidor em todo
caminho, estrutura organizacional (3 diretorias, 10 câmaras), municípios, entidades reguladas com
documentos e logotipo, contratos, auditoria imutável, o protocolo de sincronização offline comum a
todos os apps e credenciais de sistema para integrações.

Abordagem ([research.md](./research.md)): projeto Django num **repositório novo**, um app por
módulo; cada app expõe só `consultas` (leitura) e `servicos` (escrita do dono), com a direção das
dependências verificada por import-linter; escopo de acesso declarado por rota e testado por uma
matriz papel × câmara × operação; verificação em duas etapas própria sobre o SimpleJWT; arquivos
em repositório S3 compatível com endereços assinados; auditoria própria, imutável no banco.

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript com React 18 (frontend)

**Primary Dependencies**: Django 5.2 LTS, Django REST Framework 3.16, djangorestframework-simplejwt,
Celery 5.4, django-storages (S3 compatível), import-linter; frontend: Vite, Dexie 4

**Storage**: PostgreSQL 16, banco único compartilhado por todos os apps (constituição v2.4.1);
arquivos em repositório S3 compatível (MinIO), um privado e um público

**Testing**: pytest, pytest-django, factory_boy (backend); Vitest (frontend); import-linter
(dependências entre apps)

**Target Platform**: servidor Linux próprio da AGEMS (self-hosted); navegadores modernos no
computador e no celular, com uso offline

**Project Type**: aplicação web (API Django + SPA React offline), num repositório novo

**Performance Goals**: primeiro acesso completo (senha e código) em até 3 minutos (SC-004); envio
do código em até 1 minuto; listas do core abaixo de 1 segundo

**Constraints**: funcionar sem rede depois do primeiro acesso (Princípio II); nenhuma rota sem
login além das de entrada (R-core-010); isolamento por câmara no servidor (R-core-011); nenhuma
escrita no banco ou no armazenamento de produção do sistema atual (Princípio IV)

**Scale/Scope**: produção tem 7 usuários, 9 entidades, 2 contratos, 79 municípios e cerca de 20 mil
registros de auditoria; o desenho comporta dezenas de usuários internos, centenas de usuários de
entidades e novas áreas da agência

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.5.0) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Migração dos dados do core com os mesmos UUIDs e conferência registro a registro, incluindo os 19.966 registros de auditoria (R13, SC-007); desativar em vez de excluir preserva a autoria (R-core-007) |
| II. Operação offline | Passa | Aparelho confirmado dispensa código e rede; fila local nunca é apagada quando a sessão cai; protocolo de sincronização com UUID do aparelho e operações idempotentes (R6, R11) |
| III. Autorização verificável | Passa | Escopo declarado por rota; matriz papel × câmara × operação testada caso a caso; varredura que reprova rota sem entrada na matriz (R7, R8, [matriz-acesso.md](./contracts/matriz-acesso.md)) |
| IV. Produção intocada | Passa | Código num repositório novo; a migração lê só um dump, nunca a produção (R1, R13) |
| V. Manutenibilidade | Passa com justificativa | Tudo mainstream do ecossistema Django; duas peças próprias (verificação em duas etapas e auditoria) justificadas em Complexity Tracking |
| Stack obrigatória | Passa | Django + DRF + SimpleJWT, PostgreSQL self-hosted, Celery + Redis, django-storages, SPA React/Vite com Dexie |
| Organização em apps e independência | Passa | App `core` primeiro; `consultas`/`servicos` como únicos pontos de entrada; import-linter verifica a direção (R3) |
| Extensão para outras áreas | Passa | Papéis por tabela com regras de vínculo (R4); leitura entre apps só por `consultas`; credenciais de sistema para integrações (R12) |
| Banco único | Passa | Um PostgreSQL para todos os apps; armazenamento do aparelho é cópia de trabalho |
| IA fora do sistema novo | Passa | Nenhuma funcionalidade de IA |
| UUID gerado no cliente | Passa | Entidades e contratos aceitam o id do aparelho (data-model) |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model e dos contratos; nenhuma violação nova.
A matriz de acesso segue a spec (auditoria só para admin, coordenador e fiscal; diretor só leitura;
prestador sem contratos).

## Project Structure

### Documentation (this feature)

```text
specs/004-modulo-core/
├── spec.md              # Especificação (regras R-core)
├── plan.md              # Este arquivo
├── research.md          # Phase 0: decisões R1 a R14
├── data-model.md        # Phase 1: entidades do core
├── quickstart.md        # Phase 1: roteiro de validação no repositório novo
├── contracts/
│   ├── api-core.md      # Rotas da API do core
│   └── matriz-acesso.md # Quem pode o quê; fonte dos testes de autorização
└── tasks.md             # Phase 2 (/speckit-tasks; não criado aqui)
```

### Source Code (repositório novo)

```text
backend/
├── config/                  # settings, urls, celery
├── apps/
│   └── core/
│       ├── models/          # usuario, papel, estrutura, entidade, contrato, auditoria, credencial
│       ├── acesso/          # escopos (câmara, diretoria, entidade), permissões, matriz declarada
│       ├── autenticacao/    # entrar, verificar código, aparelho confirmado, primeiro acesso
│       ├── sincronizacao/   # protocolo comum de baixar e enviar (usado por todos os apps)
│       ├── arquivos/        # repositórios privado e público, endereços assinados, limites
│       ├── auditoria/       # registro imutável e consulta com escopo
│       ├── consultas.py     # leitura para outros apps
│       ├── servicos.py      # escrita (dono)
│       ├── api/             # views e serializadores DRF
│       ├── tasks.py         # envio de e-mail (Celery)
│       └── management/commands/  # carregar_referencias, criar_admin, migrar_core
├── tests/
│   └── core/                # matriz de acesso, isolamento, autenticação, sincronização, migração
└── .importlinter            # contratos de dependência entre apps

frontend/
├── src/
│   ├── core/                # entrada e código, usuários, entidades, contratos, municípios
│   ├── offline/             # Dexie e fila de envio (protocolo do core)
│   └── shared/
└── tests/

compose.yaml                 # PostgreSQL, Redis, MinIO, Mailpit
```

**Structure Decision**: aplicação web num repositório novo, com `backend/` (um app Django por
módulo em `backend/apps/`) e `frontend/` (SPA). Os apps seguintes (`checklists`, `planejamento`,
`fiscalizacao`...) entram como irmãos de `core` em `backend/apps/` e de `src/core` no frontend,
cada um com os próprios `consultas`, `servicos`, testes e contrato no import-linter. Este
repositório (`fiscdsbagems`) continua com o sistema atual e o levantamento; as specs 004 em diante
e a constituição passam para o repositório novo quando ele for criado.

## Complexity Tracking

| Peça própria | Por que é necessária | Alternativa mais simples descartada porque |
|---|---|---|
| Verificação em duas etapas própria (R5) | Código por e-mail com aparelho confirmado, integrado ao JWT | django-otp é orientado a sessão, não tem aparelho confirmado e exigiria adaptação maior que o fluxo próprio |
| Auditoria própria (R10) | Dados completos antes e depois, autor congelado, escopo por câmara, imutabilidade e importação do histórico atual | django-auditlog guarda só a diferença; django-simple-history cria uma tabela por modelo e complica a consulta transversal e a importação |
| import-linter (R3) | Verificação automática da direção das dependências entre apps, exigida pela constituição v2.5.0 | revisão de código não é verificação automática |
