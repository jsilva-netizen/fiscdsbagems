# Data Model: Módulo checklists — motor genérico de verificação

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Chaves primárias em UUID. Nenhum modelo tem campo, texto ou regra de câmara: o conteúdo dos itens
está em `VersaoItem.valores`, conforme a definição da versão do modelo ([research K2, K3](./research.md)).

## Modelos de catálogo

### ModeloCatalogo
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| camara | → CamaraTecnica | dona |
| codigo | texto | `[a-z][a-z0-9_]*`; único por câmara; chave da configuração inicial (K11) |
| nome | texto | obrigatório; único por câmara, sem diferenciar maiúsculas |
| ativo | booleano | desativado não aceita catálogo novo |
| copiado_de | → VersaoModelo, opcional | origem da cópia (R-checklists-018); sem vínculo depois |
| entregue_por_app | texto, opcional | app que entregou como configuração inicial (R-checklists-020) |
| criado_por | → Usuario, opcional | vazio quando entregue por app |
| criado_em | data e hora | |

`incompleto` é calculado na leitura: alguma peça da versão vigente não está registrada (K6).

### VersaoModelo
Imutável depois de criada (R-checklists-017).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| modelo | → ModeloCatalogo | |
| numero | inteiro | 1, 2, ...; único por modelo |
| definicao | JSON | validada pelo esquema e pelas regras da K2 (abaixo) |
| criado_por | → Usuario, opcional | |
| criado_em | data e hora | a mais recente é a vigente |

**Definição** (estrutura do JSON):

| Parte | Conteúdo |
|---|---|
| `modo` | código de modo registrado (K6), de tipo `lista` ou `avulso` |
| `permite_item_livre` | booleano; só no modo `avulso` (R-checklists-012) |
| `campos[]` | `nome`, `rotulo`, `tipo` (`texto_curto`, `texto_longo`, `inteiro`, `sim_nao`, `lista_valores`, `lista_linhas`), `obrigatorio`, `padrao`, `valores` (para `lista_valores`), `positivo` (para `inteiro`), `papel` (`titulo`, `agrupamento` com `nivel` e `ordem` fixa ou natural, `aplicabilidade` com o código do contexto, `escolha_complementar`) |
| `respostas[]` | `codigo`, `rotulo`, `tipo` (`opcao`, `numero`, `texto`), `ordem`; opção: `valor` (número, opcional); número: `minimo`, `maximo`, `passo` |
| `tipos_gerados[]` | `codigo`, `nome`, `sigla`, `campos[]` (nome, rótulo, tipo, `papel_prazo`), `referencia` (`tipo`, `obrigatoria`), `texto` (modelo com `{campo}` e `{ref}`, texto para campo vazio, pontuação final, começos que dispensam o modelo), `numerado`, `ordem` (`referencia` / `equipe`), `relatorio` (estilo registrado, título, posição, colunas), `papeis[]` (códigos registrados), `edicao` (texto, prazo, suprimir, acrescentar) (R-checklists-022) |
| `entrada_manual` | opcional: `campos[]` (como os do item) e `saidas[]` (como as das respostas, com a origem na entrada) (R-checklists-023) |
| `saidas[]` | `resposta` (código da opção, ou faixa `{resposta, de, ate}` para a nota), `tipo` (código de `tipos_gerados[]`), `condicoes[]` (cada uma `campo` + `verdadeiro` / `preenchido` / `vazio`; todas precisam valer; lista vazia = sempre), `dados` (dado da saída → campo do item, a resposta dada (rótulo, valor ou nota) ou valor fixo) |
| `planilha` | `colunas[]` (cabeçalho → campo ou dado do catálogo: nome, código, serviços), `herda[]`, `junta` (campo `lista_linhas`), `chave[]` (campos obrigatórios), `cria_catalogos`, `exemplo[]` |

## Catálogos e itens

### Catalogo
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `tipos_unidade` |
| modelo | → ModeloCatalogo | da mesma câmara; não muda depois de ter item |
| camara | → CamaraTecnica | derivada dos serviços (R-checklists-002), gravada para o escopo; igual à câmara do modelo |
| nome | texto | obrigatório; único sem diferenciar maiúsculas |
| codigo | texto | obrigatório; único sem diferenciar maiúsculas |
| servicos | lista de → Servico | pelo menos um; todos da mesma câmara |
| ativo | booleano | "excluir" desativa (R-checklists-009) |
| copiado_de | → Catalogo, opcional | cópia pelo administrador (R-checklists-018) |
| criado_em, atualizado_em | data e hora | |

### Item
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado da DTR: o de `tipos_ocorrencia_dtr` |
| catalogo | → Catalogo | protegida |
| ordem | inteiro | mudar não cria versão |
| retirado_em | data e hora, opcional | preenchido ao retirar |
| criado_em | data e hora | |

### VersaoItem
Imutável depois de criada, exceto o preenchimento único de `vigente_ate` (K4).

| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | migrado: o de `itens_checklist` ou de `tipos_ocorrencia_dtr`; é o que os registros guardam |
| item | → Item | protegida |
| numero | inteiro | único por item |
| versao_modelo | → VersaoModelo | a vigente na criação; define os campos de `valores` |
| valores | JSON | um valor por campo da versão do modelo, validado (K3) |
| vigente_desde | data e hora | |
| vigente_ate | data e hora, opcional | maior que `vigente_desde`; no máximo uma versão sem fim por item |
| origem | `tela` / `importacao` / `copia` / `migracao` | |
| importacao | → ImportacaoPlanilha, opcional | quando veio de importação |
| copiado_de | → VersaoItem, opcional | quando veio de cópia |
| repeticao | booleano | migração: idêntica à anterior (premissa "Migração da DSB") |
| criado_por | → Usuario, opcional | vazio nas migradas (R-checklists-010) |
| criado_em | data e hora | |

## Importação

### ImportacaoPlanilha
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| camara | → CamaraTecnica | de quem importa |
| catalogo | → Catalogo, opcional | vazio quando o modelo cria catálogos pela planilha |
| versao_modelo | → VersaoModelo | formato usado |
| arquivo | arquivo privado | `.xlsx` ou `.csv`, até 5 MB |
| previa | JSON | por linha: número, situação (`novo`, `nova_versao`, `sem_mudanca`, `erro`), chave, motivo |
| ausentes | lista de → Item | vigentes fora da planilha |
| impressao | texto | estado dos catálogos na prévia (K7) |
| situacao | `previa` / `confirmada` / `descartada` | |
| retirados | lista de → Item | escolhidos na confirmação |
| criado_por | → Usuario | |
| criado_em, confirmado_em | data e hora | |

## Registros em memória (não são tabelas)

| Registro | Conteúdo | Quem registra |
|---|---|---|
| Papel de registro | código, app, nome, exigências (ex.: campo de prazo) | processo sancionador: notificado no termo, com prazo; CATERS: acompanhado pela câmara |
| Estilo de seção | código, app, nome, colunas disponíveis | fiscalização: lista por registro de campo, quadro de respostas (soma e média); CATERF: tabela do laudo |
| Contexto | código, app, nome, tipo | CATERF: rodovia da fiscalização |
| Modo | código, app, nome, tipo (`lista` / `avulso`) | fiscalização: vistoria por unidade; CATERF: ocorrência |
| Alcance do aparelho | app, função (usuário → câmaras e versões a mais) | fiscalização (K8) |

## Relações com outros apps

```text
core.CamaraTecnica ← ModeloCatalogo ← VersaoModelo
core.CamaraTecnica ← Catalogo → ModeloCatalogo; Catalogo → core.Servico (muitos)
Catalogo ← Item ← VersaoItem → VersaoModelo
fiscalizacao.RegistroCampo ··· catalogo_id, item_versao_id (por consulta)
fiscalizacao.Resposta ··· item_versao_id (por consulta)
```
