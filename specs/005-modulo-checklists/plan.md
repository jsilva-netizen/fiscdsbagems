# Implementation Plan: Módulo checklists — motor genérico de verificação

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-modulo-checklists/spec.md`

## Summary

O app `checklists` é o motor de verificação de todas as câmaras, sem nada de nenhuma delas. A câmara
monta na tela modelos de catálogo (campos, respostas, saídas, papéis e planilha); o motor mantém os
catálogos com itens versionados, importa planilhas com prévia, entrega os itens certos a quem aplica
e os leva para o aparelho.

Abordagem ([research.md](./research.md)):
- o modelo é um documento JSON versionado, validado por esquema e por regras semânticas num só
  módulo (K2), e os valores do item seguem a definição da versão do modelo (K3);
- item estável com versões imutáveis e vigência por instante, protegidas por restrições do banco e
  um único serviço de escrita (K4);
- peças (saídas, contextos, modos) e alcance do aparelho registrados pelos apps, sem o motor
  importá-los (K6, K8);
- importação em duas etapas, com a prévia gravada e a confirmação conferindo que nada mudou (K7);
- telas geradas pela definição, e a escolha do item no aparelho com os mesmos casos de teste do
  servidor (K12);
- migração com os identificadores de produção, depois da configuração das câmaras (K14).

## Technical Context

**Language/Version**: Python 3.12; TypeScript com React 18

**Primary Dependencies**: as do core, mais `jsonschema` (validação da definição) e `openpyxl`
(planilhas, já na stack do motor de documentos)

**Storage**: PostgreSQL 16 (banco único), com `jsonb` para definição e valores; repositório privado
para as planilhas importadas

**Testing**: pytest, Vitest, casos compartilhados em JSON (aplicação dos papéis), import-linter,
varredura de câmara no código do motor, app de câmara de teste

**Target Platform**: servidor próprio; celular em campo, sem rede, com os catálogos no aparelho

**Project Type**: app comum `checklists` no projeto do repositório novo

**Performance Goals**: versões vigentes de um catálogo de 100 itens em menos de 100 ms; prévia de
importação de 1.000 linhas em menos de 5 s; sincronização inicial dos catálogos de uma câmara (25
catálogos, 600 versões) com menos de 1 MB compactada

**Constraints**: nenhuma câmara, campo ou formato de câmara no motor; versões nunca alteradas nem
apagadas; manutenção só com rede; aplicação sem rede

**Scale/Scope**: 3 modelos iniciais, 34 catálogos, 847 versões migradas (768 da DSB e 79 da DTR),
3.454 respostas apontando para elas; o desenho comporta dezenas de câmaras e milhares de itens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | Versões imutáveis (K4); migração com os mesmos identificadores, repetições mantidas e marcadas, conferência MIG-1 a MIG-6 (K14) |
| II. Operação offline | Passa | Catálogos, versões vigentes e versões em uso no aparelho; escolha do item sem rede (K8, K12) |
| III. Autorização verificável | Passa | Matriz testada caso a caso; escopo por câmara em toda rota e na sincronização (K9) |
| IV. Produção intocada | Passa | Repositório novo; migração lê só o dump |
| V. Manutenibilidade | Passa com justificativa | Django, DRF, `jsonb`, `jsonschema`, `openpyxl`; definição em JSON justificada em Complexity Tracking |
| Apps comuns como motores genéricos (v2.6.0, v2.6.2) | Passa | Nada de câmara no motor, com teste de varredura e app de teste (K13) |
| Cópia independente (v2.6.1) | Passa | Cópia sem vínculo, com a origem registrada (K10) |
| Todo dado tem um app dono | Passa | Outros apps leem por `consultas`; apps de câmara gravam só pela configuração inicial (K5, K11) |
| Independência e ordem dos apps | Passa | Depende só do core; peças e alcance por registro (K1, K6, K8) |

**Pós-desenho (Phase 1)**: reavaliado depois do data-model, dos contratos e da ligação do mapa de
migração. Nenhuma violação nova.
- O mapa `checklists.toml` passou a apontar para o data-model: os 35 destinos dele e os 4 da DTR que
  vão para o motor estão conferidos (de 37 destinos não verificados, resta 1, da CATERS, que espera
  o plano da spec 010).
- A spec 007 já lê o motor por `consultas` (F3); o contrato dela ganhou a seção "Registros no motor
  de checklists", com as saídas, o modo e o alcance do aparelho (K8).
- O código do modelo da CATERF usado pela migração é definido no pacote de configuração dela (spec
  008) e informado no arquivo de configuração da migração.

## Project Structure

### Documentation (this feature)

```text
specs/005-modulo-checklists/
├── spec.md, plan.md, research.md (K1 a K14), data-model.md, quickstart.md
└── contracts/
    ├── api-checklists.md      # rotas, sincronização, consultas, extensões, serviço, migração
    └── matriz-acesso.md

specs/003-base-dados-producao/anotacoes/migracao/checklists.toml   # mapa ligado ao data-model
```

### Source Code (repositório novo)

```text
backend/apps/checklists/
├── models/            # modelo, versao_modelo, catalogo, item, versao_item, importacao
├── definicao.py       # esquema e validação semântica da definição; validação dos valores (K2, K3)
├── esquema/           # JSON Schema da definição, versionado
├── pecas.py           # registro de saídas, contextos e modos (K6)
├── alcance.py         # registro do alcance do aparelho (K8)
├── aplicacao.py       # aplicabilidade, agrupamento, específico vence genérico (K5, K12)
├── importacao.py      # leitura, prévia e confirmação (K7)
├── copia.py           # cópia de modelo e de catálogos (K10)
├── servicos.py        # escrita, inclusive aplicar_configuracao_inicial (K4, K11)
├── consultas.py       # K5
├── sincronizacao.py, acesso.py, api/
├── migracao/          # leitura do dump, agrupamento das versões, conferência (K14)
└── management/commands/migrar_checklists.py

backend/tests/checklists/   # definições, versões, importação, matriz, varredura, migração
backend/tests/apps/camara_teste/   # app de teste com peças registradas (K13)
tests/compartilhados/aplicacao_checklists.json   # casos de aplicação, pytest e Vitest

frontend/src/checklists/
├── montagem/          # tela de montagem com prévia
├── catalogos/, itens/, importacao/, historico/
├── formulario/        # formulário gerado pela definição
├── aplicacao.ts       # escolha do item sem rede (K12)
└── registros.ts       # entradas nas Definições do core (R-core-025)
```

**Structure Decision**: o `checklists` é o segundo app em `backend/apps/` e `frontend/src/`, depende
só do core e não conhece nenhum app posterior: tudo o que vem deles chega pelos registros de
[contracts/api-checklists.md](./contracts/api-checklists.md).

## Complexity Tracking

| Peça | Por que é necessária | Alternativa mais simples descartada porque |
|---|---|---|
| Definição do modelo em JSON, com esquema e validação semântica (K2) | A câmara monta campos, respostas e saídas na tela, e cada mudança precisa ser congelada por versão | colunas fixas por câmara violam a constituição v2.6.0; tabelas normalizadas por versão copiam muitas linhas sem consulta que as use separadas |
| Aplicação dos papéis em Python e TypeScript (K12) | O aparelho escolhe o item sem rede; as consultas do servidor fazem o mesmo | só no aparelho: as consultas de outros apps ficariam sem a regra; só no servidor: não funciona sem rede. Os casos compartilhados impedem divergência |
| Pasta `migracao/` fora da varredura de câmara (K13) | Lê o esquema atual, com nomes de câmara, e é usada uma vez | pôr a leitura da DTR no app da CATERF faria outro app gravar nos modelos do motor |
