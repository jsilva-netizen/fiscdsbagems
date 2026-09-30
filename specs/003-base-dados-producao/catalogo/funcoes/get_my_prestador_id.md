<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# get_my_prestador_id

## `get_my_prestador_id()`

- **Retorno**: `uuid` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Devolve a entidade regulada que o usuário logado representa (só o papel prestador tem uma). É a
base do portal do prestador no banco: 23 políticas em 16 tabelas a usam para limitar o prestador
aos dados da própria entidade (fiscalizações, unidades, respostas, determinações, termos, autos,
julgamentos, remessas…).

Desde a migration 137, só considera perfil ativo. *(fonte: supabase/migrations/137_fix_signup_privilege_escalation.sql)*

**Regra de negócio**: O prestador vê só o que é da sua entidade. A spec do portal do prestador deve descrever, tabela a
tabela, o que ele vê.

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: [proteger_resposta_determinacao_prestador()](../funcoes/proteger_resposta_determinacao_prestador.md) (chama), `politica:public.autos_infracao.Prestadores: ler seus próprios autos` (usa), `politica:public.constatacoes_manuais.Prestadores: ler suas próprias constatacoes` (usa), `politica:public.determinacoes.Prestadores: ler suas próprias determinacoes` (usa), `politica:public.fiscalizacoes.Prestadores: ler apenas suas próprias fiscalizações` (usa), `politica:public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe` (usa), `politica:public.fotos_evidencia.Prestadores: ler suas próprias fotos` (usa), `politica:public.julgamentos.Prestadores: ler julgamentos de seus autos` (usa), `politica:public.manifestacoes_auto.Prestadores: atualizar suas próprias manifestações` (usa), `politica:public.manifestacoes_auto.Prestadores: cadastrar suas próprias manifestações` (usa), `politica:public.manifestacoes_auto.Prestadores: ler suas próprias manifestações` (usa), `politica:public.nao_conformidades.Prestadores: ler suas próprias ncs` (usa), `politica:public.pareceres_tecnicos.Prestadores: ler pareceres de seus autos` (usa), `politica:public.recomendacoes.Prestadores: ler suas próprias recomendacoes` (usa), `politica:public.remessas_ai.Prestadores: ler suas próprias remessas` (usa), `politica:public.remessas_ai_itens.Prestadores: ler itens de suas próprias remessas` (usa), `politica:public.respostas_checklist.Prestadores: ler suas próprias respostas` (usa), `politica:public.respostas_determinacao.Prestadores: ler suas próprias respostas determinacoes` (usa), `politica:public.termos_notificacao.Prestadores: ler seus termos` (usa), `politica:public.unidades_fiscalizadas.Prestadores: ler suas próprias unidades` (usa), `politica:public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades` (usa)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_my_prestador_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT prestador_servico_id FROM public.profiles WHERE id = auth.uid() AND ativo IS TRUE;
$function$
```

</details>

## Divergências e achados

- Achado **A-005** — 37 funções com permissão elevada (SECURITY DEFINER) (situação: aguardando_decisao; [detalhes](../../achados.md#a-005)).
