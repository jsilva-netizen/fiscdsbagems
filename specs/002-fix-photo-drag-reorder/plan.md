# Implementation Plan: Reordenação de Fotos por Arrastar e Soltar

**Branch**: `002-fix-photo-drag-reorder` (criar a partir da `main`; entrega na `main`) | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-fix-photo-drag-reorder/spec.md`

## Summary

O grid de fotos das telas de vistoria não coloca a foto onde o fiscal a solta. A pesquisa
([research.md](./research.md#diagnóstico)) encontrou três causas:

1. **A biblioteca de arrastar não suporta grid de várias linhas.** `@hello-pangea/dnd` está
   configurada como uma fileira horizontal única, mas as fotos quebram em 2 ou 3 colunas. Esta
   é a causa do defeito relatado.
2. **Índices trocados.** O grid esconde fotos sem imagem e passa às telas a posição no grid
   visível. As telas aplicam essa posição na lista completa. Com uma foto oculta, mover,
   remover ou editar legenda atinge a foto errada.
3. **A ordem salva se perde ao reabrir a tela com fotos ainda não sincronizadas.** A ordem é
   gravada certa, mas a carga das telas remonta a lista com as fotos locais sempre no início
   (Unidade) ou sempre no fim (DTR).

Abordagem:
- Trocar a biblioteca **só no grid de fotos** por `@dnd-kit` (core + sortable), que suporta
  grids e toque, e mostra o deslocamento durante o arraste.
- Operar sempre sobre índices da lista completa, com chave estável por foto.
- Extrair a remontagem da carga para uma função compartilhada que respeita a ordem salva.
- As regras que tocam a integridade da lista viram funções puras, cobertas por testes
  unitários. O gesto de arrastar é validado por roteiro manual no computador e no celular.

Sem mudança de schema, de formato persistido ou de backend.

## Technical Context

**Language/Version**: JavaScript (JSX) e TypeScript no frontend; React 18.2, Vite 6

**Primary Dependencies**: `@dnd-kit/core` ^6.3.1, `@dnd-kit/sortable` ^10.0.0, `@dnd-kit/utilities` ^3.2.2 (novas); `@hello-pangea/dnd` ^17 (permanece nas outras listas); Dexie 4 (inalterado)

**Storage**: sem mudança. A ordem continua sendo a ordem do array `fotos_unidade` (IndexedDB local e coluna no servidor)

**Testing**: Vitest 5 + jsdom (a adicionar na `main`, com configuração idêntica à da `migracao-sisreg`); roteiro manual em [quickstart.md](./quickstart.md)

**Target Platform**: SPA/PWA em navegador; uso principal em celular Android/iOS em campo, também em computador

**Project Type**: aplicação web (frontend SPA)

**Performance Goals**: arraste fluido (sem travamento perceptível) com até 20 fotos, o limite por unidade (`MAX_PHOTOS_PER_UNIDADE`)

**Constraints**: funcionar offline (Princípio II), com toque e sem conflitar com a rolagem da página; entrega direto na produção (`main`), portanto validação completa antes do merge

**Scale/Scope**: 1 componente (`PhotoGrid.jsx`), 2 telas (carga das fotos), 1 módulo novo com funções puras, 1 arquivo de testes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação | Status |
|---|---|---|
| **I. Preservação Integral** | Não há migração nem mudança de formato. As regras novas (mover, remontar) têm invariantes de contagem e conteúdo ([data-model.md](./data-model.md)), cobertas por teste. A correção **reduz** risco atual: hoje remover ou editar a legenda pode atingir a foto errada (causa 2). | ✅ PASS |
| **II. Operação Offline** | A biblioteca nova é código no bundle, sem acesso à rede. A reordenação funciona offline como hoje. A causa 3 é justamente uma perda de ordem no fluxo offline, e é corrigida. Roteiro offline obrigatório no quickstart (seção 5). | ✅ PASS |
| **III. Autorização Verificável** | Nenhuma regra de acesso é tocada. | ✅ N/A |
| **IV. Produção Intocada e Mudança Reversível** | A entrega vai para a `main`, que é a produção. É **correção de defeito** em funcionalidade existente, sem dado nem schema novo, o que se enquadra como correção permitida enquanto a migração corre. A mudança é reversível com um revert do PR, sem dado a desfazer. A infraestrutura de teste adicionada é só de desenvolvimento, não entra no bundle nem no deploy. O trabalho parte da `main` e volta para a `migracao-sisreg` depois (research D6). | ✅ PASS (com a condição de validar pelo quickstart antes do merge) |
| **V. Manutenibilidade** | `@dnd-kit` é a biblioteca mainstream de arrastar em React, não nicho. O módulo `fotosOrdem.js` elimina uma repetição que já existe (a mesma carga, com regras divergentes, nas duas telas). O ponto de atenção é a convivência de duas bibliotecas de arrastar, justificada em Complexity Tracking. | ✅ PASS (com justificativa) |

**Re-check pós-design (Phase 1)**: mantido. O design não adicionou persistência, rede, nem
abstração além do módulo de funções puras. Os contratos preservam as assinaturas atuais das
telas ([contracts/photo-grid.md](./contracts/photo-grid.md)).

## Project Structure

### Documentation (this feature)

```text
specs/002-fix-photo-drag-reorder/
├── spec.md
├── plan.md              # este arquivo
├── research.md          # diagnóstico e decisões D1–D6
├── data-model.md        # regras e invariantes da lista de fotos
├── quickstart.md        # roteiro de validação antes do merge
├── contracts/
│   ├── photo-grid.md    # contrato do componente PhotoGrid
│   └── fotos-ordem.md   # contrato e casos de teste do módulo fotosOrdem
├── checklists/
│   └── requirements.md
└── tasks.md             # gerado por /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── components/fiscalizacao/
│   └── PhotoGrid.jsx            # ALTERADO: @hello-pangea/dnd → @dnd-kit; índices da lista completa
├── lib/
│   └── fotosOrdem.js            # NOVO: chavesDasFotos, moverFoto, mesclarFotosNaOrdemSalva
└── pages/
    ├── VistoriarUnidade.jsx     # ALTERADO: carga das fotos usa mesclarFotosNaOrdemSalva
    └── VistoriarOcorrenciaDTR.jsx # ALTERADO: idem

tests/
└── unit/fotos/
    └── fotosOrdem.test.js       # NOVO

package.json                     # ALTERADO: + @dnd-kit/*, + vitest/jsdom (dev), + script test:unit
vitest.config.ts                 # NOVO na main (cópia idêntica da migracao-sisreg)
```

**Structure Decision**: aplicação web de frontend único, estrutura existente. Nenhuma pasta
nova além de `tests/unit/fotos/` (e `tests/` em si, que ainda não existe na `main`). O módulo
fica em `src/lib/` ao lado dos utilitários do app, fora de `src/lib/offline/`, porque não
acessa armazenamento.

## Implementation Outline

Ordem sugerida para `/speckit-tasks`. Cada bloco pode ser validado sozinho.

1. **Preparar a branch**: criar `002-fix-photo-drag-reorder` a partir da `main`, trazer
   `specs/002-fix-photo-drag-reorder/`, adicionar vitest/jsdom, `vitest.config.ts` e o script
   `test:unit`.
2. **Funções puras + testes** (base das US1 e US2): `fotosOrdem.js` com os casos de
   [contracts/fotos-ordem.md](./contracts/fotos-ordem.md). Escrever os testes primeiro.
3. **Grid** (US1, US3): no `PhotoGrid`, trocar a biblioteca, arrastar pela alça
   (`touch-action: none`), sensores de ponteiro (distância 5 px) e teclado, `rectSortingStrategy`,
   `closestCenter` restrito à área do grid, índice original em mover/remover/legenda.
4. **Carga** (US2): as duas telas passam a usar `mesclarFotosNaOrdemSalva`.
5. **Validação**: quickstart completo, computador e celular real. Depois, PR para a `main`.
6. **Volta**: mesclar a `main` na `migracao-sisreg` e rodar `npm run test:unit` lá.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Duas bibliotecas de arrastar no projeto (`@hello-pangea/dnd` e `@dnd-kit`) | A atual não suporta grid de várias linhas, que é a causa do defeito | Trocar também as outras 3 listas amplia o escopo de uma correção que vai direto para a produção, em telas que funcionam. `Droppable` por linha é mais frágil que trocar a biblioteca (research D1). **Destino**: consolidar em `@dnd-kit` quando essas listas forem tocadas na reescrita do frontend da `migracao-sisreg` |
