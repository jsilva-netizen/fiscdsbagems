<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# manifestacoes_auto

- **Tipo**: tabela
- **Dono**: módulo **processo_sancionador**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Manifestações (defesas) da entidade sobre um auto de infração, **sem uso**. Está vazia em
produção, e nenhuma tela grava nela: só a limpeza de arquivos a lê e apaga. A defesa atual fica no
próprio auto (`defesa_texto`, `defesa_arquivos`, arquivos de defesa) e no ofício de defesa da
remessa. *(fonte: src/lib/storageCleanup.js:110, tabela:autos_infracao, inventário: tabelas)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da manifestação (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 2 | `auto_infracao_id` | uuid |  |  | Auto contestado; excluir o auto excluiria a manifestação (tabela sem uso). *(fonte: restricao:manifestacoes_auto.manifestacoes_auto_auto_infracao_id_fkey)* |  |
| 3 | `descricao` | text |  |  | Texto da manifestação (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 4 | `data_manifestacao` | timestamp with time zone |  | `now()` | Quando a manifestação foi feita (tabela sem uso). *(fonte: inventário: tabelas)* |  |
| 5 | `arquivo_url` | text |  |  | Arquivo da manifestação; a limpeza de arquivos o apaga (tabela sem uso). *(fonte: src/lib/storageCleanup.js:110)* |  |
| 6 | `created_at` | timestamp with time zone |  | `now()` | Quando o registro foi criado (tabela sem uso). *(fonte: inventário: tabelas)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `manifestacoes_auto_auto_infracao_id_fkey` | chave_estrangeira | `FOREIGN KEY (auto_infracao_id) REFERENCES autos_infracao(id) ON DELETE CASCADE` |
| `manifestacoes_auto_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `manifestacoes_auto_pkey` | `CREATE UNIQUE INDEX manifestacoes_auto_pkey ON public.manifestacoes_auto USING btree (id)` |

## Dependências

**Depende de:**

- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso por camara em manifestacoes

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin total; coordenador e fiscal ativos, pelas manifestações de autos da sua câmara. Sem efeito
prático: `manifestacoes_staff_all` libera a equipe toda. *(fonte: funcao:get_my_role(), funcao:get_my_camara_tecnica())*
- **Funções auxiliares**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM autos_infracao ai
  WHERE ((ai.id = manifestacoes_auto.auto_infracao_id) AND can_access_camara(ai.camara_tecnica_id))))))

WITH CHECK:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM autos_infracao ai
  WHERE ((ai.id = manifestacoes_auto.auto_infracao_id) AND can_access_camara(ai.camara_tecnica_id))))))
```

</details>

### Prestadores: atualizar suas próprias manifestações

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo altera manifestações de autos da própria entidade. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = get_my_prestador_id())))))
```

</details>

### Prestadores: cadastrar suas próprias manifestações

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo cria manifestações para autos da própria entidade. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = get_my_prestador_id())))))
```

</details>

### Prestadores: ler suas próprias manifestações

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê manifestações de autos da própria entidade. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### manifestacoes_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Mesma leitura pelo prestador, de outro conjunto de políticas; redundante. *(fonte: funcao:current_prestador_servico_id())*
- **Funções auxiliares**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = manifestacoes_auto.auto_infracao_id) AND (a.prestador_servico_id = current_prestador_servico_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### manifestacoes_staff_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Acesso total para admin, fiscal e coordenador ativos (`is_staff`), sem olhar a câmara. *(fonte: funcao:is_staff())*
- **Funções auxiliares**: [is_staff()](../funcoes/is_staff.md)

<details><summary>Condição original</summary>

```sql
USING:
is_staff()

WITH CHECK:
is_staff()
```

</details>

## Divergências e achados

- Divergência `politica:public.manifestacoes_auto.manifestacoes_prestador_select`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.manifestacoes_auto.manifestacoes_staff_all`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Achado **A-007** — 13 tabelas vazias em produção (situação: decidido; [detalhes](../../achados.md#a-007)).
- Achado **A-030** — Tabelas sem uso: julgamentos, manifestações e fotos de evidência (situação: decidido; [detalhes](../../achados.md#a-030)).
