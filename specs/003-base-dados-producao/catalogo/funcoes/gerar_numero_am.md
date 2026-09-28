<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# gerar_numero_am

## `gerar_numero_am()`

- **Retorno**: `text` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): não
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: [termos_notificacao](../tabelas/termos_notificacao.md)
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.gerar_numero_am()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  ano text;
  seq int;
BEGIN
  ano := to_char(now(), 'YYYY');
  SELECT COALESCE(count(*), 0) + 1
    INTO seq
  FROM public.termos_notificacao
  WHERE numero_am IS NOT NULL
    AND numero_am <> ''
    AND to_char(created_at, 'YYYY') = ano;

  RETURN 'AM ' || lpad(seq::text, 3, '0') || '/' || ano || '/DSB/AGEMS';
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
