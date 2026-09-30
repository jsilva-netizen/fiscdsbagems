<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# admin_delete_user_by_email

## `admin_delete_user_by_email(p_email text)`

- **Retorno**: `void` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Igual a `admin_delete_user`, mas localiza a conta pelo e-mail. Se não houver conta com o e-mail,
não faz nada e não dá erro. Existe para apagar contas que não aparecem na lista de usuários, por
exemplo uma conta criada sem perfil, e liberar o e-mail para novo cadastro.

Tem a mesma limitação de `admin_delete_user`: falha se o usuário já criou registros. *(fonte: src/pages/GerenciarUsuarios.jsx:139, funcao:admin_delete_user(p_user_id uuid))*

**Regra de negócio**: A mesma de `admin_delete_user`.

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`, `externo:auth.users`
- **Escreve**: [profiles](../tabelas/profiles.md)
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/pages/GerenciarUsuarios.jsx:139 (campo "excluir por e-mail")

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.admin_delete_user_by_email(p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND ativo = TRUE
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  IF v_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot delete self';
  END IF;

  DELETE FROM public.profiles WHERE id = v_user_id;
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: decidido; [detalhes](../../achados.md#a-005)).
