<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# current_prestador_servico_id

## `current_prestador_servico_id()`

- **Retorno**: `uuid` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

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
  select (select prestador_servico_id from public.profiles where id = auth.uid());
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
