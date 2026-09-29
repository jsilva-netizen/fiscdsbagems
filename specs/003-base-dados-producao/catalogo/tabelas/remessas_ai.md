<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# remessas_ai

- **Tipo**: tabela
- **Dono**: módulo **processo_sancionador**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Remessa (lote) de autos de infração enviada a uma entidade: agrupa os autos de um termo de
notificação e acompanha as etapas com a entidade. Há uma remessa ativa por termo, verificada só
pela tela. **Vazia em produção.**

**Etapas:**

- **`preparada`:** criada na Gestão de Autos.
- **`enviada`:** ao enviar, com a lista dos autos em PDF.
- **`recebida`:** quando o prestador assina todos os autos no portal.
- **`defesa_enviada`:** quando o prestador envia o ofício de defesa.
- **`parecer_enviado`:** quando a equipe encaminha os pareceres assinados. *(fonte: src/pages/GestaoAutos.jsx:418, src/pages/GestaoAutos.jsx:473, src/pages/PortalPrestadorHome.jsx:584, src/pages/PortalPrestadorHome.jsx:738, src/pages/GestaoAutos.jsx:278, inventário: tabelas)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da remessa. *(fonte: src/lib/offline/repository.ts:1583)* |  |
| 2 | `termo_id` | uuid |  |  | Termo de notificação da remessa; excluir o termo exclui a remessa. *(fonte: src/pages/GestaoAutos.jsx:427, restricao:remessas_ai.remessas_ai_termo_id_fkey)* |  |
| 3 | `fiscalizacao_id` | uuid |  |  | Fiscalização da remessa; define a câmara pelo gatilho `tr_camara_remessas`. *(fonte: src/pages/GestaoAutos.jsx:428, gatilho:public.remessas_ai.tr_camara_remessas)* |  |
| 4 | `prestador_servico_id` | uuid |  |  | Entidade destinatária; limita o acesso do prestador às próprias remessas. *(fonte: src/pages/GestaoAutos.jsx:429, src/pages/PortalPrestadorHome.jsx:187)* |  |
| 5 | `numero_rfp` | text |  |  | Identificação do relatório de fiscalização do termo (ex.: RFP/DSB/<câmara>/<número>/<ano>). *(fonte: src/pages/GestaoAutos.jsx:430)* |  |
| 6 | `numero_tn` | text |  |  | Número do termo de notificação. **Sempre vazio**: a tela lê `termo.numero_tn`, que não existe; o<br>certo seria `numero_termo_notificacao`. *(fonte: src/pages/GestaoAutos.jsx:431, coluna:termos_notificacao.numero_termo_notificacao)* |  |
| 7 | `status` | text |  | `'preparada'::text` | Etapa da remessa: `preparada` (padrão), `enviada`, `recebida`, `defesa_enviada` e<br>`parecer_enviado`. Não é validado pelo banco, e o prestador grava duas das etapas. *(fonte: src/pages/GestaoAutos.jsx:432, src/pages/PortalPrestadorHome.jsx:585, src/pages/PortalPrestadorHome.jsx:739)* |  |
| 8 | `arquivo_lista_pdf_url` | text |  |  | PDF com a lista dos autos, gerado e anexado ao enviar. *(fonte: src/pages/GestaoAutos.jsx:472)* |  |
| 9 | `arquivo_recebimento_assinado_url` | text |  |  | Comprovante de recebimento assinado pelo prestador. ⚠️ *hipótese* |  |
| 10 | `arquivo_oficio_defesa_url` | text |  |  | Ofício de defesa enviado pelo prestador no portal. *(fonte: src/pages/PortalPrestadorHome.jsx:705)* |  |
| 11 | `arquivo_parecer_assinado_url` | text |  |  | Pareceres assinados encaminhados à entidade. ⚠️ *hipótese* |  |
| 12 | `criada_em` | timestamp with time zone |  | `now()` | Quando a remessa foi criada. *(fonte: src/pages/GestaoAutos.jsx:433)* |  |
| 13 | `enviada_em` | timestamp with time zone |  |  | Quando foi enviada à entidade. *(fonte: src/pages/GestaoAutos.jsx:473)* |  |
| 14 | `recebida_em` | timestamp with time zone |  |  | Quando o prestador concluiu o recebimento (relógio do aparelho dele). *(fonte: src/pages/PortalPrestadorHome.jsx:584)* |  |
| 15 | `defesa_enviada_em` | timestamp with time zone |  |  | Quando o prestador enviou a defesa (relógio do aparelho dele). *(fonte: src/pages/PortalPrestadorHome.jsx:738)* |  |
| 16 | `parecer_enviado_em` | timestamp with time zone |  |  | Quando a equipe encaminhou os pareceres. *(fonte: src/pages/GestaoAutos.jsx:278, src/pages/PareceresTecnicos.jsx:176)* |  |
| 17 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração, gravada pela função de atualização da tela. *(fonte: src/lib/offline/repository.ts:1589)* |  |
| 18 | `camara_tecnica_id` | text |  |  | Câmara da remessa, herdada da fiscalização pelo gatilho. Controla o acesso por câmara, mas a<br>política "(DEV)" libera qualquer usuário ativo. *(fonte: funcao:trg_remessa_set_camara(), politica:public.remessas_ai.Acesso total autenticado (DEV))* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `remessas_ai_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id) ON DELETE SET NULL` |
| `remessas_ai_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `remessas_ai_prestador_servico_id_fkey` | chave_estrangeira | `FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico(id) ON DELETE SET NULL` |
| `remessas_ai_termo_id_fkey` | chave_estrangeira | `FOREIGN KEY (termo_id) REFERENCES termos_notificacao(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `idx_remessas_ai_camara` | `CREATE INDEX idx_remessas_ai_camara ON public.remessas_ai USING btree (camara_tecnica_id)` |
| `remessas_ai_pkey` | `CREATE UNIQUE INDEX remessas_ai_pkey ON public.remessas_ai USING btree (id)` |

## Dependências

**Depende de:**

- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)
- [prestadores_servico](../tabelas/prestadores_servico.md) — referencia (catalogo)
- [termos_notificacao](../tabelas/termos_notificacao.md) — referencia (catalogo)

**É usada por:**

- [remessas_ai_itens](../tabelas/remessas_ai_itens.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `tr_camara_remessas` | ativo | [trg_remessa_set_camara()](../funcoes/trg_remessa_set_camara.md) | Antes de inserir, se a câmara vier vazia, copia a câmara da fiscalização. *(fonte: funcao:trg_remessa_set_camara())* |

<details><summary>Definição de tr_camara_remessas</summary>

```sql
CREATE TRIGGER tr_camara_remessas BEFORE INSERT ON remessas_ai FOR EACH ROW EXECUTE FUNCTION trg_remessa_set_camara()
```

</details>

## Políticas de acesso

### Acesso total autenticado (DEV)

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Quem tem perfil ativo, de qualquer papel e câmara, lê, cria, altera e exclui qualquer remessa. É o
que permite ao prestador registrar recebimento e defesa, mas também deixa um prestador alterar a
remessa de outro. Desde a migration 138; antes, valia para qualquer logado. *(fonte: supabase/migrations/138_fix_open_policies.sql, src/pages/PortalPrestadorHome.jsx:583)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)

WITH CHECK:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)
```

</details>

### Fiscais e Admins: acesso por camara em remessas

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin total; coordenador e fiscal ativos, pelas remessas da sua câmara. Sem efeito prático por causa da política "(DEV)". *(fonte: funcao:can_access_camara(row_camara text))*
- **Funções auxiliares**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md)

<details><summary>Condição original</summary>

```sql
USING:
can_access_camara(camara_tecnica_id)

WITH CHECK:
can_access_camara(camara_tecnica_id)
```

</details>

### Prestadores: ler suas próprias remessas

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê as remessas da própria entidade; contida na política "(DEV)". *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
