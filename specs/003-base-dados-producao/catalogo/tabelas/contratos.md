<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# contratos

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 2
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` |  |  |
| 2 | `numero_contrato` | text | sim |  |  |  |
| 3 | `prestador_servico_id` | uuid |  |  |  |  |
| 4 | `rodovia` | text | sim |  |  |  |
| 5 | `ativo` | boolean |  | `true` |  | `true` (2) |
| 6 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 7 | `updated_at` | timestamp with time zone |  | `now()` |  |  |
| 8 | `kml_url` | text |  |  | Comentário no banco: URL do arquivo KML do traçado da rodovia no Supabase Storage (bucket kml-rodovias). |  |
| 9 | `km_points` | jsonb |  |  | Comentário no banco: Pontos KM do KML carregado. Array de {lat, lng, km} para detecção offline do KM mais próximo via GPS. | JSON — formas: array (2); elementos: object (15199); chaves: `km`:string (15199), `lat`:number (15199), `lng`:number (15199), `rodovia`:string (15199) |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `contratos_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `contratos_prestador_servico_id_fkey` | chave_estrangeira | `FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico(id) ON DELETE CASCADE` |

| Índice | Definição |
|---|---|
| `contratos_pkey` | `CREATE UNIQUE INDEX contratos_pkey ON public.contratos USING btree (id)` |

## Dependências

**Depende de:**

- [prestadores_servico](../tabelas/prestadores_servico.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `update_contratos_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | _Sem anotação._ |

<details><summary>Definição de update_contratos_updated_at</summary>

```sql
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
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
true
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
