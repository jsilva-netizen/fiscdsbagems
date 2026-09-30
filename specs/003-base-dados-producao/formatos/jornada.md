# Molde: jornada de validação

Molde para as jornadas por perfil de usuário (FR-020; research D10). A jornada valida as specs
de módulo pelo uso: cada passo aponta para as regras (`R-<módulo>-NNN`) que dizem o que o sistema
deve fazer ali. Passo sem regra é marcado **`LACUNA`**: falta especificar algo, ou a jornada
descreveu um comportamento que nenhuma spec cobre.

## Como usar

1. Uma jornada por objetivo de um perfil: fiscal, coordenador, administrador ou prestador (e
   diretor, quando houver).
2. Os passos seguem a ordem em que a pessoa trabalha, com as condições reais (sem rede, com rede
   ruim, com dados de outra câmara...).
3. Cada passo diz a ação do usuário, o resultado esperado e as regras que o garantem.
4. Passo sem regra leva `LACUNA` no lugar das regras. Toda `LACUNA` vira pendência de uma spec de
   módulo antes de a jornada ser dada como validada.
5. A jornada é validada quando não tem `LACUNA` e cada resultado esperado bate com as regras
   citadas.

## Formato

```markdown
# Jornada: <perfil> <objetivo>

- **Perfil**: <fiscal | coordenador | administrador | prestador | diretor>
- **Condições**: <sem rede, câmara, papel...>
- **Specs envolvidas**: <specs de módulo citadas>

| # | Ação do usuário | Resultado esperado | Regras |
|---|---|---|---|
| 1 | <o que a pessoa faz> | <o que o sistema mostra ou grava> | R-<módulo>-NNN, ... |
| 2 | ... | ... | `LACUNA` — <o que falta especificar> |
```

## Exemplo

Três passos da jornada "fiscal vistoria uma unidade offline". Os identificadores de regra são
ilustrativos, exceto `R-checklists-001` (exemplo do [molde de spec](./spec-modulo.md)); o terceiro
passo está em `LACUNA` de propósito.

# Jornada: fiscal vistoria uma unidade offline

- **Perfil**: fiscal
- **Condições**: sem rede; fiscalização já baixada no aparelho; câmara CATESA
- **Specs envolvidas**: checklists, fiscalização

| # | Ação do usuário | Resultado esperado | Regras |
|---|---|---|---|
| 1 | Abre a unidade e responde o checklist | O checklist mostra, para cada item, o texto vigente quando a unidade foi criada, mesmo que o item tenha mudado depois | R-checklists-001 |
| 2 | Tira fotos da unidade | As fotos ficam guardadas no aparelho, com marca d'água e legenda, e entram na fila de envio; aparecem na unidade na ordem em que foram tiradas | R-fiscalizacao-0NN (fila de fotos offline) |
| 3 | Marca a unidade como vistoriada, ainda sem rede | `LACUNA` — nenhuma regra diz o que o fiscal vê enquanto a finalização da unidade não é sincronizada (situação local, possibilidade de desfazer, conflito se outra pessoa alterar a unidade) | `LACUNA` |
