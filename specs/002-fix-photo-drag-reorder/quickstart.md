# Quickstart: validar a reordenação de fotos

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Roteiro para provar que a correção funciona **antes** do merge na `main`, que é a produção.
Nenhum passo aqui escreve na base de produção além do que um fiscal faria na tela. Use uma
fiscalização de teste identificável (constituição, "Dados de teste").

## Pré-requisitos

- Branch `002-fix-photo-drag-reorder` criada a partir da `main`, com a implementação.
- `npm install` executado (traz `@dnd-kit/*`, `vitest` e `jsdom`).
- `.env.local` com as variáveis que a aplicação já usa.
- Uma fiscalização de teste com uma unidade editável contendo **7 fotos** já sincronizadas,
  e uma ocorrência DTR editável com **7 fotos**. Nomeie as legendas "1" a "7" para enxergar a
  ordem (a DTR não tem legenda; use fotos visualmente distintas).

## 1. Testes automatizados

```bash
npm run test:unit
```

Esperado: todos os casos de [contracts/fotos-ordem.md](./contracts/fotos-ordem.md) passam.

```bash
npm run lint
npm run build
```

Esperado: sem erro. O build confirma que as dependências novas entram no bundle.

## 2. Arrastar no computador (3 colunas)

`npm run dev`, abra Vistoriar Unidade da unidade de teste, aba de fotos. Parta sempre de
1 2 3 4 5 6 7 (recarregue sem salvar entre os casos).

| # | Ação | Resultado esperado |
|---|---|---|
| 2.1 | Arraste 1 pela alça e solte sobre 4 | 2 3 4 1 5 6 7 |
| 2.2 | Arraste 6 e solte sobre 2 | 1 6 2 3 4 5 7 |
| 2.3 | Arraste 7 (3ª linha) e solte sobre 1 (1ª linha) | 7 1 2 3 4 5 6 |
| 2.4 | Arraste 3 e solte sobre 7 | 1 2 4 5 6 7 3 |
| 2.5 | Arraste 5, solte sobre ela mesma | Sem mudança |
| 2.6 | Arraste 5, solte fora do grid | Sem mudança |
| 2.7 | Arraste 2 e pressione Esc | Sem mudança |
| 2.8 | Durante o arraste de qualquer caso acima | As outras fotos se deslocam e mostram onde a foto vai entrar; ao soltar, ela fica exatamente ali |
| 2.9 | Depois de 2.1, clique em remover na foto "1" | Some a foto "1", nenhuma outra |
| 2.10 | Depois de 2.1, edite a legenda da foto na 1ª posição | Muda a legenda da foto "2" |

## 3. Arrastar no celular (2 colunas, toque)

Rode `npm run tunnel` e abra a URL num celular real. A emulação do DevTools não reproduz a
disputa entre toque e rolagem.

| # | Ação | Resultado esperado |
|---|---|---|
| 3.1 | Repita 2.1 a 2.4 pela alça, com o dedo | Mesmos resultados de 2.x |
| 3.2 | Role a página tocando no meio de uma foto | Rola; nenhuma foto é arrastada |
| 3.3 | Toque rápido numa foto | Abre a foto, como hoje |
| 3.4 | Arraste a foto 1 até a última, com a lista maior que a tela | A página rola sozinha perto da borda e a foto chega ao fim |

## 4. Ordem gravada

| # | Ação | Resultado esperado |
|---|---|---|
| 4.1 | Faça 2.2, salve, saia da unidade e volte | 1 6 2 3 4 5 7 |
| 4.2 | Com a ordem de 4.1, gere o documento da vistoria | Fotos na ordem 1 6 2 3 4 5 7, cada legenda com a sua foto |
| 4.3 | Repita 4.1 na Vistoriar Ocorrência DTR | Ordem mantida |

## 5. Offline (Princípio II)

No DevTools, aba Network, selecione **Offline** (ou use o modo avião no celular).

| # | Ação | Resultado esperado |
|---|---|---|
| 5.1 | Offline, capture 2 fotos novas (8 e 9) na unidade | Aparecem no fim: 1..7 8 9 |
| 5.2 | Arraste 9 sobre 2 e 8 sobre 5; salve | 1 9 2 3 4 8 5 6 7 |
| 5.3 | Ainda offline, saia da unidade e volte | **1 9 2 3 4 8 5 6 7** (hoje as fotos 8 e 9 aparecem no início) |
| 5.4 | Volte a ficar online e espere a sincronização terminar; reabra | Mesma ordem, agora com todas as fotos no servidor |
| 5.5 | Gere o documento | Mesma ordem, 9 fotos |
| 5.6 | Repita 5.1 a 5.4 na Vistoriar Ocorrência DTR | Mesma ordem mantida (hoje as fotos locais aparecem no fim) |

## 6. Somente leitura

| # | Ação | Resultado esperado |
|---|---|---|
| 6.1 | Abra uma unidade finalizada, sem modo de edição | Sem alça; as fotos não podem ser arrastadas |
| 6.2 | Abra uma ocorrência de fiscalização finalizada | Idem |

## 7. Outras listas que continuam com a biblioteca antiga (regressão)

| # | Ação | Resultado esperado |
|---|---|---|
| 7.1 | Reordene as unidades em Executar Fiscalização | Funciona como antes |
| 7.2 | Reordene constatações e recomendações em Vistoriar Unidade | Funciona como antes |

## Critério de pronto para o merge

Todos os itens de 1 a 7 passam, no computador e num celular real. Registre no PR o modelo
do celular e o navegador usados.
