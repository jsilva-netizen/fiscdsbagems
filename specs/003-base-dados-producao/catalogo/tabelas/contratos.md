<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# contratos

- **Tipo**: tabela
- **Dono**: módulo **core**
- **Linhas em produção**: 2
- **RLS ativo**: sim

## Finalidade

Contratos entre a AGEMS e as entidades reguladas. Na avaliação, os instrumentos ficaram no core.

Hoje só a DTR usa: cada contrato é de concessão de uma rodovia, com o traçado KML e os pontos de
KM que o app usa em campo para achar o KM mais próximo pelo GPS. Produção tem 2.

- **Manutenção:** a tela Contratos (número, prestador e rodovia obrigatórios, prestadores da DTR)
  cria, edita e exclui pela fila offline.
- **Traçado:** a aba "Rodovias & KML" das Definições da DTR envia o traçado direto ao banco. *(fonte: src/pages/Contratos.jsx:37, src/pages/Contratos.jsx:96, src/pages/DefinicoesDTR.jsx:478, src/lib/offline/repository.ts:242, src/lib/offline/repository.ts:400)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do contrato, gerado no aparelho quando ele é criado offline. *(fonte: src/lib/offline/repository.ts:242)* |  |
| 2 | `numero_contrato` | text | sim |  | Número do contrato; obrigatório e usado para ordenar a lista. *(fonte: src/pages/Contratos.jsx:96, src/lib/offline/repository.ts:232)* |  |
| 3 | `prestador_servico_id` | uuid |  |  | Entidade contratada. Excluir a entidade exclui os contratos dela (`ON DELETE CASCADE`). *(fonte: restricao:contratos.contratos_prestador_servico_id_fkey, src/pages/Contratos.jsx:96)* |  |
| 4 | `rodovia` | text | sim |  | Rodovia objeto do contrato (ex.: MS-000); obrigatória. Dá nome ao arquivo KML e liga o contrato<br>aos pontos de KM usados na vistoria de ocorrências da DTR. *(fonte: src/pages/Contratos.jsx:96, src/lib/offline/repository.ts:400)* |  |
| 5 | `ativo` | boolean |  | `true` | Se o contrato está vigente; padrão `true` (os 2 em produção estão). *(fonte: inventário: dominio_categorico, src/lib/offline/syncEngine.ts:213)* | `true` (2) |
| 6 | `created_at` | timestamp with time zone |  | `now()` | Quando o contrato foi cadastrado (gravado pelo aparelho que o criou). *(fonte: src/lib/offline/repository.ts:242)* |  |
| 7 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração. Gravada pelo aparelho, pelo envio do KML e pelo gatilho<br>`update_contratos_updated_at`. A sincronização incremental a usa para levar um KML novo aos<br>aparelhos de campo. *(fonte: src/lib/offline/repository.ts:411, gatilho:public.contratos.update_contratos_updated_at)* |  |
| 8 | `kml_url` | text |  |  | Referência ao traçado da rodovia no formato `storage://kml-rodovias/<rodovia>_<8 primeiros<br>caracteres do id>.kml`. Gravada ao enviar o KML nas Definições da DTR; não passa pela fila<br>offline. *(fonte: src/lib/offline/repository.ts:400, src/pages/DefinicoesDTR.jsx:533)* |  |
| 9 | `km_points` | jsonb |  |  | Pontos de KM extraídos do KML: lista de `{lat, lng, km, rodovia}` (cerca de 15 mil pontos nos 2<br>contratos). Na vistoria de ocorrências da DTR, o app acha o KM mais próximo da posição GPS com<br>estes pontos, 100% offline. *(fonte: src/pages/DefinicoesDTR.jsx:479, src/pages/VistoriarOcorrenciaDTR.jsx:200, inventário: estrutura_json)* | JSON — formas: array (2); elementos: object (15199); chaves: `km`:string (15199), `lat`:number (15199), `lng`:number (15199), `rodovia`:string (15199) |

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
| `update_contratos_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:update_updated_at_column())* |

<details><summary>Definição de update_contratos_updated_at</summary>

```sql
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON contratos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

</details>

## Políticas de acesso

### Acesso total autenticado (DEV)

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Quem tem perfil ativo lê, cria, altera e exclui contratos. Desde a migration 138; antes, valia
para qualquer logado, inclusive conta não aprovada. É a única política da tabela: não há
restrição por papel. *(fonte: supabase/migrations/138_fix_open_policies.sql)*

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
