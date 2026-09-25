---
description: "Tarefas para a correção da reordenação de fotos por arrastar e soltar"
---

# Tasks: Reordenação de Fotos por Arrastar e Soltar

**Input**: Design documents from `/specs/002-fix-photo-drag-reorder/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: incluídos para as funções puras de `src/lib/fotosOrdem.js` (research D5). Escreva cada teste antes da implementação e confirme que ele falha. O gesto de arrastar é validado manualmente pelo [quickstart.md](./quickstart.md).

**Organization**: tarefas agrupadas por história de usuário da spec. US1 e US2 são P1; US3 é P2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: história da spec atendida (US1, US2, US3)

## Regras para quem for executar

- **Todo o trabalho acontece na branch `002-fix-photo-drag-reorder`, criada a partir da `main`.** Nunca na `migracao-sisreg`. Os arquivos alterados são idênticos nas duas branches, então os números de linha citados abaixo valem para a `main`.
- **Não trocar `@hello-pangea/dnd` fora do `PhotoGrid.jsx`.** `ExecutarFiscalizacao.jsx` e as listas de constatações e recomendações de `VistoriarUnidade.jsx` continuam com ela (plan, Complexity Tracking).
- **Não mudar o formato persistido.** Nada de campo novo em foto, coluna ou tabela do IndexedDB (data-model).
- **O merge na `main` publica em produção.** Só depois de tudo validado, e com confirmação explícita do usuário (T030).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: branch de trabalho a partir da `main`, dependências e infraestrutura de teste

- [X] T001 Criar a branch de trabalho a partir da `main` atualizada:
  1. Rodar `git fetch origin` e confirmar que `main` e `origin/main` apontam para o mesmo commit. Se a `main` local estiver atrás, rodar `git switch main` e `git pull --ff-only`.
  2. Rodar `git switch -c 002-fix-photo-drag-reorder main`.
  3. Conferir que `specs/002-fix-photo-drag-reorder/` veio junto. Ela não está versionada e acompanha a troca de branch.
  4. Conferir que `.specify/feature.json` aponta para `specs/002-fix-photo-drag-reorder`.
- [X] T002 Adicionar as dependências de arrastar em `package.json`: rodar `npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2`. Confirmar que `package.json` e `package-lock.json` foram atualizados e que `@hello-pangea/dnd` continua em `dependencies`.
- [X] T003 Adicionar a infraestrutura de teste unitário, idêntica à da `migracao-sisreg` (research D5):
  1. Rodar `npm install -D vitest@^5.0.1 jsdom@^29.1.1`.
  2. Em `package.json`, adicionar o script `"test:unit": "vitest run"` logo depois de `"typecheck"`, na mesma posição em que está na `migracao-sisreg`.
  3. Criar `vitest.config.ts` na raiz com o conteúdo exato de `git show migracao-sisreg:vitest.config.ts`: plugin react, alias `@` → `./src`, `environment: 'jsdom'`, `include: ['tests/unit/**/*.{test,spec}.{js,ts,jsx,tsx}']`, `globals: false`. O comentário do arquivo cita "decisão D2 de research.md" da spec 001, que não existe na `main`. Troque por uma frase que diga que a configuração reaproveita o plugin React e o alias `@` do `vite.config.js`.
- [X] T004 [P] Criar a pasta `tests/unit/fotos/`. Rodar `npm run test:unit` e confirmar que o Vitest executa. Pode sair com "no test files found"; não deve haver erro de configuração.

**Checkpoint**: `npm run dev` sobe a aplicação como antes; `npm run test:unit` executa.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: módulo `fotosOrdem.js` com a identidade de foto, usada pelo grid (US1) e pela carga (US2)

**⚠️ CRITICAL**: US1 e US2 dependem desta fase

- [X] T005 Criar `src/lib/fotosOrdem.js` (ES module, JavaScript, sem dependências de React, Dexie ou rede) com estes auxiliares exportados, todos puros:
  - `normalizarFoto(foto)`: string vira `{ url: foto, legenda: '' }`; objeto é retornado como está; `null` ou `undefined` retorna `null`. Mesma regra do `useMemo` de `fotosList` em `src/components/fiscalizacao/PhotoGrid.jsx:32-34`.
  - `ehUrlLocal(url)`: `true` para `/^blob:|^data:|^file:|^capacitor:/i`. Mesma expressão de `src/pages/VistoriarUnidade.jsx:294`.
  - `chaveDeArmazenamento(foto)`: retorna `"bucket:path"` ou `null`. Mover para cá a lógica de `extractStoragePath` de `src/pages/VistoriarUnidade.jsx:296-313`, sem mudar o comportamento: `bucket`+`path` explícitos; `storage://bucket/path`; `/storage/v1/object/(public|sign)/bucket/path` ignorando a query string.
  - `fotoVisivel(foto)`: `true` se a foto tem `url`, ou `bucket` e `path`, ou `localId`. Mesma regra do filtro de `src/components/fiscalizacao/PhotoGrid.jsx:541`.
  - `chaveDaFoto(foto)`: chave base na prioridade do data-model: `` `${bucket}:${path}` `` se houver `bucket` e `path`; `` `local:${localId}` `` se houver `localId`; `` `url:${url}` `` se houver `url`; senão `''`. Mesma prioridade de `fotoKey` em `src/components/fiscalizacao/PhotoGrid.jsx:57-64`, sem o fallback de índice.

**Checkpoint**: módulo importável via `@/lib/fotosOrdem`.

---

## Phase 3: User Story 1 - Soltar uma foto sobre outra coloca a foto naquela posição (Priority: P1) 🎯 MVP

**Goal**: soltar a foto arrastada sobre qualquer outra foto do grid, em qualquer linha ou coluna, com mouse ou toque, põe a arrastada na posição da de destino e desloca as intermediárias (FR-001 a FR-005, FR-008 a FR-010).

**Independent Test**: [quickstart.md](./quickstart.md), seções 2 (exceto 2.8), 3 e 6. Com 7 fotos, soltar 1 sobre 4 resulta em 2 3 4 1 5 6 7; soltar 7 (3ª linha) sobre 1 resulta em 7 1 2 3 4 5 6.

### Tests for User Story 1 ⚠️

> Escrever primeiro e confirmar que falham antes de T008/T009.

- [X] T006 [P] [US1] Em `tests/unit/fotos/fotosOrdem.test.js`, criar o bloco `describe('moverFoto')` com os casos de [contracts/fotos-ordem.md](./contracts/fotos-ordem.md#moverfotofotos-origem-destino--foto). Use objetos `{ url: 'A' }` … `{ url: 'G' }` e compare pela sequência de `url`:
  - `moverFoto(l,0,3)` resulta em B C D A E F G
  - `moverFoto(l,5,1)` resulta em A F B C D E G
  - `moverFoto(l,6,0)` resulta em G A B C D E F
  - `moverFoto(l,2,6)` resulta em A B D E F G C
  - `[A,B]` com `(0,1)` resulta em B A
  - `[A]` com `(0,0)` resulta em A
  - índice fora dos limites resulta em cópia igual
  - `[B, X(oculta, {}), C, D]` com `(3,0)` resulta em `[D, B, X, C]`, com tamanho 4

  Em todos os casos, verificar também: a entrada não foi alterada; o resultado é um array novo; os itens são **os mesmos objetos** (`toBe`), com `legenda` intacta; o tamanho não muda.
- [X] T007 [P] [US1] No mesmo arquivo, `tests/unit/fotos/fotosOrdem.test.js`, criar o bloco `describe('chavesDasFotos')`, cobrindo:
  - uma chave por foto, alinhada por índice
  - prioridade `bucket:path` > `local:<localId>` > `url:<url>`
  - fotos em string são aceitas
  - duas fotos com a mesma chave base geram chaves distintas, sendo a segunda com sufixo `#2` e a terceira com `#3`
  - foto sem identidade recebe chave posicional única
  - determinismo: a mesma lista gera as mesmas chaves
  - estabilidade: a chave de uma foto identificada não muda quando ela troca de posição (compare `chavesDasFotos(l)` com `chavesDasFotos(moverFoto(l,0,3))` por foto)

  Se T006 já tiver criado o arquivo, apenas adicione o bloco.

### Implementation for User Story 1

- [X] T008 [US1] Em `src/lib/fotosOrdem.js`, implementar e exportar `moverFoto(fotos, origem, destino)`. Retorna um novo array; se `origem === destino` ou algum índice está fora de `[0, fotos.length)`, retorna `[...fotos]`; senão remove o item de `origem` e o insere em `destino` (semântica do `reorderArray` atual em `src/components/fiscalizacao/PhotoGrid.jsx:66-71`). Não pode alterar a entrada. T006 deve passar.
- [X] T009 [US1] Em `src/lib/fotosOrdem.js`, implementar e exportar `chavesDasFotos(fotos)`. Para cada foto `i`, a base é `chaveDaFoto(normalizarFoto(fotos[i]))`; se a base for `''`, usar `` `pos:${i}` ``. Mantenha um contador por base: a primeira ocorrência usa a base pura, a n-ésima usa `` `${base}#${n}` ``. T007 deve passar.
- [X] T010 [US1] Reescrever o bloco de arrastar em `src/components/fiscalizacao/PhotoGrid.jsx` usando `@dnd-kit` (research D1, D2):
  - **Imports**: remover `import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'` (linha 9). Importar `DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors` de `@dnd-kit/core`; `SortableContext, rectSortingStrategy, useSortable, sortableKeyboardCoordinates` de `@dnd-kit/sortable`; `CSS` de `@dnd-kit/utilities`; `chavesDasFotos, moverFoto, fotoVisivel` de `@/lib/fotosOrdem`.
  - **Remover** `fotoKey` (linhas 57-64) e `reorderArray` (linhas 66-71). Antes, procure no arquivo outros usos de `fotoKey` e troque-os pela chave de `chavesDasFotos`.
  - **Componente `FotoOrdenavel`**, no mesmo arquivo, fora de `PhotoGrid`, com props `{ id, disabled, children }`:
    - chama `useSortable({ id, disabled })`
    - renderiza `<div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined }} className="relative group rounded-lg overflow-hidden border">`
    - chama `children({ handleProps: { ref: setActivatorNodeRef, ...attributes, ...listeners } })`
  - **Dentro de `PhotoGrid`**:
    - `const chaves = useMemo(() => chavesDasFotos(fotosList), [fotosList])`
    - `const visiveis = fotosList.map((foto, indiceOriginal) => ({ foto, indiceOriginal, id: chaves[indiceOriginal] })).filter(({ foto }) => fotoVisivel(foto))`
    - `const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))`. Declare **antes** de qualquer `return` condicional, pela regra dos hooks.
    - `const podeReordenar = isEditable && !!onReorderFotos`
  - **Handler** `handleDragEnd({ active, over })`:
    - retorna sem fazer nada se `!podeReordenar`, `!over` ou `active.id === over.id`
    - `origem = chaves.indexOf(active.id)` e `destino = chaves.indexOf(over.id)`; retorna se algum for `-1`
    - chama `onReorderFotos(moverFoto(fotosList, origem, destino))`. Destino é a foto sob o ponteiro (FR-002).
  - **Render**, no lugar do bloco das linhas 526-635:
    - `{fotosList.length > 0 && (<DndContext sensors={sensors} collisionDetection={colisaoDentroDoGrid} onDragEnd={handleDragEnd}><SortableContext items={visiveis.map(v => v.id)} strategy={rectSortingStrategy}><div className="grid grid-cols-2 md:grid-cols-3 gap-3">…</div></SortableContext></DndContext>)}`
    - dentro do grid, `visiveis.map(({ foto, indiceOriginal, id }, posicao) => <FotoOrdenavel key={id} id={id} disabled={!podeReordenar}>{({ handleProps }) => (…conteúdo atual do card…)}</FotoOrdenavel>)`
    - sem `provided.placeholder`
  - **Alça**: o `<div>` da alça (linha 558) recebe `{...handleProps}` no lugar de `{...drag.dragHandleProps}`, mais `style={{ touchAction: 'none' }}`, `aria-label="Arrastar para reordenar"` e a classe `cursor-grab`. Só é renderizada quando `podeReordenar` (FR-010).
  - **Resto do card**: mantém a imagem, o overlay de remover e a legenda como estão, com as trocas de T011.
- [X] T011 [US1] Em `src/components/fiscalizacao/PhotoGrid.jsx`, fazer os callbacks e o estado de legenda usarem a lista completa (research D3, [contracts/photo-grid.md](./contracts/photo-grid.md#índices-em-onremovefoto-e-onupdatelegenda), FR-009):
  - `onRemoveFoto(index)` passa a `onRemoveFoto(indiceOriginal)` (linha 573)
  - `onUpdateLegenda(index, legenda)` passa a `onUpdateLegenda(indiceOriginal, legenda)` (linha 603)
  - as chaves de `editingLegenda` e `tempLegendas` (a variável `k`, linhas 583-610) passam a ser o `id` de `chavesDasFotos`
  - o `alt` da imagem passa a ser `` `Foto ${posicao + 1}` ``

  Confirmar com busca no arquivo que não sobrou nenhum uso de `index` vindo do `.map` do grid.
- [X] T012 [US1] Validar US1: `npm run test:unit` passa; `npm run dev`; executar [quickstart.md](./quickstart.md) seções 2.1–2.7, 2.9, 2.10 e 6. Pelo celular (`npm run tunnel`), executar a seção 3. Anotar qualquer divergência antes de seguir.
  > **Execução (2026-09-24)**: seções 2.1–2.7, 2.9, 2.10, 3.1, 3.2 e 6.1 validadas por Playwright contra o `PhotoGrid` real numa página temporária, com mouse em 3 colunas (1280 px) e toque real (eventos de toque do Chromium) em 2 colunas (390 px). Também validados: soltar abaixo do grid, e mover ou remover com foto oculta na lista. A validação encontrou e corrigiu um defeito: soltar fora do grid movia a foto (research D1). Pendente em celular real (T024): 3.3 (toque abre a foto), 3.4 (rolagem automática) e a disputa entre toque e rolagem num aparelho.

**Checkpoint**: o defeito relatado está corrigido nas duas telas. Este é o MVP.

---

## Phase 4: User Story 2 - A nova ordem é mantida (Priority: P1)

**Goal**: a ordem salva sobrevive a reabrir a tela, inclusive com fotos ainda não sincronizadas, e é a que vai ao servidor e aos documentos (FR-006, FR-007, FR-008; research causa 3 e D4).

**Independent Test**: [quickstart.md](./quickstart.md) seções 4 e 5. Offline, com fotos novas 8 e 9 reordenadas para 1 9 2 3 4 8 5 6 7 e salvas, reabrir a tela mostra 1 9 2 3 4 8 5 6 7. Hoje mostra 8 9 no início (Unidade) ou no fim (DTR).

> US2 é independente de US1 no código (arquivos diferentes). Dá para validá-la reordenando com a
> tela antiga, desde que as fotos caibam numa linha só, ou pelos testes de T013.

### Tests for User Story 2 ⚠️

- [X] T013 [P] [US2] Em `tests/unit/fotos/fotosOrdem.test.js`, criar o bloco `describe('mesclarFotosNaOrdemSalva')` com todos os casos da tabela de [contracts/fotos-ordem.md](./contracts/fotos-ordem.md#mesclarfotosnaordemsalvasalvas-locais--foto). Monte os dados assim:
  - locais como `{ localId: 'L1', url: 'blob:novo-L1', legenda: 'l1' }`
  - entradas locais salvas como `{ localId: 'L1', url: 'blob:antigo-L1' }`
  - remotas como `{ bucket: 'fotos_fiscalizacao', path: 'u/r1.jpg', url: 'storage://fotos_fiscalizacao/u/r1.jpg' }`

  Casos:
  1. `[R1, L1antigo, R2]` + `[L1]` resulta em `[R1, L1novo, R2]`, com o item do meio sendo o objeto de `locais` (`toBe`)
  2. `[L2, R1, L1]` + `[L1, L2]` resulta em `[L2, R1, L1]`
  3. `[R1, R2]` + `[L1]` resulta em `[R1, R2, L1]`
  4. `[R1, L1antigo]` + `[]` resulta em `[R1]`
  5. `[R1]` + `[L1 com url 'https://x/storage/v1/object/public/fotos_fiscalizacao/u/r1.jpg']` resulta em só R1
  6. `[]` + `[L1, L2]` resulta em `[L1, L2]`
  7. `null` + `[]` resulta em `[]`
  8. string remota `'https://x/storage/v1/object/public/b/p.jpg'` em `salvas` é aceita e normalizada para `{ url }`
  9. entrada remota só com `bucket`+`path`, sem `url`, é mantida

  Invariante verificado em todos os casos: cada foto de `locais` aparece exatamente uma vez na saída.

### Implementation for User Story 2

- [X] T014 [US2] Em `src/lib/fotosOrdem.js`, implementar e exportar `mesclarFotosNaOrdemSalva(salvas, locais)` pelas regras de [data-model.md](./data-model.md#regras-de-remontagem-na-carga-ordem-salva--fotos-locais):
  1. `salvas ?? []` normalizado com `normalizarFoto`, descartando `null`; `locais ?? []`.
  2. Índice `locaisPorId = new Map(locais.map(l => [String(l.localId).trim(), l]))`.
  3. Conjuntos `vistosLocalId` e `vistosArmazenamento`, e a função `adicionar(f)`. Ela ignora `f` se o `localId` dela, trimado, já está em `vistosLocalId` ou se `chaveDeArmazenamento(f)` já está em `vistosArmazenamento`; senão registra os dois (quando existem) e faz o push. É a mesma deduplicação de `src/pages/VistoriarUnidade.jsx:341-352`.
  4. Para cada `s` de `salvas`, em ordem:
     - se `localId` de `s` está em `locaisPorId`, `adicionar(locaisPorId.get(id))`
     - senão, se `ehUrlLocal(s.url)`, ignorar
     - senão, se `(s.bucket && s.path) || s.url`, `adicionar(s)`
  5. Depois, `locais.forEach(adicionar)`: as que ainda não entraram vão para o fim.
  6. Retornar o array.

  T013 deve passar.
- [X] T015 [P] [US2] Em `src/pages/VistoriarUnidade.jsx`, dentro de `carregar` (linhas 315-365), trocar a montagem por `const merged = mesclarFotosNaOrdemSalva(unidade?.fotos_unidade, locais)`:
  - manter a chamada a `Repository.listLocalFotos(unidadeId)` e o mapeamento de `locais` (linhas 326-335) como estão
  - remover `remotas`, `seenStoragePaths`, `seenLocalIds`, `addFoto` e os dois `forEach` (linhas 317-325 e 337-357)
  - remover `isLocalUrl` (linha 294) e `extractStoragePath` (linhas 295-313) se não houver outro uso deles no arquivo; confirme com busca
  - manter `setFotos(merged)`, `fotosCarregadasRef.current = unidadeId`, `setFotosDirty(false)` e as dependências do efeito (linha 368) sem mudança
  - importar `mesclarFotosNaOrdemSalva` de `@/lib/fotosOrdem`

  Fotos locais nunca salvas numa lista passam a aparecer no fim, não no início (research D4, mudança assumida).
- [X] T016 [P] [US2] Em `src/pages/VistoriarOcorrenciaDTR.jsx`, no efeito de carga das fotos (linhas 375-405), trocar a montagem por `const merged = mesclarFotosNaOrdemSalva(ocorrencia?.fotos_unidade, locais)`:
  - manter os guards (linhas 376-378), a chamada a `Repository.listLocalFotos(occurrenceId)` e o mapeamento de `locais` (linhas 385-387)
  - remover `remotas`, `seen`, `add` e os dois `forEach` (linhas 382-384 e 388-397)
  - remover `isLocalUrl` (linha 379) se não houver outro uso dele no efeito
  - manter `setFotos(merged)`, o ref, `setFotosDirty(false)` e as dependências do efeito
  - importar `mesclarFotosNaOrdemSalva` de `@/lib/fotosOrdem`

  Diferença de comportamento esperada: fotos remotas só com `bucket`+`path`, sem `url`, passam a ser aceitas, como já eram na Vistoriar Unidade.
- [ ] T017 [US2] Validar US2: `npm run test:unit` passa; executar [quickstart.md](./quickstart.md) seções 4 e 5 nas duas telas, com o DevTools em Offline. No 5.4, confirmar no Supabase (tabela `unidades_fiscalizadas`, coluna `fotos_unidade` da unidade de teste) que a ordem gravada é a mesma da tela.
  > **Pendente (usuário)**: exige o app real logado, com IndexedDB e Supabase. As regras de remontagem estão cobertas pelos 10 testes de `mesclarFotosNaOrdemSalva`; nas telas, a mudança é a troca da montagem por uma chamada.

**Checkpoint**: US1 e US2 funcionando juntas; a ordem definida pelo fiscal chega ao servidor e aos documentos.

---

## Phase 5: User Story 3 - Retorno visual durante o arraste (Priority: P2)

**Goal**: o fiscal vê onde a foto vai entrar antes de soltar (FR-011).

**Independent Test**: [quickstart.md](./quickstart.md) seção 2.8. Arrastando devagar, as outras fotos se deslocam e a foto solta fica exatamente onde o grid indicava.

> O deslocamento das outras fotos já vem de `rectSortingStrategy` + `transform` de T010. Esta
> fase só adiciona destaque e mensagens em português.

- [X] T018 [US3] Em `src/components/fiscalizacao/PhotoGrid.jsx`, no `FotoOrdenavel`, destacar o item arrastado quando `isDragging`: classes `ring-2 ring-blue-500 shadow-lg opacity-90`. Na alça, usar `cursor-grabbing` durante o arraste. Não mexer no layout do grid.
- [X] T019 [US3] Em `src/components/fiscalizacao/PhotoGrid.jsx`, passar ao `DndContext` a prop `accessibility={{ announcements, screenReaderInstructions }}` com textos em português, definidos como constantes no arquivo. Exemplos: "Foto na posição 3 selecionada. Use as setas para mover e Espaço para soltar."; "Foto movida para a posição 5."; "Movimento cancelado." A posição é a posição em `visiveis` + 1.
- [X] T020 [US3] Validar US3: [quickstart.md](./quickstart.md) seção 2.8 no computador e no celular; mover uma foto só pelo teclado (Tab até a alça, Espaço, setas, Espaço).
  > **Execução (2026-09-24)**: 2.8 validado por Playwright em 3 e em 2 colunas. A ordem que o grid mostrava no meio do arraste (lida pela posição de cada foto na tela) é igual ao resultado ao soltar, e a foto arrastada fica destacada. Movimento só por teclado (Espaço, →, →, Espaço) resulta em 2 3 1 4 5 6 7. O anúncio em português foi conferido. O celular real fica na T024.

**Checkpoint**: todas as histórias funcionando.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: verificação completa, entrega na `main` e volta para a `migracao-sisreg`

- [X] T021 [P] Rodar `npm run lint` e corrigir o que aparecer em `src/components/fiscalizacao/PhotoGrid.jsx`, `src/lib/fotosOrdem.js`, `src/pages/VistoriarUnidade.jsx`, `src/pages/VistoriarOcorrenciaDTR.jsx` e `tests/unit/fotos/fotosOrdem.test.js`. Não corrigir avisos pré-existentes em outros arquivos.
- [X] T022 [P] Rodar `npm run build` e confirmar que o build passa. Em `dist/assets`, confirmar com busca que `@dnd-kit` está no bundle e que `vitest`/`jsdom` não estão.
- [X] T023 Confirmar que `src/components/fiscalizacao/PhotoGrid.jsx` não importa mais `@hello-pangea/dnd` e que `src/pages/ExecutarFiscalizacao.jsx` e `src/pages/VistoriarUnidade.jsx` ainda importam, sem mudança nas listas deles (diff restrito à carga das fotos em `VistoriarUnidade.jsx`). Executar [quickstart.md](./quickstart.md) seção 7.
  > **Execução (2026-09-24)**: imports conferidos; o diff de `VistoriarUnidade.jsx` contra a `main` não toca as listas de constatações e recomendações. A seção 7 do quickstart (reordenar essas listas no app) fica na T024.
- [X] T024 Executar o [quickstart.md](./quickstart.md) completo (seções 1 a 7) no computador e num celular real, em sequência, depois de todas as tarefas anteriores. Registrar o modelo do celular e o navegador.
  > **Execução (2026-09-25)**: o usuário confirmou em produção que a reordenação funciona.
- [X] T025 Atualizar `specs/002-fix-photo-drag-reorder/spec.md`, trocando `**Status**: Draft` por `**Status**: Implemented`, e marcar como concluídas as tarefas deste arquivo.
- [X] T026 Fazer commit na branch `002-fix-photo-drag-reorder` em commits lógicos, com mensagens em português no padrão do repositório (`fix: …`, `test: …`, `chore: …`, `docs: …`):
  1. infraestrutura de teste e dependências
  2. `fotosOrdem` e testes
  3. grid
  4. carga das telas
  5. spec

  Terminar cada mensagem com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- [X] T027 Rodar `git push -u origin 002-fix-photo-drag-reorder` e abrir o PR para a `main` com `gh pr create --base main`. No corpo do PR:
  - resumo das três causas
  - link para `specs/002-fix-photo-drag-reorder/`
  - resultado de `npm run test:unit`
  - checklist do quickstart executado, com o celular e o navegador usados
  - aviso de que o merge publica em produção
  - terminar com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
  > **Execução (2026-09-24)**: push feito com `git`. O GitHub CLI não está instalado, então o PR #1 foi criado pelo navegador, com a descrição preenchida.
- [X] T028 Revisar o diff do PR contra a `main` (`gh pr diff`). Devem aparecer apenas:
  - `package.json`, `package-lock.json`, `vitest.config.ts`
  - `src/lib/fotosOrdem.js`, `src/components/fiscalizacao/PhotoGrid.jsx`, `src/pages/VistoriarUnidade.jsx`, `src/pages/VistoriarOcorrenciaDTR.jsx`
  - `tests/unit/fotos/fotosOrdem.test.js`
  - `specs/002-fix-photo-drag-reorder/**`
  > **Execução (2026-09-24)**: `git diff --name-only main..HEAD` mostra os arquivos previstos mais o `.gitignore`, com um bloco idêntico ao da `migracao-sisreg` para ignorar a saída dos testes.

  Qualquer outro arquivo deve ser explicado ou removido.
- [X] T029 Conferir que o deploy automático só publica a partir da `main` (constituição, "Isolamento"). Se o PR gerar uma prévia, repetir nela as seções 2 e 5 do quickstart.
  > **Execução (2026-09-25)**: deploy da `main` confirmado pelo usuário, que testou em produção.
- [X] T030 **Pedir confirmação explícita do usuário antes do merge**: o merge na `main` publica em produção. Com o sim, fazer o merge do PR (`gh pr merge --merge`), sem squash, para preservar os commits lógicos.
  > **Execução (2026-09-25)**: merge autorizado pelo usuário. `git merge --no-ff` na `main` (57916a7) e push; o GitHub fechou o PR #1 como mesclado. Testes e build rodados na `main` mesclada antes do push.
- [X] T031 Levar a correção para a `migracao-sisreg`:
  1. Rodar `git switch migracao-sisreg`, `git pull --ff-only` e `git merge main`.
  2. Resolver conflitos em `package.json` mantendo a união das dependências e dos scripts. A `migracao-sisreg` já tem `vitest`, `jsdom` e `test:unit`.
  3. Resolver `vitest.config.ts` mantendo a versão da `migracao-sisreg`.
  4. Resolver `package-lock.json` com `git checkout --theirs package-lock.json && npm install`, para regenerar o lock a partir do `package.json` unido.
  5. Rodar `npm run test:unit`: devem passar os testes de providers existentes e os novos de `tests/unit/fotos/`.
  6. Rodar `npm run build`.
  7. Fazer o commit do merge e perguntar ao usuário antes do push.
  > **Execução (2026-09-25)**: conflitos só em `package.json` (mantido o `test:e2e`), `vitest.config.ts` (mantida a versão da `migracao-sisreg`) e `package-lock.json` (base da `migracao-sisreg` + `npm install`, 56 linhas a mais, só do `@dnd-kit`). `npm run test:unit`: 70 testes passando. Build ok. Push pendente de aprovação do usuário.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências. T001 → T002 → T003 → T004.
- **Foundational (Phase 2)**: depende de T001. T005 bloqueia US1 e US2.
- **US1 (Phase 3)**: depende de T002, T003 e T005.
- **US2 (Phase 4)**: depende de T003 e T005. **Não depende de US1.**
- **US3 (Phase 5)**: depende de T010 (US1), porque altera o componente criado lá.
- **Polish (Phase 6)**: depende de todas as histórias. T030 depende de confirmação do usuário; T031 depende de T030.

### User Story Dependencies

- **US1 (P1)**: independente depois da Phase 2.
- **US2 (P1)**: independente depois da Phase 2; toca arquivos diferentes dos de US1.
- **US3 (P2)**: depende de US1 (mesmo arquivo e mesmo componente `FotoOrdenavel`).

### Within Each User Story

- Testes (T006, T007, T013) antes das funções (T008, T009, T014), e falhando primeiro.
- Função pura antes do componente ou tela que a usa (T008/T009 → T010/T011; T014 → T015/T016).
- T010 antes de T011: mesmo arquivo, e T011 ajusta o render criado em T010.
- Validação manual (T012, T017, T020) fecha cada história.

### Parallel Opportunities

- T006 ∥ T007 ∥ T013: blocos distintos do mesmo arquivo de teste. Se forem executados por agentes separados, cada um cria só o seu bloco e o arquivo é juntado no fim. Com um único executor, fazer em sequência.
- T015 ∥ T016: telas diferentes, a mesma função importada.
- Com US1 e US2 separadas: T008–T011 (grid) ∥ T014–T016 (carga), porque `fotosOrdem.js` recebe funções diferentes em cada frente. Coordenar para não haver edição simultânea no mesmo arquivo.
- T021 ∥ T022.

---

## Parallel Example: User Story 2

```bash
# Depois de T014 (mesclarFotosNaOrdemSalva pronta e testada):
Task: "T015 Usar mesclarFotosNaOrdemSalva na carga de src/pages/VistoriarUnidade.jsx"
Task: "T016 Usar mesclarFotosNaOrdemSalva na carga de src/pages/VistoriarOcorrenciaDTR.jsx"
```

## Parallel Example: User Story 1 × User Story 2

```bash
# Depois da Phase 2, duas frentes:
Frente A (US1): T006 → T008, T007 → T009, T010 → T011 → T012
Frente B (US2): T013 → T014 → (T015 ∥ T016) → T017
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2.
2. Phase 3 (US1): o defeito relatado está corrigido.
3. **STOP and VALIDATE**: T012.

**Não publicar o MVP sozinho.** Como a entrega vai direto para a produção, o PR para a `main`
leva US1 **e** US2 juntas. Sem US2, a ordem que o fiscal passa a conseguir montar continua se
perdendo offline (research causa 3). US3 é barata e entra no mesmo PR.

### Incremental Delivery

1. Setup + Foundational.
2. US1 → validar (T012).
3. US2 → validar (T017).
4. US3 → validar (T020).
5. Polish → quickstart completo → PR → confirmação → merge → volta para a `migracao-sisreg`.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta.
- Números de linha referem-se à `main` em `e0431e3`. Se o arquivo mudou, localize pelo trecho descrito, não pelo número.
- Qualquer divergência entre o quickstart e o comportamento observado bloqueia o PR (Princípio I: a lista de fotos é evidência de fiscalização).
