# Quickstart — Executar e Validar

**Feature**: Camada de Abstração de Acesso a Dados
**Date**: 2026-09-18

Guia de execução e validação. Não contém implementação — o detalhamento das tarefas vive em
`tasks.md`, gerado por `/speckit-tasks`.

## Pré-requisitos

| Item | Observação |
|---|---|
| Node.js e dependências do projeto | `npm install` na raiz |
| Branch correta | `migracao-sisreg` — nunca `main` |
| Variáveis de ambiente do aplicativo | `.env.local` com a URL e a chave pública, como hoje |
| Usuário dedicado de teste | Conta própria, jamais uma conta real de fiscal |
| Confirmação da base alvo | Variável de ambiente exigida pela trava (FR-018) |

> **A trava existe por um motivo.** A suíte grava e apaga numa base real. Sem a variável de
> confirmação correspondendo à base alvo, a execução aborta antes de qualquer requisição.
> Se ela abortar, leia a mensagem em vez de contornar: ela está fazendo o trabalho dela.

## Preparação

```bash
git switch migracao-sisreg
npm install
npx playwright install    # baixa os navegadores, só na primeira vez
```

## Comandos

| Objetivo | Comando |
|---|---|
| Testes de unidade da camada | `npm run test:unit` |
| Suíte ponta a ponta completa | `npm run test:e2e` |
| Apenas o ciclo offline | `npm run test:e2e -- tests/e2e/offline` |
| Apenas fluxos de escrita | `npm run test:e2e -- tests/e2e/escrita` |
| Apenas permissões | `npm run test:e2e -- tests/e2e/permissoes` |
| Verificar a fronteira da camada | `npm run lint` |
| Varrer resíduo de execução interrompida | `npm run test:sweep` |

## O que cada suíte prova

### `tests/e2e/offline` — a mais importante

Simula o dispositivo sem conectividade, executa o roteiro completo de campo — registrar
fiscalização, percorrer checklist da unidade, capturar foto com coordenadas — religa a rede
e confere que tudo chegou íntegro.

**Resultado esperado**: todos os registros, respostas e fotos presentes após a
sincronização, na mesma ordem, sem duplicação.

**Cobre**: FR-005, FR-006, FR-020, história P1, SC-003.

Inclui o cenário de fila criada antes da mudança (FR-013), que é onde mora o risco de perda
silenciosa: uma fila gerada pela versão anterior precisa continuar sendo processada pela
nova.

### `tests/e2e/escrita`

Todo fluxo que grava dado, em todos os módulos e perfis.

**Resultado esperado**: cada operação produz o mesmo efeito de hoje, e as falhas produzem a
mesma mensagem.

**Cobre**: FR-004, FR-010, história P2, SC-001.

### `tests/e2e/leitura`

Um caminho por módulo, conforme a cobertura ponderada por risco definida na clarificação.

### `tests/e2e/permissoes`

Acesso negado entre câmaras técnicas e entre perfis.

**Resultado esperado**: nenhuma regra afrouxada nem endurecida.

**Cobre**: FR-009, e é o primeiro passo concreto do Princípio III da constituição, que hoje
não tem nenhuma base.

### `npm run lint` — a fronteira

Falha se qualquer arquivo fora de `src/lib/data/providers/supabase/` importar o cliente.

**Cobre**: FR-002, FR-007, SC-002, SC-005.

> Durante a migração esta regra fica desligada e só é ligada quando o último consumidor
> migrar — caso contrário o build quebra durante toda a transição.

## Validar que a limpeza funcionou

Depois de qualquer execução:

1. Consulte os registros do usuário de teste nas tabelas dos módulos exercitados.
2. **Esperado**: nenhum. A limpeza roda ao final (FR-015).
3. Se houver resíduo, a execução foi interrompida. Rode `npm run test:sweep`, que também é
   executado automaticamente no início da próxima execução (FR-016).

Se o resíduo persistir depois da varredura, **pare e investigue** antes de rodar de novo: é
sinal de que a rotina de limpeza não cobre alguma tabela, e isso contamina a métrica binária
de completude da migração final.

## Validar que a suíte realmente verifica

Exigência do SC-008, e o passo mais fácil de esquecer:

1. Introduza de propósito uma regressão num fluxo crítico.
2. Rode a suíte.
3. **Esperado**: falha apontando o fluxo afetado.
4. Desfaça a alteração.

Suíte que passa sempre não prova nada. Este exercício deve ser refeito a cada ampliação
relevante da cobertura.

## Problemas comuns

**A suíte aborta antes de começar** — a variável de confirmação da base não corresponde.
É o comportamento correto. Confira qual base você pretende usar.

**Comportamento estranho após atualizar o código** — o aplicativo é uma PWA com service
worker. Um worker antigo pode servir bundle desatualizado e fazer você caçar um defeito
inexistente, ou esconder um real. Confirme qual versão está registrada antes de concluir
qualquer coisa sobre um teste offline.

**Teste offline falha de forma intermitente** — verifique se o teste espera a fila ser
drenada em vez de assumir tempo fixo. Sincronização é assíncrona por natureza.

**Falha só na integração contínua** — provavelmente a variável de confirmação não está
configurada lá, ou o usuário de teste não tem a permissão restrita de FR-019.

## Definição de pronto da fase

- [ ] `npm run lint` passa com a regra de fronteira ligada
- [ ] Cobertura: ciclo offline completo, todo fluxo de escrita, um caminho de leitura por módulo
- [ ] A suíte detecta uma regressão introduzida de propósito (SC-008)
- [ ] Nenhum resíduo de teste na base após execução
- [ ] O aplicativo continua operando sobre o backend atual, sem mudança visível (FR-011)
- [ ] Trocar a implementação da camada não exige tocar em nenhuma tela (SC-004)
