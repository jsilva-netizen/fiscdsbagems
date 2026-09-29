<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# can_access_fiscalizacao

## `can_access_fiscalizacao(fiscalizacao uuid)`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Diz se o prestador logado pode ver dados de uma fiscalização: só quando existe um termo de
notificação daquela fiscalização dirigido à entidade dele. Antes do termo, a fiscalização é
invisível para o prestador.

Usada por 4 políticas, em `unidades_fiscalizadas` e `respostas_determinacao`. Com a migration 137,
prestador inativo não tem entidade e não passa. *(fonte: funcao:current_prestador_servico_id())*

**Regra de negócio**: O prestador só enxerga uma fiscalização depois de notificado. A spec do portal do prestador e a
do processo sancionador devem descrever essa regra.

- **Lê**: [termos_notificacao](../tabelas/termos_notificacao.md)
- **Escreve**: —
- **Chama**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)
- **Chamada por (banco)**: `politica:public.respostas_determinacao.respostas_det_prestador_insert` (usa), `politica:public.respostas_determinacao.respostas_det_prestador_select` (usa), `politica:public.respostas_determinacao.respostas_det_prestador_update` (usa), `politica:public.unidades_fiscalizadas.unidades_prestador_select` (usa)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.can_access_fiscalizacao(fiscalizacao uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.termos_notificacao t
    where t.fiscalizacao_id = fiscalizacao
      and t.prestador_servico_id = public.current_prestador_servico_id()
  );
$function$
```

</details>

## Divergências e achados

- Divergência `funcao:can_access_fiscalizacao(fiscalizacao uuid)`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
