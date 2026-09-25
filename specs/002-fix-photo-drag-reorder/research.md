# Research: Reordenação de Fotos por Arrastar e Soltar

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-24

Todas as conclusões abaixo partem da leitura do código atual. Os quatro arquivos envolvidos
(`PhotoGrid.jsx`, `VistoriarUnidade.jsx`, `VistoriarOcorrenciaDTR.jsx`, `lib/offline/*`) são
idênticos na `main` e na `migracao-sisreg` (conferido com `git diff main HEAD`).

## Diagnóstico

### Causa 1: a biblioteca atual não suporta grid de várias linhas

`PhotoGrid.jsx` usa `@hello-pangea/dnd` com um único `Droppable direction="horizontal"`
([PhotoGrid.jsx:538](../../src/components/fiscalizacao/PhotoGrid.jsx#L538)), mas renderiza as
fotos num grid CSS de 2 ou 3 colunas que quebra em várias linhas
([PhotoGrid.jsx:540](../../src/components/fiscalizacao/PhotoGrid.jsx#L540)).

A biblioteca calcula a posição de destino supondo que todos os itens estão numa fileira só,
comparando apenas a coordenada horizontal do item arrastado com a dos demais. Num grid que
quebra linha, itens de linhas diferentes compartilham a mesma faixa horizontal, e a posição
calculada é quase sempre a errada. Não suportar grids é uma limitação documentada da
biblioteca (herdada do `react-beautiful-dnd`), não um defeito de configuração. É exatamente
o sintoma relatado: "as imagens só vão pra alguns lugares específicos".

### Causa 2: índice do grid visível aplicado à lista completa

O grid oculta fotos sem imagem válida
([PhotoGrid.jsx:541](../../src/components/fiscalizacao/PhotoGrid.jsx#L541)): filtra `fotosList`
antes de renderizar. O `index` de cada `Draggable` é a posição na lista **filtrada**, mas
`onDragEnd` o aplica em `fotosList` **completa**
([PhotoGrid.jsx:534](../../src/components/fiscalizacao/PhotoGrid.jsx#L534)). O mesmo `index` é
passado a `onRemoveFoto` e `onUpdateLegenda`
([PhotoGrid.jsx:573](../../src/components/fiscalizacao/PhotoGrid.jsx#L573),
[PhotoGrid.jsx:603](../../src/components/fiscalizacao/PhotoGrid.jsx#L603)), e as telas usam esse
número contra o array completo. Quando existe uma foto oculta antes da foto clicada, a ação
atinge a foto errada (FR-008, FR-009). Hoje isso é raro, mas a correção tem de ser feita junto,
porque qualquer biblioteca nova vai herdar o mesmo erro se continuar recebendo esse índice.

### Causa 3: a ordem salva de fotos não sincronizadas se perde ao reabrir a tela

A ordem das fotos é a ordem do array `fotos_unidade` da unidade. Ao salvar,
`Repository.updateUnidadeFotos` grava localmente a lista **completa e na ordem da tela**,
incluindo as fotos só locais, identificadas por `localId`
([repository.ts:1978-1982](../../src/lib/offline/repository.ts#L1978-L1982)). O motor de
sincronização já usa essa ordem local como referência ao enviar
([syncEngine.ts:2336-2364](../../src/lib/offline/syncEngine.ts#L2336-L2364)), então o servidor
recebe a ordem certa.

O problema está na **carga** da tela. As duas telas descartam as entradas locais de
`fotos_unidade` e remontam a lista em ordem fixa:

- Vistoriar Unidade: fotos locais primeiro, depois as remotas
  ([VistoriarUnidade.jsx:354-357](../../src/pages/VistoriarUnidade.jsx#L354-L357)).
- Vistoriar Ocorrência DTR: remotas primeiro, depois as locais
  ([VistoriarOcorrenciaDTR.jsx:396-397](../../src/pages/VistoriarOcorrenciaDTR.jsx#L396-L397)).

Se o fiscal reordena, salva e reabre a tela antes de sincronizar, a ordem aparece errada. Se
salvar de novo nesse estado, a ordem errada sobrescreve a certa e vai para o servidor. Isso
contraria FR-006/FR-007 e o Princípio II (offline), por isso entra no escopo (ver premissa
atualizada na spec).

## Decisões

### D1: trocar a biblioteca de arrastar só no grid de fotos por `@dnd-kit`

**Decision**: usar `@dnd-kit/core` 6.3 + `@dnd-kit/sortable` 10 + `@dnd-kit/utilities` 3 no
`PhotoGrid`, com a estratégia de ordenação para grids (`rectSortingStrategy`) e a detecção de
colisão pelo centro mais próximo (`closestCenter`), **restrita ao grid**: se o ponteiro está
fora da área do grid, não há destino. Pelo teclado não há ponteiro e vale a foto mais próxima.
Ao soltar, o destino é o item sob o ponteiro (`over`), e a nova ordem é "mover de A para B",
que é exatamente a semântica de FR-002.

*Ajuste feito na implementação*: com `closestCenter` puro, soltar fora do grid movia a foto
para a mais próxima, contrariando FR-003. Isso foi detectado pela validação automatizada
(caso 2.6 do quickstart). Detectar só "ponteiro sobre a foto" (`pointerWithin`) também
resolveria, mas faz o grid voltar à ordem original sempre que o ponteiro passa pelo espaço
entre duas fotos.

**Rationale**:
- Suporta grid de várias linhas por projeto, o que resolve a causa 1 na origem.
- Sensores de ponteiro cobrem mouse e toque com o mesmo código (FR-005). Um sensor de teclado
  vem pronto, o que dá acessibilidade sem custo.
- Enquanto a foto é arrastada, as outras se deslocam em tempo real e mostram onde ela vai
  entrar (US3, FR-011), sem código extra.
- É a biblioteca de arrastar e soltar mais usada no ecossistema React hoje, com manutenção
  ativa, compatível com React 18 (peer `react >=16.8`), sem dependência transitiva pesada.
  Atende o Princípio V: mainstream, não nicho.

**Alternatives considered**:
- *Manter `@hello-pangea/dnd` e criar um `Droppable` por linha*: o número de linhas muda com
  a largura da tela (2 ou 3 colunas), exigindo medir o layout e remapear índices entre
  listas. É mais código e mais frágil do que trocar a biblioteca, e contorna uma limitação em
  vez de resolvê-la.
- *Grid em uma única coluna ou fileira com rolagem horizontal*: faria a biblioteca atual
  funcionar, mas muda a tela que o fiscal já usa e piora a visão geral das fotos. Rejeitado
  por mudar a experiência além do pedido.
- *Arrastar e soltar nativo do HTML5*: não funciona por toque na maioria dos navegadores
  móveis, e o uso em campo é majoritariamente em celular. Rejeitado (FR-005).
- *Implementação própria com eventos de ponteiro*: sem dependência nova, mas exigiria
  reimplementar rolagem automática durante o arraste, distinção entre toque e rolagem,
  animação de deslocamento e acessibilidade. É código que só o autor saberia manter
  (Princípio V).
- *`@dnd-kit/react` (a nova API 0.x)*: ainda pré-1.0. Rejeitado por estabilidade.

**Consequência**: o projeto passa a ter duas bibliotecas de arrastar. As outras três listas
que usam `@hello-pangea/dnd` (unidades em ExecutarFiscalizacao, constatações e recomendações em
VistoriarUnidade) são listas de uma coluna, onde a biblioteca atual funciona bem, e ficam fora
do escopo (premissa da spec). Registrado em Complexity Tracking do plano.

### D2: arrastar pela alça, como hoje

**Decision**: manter a alça (ícone de "grip") no canto da foto como único ponto de início
do arraste. A alça recebe `touch-action: none`. O restante da foto continua rolável e clicável.

**Rationale**: no celular, arrastar pela foto inteira brigaria com a rolagem da página e com o
toque que abre a foto ou o botão de remover (caso de borda "não disparar sem intenção ao
rolar"). A alça já existe e o fiscal já sabe usá-la. Com a alça, o sensor de ponteiro pode
iniciar com uma pequena distância mínima (5 px) em vez de exigir toque longo, o que deixa o
gesto mais rápido.

**Alternatives considered**: foto inteira arrastável com toque longo (250 ms). Rejeitado
porque muda o gesto que o fiscal já conhece e conflita com o toque que abre a foto.

### D3: identificar fotos por chave estável e única, operar sobre índices da lista completa

**Decision**:
- Cada foto recebe uma chave estável derivada da identidade dela (`bucket:path`, `localId` ou
  URL, como `fotoKey` já faz), com sufixo de desempate quando duas fotos gerariam a mesma chave.
  A biblioteca exige chaves únicas, e o fallback atual `idx:${index}` muda quando a ordem
  muda, o que não serve para identificar uma foto que está sendo movida.
- O grid renderiza a lista visível, mas cada item carrega o índice dele na lista completa.
  Mover, remover e editar legenda usam esse índice original (corrige a causa 2).
- Mover a foto de `origem` para `destino` é `arrayMove` sobre a lista completa, usando os
  índices originais da foto arrastada e da foto de destino. Fotos ocultas ficam onde estão
  relativamente às demais e a contagem total não muda (FR-008).

**Rationale**: resolve a causa 2 sem mudar o contrato das telas: `onRemoveFoto(i)` e
`onUpdateLegenda(i, ...)` continuam recebendo um índice do array `fotos` que a tela passou,
que é o que as telas já esperam.

**Alternatives considered**: passar a identificar fotos por chave em vez de índice nos
callbacks. É mais robusto, mas muda o contrato das duas telas e o código de
remoção e legenda delas, sem necessidade para esta correção.

### D4: função compartilhada para remontar a lista ao carregar, respeitando a ordem salva

**Decision**: criar `mesclarFotosNaOrdemSalva(salvas, locais)` num módulo novo
`src/lib/fotosOrdem.js`, usado pelas duas telas no lugar da montagem atual. Regras:

1. Percorre `salvas` (o `fotos_unidade` gravado) na ordem.
2. Entrada salva com `localId` que existe em `locais`: usa a versão de `locais`, que tem a URL
   de preview válida nesta sessão.
3. Entrada salva com URL local (`blob:`, `data:`, `file:`, `capacitor:`) sem foto local
   correspondente: descarta, porque a URL morreu com a sessão anterior e a foto já foi enviada
   (vai aparecer pela entrada remota) ou removida.
4. Entrada remota: mantém.
5. Deduplica por `localId` e por `bucket:path`, como a carga atual já faz.
6. Fotos de `locais` que não estavam em `salvas` (capturadas depois do último salvamento) vão
   para o **fim**, que é onde a tela as colocou quando foram capturadas (`[...prev, foto]`).

**Rationale**: corrige a causa 3 nas duas telas com uma única regra testável. A extração se
justifica pelo Princípio V ("abstração só se paga quando já existe a repetição"): a mesma
montagem já existe duplicada, com regras divergentes, nas duas telas.

**Alternatives considered**:
- Guardar um campo `ordem` em cada foto: muda o formato persistido e exige migração do que já
  está no servidor e nos dispositivos. Desnecessário, já que a ordem do array já é gravada
  corretamente.
- Corrigir a montagem em cada tela separadamente: duas implementações para manter em sincronia,
  que é exatamente como as duas telas chegaram a regras diferentes.

**Mudança de comportamento assumida**: na Vistoriar Unidade, uma foto local que nunca foi
salva numa lista passa a aparecer no fim, e não no início. É o mesmo lugar onde ela apareceu
quando foi capturada.

### D5: testes unitários na `main` com a mesma configuração da `migracao-sisreg`

**Decision**: a `main` não tem infraestrutura de testes. Adicionar a ela `vitest` e `jsdom`
(devDependencies, mesmas versões) e o `vitest.config.ts` idêntico ao da `migracao-sisreg`,
com o script `test:unit`. Os testes desta correção ficam em `tests/unit/fotos/` e cobrem as
funções puras de `fotosOrdem.js`. O comportamento de arrastar em si é validado manualmente
pelo [quickstart.md](./quickstart.md), no computador e no celular.

**Rationale**:
- As regras que podem perder ou embaralhar dado (mover, remontar, chaves únicas) são funções
  puras, testáveis sem navegador e sem base de dados.
- Arquivos idênticos nas duas branches fazem a volta da correção para a `migracao-sisreg`
  sair sem conflito de conteúdo.
- São dependências só de desenvolvimento, que não entram no bundle de produção.

**Alternatives considered**:
- *Teste e2e com Playwright*: a suíte da `migracao-sisreg` roda contra a base real com guard
  e usuário de teste dedicado. Trazer isso para a `main` é trazer trabalho estrutural para a
  produção, o que contraria o Princípio IV. Rejeitado; o gesto de arrastar fica no roteiro
  manual.
- *Sem testes automatizados*: rejeitado, porque as regras de D3/D4 tocam a integridade da
  lista de evidências fotográficas (Princípio I).

### D6: fluxo de entrega

**Decision**: branch `002-fix-photo-drag-reorder` criada a partir da `main`. Os artefatos em
`specs/002-fix-photo-drag-reorder/` são levados para ela. Depois de validada, a branch entra na
`main` por PR. Em seguida, a `main` é mesclada na `migracao-sisreg`.

**Rationale**: Princípio IV (a `main` reflete a produção; trabalho parte dela e volta a ela) e
a instrução do usuário de entregar na `main`. Como a `main` é a produção, toda validação
(testes + roteiro manual) precisa acontecer **antes** do merge.
