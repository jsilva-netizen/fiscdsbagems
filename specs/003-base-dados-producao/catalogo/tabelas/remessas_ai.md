<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# remessas_ai

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `termo_id` | uuid |  |  |  |  |
| 3 | `fiscalizacao_id` | uuid |  |  |  |  |
| 4 | `prestador_servico_id` | uuid |  |  |  |  |
| 5 | `numero_rfp` | text |  |  |  |  |
| 6 | `numero_tn` | text |  |  |  |  |
| 7 | `status` | text |  | `'preparada'::text` |  |  |
| 8 | `arquivo_lista_pdf_url` | text |  |  |  |  |
| 9 | `arquivo_recebimento_assinado_url` | text |  |  |  |  |
| 10 | `arquivo_oficio_defesa_url` | text |  |  |  |  |
| 11 | `arquivo_parecer_assinado_url` | text |  |  |  |  |
| 12 | `criada_em` | timestamp with time zone |  | `now()` |  |  |
| 13 | `enviada_em` | timestamp with time zone |  |  |  |  |
| 14 | `recebida_em` | timestamp with time zone |  |  |  |  |
| 15 | `defesa_enviada_em` | timestamp with time zone |  |  |  |  |
| 16 | `parecer_enviado_em` | timestamp with time zone |  |  |  |  |
| 17 | `updated_at` | timestamp with time zone |  | `now()` |  |  |
| 18 | `camara_tecnica_id` | text |  |  |  |  |

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
| `tr_camara_remessas` | ativo | [trg_remessa_set_camara()](../funcoes/trg_remessa_set_camara.md) | _Sem anotação._ |

<details><summary>Definição de tr_camara_remessas</summary>

```sql
CREATE TRIGGER tr_camara_remessas BEFORE INSERT ON remessas_ai FOR EACH ROW EXECUTE FUNCTION trg_remessa_set_camara()
```

</details>

## Políticas de acesso

### Acesso total autenticado (DEV)

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

### Fiscais e Admins: acesso por camara em remessas

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
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
- **Em linguagem simples**: _Sem anotação._
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
