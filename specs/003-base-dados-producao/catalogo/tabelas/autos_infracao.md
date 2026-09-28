<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# autos_infracao

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
| 2 | `prestador_servico_id` | uuid |  |  |  |  |
| 3 | `unidade_fiscalizada_id` | uuid |  |  |  |  |
| 4 | `fiscalizacao_id` | uuid |  |  |  |  |
| 5 | `determinacao_id` | uuid |  |  |  |  |
| 6 | `resposta_determinacao_id` | uuid |  |  |  |  |
| 7 | `numero_auto` | text |  |  |  |  |
| 8 | `descricao` | text |  |  |  |  |
| 9 | `valor` | numeric(10,2) |  |  |  |  |
| 10 | `status` | text |  | `'pendente'::text` |  |  |
| 11 | `data_emissao` | timestamp with time zone |  | `now()` |  |  |
| 12 | `arquivo_url` | text |  |  |  |  |
| 13 | `arquivo_protocolo_oficio` | text |  |  |  |  |
| 14 | `arquivo_protocolo_ai_recebido` | text |  |  |  |  |
| 15 | `arquivo_defesa_oficio` | text |  |  |  |  |
| 16 | `arquivo_defesa` | text |  |  |  |  |
| 17 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 18 | `defesa_texto` | text |  |  |  |  |
| 19 | `defesa_arquivos` | jsonb |  | `'[]'::jsonb` |  | JSON — formas: nenhuma linha |
| 20 | `pena_base_rs` | numeric(14,2) | sim | `0` |  |  |
| 21 | `pena_base_uferms` | integer | sim | `0` |  |  |
| 22 | `camara_tecnica_id` | text |  |  |  |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `autos_infracao_determinacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id) ON DELETE SET NULL` |
| `autos_infracao_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id)` |
| `autos_infracao_pena_base_rs_nonneg` | verificacao | `CHECK (pena_base_rs >= 0::numeric)` |
| `autos_infracao_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `autos_infracao_prestador_servico_id_fkey` | chave_estrangeira | `FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico(id)` |
| `autos_infracao_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id)` |

| Índice | Definição |
|---|---|
| `autos_infracao_pkey` | `CREATE UNIQUE INDEX autos_infracao_pkey ON public.autos_infracao USING btree (id)` |
| `idx_autos_det` | `CREATE INDEX idx_autos_det ON public.autos_infracao USING btree (determinacao_id)` |
| `idx_autos_infracao_camara` | `CREATE INDEX idx_autos_infracao_camara ON public.autos_infracao USING btree (camara_tecnica_id)` |

## Dependências

**Depende de:**

- [determinacoes](../tabelas/determinacoes.md) — referencia (catalogo)
- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)
- [prestadores_servico](../tabelas/prestadores_servico.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- [gerar_numero_auto()](../funcoes/gerar_numero_auto.md) — le (codigo)
- [julgamentos](../tabelas/julgamentos.md) — referencia (catalogo)
- [manifestacoes_auto](../tabelas/manifestacoes_auto.md) — referencia (catalogo)
- [pareceres_tecnicos](../tabelas/pareceres_tecnicos.md) — referencia (catalogo)
- [remessas_ai_itens](../tabelas/remessas_ai_itens.md) — referencia (catalogo)

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `tr_camara_autos` | ativo | [trg_auto_set_camara()](../funcoes/trg_auto_set_camara.md) | _Sem anotação._ |

<details><summary>Definição de tr_camara_autos</summary>

```sql
CREATE TRIGGER tr_camara_autos BEFORE INSERT ON autos_infracao FOR EACH ROW EXECUTE FUNCTION trg_auto_set_camara()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso por camara em autos

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

### Prestadores: ler seus próprios autos

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

### autos_prestador_select

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

### autos_staff_all

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
