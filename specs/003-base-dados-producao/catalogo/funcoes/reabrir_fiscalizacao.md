<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# reabrir_fiscalizacao

## `reabrir_fiscalizacao(p_fiscalizacao_id uuid)`

- **Retorno**: `void` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **fiscalizacao**

**Finalidade**: Reabre uma fiscalização finalizada:

- volta a fiscalização e todas as unidades para `em_andamento`;
- apaga a data de fim;
- apaga os trabalhos de relatório, para forçar um relatório novo.

Tenta 3 vezes em caso de deadlock. O app a chama pela fila offline e, antes, retira da fila as
finalizações pendentes, para não refinalizar.

**Quem pode:** desde a migration 141, só a chave de serviço ou admin, coordenador e fiscal ativos
com acesso à câmara da fiscalização (`can_access_camara`); os demais recebem erro. Antes,
qualquer pessoa, inclusive sem login, podia executá-la. *(fonte: src/lib/offline/syncEngine.ts:1008, src/lib/offline/repository.ts:2416, supabase/migrations/141_fix_funcoes_sem_verificacao.sql, .specify/bugs/funcoes-sem-verificacao/assessment.md)*

**Regra de negócio**: Reabrir desfaz a finalização e invalida os relatórios. A spec de fiscalização deve dizer quem
pode reabrir e o que acontece com NCs e números já emitidos.

- **Lê**: [fiscalizacoes](../tabelas/fiscalizacoes.md)
- **Escreve**: [fiscalizacoes](../tabelas/fiscalizacoes.md), [relatorios_jobs](../tabelas/relatorios_jobs.md), [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md)
- **Chama**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md), [e_chave_de_servico()](../funcoes/e_chave_de_servico.md), [get_my_role()](../funcoes/get_my_role.md)
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/lib/offline/syncEngine.ts:1008 (fila offline: reabrir_fiscalizacao)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.reabrir_fiscalizacao(p_fiscalizacao_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_retries INT := 3;
  v_retry_delay INT := 100;
BEGIN
  -- Chave de serviço, ou admin, coordenador ou fiscal ativo com acesso à câmara da fiscalização.
  IF NOT public.e_chave_de_servico() AND NOT (
       COALESCE(public.get_my_role(), '') IN ('admin', 'coordenador', 'fiscal')
       AND public.can_access_camara((SELECT f.camara_tecnica_id FROM public.fiscalizacoes f WHERE f.id = p_fiscalizacao_id))
     ) THEN
    RAISE EXCEPTION 'Acesso negado: sem permissão para reabrir esta fiscalização.' USING ERRCODE = '42501';
  END IF;

  -- Tentar até 3 vezes em caso de deadlock
  FOR i IN 1..v_retries LOOP
    BEGIN
      -- 1. Reabrir a fiscalização
      UPDATE public.fiscalizacoes
      SET status = 'em_andamento',
          data_fim = NULL,
          updated_at = now()
      WHERE id = p_fiscalizacao_id;

      -- 2. Reabrir todas as unidades da fiscalização
      UPDATE public.unidades_fiscalizadas
      SET status = 'em_andamento',
          updated_at = now()
      WHERE fiscalizacao_id = p_fiscalizacao_id;

      -- 3. Remover jobs de relatório anteriores para forçar nova geração
      DELETE FROM public.relatorios_jobs
      WHERE fiscalizacao_id = p_fiscalizacao_id;

      -- Se chegou até aqui sem erro, sair do loop
      EXIT;
    EXCEPTION
      WHEN deadlock_detected OR serialization_failure THEN
        -- Se não for a última tentativa, esperar e tentar novamente
        IF i < v_retries THEN
          PERFORM pg_sleep(v_retry_delay / 1000.0 * i);
        ELSE
          -- Se for a última tentativa, re-lançar o erro
          RAISE;
        END IF;
    END;
  END LOOP;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
