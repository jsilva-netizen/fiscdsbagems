# Bug Fix: Funções executáveis sem login, finalização pelo relatório e IA da CATESA

- **Slug**: funcoes-sem-verificacao
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied (branch `fix/funcoes-sem-verificacao` a partir da `main`; **não aplicado em
  produção**)

## Summary

A migration 141 fecha as funções que qualquer um executava, deixa a finalização aceitar a chave
de serviço (o pedido de relatório volta a regenerar NCs e totais) e cria a fila de IA da CATESA.
Os corpos das funções são os de produção, com as verificações acrescentadas; o app e as edge
functions não mudam.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/141_fix_funcoes_sem_verificacao.sql` | added | `e_chave_de_servico()`; privilégios dos workers; verificação em `reabrir_fiscalizacao` e nos 2 `obter_resumo_indicadores`; chave de serviço aceita em `finalizar_fiscalizacao` e `gerar_ncs_unidade`; fila da CATESA (igual à 128) |
| `supabase/tests/funcoes_sem_verificacao.sql` | added test | 21 verificações, em transação com `ROLLBACK` |
| `supabase/tests/fixtures/funcoes_producao_20260928.sql` | added | Funções como em produção, executáveis por todos, sem a fila da CATESA |

A migration foi gerada a partir das definições do inventário de produção por um script de apoio
(não versionado), que insere as verificações no início de cada corpo. Assim, o resto do código é
idêntico ao de produção.

## Tests Added or Updated

- **Anônimo:** não executa reabrir, as filas de relatório, CATERS e CATESA, o disparo do worker
  nem os indicadores.
- **Conta não aprovada e prestador:** não reabrem e não leem indicadores.
- **Fiscais:**
  - fiscal do CATERS não reabre fiscalização da CATESA e não toma a fila;
  - fiscal da CATESA lê indicadores e reabre a própria, com os relatórios dela apagados.
- **Chave de serviço:**
  - toma o trabalho de relatório;
  - finaliza a fiscalização com resposta de sucesso;
  - a fila da CATESA existe e é reivindicada.
- **Fila da CATESA:** lida pelo fiscal da CATESA e não pelo do CATERS.

## Local Verification

- `bash supabase/tests/rodar.sh funcoes_sem_verificacao.sql` → 21 `ok`.
- Sem a migration 141 → falha em "anônimo: não reabre fiscalização".
- Testes das migrations 137, 138, 139 e 140 → continuam passando.
- Banco local sem alteração.

## Deviations from Assessment

- O fixture apaga e recria as funções que não são de gatilho: no banco local,
  `reabrir_fiscalizacao` tem outro tipo de retorno, mais uma divergência local × produção.

## Follow-ups

- Aplicar em produção, com a sua confirmação, pelo SQL Editor, entre `begin;` e `commit;`.
- **IA da CATESA:** além da tabela, precisa que as edge functions `catesa_ai_*` estejam publicadas
  e com a chave do Gemini (conferir no painel: Edge Functions e Secrets).
- **IA do CATERS:** os 6 trabalhos parados em `queued` continuam lá. Com o worker funcionando, são
  retomados; senão, é a mesma verificação no painel.
- **Pedido de relatório:** passa a regenerar NCs, determinações, totais e número do termo de uma
  fiscalização já finalizada, como pretendido no código.
