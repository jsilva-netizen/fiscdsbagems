<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# handle_new_user

## `handle_new_user()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Cria o perfil (`profiles`) quando uma conta é criada em `auth.users`, pelo gatilho
`on_auth_user_created`, na mesma transação do cadastro. Os dados vêm dos metadados que a tela de
cadastro envia:

- **Nome:** o informado; se vier vazio, o e-mail.
- **Papel:** fiscal, coordenador, diretor ou prestador. Qualquer outro valor vira fiscal, desde a
  migration 137.
- **Diretoria:** a escolhida, com `dsb` se vier vazia.
- **Câmara técnica:** a escolhida.
- **Prestador:** a entidade escolhida, só para o papel prestador.
- **Aprovação:** o perfil nasce sempre inativo, aguardando aprovação do admin.

Se já existir perfil com o mesmo id, atualiza só e-mail, nome e data. Antes da migration 137, o
papel e os vínculos vinham dos metadados sem validação, inclusive `admin`. *(fonte: src/pages/Register.jsx:100, supabase/migrations/137_fix_signup_privilege_escalation.sql, .specify/bugs/escalada-privilegio-cadastro/assessment.md)*

**Regra de negócio**: Autocadastro com escolha de papel e vínculo, sempre pendente de aprovação. A spec do core deve
decidir se o sistema novo mantém a escolha do papel pelo próprio usuário ou se o admin define o
papel na aprovação.

- **Lê**: —
- **Escreve**: [profiles](../tabelas/profiles.md)
- **Chama**: —
- **Chamada por (banco)**: `gatilho:auth.users.on_auth_user_created` (dispara)
- **Chamada por (telas e edge functions, anotado)**: gatilho on_auth_user_created em auth.users (cadastro: src/pages/Register.jsx:100)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT := NEW.raw_user_meta_data->>'role';
  v_prestador UUID;
BEGIN
  IF v_role IS NULL OR v_role NOT IN ('fiscal', 'coordenador', 'diretor', 'prestador') THEN
    v_role := 'fiscal';
  END IF;

  -- Vínculo com prestador só para o papel prestador (restrições de profiles).
  IF v_role = 'prestador' THEN
    v_prestador := NULLIF(NEW.raw_user_meta_data->>'prestador_servico_id', '')::uuid;
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, ativo, diretoria_id, camara_tecnica_id, prestador_servico_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    FALSE, -- Sempre inativo até aprovação do admin
    COALESCE(NEW.raw_user_meta_data->>'diretoria_id', 'dsb'),
    NULLIF(NEW.raw_user_meta_data->>'camara_tecnica_id', ''),
    v_prestador
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      updated_at = NOW();

  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
