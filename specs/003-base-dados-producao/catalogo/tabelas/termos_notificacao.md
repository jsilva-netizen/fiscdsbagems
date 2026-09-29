<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# termos_notificacao

- **Tipo**: tabela
- **Dono**: módulo **processo_sancionador**
- **Linhas em produção**: 5
- **RLS ativo**: sim

## Finalidade

Termo de Notificação (TN) de uma fiscalização, com o relatório de fiscalização (RFP, RFE ou RAO)
que o acompanha. Abre o processo sancionador: notifica a entidade das determinações e abre prazo
para ela responder. Há um termo por fiscalização, com a unicidade verificada só pela tela.
Produção tem 5 (3 da CATESA e 2 do CATERS).

**Fluxo.** O status é calculado pela tela a partir dos arquivos e das datas:

1. **`pendente_tn`:** a equipe gera o TN na tela Gerenciar Termos, com número, relatório, prazo
   e câmara, e envia o TN e o relatório assinados.
2. **`aguardando_assinatura_prestador`:** o prestador baixa o TN no portal, assina e devolve.
   Nesse momento o **servidor** (gatilho `trg_proteger_termo_prestador`, migration 139) grava o
   início do prazo e a data-limite com a data de MS. Até a 139, quem gravava era o aparelho do
   prestador.
3. **`aguardando_resposta`:** o prestador responde cada determinação (`respostas_determinacao`)
   e conclui a resposta. O status só aparece como `prazo_vencido` na tela; não é gravado.
4. **`respondido`:** a conclusão grava a data de recebimento e se chegou no prazo, calculados
   pelo servidor.
5. **Análise:** a equipe analisa as respostas; a Análise da Manifestação (AM) gera os autos de
   infração.

**Fluxo manual:** quando `fluxo_manual`, o termo corre fora do portal. A equipe registra
protocolo e resposta recebidos em papel, e o termo não aparece para o prestador. *(fonte: src/pages/GerenciarTermos.jsx:318, src/pages/GerenciarTermos.jsx:436, src/pages/ResponderTermo.jsx:667, src/lib/offline/repository.ts:1712, src/pages/AnaliseManifestacao.jsx:261, src/pages/PortalPrestadorHome.jsx:73, supabase/migrations/139_fix_prestador_prazos.sql, inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador do termo. Remessas de autos e o portal do prestador apontam para ele. *(fonte: restricao:remessas_ai.remessas_ai_termo_id_fkey)* |  |
| 2 | `numero_termo_notificacao` | text |  |  | Número do TN, no formato `TN NNN/AAAA/DSB/AGEMS`. É sugerido pela tela como o maior número do ano<br>mais 1, calculado no navegador, e é editável. O banco não garante que seja único, e a sigla<br>"DSB" é fixa, qualquer que seja a diretoria. *(fonte: src/pages/GerenciarTermos.jsx:196, src/pages/GerenciarTermos.jsx:213)* |  |
| 3 | `numero_rfp` | text |  |  | Número do relatório de fiscalização que acompanha o TN, digitado pela equipe (só dígitos). É único<br>por tipo de relatório, câmara e ano (`termos_notificacao_tipo_camara_numero_ano_uniq`). Compõe a<br>identificação "RFP/DSB/<câmara>/<número>/<ano>" usada nas telas. *(fonte: src/pages/GerenciarTermos.jsx:765, indice:termos_notificacao_tipo_camara_numero_ano_uniq, src/pages/AcompanhamentoDeterminacoes.jsx:233)* |  |
| 4 | `municipio_id` | uuid |  |  | Município do termo, vindo da fiscalização (chave estrangeira para `municipios`). *(fonte: src/pages/GerenciarTermos.jsx:567, restricao:termos_notificacao.termos_notificacao_municipio_id_fkey)* |  |
| 5 | `prestador_servico_id` | uuid |  |  | Entidade notificada, vinda da fiscalização. Define quem vê e responde o termo no portal, e é a base<br>de `can_access_fiscalizacao`. *(fonte: src/pages/GerenciarTermos.jsx:561, funcao:can_access_fiscalizacao(fiscalizacao uuid))* |  |
| 6 | `fiscalizacao_id` | uuid |  |  | Fiscalização notificada. A tela impede um segundo termo para a mesma fiscalização. A chave<br>estrangeira não tem regra de exclusão, então não é possível excluir uma fiscalização com termo. *(fonte: src/pages/GerenciarTermos.jsx:436, restricao:termos_notificacao.termos_notificacao_fiscalizacao_id_fkey)* |  |
| 7 | `numero_processo` | text |  |  | Número do processo administrativo, digitado pela equipe. *(fonte: src/pages/GerenciarTermos.jsx:789)* |  |
| 8 | `camara_tecnica` | text |  |  | Câmara do termo, em maiúsculas (`CATESA`, `CATERS`); o padrão da tela é CATESA. Diferente do resto<br>do sistema, é texto livre, sem chave estrangeira e sem o padrão `camara_tecnica_id` em minúsculas.<br>Compõe a unicidade do número do relatório. *(fonte: src/pages/GerenciarTermos.jsx:96, src/pages/GerenciarTermos.jsx:510, inventário: dominio_categorico)* | `CATESA` (3), `CATERS` (2) |
| 9 | `data_protocolo` | date |  |  | Data do protocolo do TN junto à entidade:<br>- **Fluxo pelo portal:** é o dia do primeiro envio do TN assinado, gravado pelo servidor com a<br>data de MS (migration 139).<br>- **Fluxo manual:** a equipe informa.<br>É a base da data-limite. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, src/pages/GerenciarTermos.jsx:427)* |  |
| 10 | `prazo_resposta_dias` | integer |  | `30` | Prazo, em dias, para a entidade responder (padrão 30). *(fonte: src/pages/GerenciarTermos.jsx:851)* |  |
| 11 | `observacoes` | text |  |  | Observações livres da equipe sobre o termo. ⚠️ *hipótese* |  |
| 12 | `arquivo_url` | text |  |  | TN assinado pela AGEMS (`storage://documentos-termos/...`). Junto com o relatório assinado, tira o<br>termo de `pendente_tn`. *(fonte: src/pages/GerenciarTermos.jsx:347, src/pages/GerenciarTermos.jsx:318)* |  |
| 13 | `arquivo_protocolo_url` | text |  |  | Comprovante de protocolo do TN, no fluxo manual. *(fonte: src/pages/GerenciarTermos.jsx:1401)* |  |
| 14 | `arquivo_oficio_protocolo` | text |  |  | Ofício de encaminhamento do TN, no fluxo manual. *(fonte: src/pages/GerenciarTermos.jsx:1401)* |  |
| 15 | `data_maxima_resposta` | date |  |  | Data-limite para a entidade responder: início do prazo mais `prazo_resposta_dias`.<br>- **Fluxo pelo portal:** o servidor calcula no primeiro envio do TN assinado, e reenviar o TN não<br>a altera (migration 139).<br>- **Criação e edição pela equipe:** a tela calcula a partir da data de protocolo, e a equipe pode<br>editar.<br>Até a 139, o aparelho do prestador calculava e podia alterá-la pela API. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, src/pages/GerenciarTermos.jsx:440, .specify/bugs/prazos-calculados-pelo-prestador/assessment.md)* |  |
| 16 | `data_geracao` | timestamp with time zone |  | `now()` | Quando o termo foi gerado. Define `ano_geracao` pelo gatilho, e o ano é a base das numerações. *(fonte: src/pages/GerenciarTermos.jsx:454, funcao:set_termos_notificacao_ano_geracao())* |  |
| 17 | `data_recebimento_resposta` | date |  |  | Quando a resposta da entidade foi recebida:<br>- **Fluxo pelo portal:** o servidor grava a data de MS quando o prestador conclui a resposta<br>(migration 139).<br>- **Fluxo manual:** a equipe informa.<br>Com ela, o status vira `respondido`. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, src/lib/offline/repository.ts:1716, src/pages/GerenciarTermos.jsx:1574)* |  |
| 18 | `recebida_no_prazo` | boolean |  |  | Se a resposta chegou até a data-limite, inclusive o último dia; vale `true` quando não há<br>data-limite. O servidor calcula quando o prestador conclui; no fluxo manual, a equipe define.<br>Até a migration 139, era calculado no navegador, comparando com a meia-noite UTC. Em produção: 1<br>no prazo, 1 fora e 3 vazios. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, src/lib/offline/repository.ts:1718, inventário: dominio_categorico)* | `(nulo)` (3), `false` (1), `true` (1) |
| 19 | `arquivos_resposta` | jsonb |  | `'[]'::jsonb` | Arquivos da resposta da entidade (lista). Cada um tem `nome`, `tipo`, `categoria`, `tamanho`,<br>`url`, `bucket`, `path`, `data_upload` e `assinatura_digital_valida`. O portal acrescenta um a um<br>(substituindo o de mesmo caminho). *(fonte: src/lib/offline/repository.ts:1700, inventário: estrutura_json)* | JSON — formas: array (5); elementos: object (1); chaves: `assinatura_digital_valida`:boolean (1), `bucket`:string (1), `categoria`:string (1), `data_upload`:string (1), `nome`:string (1), `path`:string (1), `tamanho`:number (1), `tipo`:string (1), `url`:string (1) |
| 20 | `arquivo_oficio_resposta` | text |  |  | Ofício de resposta da entidade, registrado pela equipe no fluxo manual. *(fonte: src/pages/GerenciarTermos.jsx:1576)* |  |
| 21 | `numero_am` | text |  |  | Número da Análise da Manifestação (AM): `AM NNN/AAAA/DSB/AGEMS`. É gerado por `gerar_numero_am`<br>como a contagem das AMs do ano mais 1, o que pode repetir números em pedidos simultâneos. Refazer a<br>análise limpa o número. *(fonte: src/pages/AnaliseManifestacao.jsx:261, funcao:gerar_numero_am(), src/pages/AnaliseManifestacao.jsx:240)* |  |
| 22 | `status` | text |  | `'pendente_tn'::text` | Estágio do termo:<br>- `pendente_tn` (padrão);<br>- `aguardando_assinatura_prestador`;<br>- `aguardando_resposta`;<br>- `respondido`.<br>É calculado pela tela a partir dos arquivos e datas, e não é validado pelo banco. O portal também<br>grava o status ao receber o TN assinado. Em produção: 2 respondidos, 1 aguardando resposta e 2<br>aguardando assinatura. *(fonte: src/pages/GerenciarTermos.jsx:318, src/pages/ResponderTermo.jsx:679, inventário: dominio_categorico)* | `aguardando_assinatura_prestador` (2), `respondido` (2), `aguardando_resposta` (1) |
| 23 | `created_at` | timestamp with time zone |  | `now()` | Quando o termo foi criado; `gerar_numero_am` o usa para contar as AMs do ano. *(fonte: funcao:gerar_numero_am())* |  |
| 24 | `updated_at` | timestamp with time zone |  | `now()` | Última alteração, gravada pelas telas (não há gatilho de `updated_at`). *(fonte: src/pages/ResponderTermo.jsx:680)* |  |
| 25 | `arquivo_rfp_url` | text |  |  | Relatório de fiscalização assinado; necessário, com o TN, para sair de `pendente_tn`. *(fonte: src/pages/GerenciarTermos.jsx:381, src/pages/GerenciarTermos.jsx:318)* |  |
| 26 | `arquivo_tn_prestador_url` | text |  |  | TN assinado pelo prestador, enviado pelo portal ou pela equipe. Com a assinatura considerada<br>válida, inicia o prazo. *(fonte: src/pages/ResponderTermo.jsx:673, src/pages/GerenciarTermos.jsx:1142)* |  |
| 27 | `assinatura_prestador_valida` | boolean |  | `false` | Se a assinatura do prestador no TN foi aceita. O servidor grava `true` a cada envio do TN<br>assinado; a equipe pode marcar ou desmarcar. Não há verificação da assinatura digital. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, src/pages/GerenciarTermos.jsx:1107)* |  |
| 28 | `data_assinatura_prestador` | timestamp with time zone |  |  | Quando o prestador enviou o TN assinado, pela hora do servidor (migration 139). *(fonte: supabase/migrations/139_fix_prestador_prazos.sql)* |  |
| 29 | `data_inicio_prazo` | date |  |  | Início da contagem do prazo de resposta:<br>- **Fluxo pelo portal:** o dia do primeiro envio do TN assinado (data de MS, servidor).<br>- **Equipe:** a data que ela informa.<br>Uma vez preenchido, o reenvio pelo prestador não o reinicia. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, src/pages/GerenciarTermos.jsx:1121)* |  |
| 30 | `fluxo_manual` | boolean |  | `false` | `true` quando o termo corre fora do portal: protocolo e resposta em papel, registrados pela equipe.<br>Esses termos não aparecem para o prestador. Em produção: 3 manuais e 2 pelo portal. *(fonte: src/pages/GerenciarTermos.jsx:928, src/pages/PortalPrestadorHome.jsx:73, inventário: dominio_categorico)* | `true` (3), `false` (2) |
| 31 | `arquivo_am_assinada_url` | text |  |  | Análise da Manifestação assinada; enviada ao concluir a AM. *(fonte: src/pages/AnaliseManifestacao.jsx:828)* |  |
| 32 | `am_concluida_em` | timestamp with time zone |  |  | Quando a Análise da Manifestação foi concluída; limpo ao refazer a análise. *(fonte: src/pages/AnaliseManifestacao.jsx:264, src/pages/AnaliseManifestacao.jsx:240)* |  |
| 33 | `tipo_relatorio` | text | sim | `'RFP'::text` | Tipo do relatório que acompanha o TN: `RFP` (padrão), `RFE` ou `RAO`; o banco aceita só esses.<br>Compõe a unicidade do número. Em produção: 4 RFP e 1 RFE. *(fonte: restricao:termos_notificacao.termos_notificacao_tipo_relatorio_check, src/pages/GerenciarTermos.jsx:747, inventário: dominio_categorico)* | `RFP` (4), `RFE` (1) |
| 34 | `ano_geracao` | integer |  | `(EXTRACT(year FROM now()))::integer` | Ano de geração do termo, mantido pelo gatilho a partir de `data_geracao`. Compõe a unicidade do<br>número do relatório por ano. *(fonte: funcao:set_termos_notificacao_ano_geracao(), indice:termos_notificacao_tipo_camara_numero_ano_uniq)* | `2026` (5) |
| 35 | `arquivo_resposta_url` | text |  |  | Arquivo da resposta recebida, registrado pela equipe no fluxo manual. *(fonte: src/pages/GerenciarTermos.jsx:1575)* |  |

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
| `trg_termos_notificacao_set_ano_geracao` | ativo | [set_termos_notificacao_ano_geracao()](../funcoes/set_termos_notificacao_ano_geracao.md) | Antes de inserir, ou de alterar `data_geracao`, grava o ano em `ano_geracao`. *(fonte: funcao:set_termos_notificacao_ano_geracao())* |

<details><summary>Definição de trg_termos_notificacao_set_ano_geracao</summary>

```sql
CREATE TRIGGER trg_termos_notificacao_set_ano_geracao BEFORE INSERT OR UPDATE OF data_geracao ON termos_notificacao FOR EACH ROW EXECUTE FUNCTION set_termos_notificacao_ano_geracao()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso total em termos

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos têm acesso total a todos os termos, sem olhar a câmara. *(fonte: funcao:get_my_role())*
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
- **Em linguagem simples**: O prestador ativo lê os termos da própria entidade. *(fonte: funcao:get_my_prestador_id())*
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
- **Em linguagem simples**: Mesma leitura pelo prestador, com as funções de outro conjunto de políticas; redundante. *(fonte: funcao:current_prestador_servico_id())*
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
- **Em linguagem simples**: O prestador ativo altera o termo da própria entidade só até ele ser `respondido`. O gatilho
`trg_proteger_termo_prestador` limita o que ele pode mudar: o TN assinado e os arquivos da
resposta, com datas e pontualidade calculadas pelo servidor. Desde a migration 139 é a única
política de alteração do prestador; antes, outra mais ampla a anulava. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, funcao:current_prestador_servico_id())*
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
- **Em linguagem simples**: Acesso total para admin, fiscal e coordenador ativos (`is_staff`); redundante. *(fonte: funcao:is_staff())*
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
