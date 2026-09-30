<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# enforce_profile_security

## `enforce_profile_security()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Função do gatilho `trg_enforce_profile_security`, que roda antes de inserir ou alterar um perfil.
Garante que só um admin ativo aprova usuários e muda papel e vínculos:

- **Na inserção por quem não é admin:** papel fora de fiscal, diretor e prestador vira fiscal, e
  o perfil fica inativo.
- **Na alteração por quem não é admin:** papel, `ativo`, prestador, diretoria e câmara voltam ao
  valor anterior, sem erro. O resto da alteração é gravado.
- **Sem usuário logado** (gatilho de cadastro, chave de serviço, migrations), não interfere.

Desde a migration 137, o papel de quem executa só conta se o perfil dele estiver ativo, e as
comparações tratam valor nulo. Antes, um perfil inativo com papel `admin` passava na regra e podia
se autoaprovar. *(fonte: gatilho:public.profiles.trg_enforce_profile_security, supabase/migrations/137_fix_signup_privilege_escalation.sql)*

**Regra de negócio**: Aprovação de usuários e atribuição de papel e vínculos são exclusivas do admin. As tentativas de
outros usuários são ignoradas em silêncio, não recusadas. A spec do core deve dizer se o sistema
novo recusa com erro.

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.profiles.trg_enforce_profile_security` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.enforce_profile_security()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Operação interna sem usuário logado (gatilho do cadastro, service role, migrations): permitir.
  -- O cadastro é validado em handle_new_user().
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Papel de quem executa, só se o perfil estiver ativo.
  SELECT role INTO current_user_role FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;

  -- Se for INSERÇÃO (Cadastro Inicial)
  IF TG_OP = 'INSERT' THEN
    -- Quem não é admin só cria perfil de fiscal, diretor ou prestador
    IF NEW.role NOT IN ('fiscal', 'diretor', 'prestador') AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.role := 'fiscal';
    END IF;

    -- Apenas admins podem cadastrar novos perfis já ativos
    IF NEW.ativo IS TRUE AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.ativo := FALSE;
    END IF;
  END IF;

  -- Se for ATUALIZAÇÃO (Edição de Perfil)
  IF TG_OP = 'UPDATE' THEN
    -- Impedir alteração de role por quem não é admin
    IF OLD.role IS DISTINCT FROM NEW.role AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.role := OLD.role;
    END IF;

    -- Impedir alteração de ativo (aprovação) por quem não é admin
    IF OLD.ativo IS DISTINCT FROM NEW.ativo AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.ativo := OLD.ativo;
    END IF;

    -- Impedir alteração de vínculo de prestador por quem não é admin
    IF OLD.prestador_servico_id IS DISTINCT FROM NEW.prestador_servico_id
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.prestador_servico_id := OLD.prestador_servico_id;
    END IF;

    -- Impedir alteração de diretoria/câmara técnica por quem não é admin
    IF OLD.diretoria_id IS DISTINCT FROM NEW.diretoria_id
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.diretoria_id := OLD.diretoria_id;
    END IF;

    IF OLD.camara_tecnica_id IS DISTINCT FROM NEW.camara_tecnica_id
       AND COALESCE(current_user_role, '') <> 'admin' THEN
      NEW.camara_tecnica_id := OLD.camara_tecnica_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: aguardando_decisao; [detalhes](../../achados.md#a-005)).
- Achado **A-011** — Escalada de privilégio no cadastro de usuário (situação: decidido; [detalhes](../../achados.md#a-011)).
