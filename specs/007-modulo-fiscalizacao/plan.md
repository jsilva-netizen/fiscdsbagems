# Implementation Plan: Módulo fiscalização

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/007-modulo-fiscalizacao/spec.md`

## Summary

A fiscalização é o app comum de execução de campo. Ela nasce de uma atividade aprovada do
planejamento, ou de uma urgência do coordenador com motivo. A equipe registra, também sem rede:
- os registros de campo: unidades no modo "lista por unidade", ou registros avulsos criados pelos
  apps de câmara;
- as respostas ao checklist, na versão da criação;
- as entradas manuais (na DSB, as constatações manuais);
- o ponto GPS com precisão, sem travar a captura;
- as fotos, com e sem marca d'água.

Os registros resultantes são tratados assim:
- os registros gerados (na DSB, constatações, NCs, determinações e recomendações) saem dos tipos e
  das saídas que a câmara monta no modelo (R-checklists-022), por uma consolidação repetível que
  mantém os identificadores e as edições, num modelo genérico (`RegistroGerado`);
- a numeração congela na finalização;
- o número do termo é atribuído uma vez só;
- a reabertura exige motivo;
- o relatório é gerado no servidor, num único PDF, no layout da câmara, e guardado em versões.

O app também oferece indicadores no alcance de cada um, exportação e importação pelas regras, e
consultas para o processo sancionador, o portal, o planejamento e os apps de câmara.

Abordagem ([research.md](./research.md)):
- **Consolidação**: função pura, a mesma no servidor e no aparelho, com casos de teste
  compartilhados (F4).
- **Pontos de extensão**, no servidor e no aparelho, para layout, marca d'água, enriquecimento do
  ponto e registro avulso (F7, [contracts/extensoes.md](./contracts/extensoes.md)).
- **Fotos** como registros com checksum (F2, F8).
- **Sequência anual do termo**, com trava (F6).
- **Relatório** por tarefa Celery com WeasyPrint (F10).
- **Fila de usuário desativado**, exportável e importável pelo administrador (F12).
- **Alcance** por câmara ou equipe (F14).

## Technical Context

**Language/Version**: Python 3.12 (backend); TypeScript com React 18 (frontend), como no core

**Primary Dependencies**: as do core e do planejamento (Django 5.2 LTS, DRF 3.16, SimpleJWT, Celery
5.4, django-storages, WeasyPrint, openpyxl, import-linter; Vite, Dexie 4), e um leitor de EXIF e um
compressor de imagem no aparelho (os mesmos recursos de canvas de hoje)

**Storage**: PostgreSQL 16, banco único; repositório privado de arquivos (fotos, relatórios,
exportações, importações)

**Testing**: pytest, pytest-django, factory_boy; Vitest; casos de consolidação compartilhados em
JSON; import-linter; app de câmara de teste para os pontos de extensão

**Target Platform**: servidor Linux próprio; celular e computador, com trabalho de campo sem rede

**Project Type**: app `fiscalizacao` no projeto web do repositório novo

**Performance Goals**:
- foto com marca d'água e coordenadas em menos de 5 segundos no aparelho (SC-007);
- envio da fila de uma vistoria típica (5 registros, 100 fotos) em poucos minutos com rede móvel;
- relatório de 40 fotos em menos de 1 minuto.

**Constraints**:
- sem perda de trabalho feito sem rede (Princípio II);
- alcance por câmara ou equipe no servidor (Princípio III);
- nada de câmara no código (v2.6.0 a v2.6.2);
- não depende do processo sancionador nem de apps de câmara;
- migração conferida registro a registro, inclusive fotos por checksum (Princípio I).

**Scale/Scope**: produção tem 26 fiscalizações, 402 registros, 3.454 respostas, 478 NCs, 1.445
fotos (461 MB) e 43 relatórios (402 MB). O desenho comporta centenas de fiscalizações por ano e
dezenas de milhares de fotos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Mapa de migração com 115 destinos conferidos contra o data-model, 0 pendentes; número do termo migra como está, e os de C, NC, D e R são recalculados pela regra dos relatórios emitidos; fotos e relatórios por checksum; relatórios nunca apagados (F10, F18) |
| II. Operação offline | Passa | Vistoria e finalização sem rede; consolidação no aparelho (F4); fila nunca apagada; fila de usuário desativado recuperável (F12); fiscalização excluída no servidor não descarta o trabalho (F11) |
| III. Autorização verificável | Passa | Matriz por câmara, equipe, diretoria e papel, testada caso a caso; tudo o que pende herda o escopo (F14, [matriz-acesso.md](./contracts/matriz-acesso.md)) |
| IV. Produção intocada | Passa | Código no repositório novo; migração lê só dump |
| V. Manutenibilidade | Passa com justificativa | Tudo mainstream; duas peças com custo (consolidação em duas linguagens, pontos de extensão) justificadas em Complexity Tracking |
| Stack obrigatória | Passa | Django, DRF, SimpleJWT, PostgreSQL, Celery + Redis, django-storages, SPA React com Dexie; relatório sai das funções externas e do cofre do banco para Celery |
| Organização em apps e independência | Passa | Depende de core, checklists e planejamento; import-linter verifica (F1) |
| Apps comuns como motores genéricos | Passa | Layout, marca d'água, enriquecimento do ponto, registro avulso e painéis plugados pelos apps de câmara (F7); configuração por câmara com cópia (F13); teste que falha se o código citar câmara |
| Localização comum na fiscalização (v2.6.2) | Passa | Ponto com precisão, origem e sem travar (R-fiscalizacao-010); KM da CATERF pelo enriquecedor (F7) |
| Extensão para outras áreas | Passa | Processo sancionador, portal e planejamento leem por consultas; nenhum escreve na fiscalização (R-fiscalizacao-022) |
| Fronteiras de domínio (planejamento ≠ execução) | Passa | A fiscalização aponta para `atividade_id`, e o planejamento não conhece a fiscalização (F15) |
| IA fora | Passa | Nenhuma |
| UUID gerado no cliente | Passa | Fiscalizações, registros, respostas, constatações e fotos com id do aparelho |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model, dos contratos, da matriz e do mapa de
migração. Nenhuma violação nova. Um ajuste na spec 003: `unidades_fiscalizadas.gps_accuracy_m`
passou da DTR para a fiscalização (decisão do responsável, 2026-09-30).

## Project Structure

### Documentation (this feature)

```text
specs/007-modulo-fiscalizacao/
├── spec.md                     # Especificação (regras R-fiscalizacao)
├── plan.md                     # Este arquivo
├── research.md                 # Phase 0: decisões F1 a F18
├── data-model.md               # Phase 1: entidades da fiscalização
├── quickstart.md               # Phase 1: roteiro de validação
├── contracts/
│   ├── api-fiscalizacao.md     # Rotas, sincronização e consultas
│   ├── extensoes.md            # Pontos de extensão para os apps de câmara
│   └── matriz-acesso.md        # Quem pode o quê
└── tasks.md                    # Phase 2 (/speckit-tasks; não criado aqui)

specs/003-base-dados-producao/anotacoes/migracao/fiscalizacao.toml   # mapa de migração (115 destinos)
```

### Source Code (repositório novo)

```text
backend/
├── apps/
│   └── fiscalizacao/
│       ├── models/                 # configuracao, sequencia, fiscalizacao, equipe, reabertura,
│       │                           # registro, resposta, constatacao, saidas, foto, relatorio, importacao
│       ├── consolidacao.py         # função pura (F4)
│       ├── numeracao.py            # F5
│       ├── termo.py                # sequência anual (F6)
│       ├── extensoes.py            # registros de layout, registro avulso, documento, marca d'água (F7)
│       ├── saidas.py               # registro das saídas no motor de checklists (F3)
│       ├── fluxo.py                # criar, ligar urgência, finalizar, reabrir, excluir (F9, F15)
│       ├── fotos.py                # recepção, checksum, limites, endereços (F8)
│       ├── relatorios/             # tarefa, contexto, layout genérico (F10)
│       ├── indicadores.py          # F16
│       ├── intercambio/            # exportar, importar arquivo, importar fila (F12, F17)
│       ├── sincronizacao.py        # modelos sincronizáveis e operações (F11)
│       ├── acesso.py               # escopo câmara ou equipe (F14)
│       ├── avisos.py               # tipos registrados na central do core
│       ├── consultas.py            # leitura para outros apps
│       ├── servicos.py             # escrita (dono), auditada; criar_registro_avulso
│       ├── api/                    # views e serializadores
│       ├── tasks.py                # relatório, exportação, importação
│       └── management/commands/    # migrar_fiscalizacao
└── tests/
    ├── fiscalizacao/               # casos_consolidacao.json, numeração, termo, matriz, fila, migração
    └── apps/camara_teste/          # app de câmara de teste para os pontos de extensão

frontend/
└── src/
    └── fiscalizacao/
        ├── consolidacao.ts         # mesma regra, mesmos casos (F4)
        ├── extensoes.ts            # registros do aparelho (F7)
        ├── fotos/                  # captura, EXIF, redução, marca d'água, fila de fotos (F8)
        ├── localizacao/            # ponto sem travar, mapa-base (R-fiscalizacao-010)
        └── telas/                  # lista, iniciar, execução, vistoria, relatórios, indicadores,
                                    # exportar/importar, trabalho pendente
```

**Structure Decision**: o app `fiscalizacao` fica ao lado de `core`, `checklists` e
`planejamento`. As telas entram pelo registro do core (R-core-025), dentro da área de cada câmara:
fiscalizações, vistoria, relatórios, painéis e a configuração da câmara. O app da CATERF, na spec dele, pluga layout, marca d'água,
enriquecedor do ponto e registro avulso pelos contratos de
[extensoes.md](./contracts/extensoes.md).

## Complexity Tracking

| Peça | Por que é necessária | Alternativa mais simples descartada porque |
|---|---|---|
| Consolidação em Python e TypeScript (F4) | Sem rede, o fiscal precisa ver as NCs e determinações da vistoria; o servidor prevalece ao sincronizar | só no servidor: sem rede, a vistoria ficaria sem as saídas; só no aparelho: a regra ficaria fora do controle do servidor. Os casos compartilhados impedem divergência |
| Pontos de extensão no servidor e no aparelho (F7) | Layout, marca d'água, KM e registro avulso das câmaras sem chumbar câmara no app comum | colunas e ramos por câmara, como hoje (tipo_modulo, gerador DSB e DTR no mesmo código) |
| Fila de aparelho exportável (F12) | Trabalho de usuário desativado não pode se perder (Princípio II) | reativar o usuário para enviar dá acesso a quem foi desativado |
