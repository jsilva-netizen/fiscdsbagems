# Feature Specification: Módulo tramitação de documentos e dados

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-10-01

**Status**: Draft

**Input**: Spec do módulo `tramitacao` da spec 003, 10º e último na ordem, escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. É **funcionalidade nova**: o sistema atual
não tem nada dela, e o módulo não tem objetos no catálogo. Fontes:
- as decisões do responsável de 2026-10-01, que fecham a pergunta aberta desde a avaliação inicial
  ("tramitação já existe hoje ou é nova?");
- as specs 004 (core), 011 (processo sancionador) e 012 (portal);
- a constituição v2.6.2.

Decisões do responsável (2026-10-01):
- a tramitação cobre quatro usos: troca de documentos com as entidades, pedidos de dados às
  entidades, movimentação interna e integração com outro sistema;
- o sistema externo é o **e-MS**, o protocolo eletrônico oficial do Estado; **o e-MS continua sendo
  o oficial**: o sistema novo guarda o número do processo no e-MS e envia ou recebe documentos dele;
- a movimentação interna no sistema novo é só do que é dele;
- o e-MS tem API;
- os pedidos de dados podem ser pontuais ou periódicos, com formato definido e validação;
- no futuro, dados serão puxados por API direto dos sistemas das concessionárias.

## Contexto

Hoje a AGEMS troca documentos com as entidades por ofício, e-mail e e-MS, e pede dados (relatórios,
indicadores, planilhas) da mesma forma. A resposta chega por esses canais, e o controle de prazo e
de quem respondeu fica fora do sistema. Dentro da agência, os documentos circulam pelo e-MS.

No sistema novo, a tramitação é um **app comum** que reúne esses usos num conceito, o
**expediente**: um assunto com documentos, origem, destino, prazo e histórico. Tipos de expediente:

| Tipo | Sentido | Exemplo |
|---|---|---|
| comunicação à entidade | AGEMS → entidade | ofício pedindo esclarecimentos, com prazo de resposta |
| documento da entidade | entidade → AGEMS | entidade protocola um plano, uma justificativa, um pedido |
| pedido de dados | AGEMS → entidade, com formato | planilha de indicadores, pontual ou mensal |
| despacho interno | unidade → unidade da AGEMS | câmara encaminha um expediente à diretoria |

A entidade age pelo portal, que recebe as páginas da tramitação por registro (R-portal-008). Os
avisos vão pela central de avisos do core. O e-MS é o oficial: o expediente guarda o número do
processo e-MS e, quando preciso, protocola nele os documentos ou importa documentos dele, pela API.

O app não tem nada de câmara: os tipos de expediente e os formatos dos pedidos de dados são
configurados na tela pelas unidades.

Fica fora desta spec:
- o processo sancionador, que tem o próprio fluxo com a entidade (spec 011);
- a substituição do e-MS;
- a coleta automática por API dos sistemas das concessionárias, que fica só preparada
  (R-tramitacao-006);
- a assinatura eletrônica no sistema, que é melhoria futura.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enviar uma comunicação à entidade e receber a resposta (Priority: P1)

O fiscal da câmara cria um expediente para a entidade, com assunto, texto, documentos anexos e prazo
de resposta, e o envia. Os usuários da entidade são avisados, abrem no portal (a abertura fica
registrada como ciência) e respondem com texto e documentos. A câmara vê a resposta, se chegou no
prazo, e encerra o expediente.

**Why this priority**: é o uso mais frequente e hoje não tem controle de prazo nem de ciência.

**Independent Test**: a CATESA envia, em 02/03, um pedido de esclarecimento com prazo de 15 dias à
entidade A. O primeiro usuário da entidade abre em 03/03, e o expediente mostra "ciência em
03/03". A entidade responde em 16/03 com 2 PDFs, e o expediente mostra "respondido no prazo". A
entidade B não vê nada.

**Acceptance Scenarios**:

1. **Given** um expediente enviado, **When** um usuário da entidade o abre no portal pela primeira
   vez, **Then** o sistema registra a ciência, com o usuário e a hora do servidor.
2. **Given** um prazo vencido sem resposta, **When** a rotina diária roda, **Then** a câmara recebe um
   aviso, e o expediente aparece como "prazo vencido".
3. **Given** um expediente enviado, **When** a câmara tenta alterar o texto ou um documento enviado,
   **Then** o sistema recusa; correções vão num complemento, que entra no histórico.

---

### User Story 2 - Pedir dados com formato definido (Priority: P1)

A câmara configura um formato de dados (campos com tipo, ou planilha modelo com colunas) e cria um
pedido pontual ou periódico (mensal, trimestral, anual) para uma ou mais entidades. A cada período,
o sistema abre o pedido de cada entidade e avisa. A entidade baixa o modelo, preenche e envia; o
sistema valida e recusa o que não cumpre o formato, mostrando linha e motivo. A câmara vê quem
enviou, quem está atrasado e consulta os dados recebidos.

**Why this priority**: os dados periódicos das entidades são base da regulação, e hoje chegam sem
padrão nem controle.

**Independent Test**: a câmara cria o formato "Indicadores operacionais" com 5 campos e um pedido
mensal para 3 entidades, com prazo no dia 10. Em 1º de abril, abrem-se 3 pedidos de março. A entidade
A envia uma planilha com um valor negativo num campo "não negativo": o envio é recusado, mostrando a
linha. Ela corrige e envia em 08/04. No dia 11, a entidade C, que não enviou, aparece como atrasada,
e a câmara é avisada.

**Acceptance Scenarios**:

1. **Given** um pedido periódico, **When** começa um novo período, **Then** o sistema abre o pedido
   do período para cada entidade, uma vez só.
2. **Given** um envio que não cumpre o formato, **When** a entidade envia, **Then** nada é gravado
   como recebido, e a entidade vê cada erro com linha, campo e motivo.
3. **Given** um envio aceito, **When** a entidade envia de novo no mesmo período, **Then** o novo
   envio passa a valer, e o anterior fica no histórico.

---

### User Story 3 - A entidade protocola um documento à AGEMS (Priority: P2)

O usuário da entidade abre um expediente no portal, escolhe a unidade de destino (câmara ou
diretoria), o assunto e anexa os documentos. O sistema dá o número de protocolo e o comprovante. A
unidade de destino é avisada e trata o expediente.

**Why this priority**: completa a troca nos dois sentidos.

**Independent Test**: a entidade A protocola "Plano de ação" para a CATESA às 18h40 de 05/05 e
recebe o comprovante com o número e a hora do servidor; a CATESA vê o expediente na caixa dela, e a
CATERS não.

**Acceptance Scenarios**:

1. **Given** um protocolo feito, **When** a entidade baixa o comprovante, **Then** ele traz número,
   data e hora do servidor, assunto, destino, lista de documentos e o checksum de cada um.

---

### User Story 4 - Movimentação interna (Priority: P2)

Uma unidade encaminha um expediente a outra (da câmara à diretoria, da diretoria a uma área), com um
despacho. A unidade de destino passa a ser a responsável, registra ciência e age. O histórico mostra
cada movimentação.

**Why this priority**: o expediente precisa chegar a quem decide, dentro do sistema, sem voltar ao
e-mail.

**Independent Test**: a CATESA encaminha à DSB o protocolo da entidade A com o despacho "para
ciência e decisão"; a DSB vê o expediente na caixa dela, registra ciência e devolve à CATESA com
"ciente; responder no prazo"; a linha do tempo mostra as duas movimentações.

**Acceptance Scenarios**:

1. **Given** um expediente encaminhado, **When** um usuário da unidade de origem tenta agir nele,
   **Then** só a leitura continua possível.

---

### User Story 5 - Ligar o expediente ao e-MS (Priority: P2)

O expediente guarda o número do processo no e-MS. Quando é preciso protocolar oficialmente, o
usuário envia os documentos do expediente ao processo do e-MS (ou abre o processo lá), e o sistema
registra o número e o resultado. Também é possível trazer documentos e andamentos do processo e-MS
para o expediente.

**Why this priority**: o e-MS é o oficial; sem a ligação, a equipe faria o trabalho duas vezes.

**Independent Test**: com a API do e-MS em homologação, o usuário envia ao processo
"51.011.137-2025" os 2 documentos do expediente; o expediente mostra "enviado ao e-MS em 06/05,
14h02", com o retorno do e-MS. Com o e-MS fora do ar, o envio fica na fila, o usuário é avisado e
o trabalho no sistema continua.

**Acceptance Scenarios**:

1. **Given** o e-MS indisponível, **When** o usuário envia documentos, **Then** o pedido fica
   pendente, é refeito automaticamente e avisa o resultado.
2. **Given** um número de processo e-MS, **When** o usuário pede os andamentos, **Then** eles
   aparecem no expediente, marcados como vindos do e-MS.

---

### User Story 6 - Acompanhar prazos e caixas (Priority: P2)

Cada unidade tem a sua caixa de expedientes: a responder, aguardando a entidade, vencidos, pedidos de
dados por período. O diretor vê as caixas das unidades da sua diretoria.

**Why this priority**: controle de prazo é o ganho principal sobre o e-mail.

**Independent Test**: a caixa da CATESA mostra 3 expedientes aguardando a entidade, 1 vencido e o
quadro de março do pedido mensal (2 de 3 recebidos); o diretor da DSB vê as caixas da CATESA e da
CATERS, só para leitura.

**Acceptance Scenarios**:

1. **Given** um usuário da CATERS, **When** abre a caixa, **Then** não vê expedientes da CATESA.

---

### Edge Cases

- **Expediente para várias entidades**: vira um expediente por entidade, com o mesmo conteúdo e
  prazos e respostas separados.
- **Entidade sem usuário ativo no portal**: o envio é recusado com o motivo; a câmara pode
  registrar o envio por outro meio (ofício, e-MS) e anexar o comprovante.
- **Pedido periódico alterado no meio do ano**: o formato novo vale para os próximos períodos; os
  já abertos continuam com o formato com que foram abertos.
- **Envio de dados depois do prazo**: é aceito e marcado como fora do prazo.
- **Formato de dados retirado**: pedidos e dados já recebidos continuam legíveis.
- **e-MS recusa um documento** (tamanho, tipo): o retorno fica no expediente, e o usuário é avisado.
- **Expediente ligado a outro registro do sistema** (fiscalização, processo sancionador, viagem do
  planejamento): a ligação é só de leitura; o expediente não altera o registro.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O app MUST manter expedientes com tipo, assunto, origem, destino, documentos, prazo,
  situação e histórico (R-tramitacao-002).
- **FR-002**: Envio, ciência, resposta, protocolo e envio de dados MUST ter data e hora do servidor,
  autor e comprovante (R-tramitacao-003, R-tramitacao-004).
- **FR-003**: Documentos enviados MUST NOT ser alterados nem apagados; correções entram como
  complemento (R-tramitacao-008).
- **FR-004**: Pedidos de dados MUST seguir um formato configurado, validado em cada envio, com os
  erros por linha e campo (R-tramitacao-005).
- **FR-005**: Pedidos periódicos MUST abrir o pedido de cada período e entidade uma vez só, e avisar
  os atrasos (R-tramitacao-005).
- **FR-006**: A movimentação interna MUST registrar origem, destino, despacho, autor e data
  (R-tramitacao-007).
- **FR-007**: O expediente MUST guardar o número do processo e-MS e MUST poder enviar documentos ao
  e-MS e trazer documentos e andamentos dele, sem bloquear o trabalho quando o e-MS estiver fora
  (R-tramitacao-009).
- **FR-008**: A entidade MUST alcançar só os expedientes dela, pelo portal; cada unidade, só os da
  sua caixa (R-tramitacao-010).
- **FR-009**: O app MUST NOT conter nada de câmara e MUST NOT gravar em modelos de outros apps
  (R-tramitacao-001, R-tramitacao-012).
- **FR-010**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Expediente**: número de protocolo, tipo, assunto, texto, entidade (quando houver), unidade
  responsável, prazo, situação, número do processo e-MS, registros ligados, histórico.
- **Tipo de expediente**: configuração por unidade (nome, sentido, prazo padrão, se exige resposta).
- **Documento do expediente**: arquivo com tipo, autor, data, checksum; nunca alterado.
- **Formato de dados**: campos tipados ou colunas de planilha, regras de validação, planilha modelo,
  versões.
- **Pedido de dados**: formato, entidades, periodicidade (pontual ou recorrente), prazo; abre um
  **pedido do período** por entidade.
- **Envio de dados**: o que a entidade enviou num pedido do período, com a validação, os valores
  aceitos e o histórico de reenvios.
- **Movimentação**: passagem do expediente de uma unidade a outra, com despacho.
- **Operação no e-MS**: envio de documentos, abertura de processo ou consulta de andamentos, com
  pedido, retorno, situação e tentativas.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. O módulo não tem objetos no
catálogo: todas as regras são funcionalidade nova.

### R-tramitacao-001 — App comum, configurado pelas unidades

- **Comportamento desejado**: a tramitação é um app comum, usado por qualquer unidade da AGEMS
  (câmaras, diretorias e as áreas cadastradas no core, R-core-023). Não tem tipo de expediente,
  formato de dados, texto ou regra de nenhuma câmara: cada unidade configura na tela os seus tipos
  de expediente (nome, sentido, prazo padrão, se exige resposta) e os seus formatos de dados, e pode
  copiar a configuração de outra unidade (constituição v2.6.1).
- **Comportamento atual**: não existe.
- **Motivo da diferença**: decisão do responsável (2026-10-01); constituição v2.6.0 a v2.6.2.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-tramitacao-002 — Expediente

- **Comportamento desejado**: o expediente é a unidade da tramitação. Ele tem:
  - número de protocolo, atribuído pelo servidor na abertura, sequencial por ano e único;
  - tipo e assunto;
  - texto;
  - entidade, quando envolve uma;
  - unidade responsável;
  - prazo, quando exige resposta;
  - número do processo e-MS, opcional;
  - registros ligados de outros apps (fiscalização, processo sancionador, viagem do planejamento),
    só para leitura;
  - documentos e linha do tempo.

  A situação é calculada: rascunho, enviado, aguardando resposta, prazo vencido, respondido,
  encerrado ou cancelado. Encerrar e cancelar pedem motivo, e o expediente encerrado só é lido.
- **Comportamento atual**: não existe; a troca é feita por ofício, e-mail e e-MS.
- **Motivo da diferença**: decisão do responsável (2026-10-01).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-tramitacao-003 — Troca com a entidade

- **Comportamento desejado**: a unidade envia o expediente à entidade. Os usuários ativos da entidade
  recebem o aviso pela central do core e o veem no portal. A primeira abertura por um usuário da
  entidade registra a **ciência**. A entidade responde com texto e documentos: o servidor grava a
  data, o autor e se chegou no prazo. A unidade pode pedir complemento (novo prazo, no mesmo
  expediente) ou encerrar. Expediente para várias entidades vira um por entidade. A entidade sem
  usuário ativo não recebe pelo portal: o envio é recusado com o motivo, e a unidade pode registrar o
  envio por outro meio, com o comprovante anexado.
- **Comportamento atual**: não existe.
- **Motivo da diferença**: decisão do responsável (2026-10-01): troca com as entidades, com
  protocolo, comprovante e prazo.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-tramitacao-004 — Protocolo pela entidade

- **Comportamento desejado**: o usuário da entidade abre, no portal, um expediente para uma unidade da
  AGEMS (câmara ou diretoria), com assunto, texto e documentos. O servidor atribui o número de
  protocolo e gera o **comprovante**: número, data e hora, assunto, destino, documentos e checksum de
  cada um. A unidade de destino é avisada e passa a ser a responsável.
- **Comportamento atual**: não existe.
- **Motivo da diferença**: decisão do responsável (2026-10-01): troca nos dois sentidos.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-tramitacao-005 — Pedidos de dados

- **Comportamento desejado**:
  - **Formato de dados**: a unidade monta na tela o formato, com campos tipados (texto, número,
    número não negativo, data, lista de valores, sim/não, arquivo), obrigatoriedade, faixas de valor
    e a planilha modelo. O formato tem versões: mudar vale para pedidos abertos depois.
  - **Pedido**: tem formato, entidades, prazo e periodicidade. O pontual tem data-limite. O
    periódico é mensal, trimestral, semestral ou anual, com o dia do prazo depois do fim do período.
  - **Pedido do período**: o sistema abre um por entidade e período, uma vez só, no início do período
    seguinte, e avisa a entidade.
  - **Envio**: a entidade envia pelo portal, preenchendo os campos ou a planilha modelo. O sistema
    valida tudo antes de aceitar e, se houver erro, não grava nada e mostra cada erro com linha,
    campo e motivo. O envio aceito guarda os valores estruturados, a data e a pontualidade. Um novo
    envio no mesmo período substitui o anterior, que fica no histórico.
  - **Acompanhamento**: quadro por período (recebidos, pendentes, atrasados), avisos de atraso à
    unidade e de lembrete à entidade.
  - **Consulta**: dados recebidos por entidade e período, exportáveis em planilha, e disponíveis aos
    outros apps por consulta.
- **Comportamento atual**: não existe; os dados chegam por e-mail e planilhas sem padrão.
- **Motivo da diferença**: decisão do responsável (2026-10-01): pedidos pontuais e periódicos, com
  formato definido e validação.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-tramitacao-006 — Coleta por API dos sistemas das entidades (preparada)

- **Comportamento desejado**: o pedido de dados tem um **canal**: portal (hoje) ou integração. O
  canal integração é uma peça plugável, um conector por sistema de entidade, que puxa os dados do
  período, aplica a mesma validação do formato e registra o envio como se fosse da entidade, marcado
  como automático. Esta spec não entrega nenhum conector: só deixa o lugar pronto, para que os
  conectores entrem depois sem mudar o app.
- **Comportamento atual**: não existe.
- **Motivo da diferença**: decisão do responsável (2026-10-01): no futuro, puxar dados direto dos
  sistemas das concessionárias.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-tramitacao-007 — Movimentação interna

- **Comportamento desejado**: a unidade responsável encaminha o expediente a outra unidade, com um
  despacho. A unidade de destino passa a ser a responsável e registra ciência. A unidade de origem
  continua lendo o expediente. Cada movimentação entra na linha do tempo. A movimentação interna é
  só dos expedientes da tramitação: o processo sancionador tem as movimentações dele (spec 011), e o
  que corre no e-MS fica no e-MS.
- **Comportamento atual**: não existe; a circulação interna é feita no e-MS.
- **Motivo da diferença**: decisão do responsável (2026-10-01): movimentação interna no sistema novo,
  só do que é dele, com o e-MS como oficial.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-tramitacao-008 — Documentos e linha do tempo

- **Comportamento desejado**: os documentos do expediente:
  - são PDF, imagem ou planilha, até 20 MB;
  - ficam no repositório privado, com checksum, autor e data;
  - são entregues por endereço assinado, depois da verificação de acesso.

  Documento enviado não é alterado nem apagado: correções entram como complemento. A linha do tempo
  é imutável e registra criação, envio, ciência, respostas, complementos, movimentações, operações no
  e-MS, encerramento e cancelamento, com autor e data.
- **Comportamento atual**: não existe.
- **Motivo da diferença**: rastro de comunicação oficial (Princípio I); A-016 (arquivos só com
  acesso verificado).
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: A-016 (por analogia).

### R-tramitacao-009 — Integração com o e-MS

- **Comportamento desejado**: o e-MS é o protocolo oficial. O expediente guarda o número do processo
  e-MS. Pela API do e-MS, o usuário da unidade responsável pode:
  - enviar documentos do expediente a um processo e-MS;
  - abrir um processo no e-MS a partir do expediente, quando a API permitir;
  - trazer documentos e andamentos do processo e-MS para o expediente, marcados como vindos do
    e-MS.

  Cada operação é registrada, com pedido, retorno, situação e tentativas. Com o e-MS fora do ar, a
  operação fica pendente, é refeita automaticamente e avisa o resultado: o trabalho no sistema não
  para. A credencial de acesso ao e-MS é do sistema, guardada como segredo, e nunca aparece na tela
  nem nos registros. A integração é uma peça trocável, para o app não depender dos detalhes da API.
- **Comportamento atual**: não existe; a equipe trabalha no e-MS à parte.
- **Motivo da diferença**: decisão do responsável (2026-10-01): o e-MS é o oficial e tem API.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: decisão do responsável, 2026-10-01.

### R-tramitacao-010 — Quem alcança o quê

- **Comportamento desejado**:

  | Perfil | Alcance |
  |---|---|
  | usuários de uma unidade (câmara, diretoria, área) | expedientes de que a unidade é ou foi responsável; agem só nos de que é a responsável atual |
  | diretor | expedientes das unidades da sua diretoria, só leitura (R-core-012) |
  | administrador | tudo |
  | entidade | pelo portal, os expedientes e pedidos dela, depois de enviados; os que ela protocolou |

  A verificação vale para qualquer caminho, inclusive documentos, dados recebidos e consultas de
  outros apps.
- **Comportamento atual**: não existe.
- **Motivo da diferença**: isolamento por unidade (A-026, por analogia) e Princípio III.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: A-026 (por analogia).

### R-tramitacao-011 — Caixas, prazos e avisos

- **Comportamento desejado**: cada unidade tem a sua caixa: a responder, aguardando a entidade,
  vencidos, encaminhados recebidos e o quadro dos pedidos de dados por período. Os prazos são
  calculados no servidor, no fuso de MS, contando o último dia. Avisos pela central do core, com
  e-mail conforme a preferência:
  - à entidade: expediente recebido, pedido aberto, lembrete antes do prazo;
  - à unidade: resposta recebida, protocolo novo, encaminhamento recebido, prazo vencido, operação
    no e-MS concluída ou recusada.

  Uma rotina diária avisa os prazos, um aviso por prazo.
- **Comportamento atual**: não existe.
- **Motivo da diferença**: R-core-026; controle de prazo.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: R-core-026.

### R-tramitacao-012 — Relação com os outros apps

- **Comportamento desejado**: a tramitação é o último app da ordem. Ela:
  - lê os apps anteriores pelas consultas deles, para ligar o expediente a registros (fiscalização,
    processo sancionador, viagem do planejamento) e mostrar um resumo;
  - registra no portal as suas páginas e cartões (R-portal-008) e no core as telas e os avisos
    (R-core-025, R-core-026);
  - oferece consultas dos dados recebidos e dos expedientes, para painéis e apps futuros;
  - nunca grava em modelo de outro app; um teste falha se gravar.
- **Comportamento atual**: não existe.
- **Motivo da diferença**: constituição, "Todo dado tem um app dono" e "Independência entre apps".
- **Objetos do catálogo**: — (contrato entre apps)
- **Origem**: constituição v2.5.0.

## Telas do sistema atual

O sistema atual não tem telas de tramitação. Ações novas:

| Ação | Regra |
|---|---|
| Configurar tipos de expediente e formatos de dados da unidade; copiar de outra unidade | R-tramitacao-001, R-tramitacao-005 |
| Criar, enviar, encerrar e cancelar expediente; anexar documentos; pedir complemento | R-tramitacao-002, R-tramitacao-003, R-tramitacao-008 |
| Portal: ver expediente, responder, protocolar documento, baixar comprovante | R-tramitacao-003, R-tramitacao-004 |
| Criar pedido de dados pontual ou periódico; acompanhar o quadro por período; consultar e exportar os dados | R-tramitacao-005 |
| Portal: baixar a planilha modelo, preencher ou enviar dados, ver os erros de validação | R-tramitacao-005 |
| Encaminhar expediente a outra unidade com despacho | R-tramitacao-007 |
| Ligar ao processo e-MS; enviar documentos; trazer documentos e andamentos | R-tramitacao-009 |
| Caixa da unidade e caixas da diretoria | R-tramitacao-011 |

## Migração

Não há dados a migrar: o módulo não existe no sistema atual e não tem objetos no catálogo nem mapa de
migração. Expedientes antigos do e-MS não são importados; um expediente novo pode apontar para um
processo e-MS existente pelo número.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos envios, ciências, respostas, protocolos e envios de dados têm data e hora do
  servidor, autor e comprovante.
- **SC-002**: 0 envios de dados fora do formato são aceitos; 100% dos erros mostram linha, campo e
  motivo.
- **SC-003**: Em um ano de pedidos mensais para 20 entidades, cada pedido do período é aberto
  exatamente uma vez (240 pedidos, 0 duplicados, 0 faltando).
- **SC-004**: Com o e-MS indisponível, 0 operações se perdem: todas ficam pendentes e são concluídas
  ou recusadas com aviso quando ele volta.
- **SC-005**: Em teste com duas unidades, um diretor e duas entidades, 0 expedientes, documentos ou
  dados fora do alcance são alcançados.
- **SC-006**: A unidade sabe, em menos de 1 minuto, quais entidades não enviaram os dados do período
  e quais expedientes estão vencidos.
- **SC-007**: O código do app cita 0 câmaras e grava 0 vezes em modelos de outros apps (verificado
  por teste).
- **SC-008**: 100% das regras de acesso deste módulo têm teste automatizado.

## Assumptions

- **Unidades internas**: câmaras e diretorias do core e as áreas que o core vier a cadastrar
  (R-core-023), como presidência, jurídico ou ouvidoria.
- **Assinatura**: documentos assinados fora do sistema e anexados; assinatura eletrônica no sistema
  é melhoria futura.
- **Sem uso sem rede**: trabalho de escritório e do portal.
- **Prazos**: dias corridos, fuso de MS, último dia incluído; dias úteis ficam para depois, se
  pedidos.
- **Questões em aberto** (a resolver antes do plano da integração com o e-MS):
  - **Q1**: a documentação da API do e-MS: operações disponíveis (enviar documento, abrir processo,
    consultar andamentos, baixar documentos), autenticação, ambiente de homologação, limites e quem
    é o titular da credencial.
  - **Q2**: o número oficial dos ofícios da AGEMS é dado pelo e-MS ou por uma numeração da unidade
    que o sistema novo deve manter.
