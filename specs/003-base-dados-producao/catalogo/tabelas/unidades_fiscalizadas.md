<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# unidades_fiscalizadas

- **Tipo**: tabela
- **Dono**: módulo **fiscalizacao**
- **Linhas em produção**: 402
- **RLS ativo**: sim

## Finalidade

Cada unidade vistoriada dentro de uma fiscalização. No saneamento e nos resíduos, é uma
instalação (ex.: uma ETE, um aterro), com checklist do tipo da unidade, constatações, fotos e o
que a vistoria gera (NCs, determinações e recomendações). Na DTR, cada linha é uma ocorrência na
rodovia (KM, sentido, gravidade, item do PER).

Produção tem 402: 225 em andamento, 173 finalizadas e 4 pendentes.

- **Criação e edição:** criada offline (`createUnidade`), com a ordem sequencial dentro da
  fiscalização; campos editados um a um pelas funções `updateUnidade*`.
- **Fotos:** sincronizadas à parte, pela fila de fotos.
- **Totais e status:** `gerar_ncs_unidade` recalcula os totais, grava a lista de fotos e, ao
  finalizar, muda o status.
- **Na fiscalização:** toda alteração atualiza a data de modificação da fiscalização
  (`trg_propagate_unidades`) e é auditada. *(fonte: src/lib/offline/repository.ts:588, src/lib/offline/repository.ts:2332, src/lib/offline/syncEngine.ts:81, funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da unidade, gerado no aparelho. Respostas, constatações, NCs, determinações,<br>recomendações e fotos locais apontam para ele. *(fonte: src/lib/offline/repository.ts:589)* |  |
| 2 | `fiscalizacao_id` | uuid |  |  | Fiscalização a que a unidade pertence. Excluir a fiscalização exclui as unidades (`ON DELETE<br>CASCADE`). *(fonte: restricao:unidades_fiscalizadas.unidades_fiscalizadas_fiscalizacao_id_fkey)* |  |
| 3 | `tipo_unidade_id` | uuid |  |  | Tipo da unidade; define o checklist. Não há chave estrangeira para `tipos_unidade`. *(fonte: src/lib/offline/repository.ts:595, src/pages/VistoriarUnidade.jsx:124)* |  |
| 4 | `tipo_unidade_nome` | text |  |  | Nome do tipo copiado na unidade. O app atual não grava: a criação não inclui o campo, a<br>sincronização não o envia e nenhum gatilho o preenche. Só a leitura o traz, para linhas antigas. ⚠️ *hipótese* |  |
| 5 | `nome_unidade` | text |  |  | Nome da unidade informado pelo fiscal (ex.: "ETE Centro"), editável na vistoria. *(fonte: src/lib/offline/repository.ts:2352)* |  |
| 6 | `codigo_unidade` | text |  |  | Código da unidade, gerado a partir do código do tipo ao adicioná-la e editável. Não se repete<br>dentro da mesma fiscalização (índice único parcial). *(fonte: src/pages/AdicionarUnidade.jsx:134, indice:unidades_fiscalizadas_fiscalizacao_codigo_unq, src/lib/offline/repository.ts:2344)* |  |
| 7 | `status` | text |  | `'em_andamento'::text` | `em_andamento` (ao criar), `finalizada`, `pendente` ou `cancelada`: o banco aceita só esses<br>valores, e `cancelada` não aparece em produção.<br>- **Finalizar:** a unidade é finalizada na vistoria, e a finalização da fiscalização finaliza<br>todas.<br>- **Reabrir:** volta todas para `em_andamento`. *(fonte: restricao:unidades_fiscalizadas.unidades_fiscalizadas_status_check, src/lib/offline/repository.ts:2332, funcao:reabrir_fiscalizacao(p_fiscalizacao_id uuid), inventário: dominio_categorico)* | `em_andamento` (224), `finalizada` (174), `pendente` (4) |
| 8 | `total_constatacoes` | integer |  | `0` | Quantidade de constatações da unidade (respostas do checklist mais constatações manuais),<br>recalculada pelo servidor em `gerar_ncs_unidade`. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 9 | `total_ncs` | integer |  | `0` | Quantidade de NCs da unidade, recalculada em `gerar_ncs_unidade`. Em produção vai de 0 (261<br>unidades) a 23. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean), inventário: dominio_categorico)* | `0` (261), `1` (59), `2` (30), `3` (11), `6` (8), `8` (7), `7` (6), `4` (5), `5` (4), `11` (3), `10` (2), `13` (2), `12` (1), `17` (1), `23` (1), `9` (1) |
| 10 | `created_at` | timestamp with time zone |  | `now()` | Quando a unidade foi criada. Define a versão do checklist usada na vistoria. *(fonte: src/lib/offline/repository.ts:616, src/pages/VistoriarUnidade.jsx:124)* |  |
| 11 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração: gravada pelo aparelho, pelas funções do servidor e pelo gatilho<br>`update_unidades_updated_at`. A sincronização incremental usa esta coluna. *(fonte: gatilho:public.unidades_fiscalizadas.update_unidades_updated_at)* |  |
| 12 | `latitude` | double precision |  |  | Latitude da unidade ou do ponto da ocorrência (DTR), vinda do GPS do aparelho. *(fonte: src/lib/offline/repository.ts:601)* |  |
| 13 | `longitude` | double precision |  |  | Longitude da unidade ou do ponto da ocorrência, vinda do GPS do aparelho. *(fonte: src/lib/offline/repository.ts:602)* |  |
| 14 | `endereco` | text |  |  | Endereço da unidade. Pode ser montado a partir das coordenadas ao adicioná-la, e é editável na<br>vistoria. *(fonte: src/pages/AdicionarUnidade.jsx:78, src/lib/offline/repository.ts:2360)* |  |
| 15 | `data_hora_vistoria` | timestamp with time zone |  | `now()` | Data e hora da vistoria da unidade; padrão é o momento da criação, editável pelo fiscal. Aparece<br>no relatório. *(fonte: src/lib/offline/repository.ts:603, src/lib/offline/repository.ts:2376)* |  |
| 16 | `fotos_unidade` | jsonb |  | `'[]'::jsonb` | Fotos da unidade (lista JSON; o banco exige lista). A ordem da lista é a ordem das fotos na tela<br>e no relatório, reordenável por arrastar. Cada foto tem:<br>- `bucket` e `path`: arquivo em `fotos_fiscalizacao`;<br>- `url` (`storage://...`);<br>- `legenda`;<br>- `localId`: id da foto no aparelho;<br>- às vezes `cleanBucket`/`cleanPath`: versão "limpa", sem marca d'água;<br>- na DTR, `latitude`, `longitude`, `resolucao_km` e `resolucao_rodovia`, gravados na foto;<br>- raramente, `width`, `height` e `mimeType`.<br>Não vai na sincronização da unidade: a fila de fotos envia os arquivos e depois grava a lista,<br>também por `gerar_ncs_unidade`. *(fonte: src/lib/offline/syncEngine.ts:2246, src/lib/offline/repository.ts:1952, src/lib/storageCleanup.js:53, src/pages/VistoriarOcorrenciaDTR.jsx:1080, restricao:unidades_fiscalizadas.unidades_fiscalizadas_fotos_is_array_check, inventário: estrutura_json)* | JSON — formas: array (402); elementos: object (1409); chaves: `bucket`:string (1409), `cleanBucket`:string (364), `cleanPath`:string (364), `height`:number (38), `latitude`:number (179), `legenda`:string (1409), `localId`:string (1210), `longitude`:number (179), `mimeType`:string (38), `path`:string (1409), `resolucao_km`:string (179), `resolucao_rodovia`:string (179), `url`:string (1224), `width`:number (38) |
| 17 | `ordem` | integer |  | `0` | Posição da unidade na fiscalização; a criação usa a maior ordem existente mais 1. *(fonte: src/lib/offline/repository.ts:591)* |  |
| 18 | `coordenadas` | text |  |  | Coordenadas digitadas ou coladas pelo fiscal como texto, editáveis na vistoria. Coexistem com<br>`latitude` e `longitude` numéricas. *(fonte: src/pages/VistoriarUnidade.jsx:940, src/lib/offline/repository.ts:2368)* |  |
| 19 | `total_determinacoes` | integer |  | `0` | Quantidade de determinações da unidade. Nenhuma função atual grava esta coluna:<br>`gerar_ncs_unidade` conta as determinações, mas só grava os totais de constatações e NCs. O valor<br>fica no padrão 0 ou no que uma versão antiga gravou. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 20 | `total_recomendacoes` | integer |  | `0` | Quantidade de recomendações; mesma situação de `total_determinacoes`. *(fonte: funcao:gerar_ncs_unidade(p_unidade_fiscalizada_id uuid, p_fotos jsonb, p_finalizar boolean))* |  |
| 21 | `rodovia` | text |  |  | Rodovia do ponto da ocorrência, resolvida pelo GPS com os pontos de KM do contrato ou informada<br>pelo fiscal. *(fonte: src/lib/offline/repository.ts:2384, src/pages/VistoriarOcorrenciaDTR.jsx:200)* |  |
| 22 | `trecho` | text |  |  | Trecho específico da rodovia onde está a ocorrência. *(fonte: src/lib/offline/repository.ts:2384)* |  |
| 23 | `km` | text |  |  | KM aproximado da ocorrência (texto, ex.: 42.5), calculado pelo ponto de KM mais próximo da<br>posição GPS ou digitado. *(fonte: src/lib/offline/repository.ts:2384, src/pages/VistoriarOcorrenciaDTR.jsx:200)* |  |
| 24 | `tipo_ocorrencia` | text |  |  | Classificação da ocorrência da DTR: `constatacao` (72 em produção) ou `nc` (6). Fica vazia nas<br>unidades de saneamento. *(fonte: src/lib/offline/repository.ts:2384, inventário: dominio_categorico)* | `(nulo)` (324), `constatacao` (72), `nc` (6) |
| 25 | `gravidade` | text |  |  | Gravidade da ocorrência: leve, média, grave ou gravíssima. *(fonte: src/lib/offline/repository.ts:2384)* |  |
| 26 | `sentido` | text |  |  | Sentido da via no ponto da ocorrência (em produção: N, S e N/S). *(fonte: src/lib/offline/repository.ts:2384, inventário: dominio_categorico)* | `(nulo)` (324), `S` (32), `N` (27), `N/S` (19) |
| 27 | `per` | text |  |  | Seção do PER (Programa de Exploração da Rodovia) violada ou observada, ex.: "3.3.2 Pavimento".<br>Copiada do `item_contrato` do tipo de ocorrência escolhido. A grafia varia em produção. *(fonte: src/lib/offline/repository.ts:2384, inventário: dominio_categorico)* | `(nulo)` (324), `3.2.3 Obras de Ampliação de Capacidade` (14), `3.4.5.2. Socorro Mecânico` (10), `3.3.2 Pavimento` (9), `3.4.4.1. Painéis de Mensagens Variáveis Fixos` (9), `3.4.4.2. Painéis de Mensagens Variáveis Móveis` (9), `3.3.3 Elementos de Proteção e Segurança` (7), `3.3.5 Sistema de Drenagem e Obras de Arte Correntes` (5), `3.3.7 Canteiro Central e Faixa de Domínio` (5), `3.3.8 Edificações e Instalações Operacionais` (4), `3.2.2 Obras de Melhorias Operacionais` (2), `3.1.1 Pavimento` (1), `3.1.3 Obras de Arte Especiais` (1), `3.2.2 PAVIMENTO` (1), `3.3.7 Canteiro Central e Faixa de Domínio ` (1) |
| 28 | `frente` | text |  |  | Frente da concessão, ex.: CONSERVAÇÃO, SERVIÇOS OPERACIONAIS, RECUPERAÇÃO E MANUTENÇÃO.<br>Copiada do tipo de ocorrência. *(fonte: src/lib/offline/repository.ts:2384, inventário: dominio_categorico)* | `(nulo)` (324), `CONSERVAÇÃO` (32), `SERVIÇOS OPERACIONAIS` (28), `MELHORIAS OPERACIONAIS, DE AMPLIAÇÃO DECAPACIDADE E DE MANUTENÇÃO DO NÍVEL DE SERVIÇO` (16), `RECUPERAÇÃO E MANUTENÇÃO` (2) |
| 29 | `nao_atendimento` | text |  |  | Cláusula específica do PER não cumprida. Sai na coluna "NÃO ATENDIMENTO" do relatório da DTR. *(fonte: src/lib/offline/repository.ts:2384, inventário: dominio_categorico)* | `(nulo)` (396), `3.3.5. Conservação do sistema de drenagem e das OACs das rodovias` (2), `3.1.1 Intervenções nas pistas, acostamentos, faixas de segurança, interseções e vias marginais, para a retirada de elementos indesejáveis, tais como areia, pedras, fragmentos de pneus, animais acidentados, vegetação, detritos orgânicos, lixo e objetos lançados por veículos ou pela população lindeira, bem como de quaisquer elementos prejudiciais à segurança dos usuários.` (1), `3.3.2 reparo de panelas e afundamentos plásticos em pontos localizados e trincas de Classe 3 nos pavimentos flexíveis.` (1), `3.3.3. Conservação da sinalização horizontal, vertical e aérea (incluindo tachas e tachões retrorrefletivos, balizadores e delineadores), e dos demais dispositivos de proteção e segurança, tais como defensas metálicas, barreiras de concreto, dispositivos antiofuscantes e atenuadores de impacto.` (1), `A somatória do tempo de interrupção de funcionamento dos equipamentos, que integram o sistema de Painéis de Mensagens Variáveis fixo, não poderá ser superior a 24:00 (vinte e quatro) horas por mês.` (1) |
| 30 | `prazo_dias_nc` | integer |  |  | Prazo em dias para sanar a NC da ocorrência (em produção: 1, 15 ou 30). *(fonte: src/lib/offline/repository.ts:2384, inventário: dominio_categorico)* | `(nulo)` (396), `15` (3), `1` (2), `30` (1) |
| 31 | `gps_accuracy_m` | numeric |  |  | Precisão do GPS, em metros, quando o KM e a rodovia foram determinados. *(fonte: src/lib/offline/repository.ts:2384)* |  |
| 32 | `km_impreciso` | boolean | sim | `false` | `true` quando o KM e a rodovia foram gravados sem GPS com precisão de até 20 m. Indica que o KM<br>precisa de revisão manual. *(fonte: src/lib/offline/repository.ts:2384)* |  |

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
- [proteger_resposta_determinacao_prestador()](../funcoes/proteger_resposta_determinacao_prestador.md) — le (codigo)
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
| `trg_audit_unidades` | ativo | [process_audit_log()](../funcoes/process_audit_log.md) | Depois de cada inclusão, alteração ou exclusão, grava o registro de auditoria. *(fonte: funcao:process_audit_log())* |
| `trg_propagate_unidades` | ativo | [propagate_modification_to_parent()](../funcoes/propagate_modification_to_parent.md) | Depois de cada inclusão, alteração ou exclusão, atualiza `updated_at` da fiscalização. Assim os<br>aparelhos baixam a fiscalização de novo na sincronização. *(fonte: funcao:propagate_modification_to_parent())* |
| `update_unidades_updated_at` | ativo | [update_updated_at_column()](../funcoes/update_updated_at_column.md) | Antes de cada alteração, grava a hora atual em `updated_at`. *(fonte: funcao:update_updated_at_column())* |

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
- **Em linguagem simples**: Admin, coordenador e fiscal ativos leem, criam, alteram e excluem qualquer unidade, sem olhar a
câmara. O isolamento por câmara que vale para as fiscalizações não vale aqui: pela API, um fiscal
de uma câmara lê as unidades de outra. *(fonte: funcao:get_my_role(), politica:public.fiscalizacoes.Fiscais e Admins: acesso por camara em fiscalizacoes)*
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
- **Em linguagem simples**: O prestador ativo lê as unidades de qualquer fiscalização da própria entidade, com ou sem termo de
notificação. Como as políticas se somam, isso anula a exigência de termo de
`unidades_prestador_select`. *(fonte: funcao:get_my_prestador_id(), politica:public.unidades_fiscalizadas.unidades_prestador_select)*
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
- **Em linguagem simples**: Cópia idêntica da política anterior, com o nome corrompido por erro de codificação. É resíduo. *(fonte: politica:public.unidades_fiscalizadas.Prestadores: ler suas próprias unidades)*
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
- **Em linguagem simples**: Restritiva: o usuário de teste e2e só altera unidades de fiscalizações que ele criou. Não afeta
os demais. *(fonte: supabase/migrations/135_e2e_test_user_write_restriction.sql)*

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
- **Em linguagem simples**: Mesma restrição, para exclusão. *(fonte: supabase/migrations/135_e2e_test_user_write_restriction.sql)*

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
- **Em linguagem simples**: O prestador ativo lê as unidades de fiscalizações com termo de notificação para a entidade dele
(`can_access_fiscalizacao`). Hoje não tem efeito próprio, porque a política anterior já libera
sem termo. *(fonte: funcao:can_access_fiscalizacao(fiscalizacao uuid))*
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
- **Em linguagem simples**: Admin, fiscal e coordenador ativos (`is_staff`) têm acesso total, sem olhar a câmara. É
redundante com "Fiscais e Admins: acesso total em unidades". *(fonte: funcao:is_staff())*
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

- Divergência `coluna:unidades_fiscalizadas.total_determinacoes`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `coluna:unidades_fiscalizadas.total_recomendacoes`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_unidades_codigo`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_unidades_fiscalizacao`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_unidades_fotos_gin`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_unidades_nome`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_unidades_status`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `indice:idx_unidades_tipo`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.unidades_fiscalizadas.Prestadores: ler suas pr├│prias unidades`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.unidades_fiscalizadas.unidades_prestador_select`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.unidades_fiscalizadas.unidades_staff_all`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `restricao:unidades_fiscalizadas.unidades_fiscalizadas_fotos_is_array_check`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
