# Data Model: Módulo CATERS — app da câmara de resíduos sólidos e limpeza urbana

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Chaves primárias em UUID. Datas no fuso de Mato Grosso do Sul ([research T5](./research.md)). A
configuração da CATERS nos apps comuns não tem modelo aqui: é o pacote de configuração inicial, igual
ao da CATESA ([data-model da spec 009](../009-modulo-catesa/data-model.md)), com cópia própria.

## Processo de acompanhamento

### ProcessoAcompanhamento
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `caters_processes` |
| numero_processo | texto | obrigatório; único |
| municipio | → Municipio, opcional | obrigatório no cadastro novo; na migração, pelo nome |
| municipio_texto_original | texto, opcional | texto livre de origem (migração) |
| objeto | texto | obrigatório |
| tecnico | → Usuario, opcional | usuário da CATERS |
| tecnico_texto_original | texto, opcional | texto livre de origem (migração) |
| fiscalizacao | → Fiscalizacao, opcional | finalizada, da CATERS; protegida (T3) |
| situacao | `aguardando_analise` / `em_analise` / `respondido` / `no_prazo` / `critico` / `atrasado` / `dilacao_solicitada` / `encerrado` | padrão `aguardando_analise`; escolhida pela equipe |
| relatorio_enviado_em | data, opcional | |
| ar_enviado_em | data, opcional | |
| ar_recebido_em | data, opcional | |
| ar_codigo_rastreio | texto, opcional | |
| ar_protocolo | texto, opcional | |
| data_fatal | data, opcional | só informativa |
| prazo_resposta_informado | data, opcional | a dilação aprovada grava aqui; o prazo efetivo é calculado (T5) |
| observacoes | texto, opcional | |
| legado | lista de textos | ocorrências da migração (município ou técnico sem correspondência) |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | |

### RecomendacaoAcompanhada
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `caters_recommendations` |
| processo | → ProcessoAcompanhamento | protegida |
| origem_tipo | `recomendacao` / `determinacao` / `manual` | |
| origem_id | UUID, opcional | identificador na fiscalização, sem chave estrangeira (T3); único por processo com o tipo |
| origem_removida_em | data e hora, opcional | a origem deixou de existir na fiscalização (T4) |
| codigo_item | texto, opcional | ex.: 3.1.2 |
| descricao | texto | obrigatório; copiado da origem na importação |
| categoria | texto, opcional | livre |
| prioridade | `baixa` / `media` / `alta` / `critica` | padrão `media` |
| prazo_prometido | data, opcional | |
| em_andamento | booleano | marca da equipe |
| cumprida_em | data, opcional | |
| evidencia | → DocumentoProcesso, opcional | do mesmo processo, tipo `evidencia` |
| resposta_titular | texto, opcional | |
| observacoes | texto, opcional | |
| situacao_legado | texto, opcional | situação gravada no sistema atual (migração) |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | |

A situação (`pendente`, `em_andamento`, `vencida`, `cumprida`) é calculada na consulta (T5). Manual
pode ser excluída pela equipe, com evento; importada, não.

### RespostaMunicipio
Uma por processo.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| processo | → ProcessoAcompanhamento | única |
| recebida_em | data | obrigatória |
| protocolo | texto, opcional | |
| situacao_cronograma | `pendente` / `aprovado` / `adequacao` / `dispensado` | padrão `pendente` |
| observacoes | texto, opcional | |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | |

### Dilacao
Imutável depois de criada (T6).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| processo | → ProcessoAcompanhamento | protegida |
| data_referencia | data | obrigatória |
| dias | inteiro | > 0 |
| novo_prazo | data | referência + dias, calculado no servidor |
| pedido_em | data, opcional | pedido do município |
| protocolo_municipio | texto, opcional | |
| decisao | `aprovada` / `negada` | |
| observacoes | texto, opcional | |
| criado_por | → Usuario | |
| criado_em | data e hora | |

### EventoProcesso
Imutável (T7).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| processo | → ProcessoAcompanhamento | protegida |
| tipo | `criacao` / `atualizacao_status` / `importacao` / `envio` / `resposta_recebida` / `prazo_estendido` / `documento_anexado` / `documento_removido` / `encerramento` / `reabertura` / `registro` / `observacao` | |
| descricao | texto | obrigatória |
| novo_prazo | data, opcional | |
| documento | → DocumentoProcesso, opcional | |
| autor | → Usuario, opcional | vazio em evento migrado sem autor |
| criado_em | data e hora | ordena a linha do tempo |

### DocumentoProcesso
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `caters_extra_documents`; novo para as colunas de endereço |
| processo | → ProcessoAcompanhamento | protegida |
| tipo | `relatorio` / `termo_notificacao` / `ar_digitalizado` / `oficio_resposta` / `cronograma` / `evidencia` / `extra` | |
| titulo | texto | obrigatório para `extra`; nos demais, o nome do tipo |
| descricao | texto, opcional | |
| arquivo | chave no repositório privado | PDF ou imagem, até 20 MB |
| checksum | texto | SHA-256 |
| tamanho, tipo_conteudo | inteiro, texto | conferidos pelo conteúdo |
| removido_em | data e hora, opcional | remover não apaga o arquivo (T8) |
| criado_por | → Usuario | |
| criado_em | data e hora | |

### ControleAviso
| Campo | Tipo | Regras |
|---|---|---|
| tipo | texto | código do tipo de aviso registrado (T9) |
| referencia_id | UUID | processo ou recomendação |
| prazo | data | único com tipo e referência: um aviso por prazo |
| enviado_em | data e hora | |

## Transições

```text
ProcessoAcompanhamento.situacao: escolhida pela equipe entre as não encerradas;
  dilação aprovada → dilacao_solicitada (ou mantém);
  resposta registrada → respondido (se aguardando_analise ou em_analise);
  encerrar → encerrado (só leitura); reabrir (com motivo) → em_analise
```

## Relações com outros apps

```text
core.Municipio ← ProcessoAcompanhamento → core.Usuario (técnico)
fiscalizacao.Fiscalizacao ← ProcessoAcompanhamento (PROTECT; verificação de documento registrada)
RecomendacaoAcompanhada ··· origem_id (fiscalizacao.Recomendacao / Determinacao, por consulta)
core.Aviso ← enviado por core.servicos.enviar_aviso (tipos caters.*)
```
