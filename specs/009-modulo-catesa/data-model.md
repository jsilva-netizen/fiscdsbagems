# Data Model: Módulo CATESA — app da câmara de saneamento

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

O app `catesa` **não tem modelo de dados** ([research S2](./research.md)). Este documento descreve o
**pacote de configuração inicial** ([research S3](./research.md)) e onde cada parte fica nos apps
comuns. Depois de aplicado, cada parte é mantida em CATESA › Configuração, nas telas dos apps
comuns que aparecem ali (R-core-025).

## Modelos

Nenhum.

## Pacote de configuração inicial

Arquivos em `backend/apps/catesa/configuracao/`, validados pelo app comum dono e aplicados por
`servicos.aplicar_configuracao_inicial` dele ([research S4](./research.md)).

### `checklists.json` → motor de checklists (spec 005)

O modelo "Checklist por tipo de unidade" da CATESA, como na spec 005, "Modelos de hoje". Os nomes
dos modelos do motor serão os do data-model da spec 005, que ainda não existe; abaixo, as entidades
da spec.

| Parte | Conteúdo |
|---|---|
| código do modelo | `checklist_unidade` (chave de idempotência, com a câmara) |
| nome | "Checklist por tipo de unidade" |
| modo de aplicação | lista por unidade |
| campos do item | pergunta (texto longo, obrigatório, papel título); constatação Sim; constatação Não; gera NC (sim/não, padrão sim); dispositivo normativo; texto da NC; determinação; prazo em dias (inteiro positivo, padrão 30); recomendação |
| respostas | Sim, Não, Não se aplica (gravada, sem saída; decisão de 2026-10-01) |
| saídas de Sim | constatação com "constatação Sim", se preenchida |
| saídas de Não | constatação com "constatação Não", se preenchida; NC se "gera NC" e a constatação preenchida, descrita por "dispositivo normativo" (ou "artigo aplicável" se vazio); determinação com "determinação" e "prazo" se "gera NC", "constatação Não" e "determinação" preenchidas; recomendação com "recomendação" se "gera NC", "constatação Não" preenchida, "determinação" vazia e "recomendação" preenchida (R-checklists-013: toda determinação com a sua NC) |
| saídas de Não se aplica | nenhuma |
| planilha | serviço, código do tipo, nome do tipo, ordem, pergunta, constatação Sim, constatação Não, dispositivo normativo, determinação, recomendação, texto da NC, prazo; cria os catálogos que não existem; chave: catálogo + ordem |

Os catálogos e os itens não estão no pacote ([research S5](./research.md)).

### `fiscalizacao.json` → `fiscalizacao.ConfiguracaoFiscalizacao` (spec 007)

| Campo | Valor |
|---|---|
| layout_relatorio | o genérico do app de fiscalização ("vistoria por registro de campo") |
| titulo_documento | "TERMO DE VISTORIA AGEMS/DSB" |
| linhas_marca_dagua | `["{codigo}, {municipio} - {uf}", "{data} {hora}", "{coordenadas}"]` |
| limite_impreciso_m | 20 |
| copiada_de | vazio |

### `planejamento.json` → `planejamento.ConfiguracaoPlanejamento` e `TipoAtividade` (spec 006)

| Campo | Valor |
|---|---|
| tipos de atividade | "Fiscalização" (`e_fiscalizacao`), "Apresentação", "Educação ambiental" |
| mudancas_com_aprovacao | `DATAS_OUTRO_MES`, `INCLUIR_DESTINO`, `RETIRAR_DESTINO`, `INCLUIR_ATIVIDADE`, `RETIRAR_ATIVIDADE`, `ALTERAR_SERVIDORES`, `AUMENTAR_DIARIAS`, `CANCELAR_VIAGEM`, `INCLUIR_PARTICIPACAO` |
| layout_cronograma | as colunas do Anexo I |
| copiada_de | vazio |

Hoje igual à configuração padrão de câmara nova (R-planejamento-018). O app entrega a sua mesmo
assim, para não depender de mudanças futuras no padrão.

## Painel (sem persistência)

Resposta de `GET painel/catesa` ([contracts/api-catesa.md](./contracts/api-catesa.md)):

| Bloco | Contadores | Fonte |
|---|---|---|
| fiscalizações | em andamento, finalizadas | `fiscalizacao.consultas.contagem_por_situacao` |
| termos de notificação | total emitido, pendentes de emissão, aguardando assinatura, aguardando resposta, prazo vencido, respondidos com análise pendente | consultas do processo sancionador (presente só com o app instalado) |
| autos de infração | total; gerados (pendentes de remessa); enviados ou em análise (enviado, defesa recebida, com parecer); finalizados (julgado, deliberado), como os quatro cartões de hoje | idem |
