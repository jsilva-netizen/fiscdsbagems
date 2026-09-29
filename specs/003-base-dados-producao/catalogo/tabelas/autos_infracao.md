<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# autos_infracao

- **Tipo**: tabela
- **Dono**: módulo **processo_sancionador**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Autos de Infração (AI): um por determinação não atendida. Formaliza a infração da entidade e abre
o prazo de defesa. **Vazia em produção**: o fluxo existe nas telas, mas ainda não foi usado.

**Fluxo:**

1. **Emissão:** a Análise da Manifestação emite o AI com número. A tela de análise de resposta
   também gera autos, sem número.
2. **Pena e envio:** a Gestão de Autos calcula a pena base (UFERMS e R$), agrupa os autos da
   entidade numa remessa e envia.
3. **Defesa:** o prestador assina o recebimento e apresenta defesa pelo portal (texto e anexos).
4. **Parecer e finalização:** vem o parecer técnico e o auto é finalizado.

**Documentos:** podem ser anexados pelo fluxo de upload (AI assinado, protocolos, defesa), que
também muda o status.

**Defeito latente:** o prestador não tem política de alteração nesta tabela, só de leitura. Quando
o portal grava a defesa ou o AI assinado, a alteração não afeta nenhuma linha e não dá erro: a
defesa se perde em silêncio. Ainda não aconteceu porque a tabela está vazia. *(fonte: src/pages/AnaliseManifestacao.jsx:268, src/pages/AnalisarResposta.jsx:255, src/pages/GestaoAutos.jsx:157, src/pages/PortalPrestadorHome.jsx:572, inventário: tabelas)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador do auto; itens de remessa, manifestações e pareceres apontam para ele. *(fonte: restricao:remessas_ai_itens.remessas_ai_itens_auto_infracao_id_fkey)* |  |
| 2 | `prestador_servico_id` | uuid |  |  | Entidade autuada, copiada do termo. *(fonte: src/pages/AnaliseManifestacao.jsx:276)* |  |
| 3 | `unidade_fiscalizada_id` | uuid |  |  | Unidade da determinação descumprida. *(fonte: src/pages/AnaliseManifestacao.jsx:274)* |  |
| 4 | `fiscalizacao_id` | uuid |  |  | Fiscalização de origem; define a câmara do auto pelo gatilho `tr_camara_autos`. *(fonte: src/pages/AnaliseManifestacao.jsx:275, gatilho:public.autos_infracao.tr_camara_autos)* |  |
| 5 | `determinacao_id` | uuid |  |  | Determinação não atendida que originou o auto. A tela não gera dois autos para a mesma<br>determinação, e o vínculo fica vazio se a determinação for apagada. *(fonte: src/pages/AnaliseManifestacao.jsx:269, restricao:autos_infracao.autos_infracao_determinacao_id_fkey)* |  |
| 6 | `resposta_determinacao_id` | uuid |  |  | Resposta da entidade analisada; não é gravado pelas telas atuais. ⚠️ *hipótese* |  |
| 7 | `numero_auto` | text |  |  | Número do AI: `AI NNN/AAAA/DSB/AGEMS`. É gerado por `gerar_numero_auto` como a contagem dos autos<br>do ano mais 1, o que pode repetir números em pedidos simultâneos ou depois de exclusões. A sigla<br>"DSB" é fixa. *(fonte: funcao:gerar_numero_auto(), src/pages/AnaliseManifestacao.jsx:271)* |  |
| 8 | `descricao` | text |  |  | Texto do auto: "Determinação D<n> não atendida: <descrição>". *(fonte: src/pages/AnaliseManifestacao.jsx:279)* |  |
| 9 | `valor` | numeric(10,2) |  |  | Valor do auto; as telas atuais usam `pena_base_rs`. ⚠️ *hipótese* |  |
| 10 | `status` | text |  | `'pendente'::text` | Situação do auto:<br>- `gerado` (padrão da coluna: `pendente`);<br>- `enviado`: com a remessa ou os protocolos;<br>- `em_analise`: com a defesa;<br>- `finalizado`: com o parecer.<br>Não é validado pelo banco.<br>Ao enviar a remessa, a tela tenta gravar também `data_envio` e `data_limite_manifestacao`,<br>colunas que não existem. A gravação falha e a tela a refaz só com o status, então **o prazo de<br>defesa (30 dias) não fica registrado em lugar nenhum**, embora o acompanhamento tente mostrá-lo. *(fonte: src/pages/GestaoAutos.jsx:333, src/components/autos/FluxoUploadDocumentos.jsx:40, src/pages/GestaoAutos.jsx:483, src/pages/AcompanhamentoDeterminacoes.jsx:618)* |  |
| 11 | `data_emissao` | timestamp with time zone |  | `now()` | Quando o auto foi emitido. *(fonte: src/pages/AnaliseManifestacao.jsx:278)* |  |
| 12 | `arquivo_url` | text |  |  | AI assinado pela AGEMS (bucket `documentos-autos`). *(fonte: src/components/autos/FluxoUploadDocumentos.jsx:34)* |  |
| 13 | `arquivo_protocolo_oficio` | text |  |  | Protocolo do ofício de encaminhamento do AI. *(fonte: src/components/autos/FluxoUploadDocumentos.jsx:36)* |  |
| 14 | `arquivo_protocolo_ai_recebido` | text |  |  | Protocolo de recebimento do AI pela entidade; com o do ofício, o auto passa a `enviado`. *(fonte: src/components/autos/FluxoUploadDocumentos.jsx:38)* |  |
| 15 | `arquivo_defesa_oficio` | text |  |  | Ofício de defesa da entidade. *(fonte: src/components/autos/FluxoUploadDocumentos.jsx:44)* |  |
| 16 | `arquivo_defesa` | text |  |  | Documento de defesa; com o ofício, o auto passa a `em_analise`. *(fonte: src/components/autos/FluxoUploadDocumentos.jsx:46)* |  |
| 17 | `created_at` | timestamp with time zone |  | `now()` | Quando o auto foi criado; `gerar_numero_auto` o usa para contar os autos do ano. *(fonte: funcao:gerar_numero_auto())* |  |
| 18 | `defesa_texto` | text |  |  | Texto da defesa escrita pelo prestador no portal. *(fonte: src/pages/PortalPrestadorHome.jsx:608, src/pages/PareceresTecnicos.jsx:323)* |  |
| 19 | `defesa_arquivos` | jsonb |  | `'[]'::jsonb` | Anexos da defesa enviados pelo prestador (lista de arquivos). *(fonte: src/pages/PortalPrestadorHome.jsx:639, src/pages/GestaoAutos.jsx:861)* | JSON — formas: nenhuma linha |
| 20 | `pena_base_rs` | numeric(14,2) | sim | `0` | Pena base em reais, calculada a partir das UFERMS; não pode ser negativa. *(fonte: src/pages/GestaoAutos.jsx:120, restricao:autos_infracao.autos_infracao_pena_base_rs_nonneg)* |  |
| 21 | `pena_base_uferms` | integer | sim | `0` | Pena base em UFERMS (unidade fiscal de MS), informada na Gestão de Autos. *(fonte: src/pages/GestaoAutos.jsx:157)* |  |
| 22 | `camara_tecnica_id` | text |  |  | Câmara do auto, herdada da fiscalização pelo gatilho `tr_camara_autos`. Controla o acesso por<br>câmara (`can_access_camara`), mas `autos_staff_all` libera a equipe toda. *(fonte: funcao:trg_auto_set_camara(), politica:public.autos_infracao.autos_staff_all)* |  |

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
| `tr_camara_autos` | ativo | [trg_auto_set_camara()](../funcoes/trg_auto_set_camara.md) | Antes de inserir, se a câmara vier vazia, copia a câmara da fiscalização. *(fonte: funcao:trg_auto_set_camara())* |

<details><summary>Definição de tr_camara_autos</summary>

```sql
CREATE TRIGGER tr_camara_autos BEFORE INSERT ON autos_infracao FOR EACH ROW EXECUTE FUNCTION trg_auto_set_camara()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso por camara em autos

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin total; coordenador e fiscal ativos, pelos autos da sua câmara (`can_access_camara`). Sem
efeito prático, porque `autos_staff_all` dá acesso total à equipe. *(fonte: funcao:can_access_camara(row_camara text))*
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
- **Em linguagem simples**: O prestador ativo lê os autos da própria entidade. *(fonte: funcao:get_my_prestador_id())*
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
- **Em linguagem simples**: Mesma leitura pelo prestador, de outro conjunto de políticas; redundante. *(fonte: funcao:current_prestador_servico_id())*
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
- **Em linguagem simples**: Admin, fiscal e coordenador ativos (`is_staff`) têm acesso total a todos os autos. Por somar-se à
política por câmara, **anula o isolamento por câmara** nos autos. *(fonte: funcao:is_staff(), politica:public.autos_infracao.Fiscais e Admins: acesso por camara em autos)*
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
