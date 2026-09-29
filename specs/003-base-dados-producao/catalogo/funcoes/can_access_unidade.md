<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# can_access_unidade

## `can_access_unidade(unidade uuid)`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Mesma regra de `can_access_fiscalizacao`, partindo de uma unidade fiscalizada: o prestador vê a
unidade se a fiscalização dela tem termo de notificação para a entidade dele.

Usada por 5 políticas: `respostas_checklist`, `nao_conformidades`, `constatacoes_manuais`,
`determinacoes` e `recomendacoes`. *(fonte: funcao:current_prestador_servico_id(), funcao:can_access_fiscalizacao(fiscalizacao uuid))*

**Regra de negócio**: A mesma de `can_access_fiscalizacao`, aplicada ao que pertence à unidade.

- **Lê**: [termos_notificacao](../tabelas/termos_notificacao.md), [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md)
- **Escreve**: —
- **Chama**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)
- **Chamada por (banco)**: `politica:public.constatacoes_manuais.constatacoes_prestador_select` (usa), `politica:public.determinacoes.determinacoes_prestador_select` (usa), `politica:public.nao_conformidades.ncs_prestador_select` (usa), `politica:public.recomendacoes.recomendacoes_prestador_select` (usa), `politica:public.respostas_checklist.respostas_checklist_prestador_select` (usa)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.can_access_unidade(unidade uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.unidades_fiscalizadas u
    join public.termos_notificacao t
      on t.fiscalizacao_id = u.fiscalizacao_id
    where u.id = unidade
      and t.prestador_servico_id = public.current_prestador_servico_id()
  );
$function$
```

</details>

## Divergências e achados

- Divergência `funcao:can_access_unidade(unidade uuid)`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
