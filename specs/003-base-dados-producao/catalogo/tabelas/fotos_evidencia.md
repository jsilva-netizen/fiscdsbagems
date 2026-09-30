<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# fotos_evidencia

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Tabela de fotos de evidência por fiscalização ou unidade, **sem uso**: está vazia em produção e
nenhuma tela, função ou edge function a lê ou grava. As fotos da vistoria ficam na lista
`unidades_fiscalizadas.fotos_unidade`. É candidata a descarte, a decidir nos achados. *(fonte: inventário: tabelas, tabela:unidades_fiscalizadas)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da foto (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 2 | `fiscalizacao_id` | uuid |  |  | Fiscalização da foto (tabela sem uso); excluir a fiscalização excluiria as fotos. *(fonte: restricao:fotos_evidencia.fotos_evidencia_fiscalizacao_id_fkey)* |  |
| 3 | `unidade_fiscalizada_id` | uuid |  |  | Unidade da foto (tabela sem uso). *(fonte: restricao:fotos_evidencia.fotos_evidencia_unidade_fiscalizada_id_fkey)* |  |
| 4 | `url` | text | sim |  | Endereço da foto (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 5 | `bucket_path` | text | sim |  | Caminho do arquivo no bucket (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 6 | `descricao` | text |  |  | Legenda da foto (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 7 | `created_at` | timestamp with time zone |  | `now()` | Quando a foto foi registrada (tabela sem uso). *(fonte: inventário: tabelas)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `fotos_evidencia_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id) ON DELETE CASCADE` |
| `fotos_evidencia_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `fotos_evidencia_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `fotos_evidencia_pkey` | `CREATE UNIQUE INDEX fotos_evidencia_pkey ON public.fotos_evidencia USING btree (id)` |

## Dependências

**Depende de:**

- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso total em fotos

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos teriam acesso total (tabela sem uso). *(fonte: funcao:get_my_role())*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))
```

</details>

### Prestadores: ler suas próprias fotos

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo leria as fotos de fiscalizações da própria entidade (tabela sem uso). *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = fotos_evidencia.unidade_fiscalizada_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

- Achado **A-007** — 13 tabelas vazias em produção (situação: decidido; [detalhes](../../achados.md#a-007)).
- Achado **A-030** — Tabelas sem uso: julgamentos, manifestações e fotos de evidência (situação: decidido; [detalhes](../../achados.md#a-030)).
