# Data Model: Módulo DTR — app da CATERF

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Modelo do app `caterf` (módulo `dtr` da spec 003). Chaves UUID; `criado_em` e `atualizado_em` do
servidor no que sincroniza. As extensões apontam para os modelos donos por chave protegida
([research C2](./research.md)). O app não grava em modelos de outros apps.

## Modelos

### ConfiguracaoCaterf
Uma linha (a da CATERF).

| Campo | Tipo | Regras |
|---|---|---|
| limite_distancia_m | decimal | padrão 500; acima dele, o KM não é calculado |

### ContratoRodoviario
Extensão de `core.Contrato` (R-core-020, R-dtr-002).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| contrato | → core.Contrato | único; protegido; contrato de entidade com serviço de rodovias |
| rodovias | lista de textos | pelo menos uma (ex.: "MS-112", "MS-306") |
| criado_em, atualizado_em | data e hora | |

### Tracado
Uma linha por versão do KML.

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| contrato_rodoviario | → ContratoRodoviario | |
| versao | inteiro | sequencial por contrato |
| situacao | `vigente` / `substituido` | uma vigente por contrato |
| arquivo | chave no repositório privado | KML até 10 MB |
| checksum | texto | SHA-256 |
| tamanho | inteiro | |
| pontos_lidos | inteiro | |
| segmentos_lidos | inteiro | |
| km_inicial, km_final | decimal, opcional | |
| extensao_km | decimal, opcional | |
| pacote | chave no repositório privado | JSON compactado para o aparelho (C4) |
| checksum_pacote | texto | |
| enviado_por | → core.Usuario | |
| enviado_em | data e hora | |

### PontoKm
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| tracado | → Tracado | |
| rodovia | texto, opcional | |
| km | texto | como no KML (ex.: "42.5") |
| km_valor | decimal | para ordenar e projetar |
| latitude, longitude | decimal | |

### FiscalizacaoRodoviaria
Extensão de `fiscalizacao.Fiscalizacao` (R-dtr-004).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | do aparelho |
| fiscalizacao | → fiscalizacao.Fiscalizacao | única; protegida |
| contrato_rodoviario | → ContratoRodoviario | |
| rodovia | texto | rodovia principal; uma das do contrato |
| legado | lista de textos | marcas da migração |
| criado_em, atualizado_em | data e hora | |

### Ocorrencia
Extensão de `fiscalizacao.RegistroCampo` do tipo avulso `caterf.ocorrencia` (R-dtr-006).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | do aparelho |
| registro | → fiscalizacao.RegistroCampo | único; protegido; tipo avulso da CATERF |
| fiscalizacao_rodoviaria | → FiscalizacaoRodoviaria | |
| rodovia | texto, opcional | |
| trecho | texto, opcional | |
| km | texto, opcional | como exibido |
| km_valor | decimal, opcional | |
| km_origem | `ponto` / `segmento` / `digitado` | |
| km_impreciso | booleano | |
| distancia_tracado_m | decimal, opcional | |
| tracado | → Tracado, opcional | versão usada no cálculo |
| sentido | `N` / `S` / `N/S`, opcional | |
| etapa_obra | texto, opcional | um dos valores do item |
| gravidade | `leve` / `media` / `grave` / `gravissima`, opcional | |
| frente_epoca | texto, opcional | texto copiado nas ocorrências migradas |
| item_per_epoca | texto, opcional | idem |
| clausula_epoca | texto, opcional | idem |
| prazo_epoca | inteiro, opcional | idem |
| legado | lista de textos | |
| criado_em, atualizado_em | data e hora | |

### RecalculoKm
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| fiscalizacao_rodoviaria | → FiscalizacaoRodoviaria | fiscalização reaberta |
| por | → core.Usuario | fiscal ou coordenador da CATERF |
| situacao | `previa` / `aplicado` / `descartado` | |
| itens | JSON | por ocorrência: KM antigo, novo, origem, sem coordenada, confirmado |
| criado_em, aplicado_em | data e hora | |

## Relações

```text
core.Contrato 1──1 ContratoRodoviario 1──* Tracado 1──* PontoKm
fiscalizacao.Fiscalizacao 1──1 FiscalizacaoRodoviaria *──1 ContratoRodoviario
fiscalizacao.RegistroCampo 1──1 Ocorrencia *──1 FiscalizacaoRodoviaria
Ocorrencia *──0..1 Tracado
FiscalizacaoRodoviaria 1──* RecalculoKm
```

Auditoria: todo serviço de escrita grava no `RegistroAuditoria` do core, com a câmara CATERF.
