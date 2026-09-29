<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# municipios

- **Tipo**: tabela
- **Dono**: módulo **core**
- **Linhas em produção**: 79
- **RLS ativo**: sim

## Finalidade

Os 79 municípios de Mato Grosso do Sul, com código IBGE. Todos foram carregados de uma vez em
2026-02-24, e não há tela para criar ou editar: a tela Municípios só lista e busca.

Usada:

- para escolher o município de fiscalizações e termos de notificação (`termos_notificacao` tem
  chave estrangeira para cá);
- pelo portal do prestador;
- pelo app offline, que baixa `id` e `nome` na sincronização. *(fonte: inventário: dados_referencia.municipios, src/pages/Municipios.jsx:14, src/lib/offline/syncEngine.ts:2049, src/pages/PortalPrestadorHome.jsx:84)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador do município, referenciado por `termos_notificacao.municipio_id` (chave<br>estrangeira) e por `fiscalizacoes.municipio_id` (sem chave estrangeira). *(fonte: src/lib/offline/syncEngine.ts:2049)* |  |
| 2 | `nome` | text | sim |  | Nome do município, único na tabela. Aparece nas telas e nos relatórios. *(fonte: indice:municipios_nome_key, src/pages/Municipios.jsx:14)* |  |
| 3 | `created_at` | timestamp with time zone |  | `now()` | Quando o município foi carregado; igual para todos (carga única de 2026-02-24). *(fonte: inventário: dados_referencia.municipios)* |  |
| 4 | `codigo_ibge` | text |  |  | Código IBGE de 7 dígitos do município, mostrado e pesquisável na tela Municípios. *(fonte: src/pages/Municipios.jsx:19, src/pages/Municipios.jsx:56)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `municipios_nome_key` | unica | `UNIQUE (nome)` |
| `municipios_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `municipios_nome_key` | `CREATE UNIQUE INDEX municipios_nome_key ON public.municipios USING btree (nome)` |
| `municipios_pkey` | `CREATE UNIQUE INDEX municipios_pkey ON public.municipios USING btree (id)` |

## Dependências

**Depende de:**

- _nada_

**É usada por:**

- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [set_fiscalizacao_cache_fields()](../funcoes/set_fiscalizacao_cache_fields.md) — le (codigo)
- [termos_notificacao](../tabelas/termos_notificacao.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Leitura pública de municípios

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Qualquer logado lê os municípios, inclusive conta não aprovada. É dado público de referência. *(fonte: src/lib/offline/syncEngine.ts:2049)*

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

### Operadores gerenciam municípios

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin e coordenador ativos leem, criam, alteram e excluem municípios. Não há tela para isso. *(fonte: funcao:get_my_role(), src/pages/Municipios.jsx:14)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text]))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
