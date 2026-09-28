<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# tipos_ocorrencia_dtr

- **Tipo**: tabela
- **Dono**: **sem dono** (lacuna)
- **Linhas em produção**: 79
- **RLS ativo**: sim

## Finalidade

_Sem anotação._

Comentário no banco: Catálogo configurável de tipos de ocorrência para fiscalização de rodovias (DTR).

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` |  |  |
| 2 | `nome` | text | sim |  |  |  |
| 3 | `gera_nc` | boolean | sim | `false` | Comentário no banco: Indica se este tipo de ocorrência gera não conformidade automática. | `true` (51), `false` (28) |
| 4 | `item_contrato` | text |  |  | Comentário no banco: Seção do PER (ex: "3.1.2 Sinalização e Elementos de Proteção e Segurança"). | `3.3.2 Pavimento` (9), `3.3.8 Edificações e Instalações Operacionais` (9), `3.1.6 Canteiro Central e Faixa de Domínio` (7), `3.1.2 Sinalização e Elementos de Proteção e Segurança` (6), `3.1.4. Sistemas de Drenagem e Obras-de-Arte Correntes` (6), `3.3.7 Canteiro Central e Faixa de Domínio` (6), `3.1.1 Pavimento` (5), `3.1.3 Obras de Arte Especiais` (5), `3.3.5 Sistema de Drenagem e Obras de Arte Correntes` (5), `3.2.2 Obras de Melhorias Operacionais` (4), `3.3.3 Elementos de Proteção e Segurança` (4), `3.1.5. Terraplenos e Estruturas de Contenção` (2), `3.2.3 Obras de Ampliação de Capacidade` (2), `3.3.4 Obras de Arte Especiais` (2), `3.4.5.2. Socorro Mecânico` (2), `3.4.4.1. Painéis de Mensagens Variáveis Fixos` (1), `3.4.4.2. Painéis de Mensagens Variáveis Móveis` (1), `3.4.4.5. Sistema de Controle De Velocidade` (1), `3.4.5. Sistema de Atendimento aos Usuários` (1), `3.4.5.1. Atendimento Médico de Emergência` (1) |
| 5 | `descricao` | text |  |  | Comentário no banco: Texto descritivo para a coluna DESCRIÇÃO do relatório de constatações (quando não gera NC). |  |
| 6 | `ativo` | boolean | sim | `true` |  | `true` (79) |
| 7 | `created_at` | timestamp with time zone |  | `now()` |  |  |
| 8 | `updated_at` | timestamp with time zone |  | `now()` |  |  |
| 9 | `nao_atendimento` | text |  |  | Comentário no banco: Cláusula/parâmetro específico do PER que não está sendo cumprido (coluna NÃO ATENDIMENTO no relatório). |  |
| 10 | `prazo_dias_padrao` | integer |  |  | Comentário no banco: Prazo padrão (dias) para sanar a não conformidade. | `(nulo)` (32), `15` (23), `30` (13), `1` (8), `5` (3) |
| 11 | `observacoes` | text |  |  | Comentário no banco: Observação-padrão que pode aparecer em ambas as tabelas: constatações e não conformidades. |  |
| 12 | `frente` | text |  |  | Comentário no banco: Frente da concessão (ex: RECUPERAÇÃO E MANUTENÇÃO, SERVIÇOS OPERACIONAIS, CONSERVAÇÃO). | `CONSERVAÇÃO` (35), `RECUPERAÇÃO E MANUTENÇÃO` (31), `SERVIÇOS OPERACIONAIS` (7), `MELHORIAS OPERACIONAIS, DE AMPLIAÇÃO DECAPACIDADE E DE MANUTENÇÃO DO NÍVEL DE SERVIÇO` (6) |
| 13 | `rodovia` | text |  |  | Comentário no banco: Rodovia à qual o tipo de ocorrência se aplica (ex: "112", "306", "40"). NULL = aplica-se a todas as rodovias da concessão. |  |
| 14 | `etapas_obra` | text |  |  | Comentário no banco: Etapas de obra disponíveis para seleção no wizard, separadas por nova linha (\\n). NULL = não é item de obra. | `(nulo)` (73), `Limpeza<br>Terraplenagem<br>Execução das Camadas de Base e Sub Base<br>Pavimentação CBUQ<br>Pavimentação TSD<br>Sinalização` (4), `Fundação<br>Ensaio<br>Armação e formas<br>Concretagem<br>Laje<br>Base sobre a laje de transição<br>Pavimentação<br>Sinalização e segurança` (1), `Limpeza<br>Terraplenagem<br>Execução das Camadas de Base e Sub Base<br>Pavimentação CBUQ<br>Pavimentação TSD<br>Sinalização<br>Degrau acostamento` (1) |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `tipos_ocorrencia_dtr_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `idx_tipos_ocorrencia_dtr_rodovia` | `CREATE INDEX idx_tipos_ocorrencia_dtr_rodovia ON public.tipos_ocorrencia_dtr USING btree (rodovia)` |
| `tipos_ocorrencia_dtr_pkey` | `CREATE UNIQUE INDEX tipos_ocorrencia_dtr_pkey ON public.tipos_ocorrencia_dtr USING btree (id)` |

## Dependências

**Depende de:**

- _nada_

**É usada por:**

- _nada_

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `update_tipos_ocorrencia_dtr_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | _Sem anotação._ |

<details><summary>Definição de update_tipos_ocorrencia_dtr_updated_at</summary>

```sql
CREATE TRIGGER update_tipos_ocorrencia_dtr_updated_at BEFORE UPDATE ON tipos_ocorrencia_dtr FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

</details>

## Políticas de acesso

### Escrita admin tipos_ocorrencia_dtr

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

### Leitura autenticada tipos_ocorrencia_dtr

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: _Sem anotação._

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
