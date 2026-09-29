<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# gerar_numero_auto

## `gerar_numero_auto()`

- **Retorno**: `text` · **Linguagem**: plpgsql · **Volatilidade**: volatile
- **Permissão elevada** (`SECURITY DEFINER`): não
- **Dono**: módulo **processo_sancionador**

**Finalidade**: Gera o número do próximo auto de infração: `AI NNN/AAAA/DSB/AGEMS`. É a quantidade de autos
criados no ano, mais 1.

Tem os mesmos problemas de `gerar_numero_am`:

- a contagem usa as permissões de quem chama;
- pode repetir números em pedidos simultâneos ou depois de exclusões;
- "DSB" é fixo.

É chamada uma vez por auto emitido na Análise da Manifestação. *(fonte: src/lib/offline/repository.ts:1481, src/pages/AnaliseManifestacao.jsx:271, coluna:autos_infracao.numero_auto)*

**Regra de negócio**: Numeração anual dos autos de infração; mesma recomendação da AM.

- **Lê**: [autos_infracao](../tabelas/autos_infracao.md)
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/pages/AnaliseManifestacao.jsx:271 (um por determinação não atendida)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.gerar_numero_auto()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    ano TEXT := to_char(NOW(), 'YYYY');
    seq INTEGER;
    novo_numero TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO seq FROM public.autos_infracao WHERE to_char(created_at, 'YYYY') = ano;
    novo_numero := 'AI ' || lpad(seq::text, 3, '0') || '/' || ano || '/DSB/AGEMS';
    RETURN novo_numero;
END;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
