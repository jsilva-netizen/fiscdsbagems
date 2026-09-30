<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# process_audit_log

## `process_audit_log()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Grava um registro em `audit_logs` para cada inclusão, alteração ou exclusão nas 7 tabelas
auditadas, pelos gatilhos `trg_audit_*`: fiscalizações, unidades, respostas de checklist,
constatações, determinações, recomendações e trabalhos de relatório.

O registro guarda a tabela, o id, a operação, quem fez e a linha antes e depois, em JSON.

- **Quem fez:** normalmente, o usuário logado. Nos trabalhos de relatório executados pela chave de
  serviço, quem pediu o relatório.
- **E-mail:** vem do perfil; se o perfil não existir, vem do token ou da conta.

Roda com permissão elevada e sem `search_path` fixo, diferente das demais funções do core. *(fonte: tabela:audit_logs, src/components/fiscalizacao/HistoricoFiscalizacao.jsx:412)*

**Regra de negócio**: Tudo o que acontece numa fiscalização fica registrado com autor e antes/depois, e aparece no
histórico da fiscalização. A spec de fiscalização deve dizer o que é auditado. A do core deve
decidir se perfis, checklists e processos passam a ser auditados.

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.jwt`, `externo:auth.uid`, `externo:auth.users`
- **Escreve**: [audit_logs](../tabelas/audit_logs.md)
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.constatacoes_manuais.trg_audit_constatacoes` (dispara), `gatilho:public.determinacoes.trg_audit_determinacoes` (dispara), `gatilho:public.fiscalizacoes.trg_audit_fiscalizacoes` (dispara), `gatilho:public.recomendacoes.trg_audit_recomendacoes` (dispara), `gatilho:public.relatorios_jobs.trg_audit_relatorios_jobs` (dispara), `gatilho:public.respostas_checklist.trg_audit_respostas` (dispara), `gatilho:public.unidades_fiscalizadas.trg_audit_unidades` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.process_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id uuid;
  v_email text;
  v_requested_by text;
BEGIN
  -- Identifica o ID do usuário executor
  v_user_id := auth.uid();

  -- Se for uma Edge Function via service role executando relatorios_jobs,
  -- usa to_jsonb() para acessar o campo de forma segura (sem quebrar em outras tabelas)
  IF v_user_id IS NULL AND TG_TABLE_NAME = 'relatorios_jobs' THEN
    v_requested_by := to_jsonb(NEW)->>'requested_by';
    IF v_requested_by IS NOT NULL THEN
      v_user_id := v_requested_by::uuid;
    END IF;
  END IF;

  -- Resolve o e-mail a partir do perfil
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE id = v_user_id;
    IF v_email IS NULL THEN
      v_email := COALESCE(
        auth.jwt() ->> 'email',
        (SELECT email FROM auth.users WHERE id = v_user_id)
      );
    END IF;
  END IF;

  INSERT INTO public.audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    user_email,
    old_data,
    new_data
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_user_id,
    v_email,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
