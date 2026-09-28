<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# can_access_camara

## `can_access_camara(row_camara text)`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: **sem dono** (lacuna)

**Finalidade**: _Sem anotação._

- **Lê**: —
- **Escreve**: —
- **Chama**: [get_my_camara_tecnica()](../funcoes/get_my_camara_tecnica.md), [get_my_role()](../funcoes/get_my_role.md)
- **Chamada por (banco)**: `politica:public.autos_infracao.Fiscais e Admins: acesso por camara em autos` (usa), `politica:public.fiscalizacoes.Fiscais e Admins: acesso por camara em fiscalizacoes` (usa), `politica:public.manifestacoes_auto.Fiscais e Admins: acesso por camara em manifestacoes` (usa), `politica:public.pareceres_tecnicos.Fiscais e Admins: acesso por camara em pareceres` (usa), `politica:public.remessas_ai.Fiscais e Admins: acesso por camara em remessas` (usa), `politica:public.remessas_ai_itens.Fiscais e Admins: acesso por camara em itens de remessas` (usa)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.can_access_camara(row_camara text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT (
    public.get_my_role() = 'admin'
    OR (
      public.get_my_role() IN ('coordenador', 'fiscal')
      AND (
        public.get_my_camara_tecnica() IS NULL  -- no chamber = backward compat, see all
        OR row_camara IS NULL                   -- legacy record
        OR row_camara = public.get_my_camara_tecnica()
      )
    )
  );
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
