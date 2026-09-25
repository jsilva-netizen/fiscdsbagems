# Data Model: Reordenação de Fotos por Arrastar e Soltar

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Esta correção **não altera nenhum formato persistido**: nem colunas no servidor, nem tabelas
locais do IndexedDB. A ordem das fotos já é a ordem do array `fotos_unidade` e continua sendo.
Este documento registra as regras que o código passa a garantir sobre esses dados.

## Foto (item de `fotos_unidade`)

Formato existente, sem mudança. Campos relevantes para esta feature:

| Campo | Presente quando | Papel aqui |
|---|---|---|
| `bucket`, `path` | Foto já enviada ao armazenamento | Identidade da foto remota |
| `url` | Sempre que há imagem | Identidade de reserva; URL local (`blob:`, `data:`, `file:`, `capacitor:`) indica foto só no dispositivo |
| `localId` | Foto capturada no dispositivo (pode continuar presente depois de enviada) | Identidade da foto local; liga a entrada de `fotos_unidade` à linha de `fotos_local` |
| `legenda` | Opcional | Deve acompanhar a foto em qualquer reordenação |
| `mimeType`, `width`, `height` | Opcional | Metadados, preservados sem alteração |

Um item também pode vir como string (URL pura) em dados antigos. O grid já o normaliza para
`{ url, legenda: '' }` e isso continua igual.

### Identidade (chave da foto)

Chave usada para identificar a foto durante o arraste e para deduplicar na carga. A prioridade
é a da função `fotoKey` atual:

1. `bucket:path`
2. `local:<localId>`
3. `url:<url>`
4. Sem nenhum dos três: chave posicional

Regra nova: as chaves de uma lista são **únicas**. Se duas fotos gerarem a mesma chave, a
segunda recebe um sufixo de desempate (`#2`, `#3`, ...). O desempate é determinístico: depende
só da ordem da lista, de modo que a mesma lista gera sempre as mesmas chaves.

### Visibilidade

Uma foto é **visível** no grid se tem `url`, ou `bucket` e `path`, ou `localId`. As não
visíveis continuam na lista e são gravadas normalmente. Só não aparecem no grid.

## Lista de fotos (`fotos_unidade`)

Sequência ordenada. A posição no array é a ordem de exibição e a ordem nos documentos.

### Invariantes da operação "mover"

Mover a foto visível de índice original `o` para a posição da foto visível de índice original
`d`:

- **Contagem**: `tamanho(depois) == tamanho(antes)`.
- **Conteúdo**: o multiconjunto de fotos é o mesmo. Nenhuma foto some, duplica ou tem
  campo alterado (inclusive `legenda`).
- **Posição**: a foto movida termina no índice `d`.
- **Deslocamento**: se `o < d`, os itens em `o+1..d` recuam uma posição. Se `o > d`, os itens
  em `d..o-1` avançam uma posição. Os demais ficam onde estavam.
- **Nulo**: se `o == d`, ou se não há destino, a lista não muda.

### Regras de remontagem na carga (ordem salva + fotos locais)

Entrada: `salvas` (o `fotos_unidade` gravado) e `locais` (as linhas de `fotos_local` da
unidade, com URL de preview válida nesta sessão). Saída: lista a exibir.

| Caso da entrada salva | Resultado |
|---|---|
| Tem `localId` presente em `locais` | Entra na posição dela, com os dados de `locais` (preview válido e legenda, como a carga atual já faz, porque a legenda da linha local é atualizada na hora em que é editada) |
| URL local e nenhuma foto local com o mesmo `localId` | Descartada (URL da sessão anterior; foto já enviada ou removida) |
| Remota (`bucket`+`path` ou URL não local) | Entra na posição dela |
| Mesma identidade de uma entrada já incluída (`localId` ou `bucket:path`) | Ignorada (deduplicação) |

Depois de percorrer `salvas`, as fotos de `locais` ainda não incluídas vão para o fim, na
ordem em que `locais` as lista.

**Invariantes**:
- Toda foto de `locais` aparece exatamente uma vez na saída (Princípio II: dado só no
  dispositivo é dado de produção).
- Toda foto remota de `salvas` aparece exatamente uma vez.
- A ordem relativa das entradas de `salvas` é preservada.

## Transições de estado

Não há estado novo. A reordenação é uma alteração não salva da tela, como remover foto ou
editar legenda, e segue o mesmo ciclo que já existe:

```text
carregada ──(arrastar)──> alterada (fotosDirty) ──(salvar)──> gravada localmente ──(sync)──> no servidor
```
