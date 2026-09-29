<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# get_my_camara_tecnica

## `get_my_camara_tecnica()`

- **Retorno**: `text` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Devolve a câmara técnica do usuário logado. Nenhuma política a chama diretamente: é usada por
`can_access_camara` e `is_caters_user`. Desde a migration 137, só considera perfil ativo. *(fonte: funcao:can_access_camara(row_camara text), funcao:is_caters_user(), supabase/migrations/137_fix_signup_privilege_escalation.sql)*

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md) (chama), [is_caters_user()](../funcoes/is_caters_user.md) (chama)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_my_camara_tecnica()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT camara_tecnica_id FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
