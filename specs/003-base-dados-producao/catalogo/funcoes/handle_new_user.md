<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# handle_new_user

## `handle_new_user()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: [profiles](../tabelas/profiles.md)
- **Chama**: —
- **Chamada por (banco)**: `gatilho:auth.users.on_auth_user_created` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

BEGIN

  INSERT INTO public.profiles (

    id, 

    email, 

    full_name, 

    role, 

    ativo, 

    diretoria_id, 

    camara_tecnica_id, 

    prestador_servico_id

  )

  VALUES (

    NEW.id,

    NEW.email,

    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),

    COALESCE(NEW.raw_user_meta_data->>'role', 'fiscal'),

    FALSE, -- Sempre inativo at├® aprova├º├úo do admin

    COALESCE(NEW.raw_user_meta_data->>'diretoria_id', 'dsb'),

    NULLIF(NEW.raw_user_meta_data->>'camara_tecnica_id', ''),

    NULLIF(NEW.raw_user_meta_data->>'prestador_servico_id', '')::uuid

  )

  ON CONFLICT (id) DO UPDATE

  SET email = EXCLUDED.email,

      full_name = EXCLUDED.full_name,

      role = COALESCE(NEW.raw_user_meta_data->>'role', EXCLUDED.role),

      diretoria_id = COALESCE(NEW.raw_user_meta_data->>'diretoria_id', EXCLUDED.diretoria_id),

      camara_tecnica_id = NULLIF(NEW.raw_user_meta_data->>'camara_tecnica_id', ''),

      prestador_servico_id = NULLIF(NEW.raw_user_meta_data->>'prestador_servico_id', '')::uuid,

      updated_at = NOW();

  RETURN NEW;

END;

$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
