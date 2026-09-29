<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# can_access_camara

## `can_access_camara(row_camara text)`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Decide se o usuário logado pode ver e alterar um registro de determinada câmara técnica:

- **Admin:** sempre.
- **Coordenador e fiscal:** se não têm câmara no perfil, veem tudo. Esse é o comportamento
  herdado de antes da divisão por câmaras. Com câmara, veem os registros da sua câmara e os sem
  câmara.
- **Diretor e prestador:** nunca por esta regra; o prestador tem regras próprias.

Usada por 6 políticas: `fiscalizacoes`, `autos_infracao`, `manifestacoes_auto`,
`pareceres_tecnicos`, `remessas_ai` e `remessas_ai_itens`. Com a migration 137, perfil inativo não
passa em nenhum caso. *(fonte: funcao:get_my_role(), funcao:get_my_camara_tecnica())*

**Regra de negócio**: Isolamento por câmara técnica, com três exceções herdadas:

- usuário sem câmara vê tudo;
- registro sem câmara é visível a todos;
- o registro recebe a câmara automaticamente pelos gatilhos `trg_*_set_camara`.

A spec do core deve decidir se essas exceções continuam no sistema novo.

- **Lê**: —
- **Escreve**: —
- **Chama**: [get_my_camara_tecnica()](../funcoes/get_my_camara_tecnica.md), [get_my_role()](../funcoes/get_my_role.md)
- **Chamada por (banco)**: [reabrir_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/reabrir_fiscalizacao.md) (chama), `politica:public.autos_infracao.Fiscais e Admins: acesso por camara em autos` (usa), `politica:public.catesa_ai_jobs.CATESA ai jobs: gestao` (usa), `politica:public.fiscalizacoes.Fiscais e Admins: acesso por camara em fiscalizacoes` (usa), `politica:public.manifestacoes_auto.Fiscais e Admins: acesso por camara em manifestacoes` (usa), `politica:public.pareceres_tecnicos.Fiscais e Admins: acesso por camara em pareceres` (usa), `politica:public.remessas_ai.Fiscais e Admins: acesso por camara em remessas` (usa), `politica:public.remessas_ai_itens.Fiscais e Admins: acesso por camara em itens de remessas` (usa)
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
