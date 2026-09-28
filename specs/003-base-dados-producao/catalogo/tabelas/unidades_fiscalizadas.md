<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# unidades_fiscalizadas

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 402
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` |  |  |
| 2 | `fiscalizacao_id` | uuid |  |  |  |  |
| 3 | `tipo_unidade_id` | uuid |  |  |  |  |
| 4 | `tipo_unidade_nome` | text |  |  |  |  |
| 5 | `nome_unidade` | text |  |  |  |  |
| 6 | `codigo_unidade` | text |  |  |  |  |
| 7 | `status` | text |  | `'em_andamento'::text` |  | `em_andamento` (225), `finalizada` (173), `pendente` (4) |
| 8 | `total_constatacoes` | integer |  | `0` |  |  |
| 9 | `total_ncs` | integer |  | `0` |  | `0` (261), `1` (59), `2` (30), `3` (11), `6` (8), `8` (7), `7` (6), `4` (5), `5` (4), `11` (3), `10` (2), `13` (2), `12` (1), `17` (1), `23` (1), `9` (1) |
| 10 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 11 | `updated_at` | timestamp with time zone |  | `now()` |  |  |
| 12 | `latitude` | double precision |  |  |  |  |
| 13 | `longitude` | double precision |  |  |  |  |
| 14 | `endereco` | text |  |  |  |  |
| 15 | `data_hora_vistoria` | timestamp with time zone |  | `now()` |  |  |
| 16 | `fotos_unidade` | jsonb |  | `'[]'::jsonb` |  | JSON — formas: array (402); elementos: object (1409); chaves: `bucket`:string (1409), `cleanBucket`:string (364), `cleanPath`:string (364), `height`:number (38), `latitude`:number (179), `legenda`:string (1409), `localId`:string (1210), `longitude`:number (179), `mimeType`:string (38), `path`:string (1409), `resolucao_km`:string (179), `resolucao_rodovia`:string (179), `url`:string (1224), `width`:number (38) |
| 17 | `ordem` | integer |  | `0` |  |  |
| 18 | `coordenadas` | text |  |  |  |  |
| 19 | `total_determinacoes` | integer |  | `0` |  |  |
| 20 | `total_recomendacoes` | integer |  | `0` |  |  |
| 21 | `rodovia` | text |  |  | Comentário no banco: Rodovia do ponto da ocorrência. |  |
| 22 | `trecho` | text |  |  | Comentário no banco: Trecho específico da rodovia. |  |
| 23 | `km` | text |  |  | Comentário no banco: KM aproximado (ex: 42.5). |  |
| 24 | `tipo_ocorrencia` | text |  |  | Comentário no banco: Tipo de ocorrência/problema detectado. | `(nulo)` (324), `constatacao` (72), `nc` (6) |
| 25 | `gravidade` | text |  |  | Comentário no banco: Gravidade da ocorrência (leve, media, grave, gravissima). |  |
| 26 | `sentido` | text |  |  | Comentário no banco: Sentido da via no ponto da ocorrência (N, S, L, O, N/S, etc). | `(nulo)` (324), `S` (32), `N` (27), `N/S` (19) |
| 27 | `per` | text |  |  | Comentário no banco: Seção do PER da ocorrência (ex: "3.1.1 Pavimento"). Espelha item_contrato do tipo selecionado. | `(nulo)` (324), `3.2.3 Obras de Ampliação de Capacidade` (14), `3.4.5.2. Socorro Mecânico` (10), `3.3.2 Pavimento` (9), `3.4.4.1. Painéis de Mensagens Variáveis Fixos` (9), `3.4.4.2. Painéis de Mensagens Variáveis Móveis` (9), `3.3.3 Elementos de Proteção e Segurança` (7), `3.3.5 Sistema de Drenagem e Obras de Arte Correntes` (5), `3.3.7 Canteiro Central e Faixa de Domínio` (5), `3.3.8 Edificações e Instalações Operacionais` (4), `3.2.2 Obras de Melhorias Operacionais` (2), `3.1.1 Pavimento` (1), `3.1.3 Obras de Arte Especiais` (1), `3.2.2 PAVIMENTO` (1), `3.3.7 Canteiro Central e Faixa de Domínio ` (1) |
| 28 | `frente` | text |  |  | Comentário no banco: Frente da concessão (ex: "RECUPERAÇÃO E MANUTENÇÃO"). | `(nulo)` (324), `CONSERVAÇÃO` (32), `SERVIÇOS OPERACIONAIS` (28), `MELHORIAS OPERACIONAIS, DE AMPLIAÇÃO DECAPACIDADE E DE MANUTENÇÃO DO NÍVEL DE SERVIÇO` (16), `RECUPERAÇÃO E MANUTENÇÃO` (2) |
| 29 | `nao_atendimento` | text |  |  | Comentário no banco: Cláusula específica do PER não cumprida — coluna NÃO ATENDIMENTO no relatório. | `(nulo)` (396), `3.3.5. Conservação do sistema de drenagem e das OACs das rodovias` (2), `3.1.1 Intervenções nas pistas, acostamentos, faixas de segurança, interseções e vias marginais, para a retirada de elementos indesejáveis, tais como areia, pedras, fragmentos de pneus, animais acidentados, vegetação, detritos orgânicos, lixo e objetos lançados por veículos ou pela população lindeira, bem como de quaisquer elementos prejudiciais à segurança dos usuários.` (1), `3.3.2 reparo de panelas e afundamentos plásticos em pontos localizados e trincas de Classe 3 nos pavimentos flexíveis.` (1), `3.3.3. Conservação da sinalização horizontal, vertical e aérea (incluindo tachas e tachões retrorrefletivos, balizadores e delineadores), e dos demais dispositivos de proteção e segurança, tais como defensas metálicas, barreiras de concreto, dispositivos antiofuscantes e atenuadores de impacto.` (1), `A somatória do tempo de interrupção de funcionamento dos equipamentos, que integram o sistema de Painéis de Mensagens Variáveis fixo, não poderá ser superior a 24:00 (vinte e quatro) horas por mês.` (1) |
| 30 | `prazo_dias_nc` | integer |  |  | Comentário no banco: Prazo em dias para sanar a não conformidade. | `(nulo)` (396), `15` (3), `1` (2), `30` (1) |
| 31 | `gps_accuracy_m` | numeric |  |  | Comentário no banco: Precisão (em metros) do GPS no momento em que o KM/rodovia foram determinados. |  |
| 32 | `km_impreciso` | boolean | sim | `false` | Comentário no banco: TRUE quando o KM/rodovia foram gravados sem um GPS de precisão <= 20m — sinaliza necessidade de revisão manual. |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `unidades_fiscalizadas_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id) ON DELETE CASCADE` |
| `unidades_fiscalizadas_fotos_is_array_check` | verificacao | `CHECK (jsonb_typeof(fotos_unidade) = 'array'::text)` |
| `unidades_fiscalizadas_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `unidades_fiscalizadas_status_check` | verificacao | `CHECK (status = ANY (ARRAY['pendente'::text, 'em_andamento'::text, 'finalizada'::text, 'cancelada'::text]))` |

| Índice | Definição |
|---|---|
| `idx_unidades_codigo` | `CREATE INDEX idx_unidades_codigo ON public.unidades_fiscalizadas USING btree (codigo_unidade)` |
| `idx_unidades_fiscalizacao` | `CREATE INDEX idx_unidades_fiscalizacao ON public.unidades_fiscalizadas USING btree (fiscalizacao_id)` |
| `idx_unidades_fotos_gin` | `CREATE INDEX idx_unidades_fotos_gin ON public.unidades_fiscalizadas USING gin (fotos_unidade)` |
| `idx_unidades_nome` | `CREATE INDEX idx_unidades_nome ON public.unidades_fiscalizadas USING btree (nome_unidade)` |
| `idx_unidades_status` | `CREATE INDEX idx_unidades_status ON public.unidades_fiscalizadas USING btree (status)` |
| `idx_unidades_tipo` | `CREATE INDEX idx_unidades_tipo ON public.unidades_fiscalizadas USING btree (tipo_unidade_id)` |
| `unidades_fiscalizadas_fiscalizacao_codigo_unq` | `CREATE UNIQUE INDEX unidades_fiscalizadas_fiscalizacao_codigo_unq ON public.unidades_fiscalizadas USING btree (fiscalizacao_id, codigo_unidade) WHERE ((codigo_unidade IS NOT NULL) AND (btrim(codigo_unidade) <> ''::text))` |
| `unidades_fiscalizadas_fiscalizacao_ordem_idx` | `CREATE INDEX unidades_fiscalizadas_fiscalizacao_ordem_idx ON public.unidades_fiscalizadas USING btree (fiscalizacao_id, ordem)` |
| `unidades_fiscalizadas_pkey` | `CREATE UNIQUE INDEX unidades_fiscalizadas_pkey ON public.unidades_fiscalizadas USING btree (id)` |

## Dependências

**Depende de:**

- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)

**É usada por:**

- [can_access_unidade(unidade uuid)](../funcoes/can_access_unidade.md) — le (codigo)
- [caters_import_from_fiscalizacao(p_fiscalizacao_id uuid, p_caters_process_id uuid, p_prazo_dias integer)](../funcoes/caters_import_from_fiscalizacao.md) — le (codigo)
- [finalizar_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/finalizar_fiscalizacao.md) — le (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — escreve (codigo)
- [gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean)](../funcoes/gerar_ncs_unidade.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_apenas_finalizadas boolean)](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [obter_resumo_indicadores(p_anos text[], p_servicos text[], p_municipio_ids uuid[], p_prestador_ids uuid[], p_tipo_modulo text[])](../funcoes/obter_resumo_indicadores.md) — le (codigo)
- [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) — le (codigo)
- [reabrir_fiscalizacao(p_fiscalizacao_id uuid)](../funcoes/reabrir_fiscalizacao.md) — escreve (codigo)
- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)
- [constatacoes_manuais](../tabelas/constatacoes_manuais.md) — referencia (catalogo)
- [determinacoes](../tabelas/determinacoes.md) — referencia (catalogo)
- [fotos_evidencia](../tabelas/fotos_evidencia.md) — referencia (catalogo)
- [nao_conformidades](../tabelas/nao_conformidades.md) — referencia (catalogo)
- [recomendacoes](../tabelas/recomendacoes.md) — referencia (catalogo)
- [respostas_checklist](../tabelas/respostas_checklist.md) — referencia (catalogo)
- [respostas_determinacao](../tabelas/respostas_determinacao.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_audit_unidades` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | _Sem anotação._ |
| `trg_propagate_unidades` | ativo | [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) | _Sem anotação._ |
| `update_unidades_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | _Sem anotação._ |

<details><summary>Definição de trg_audit_unidades</summary>

```sql
CREATE TRIGGER trg_audit_unidades AFTER INSERT OR DELETE OR UPDATE ON unidades_fiscalizadas FOR EACH ROW EXECUTE FUNCTION process_audit_log()
```

</details>

<details><summary>Definição de trg_propagate_unidades</summary>

```sql
CREATE TRIGGER trg_propagate_unidades AFTER INSERT OR DELETE OR UPDATE ON unidades_fiscalizadas FOR EACH ROW EXECUTE FUNCTION propagate_modification_to_parent()
```

</details>

<details><summary>Definição de update_unidades_updated_at</summary>

```sql
CREATE TRIGGER update_unidades_updated_at BEFORE UPDATE ON unidades_fiscalizadas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso total em unidades

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

### Prestadores: ler suas próprias unidades

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM fiscalizacoes f
  WHERE ((f.id = unidades_fiscalizadas.fiscalizacao_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### Prestadores: ler suas pr├│prias unidades

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM fiscalizacoes f
  WHERE ((f.id = unidades_fiscalizadas.fiscalizacao_id) AND (f.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### e2e_test_user_own_rows_only

- **Papéis**: authenticated · **Operação**: UPDATE · **RESTRICTIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (EXISTS ( SELECT 1
   FROM fiscalizacoes f
  WHERE ((f.id = unidades_fiscalizadas.fiscalizacao_id) AND (f.created_by = auth.uid())))))

WITH CHECK:
(nenhuma)
```

</details>

### e2e_test_user_own_rows_only_delete

- **Papéis**: authenticated · **Operação**: DELETE · **RESTRICTIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
((auth.uid() <> '5cdf15b9-4b87-4163-8ee7-6eaecd354f67'::uuid) OR (EXISTS ( SELECT 1
   FROM fiscalizacoes f
  WHERE ((f.id = unidades_fiscalizadas.fiscalizacao_id) AND (f.created_by = auth.uid())))))

WITH CHECK:
(nenhuma)
```

</details>

### unidades_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._
- **Funções auxiliares**: [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND can_access_fiscalizacao(fiscalizacao_id))

WITH CHECK:
(nenhuma)
```

</details>

### unidades_staff_all

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
