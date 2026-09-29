# Bug Assessment: Funções executáveis sem login, finalização pelo relatório e IA da CATESA

- **Slug**: funcoes-sem-verificacao
- **Created**: 2026-09-29
- **Source**: pasted text (achados da anotação das funções da fiscalização, spec 003 T027)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

Três problemas encontrados no inventário de produção (2026-09-28) e no código:

1. **Funções `SECURITY DEFINER` executáveis por `anon`, sem verificar quem chama:**
   - `reabrir_fiscalizacao`: reabre qualquer fiscalização e apaga os relatórios dela;
   - `claim_relatorios_jobs` e `claim_caters_ai_jobs`: tomam a fila de relatórios e a de IA do
     CATERS e devolvem as linhas, inclusive os resultados das análises;
   - `kick_relatorios_worker`: dispara o worker de relatórios;
   - `obter_resumo_indicadores` (2 versões): indicadores agregados de todas as câmaras.
2. **Finalização pela função de relatório nunca funciona.** `relatorios_enqueue` chama
   `finalizar_fiscalizacao` com a chave de serviço, para regenerar NCs, determinações e totais
   antes do relatório. `finalizar_fiscalizacao` e `gerar_ncs_unidade` exigem um usuário com papel
   e devolvem "Acesso negado" como resposta normal, sem erro.
3. **IA da CATESA não funciona em produção.** As edge functions `catesa_ai_*` usam a tabela
   `catesa_ai_jobs` e a função `claim_catesa_ai_jobs`, criadas pela migration 128, que nunca foi
   aplicada em produção.

## Symptom

1. Sem login, com a chave pública:
   - `POST /rest/v1/rpc/reabrir_fiscalizacao` com um id reabre a fiscalização;
   - `rpc/claim_relatorios_jobs` marca trabalhos como `processing` e os devolve;
   - `rpc/obter_resumo_indicadores` devolve indicadores de todas as câmaras.
2. Pedir o relatório de uma fiscalização editada depois de reaberta não regenera NCs nem totais
   no servidor.
3. Pedir análise por IA na CATESA falha, porque a tabela da fila não existe.

## Reproduction

Automatizada no teste da correção, com as definições de produção num banco local, em transação
com `ROLLBACK`. Sem a migration, o teste falha.

## Suspected Code Paths

- Funções de produção (inventário):
  - `reabrir_fiscalizacao(uuid)`;
  - `claim_relatorios_jobs(int, uuid, int)`;
  - `claim_caters_ai_jobs(int, uuid, int)`;
  - `kick_relatorios_worker(uuid, int)`;
  - `obter_resumo_indicadores(...)` ×2;
  - `finalizar_fiscalizacao(uuid)`;
  - `gerar_ncs_unidade(uuid, jsonb, boolean)`.
- Privilégios de produção: `EXECUTE` para `anon` e `authenticated` (padrão do Supabase).
- Quem chama:
  - [src/lib/offline/syncEngine.ts:1008](src/lib/offline/syncEngine.ts#L1008): `reabrir`, sessão
    do usuário;
  - [src/pages/Relatorios.jsx:574](src/pages/Relatorios.jsx#L574): indicadores, sessão do
    usuário;
  - `supabase/functions/relatorios_enqueue/index.ts:99` (finalizar) e `:137` (kick), com a chave
    de serviço;
  - `relatorios_worker/index.ts:175` e `caters_ai_worker/index.ts:30` (claim), com a chave de
    serviço;
  - `catesa_ai_worker/index.ts:30` (`claim_catesa_ai_jobs`), com a chave de serviço.
- `supabase/migrations/128_catesa_ai_jobs.sql`: fila da CATESA, ausente em produção.

## Root Cause Hypothesis

1. Funções criadas com `SECURITY DEFINER` e privilégios padrão, sem verificação interna.
2. A verificação de papel foi acrescentada à finalização sem considerar o chamador de serviço.
3. A migration 128 não foi aplicada. As migrations de produção divergem das do repositório.

Confiança: **alta**.

## Proposed Remediation

**Preferred**: migration 141.

1. **Função auxiliar `e_chave_de_servico()`:** diz se quem chama usa a chave de serviço (claim
   `role` do JWT).
2. **Funções só dos workers** (`claim_relatorios_jobs`, `claim_caters_ai_jobs`,
   `kick_relatorios_worker` e `claim_catesa_ai_jobs`): executáveis só por `service_role`.
3. **`reabrir_fiscalizacao`:**
   - não executável por `anon`;
   - verifica chave de serviço, ou admin, coordenador ou fiscal ativo com acesso à câmara da
     fiscalização (`can_access_camara`); senão, erro;
   - corpo de produção mantido.
4. **`obter_resumo_indicadores` (2 versões):**
   - não executáveis por `anon`;
   - exigem chave de serviço ou perfil ativo que não seja prestador; senão, erro;
   - corpo de produção mantido.
5. **`finalizar_fiscalizacao` e `gerar_ncs_unidade`:** a verificação de papel passa a aceitar
   também a chave de serviço. A edge function já verifica o usuário antes de chamar.
6. **CATESA:** cria `catesa_ai_jobs`, gatilho, política e `claim_catesa_ai_jobs`, iguais à
   migration 128 e de forma idempotente.

**Alternatives**:
- Trocar a finalização da edge function para a sessão do usuário. Exige republicar a função; a
  correção no banco não exige.

**Files likely to change**:
- `supabase/migrations/141_fix_funcoes_sem_verificacao.sql`
- `supabase/tests/funcoes_sem_verificacao.sql`
- `supabase/tests/fixtures/funcoes_producao_20260928.sql`

**Tests to add or update**:
- **Anônimo:** não executa nenhuma das funções.
- **Fiscal ativo:**
  - não executa as funções dos workers;
  - lê indicadores;
  - reabre fiscalização da própria câmara, mas não de outra.
- **Conta não aprovada e prestador:** não leem indicadores e não reabrem.
- **Chave de serviço:**
  - reivindica trabalhos;
  - finaliza fiscalização (resposta de sucesso);
  - reivindica trabalhos da CATESA.
- **CATESA:** a tabela e a política existem, e o fiscal da CATESA grava na fila.
- **Regressão:** os testes das migrations 137 a 140 continuam passando.

## Risks & Considerations

- **Pedido de relatório:** passa a regenerar NCs, determinações, totais e número do termo da
  fiscalização (já finalizada). É o comportamento pretendido no código, mas nunca rodou em
  produção.
- **Edge functions:** a correção 3 só tem efeito se `catesa_ai_*` estiverem publicadas em produção
  e com a chave do Gemini. Não dá para verificar daqui (ver `externos.toml`).
- **Produção:** aplicar com confirmação do usuário, pelo SQL Editor.

## Open Questions

- Nenhuma.
