# Molde: spec de módulo

Molde para as specs de módulo (a partir da 004), sobre o template de spec do Spec Kit
(`.specify/templates/spec-template.md`). Mantém as seções do template (histórias, requisitos,
entidades, critérios de sucesso, premissas) e acrescenta duas seções: **Regras do módulo**, que é
onde o sistema atual é descrito regra a regra (FR-019; research D10), e **Telas do sistema atual**,
que confere se toda ação que o usuário faz hoje nas telas do módulo tem regra.

## Como usar

1. Gere a spec com `/speckit-specify`, como de costume.
2. Acrescente a seção "Regras do módulo" logo depois de "Requirements", com um bloco por regra.
3. Toda regra cita os objetos do catálogo que a implementam hoje (chaves do
   [mapa de rastreabilidade](../mapa-rastreabilidade.md)). Quando a spec for aprovada, preencha
   `spec` do módulo em `anotacoes/modulos.toml`: os objetos saem de `LACUNA`.
4. Quando o comportamento desejado difere do atual, a regra diz o atual e o motivo, e aponta a
   origem da decisão: um achado (`A-NNN`, em [achados.md](../achados.md)) ou uma divergência
   ([divergencias.md](../divergencias.md)). Regra que depende de achado ainda sem decisão fica
   marcada **aguardando decisão** e não vai para o plano.
5. Acrescente a seção "Telas do sistema atual" logo depois de "Regras do módulo" (ver abaixo).
   O catálogo cobre o banco; as telas cobrem o que o banco não mostra (botões, filtros,
   confirmações, campos que a tela oferece ou esconde).
6. As jornadas ([molde](./jornada.md)) citam as regras pelo identificador.
7. Com o data-model do plano, crie ou complete `anotacoes/migracao/<módulo>.toml`: o destino de
   cada coluna e repositório de arquivos do módulo, ou o motivo do descarte (formato em
   [contracts/anotacoes.md](../contracts/anotacoes.md)). O gerador confere os destinos contra o
   data-model, e a meta é 0 pendentes em [migracao.md](../migracao.md). A seção "Migração" da spec
   diz o critério de sucesso: mesmos identificadores, valores conferidos e arquivos por checksum.

## Bloco de regra

```markdown
### R-<módulo>-NNN — <nome curto da regra>

- **Comportamento desejado**: <o que o sistema novo faz, testável, sem detalhe de implementação>
- **Comportamento atual**: <só quando diferente do desejado; senão "igual ao desejado">
- **Motivo da diferença**: <por que muda; obrigatório quando há comportamento atual diferente>
- **Objetos do catálogo**: `<chave>`, `<chave>`, ...
- **Origem**: <A-NNN ou divergência `<chave>`, com a decisão; "—" se não há>
```

Regras:

- `<módulo>` é o `id` de `anotacoes/modulos.toml` (`core`, `checklists`, `fiscalizacao`...).
  `NNN` é sequencial dentro do módulo e nunca é reaproveitado.
- "Comportamento desejado" é o que vale para o sistema novo. Ele preserva a funcionalidade atual,
  a menos que um achado decidido diga outra coisa (constituição, "Levantamento em specs").
- "Objetos do catálogo" usa as chaves exatas do catálogo (`tabela:`, `coluna:`, `funcao:`...).
  Chave que não existe no catálogo é erro de digitação.
- Uma regra descreve um comportamento. Se precisar de "e também", provavelmente são duas.

## Seção "Telas do sistema atual"

Uma tabela por tela do sistema atual que pertence ao módulo, com uma linha por ação que o usuário
faz nela: botão, aba, filtro, campo do formulário, confirmação, importação ou exportação.

```markdown
### <Nome da tela> (`src/pages/<Arquivo>.jsx`)

| Ação | Regra |
|---|---|
| <o que o usuário faz, como a tela faz hoje> | R-<módulo>-NNN |
| <ação que o sistema novo retira> | R-<módulo>-NNN (retirada: <motivo curto>) |
| <ação de outro módulo nesta tela> | fora: <módulo> (<spec, se já existe>) |
| <ação que nenhuma regra cobre> | LACUNA: <o que falta decidir> |
```

Regras:

- Toda ação tem na coluna "Regra" um identificador de regra, `fora: <módulo>` ou `LACUNA`.
  `LACUNA` é resolvida antes do plano: vira regra nova, regra ampliada ou `fora`.
- A ação é descrita como é hoje, inclusive o que parece defeito (confirmação digitando "EXCLUIR",
  campo que a tela não oferece). O que muda está na regra citada, não aqui.
- Telas que o sistema novo não terá entram também, com a regra ou o achado que as retira.
- Quando o comportamento visto na tela diverge do que o responsável relata, a linha diz "a
  confirmar" e a divergência vai para a regra (comportamento atual) até ser conferida.

## Exemplo

Regra real e curta, tirada do catálogo. Ela depende do A-024, ainda sem decisão; o exemplo mostra
como fica com a recomendação do achado.

### R-checklists-001 — Vistoria usa o texto do checklist vigente na criação da unidade

- **Comportamento desejado**: cada item do checklist tem versões com início de vigência. Editar
  um item cria uma versão nova; excluir encerra a vigência. A vistoria de uma unidade usa, para
  cada item, a versão vigente quando a unidade foi criada, e continua mostrando esse texto mesmo
  depois de o item mudar. A lista de itens atuais de um tipo de unidade mostra só a versão vigente
  de cada item.
- **Comportamento atual**: o versionamento é implícito. Nenhuma linha é alterada nem apagada: a
  "chave" do item é o tipo mais a ordem (ou a pergunta), a linha mais recente de cada chave é a
  que vale, e excluir insere uma versão inativa. A coluna `ativo` não diz se a linha vale: das 768
  linhas de produção, 525 são itens vigentes e 243 versões antigas, todas com `ativo = true`.
- **Motivo da diferença**: a regra implícita (chave por tipo e ordem, "mais recente vence") é
  difícil de manter e já gerou versões duplicadas por reimportação da planilha. Versão com
  vigência explícita preserva o mesmo efeito para a vistoria.
- **Objetos do catálogo**: `tabela:itens_checklist`, `coluna:itens_checklist.ativo`,
  `coluna:itens_checklist.ordem`, `tabela:respostas_checklist`, `coluna:respostas_checklist.pergunta`
- **Origem**: A-024 (aguardando decisão; recomendação: versionamento com modelo explícito).
