<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# nao_conformidades

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 478
- **RLS ativo**: sim

## Finalidade

Não conformidades (NCs) de cada unidade: uma para cada resposta Não em item que gera NC e para
cada constatação manual marcada como NC. Produção tem 478.

São totalmente derivadas: `gerar_ncs_unidade` apaga todas as NCs da unidade e as recria a cada
execução. Ela roda na finalização da fiscalização e, desde a migration 141, também no pedido de
relatório. Durante a vistoria, o app cria determinações e recomendações, mas não NCs. A numeração
(NC1, NC2…) continua de uma unidade para a outra dentro da fiscalização.

Nenhuma tela as edita. A única outra gravação é a importação de uma fiscalização exportada
(Exportar/Importar), que insere as NCs do arquivo.

Ao serem recriadas, as determinações perdem o vínculo com a NC antiga (`ON DELETE SET NULL`) e
recebem o da nova. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), src/pages/ExportarImportar.jsx:363, src/lib/offline/repository.ts:2392, supabase/migrations/141_fix_funcoes_sem_verificacao.sql, restricao:determinacoes.determinacoes_nao_conformidade_id_fkey, inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da NC; muda a cada regeneração. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 2 | `unidade_fiscalizada_id` | uuid |  |  | Unidade da NC. Excluir a unidade exclui as NCs. *(fonte: restricao:nao_conformidades.nao_conformidades_unidade_fiscalizada_id_fkey)* |  |
| 3 | `descricao` | text | sim |  | Texto da NC: "Constatação C<n>: não cumprimento do <artigo>;". Usa "artigo aplicável" quando o<br>item não tem artigo; para constatação manual, usa a descrição de NC dela, se houver. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 4 | `gravidade` | text |  |  | Gravidade da NC. É sempre `Média`: é o valor fixo gravado pela função, e as 478 linhas de<br>produção o têm. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), inventário: dominio_categorico)* | `Média` (478) |
| 5 | `created_at` | timestamp with time zone |  | `now()` | Quando a NC foi (re)criada. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 6 | `resposta_checklist_id` | uuid |  |  | Resposta do checklist que originou a NC; vazio para NC de constatação manual. Fica vazio se a<br>resposta for apagada. Há dois índices idênticos nesta coluna. *(fonte: restricao:nao_conformidades.nao_conformidades_resposta_checklist_id_fkey, indice:idx_nc_resposta, indice:idx_nc_resposta_checklist)* |  |
| 7 | `fotos` | jsonb |  | `'[]'::jsonb` | Fotos da NC (lista), vazia em produção: a função não preenche. Só a limpeza de arquivos a lê,<br>para apagar fotos antigas. As fotos da vistoria ficam na unidade. *(fonte: inventário: estrutura_json, src/lib/storageCleanup.js:189, funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* | JSON — formas: array (478) |
| 8 | `latitude_foto` | double precision |  |  | Sem uso: nenhuma função ou tela lê ou grava. ⚠️ *hipótese* |  |
| 9 | `longitude_foto` | double precision |  |  | Sem uso: nenhuma função ou tela lê ou grava. ⚠️ *hipótese* |  |
| 10 | `numero_nc` | text |  |  | Número da NC (NC1, NC2…), sequencial na fiscalização: continua depois das NCs das unidades<br>finalizadas antes desta. As determinações citam este número ("Sanar NC<n>"). *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 11 | `artigo_portaria` | text |  |  | Dispositivo normativo descumprido, copiado do item do checklist ou da constatação manual. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `nao_conformidades_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `nao_conformidades_resposta_checklist_id_fkey` | chave_estrangeira | `FOREIGN KEY (resposta_checklist_id) REFERENCES respostas_checklist(id) ON DELETE SET NULL` |
| `nao_conformidades_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `idx_nc_resposta` | `CREATE INDEX idx_nc_resposta ON public.nao_conformidades USING btree (resposta_checklist_id)` |
| `idx_nc_resposta_checklist` | `CREATE INDEX idx_nc_resposta_checklist ON public.nao_conformidades USING btree (resposta_checklist_id)` |
| `idx_nc_unidade` | `CREATE INDEX idx_nc_unidade ON public.nao_conformidades USING btree (unidade_fiscalizada_id)` |
| `nao_conformidades_pkey` | `CREATE UNIQUE INDEX nao_conformidades_pkey ON public.nao_conformidades USING btree (id)` |

## Dependências

**Depende de:**

- [respostas_checklist](../tabelas/respostas_checklist.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- [determinacoes_fill_origem()](../funcoes/determinacoes_fill_origem.md) — le (codigo)
- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — le (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — escreve (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [determinacoes](../tabelas/determinacoes.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso total em ncs

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos têm acesso total, sem olhar a câmara. *(fonte: funcao:get_my_role())*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))
```

</details>

### Prestadores: ler suas próprias ncs

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê as NCs de unidades de fiscalizações da própria entidade, sem exigir termo de
notificação. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM (unidades_fiscalizadas u
     JOIN fiscalizacoes f ON ((f.id = u.fiscalizacao_id)))
  WHERE ((u.id = nao_conformidades.unidade_fiscalizada_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### ncs_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Leitura pelo prestador com termo de notificação; sem efeito próprio hoje (a anterior já libera). *(fonte: funcao:can_access_unidade(unidade uuid))*
- **Funções auxiliares**: [can_access_unidade(unidade uuid)](../funcoes/can_access_unidade.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND can_access_unidade(unidade_fiscalizada_id))

WITH CHECK:
(nenhuma)
```

</details>

### ncs_staff_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Acesso total para admin, fiscal e coordenador ativos (`is_staff`); redundante. *(fonte: funcao:is_staff())*
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

_Nenhuma divergência entre produção e migrations, nenhum achado._
