<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# is_staff

## `is_staff()`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: [current_role()](../funcoes/current_role.md)
- **Chamada por (banco)**: `politica:public.autos_infracao.autos_staff_all` (usa), `politica:public.constatacoes_manuais.constatacoes_staff_all` (usa), `politica:public.determinacoes.determinacoes_staff_all` (usa), `politica:public.julgamentos.julgamentos_staff_all` (usa), `politica:public.manifestacoes_auto.manifestacoes_staff_all` (usa), `politica:public.nao_conformidades.ncs_staff_all` (usa), `politica:public.pareceres_tecnicos.pareceres_staff_all` (usa), `politica:public.prestadores_servico.prestadores_staff_all` (usa), `politica:public.recomendacoes.recomendacoes_staff_all` (usa), `politica:public.respostas_checklist.respostas_checklist_staff_all` (usa), `politica:public.respostas_determinacao.respostas_det_staff_all` (usa), `politica:public.termos_notificacao.termos_staff_all` (usa), `politica:public.unidades_fiscalizadas.unidades_staff_all` (usa)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.current_role() in ('admin', 'fiscal', 'coordenador');
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
