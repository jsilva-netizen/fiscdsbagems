# Feature Specification: Reordenação de Fotos por Arrastar e Soltar

**Feature Branch**: `002-fix-photo-drag-reorder` (a partir de `main`, entrega em `main`)

**Created**: 2026-09-24

**Status**: Implemented (validação manual em celular real e com dados reais pendente: T017, T024)

**Input**: User description: "Preciso fazer uma alteração no código e jogar pra branch main. A alteração é: a reordenação de imagens via arrastar e soltar no grid de imagens não funciona direito atualmente. as imagens só vão pra alguns lugares específicos. ele deve funcionar assim: se eu arrastar e soltar uma imagem em cima da outra, a que eu arrastei deve \"entrar' no lugar da que estava em baixo, e esta ser \"jogada\" para o lado."

## Contexto do Problema

O grid de fotos das telas de vistoria (Vistoriar Unidade e Vistoriar Ocorrência DTR) permite ao fiscal
reordenar as fotos arrastando-as. A ordem das fotos importa porque é a ordem em que elas aparecem nos
documentos gerados a partir da vistoria (relatórios e autos).

Hoje o grid exibe as fotos em várias linhas (2 colunas no celular, 3 no computador), mas o arrastar
e soltar só aceita a foto em algumas posições específicas: soltar a foto sobre uma imagem de outra linha,
ou sobre determinadas posições da mesma linha, não a coloca onde o fiscal soltou. O fiscal não consegue
colocar as fotos na ordem que quer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Soltar uma foto sobre outra coloca a foto naquela posição (Priority: P1)

O fiscal arrasta uma foto do grid e a solta sobre outra foto, em qualquer linha ou coluna. A foto
arrastada passa a ocupar exatamente a posição da foto que estava embaixo, e esta (junto com as demais
entre as duas posições) é deslocada uma posição para o lado, abrindo espaço.

**Why this priority**: É a correção do defeito relatado. Sem ela o fiscal não consegue definir a
ordem das fotos que vai para os documentos da vistoria.

**Independent Test**: Numa vistoria editável com ao menos 7 fotos (três linhas no computador, quatro
no celular), arrastar cada foto para posições de outras linhas e colunas e conferir que ela sempre
termina na posição da foto sobre a qual foi solta.

**Acceptance Scenarios**:

Considere o grid com as fotos A B C D E F G, nessa ordem (posições 1 a 7).

1. **Given** o grid A B C D E F G, **When** o fiscal arrasta A e a solta sobre D, **Then** a ordem passa a ser B C D A E F G (A ocupa a posição 4; B, C e D recuam uma posição).
2. **Given** o grid A B C D E F G, **When** o fiscal arrasta F e a solta sobre B, **Then** a ordem passa a ser A F B C D E G (F ocupa a posição 2; B, C, D e E avançam uma posição).
3. **Given** o grid com 3 colunas e as fotos A a G, **When** o fiscal arrasta G (terceira linha) e a solta sobre A (primeira linha), **Then** G passa a ser a primeira foto e as demais avançam uma posição, mesmo com linhas diferentes entre origem e destino.
4. **Given** o grid A B C D E F G, **When** o fiscal arrasta C e a solta sobre a posição da última foto (G), **Then** C passa a ser a última foto.
5. **Given** qualquer ordem, **When** o fiscal solta a foto sobre ela mesma ou fora do grid, **Then** a ordem não muda.

---

### User Story 2 - A nova ordem é mantida (Priority: P1)

Depois de reordenar, a nova ordem é a que vale: permanece ao recarregar a tela, ao sair e voltar na
vistoria, e é a ordem usada nos documentos gerados a partir dela. Isso vale também quando o fiscal está
sem conexão.

**Why this priority**: Uma reordenação que se perde não tem valor. O fiscal trabalha em campo sem
sinal, e a funcionalidade precisa respeitar isso.

**Independent Test**: Reordenar as fotos, sair da tela e voltar (com e sem conexão), e gerar o
documento da vistoria; a ordem deve ser a mesma em todos os casos.

**Acceptance Scenarios**:

1. **Given** o fiscal reordenou as fotos e salvou, **When** ele sai da vistoria e volta, **Then** as fotos aparecem na nova ordem.
2. **Given** o fiscal reordenou as fotos sem conexão, **When** a conexão volta e a vistoria sincroniza, **Then** a ordem salva no servidor é a que o fiscal definiu.
3. **Given** as fotos foram reordenadas, **When** o documento da vistoria é gerado, **Then** as fotos aparecem nele na nova ordem.
4. **Given** as fotos foram reordenadas, **When** o fiscal consulta as legendas, **Then** cada legenda continua associada à mesma foto de antes.
5. **Given** a vistoria tem fotos ainda não sincronizadas misturadas com fotos já enviadas, e o fiscal reordenou e salvou sem conexão, **When** ele reabre a tela ainda sem conexão, **Then** as fotos aparecem na ordem salva, e não com as fotos locais agrupadas no início ou no fim.

---

### User Story 3 - Retorno visual durante o arraste (Priority: P2)

Enquanto o fiscal arrasta, o grid mostra onde a foto vai entrar: a foto que está sob o cursor (ou dedo)
é destacada ou as demais já se deslocam, de forma que o resultado ao soltar seja previsível.

**Why this priority**: Melhora a confiança do fiscal, mas a correção da posição final (P1) já resolve
o defeito relatado.

**Independent Test**: Arrastar uma foto lentamente por várias posições e verificar que a indicação
visual corresponde à posição final ao soltar.

**Acceptance Scenarios**:

1. **Given** o fiscal está arrastando uma foto, **When** ela passa sobre outra foto, **Then** o grid indica visualmente que a foto vai entrar naquela posição.
2. **Given** o grid indica uma posição de destino, **When** o fiscal solta, **Then** a foto termina exatamente na posição indicada.

---

### Edge Cases

- Grid com uma única foto: não há o que reordenar; arrastar não deve causar erro nem alterar nada.
- Grid com duas fotos: soltar a primeira sobre a segunda inverte as duas.
- Última linha incompleta (ex.: 7 fotos em 3 colunas): deve ser possível soltar sobre a última foto e em qualquer foto da última linha.
- Mudança de largura da tela (celular 2 colunas × computador 3 colunas): o comportamento é o mesmo nos dois layouts.
- Uso por toque (celular/tablet em campo): o arrastar deve funcionar por toque e não deve disparar sem intenção ao rolar a tela.
- Vistoria não editável (somente leitura) ou tela sem permissão de reordenar: fotos não podem ser arrastadas.
- Fotos ainda não sincronizadas (existentes só no dispositivo) misturadas com fotos já enviadas: devem ser reordenáveis entre si sem perda de nenhuma delas.
- Fotos sem imagem válida que hoje são ocultadas do grid: a reordenação das fotos visíveis não pode descartar, duplicar nem trocar essas fotos ocultas; o número total de fotos da vistoria deve ser o mesmo antes e depois.
- Soltar durante um envio de foto em andamento: a foto recém-enviada não pode ser perdida nem a ordem ser sobrescrita.
- Ações sobre a foto (abrir, remover, editar legenda) depois de reordenar devem agir sobre a foto clicada, e não sobre a que ocupava aquela posição antes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST permitir soltar a foto arrastada sobre qualquer outra foto do grid, em qualquer linha e coluna.
- **FR-002**: Ao soltar a foto arrastada sobre outra, o sistema MUST colocar a foto arrastada na posição da foto de destino e deslocar em uma posição a foto de destino e as que estão entre as duas, preservando a ordem relativa de todas as demais fotos.
- **FR-003**: O sistema MUST manter a ordem inalterada quando a foto for solta sobre ela mesma ou fora do grid.
- **FR-004**: O comportamento de reordenação MUST ser o mesmo nas duas telas que exibem o grid de fotos (Vistoriar Unidade e Vistoriar Ocorrência DTR) e em todos os layouts de colunas do grid.
- **FR-005**: O sistema MUST permitir o arrastar e soltar tanto por mouse quanto por toque.
- **FR-006**: O sistema MUST persistir a nova ordem de forma que ela seja mantida ao recarregar a vistoria e usada nos documentos gerados a partir dela.
- **FR-007**: A reordenação MUST funcionar sem conexão e a ordem definida offline MUST ser a ordem salva após a sincronização.
- **FR-008**: A reordenação MUST NOT perder, duplicar ou alterar nenhuma foto, legenda ou metadado de foto (incluindo fotos ocultas do grid e fotos ainda não sincronizadas).
- **FR-009**: Depois de uma reordenação, remover, abrir ou editar a legenda de uma foto MUST agir sobre a foto selecionada pelo fiscal.
- **FR-010**: O sistema MUST impedir o arraste quando a vistoria não for editável.
- **FR-011**: Durante o arraste, o sistema SHOULD indicar visualmente a posição onde a foto vai entrar.

### Key Entities

- **Foto da vistoria**: imagem registrada pelo fiscal numa unidade vistoriada ou ocorrência, com legenda e dados de localização; pode existir já sincronizada ou só no dispositivo.
- **Ordem das fotos**: sequência das fotos de uma vistoria, definida pelo fiscal, que determina a ordem de exibição no grid e nos documentos gerados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% das tentativas de soltar uma foto sobre outra, em qualquer posição do grid, a foto termina na posição da foto de destino.
- **SC-002**: Qualquer ordem desejada para 9 fotos pode ser obtida pelo fiscal com no máximo 8 movimentos de arrastar.
- **SC-003**: Depois de reordenar, 100% das fotos da vistoria continuam presentes, com a mesma legenda, e na nova ordem, tanto no grid (após recarregar) quanto no documento gerado.
- **SC-004**: A ordem definida sem conexão é a ordem vista no servidor após a sincronização, em 100% dos casos testados.
- **SC-005**: Deixam de ocorrer relatos de "a foto não vai para onde eu solto" nas telas de vistoria.

## Assumptions

- "Jogada para o lado" significa deslocamento (a foto de destino e as intermediárias andam uma posição), e não troca de lugar entre as duas fotos. É o comportamento padrão de listas reordenáveis e o que corresponde a "entrar no lugar" da outra foto.
- O deslocamento segue a ordem de leitura do grid (esquerda para direita, de cima para baixo): quando a foto arrastada vem de antes, a de destino recua; quando vem de depois, a de destino avança.
- A ordem é gravada pelo mesmo fluxo de salvar que já existe nas telas (reordenar é uma alteração como remover foto ou editar legenda, e vale a partir do salvamento). Com todas as fotos já sincronizadas, a ordem salva é mantida hoje. Com fotos ainda não sincronizadas, a ordem salva é descartada ao reabrir a tela: as fotos locais vão sempre para o início (Vistoriar Unidade) ou para o fim (Vistoriar Ocorrência DTR). Essa perda está dentro do escopo, porque sem corrigi-la a história 2 não se cumpre em campo.
- As duas telas que usam o grid (Vistoriar Unidade e Vistoriar Ocorrência DTR) exibem o mesmo grid de fotos, então a correção vale para ambas.
- A reordenação de outros elementos (unidades da fiscalização, constatações, recomendações) está fora de escopo.
- A correção é entregue na `main`, que reflete a produção. Por ser correção de defeito em funcionalidade existente, sem mudança de dados nem de schema, ela se enquadra como correção permitida na produção pelo Princípio IV da constituição. O trabalho deve partir da `main`, e não da branch `migracao-sisreg`, e depois ser levado também para a `migracao-sisreg` para as duas não divergirem.
