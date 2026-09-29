<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# is_staff

## `is_staff()`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Diz se o usuário logado é da equipe da AGEMS que opera o sistema: admin, fiscal ou coordenador,
ativos. Diretor e prestador ficam de fora.

Usada por 13 políticas (fiscalização, processo sancionador e prestadores), em geral para dar
acesso total à equipe ao lado de uma política específica para o prestador. Herda de
`current_role` o filtro de perfil ativo da migration 137. *(fonte: funcao:current_role(), supabase/migrations/137_fix_signup_privilege_escalation.sql)*

**Regra de negócio**: "Equipe" = admin, fiscal e coordenador. O diretor não entra, e o que ele pode fazer precisa ser
decidido nas specs de módulo, porque nenhuma política o menciona.

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

- Divergência `funcao:is_staff()`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
