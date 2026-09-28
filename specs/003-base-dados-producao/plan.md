# Implementation Plan: Base de dados do sistema atual — catálogo, divergências, rastreabilidade e ordem dos módulos

**Branch**: `migracao-sisreg` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-base-dados-producao/spec.md`

## Summary

Produzir a fundação do levantamento do sistema novo: o catálogo completo do banco de produção,
as divergências entre produção e migrations, o mapa objeto → módulo, a ordem de especificação dos
módulos, os achados para decisão e os formatos das specs seguintes.

A abordagem ([research.md](./research.md)) separa duas camadas:
- **Estrutura, gerada:** um conjunto pequeno de ferramentas em Python lê os inventários de
  produção (CSV) e do banco das migrations (TSV) e gera o catálogo em Markdown, com dependências
  e divergências calculadas.
- **Explicação, escrita à mão:** finalidade e significado com fonte, módulo dono, classificação
  de divergências, achados e decisões. Fica em arquivos de anotação TOML, que o gerador só lê.

O gerador também mede a completude: objetos sem anotação, sem módulo, divergências não
classificadas, violações de ordem e achados pendentes. Nada toca o banco de produção.

## Technical Context

**Language/Version**: Python 3.11+ (máquina de trabalho: 3.14.3)

**Primary Dependencies**: nenhuma além da biblioteca padrão (`csv`, `json`, `tomllib`, `re`,
`difflib`, `subprocess`, `unittest`), por decisão D2. Para as divergências: Docker com o Supabase
local do projeto (já em uso pela suíte e2e).

**Storage**: arquivos: inventários (CSV/TSV, gerados por SQL), anotações (TOML, manuais) e
documentos gerados (Markdown). Nenhum banco novo.

**Testing**: `unittest` com inventários de exemplo pequenos (fixtures) + verificação de
regeneração estável (`gerar --verificar`) + varredura de dados sensíveis.

**Target Platform**: máquina de desenvolvimento (Windows e Linux). Saída lida no GitHub e no editor.

**Project Type**: ferramentas de linha de comando + documentação gerada, dentro da pasta da spec.

**Performance Goals**: gerar o catálogo completo em menos de 30 s (inventário de ~1,2 MB).

**Constraints**:
- somente leitura em produção (FR-018, Princípio IV);
- zero dado pessoal ou valor de segredo nos artefatos (FR-021);
- regeneração sem perda de anotação (FR-022);
- saída determinística, a mesma entrada gerando bytes idênticos (SC-007).

**Scale/Scope**:
- objetos: 35 tabelas, 1 view, 446 colunas, 113 restrições, 80 índices, 38 funções, 30
  gatilhos, 173 políticas, 5 tipos, 8 buckets, 17 papéis, 21 privilégios padrão, 2 segredos,
  mais os privilégios por papel;
- 9 módulos candidatos;
- o volume de anotação manual é o grosso do trabalho: ~600 objetos com texto.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.* Referência:
constituição v2.1.0.

| Princípio / regra | Avaliação | Status |
|---|---|---|
| **I. Preservação Integral** | O gerador mede completude binária: todo objeto do inventário tem entrada, e todo objeto tem dono ou classificação (SC-001, SC-002). Tabelas vazias não autorizam descarte (spec, edge case). | ✅ PASS |
| **II. Operação Offline** | Não há mudança de comportamento. O catálogo cobre os objetos que sustentam o offline (ex.: `propagate_modification_to_parent`, colunas `updated_at` usadas pelo sync incremental), que vão para o módulo fiscalização. | ✅ PASS |
| **III. Autorização Verificável** | As 173 políticas e as funções de permissão entram no catálogo com condição em linguagem simples e dependências (FR-004, FR-007). A verificação automatizada das regras é exigência do sistema novo; aqui se entrega a lista que ela vai verificar. | ✅ PASS |
| **IV. Produção Intocada** | Nenhuma ferramenta conecta em produção. O inventário de produção é feito pelo SQL Editor com scripts que só leem. A única escrita em banco é a reconstrução opcional do Supabase **local**. Achados não são corrigidos em produção por este trabalho (FR-018). | ✅ PASS |
| **V. Manutenibilidade** | Só biblioteca padrão do Python; nenhuma dependência nova. A camada gerada existe porque há repetição real (~600 objetos). | ✅ PASS |
| **Levantamento em specs** | Esta feature é o passo 1 (inventário como fonte da verdade) e o passo 2 (mapa de rastreabilidade) da constituição, e fixa os formatos dos passos 3 e 4. | ✅ PASS |
| **Organização em apps** | A lista de módulos segue os apps da v2.1.0. A omissão do app de fiscalização na v2.0.0 foi corrigida antes deste plano (commit `fe1dc72`). | ✅ PASS |

**Re-check pós-design**: mantido. O design só lê inventários e escreve dentro de
`specs/003-base-dados-producao/`, e a varredura de dados sensíveis cobre a pasta inteira.

## Project Structure

### Documentation (this feature)

```text
specs/003-base-dados-producao/
├── spec.md
├── plan.md                    # este arquivo
├── research.md                # decisões D1–D10
├── data-model.md              # entidades do catálogo e chaves de objeto
├── quickstart.md              # roteiro de validação
├── contracts/
│   ├── anotacoes.md           # formato dos arquivos TOML de anotação
│   ├── ferramentas-cli.md     # comandos das ferramentas
│   └── artefatos-gerados.md   # estrutura dos documentos gerados
├── checklists/requirements.md
└── tasks.md                   # /speckit-tasks
```

### Source Code (repository root)

```text
specs/003-base-dados-producao/
├── ferramentas/                   # código (Python, só biblioteca padrão)
│   ├── __init__.py
│   ├── raiz.py                    # localiza a raiz do repositório
│   ├── inventario.py              # lê e valida CSV/TSV de inventário → objetos com chave
│   ├── dependencias.py            # extrai dependências (D4) com natureza e origem
│   ├── divergencias.py            # compara inventários produção × migrations (D5)
│   ├── anotacoes.py               # lê e valida TOML; detecta órfãs e campos ausentes
│   ├── modulos.py                 # atribuição, ordem e violações
│   ├── gerar.py                   # CLI: gera catalogo/, mapa, ordem, divergências, achados
│   ├── inventario_migrations.py   # CLI: roda os SQL no Supabase local → inventario/*.tsv
│   ├── varredura.py               # CLI: dados sensíveis (D8)
│   └── testes/                    # unittest + fixtures pequenas
├── anotacoes/                     # MANUAL (TOML) — contrato em contracts/anotacoes.md
│   ├── modulos.toml
│   ├── tabelas/<tabela>.toml
│   ├── funcoes/<nome>.toml
│   ├── arquivos.toml
│   ├── acesso.toml
│   ├── plataforma.toml
│   ├── divergencias.toml
│   └── achados.toml
├── inventario/                    # GERADO: inventários do banco das migrations (TSV)
├── catalogo/                      # GERADO: README, tabelas/, funcoes/, arquivos, acesso, externos
├── mapa-rastreabilidade.md        # GERADO
├── ordem-modulos.md               # GERADO
├── divergencias.md                # GERADO
├── achados.md                     # GERADO
└── formatos/                      # MANUAL: moldes das specs seguintes (D10)
    ├── spec-modulo.md
    └── jornada.md
```

Os scripts SQL de inventário continuam em `.specify/assessments/novo-sistema-django-apps/`
(`inventario-producao.sql`, `inventario-producao-parte2.sql`). As ferramentas os usam de lá,
sem cópia.

**Structure Decision**: tudo dentro da pasta da spec. As ferramentas existem para produzir e
manter esta spec e não são parte de nenhum sistema. Mantê-las fora de `src/` evita confundi-las
com o app atual. Mantê-las fora de uma pasta de ferramentas genérica deixa claro que o destino
delas termina com o levantamento (Princípio V, "código temporário com destino definido").

## Complexity Tracking

Sem violações da constituição a justificar.
