# Contrato: módulo `fotosOrdem`

**Arquivo**: `src/lib/fotosOrdem.js` (novo)
**Consumidores**: `PhotoGrid.jsx` (`chavesDasFotos`, `moverFoto`), `VistoriarUnidade.jsx` e
`VistoriarOcorrenciaDTR.jsx` (`mesclarFotosNaOrdemSalva`)
**Testes**: `tests/unit/fotos/fotosOrdem.test.js`

Funções puras: não leem nem escrevem IndexedDB, rede ou estado de tela, e não alteram os
argumentos recebidos.

## `chavesDasFotos(fotos) → string[]`

- Retorna uma chave por foto, alinhada por índice (`resultado[i]` é a chave de `fotos[i]`).
- Prioridade de identidade e desempate: ver [data-model.md](../data-model.md#identidade-chave-da-foto).
- Garantias: todas as chaves são distintas. A mesma lista gera sempre as mesmas chaves. A
  chave de uma foto identificada por `bucket:path`, `localId` ou URL não muda quando a foto
  muda de posição.

## `moverFoto(fotos, origem, destino) → Foto[]`

- `origem` e `destino` são índices da lista completa.
- Retorna uma **nova** lista com a foto de `origem` na posição `destino`, conforme as
  invariantes de [data-model.md](../data-model.md#invariantes-da-operação-mover).
- Índice fora dos limites ou `origem == destino`: retorna uma cópia igual à entrada.

Casos de teste obrigatórios (A–G = índices 0–6), vindos dos cenários da spec:

| Entrada | Chamada | Saída |
|---|---|---|
| A B C D E F G | `moverFoto(l, 0, 3)` | B C D A E F G |
| A B C D E F G | `moverFoto(l, 5, 1)` | A F B C D E G |
| A B C D E F G | `moverFoto(l, 6, 0)` | G A B C D E F |
| A B C D E F G | `moverFoto(l, 2, 6)` | A B D E F G C |
| A B | `moverFoto(l, 0, 1)` | B A |
| A | `moverFoto(l, 0, 0)` | A |

Com foto oculta: lista `[B, X(oculta), C, D]`, arrastar D sobre B → `moverFoto(l, 3, 0)` →
`[D, B, X, C]`. X continua presente, logo depois de B, e o tamanho continua 4.

## `mesclarFotosNaOrdemSalva(salvas, locais) → Foto[]`

- `salvas`: o `fotos_unidade` gravado (pode conter strings, entradas locais e remotas, ou ser
  `null`/`undefined`, tratado como `[]`).
- `locais`: fotos de `Repository.listLocalFotos(unidadeId)`, já mapeadas pela tela para
  `{ localId, url, legenda, mimeType, width, height }`.
- Regras e invariantes: ver [data-model.md](../data-model.md#regras-de-remontagem-na-carga-ordem-salva--fotos-locais).

Casos de teste obrigatórios (`L1`, `L2` = fotos locais; `R1`, `R2` = remotas):

| `salvas` | `locais` | Saída |
|---|---|---|
| R1, L1(blob antigo), R2 | L1 | R1, L1(preview novo), R2 |
| L2, R1, L1 | L1, L2 | L2, R1, L1 |
| R1, R2 | L1 | R1, R2, L1 (capturada depois de salvar vai para o fim) |
| R1, L1(blob antigo) | *(vazio)* | R1 (L1 já enviada ou removida) |
| R1 | L1 (já enviada, com URL que aponta para o mesmo `bucket:path` de R1) | R1 uma vez só |
| *(vazio)* | L1, L2 | L1, L2 |
| `null` | *(vazio)* | *(vazio)* |
