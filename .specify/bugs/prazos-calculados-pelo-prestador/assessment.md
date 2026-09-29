# Bug Assessment: Prestador adultera prazos e respostas do processo sancionador

- **Slug**: prazos-calculados-pelo-prestador
- **Created**: 2026-09-29
- **Source**: pasted text (achado da anotação do processo sancionador, spec 003 T024)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

O prestador (entidade regulada) consegue adulterar dados do próprio processo sancionador:

1. **Prazos e pontualidade calculados no aparelho do prestador:**
   - ao enviar o TN assinado, o portal grava `data_protocolo`, `data_inicio_prazo`,
     `data_maxima_resposta`, `assinatura_prestador_valida = true` e `data_assinatura_prestador`;
   - ao concluir, calcula `recebida_no_prazo` e `data_recebimento_resposta` no navegador;
   - em cada resposta, calcula `dentro_prazo` e `data_resposta`.
2. **Políticas amplas que anulam as restritas:**
   - `termos_notificacao`: "Prestadores: responder seus termos" (UPDATE, sem status e sem limite
     de colunas) anula "termos_prestador_update_own_until_respondido";
   - `respostas_determinacao`: "Prestadores: cadastrar respostas determinacoes" e "Prestadores:
     atualizar suas próprias respostas determinacoes" (sem status e sem termo) anulam
     `respostas_det_prestador_insert/update`, que exigem termo e status `rascunho` ou
     `aguardando_analise`.
3. **Erros de data:**
   - o "hoje" do portal é a data UTC, então depois das 20h em MS o prazo começa no dia seguinte;
   - `dentro_prazo` compara o instante atual com a meia-noite UTC da data-limite, então a
     resposta dada no próprio último dia é tratada como fora do prazo.

Produção: 5 termos, 34 respostas (dados de teste) e 1 usuário prestador.

## Symptom

Com a própria sessão e a chave pública, um prestador aprovado pode, pela API:

- estender a data-limite (reenviando o TN assinado ou gravando a data direto);
- marcar respostas e termo como "no prazo";
- mudar o status do termo e das respostas, inclusive desfazer `nao_atendida`;
- sobrescrever a análise da equipe e os arquivos da AGEMS no termo.

O esperado: prazos, datas e pontualidade definidos pelo servidor. O prestador altera só o que é
dele (arquivo do TN assinado, arquivos de resposta, manifestação, evidências), e só enquanto
responde.

## Reproduction

Pela API (PostgREST) com a sessão de um prestador ativo vinculado à entidade do termo:

1. **Estender o prazo:** `PATCH termos_notificacao?id=eq.<termo>` com
   `{"data_maxima_resposta": "2099-12-31"}`. É aceito pela política "Prestadores: responder seus
   termos".
2. **Pontualidade:** `PATCH` com `{"recebida_no_prazo": true, "status": "respondido"}`. É aceito.
3. **Desfazer a análise:** `PATCH respostas_determinacao?id=eq.<resposta>` com
   `{"status": "aguardando_analise", "dentro_prazo": true, "descricao_atendimento": ""}` numa
   resposta já `nao_atendida`. É aceito pela política "Prestadores: atualizar suas próprias
   respostas determinacoes".

Reprodução automatizada no teste da correção, com as políticas de produção num banco local, em
transação com `ROLLBACK`. Não reproduzir em produção.

## Suspected Code Paths

- [src/pages/ResponderTermo.jsx:667-680](src/pages/ResponderTermo.jsx#L667-L680) — portal grava
  as datas do prazo e a assinatura válida, com `isoToday()` em UTC (linha 70).
- [src/lib/offline/repository.ts:1712-1720](src/lib/offline/repository.ts#L1712-L1720) —
  `finalizeTNResponses`, chamada pelo portal (`ResponderTermo.jsx:297`), calcula
  `recebida_no_prazo` e a data de recebimento no navegador.
- [src/pages/ResponderTermo.jsx:255-270](src/pages/ResponderTermo.jsx#L255-L270) — portal calcula
  `dentro_prazo` e `data_resposta`.
- Políticas de produção:
  - `politica:public.termos_notificacao.Prestadores: responder seus termos`;
  - `politica:public.respostas_determinacao.Prestadores: cadastrar respostas determinacoes`;
  - `politica:public.respostas_determinacao.Prestadores: atualizar suas próprias respostas
    determinacoes`.
- Não há gatilho que proteja colunas em `termos_notificacao` (só o do ano de geração) nem em
  `respostas_determinacao` (nenhum).
- Lado da equipe (não afetado): `GerenciarTermos.jsx` (criação, fluxo manual, datas informadas
  pela equipe) e `AnalisarResposta.jsx:181-217` (análise das respostas).

## Root Cause Hypothesis

O servidor confia no cliente para dados com valor jurídico: o portal calcula e grava prazos e
pontualidade, e as políticas do prestador não limitam colunas nem estados. Existem políticas
corretas (até `respondido`; só `rascunho` e `aguardando_analise`; com termo), mas cópias mais
amplas, de outro conjunto de políticas, somam-se a elas e as anulam. Confiança: **alta** (código
e definições de produção).

## Proposed Remediation

**Preferred**: migration 139, sem mudança no portal nem nas telas da equipe. As telas continuam
enviando o que enviam, e o servidor passa a decidir o que vale.

1. **Termos:** gatilho `BEFORE UPDATE` em `termos_notificacao` que, **só quando quem grava é
   prestador**, descarta tudo que não seja do prestador:
   - **Colunas aceitas:** `arquivo_tn_prestador_url`, `arquivos_resposta` e `updated_at`; as
     demais voltam ao valor anterior.
   - **TN assinado enviado pela primeira vez** (sem início de prazo gravado): o servidor grava
     assinatura válida, data da assinatura, data de protocolo e início do prazo como a data de
     hoje em MS (`America/Campo_Grande`), data-limite = hoje + `prazo_resposta_dias`, e status
     `aguardando_resposta`. Reenviar o TN troca o arquivo, mas **não reinicia o prazo**.
   - **Conclusão** (o portal pede `respondido`): o servidor grava a data de recebimento (hoje em
     MS), `recebida_no_prazo` = hoje ≤ data-limite (inclusive; sem data-limite, `true`) e status
     `respondido`.
2. **Respostas:** gatilho `BEFORE INSERT OR UPDATE` em `respostas_determinacao` que, **só para
   prestador**:
   - **Status:** aceita só `rascunho` ou `aguardando_analise` (outro vira `rascunho`).
   - **Resposta já analisada:** recusa a alteração com erro.
   - **Análise da equipe:** `descricao_atendimento` volta ao valor anterior (vazio na inclusão).
   - **Vínculos:** unidade e fiscalização vêm da determinação, e o prestador vem do perfil.
   - **Envio** (`aguardando_analise`): `data_resposta` = agora e `dentro_prazo` = hoje em MS ≤
     data-limite do termo daquela fiscalização (inclusive).
3. **Políticas:** remover as três políticas amplas do prestador. Valem as restritas, que já
   existem.

**Alternatives**:
- **Só remover as políticas amplas.** Fecha a mudança de status, mas não os campos de prazo: o
  prestador continua gravando datas enquanto o termo não está respondido.
- **Mover o cálculo para funções chamadas pelo portal.** Mais explícito, mas exige mudar o portal
  e publicar junto; o gatilho funciona com o portal atual.

**Files likely to change** (na `main`):
- `supabase/migrations/139_fix_prestador_prazos.sql` (nova)
- `supabase/tests/prazos_calculados_pelo_prestador.sql` (novo)
- `supabase/tests/fixtures/acesso_producao_20260928.sql`, ou um fixture novo, com as políticas e
  gatilhos de produção de `termos_notificacao` e `respostas_determinacao`.

**Tests to add or update**:
- **Prestador:**
  - não altera data-limite, pontualidade, status arbitrário, arquivos da AGEMS nem número do
    termo;
  - o envio do TN assinado grava as datas do servidor, e reenviar não reinicia o prazo;
  - a conclusão grava `respondido`, com `recebida_no_prazo` correto no último dia e depois dele;
  - não altera `descricao_atendimento` nem resposta analisada;
  - rascunho e envio de resposta funcionam, com `dentro_prazo` do servidor.
- **Equipe:**
  - continua editando datas, status e arquivos do termo, inclusive no fluxo manual;
  - continua analisando respostas.
- **Regressão:** os testes das migrations 137 e 138 continuam passando.

## Risks & Considerations

- **Mudança de comportamento para melhor:**
  - resposta no último dia passa a contar como no prazo;
  - o início do prazo passa a ser a data de MS, não a UTC.

  O termo e as respostas de produção que já têm datas não são recalculados.
- **Reenvio do TN:** deixa de reiniciar o prazo. Se a equipe precisar reiniciar, pode editar as
  datas na tela dela, que não é afetada.
- **Dados de teste:** as 34 respostas de teste em produção não são tocadas pela migration; a
  limpeza é decisão à parte, pela constituição, antes da virada.
- **Fora do escopo:**
  - a política "(DEV)" de `remessas_ai` deixa um prestador alterar remessas de outro;
  - a defesa em `autos_infracao` não grava.

  Os dois ficam registrados na spec 003.
- **Produção:** a aplicação só com confirmação do usuário, pelo SQL Editor, depois das 137 e 138.

## Open Questions

- [NEEDS CLARIFICATION: reenviar o TN assinado deve poder reiniciar o prazo em algum caso (ex.:
  assinatura recusada pela equipe)? A proposta: não; só a equipe altera as datas.]
