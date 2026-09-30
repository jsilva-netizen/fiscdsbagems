# Data Model: Módulo planejamento

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Modelo do app `planejamento` do sistema novo:
- todas as chaves primárias são UUID;
- toda entidade tem `criado_em` e `atualizado_em` do servidor;
- valores monetários em `Decimal` com 2 casas; quantidades de diária em `Decimal` com 1 casa,
  múltiplos de 0,5;
- referências ao core (usuário, câmara, diretoria, serviço, município, entidade) são chaves para os
  modelos do core, lidas por `core.consultas`;
- não há referência a nenhum app posterior ([research P1](./research.md)).

## Configuração

### ConfiguracaoPlanejamento
Uma por câmara (R-planejamento-018).

| Campo | Tipo | Regras |
|---|---|---|
| camara | → CamaraTecnica | única |
| mudancas_com_aprovacao | lista de códigos de `TipoMudanca` | sempre contém `AUMENTAR_DIARIAS` |
| layout_cronograma | lista ordenada de códigos de coluna | só colunas oferecidas ([research P9](./research.md)); padrão: as do Anexo I |
| copiada_de | → ConfiguracaoPlanejamento, opcional | origem da cópia; sem vínculo depois |

### TipoAtividade
| Campo | Tipo | Regras |
|---|---|---|
| configuracao | → ConfiguracaoPlanejamento | |
| nome | texto | obrigatório; único na câmara |
| e_fiscalizacao | booleano | só atividades destes tipos vão para a fiscalização (R-planejamento-021) |
| ativo | booleano | usado em viagem: só desativa |

Padrão de câmara nova: "Fiscalização" (`e_fiscalizacao`), "Apresentação", "Educação ambiental".

### TipoMudanca (enumeração no código, não tabela)
`DATAS_MESMO_MES`, `DATAS_OUTRO_MES`, `INCLUIR_DESTINO`, `RETIRAR_DESTINO`, `INCLUIR_ATIVIDADE`,
`RETIRAR_ATIVIDADE`, `TROCAR_VEICULO`, `ALTERAR_DISTANCIA`, `ALTERAR_SERVIDORES`,
`AUMENTAR_DIARIAS` (sempre pede aprovação), `REDUZIR_DIARIAS`, `CANCELAR_VIAGEM`,
`INCLUIR_PARTICIPACAO` ([research P5](./research.md)).

### TipoDestino (registro em memória, não tabela)
Código, nome, app que oferece e função de busca e resolução. Tipos iniciais: `municipio` e
`entidade` (planejamento, sobre o core); `concessao` e `rodovia` (registrados pelo app da CATERF)
([research P2](./research.md)).

## Cadastros provisórios

### Veiculo
Provisório até o app de frotas (R-planejamento-013).

| Campo | Tipo | Regras |
|---|---|---|
| identificacao | texto | obrigatório (ex.: modelo e cor) |
| placa | texto | obrigatória, única |
| autonomia_km_l | decimal | > 0 |
| ativo | booleano | usado em viagem: só desativa |

### ValorDiaria
Provisório até o app do financeiro (R-planejamento-014).

| Campo | Tipo | Regras |
|---|---|---|
| municipio | → Municipio | |
| valor | decimal | > 0 |
| vigente_desde | data | único por município e data; vale o de maior data até a data consultada |

## Plano e viagens

### Plano
| Campo | Tipo | Regras |
|---|---|---|
| camara | → CamaraTecnica | |
| ano | inteiro | único com a câmara (R-planejamento-001) |
| situacao | `rascunho` / `enviado` / `aprovado` | ver estados |
| preco_litro | decimal | > 0; padrão: o do plano anterior da câmara |
| enviado_em, aprovado_em | data e hora | |
| aprovado_por | → Usuario (diretor) | |
| motivo_devolucao | texto | a última devolução |

Estados: `rascunho` → `enviado` (coordenador) → `aprovado` (diretor), ou `enviado` → `rascunho` com
motivo (diretor devolve). Aprovado não volta: muda por `Mudanca`.

### Viagem (identidade estável)
| Campo | Tipo | Regras |
|---|---|---|
| plano_organizador | → Plano | plano da câmara organizadora |
| origem | `planejada` / `extra` | `extra` só depois da aprovação do plano |
| motivo_extra | texto | obrigatório se `extra` (denúncia, emergência, eventual, outro com descrição) |

### ViagemVersao
Logística, da câmara organizadora ([research P3](./research.md)).

| Campo | Tipo | Regras |
|---|---|---|
| viagem | → Viagem | |
| numero | inteiro | sequencial por viagem |
| situacao | `rascunho` / `pendente` / `vigente` / `substituida` / `devolvida` | no máximo uma `pendente` e uma `vigente` por viagem |
| data_inicio, data_fim | data | fim ≥ início; o ano do início é o do plano |
| destinos | lista de `Destino` | pelo menos um |
| distancia_km | decimal | ≥ 0 |
| veiculo | → Veiculo, opcional | |
| autonomia_km_l | decimal | a do veículo, ou informada se sem veículo; > 0 |
| preco_litro | decimal | copiado do plano ao virar pendente ou vigente |
| litros, custo_combustivel | decimal | calculados e congelados ([research P4](./research.md)) |
| cancelada | booleano | versão de cancelamento |
| autor | → Usuario | |

### Destino
Valor dentro da versão: um por linha, ordenado.

| Campo | Tipo | Regras |
|---|---|---|
| tipo | código de `TipoDestino` | registrado |
| objeto_id | texto | identificador no app dono |
| nome | texto | nome do objeto no momento |

### Participacao (identidade estável)
| Campo | Tipo | Regras |
|---|---|---|
| viagem | → Viagem | |
| camara | → CamaraTecnica | mesma diretoria da organizadora; única por viagem |
| plano | → Plano | plano da câmara no ano da viagem |
| convite | `organizadora` / `convidada` / `aceita` / `recusada` | a organizadora nasce com a sua participação |

### ParticipacaoVersao
| Campo | Tipo | Regras |
|---|---|---|
| participacao | → Participacao | |
| numero, situacao | como em `ViagemVersao` | |
| quantidade_servidores | inteiro | ≥ 1 |
| total_diarias | decimal | soma dos lançamentos; congelado |
| autor | → Usuario | |

### Atividade (linhas da versão de participação)
| Campo | Tipo | Regras |
|---|---|---|
| versao | → ParticipacaoVersao | |
| atividade_id | UUID | estável entre versões; é a chave que a fiscalização guarda |
| tipo | → TipoAtividade | da câmara da participação |
| servicos | → Servico (vários) | serviços da câmara (core) |
| entidade_alvo | → Entidade, opcional | define o que o prestador vê |
| escondida_do_prestador | booleano | padrão falso |

### LancamentoDiaria (linhas da versão de participação)
| Campo | Tipo | Regras |
|---|---|---|
| versao | → ParticipacaoVersao | |
| quantidade | decimal | > 0, múltiplo de 0,5 |
| municipio_referencia | → Municipio | padrão: primeiro destino do tipo município |
| valor_unitario | decimal | da tabela vigente na data de início; ou informado |
| valor_informado | booleano | verdadeiro quando não havia valor na tabela |
| justificativa | texto | obrigatória se `valor_informado` |
| total | decimal | calculado e congelado |

## Mudanças e equipe

### Mudanca
| Campo | Tipo | Regras |
|---|---|---|
| viagem | → Viagem | |
| versao_viagem, versao_participacao | → versões propostas, opcionais | pelo menos uma |
| base_viagem, base_participacao | → versões vigentes na proposta | |
| tipos | lista de `TipoMudanca` | classificados pelo serviço ([research P5](./research.md)) |
| pede_aprovacao | booleano | algum tipo marcado ou `AUMENTAR_DIARIAS` |
| situacao | `pendente` / `aprovada` / `devolvida` / `retirada` / `aplicada` | `aplicada` = sem aprovação |
| autor, decidido_por | → Usuario | |
| motivo | texto | obrigatório na devolução |
| decidido_em | data e hora | |

### Escala
| Campo | Tipo | Regras |
|---|---|---|
| participacao | → Participacao | |
| usuario | → Usuario | ativo, com câmara (fiscal ou coordenador) |
| situacao | `escalado` / `pedido` / `liberado` / `recusado` / `expirado` / `cancelado` | `escalado` para a própria câmara; `pedido` → `liberado`/`recusado`/`expirado` para outra câmara |
| camara_origem | → CamaraTecnica | câmara do usuário |
| decidido_por | → Usuario (coordenador de origem) | |
| motivo | texto | obrigatório na recusa |

Validações: escalas ativas (`escalado`, `liberado`) ≤ quantidade de servidores da versão vigente;
nenhuma sobreposição de período com outra escala ativa do mesmo usuário; pedido de liberação só com
a participação aprovada; mudança de período aplicada volta as escalas de outra câmara para `pedido`.

## Relações

```text
CamaraTecnica 1──1 ConfiguracaoPlanejamento 1──* TipoAtividade
CamaraTecnica 1──* Plano (um por ano)
Plano(organizador) 1──* Viagem 1──* ViagemVersao (Destino*)
Viagem 1──* Participacao (uma por câmara) 1──* ParticipacaoVersao (Atividade*, LancamentoDiaria*)
Participacao *──1 Plano (da câmara participante)
Viagem 1──* Mudanca
Participacao 1──* Escala *──1 Usuario
ViagemVersao *──0..1 Veiculo; LancamentoDiaria *──1 Municipio; ValorDiaria *──1 Municipio
```

Auditoria: todo serviço de escrita grava no `RegistroAuditoria` do core, com a câmara do registro
(R-core-022).
