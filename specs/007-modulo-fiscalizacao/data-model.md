# Data Model: Módulo fiscalização

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Modelo do app `fiscalizacao` do sistema novo. As convenções são as mesmas do core e do
planejamento:
- chaves UUID, geradas no aparelho quando o registro nasce offline;
- `criado_em` e `atualizado_em` do servidor em tudo o que sincroniza;
- referências ao core por chave (câmara, município, entidade, serviço, usuário);
- referências ao motor de checklists e ao planejamento por identificador, conferido pelas consultas
  deles ([research F1, F3, F15](./research.md));
- nenhuma referência a apps posteriores: os dados próprios de uma câmara ficam no app dela,
  apontando para o registro de campo (F7).

As colunas do sistema atual estão no mapa de migração
(`specs/003-base-dados-producao/anotacoes/migracao/fiscalizacao.toml`), não aqui.

## Configuração

### ConfiguracaoFiscalizacao
Uma por câmara (F13).

| Campo | Tipo | Regras |
|---|---|---|
| camara | → CamaraTecnica | única |
| layout_relatorio | texto | código de layout registrado (F7); padrão: o genérico do app |
| titulo_documento | texto | ex.: "TERMO DE VISTORIA AGEMS/DSB" |
| linhas_marca_dagua | lista de textos | modelos com campos `{codigo}`, `{municipio}`, `{uf}`, `{data}`, `{hora}`, `{coordenadas}` e os do app da câmara |
| limite_impreciso_m | decimal | padrão 20 |
| copiada_de | → ConfiguracaoFiscalizacao, opcional | cópia sem vínculo |

### SequenciaTermo
Uma linha por ano (F6).

| Campo | Tipo | Regras |
|---|---|---|
| ano | inteiro | único |
| ultimo | inteiro | último número atribuído; travado na atribuição |

## Fiscalização

### Fiscalizacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | do aparelho |
| camara | → CamaraTecnica | obrigatória |
| entidade | → Entidade | obrigatória |
| municipio | → Municipio, opcional | obrigatório quando algum destino é município |
| destinos | lista de destinos | copiados da atividade: tipo registrado, objeto_id, nome no momento (como no planejamento) |
| servicos | → Servico (vários) | pelo menos um; todos da câmara |
| atividade_id | UUID, opcional | `atividade_id` do planejamento; único quando preenchido (F15) |
| urgencia | booleano | verdadeiro só sem atividade, criada por coordenador |
| motivo_urgencia | texto | obrigatório se `urgencia` |
| responsavel | → Usuario | fiscal responsável; da equipe |
| data_inicio | data e hora | a criação no aparelho |
| data_fim | data e hora, opcional | a primeira finalização |
| situacao | `em_andamento` / `finalizada` | |
| numero_termo | texto, opcional | "NNN/AAAA"; gravado uma vez (F6) |
| numeracao_congelada | booleano | verdadeiro depois da finalização |
| reaberturas | inteiro | contador (F9) |
| origem | `criada` / `migrada` / `importada` | |
| origem_detalhe | texto, opcional | arquivo e data da importação |
| legado | lista de textos | marcas de legado da migração (MIG-4) |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | |

Estados: `em_andamento` → `finalizada` (fiscal ou coordenador da equipe ou da câmara), e
`finalizada` → `em_andamento` só por `Reabertura`. Pendência de ligação: `urgencia` e
`atividade_id` vazio.

### MembroEquipe
| Campo | Tipo | Regras |
|---|---|---|
| fiscalizacao | → Fiscalizacao | |
| usuario | → Usuario | único por fiscalização; fiscal ou coordenador ativo |
| origem | `escala` / `informado` | `escala` vem do planejamento; `informado` na urgência |
| escala_id | UUID, opcional | escala do planejamento |

### Reabertura
| Campo | Tipo | Regras |
|---|---|---|
| fiscalizacao | → Fiscalizacao | |
| motivo | texto | obrigatório |
| por | → Usuario | fiscal ou coordenador da câmara |
| em | data e hora | |
| data_fim_anterior | data e hora | |

## Registro de campo e vistoria

### RegistroCampo
A unidade vistoriada ou o registro avulso.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | do aparelho |
| fiscalizacao | → Fiscalizacao | protegida |
| catalogo_id | UUID | catálogo do motor (ativo e da câmara na criação) |
| item_versao_id | UUID, opcional | modo avulso: versão do item escolhida; vazio no item livre |
| item_livre | JSON, opcional | modo avulso com item livre: níveis de agrupamento escolhidos ou digitados e a descrição (R-fiscalizacao-004) |
| resposta | texto, opcional | modo avulso: código da resposta declarada |
| tipo_avulso | texto, opcional | código registrado pelo app da câmara (F7) |
| nome | texto | |
| codigo | texto | único na fiscalização quando preenchido |
| endereco | texto, opcional | |
| latitude, longitude | decimal, opcional | ponto (R-fiscalizacao-010) |
| precisao_m | decimal, opcional | |
| origem_ponto | `gps` / `foto` / `digitado` | |
| coordenadas_digitadas | texto, opcional | como o fiscal digitou (graus decimais ou graus, minutos e segundos) |
| ponto_em | data e hora, opcional | |
| impreciso | booleano | precisão acima do limite da câmara |
| data_hora_vistoria | data e hora | padrão: a criação |
| ordem | inteiro | reordenável; ordem da numeração contínua (F5); padrão: a de criação |
| situacao | `em_andamento` / `finalizado` | |
| legado | lista de textos | |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | a criação define a versão do catálogo |

### Resposta
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| registro | → RegistroCampo | única por registro e item |
| item_versao_id | UUID | versão respondida (R-checklists-005) |
| valor | texto | código de resposta declarado no catálogo (nos modelos da DSB, `sim`, `nao` e `na`) |
| observacao | texto, opcional | |
| texto_constatacao | texto, opcional | copiado do item, editável |
| constatacao_excluida | booleano | fora da contagem sem apagar a resposta |
| ordem_constatacao | inteiro | |
| numero_constatacao | inteiro, opcional | C<n> na fiscalização; calculado (F5) |
| criado_em, atualizado_em | data e hora | |

### ConstatacaoManual
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| registro | → RegistroCampo | |
| descricao | texto | obrigatória |
| gera_nc | booleano | |
| dispositivo | texto, opcional | |
| descricao_nc | texto, opcional | se vazia, a padrão (R-fiscalizacao-007) |
| texto_determinacao | texto, opcional | |
| texto_recomendacao | texto, opcional | usado sem determinação |
| ordem_constatacao | inteiro | |
| numero_constatacao | inteiro, opcional | C<n> na fiscalização; calculado (F5) |
| criado_em, atualizado_em | data e hora | |

### NaoConformidade
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | estável enquanto a origem existir (F4) |
| registro | → RegistroCampo | |
| origem | texto | `resposta:<id>` ou `constatacao:<id>`; única por registro |
| resposta | → Resposta, opcional | uma das duas obrigatória: a constatação que a NC referencia |
| constatacao_manual | → ConstatacaoManual, opcional | |
| descricao | texto | "Constatação C<n>: ..."; o número acompanha a numeração |
| dispositivo | texto, opcional | |
| numero | inteiro, opcional | NC<n> na fiscalização |
| criado_em, atualizado_em | data e hora | |

### Determinacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| registro | → RegistroCampo | |
| origem | texto | única por registro |
| nao_conformidade | → NaoConformidade | obrigatória: a NC que a determinação manda sanar; religada na consolidação |
| descricao | texto | "Sanar NC<n>. <texto>"; o número acompanha a numeração |
| texto_editado | booleano | a consolidação preserva |
| prazo_dias | inteiro | > 0; padrão do item ou 30 |
| data_limite | data | criação + prazo |
| ordem | inteiro | entre as determinações da mesma NC |
| numero | inteiro, opcional | D<n> na fiscalização |
| criado_em, atualizado_em | data e hora | |

### Recomendacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| registro | → RegistroCampo | |
| origem | texto | única por registro; a constatação que a recomendação referencia |
| descricao | texto | |
| texto_editado | booleano | |
| ordem | inteiro | dentro do registro |
| numero | inteiro, opcional | R<n> na fiscalização |
| criado_em, atualizado_em | data e hora | |

### Foto
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | do aparelho |
| registro | → RegistroCampo | até 20 por registro |
| ordem | inteiro | ordem do relatório |
| legenda | texto, opcional | |
| arquivo | chave no repositório privado | versão com marca d'água |
| arquivo_original | chave no repositório privado, opcional | versão sem marca (legado pode não ter) |
| checksum | texto | SHA-256 do arquivo |
| checksum_original | texto, opcional | |
| tamanho | inteiro | ≤ 5 MB |
| largura, altura | inteiro, opcional | |
| capturada_em | data e hora, opcional | |
| latitude, longitude | decimal, opcional | da captura |
| criado_em | data e hora | |

## Relatório e importação

### Relatorio
Uma linha por versão (F10).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| fiscalizacao | → Fiscalizacao | |
| versao | inteiro | sequencial por fiscalização |
| layout | texto | código usado |
| pedido_por | → Usuario | |
| pedido_em | data e hora | |
| situacao | `na_fila` / `gerando` / `pronto` / `erro` | |
| estado | `vigente` / `substituido` / `desatualizado` | só para `pronto` |
| progresso_registros, progresso_fotos | inteiro | |
| mensagem_erro | texto, opcional | |
| arquivo | chave no repositório privado, opcional | PDF único |
| partes_legado | lista de chaves | relatórios migrados em partes |
| gerado_em | data e hora, opcional | |

### Importacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| tipo | `fiscalizacoes` / `fila_aparelho` | F17, F12 |
| arquivo | chave no repositório privado | |
| por | → Usuario (administrador) | |
| autor_original | → Usuario, opcional | fila de aparelho |
| situacao | `previa` / `gravando` / `concluida` / `erro` | |
| previa | JSON | o que será criado, recusado e ignorado, por linha |
| resultado | JSON | identificadores criados |
| criado_em | data e hora | |

## Relações

```text
CamaraTecnica 1──1 ConfiguracaoFiscalizacao
Fiscalizacao 1──* MembroEquipe *──1 Usuario
Fiscalizacao 1──* Reabertura; 1──* Relatorio; 1──* RegistroCampo
RegistroCampo 1──* Resposta, ConstatacaoManual, NaoConformidade, Determinacao, Recomendacao, Foto
Determinacao *──0..1 NaoConformidade
Fiscalizacao ··· atividade_id (planejamento, por consulta)
RegistroCampo ··· catalogo_id, item_versao_id (checklists, por consulta)
RegistroCampo ←── registro próprio do app da câmara (ex.: ocorrência da CATERF)
```

Auditoria: todo serviço de escrita grava no `RegistroAuditoria` do core, com a câmara da
fiscalização. Remoções entram na tabela de remoções do protocolo de sincronização.
