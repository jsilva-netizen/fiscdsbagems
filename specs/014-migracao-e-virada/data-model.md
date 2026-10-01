# Data Model: Migração de dados e virada

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Modelos do app `virada` ([research M1](./research.md)). Chaves primárias em UUID. Os arquivos
(relatórios, backups, evidências) ficam no repositório privado, cifrados, com acesso só da equipe da
virada.

## Ensaio

### Ensaio
Um ensaio ou a própria virada.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| nome | texto | único (ex.: `ensaio-1`, `ensaio-geral`, `virada`) |
| tipo | `ensaio` / `ensaio_geral` / `virada` | |
| dump_checksum | texto | SHA-256 do dump |
| arquivos_checksum | texto | SHA-256 do manifesto da cópia dos arquivos |
| inventario_em | data e hora | do inventário refeito |
| lista_teste_checksum, ajustes_checksum | texto | |
| semente_amostra | inteiro | para a amostra lado a lado (M5) |
| situacao | `preparado` / `carregando` / `conferido` / `falhou` / `descartado` / `aprovado` | |
| iniciado_em, concluido_em | data e hora | |
| relatorio | arquivo, opcional | `relatorio.json`, `.html`, `.pdf` |
| relatorio_checksum | texto, opcional | |

### EtapaExecucao
| Campo | Tipo | Regras |
|---|---|---|
| ensaio | → Ensaio | |
| ordem | inteiro | 1 a 10 (R-virada-002) |
| codigo | texto | ex.: `core`, `config_camaras`, `checklists` |
| precondicoes_ok | booleano | |
| iniciada_em, concluida_em | data e hora | |
| resultado | `ok` / `falhou` | |
| conferencia | arquivo, opcional | JSON do contrato (M4) |
| log | arquivo | |

### Pendencia
| Campo | Tipo | Regras |
|---|---|---|
| ensaio | → Ensaio | |
| modulo | texto | |
| tipo | `registro` / `valor` / `arquivo` / `ligacao` | |
| referencia | texto | tabela e identificador, ou caminho do arquivo |
| detalhe | JSON | campo e valores, checksums ou ligação |
| decisao | `aberta` / `aceita` / `recusada` | |
| justificativa | texto, opcional | obrigatória se aceita |
| decidido_por | → Usuario, opcional | o responsável |
| decidido_em | data e hora, opcional | |

## Aparelhos

### ConfirmacaoAparelho
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| usuario | → Usuario | migrado do core |
| aparelho | texto | identificação informada (modelo, patrimônio) |
| diretoria | → Diretoria | uma confirmação por diretoria em que o usuário trabalha (M8) |
| arquivo | arquivo | backup cifrado |
| arquivo_checksum | texto | SHA-256 |
| operacoes_pendentes | inteiro | `fila_mutacoes` com status diferente de `done` |
| fotos_pendentes | inteiro | `fotos_local` sem `syncedAt` |
| detalhe | JSON | lista das operações (entidade, tipo, data) e das fotos |
| resultado | `liberado` / `bloqueado` / `excecao` | `excecao`: não pode sincronizar; vai para M9 |
| registrado_por | → Usuario | |
| registrado_em | data e hora | |

A confirmação vigente de cada usuário e diretoria é a mais recente.

### ImportacaoBackupLegado
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| confirmacao | → ConfirmacaoAparelho | resultado `excecao` |
| ensaio | → Ensaio | o da virada |
| aplicadas, recusadas | inteiro | |
| detalhe | JSON | cada operação com resultado e motivo |
| importacao_fiscalizacao_id | UUID, opcional | registro da importação de fila da fiscalização (F12) |
| executada_em | data e hora | |

## Portões, aprovação e depois

### VerificacaoPortao
| Campo | Tipo | Regras |
|---|---|---|
| ensaio | → Ensaio | |
| portao | inteiro | 1 a 6; único por ensaio |
| situacao | `aberto` / `satisfeito` | |
| evidencias | JSON | lista de arquivo e checksum |
| automatico | booleano | falso só no portão 4 (revisão das matrizes) |
| verificado_em | data e hora | |
| verificado_por | → Usuario, opcional | |

### AprovacaoVirada
| Campo | Tipo | Regras |
|---|---|---|
| ensaio | → Ensaio | tipo `virada`; única |
| aprovado_por | → Usuario | o responsável |
| aprovado_em | data e hora | |
| evidencias_checksum | texto | SHA-256 do conjunto de evidências dos seis portões |
| observacoes | texto, opcional | |

### ControleAbertura (configuração do core)
| Campo | Tipo | Regras |
|---|---|---|
| sistema_aberto | booleano | só liga com `AprovacaoVirada` (M11) |
| aberto_em | data e hora, opcional | ponto de não retorno |
| primeira_gravacao_em | data e hora, opcional | |

### ConferenciaPosVirada
| Campo | Tipo | Regras |
|---|---|---|
| data | data | única; nos 30 dias seguintes à abertura |
| diferencas | JSON | por tabela: contagem esperada e obtida dos registros migrados |
| situacao | `ok` / `diferenca` | `diferenca` gera aviso |

## Transições

```text
Ensaio.situacao: preparado → carregando → conferido → aprovado (só tipo virada)
                 carregando → falhou → descartado
                 conferido → descartado (volta antes da abertura)
ConfirmacaoAparelho.resultado: bloqueado → (novo backup) liberado; excecao → importada (M9)
```
