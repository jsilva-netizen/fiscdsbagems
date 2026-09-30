<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# itens_checklist

- **Tipo**: tabela
- **Dono**: módulo **checklists**
- **Linhas em produção**: 768
- **RLS ativo**: sim

## Finalidade

Perguntas do checklist de cada tipo de unidade, com os textos que a vistoria gera conforme a
resposta: constatação, não conformidade, determinação e recomendação.

**Versionamento só por inserção (append-only).** Nenhuma linha é alterada nem apagada:

- a "chave" de um item é o tipo mais a `ordem` (ou, sem ordem, a pergunta);
- a linha mais recente de cada chave é a que vale;
- editar insere uma versão nova, e editar trocando a chave também insere uma versão inativa na
  chave antiga;
- excluir insere uma versão inativa.

Na vistoria, o app usa a versão vigente na data em que a unidade foi criada, dando preferência às
versões já respondidas. Assim, uma vistoria antiga continua com o texto da época.

Consequência: `ativo = true` não diz se a linha vale. Em produção, das 768 linhas, 525 são itens
vigentes e 243 são versões antigas, todas ainda com `ativo = true`. São 82 chaves com 2 a 5
versões, em 7 tipos; em 81 delas a pergunta é idêntica, o que indica reimportação da planilha.

- **Manutenção:** tela Checklists (formulário e importação de planilha Excel).
- **App offline:** baixa todas as linhas, inclusive as versões antigas. *(fonte: src/pages/Checklists.jsx:50, src/pages/Checklists.jsx:100, src/pages/Checklists.jsx:146, src/lib/offline/repository.ts:670, src/lib/offline/syncEngine.ts:2061, specs/001-data-access-abstraction/debitos-tecnicos-e-inconsistencias.md, inventário: dados_referencia.itens_checklist)*

Comentário no banco: Itens dos checklists normativos

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador de uma versão do item, gerado pela tela. A resposta da vistoria aponta para a versão<br>respondida (`respostas_checklist.item_checklist_id`), e é assim que o texto da época se preserva. *(fonte: src/pages/Checklists.jsx:100, src/lib/offline/repository.ts:670)* |  |
| 2 | `tipo_unidade_id` | uuid |  |  | Tipo de unidade a que o item pertence; faz parte da chave de versão. O banco aceita nulo. Apagar<br>o tipo apaga os itens em cascata, mas a tela de tipos nunca apaga, só inativa. *(fonte: restricao:itens_checklist.itens_checklist_tipo_unidade_id_fkey, src/lib/offline/repository.ts:670)* |  |
| 3 | `ordem` | integer |  | `0` | Posição do item no checklist e parte da chave de versão: versões com o mesmo tipo e a mesma<br>ordem são o mesmo item. Mudar a ordem numa edição cria um item "novo" e inativa o da ordem<br>antiga. Em produção, todos têm ordem maior que zero. *(fonte: src/pages/Checklists.jsx:62, src/pages/Checklists.jsx:131)* |  |
| 4 | `pergunta` | text | sim |  | Pergunta feita ao fiscal na vistoria, com resposta Sim ou Não. É a chave de versão quando o item<br>não tem ordem. *(fonte: src/pages/VistoriarUnidade.jsx:1420, src/pages/Checklists.jsx:62)* |  |
| 5 | `texto_constatacao_sim` | text |  |  | Texto da constatação registrada quando a resposta é Sim, e que vai para o relatório. Preenchido<br>em todas as linhas de produção. *(fonte: src/pages/VistoriarUnidade.jsx:373, src/components/admin/ItemChecklistForm.jsx:64)* |  |
| 6 | `texto_constatacao_nao` | text |  |  | Texto da constatação registrada quando a resposta é Não. *(fonte: src/pages/VistoriarUnidade.jsx:375)* |  |
| 7 | `gera_nc` | boolean |  | `false` | Se a resposta Não gera não conformidade (NC), e com ela determinação ou recomendação. Todas as<br>768 linhas de produção têm `true`. *(fonte: src/lib/offline/repository.ts:1236, funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), inventário: dominio_categorico)* | `true` (768) |
| 8 | `artigo_portaria` | text |  |  | Dispositivo normativo descumprido quando a resposta é Não. Compõe a descrição da NC:<br>"Constatação C<n>: não cumprimento do <artigo>;". Vazio em 50 linhas; nesse caso a descrição usa<br>"artigo aplicável". *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/pages/VistoriarUnidade.jsx:771)* |  |
| 9 | `texto_nc` | text |  |  | Descrição da NC gravada na resposta (`descricao_nc`). Só 4 textos distintos em produção e vazio<br>em 150 linhas. Na prática, a NC usa a descrição montada a partir do artigo. *(fonte: src/pages/VistoriarUnidade.jsx:839, inventário: dados_referencia.itens_checklist)* |  |
| 10 | `texto_determinacao` | text |  |  | Texto da determinação gerada quando a resposta é Não e o item gera NC. Vira "Sanar NC<n>.<br><texto>", com o prazo de `prazo_dias`. Quando existe, a recomendação não é gerada. Vazio em 366<br>linhas. *(fonte: src/lib/offline/repository.ts:1219, funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 11 | `texto_recomendacao` | text |  |  | Texto da recomendação gerada quando a resposta é Não, o item gera NC e não tem texto de<br>determinação. Vazio em 452 linhas. *(fonte: src/lib/offline/repository.ts:870)* |  |
| 12 | `prazo_dias` | integer |  | `30` | Prazo, em dias, da determinação gerada pelo item. A data-limite é a data da geração mais o prazo.<br>Padrão 30, que é o valor de todas as linhas de produção. *(fonte: src/lib/offline/repository.ts:1238, inventário: dominio_categorico)* | `30` (768) |
| 13 | `ativo` | boolean |  | `true` | `false` marca a exclusão do item (versão inativa). Não indica a versão vigente: versões antigas<br>continuam `true`, e vale a mais recente de cada chave. Todas as 768 linhas de produção têm `true`,<br>então nenhum item foi excluído. *(fonte: src/pages/Checklists.jsx:162, src/lib/offline/repository.ts:701)* | `true` (768) |
| 14 | `is_sample` | boolean |  | `false` | Sem uso: nenhuma tela lê ou grava, e todas as linhas têm `false`. Herança do app de origem. ⚠️ *hipótese* | `false` (768) |
| 15 | `created_by_id` | uuid |  |  | Sem uso: vazio em todas as linhas e ignorado pelo código. Herança do app de origem. ⚠️ *hipótese* |  |
| 16 | `created_by` | text |  |  | Sem uso: vazio em todas as linhas e ignorado pelo código. Herança do app de origem. ⚠️ *hipótese* |  |
| 17 | `created_date` | timestamp with time zone |  | `now()` | Cópia de `created_at` (igual nas 768 linhas), preenchida pelo padrão da coluna. O código não usa.<br>Herança do app de origem. ⚠️ *hipótese* |  |
| 18 | `updated_date` | timestamp with time zone |  | `now()` | Igual a `created_at` em todas as linhas: a tabela nunca é alterada, só recebe inserções. O<br>código não usa. ⚠️ *hipótese* |  |
| 19 | `created_at` | timestamp with time zone |  | `now()` | Quando a versão foi inserida. Decide qual versão vale (a mais recente de cada chave) e qual vale<br>numa vistoria (a mais recente até a criação da unidade). *(fonte: src/lib/offline/repository.ts:670, src/pages/Checklists.jsx:77)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `itens_checklist_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `itens_checklist_tipo_unidade_id_fkey` | chave_estrangeira | `FOREIGN KEY (tipo_unidade_id) REFERENCES tipos_unidade(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `itens_checklist_pkey` | `CREATE UNIQUE INDEX itens_checklist_pkey ON public.itens_checklist USING btree (id)` |

## Dependências

**Depende de:**

- [tipos_unidade](../tabelas/tipos_unidade.md) — referencia (catalogo)

**É usada por:**

- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [respostas_checklist](../tabelas/respostas_checklist.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Leitura pública de itens de checklist

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Quem tem perfil ativo lê todos os itens, inclusive o prestador. Desde a migration 138; antes,
qualquer logado lia. *(fonte: supabase/migrations/138_fix_open_policies.sql)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)

WITH CHECK:
(nenhuma)
```

</details>

### Operadores gerenciam itens de checklist

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos inserem, alteram e excluem itens. A tela só insere, e alterar
ou excluir quebraria o histórico das vistorias. Até a migration 138, uma política "Public Access"
dava o mesmo a qualquer um, sem login. *(fonte: funcao:get_my_role(), supabase/migrations/138_fix_open_policies.sql)*
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

- Achado **A-013** — Escrita sem login e acesso de conta não aprovada (situação: decidido; [detalhes](../../achados.md#a-013)).
- Achado **A-024** — Checklist versionado só por inserção (situação: decidido; [detalhes](../../achados.md#a-024)).
