<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# get_my_role

## `get_my_role()`

- **Retorno**: `text` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Devolve o papel do usuário logado. É a função de identidade mais usada: 44 políticas em 24
tabelas a chamam diretamente, e também `can_access_camara`, `is_caters_user`,
`finalizar_fiscalizacao` e `gerar_ncs_unidade`.

Roda com permissão elevada (SECURITY DEFINER), para ler `profiles` sem passar pelas políticas da
própria tabela.

Desde a migration 137, só devolve o papel se o perfil estiver ativo; senão, nulo. Antes, devolvia
o papel mesmo de perfil não aprovado, o que permitia a escalada de privilégio pelo cadastro. *(fonte: supabase/migrations/137_fix_signup_privilege_escalation.sql, .specify/bugs/escalada-privilegio-cadastro/assessment.md)*

**Regra de negócio**: Só usuário aprovado (ativo) tem papel, e portanto acesso, no banco. A spec de módulo do core deve
descrever essa regra como parte da identidade e da autorização.

- **Lê**: [profiles](../tabelas/profiles.md), `externo:auth.uid`
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md) (chama), [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) (chama), [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) (chama), [is_caters_user()](../funcoes/is_caters_user.md) (chama), `politica:public.audit_logs.Fiscais, Coordenadores e Admins leem logs de auditoria` (usa), `politica:public.autos_infracao.Prestadores: ler seus próprios autos` (usa), `politica:public.camaras_tecnicas.Admins gerenciam câmaras técnicas` (usa), `politica:public.caters_processes.CATERS processos: deletar` (usa), `politica:public.constatacoes_manuais.Fiscais e Admins: acesso total em constatacoes` (usa), `politica:public.constatacoes_manuais.Prestadores: ler suas próprias constatacoes` (usa), `politica:public.determinacoes.Fiscais e Admins: acesso total em determinacoes` (usa), `politica:public.determinacoes.Prestadores: ler suas próprias determinacoes` (usa), `politica:public.fiscalizacoes.Prestadores: ler apenas suas próprias fiscalizações` (usa), `politica:public.fiscalizacoes.Prestadores: ler apenas suas pr├│prias fiscaliza├º├Áe` (usa), `politica:public.fotos_evidencia.Fiscais e Admins: acesso total em fotos` (usa), `politica:public.fotos_evidencia.Prestadores: ler suas próprias fotos` (usa), `politica:public.itens_checklist.Operadores gerenciam itens de checklist` (usa), `politica:public.julgamentos.Fiscais e Admins: acesso total em julgamentos` (usa), `politica:public.julgamentos.Prestadores: ler julgamentos de seus autos` (usa), `politica:public.manifestacoes_auto.Fiscais e Admins: acesso por camara em manifestacoes` (usa), `politica:public.manifestacoes_auto.Prestadores: atualizar suas próprias manifestações` (usa), `politica:public.manifestacoes_auto.Prestadores: cadastrar suas próprias manifestações` (usa), `politica:public.manifestacoes_auto.Prestadores: ler suas próprias manifestações` (usa), `politica:public.municipios.Operadores gerenciam municípios` (usa), `politica:public.nao_conformidades.Fiscais e Admins: acesso total em ncs` (usa), `politica:public.nao_conformidades.Prestadores: ler suas próprias ncs` (usa), `politica:public.pareceres_tecnicos.Fiscais e Admins: acesso por camara em pareceres` (usa), `politica:public.pareceres_tecnicos.Prestadores: ler pareceres de seus autos` (usa), `politica:public.prestadores_servico.Operadores gerenciam prestadores` (usa), `politica:public.profiles.Admins e coordenadores gerenciam perfis` (usa), `politica:public.recomendacoes.Fiscais e Admins: acesso total em recomendacoes` (usa), `politica:public.recomendacoes.Prestadores: ler suas próprias recomendacoes` (usa), `politica:public.remessas_ai.Prestadores: ler suas próprias remessas` (usa), `politica:public.remessas_ai_itens.Fiscais e Admins: acesso por camara em itens de remessas` (usa), `politica:public.remessas_ai_itens.Prestadores: ler itens de suas próprias remessas` (usa), `politica:public.respostas_checklist.Fiscais e Admins: acesso total em respostas` (usa), `politica:public.respostas_checklist.Prestadores: ler suas próprias respostas` (usa), `politica:public.respostas_determinacao.Fiscais e Admins: acesso total em respostas determinacoes` (usa), `politica:public.respostas_determinacao.Prestadores: atualizar suas próprias respostas determinacoes` (usa), `politica:public.respostas_determinacao.Prestadores: cadastrar respostas determinacoes` (usa), `politica:public.respostas_determinacao.Prestadores: ler suas próprias respostas determinacoes` (usa), `politica:public.termos_notificacao.Fiscais e Admins: acesso total em termos` (usa), `politica:public.termos_notificacao.Prestadores: ler seus termos` (usa), `politica:public.termos_notificacao.Prestadores: responder seus termos` (usa), `politica:public.tipos_unidade.Operadores gerenciam tipos de unidade` (usa), `politica:public.unidades_fiscalizadas.Fiscais e Admins: acesso total em unidades` (usa), `politica:public.unidades_fiscalizadas.Prestadores: ler suas próprias unidades` (usa), `politica:public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades` (usa)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$

  SELECT role FROM public.profiles WHERE id = auth.uid();

$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
