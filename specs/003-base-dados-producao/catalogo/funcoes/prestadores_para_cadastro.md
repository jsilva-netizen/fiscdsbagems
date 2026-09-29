<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# prestadores_para_cadastro

## `prestadores_para_cadastro()`

- **Retorno**: `TABLE(id uuid, nome text)` · **Linguagem**: sql · **Volatilidade**: stable
- **Permissão elevada** (`SECURITY DEFINER`): **sim**
- **Dono**: módulo **core**

**Finalidade**: Lista id e nome das entidades ativas, em ordem de nome, para a escolha da entidade na tela de
cadastro, antes do login. Criada na migration 138 no lugar da leitura aberta de
`prestadores_servico`, que expunha todas as colunas a quem não tinha login. Executável sem login. *(fonte: src/pages/Register.jsx:47, supabase/migrations/138_fix_open_policies.sql:23)*

- **Lê**: [prestadores_servico](../tabelas/prestadores_servico.md)
- **Escreve**: —
- **Chama**: —
- **Chamada por (banco)**: —
- **Chamada por (telas e edge functions, anotado)**: src/pages/Register.jsx:47 (sem login)

<details><summary>Código completo (produção)</summary>

```sql
CREATE OR REPLACE FUNCTION public.prestadores_para_cadastro()
 RETURNS TABLE(id uuid, nome text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id, p.nome FROM public.prestadores_servico p WHERE p.ativo IS TRUE ORDER BY p.nome;
$function$
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
