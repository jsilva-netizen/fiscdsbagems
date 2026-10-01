# Data Model: Módulo processo sancionador

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Chaves primárias em UUID. Datas no fuso de Mato Grosso do Sul ([research N5](./research.md)). Os
modelos de colegiado e decisão são provisórios até a questão Q1 da spec ([research N11](./research.md)).

## Configuração e numeração

### ConfiguracaoSancionador
Uma por câmara (R-sancionador-001).

| Campo | Tipo | Regras |
|---|---|---|
| camara | → CamaraTecnica | única |
| prazo_resposta_dias | inteiro | > 0; padrão 30 |
| prazo_defesa_dias | inteiro | > 0; padrão 30 |
| layout_am, layout_remessa, layout_termo_envio | texto | códigos de layout registrados (N8) |
| base_legal_am | texto | citado na AM |
| declaracao_termo_envio | texto | texto de declaração do modelo do termo de envio (R-sancionador-006) |
| copiada_de | → ConfiguracaoSancionador, opcional | cópia sem vínculo |

### SequenciaDocumento
| Campo | Tipo | Regras |
|---|---|---|
| tipo | `tn` / `am` / `ai` | |
| diretoria | → Diretoria | |
| ano | inteiro | único com tipo e diretoria |
| ultimo | inteiro | travado na atribuição (N3) |

## Processo e notificação

### ProcessoSancionador
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `termos_notificacao` |
| numero_processo | texto | número do processo administrativo; obrigatório |
| fiscalizacao | → Fiscalizacao | protegida; finalizada, da câmara (N4) |
| entidade | → Entidade | da fiscalização |
| municipio | → Municipio, opcional | da fiscalização |
| camara | → CamaraTecnica | da fiscalização |
| etapa | `notificacao` / `analise_manifestacao` / `autos_defesa` / `parecer_tecnico` / `julgamento` / `deliberacao` / `encerrado` | só pelo serviço `movimentar` (N2) |
| situacao | `ativo` / `encerrado` / `cancelado` | |
| encerrado_em, cancelado_em | data e hora, opcional | |
| motivo_cancelamento | texto, opcional | obrigatório se cancelado |
| legado | lista de textos | ocorrências da migração |
| criado_por | → Usuario, opcional | |
| criado_em, atualizado_em | data e hora | |

Único: um processo não cancelado por fiscalização.

### TermoNotificacao
Um por processo.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `termos_notificacao` |
| processo | → ProcessoSancionador | único |
| numero | texto, opcional | atribuído na emissão (N3); único |
| tipo_relatorio | `RFP` / `RFE` / `RAO` | padrão `RFP` |
| numero_processo | texto | formato `NN.NNN.NNN-AAAA`, conferido pelo servidor |
| numero_relatorio | texto | só dígitos |
| ano_relatorio | inteiro | ano da emissão; único com tipo, câmara e número |
| camara | → CamaraTecnica | igual à do processo; parte da unicidade do relatório |
| fluxo | `portal` / `manual` | |
| prazo_resposta_dias | inteiro | > 0; padrão da configuração |
| observacoes | texto, opcional | |
| emitido_em | data e hora, opcional | com o TN e o relatório assinados |
| data_protocolo | data, opcional | ciência (portal: servidor; manual: equipe) |
| inicio_prazo | data, opcional | gravado uma vez (N5) |
| data_limite | data, opcional | início + prazo |
| assinatura_entidade_em | data e hora, opcional | primeiro envio do TN assinado |
| assinatura_aceita | booleano, opcional | decisão da equipe |
| motivo_recusa_assinatura | texto, opcional | |
| resposta_recebida_em | data, opcional | conclusão da resposta |
| resposta_no_prazo | booleano, opcional | servidor |
| situacao_legado | texto, opcional | situação gravada no sistema atual |
| cancelado_em | data e hora, opcional | |
| criado_em, atualizado_em | data e hora | |

A situação (pendente de emissão, aguardando assinatura, aguardando resposta, prazo vencido,
respondido) é calculada na consulta (N5).

### DeterminacaoNotificada
Retrato da determinação na emissão do TN (N4).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| termo | → TermoNotificacao | |
| determinacao_id | UUID | identificador na fiscalização, sem chave estrangeira; único por termo |
| registro_id | UUID | registro de campo (unidade) na fiscalização |
| numero | texto | D<n> |
| texto | texto | |
| prazo_dias | inteiro | |
| nc_texto, constatacao_texto | texto, opcional | |
| ordem | inteiro | |

O prazo de cumprimento (início do prazo + `prazo_dias`) e `alterada_depois` são calculados na leitura.

### RespostaDeterminacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `respostas_determinacao` |
| determinacao | → DeterminacaoNotificada | única |
| manifestacao | texto | obrigatória no envio |
| situacao | `rascunho` / `enviada` | |
| enviada_em | data e hora, opcional | servidor |
| no_prazo | booleano, opcional | servidor |
| registrada_por_equipe | booleano | fluxo manual |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | |

A entidade não altera a resposta enviada; a equipe não altera resposta citada por análise
concluída.

## Análise da Manifestação

### AnaliseManifestacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| termo | → TermoNotificacao | |
| versao | inteiro | 1, 2, ...; único por termo |
| numero | texto, opcional | atribuído na conclusão (N3); único |
| situacao | `rascunho` / `concluida` / `substituida` | uma não substituída por termo |
| concluida_em | data e hora, opcional | |
| criado_por | → Usuario | |
| criado_em | data e hora | |

### AnaliseResposta
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| analise | → AnaliseManifestacao | |
| determinacao | → DeterminacaoNotificada | única por análise |
| resultado | `acatada` / `nao_acatada` / `nao_atendida_no_prazo` | |
| texto | texto | obrigatório |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | só muda com a análise em rascunho |

## Autos, remessa e defesa

### AutoInfracao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `autos_infracao` |
| processo | → ProcessoSancionador | |
| analise | → AnaliseManifestacao | a que o gerou |
| determinacao | → DeterminacaoNotificada | único entre os não cancelados |
| numero | texto | atribuído na emissão (N3); único |
| descricao | texto | "Determinação D<n> não atendida: <texto>" |
| emitido_em | data e hora | |
| pena_base_uferms | inteiro, opcional | > 0 |
| pena_base_rs | decimal, opcional | ≥ 0; > 0 para entrar na remessa |
| situacao | `gerado` / `enviado` / `defesa_recebida` / `com_parecer` / `julgado` / `deliberado` / `cancelado` | só pelos serviços |
| recebido_em | data, opcional | recebimento da remessa |
| prazo_defesa | data, opcional | recebimento + prazo de defesa |
| cancelado_em | data e hora, opcional | |
| motivo_cancelamento | texto, opcional | |
| criado_em | data e hora | |

### Remessa
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `remessas_ai` |
| processo | → ProcessoSancionador | uma não cancelada por processo |
| situacao | `preparada` / `enviada` / `recebida` / `defesa_recebida` / `cancelada` | |
| criada_em | data e hora | |
| enviada_em, recebida_em | data e hora, opcional | servidor; `recebida_em` com o AI assinado do último auto |
| defesa_enviada_em | data e hora, opcional | servidor; envio da defesa da remessa (N10) |
| defesa_no_prazo | booleano, opcional | servidor |
| atualizado_em | data e hora | |

### RemessaItem
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| remessa | → Remessa | |
| auto | → AutoInfracao | único por remessa |
| criado_em | data e hora | |

### Defesa
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| auto | → AutoInfracao | única |
| texto | texto, opcional | texto ou anexo obrigatório no envio da remessa |
| situacao | `rascunho` / `enviada` | passa a `enviada` com o envio da remessa (N10) |
| registrada_por_equipe | booleano | recebida em papel |
| criado_em, atualizado_em | data e hora | |

### ParecerTecnico
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `pareceres_tecnicos` |
| auto | → AutoInfracao | único |
| analise_tecnica | texto | obrigatório para finalizar |
| recomendacao | `mantem` / `atenua` / `cancela` | |
| multa_sugerida_uferms | inteiro, opcional | obrigatório se `atenua` |
| multa_sugerida_rs | decimal, opcional | |
| situacao | `rascunho` / `finalizado` | não muda depois do encaminhamento |
| finalizado_em | data e hora, opcional | |
| criado_por | → Usuario | |
| criado_em | data e hora | |

## Julgamento e deliberação (provisório até Q1)

### Colegiado
| Campo | Tipo | Regras |
|---|---|---|
| codigo | `camara_julgamento` / `diretoria_executiva` | criados por migração de dados |
| nome | texto | |

### MembroColegiado
| Campo | Tipo | Regras |
|---|---|---|
| colegiado | → Colegiado | |
| usuario | → Usuario | ativo |
| inicio | data | |
| fim | data, opcional | vigente enquanto vazio ou futuro |

### DecisaoAuto
Uma por auto e instância.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| auto | → AutoInfracao | único com a instância |
| instancia | `julgamento` / `deliberacao` | |
| resultado | `mantem` / `atenua` / `cancela` | |
| multa_uferms | inteiro, opcional | obrigatório se mantém ou atenua |
| multa_rs | decimal, opcional | |
| fundamentacao | texto | |
| registrado_por | → Usuario | membro vigente do colegiado da instância |
| registrado_em | data e hora | |

## Linha do tempo, documentos e avisos

### EventoProcesso
Imutável (N12).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| processo | → ProcessoSancionador | |
| tipo | texto | `movimentacao`, `emissao`, `ciencia`, `resposta`, `analise`, `auto`, `remessa`, `defesa`, `parecer`, `decisao`, `cancelamento`, `documento` |
| etapa_de, etapa_para | texto, opcional | nas movimentações |
| descricao | texto | |
| referencia_tipo, referencia_id | texto, UUID, opcional | registro relacionado |
| autor | → Usuario, opcional | |
| pela_entidade | booleano | ação feita pelo portal |
| criado_em | data e hora | |

### DocumentoProcesso
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| processo | → ProcessoSancionador | protegida |
| tipo | `tn_agems` / `relatorio` / `protocolo` / `oficio_protocolo` / `tn_entidade` / `termo_envio` / `resposta_manual` / `oficio_resposta` / `evidencia` / `am_gerada` / `am_assinada` / `ai_agems` / `ai_entidade` / `protocolo_oficio_ai` / `protocolo_recebimento_ai` / `lista_remessa` / `recebimento_remessa` / `defesa_anexo` / `defesa_oficio` / `parecer_assinado` / `decisao` / `deliberacao` | |
| referencia_tipo, referencia_id | texto, UUID | registro dono (termo, resposta, análise, auto, remessa, defesa, parecer, decisão) |
| arquivo | chave no repositório privado | prefixo fixo por tipo (N9) |
| nome_original | texto | |
| tipo_conteudo | texto | PDF ou imagem, conferido pelo conteúdo |
| tamanho | inteiro | até 20 MB |
| checksum | texto | SHA-256 |
| enviado_por | → Usuario, opcional | |
| pela_entidade | booleano | |
| cancelado_em | data e hora, opcional | |
| motivo_cancelamento | texto, opcional | |
| criado_em | data e hora | |

### ControleAviso
| Campo | Tipo | Regras |
|---|---|---|
| tipo | texto | tipo de aviso registrado (N13) |
| referencia_id | UUID | |
| data | data | único com tipo e referência |
| enviado_em | data e hora | |

## Transições

```text
ProcessoSancionador.etapa (N2):
  notificacao → analise_manifestacao   (resposta concluída ou prazo vencido)
  analise_manifestacao → autos_defesa  (AM concluída com autos)
  analise_manifestacao → encerrado     (AM concluída sem autos)
  autos_defesa → parecer_tecnico       (todos os autos com defesa ou prazo de defesa vencido)
  parecer_tecnico → julgamento         (todos os autos não cancelados com parecer finalizado e assinado)
  julgamento → deliberacao             (decisão de julgamento em todos os autos não cancelados)
  deliberacao → encerrado              (deliberação em todos os autos não cancelados)
  qualquer etapa da câmara técnica → cancelado (motivo)
  [Q1] julgamento → parecer_tecnico    (devolução, se confirmada)
```

## Relações com outros apps

```text
core.CamaraTecnica, core.Entidade, core.Municipio ← ProcessoSancionador
fiscalizacao.Fiscalizacao ← ProcessoSancionador (PROTECT; verificação de documento registrada)
DeterminacaoNotificada ··· determinacao_id, registro_id (fiscalização, por consulta)
core.Papel ← papel julgador (migração de dados); core.Aviso ← tipos sancionador.*
```
