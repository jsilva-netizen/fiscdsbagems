<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# current_role

## `current_role()`

- **Retorno**: `text` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Mesma coisa que `get_my_role`, mas devolve texto vazio em vez de nulo quando não há papel.
Existem duas funções com o mesmo papel porque vieram de conjuntos de políticas escritos em
épocas diferentes.

É usada por 17 políticas em 14 tabelas e por `is_staff`. Desde a migration 137, só considera
perfil ativo. *(fonte: supabase/migrations/137_fix_signup_privilege_escalation.sql, funcao:is_staff())*

**Regra de negócio**: A mesma de `get_my_role`: só usuário ativo tem papel.

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: [is_staff()](../funcoes/is_staff.md) (chama)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public."current_role"()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role from public.profiles where id = auth.uid() and ativo is true), '');
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: aguardando_decisao; [detalhes](../../achados.md#a-005)).
