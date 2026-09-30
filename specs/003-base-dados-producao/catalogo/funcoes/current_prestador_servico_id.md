<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# current_prestador_servico_id

## `current_prestador_servico_id()`

- **Retorno**: `uuid` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Mesma coisa que `get_my_prestador_id`: duas funções com o mesmo papel, de conjuntos de políticas
diferentes. Usada por 10 políticas em 7 tabelas e por `can_access_fiscalizacao` e
`can_access_unidade`. Desde a migration 137, só considera perfil ativo. *(fonte: funcao:can_access_fiscalizacao(fiscalizacao uuid), funcao:can_access_unidade(unidade uuid), supabase/migrations/137_fix_signup_privilege_escalation.sql)*

**Regra de negócio**: A mesma de `get_my_prestador_id`.

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md) (chama), [can_access_unidade(unidade uuid)](../funcoes/can_access_unidade.md) (chama), `politica:public.autos_infracao.autos_prestador_select` (usa), `politica:public.julgamentos.julgamentos_prestador_select` (usa), `politica:public.manifestacoes_auto.manifestacoes_prestador_select` (usa), `politica:public.pareceres_tecnicos.pareceres_prestador_select` (usa), `politica:public.prestadores_servico.prestadores_prestador_select_own` (usa), `politica:public.respostas_determinacao.respostas_det_prestador_insert` (usa), `politica:public.respostas_determinacao.respostas_det_prestador_select` (usa), `politica:public.respostas_determinacao.respostas_det_prestador_update` (usa), `politica:public.termos_notificacao.termos_prestador_select_own` (usa), `politica:public.termos_notificacao.termos_prestador_update_own_until_respondido` (usa)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.current_prestador_servico_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select (select prestador_servico_id from public.profiles where id = auth.uid() and ativo is true);
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: aguardando_decisao; [detalhes](../../achados.md#a-005)).
