# Data Model: Módulo tramitação de documentos e dados

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Chaves primárias em UUID. Datas no fuso de Mato Grosso do Sul. Funcionalidade nova: nenhum modelo vem
do sistema atual.

## Unidades e configuração

### UnidadeTramitacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| tipo | `camara` / `diretoria` / `outra` | |
| camara | → CamaraTecnica, opcional | obrigatória se `camara` |
| diretoria | → Diretoria, opcional | obrigatória se `diretoria`; a das câmaras vem do core |
| nome | texto | `outra`: obrigatório |
| ativa | booleano | |

Câmaras e diretorias criadas por migração de dados (X2).

### MembroUnidade
Só para unidades `outra`.

| Campo | Tipo | Regras |
|---|---|---|
| unidade | → UnidadeTramitacao | |
| usuario | → Usuario | |
| inicio | data | |
| fim | data, opcional | |

### TipoExpediente
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| unidade | → UnidadeTramitacao | dona |
| nome | texto | único por unidade |
| sentido | `para_entidade` / `da_entidade` / `interno` | |
| exige_resposta | booleano | |
| prazo_padrao_dias | inteiro, opcional | > 0 |
| ativo | booleano | |
| copiado_de | → TipoExpediente, opcional | cópia sem vínculo |

### SequenciaProtocolo
| Campo | Tipo | Regras |
|---|---|---|
| ano | inteiro | único |
| ultimo | inteiro | travado na atribuição |

## Expedientes

### Expediente
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| protocolo | texto, opcional | `NNNNN/AAAA`, no envio ou no protocolo da entidade; único |
| tipo | → TipoExpediente | |
| assunto | texto | obrigatório |
| entidade | → Entidade, opcional | obrigatória se o tipo envolve entidade |
| unidade_responsavel | → UnidadeTramitacao | troca só por movimentação |
| prazo | data, opcional | da última mensagem que pede resposta |
| estado | `rascunho` / `ativo` / `encerrado` / `cancelado` | |
| motivo_encerramento | texto, opcional | obrigatório ao encerrar ou cancelar |
| numero_processo_ems | texto, opcional | |
| numero_oficio | texto, opcional | até a Q2 |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | |

A situação (aguardando resposta, prazo vencido, respondido) é calculada na consulta.

### Mensagem
Imutável (X3).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| expediente | → Expediente | protegida |
| tipo | `envio` / `resposta` / `pedido_complemento` / `complemento` / `protocolo` / `encerramento` / `externo` | |
| lado | `agems` / `entidade` / `ems` | |
| texto | texto, opcional | |
| prazo | data, opcional | nos tipos que pedem resposta |
| no_prazo | booleano, opcional | nas respostas, pelo servidor |
| autor | → Usuario, opcional | vazio no lado `ems` |
| enviada_em | data e hora | servidor |

### DocumentoExpediente
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| mensagem | → Mensagem | |
| tipo | `anexo` / `comprovante` / `externo` | |
| arquivo | chave no repositório privado | |
| nome_original | texto | |
| tipo_conteudo | texto | PDF, imagem ou planilha, conferido pelo conteúdo |
| tamanho | inteiro | até 20 MB |
| checksum | texto | SHA-256 |
| criado_em | data e hora | |

### Ciencia
| Campo | Tipo | Regras |
|---|---|---|
| mensagem | → Mensagem | |
| usuario | → Usuario | |
| lado | `entidade` / `unidade` | |
| em | data e hora | servidor; vale a primeira por mensagem e lado |

### Movimentacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| expediente | → Expediente | |
| de_unidade, para_unidade | → UnidadeTramitacao | diferentes |
| despacho | texto | obrigatório |
| autor | → Usuario | membro da unidade de origem |
| em | data e hora | |
| ciencia_em | data e hora, opcional | primeira abertura por membro do destino |

### LigacaoRegistro
| Campo | Tipo | Regras |
|---|---|---|
| expediente | → Expediente | |
| tipo | `fiscalizacao` / `processo_sancionador` / `viagem` | resolvido pela consulta do dono (X13) |
| objeto_id | UUID | único com expediente e tipo |

### EventoExpediente
Imutável (X14).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| expediente | → Expediente | |
| tipo | texto | `mensagem`, `ciencia`, `movimentacao`, `protocolo_externo`, `encerramento`, `cancelamento` |
| descricao | texto | |
| autor | → Usuario, opcional | |
| criado_em | data e hora | |

## Pedidos de dados

### FormatoDados
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| unidade | → UnidadeTramitacao | dona |
| nome | texto | único por unidade |
| ativo | booleano | |
| copiado_de | → VersaoFormato, opcional | |

### VersaoFormato
Imutável.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| formato | → FormatoDados | |
| numero | inteiro | único por formato |
| definicao | JSON | campos, planilha, regras de linha (X6) |
| criado_por | → Usuario | |
| criado_em | data e hora | a mais recente é a vigente |

### PedidoDados
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| unidade | → UnidadeTramitacao | |
| formato | → FormatoDados | |
| entidades | lista de → Entidade | pelo menos uma |
| periodicidade | `pontual` / `mensal` / `trimestral` / `semestral` / `anual` | |
| data_limite | data, opcional | obrigatória se `pontual` |
| dia_prazo | inteiro, opcional | dias depois do fim do período; obrigatório se recorrente |
| inicio, fim | data, data opcional | vigência do pedido recorrente |
| canal | `portal` / `integracao` | |
| conector | texto, opcional | código registrado (X9), se `integracao` |
| ativo | booleano | |
| criado_por | → Usuario | |
| criado_em | data e hora | |

### PedidoPeriodo
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| pedido | → PedidoDados | |
| entidade | → Entidade | |
| periodo_inicio, periodo_fim | data | único: pedido + entidade + início |
| prazo | data | |
| versao_formato | → VersaoFormato | vigente na abertura |
| aberto_em | data e hora | |

A situação (pendente, recebido, recebido fora do prazo, atrasado) é calculada pelo envio vigente.

### EnvioDados
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| periodo | → PedidoPeriodo | |
| linhas | JSON | valores normalizados, validados pela versão do período |
| arquivo | chave no repositório privado, opcional | planilha original |
| automatico | booleano | canal integração |
| enviado_por | → Usuario, opcional | vazio se automático |
| enviado_em | data e hora | servidor |
| no_prazo | booleano | |
| vigente | booleano | um vigente por período |

## Integração com o protocolo externo

### OperacaoProtocolo
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| expediente | → Expediente | |
| tipo | `enviar_documentos` / `abrir_processo` / `andamentos` / `baixar_documento` | |
| pedido | JSON | sem credenciais |
| retorno | JSON, opcional | sem credenciais |
| situacao | `pendente` / `em_andamento` / `concluida` / `recusada` / `erro` | |
| tentativas | inteiro | até 10 |
| proxima_tentativa | data e hora, opcional | |
| motivo | texto, opcional | recusa ou erro |
| criado_por | → Usuario | |
| criado_em, concluida_em | data e hora | |

### ControleAviso
| Campo | Tipo | Regras |
|---|---|---|
| tipo | texto | tipo de aviso registrado |
| referencia_id | UUID | |
| data | data | único com tipo e referência |
| enviado_em | data e hora | |

## Registros em memória (não são tabelas)

| Registro | Conteúdo |
|---|---|
| Conector | código, app, nome, função `buscar(periodo)` (X9) |
| Adaptador de protocolo | implementação da porta `IntegracaoProtocolo`, escolhida por configuração (X10) |

## Transições

```text
Expediente.estado: rascunho → ativo (envio ou protocolo) → encerrado (motivo)
                   rascunho | ativo → cancelado (motivo)
OperacaoProtocolo.situacao: pendente → em_andamento → concluida | recusada
                            em_andamento → pendente (falha, nova tentativa) → erro (10 tentativas)
```
