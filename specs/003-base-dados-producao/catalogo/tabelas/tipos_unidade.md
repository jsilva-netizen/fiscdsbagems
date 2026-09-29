<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# tipos_unidade

- **Tipo**: tabela
- **Dono**: módulo **checklists**
- **Linhas em produção**: 33
- **RLS ativo**: sim

## Finalidade

Tipos de unidade que a fiscalização vistoria (ex.: Aterro Sanitário, Estação de Tratamento de
Esgoto, Gestão Administrativa e Financeira). Cada tipo tem seu checklist em `itens_checklist`, e
cada unidade fiscalizada é de um tipo.

- **Em produção:** 33 tipos, todos ativos, carregados de 2026-02-24 em diante. 3 deles ainda sem
  itens.
- **Manutenção:** a tela Tipos de Unidade cria, edita e "exclui". Excluir só marca como inativo,
  e dá para reativar.
- **Planilha:** a importação da tela Checklists cria os tipos que ainda não existem.
- **App offline:** baixa os tipos na sincronização, para vistoriar sem rede. *(fonte: src/pages/TiposUnidade.jsx:37, src/pages/TiposUnidade.jsx:75, src/pages/Checklists.jsx:308, src/lib/offline/syncEngine.ts:2055, inventário: dados_referencia.tipos_unidade)*

Comentário no banco: Tabela de tipos de unidade fiscalizável

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador do tipo. `itens_checklist` e `unidades_fiscalizadas` apontam para ele. Apagar o tipo<br>apagaria os itens em cascata, mas a tela nunca apaga. *(fonte: restricao:itens_checklist.itens_checklist_tipo_unidade_id_fkey, src/pages/TiposUnidade.jsx:75)* |  |
| 2 | `nome` | text | sim |  | Nome do tipo, mostrado ao escolher o tipo da unidade na vistoria. Também é a chave que a<br>importação de planilha usa para achar o tipo, sem diferenciar maiúsculas. *(fonte: src/pages/Checklists.jsx:220)* |  |
| 3 | `servicos_aplicaveis` | text[] |  |  | Serviços a que o tipo se aplica. Em produção: Abastecimento de Água (14), Esgotamento Sanitário<br>(8), Manejo de Resíduos Sólidos (7), Limpeza Urbana (1) e água e esgoto juntos (3).<br>A fiscalização e a inclusão de unidade só oferecem tipos ativos com algum serviço em comum com a<br>fiscalização; tipo sem serviço aparece em todas. É isso que separa os<br>checklists de cada câmara. *(fonte: inventário: dominio_categorico, src/pages/ExecutarFiscalizacao.jsx:183, src/pages/AdicionarUnidade.jsx:126)* | `{"Abastecimento de Água"}` (14), `{"Esgotamento Sanitário"}` (8), `{"Manejo de Resíduos Sólidos"}` (7), `{"Abastecimento de Água","Esgotamento Sanitário"}` (3), `{"Limpeza Urbana"}` (1) |
| 4 | `created_at` | timestamp with time zone |  | `now()` | Quando o tipo foi criado. *(fonte: inventário: dados_referencia.tipos_unidade)* |  |
| 5 | `ativo` | boolean |  | `true` | Se o tipo está disponível. "Excluir" na tela grava `false` e reativar grava `true`. Os 33 de<br>produção estão ativos. *(fonte: src/pages/TiposUnidade.jsx:75, src/pages/TiposUnidade.jsx:90)* | `true` (33) |
| 6 | `codigo` | text |  |  | Código curto do tipo (ex.: `AS`, `ADM`, `AMX-ETE`). É a base do código gerado para a unidade ao<br>adicioná-la na fiscalização, e a importação de planilha também reconhece o tipo por ele. *(fonte: src/pages/AdicionarUnidade.jsx:134, src/pages/Checklists.jsx:224)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `tipos_unidade_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `tipos_unidade_pkey` | `CREATE UNIQUE INDEX tipos_unidade_pkey ON public.tipos_unidade USING btree (id)` |

## Dependências

**Depende de:**

- _nada_

**É usada por:**

- [itens_checklist](../tabelas/itens_checklist.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Leitura pública de tipos de unidade

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Quem tem perfil ativo lê os tipos, inclusive o prestador. Desde a migration 138; antes, qualquer
logado lia. *(fonte: supabase/migrations/138_fix_open_policies.sql)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)

WITH CHECK:
(nenhuma)
```

</details>

### Operadores gerenciam tipos de unidade

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos criam, alteram e excluem tipos. Até a migration 138, uma
política "Public Access" dava o mesmo a qualquer um, sem login. *(fonte: funcao:get_my_role(), supabase/migrations/138_fix_open_policies.sql)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

- Divergência `coluna:tipos_unidade.codigo`: **estrutura_diferente**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
