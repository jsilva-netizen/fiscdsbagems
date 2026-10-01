# Implementation Plan: Módulo portal do prestador

**Branch**: `migracao-sisreg` (levantamento; o código nasce no repositório novo) | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/012-modulo-portal-prestador/spec.md`

## Summary

O app `portal_prestador` é a área da entidade regulada. Ele não tem modelos: aplica a regra do
termo, compõe o que os apps donos oferecem e recebe, por registro, as páginas dos apps posteriores.

Abordagem ([research.md](./research.md)):
- a regra do termo num só módulo, chamada antes de qualquer leitura de fiscalização (V2);
- registro de cartões no servidor e de páginas no aparelho; os cartões dos apps anteriores são do
  próprio portal (V3);
- rotas de composição só onde é preciso compor ou aplicar a regra; o resto vai direto aos donos
  (V4);
- fronteira do papel prestador no servidor, com varredura das rotas (V5);
- rascunhos no servidor, compartilhados pelos usuários da entidade (V6).

## Technical Context

**Language/Version**: Python 3.12; TypeScript com React 18

**Primary Dependencies**: as dos apps comuns; nenhuma nova

**Storage**: nenhum modelo próprio; lê os apps donos

**Testing**: pytest, Vitest, import-linter, matriz da regra do termo, varredura de rotas, teste de
dono dos dados, app de teste com contribuição

**Target Platform**: navegador no computador e no celular, com rede

**Project Type**: app comum `portal_prestador` e módulo de frontend `portal` no projeto do
repositório novo

**Performance Goals**: início e listas em menos de 1 s com 100 termos por entidade; detalhe do termo
com 50 determinações em menos de 2 s

**Constraints**: sem dados próprios; nenhuma escrita em modelo de outro app; nenhum dado de
fiscalização sem termo emitido pelo portal, por qualquer caminho

**Scale/Scope**: dezenas de entidades, poucos usuários por entidade, poucos termos por ano cada

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Regra (constituição v2.6.2) | Situação | Como o plano atende |
|---|---|---|
| I. Preservação integral | Passa | O portal só mostra; os registros e os arquivos são dos donos |
| II. Operação offline | Passa | O portal é usado com rede (premissa da spec); avisa sem rede e não envia pela metade (V6) |
| III. Autorização verificável | Passa | Regra do termo e fronteira do papel testadas caso a caso (V5, V8) |
| IV. Produção intocada | Passa | Repositório novo; nada a migrar |
| V. Manutenibilidade | Passa | App pequeno, sem modelos nem dependências novas |
| Apps comuns como motores genéricos | Passa | Nada de câmara; títulos e identificações vêm dos donos |
| Todo dado tem um app dono | Passa | Escritas pelas rotas dos donos; leitura por consultas (V2, V4) |
| Independência e ordem dos apps | Passa | Lê apps anteriores; os posteriores entram por registro (V3) |

**Pós-desenho (Phase 1)**: reavaliado depois dos contratos. Nenhuma violação nova. Ajustes em
outras specs:
- spec 007: as consultas `resumo_para_entidade` e `endereco_foto_para_entidade`, importáveis só pelo
  portal;
- spec 011: o tipo de aviso `sancionador.prazo_proximo`.

## Project Structure

### Documentation (this feature)

```text
specs/012-modulo-portal-prestador/
├── spec.md, plan.md, research.md (V1 a V9), data-model.md, quickstart.md
└── contracts/
    ├── api-portal.md          # rotas de composição, rotas dos donos usadas, registro
    └── matriz-acesso.md
```

Sem mapa de migração (o módulo não tem colunas).

### Source Code (repositório novo)

```text
backend/apps/portal_prestador/
├── alcance.py         # regra do termo (V2)
├── registro.py        # cartões registrados (V3)
├── composicao.py      # início, termos, autos (V4)
├── api/               # rotas portal/...
└── apps.py

backend/tests/portal_prestador/   # regra do termo, varredura de rotas, dono dos dados, app de teste

frontend/src/portal/
├── casca/             # menu e cabeçalho do portal
├── inicio/, termos/, autos/, previstas/, avisos/
├── envio/             # envio de arquivos com conferência e progresso (V6)
└── extensoes.ts       # registro de páginas, menu e cartões (V3)
```

**Structure Decision**: o `portal_prestador` fica em `backend/apps/` e o módulo `portal` em
`frontend/src/`, depois dos apps que ele lê e antes dos que se registram nele. A fronteira do papel
prestador é aplicada pelo componente de escopo do core.

## Complexity Tracking

Nenhuma violação a justificar.
