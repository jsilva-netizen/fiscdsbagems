<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# admin_delete_user

## `admin_delete_user(p_user_id uuid)`

- **Retorno**: `void` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Exclui definitivamente um usuário: o perfil e a conta de autenticação. Só um admin ativo pode, e
ninguém exclui a si mesmo. Roda com permissão elevada para poder apagar em `auth.users`.

Na prática, só funciona para quem nunca criou nada no sistema. Estas tabelas apontam para a conta
ou o perfil sem regra de exclusão, e a exclusão falha inteira se houver registro do usuário nelas:

- `fiscalizacoes.created_by`;
- `relatorios_jobs.requested_by`;
- `prestadores_servico.user_id`;
- a autoria das tabelas do CATERS.

Serve para remover cadastros recusados ou duplicados. A tela de cadastro orienta a pedir isso
quando o e-mail já existe. *(fonte: src/pages/GerenciarUsuarios.jsx:123, src/pages/Register.jsx:119, restricao:fiscalizacoes.fiscalizacoes_created_by_fkey, restricao:relatorios_jobs.relatorios_jobs_requested_by_fkey, restricao:prestadores_servico.prestadores_servico_user_id_fkey)*

**Regra de negócio**: Exclusão definitiva só por admin ativo e nunca de si mesmo. Para quem já atuou, o caminho é
desativar (`ativo = false`), não excluir. A spec do core deve tornar isso explícito.

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`, `externo:auth.users`
- **Escreve**: [profiles](../tabelas/profiles.md)
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/pages/GerenciarUsuarios.jsx:123 (excluir usuário da lista)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
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

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'cannot delete self';
  END IF;

  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: aguardando_decisao; [detalhes](../../achados.md#a-005)).
- Achado **A-020** — Excluir usuário falha para quem tem registros (situação: aguardando_decisao; [detalhes](../../achados.md#a-020)).
