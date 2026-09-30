<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# tipos_ocorrencia_dtr

- **Tipo**: tabela
- **Dono**: módulo **checklists**
- **Linhas em produção**: 79
- **RLS ativo**: sim

## Finalidade

Catálogo de tipos de ocorrência que o fiscal da DTR registra na rodovia, derivado do PER
(Programa de Exploração da Rodovia) do contrato de concessão. É o equivalente, na DTR, ao
checklist do saneamento. Cada tipo diz:

- a frente e o item do PER;
- se gera NC, com o não atendimento e o prazo;
- o texto do relatório;
- as etapas, quando é obra.

Produção tem 79 tipos ativos, todos das rodovias "112/306".

- **Manutenção:** aba de tipos das Definições da DTR, só por planilha. Baixa-se o modelo XLSX e
  importa-se a planilha preenchida.
- **Importação:** casa cada linha com o tipo existente pela combinação frente + item do PER +
  descrição + rodovia; altera no próprio registro ou insere.
- **"Limpar base":** apaga todos os tipos.
- **App offline:** baixa os tipos para escolher offline.

Diferente dos checklists, **não há versionamento**. A ocorrência já registrada preserva o texto
porque copia frente, PER, não atendimento e prazo para a unidade.

No sistema novo, o catálogo é do motor de verificação (módulo `checklists`, spec 005), que atende
DSB e DTR; os campos próprios da rodovia (frente, item do PER, rodovias, etapas de obra) são
campos do modelo de catálogo da CATERF, a câmara que fiscaliza as rodovias, e ficam no módulo `dtr`. *(fonte: src/lib/offline/repository.ts:320, src/lib/offline/repository.ts:295, src/pages/DefinicoesDTR.jsx:136, src/pages/DefinicoesDTR.jsx:248, tabela:unidades_fiscalizadas, inventário: dados_referencia.tipos_ocorrencia_dtr)*

Comentário no banco: Catálogo configurável de tipos de ocorrência para fiscalização de rodovias (DTR).

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `gen_random_uuid()` | Identificador do tipo, gerado na importação. *(fonte: src/lib/offline/repository.ts:356)* |  |
| 2 | `nome` | text | sim |  | Nome do tipo mostrado ao fiscal. A importação usa a descrição; se vazia, o item do PER ou a<br>frente. *(fonte: src/lib/offline/repository.ts:335)* |  |
| 3 | `gera_nc` | boolean | sim | `false` | Se a ocorrência deste tipo é uma não conformidade (51 tipos) ou só uma constatação (28). Define<br>`tipo_ocorrencia` da unidade e em que tabela do relatório ela aparece. *(fonte: src/lib/offline/repository.ts:341, inventário: dominio_categorico)* | `true` (51), `false` (28) |
| 4 | `item_contrato` | text |  |  | Seção do PER (ex.: "3.1.2 Sinalização e Elementos de Proteção e Segurança"). É copiada para<br>`unidades_fiscalizadas.per` e faz parte da chave da importação. *(fonte: src/lib/offline/repository.ts:325, inventário: dominio_categorico)* | `3.3.2 Pavimento` (9), `3.3.8 Edificações e Instalações Operacionais` (9), `3.1.6 Canteiro Central e Faixa de Domínio` (7), `3.1.2 Sinalização e Elementos de Proteção e Segurança` (6), `3.1.4. Sistemas de Drenagem e Obras-de-Arte Correntes` (6), `3.3.7 Canteiro Central e Faixa de Domínio` (6), `3.1.1 Pavimento` (5), `3.1.3 Obras de Arte Especiais` (5), `3.3.5 Sistema de Drenagem e Obras de Arte Correntes` (5), `3.2.2 Obras de Melhorias Operacionais` (4), `3.3.3 Elementos de Proteção e Segurança` (4), `3.1.5. Terraplenos e Estruturas de Contenção` (2), `3.2.3 Obras de Ampliação de Capacidade` (2), `3.3.4 Obras de Arte Especiais` (2), `3.4.5.2. Socorro Mecânico` (2), `3.4.4.1. Painéis de Mensagens Variáveis Fixos` (1), `3.4.4.2. Painéis de Mensagens Variáveis Móveis` (1), `3.4.4.5. Sistema de Controle De Velocidade` (1), `3.4.5. Sistema de Atendimento aos Usuários` (1), `3.4.5.1. Atendimento Médico de Emergência` (1) |
| 5 | `descricao` | text |  |  | Texto da coluna DESCRIÇÃO do relatório de constatações, quando o tipo não gera NC. Faz parte da<br>chave da importação. *(fonte: src/lib/offline/repository.ts:325)* |  |
| 6 | `ativo` | boolean | sim | `true` | Se o tipo está disponível; a importação grava sempre `true` (os 79 estão ativos). *(fonte: src/lib/offline/repository.ts:349, inventário: dominio_categorico)* | `true` (79) |
| 7 | `created_at` | timestamp with time zone |  | `now()` | Quando o tipo foi importado. *(fonte: src/lib/offline/repository.ts:356)* |  |
| 8 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração: gravada pela importação e pelo gatilho `update_tipos_ocorrencia_dtr_updated_at`. *(fonte: gatilho:public.tipos_ocorrencia_dtr.update_tipos_ocorrencia_dtr_updated_at)* |  |
| 9 | `nao_atendimento` | text |  |  | Cláusula ou parâmetro do PER que não está sendo cumprido; vai para a coluna NÃO ATENDIMENTO do<br>relatório. É copiado para a ocorrência. *(fonte: src/lib/offline/repository.ts:343, tabela:unidades_fiscalizadas)* |  |
| 10 | `prazo_dias_padrao` | integer |  |  | Prazo padrão, em dias, para sanar a NC (em produção: 1, 5, 15 ou 30; vazio em 32 tipos). É<br>copiado para `unidades_fiscalizadas.prazo_dias_nc`. *(fonte: src/lib/offline/repository.ts:344, inventário: dominio_categorico)* | `(nulo)` (32), `15` (23), `30` (13), `1` (8), `5` (3) |
| 11 | `observacoes` | text |  |  | Observação-padrão que pode sair nas tabelas de constatações e de não conformidades. *(fonte: src/lib/offline/repository.ts:346)* |  |
| 12 | `frente` | text |  |  | Frente da concessão: CONSERVAÇÃO (35), RECUPERAÇÃO E MANUTENÇÃO (31), SERVIÇOS OPERACIONAIS (7) ou<br>MELHORIAS OPERACIONAIS… (6). É copiada para a ocorrência e faz parte da chave da importação. *(fonte: src/lib/offline/repository.ts:325, inventário: dominio_categorico)* | `CONSERVAÇÃO` (35), `RECUPERAÇÃO E MANUTENÇÃO` (31), `SERVIÇOS OPERACIONAIS` (7), `MELHORIAS OPERACIONAIS, DE AMPLIAÇÃO DECAPACIDADE E DE MANUTENÇÃO DO NÍVEL DE SERVIÇO` (6) |
| 13 | `rodovia` | text |  |  | Rodovias a que o tipo se aplica; vazio vale para todas as da concessão. Em produção, todos têm<br>"112/306". Faz parte da chave da importação. *(fonte: src/lib/offline/repository.ts:325, inventário: dados_referencia.tipos_ocorrencia_dtr)* |  |
| 14 | `etapas_obra` | text |  |  | Etapas de obra, uma por linha, oferecidas no assistente de registro quando o tipo é de obra (ex.:<br>Limpeza, Terraplenagem, Pavimentação). Vazio quando não é obra, o que vale para 73 dos 79 tipos. *(fonte: src/pages/DefinicoesDTR.jsx:206, inventário: dominio_categorico)* | `(nulo)` (73), `Limpeza<br>Terraplenagem<br>Execução das Camadas de Base e Sub Base<br>Pavimentação CBUQ<br>Pavimentação TSD<br>Sinalização` (4), `Fundação<br>Ensaio<br>Armação e formas<br>Concretagem<br>Laje<br>Base sobre a laje de transição<br>Pavimentação<br>Sinalização e segurança` (1), `Limpeza<br>Terraplenagem<br>Execução das Camadas de Base e Sub Base<br>Pavimentação CBUQ<br>Pavimentação TSD<br>Sinalização<br>Degrau acostamento` (1) |

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
| `update_tipos_ocorrencia_dtr_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:update_updated_at_column())* |

<details><summary>Definição de update_tipos_ocorrencia_dtr_updated_at</summary>

```sql
CREATE TRIGGER update_tipos_ocorrencia_dtr_updated_at BEFORE UPDATE ON tipos_ocorrencia_dtr FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

</details>

## Políticas de acesso

### Escrita admin tipos_ocorrencia_dtr

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Apesar do nome, não é só para admin: quem tem perfil ativo, de qualquer papel, cria, altera e
apaga tipos, inclusive o "Limpar base". Desde a migration 138; antes, valia para qualquer logado. *(fonte: supabase/migrations/138_fix_open_policies.sql)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)

WITH CHECK:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)
```

</details>

### Leitura autenticada tipos_ocorrencia_dtr

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Quem tem perfil ativo lê os tipos. Desde a migration 138; antes, qualquer logado. O worker de
relatórios lê com a chave de serviço. *(fonte: supabase/migrations/138_fix_open_policies.sql, supabase/functions/relatorios_worker/index.ts:294)*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(( SELECT get_my_role() AS get_my_role) IS NOT NULL)

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
