# Contrato: componente `PhotoGrid`

**Arquivo**: `src/components/fiscalizacao/PhotoGrid.jsx`
**Consumidores**: `src/pages/VistoriarUnidade.jsx`, `src/pages/VistoriarOcorrenciaDTR.jsx`

A correção mantém as props e as assinaturas dos callbacks. O que muda é a **garantia** sobre
os índices e sobre a lista entregue em `onReorderFotos`. As telas não precisam mudar a forma
como chamam o componente.

## Props envolvidas

| Prop | Tipo | Contrato |
|---|---|---|
| `fotos` | `Array<Foto \| string>` | Lista completa, na ordem atual. Pode conter fotos não visíveis (ver [data-model.md](../data-model.md#visibilidade)) |
| `isEditable` | `boolean` | `false` impede o arraste (FR-010), a remoção e a edição de legenda |
| `onReorderFotos` | `(proxima: Foto[]) => void` \| ausente | Ausente impede o arraste |
| `onRemoveFoto` | `(indice: number) => void` | |
| `onUpdateLegenda` | `(indice: number, legenda: string) => void` | |

## Garantias

### `onReorderFotos(proxima)`

- Chamado **uma vez** por arraste concluído, só quando a posição muda. Não é chamado ao soltar
  sobre a própria foto, fora do grid, ou quando o arraste é cancelado (tecla Esc).
- `proxima` é a lista **completa**, com as fotos não visíveis incluídas, e obedece às
  invariantes de "mover" de [data-model.md](../data-model.md#invariantes-da-operação-mover).
- Os itens de `proxima` são os mesmos objetos recebidos (fotos em string já normalizadas para
  objeto, como hoje). Nenhum campo é alterado.

### Índices em `onRemoveFoto` e `onUpdateLegenda`

- `indice` é **sempre** a posição da foto em `fotos` (a prop, lista completa), e não a posição
  dela no grid visível. **Isso corrige o comportamento atual**, que passava a posição no grid.
- Aplicar `indice` em `fotos` atinge a foto em que o fiscal clicou (FR-009).

## Interação

| Aspecto | Comportamento |
|---|---|
| Início do arraste | Pela alça no canto superior esquerdo da foto. Mouse ou toque, depois de 5 px de movimento. Teclado: foco na alça + Espaço |
| Durante | As outras fotos se deslocam para mostrar onde a arrastada vai entrar (FR-011). Funciona em 2 e em 3 colunas |
| Destino | A foto mais próxima do ponteiro ao soltar, desde que o ponteiro esteja dentro do grid. A arrastada ocupa a posição dela (FR-002). Com o ponteiro fora do grid não há destino (FR-003) |
| Cancelar | Soltar fora do grid ou pressionar Esc: nada muda |
| Toque fora da alça | Rola a página, abre a foto e mostra o botão de remover, como hoje |
