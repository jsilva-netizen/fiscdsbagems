# Bug Fix: Prestador adultera prazos e respostas do processo sancionador

- **Slug**: prazos-calculados-pelo-prestador
- **Fixed**: 2026-09-29
- **Assessment**: ./assessment.md
- **Status**: applied (branch `fix/prazos-calculados-pelo-prestador` a partir da `main`; **não
  aplicado em produção**)

## Summary

A migration 139 põe dois gatilhos que, quando quem grava é prestador, aceitam só o que é dele e
calculam no servidor, com a data de MS, datas, prazo e pontualidade do termo e das respostas. Ela
também remove as três políticas amplas do prestador, que anulavam as restritas. O portal e as
telas da equipe não mudam.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `supabase/migrations/139_fix_prestador_prazos.sql` | added | `proteger_termo_prestador` (BEFORE UPDATE em `termos_notificacao`), `proteger_resposta_determinacao_prestador` (BEFORE INSERT OR UPDATE em `respostas_determinacao`), remoção de 3 políticas |
| `supabase/tests/prazos_calculados_pelo_prestador.sql` | added test | 29 verificações, em transação com `ROLLBACK` |
| `supabase/tests/fixtures/sancionador_producao_20260928.sql` | added | Estado de produção de termos e respostas: colunas, privilégios, 14 políticas e `can_access_fiscalizacao`/`can_access_unidade` |

## Diff Highlights

```sql
-- termo, quando quem grava é prestador
NEW := OLD;                                    -- tudo volta ao valor anterior...
NEW.arquivo_tn_prestador_url := v_tn_assinado; -- ...menos o que é dele
NEW.arquivos_resposta := v_arquivos;
-- 1º envio do TN assinado: prazo começa hoje (MS); reenviar não reinicia
NEW.data_maxima_resposta := v_hoje + coalesce(OLD.prazo_resposta_dias, 30);
-- conclusão: recebida hoje; no prazo se hoje <= data-limite (inclusive)

-- resposta, quando quem grava é prestador
-- já analisada -> erro 42501; análise da equipe preservada; vínculos vindos da determinação;
-- status só rascunho/aguardando_analise; no envio, data e dentro_prazo do servidor
```

## Tests Added or Updated

`supabase/tests/prazos_calculados_pelo_prestador.sql`:

- **Prestador tentando adulterar:** não grava data-limite nem "recebida no prazo", e não troca o
  TN da AGEMS, o número ou o prazo em dias.
- **Envio do TN assinado:**
  - com datas forjadas no pedido, gravam-se as do servidor: início hoje (MS) e limite hoje + 30;
  - a assinatura vale, com a hora do servidor;
  - o status vai para `aguardando_resposta`;
  - reenviar troca o arquivo e não reinicia o prazo.
- **Respostas:**
  - rascunho com status "atendida", análise e vínculos forjados vira rascunho sem análise, com
    unidade e fiscalização da determinação;
  - o envio grava data e `dentro_prazo` do servidor;
  - a equipe analisa;
  - o prestador não altera resposta analisada (erro) nem responde determinação sem termo;
  - resposta depois da data-limite fica fora do prazo, mesmo enviando `true`.
- **Conclusão:**
  - resposta no último dia conta como no prazo;
  - depois da data-limite, fora do prazo, mesmo enviando `true`;
  - depois de respondido, o prestador não altera mais o termo.
- **Equipe:** continua editando datas, status e pontualidade do termo como enviados.

## Local Verification

- `bash supabase/tests/rodar.sh prazos_calculados_pelo_prestador.sql` → 29 `ok`.
- Mesmo teste sem a migration 139 → falha em "prestador: não grava data-limite".
- `escalada_privilegio_cadastro.sql` e `acesso_aberto_sem_aprovacao.sql` → continuam passando.
- Banco local sem alteração (tudo em transação com `ROLLBACK`).
- Nenhum arquivo do app foi alterado; build e lint não mudam.

## Deviations from Assessment

- Nenhuma de escopo. O fixture de produção ganhou as funções `can_access_fiscalizacao` e
  `can_access_unidade`, que as políticas restritas das respostas usam.

## Follow-ups

- **Aplicar em produção**, com a sua confirmação, pelo SQL Editor, entre `begin;` e `commit;`,
  depois da 137 e da 138.
- **Fora do escopo, registrado na spec 003:**
  - política "(DEV)" em `remessas_ai`, que deixa um prestador alterar remessas de outro;
  - defesa do prestador que não grava em `autos_infracao`;
  - prazo de defesa que não é registrado;
  - `numero_tn` sempre vazio na remessa;
  - numeração de TN, AM e AI com repetição possível e "DSB" fixo;
  - dados de teste nas 34 respostas de produção.
- **Para o sistema novo:** prazos e pontualidade como regra do servidor desde o início, e o portal
  sem calcular datas.
