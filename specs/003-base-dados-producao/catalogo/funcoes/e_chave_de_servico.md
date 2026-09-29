<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# e_chave_de_servico

## `e_chave_de_servico()`

- **Retorno**: `boolean` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): não
- **Dono**: módulo **core**

**Finalidade**: Diz se a requisição veio com a chave de serviço (papel `service_role` na sessão). Usada pelas
funções que aceitam tanto usuários quanto processos de fundo (reabrir e finalizar fiscalização,
gerar NCs, resumo de indicadores), para deixar passar a chave de serviço sem exigir perfil.
Criada na migration 141. No sistema novo, a distinção é entre usuário e tarefa de sistema. *(fonte: supabase/migrations/141_fix_funcoes_sem_verificacao.sql:23, funcao:reabrir_fiscalizacao(p_fiscalizacao_id uuid), funcao:finalizar_fiscalizacao(p_fiscalizacao_id uuid))*

- **Lê**: —
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) (chama), [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) (chama), [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) (chama), [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](../funcoes/obter_resumo_indicadores.md) (chama), [reabrir_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/reabrir_fiscalizacao.md) (chama)
- **Chamada por (telas e edge functions, anotado)**: _Sem anotação._

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.e_chave_de_servico()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role';
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
