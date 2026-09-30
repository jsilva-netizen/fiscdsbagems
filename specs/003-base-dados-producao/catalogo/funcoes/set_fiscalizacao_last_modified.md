<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# set_fiscalizacao_last_modified

## `set_fiscalizacao_last_modified()`

- **Retorno**: `trigger` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **fiscalizacao**

**Finalidade**: Função do gatilho `trg_set_fiscalizacao_last_modified`. Antes de gravar uma fiscalização, registra
quem alterou: o e-mail do perfil, o do token, ou `sistema` quando não há usuário. Grava também a
hora da alteração. *(fonte: gatilho:public.fiscalizacoes.trg_set_fiscalizacao_last_modified, coluna:fiscalizacoes.last_modified_by)*

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.jwt`, `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: `gatilho:public.fiscalizacoes.trg_set_fiscalizacao_last_modified` (dispara)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.set_fiscalizacao_last_modified()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_email text;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();
    IF v_email IS NULL THEN
      v_email := auth.jwt() ->> 'email';
    END IF;
    IF v_email IS NOT NULL THEN
      NEW.last_modified_by := v_email;
    END IF;
  ELSIF NEW.last_modified_by IS NULL THEN
    NEW.last_modified_by := 'sistema';
  END IF;
  
  NEW.last_modified_at := now();
  RETURN NEW;
END;
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: decidido; [detalhes](../../achados.md#a-005)).
