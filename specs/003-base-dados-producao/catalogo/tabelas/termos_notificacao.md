<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# termos_notificacao

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 5
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `numero_termo_notificacao` | text |  |  |  |  |
| 3 | `numero_rfp` | text |  |  |  |  |
| 4 | `municipio_id` | uuid |  |  |  |  |
| 5 | `prestador_servico_id` | uuid |  |  |  |  |
| 6 | `fiscalizacao_id` | uuid |  |  |  |  |
| 7 | `numero_processo` | text |  |  |  |  |
| 8 | `camara_tecnica` | text |  |  |  | `CATESA` (3), `CATERS` (2) |
| 9 | `data_protocolo` | date |  |  |  |  |
| 10 | `prazo_resposta_dias` | integer |  | `30` |  |  |
| 11 | `observacoes` | text |  |  |  |  |
| 12 | `arquivo_url` | text |  |  |  |  |
| 13 | `arquivo_protocolo_url` | text |  |  |  |  |
| 14 | `arquivo_oficio_protocolo` | text |  |  |  |  |
| 15 | `data_maxima_resposta` | date |  |  |  |  |
| 16 | `data_geracao` | timestamp with time zone |  | `now()` |  |  |
| 17 | `data_recebimento_resposta` | date |  |  |  |  |
| 18 | `recebida_no_prazo` | boolean |  |  |  | `(nulo)` (3), `false` (1), `true` (1) |
| 19 | `arquivos_resposta` | jsonb |  | `'[]'::jsonb` |  | JSON — formas: array (5); elementos: object (1); chaves: `assinatura_digital_valida`:boolean (1), `bucket`:string (1), `categoria`:string (1), `data_upload`:string (1), `nome`:string (1), `path`:string (1), `tamanho`:number (1), `tipo`:string (1), `url`:string (1) |
| 20 | `arquivo_oficio_resposta` | text |  |  |  |  |
| 21 | `numero_am` | text |  |  |  |  |
| 22 | `status` | text |  | `'pendente_tn'::text` |  | `aguardando_assinatura_prestador` (2), `respondido` (2), `aguardando_resposta` (1) |
| 23 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 24 | `updated_at` | timestamp with time zone |  | `now()` |  |  |
| 25 | `arquivo_rfp_url` | text |  |  |  |  |
| 26 | `arquivo_tn_prestador_url` | text |  |  |  |  |
| 27 | `assinatura_prestador_valida` | boolean |  | `false` |  |  |
| 28 | `data_assinatura_prestador` | timestamp with time zone |  |  |  |  |
| 29 | `data_inicio_prazo` | date |  |  |  |  |
| 30 | `fluxo_manual` | boolean |  | `false` |  | `true` (3), `false` (2) |
| 31 | `arquivo_am_assinada_url` | text |  |  |  |  |
| 32 | `am_concluida_em` | timestamp with time zone |  |  |  |  |
| 33 | `tipo_relatorio` | text | sim | `'RFP'::text` |  | `RFP` (4), `RFE` (1) |
| 34 | `ano_geracao` | integer |  | `(EXTRACT(year FROM now()))::integer` |  | `2026` (5) |
| 35 | `arquivo_resposta_url` | text |  |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `termos_notificacao_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id)` |
| `termos_notificacao_municipio_id_fkey` | chave_estrangeira | `FOREIGN KEY (municipio_id) REFERENCES municipios(id)` |
| `termos_notificacao_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `termos_notificacao_prestador_servico_id_fkey` | chave_estrangeira | `FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico(id)` |
| `termos_notificacao_tipo_relatorio_check` | verificacao | `CHECK (tipo_relatorio = ANY (ARRAY['RFP'::text, 'RFE'::text, 'RAO'::text]))` |

| Índice | Definição |
|---|---|
| `termos_notificacao_pkey` | `CREATE UNIQUE INDEX termos_notificacao_pkey ON public.termos_notificacao USING btree (id)` |
| `termos_notificacao_tipo_camara_numero_ano_uniq` | `CREATE UNIQUE INDEX termos_notificacao_tipo_camara_numero_ano_uniq ON public.termos_notificacao USING btree (tipo_relatorio, camara_tecnica, numero_rfp, ano_geracao) WHERE ((numero_rfp IS NOT NULL) AND (btrim(numero_rfp) <> ''::text))` |

## Dependências

**Depende de:**

- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)
- [municipios](../tabelas/municipios.md) — referencia (catalogo)
- [prestadores_servico](../tabelas/prestadores_servico.md) — referencia (catalogo)

**É usada por:**

- [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md) — le (codigo)
- [can_access_unidade(unidade uuid)](../funcoes/can_access_unidade.md) — le (codigo)
- [gerar_numero_am()](../funcoes/gerar_numero_am.md) — le (codigo)
- [remessas_ai](../tabelas/remessas_ai.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_termos_notificacao_set_ano_geracao` | ativo | [set_termos_notificacao_ano_geracao()](../funcoes/set_termos_notificacao_ano_geracao.md) | _Sem anotação._ |

<details><summary>Definição de trg_termos_notificacao_set_ano_geracao</summary>

```sql
CREATE TRIGGER trg_termos_notificacao_set_ano_geracao BEFORE INSERT OR UPDATE OF data_geracao ON termos_notificacao FOR EACH ROW EXECUTE FUNCTION set_termos_notificacao_ano_geracao()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso total em termos

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))
```

</details>

### Prestadores: ler seus termos

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

### Prestadores: responder seus termos

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))

WITH CHECK:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))
```

</details>

### termos_prestador_select_own

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()))

WITH CHECK:
(nenhuma)
```

</details>

### termos_prestador_update_own_until_respondido

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND (COALESCE(status, ''::text) <> 'respondido'::text))

WITH CHECK:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()))
```

</details>

### termos_staff_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
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
