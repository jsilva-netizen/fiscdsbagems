<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# get_my_diretoria

## `get_my_diretoria()`

- **Retorno**: `text` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Devolve a diretoria do usuário logado. Nenhuma política, função ou tela a usa hoje: a diretoria só
tem efeito na interface, que lê o perfil direto. Desde a migration 137, só considera perfil
ativo. *(fonte: supabase/migrations/137_fix_signup_privilege_escalation.sql, src/hooks/useModulo.js:87)*

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_my_diretoria()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT diretoria_id FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: decidido; [detalhes](../../achados.md#a-005)).
