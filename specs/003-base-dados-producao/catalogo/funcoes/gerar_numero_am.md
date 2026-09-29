<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# gerar_numero_am

## `gerar_numero_am()`

- **Retorno**: `text` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): não
- **Dono**: módulo **processo_sancionador**

**Finalidade**: Gera o número da próxima Análise da Manifestação: `AM NNN/AAAA/DSB/AGEMS`. É a quantidade de
termos do ano que já têm número de AM, mais 1.

- **Contagem com as permissões de quem chama:** a função não usa permissão elevada, então a
  contagem só inclui os termos que o usuário vê.
- **Repetição de números:** dois pedidos ao mesmo tempo, ou uma AM desfeita, podem repetir
  números.
- **"DSB" fixo:** a sigla é fixa, qualquer que seja a diretoria. *(fonte: src/lib/offline/repository.ts:1487, src/pages/AnaliseManifestacao.jsx:261, coluna:termos_notificacao.numero_am)*

**Regra de negócio**: Numeração anual das AMs. O sistema novo deve usar uma sequência gravada, única e por diretoria.

- **Lê**: [termos_notificacao](../tabelas/termos_notificacao.md)
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/pages/AnaliseManifestacao.jsx:261 (ao concluir a Análise da Manifestação)

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
