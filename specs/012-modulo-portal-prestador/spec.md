# Feature Specification: Módulo portal do prestador — a área da entidade regulada

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-10-01

**Status**: Draft

**Input**: Spec do módulo `portal_prestador` da spec 003, 9º na ordem, escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes:
- o catálogo da spec 003: 2 funções, 9 políticas e 8 privilégios;
- os achados A-016, A-023, A-027, A-034 e A-038;
- as telas do portal no sistema atual;
- as specs 004 (core), 006 (planejamento), 007 (fiscalização) e 011 (processo sancionador);
- a constituição v2.6.2.

## Contexto

O portal é a parte do sistema usada pelas **entidades reguladas** (prestadores de serviço,
concessionárias, autarquias municipais). Hoje ele tem duas abas e uma tela de resposta:
- **Termos de notificação**: o prestador assina o TN, responde cada determinação com manifestação
  e evidências e envia o termo de envio. Ele vê as fotos da fiscalização.
- **Autos de infração**: o prestador vê os autos das remessas, envia o AI assinado e a defesa (texto,
  anexos e ofício).

O sistema atual tem defeitos no portal:
- a regra "o prestador só vê a fiscalização depois de notificado" existe, mas políticas antigas a
  anulam (A-027);
- as fotos ficam num repositório público;
- o prestador pode alterar remessas de outra entidade (A-034);
- a defesa se perde (A-029);
- o AI assinado fica sem registro (A-018).

No sistema novo, o portal é um **app de composição**:
- **não tem dados próprios**: cada informação mostrada é de um app dono (processo sancionador,
  planejamento, fiscalização, core e os que vierem, como a tramitação e a cobrança);
- as **escritas da entidade** são feitas pelas rotas desses apps (spec 011, research N6). O portal
  tem as telas;
- é **dono da regra do termo**: a entidade só vê dados de uma fiscalização depois de receber o termo
  de notificação dela pelo portal;
- os apps posteriores (tramitação, cobrança) **acrescentam** as suas páginas e cartões ao portal por
  registro, sem que o portal os conheça (constituição v2.5.0).

Fica fora desta spec:
- o cadastro dos usuários da entidade (core, R-core-001, R-core-005);
- as regras do processo sancionador (spec 011);
- o que cada app futuro mostrará no portal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A entidade vê só o que é dela, depois de notificada (Priority: P1)

Um usuário da entidade entra no portal e vê os termos emitidos para ela, os autos, as fiscalizações
previstas e os avisos. Uma fiscalização da entidade sem termo emitido pelo portal não aparece de
jeito nenhum.

**Why this priority**: é a regra de segurança central do portal (A-027).

**Independent Test**: a entidade A tem duas fiscalizações finalizadas: uma com TN emitido pelo
portal, outra sem termo. O usuário da entidade A vê só a primeira, com unidades, NCs, determinações e
fotos. Pedir a segunda pelo endereço responde "não encontrado". O usuário da entidade B não vê
nenhuma das duas.

**Acceptance Scenarios**:

1. **Given** uma fiscalização sem termo, **When** a entidade pede qualquer dado dela, **Then** o
   sistema responde como se não existisse.
2. **Given** um termo em fluxo manual, **When** a entidade abre o portal, **Then** ele não aparece.
3. **Given** um usuário desativado, **When** tenta entrar, **Then** o acesso é recusado.

---

### User Story 2 - Responder o termo e acompanhar o processo (Priority: P1)

O usuário da entidade abre o termo, baixa o TN e o relatório, envia o TN assinado e vê o prazo
calculado pelo servidor. Ele responde cada determinação vendo a unidade, a NC, a constatação e as
fotos, anexa evidências, conclui com o termo de envio e depois acompanha a análise, a AM, os autos,
a defesa, o parecer e a decisão final.

**Why this priority**: é o uso principal do portal hoje.

**Independent Test**: o usuário envia o TN assinado em 10/03 e vê "prazo até 09/04". Ele responde 4
determinações em dois dias, salvando rascunho, e conclui em 08/04. Na mesma tela vê "respondido no
prazo" e, depois, a AM com o resultado de cada determinação.

**Acceptance Scenarios**:

1. **Given** um termo aguardando assinatura, **When** o usuário abre o termo, **Then** vê o que
   falta (enviar o TN assinado) e o botão para isso.
2. **Given** uma resposta enviada e já analisada, **When** o usuário tenta mudá-la, **Then** a tela
   não oferece a ação, e o app dono recusa se for pedida.
3. **Given** dois usuários da mesma entidade, **When** um salva o rascunho, **Then** o outro vê o
   rascunho atualizado e quem salvou por último.

---

### User Story 3 - Autos e defesa (Priority: P1)

O usuário vê os autos da remessa, com número, descrição, pena base e prazo de defesa. Ele registra o
recebimento enviando o AI assinado de cada auto e apresenta a defesa de cada auto (texto, anexos),
enviada de uma vez para a remessa com o ofício de envio, até o
prazo.

**Why this priority**: hoje a defesa se perde (A-029).

**Independent Test**: com uma remessa de 2 autos, o usuário envia os 2 AIs assinados, e o portal
mostra "recebida em 05/05, defesa até 04/06". Ele escreve a defesa dos 2 autos, anexa o ofício e
envia; o portal mostra "defesa enviada em 20/05, no prazo".

**Acceptance Scenarios**:

1. **Given** uma remessa enviada, **When** o usuário tenta registrar o recebimento sem todos os AIs
   assinados, **Then** o portal mostra quais faltam.
2. **Given** uma remessa de outra entidade, **When** o usuário pede o endereço dela, **Then** o
   sistema responde "não encontrado".
3. **Given** uma remessa recebida com um auto sem defesa, **When** o usuário tenta enviar a defesa,
   **Then** o portal mostra o auto que falta e não envia.

---

### User Story 4 - Avisos e fiscalizações previstas (Priority: P2)

O usuário recebe no portal, e por e-mail conforme a preferência dele, os avisos da entidade: termo
emitido, prazo próximo do fim, remessa enviada, decisão final. Também vê as fiscalizações previstas
para a entidade no planejamento aprovado (objeto e período).

**Why this priority**: hoje a entidade só sabe de um termo se entrar no portal.

**Independent Test**: ao emitir um TN, os 3 usuários da entidade recebem o aviso; um deles desligou
o e-mail e recebe só no portal. A atividade prevista para julho aparece no portal; a marcada como
escondida pela câmara, não.

**Acceptance Scenarios**:

1. **Given** um prazo de resposta que vence em 5 dias, **When** a rotina diária roda, **Then** os
   usuários da entidade recebem um aviso, uma vez por prazo.
2. **Given** uma atividade prevista escondida, **When** a entidade abre as previstas, **Then** ela
   não aparece (R-planejamento-019).

---

### User Story 5 - Apps futuros entram no portal sem mudá-lo (Priority: P3)

Um app posterior (tramitação, cobrança) registra uma página e um cartão no início do portal, com os
dados dele e as regras de acesso dele, e eles aparecem para a entidade sem mudança no portal.

**Why this priority**: o portal precisa receber os pedidos de dados e os expedientes da tramitação
(spec 013) e, depois, a cobrança.

**Independent Test**: um app de teste registra o cartão "Pedidos pendentes" com uma contagem; ele
aparece no início do portal só para as entidades que o app alcança.

**Acceptance Scenarios**:

1. **Given** um app registrado, **When** é retirado, **Then** o portal continua funcionando sem a
   página dele.

---

### Edge Cases

- **Entidade com termo cancelado**: o termo aparece como cancelado, com o motivo; a fiscalização
  continua visível, porque a entidade já foi notificada dela.
- **Fiscalização reaberta depois do termo**: a entidade continua vendo o conteúdo notificado
  (retrato do TN, spec 011 N4), não a versão em edição.
- **Usuário vinculado a outra entidade depois** (troca de vínculo pelo admin): passa a ver só a nova
  entidade; o histórico de quem fez o quê continua com o nome dele.
- **Arquivo grande pelo celular**: o envio mostra o progresso e o limite (20 MB) antes de começar.
- **Sem rede**: o portal avisa e não grava nada pela metade.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O portal MUST mostrar à entidade só dados da própria entidade (R-portal-002).
- **FR-002**: Dados de uma fiscalização MUST ficar invisíveis à entidade até a emissão, pelo portal,
  de um termo dela (R-portal-003).
- **FR-003**: O portal MUST NOT ter dados próprios; toda escrita da entidade MUST passar pelo app
  dono do dado (R-portal-001).
- **FR-004**: Fotos e documentos MUST ser entregues só por endereço assinado, depois da verificação
  de acesso (R-portal-007).
- **FR-005**: Os prazos e as situações mostrados MUST ser os calculados pelos apps donos
  (R-portal-004, R-portal-005).
- **FR-006**: Apps posteriores MUST poder acrescentar páginas e cartões ao portal por registro, sem
  mudar o portal (R-portal-008).
- **FR-007**: A entidade MUST receber os avisos pela central de avisos do core (R-portal-006).
- **FR-008**: Toda regra de acesso deste módulo MUST ter teste automatizado que falhe quando a regra
  for violada (constituição, Princípio III).

### Key Entities

- **Usuário da entidade**: usuário com o papel prestador e o vínculo a uma entidade (core); uma
  entidade tem vários.
- **Contribuição ao portal**: página, cartão do início ou item de menu registrado por um app, com a
  consulta que fornece os dados e a regra de acesso do app.

O portal não tem entidades próprias de dados.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. As chaves citadas estão no catálogo
da spec 003.

### R-portal-001 — Portal como composição, sem dados próprios

- **Comportamento desejado**: o portal é a área da entidade. Ele mostra o que os apps donos oferecem
  à entidade, pelas consultas deles, e chama as rotas de escrita deles para as ações dela (TN
  assinado, respostas, evidências, termo de envio, recebimento da remessa, AI assinado, defesa,
  spec 011). O portal não grava em modelo de nenhum app; um teste falha se gravar.
- **Comportamento atual**: as telas do portal leem e gravam direto nas tabelas do termo, das
  respostas, dos autos e das remessas, limitadas pelas políticas do banco.
- **Motivo da diferença**: constituição, "Todo dado tem um app dono"; A-034.
- **Objetos do catálogo**: `politica:public.respostas_determinacao.respostas_det_prestador_insert`,
  `politica:public.respostas_determinacao.respostas_det_prestador_update`
- **Origem**: constituição v2.4.0.

### R-portal-002 — Quem entra e o que alcança

- **Comportamento desejado**: entra no portal o usuário com papel prestador, ativo, vinculado a uma
  entidade (um único vínculo, perfil → entidade, A-023). Uma entidade tem vários usuários. O
  administrador cria as contas (R-core-001), e o usuário confirma a identidade por código no
  e-mail no primeiro acesso e em aparelho novo (R-core-005, A-038). O usuário alcança só os dados
  da própria entidade, em qualquer caminho. Usuário desativado ou sem entidade não entra. O portal
  é a única área desse papel: as telas da equipe não são oferecidas a ele.
- **Comportamento atual**:
  - o vínculo é gravado no perfil e na entidade, em passos separados;
  - o prestador entra pelo cadastro e aprovação;
  - uma regra de rotas no navegador o limita às duas telas do portal;
  - com a migration 137, prestador inativo fica sem entidade.
- **Motivo da diferença**: A-023, A-038; o limite das telas passa a ser do servidor, não só do
  navegador.
- **Objetos do catálogo**: `funcao:can_access_fiscalizacao(fiscalizacao uuid)`
- **Origem**: A-023, A-038 (decididos).

### R-portal-003 — A entidade só vê a fiscalização depois do termo

- **Comportamento desejado**: a entidade vê os dados de uma fiscalização só depois que um termo de
  notificação dela foi **emitido pelo portal** para a entidade (spec 011, R-sancionador-004). A partir
  daí, ela vê, da fiscalização:
  - o que foi notificado (retrato do TN: unidades, NCs, constatações e determinações);
  - as recomendações;
  - as fotos;
  - o relatório anexado ao TN.

  Antes disso, a fiscalização não existe para ela, nem como contagem. Termo em fluxo manual não
  libera nada no portal. Termo cancelado continua liberando o que já foi notificado. A regra vale
  para qualquer caminho: telas, documentos, fotos e consultas.
- **Comportamento atual**:
  - as funções de acesso exigem o termo;
  - políticas antigas, somadas a elas, liberam as unidades, NCs, constatações, determinações,
    recomendações e respostas de qualquer fiscalização da entidade, mesmo sem termo;
  - a fiscalização em si fica visível antes do termo.
- **Motivo da diferença**: A-027.
- **Objetos do catálogo**: `funcao:can_access_fiscalizacao(fiscalizacao uuid)`,
  `funcao:can_access_unidade(unidade uuid)`,
  `politica:public.unidades_fiscalizadas.unidades_prestador_select`,
  `politica:public.respostas_checklist.respostas_checklist_prestador_select`,
  `politica:public.nao_conformidades.ncs_prestador_select`,
  `politica:public.constatacoes_manuais.constatacoes_prestador_select`,
  `politica:public.determinacoes.determinacoes_prestador_select`,
  `politica:public.recomendacoes.recomendacoes_prestador_select`,
  `politica:public.respostas_determinacao.respostas_det_prestador_select`
- **Origem**: A-027 (decidido).

### R-portal-004 — Termos e respostas

- **Comportamento desejado**: o portal lista os termos emitidos para a entidade, com a situação
  calculada (aguardando assinatura, aguardando resposta, prazo vencido, respondido) e a data-limite.
  No termo, o usuário:
  - baixa o TN e o relatório;
  - envia o TN assinado;
  - responde cada determinação, vendo a unidade (endereço e coordenadas), a NC, a constatação, o
    prazo de cumprimento e as fotos;
  - salva rascunho ou envia a resposta; a enviada fica só para leitura;
  - anexa evidências;
  - baixa o modelo do termo de envio, liberado quando todas as determinações têm manifestação ou
    evidência, e anexa o termo assinado;
  - conclui a resposta, com confirmação; os rascunhos com conteúdo são enviados junto.

  A tela mostra o que falta para cada passo, e quem fez cada ação e quando. As ações seguem as
  regras do processo sancionador (R-sancionador-005, R-sancionador-006): o portal só as oferece
  quando cabem, e o app dono recusa se forem pedidas fora de hora.
- **Comportamento atual**:
  - a lista e a tela calculam a situação no navegador;
  - a resposta grava direto na tabela, com as restrições do gatilho do banco;
  - o modelo do termo de envio é montado no navegador, com texto fixo;
  - a identificação do relatório é montada com "DSB" fixo.
- **Motivo da diferença**: situação e prazos do servidor (A-014); nada de câmara no portal.
- **Objetos do catálogo**: `politica:public.respostas_determinacao.respostas_det_prestador_update`
- **Origem**: A-014 (decidido).

### R-portal-005 — Autos, defesa e decisão final

- **Comportamento desejado**: o portal mostra:
  - os autos da entidade, com número, determinação, descrição, pena base, situação e prazo de defesa;
  - a AM (número e documento assinado);
  - a remessa.

  O usuário envia o AI assinado de cada auto (o último registra o recebimento da remessa), salva o
  rascunho da defesa de cada auto (texto e anexos) e, com o ofício de envio anexado e todos os autos
  com defesa, envia a defesa da remessa inteira, com confirmação (R-sancionador-010,
  R-sancionador-011). O topo da aba mostra os autos por situação: total, aguardando recebimento
  (remessa enviada sem o AI assinado), aguardando defesa (remessa recebida) e defesa enviada. Depois do
  encaminhamento ao julgamento, ele vê o parecer técnico de cada auto. Depois da deliberação, vê a
  decisão final e a multa (R-sancionador-015).
- **Comportamento atual**:
  - a aba de autos lê as remessas e os itens e tem os mesmos contadores, calculados no navegador;
  - o envio do AI assinado procura um campo inexistente (A-018);
  - a defesa é gravada onde o prestador não tem permissão e se perde (A-029);
  - o recebimento e a defesa usam o relógio do aparelho.
- **Motivo da diferença**: A-018, A-029, A-034.
- **Objetos do catálogo**: — (telas sobre os registros da spec 011)
- **Origem**: A-018, A-029, A-034 (decididos).

### R-portal-006 — Início, avisos e fiscalizações previstas

- **Comportamento desejado**: o início do portal mostra:
  - cartões com o que pede ação: termos aguardando assinatura ou resposta, prazos próximos,
    remessas a receber, defesas em aberto;
  - os avisos da entidade, da central de avisos do core, com e-mail conforme a preferência de cada
    usuário (R-core-026);
  - as fiscalizações previstas no planejamento aprovado (R-planejamento-019).

  Os cartões vêm dos apps que se registram no portal (R-portal-008).
- **Comportamento atual**: o início tem contadores de termos por situação; não há avisos nem
  previstas.
- **Motivo da diferença**: R-core-026; R-planejamento-019.
- **Objetos do catálogo**: — (funcionalidade nova)
- **Origem**: specs 004 e 006.

### R-portal-007 — Fotos e documentos

- **Comportamento desejado**: fotos e documentos são entregues à entidade só por endereço assinado
  de curta duração, emitido pelo app dono depois da verificação da regra do termo (R-portal-003). As
  fotos são as versões com marca d'água. Os envios da entidade aceitam PDF ou imagem, até 20 MB,
  com o limite mostrado antes do envio.
- **Comportamento atual**: as fotos da fiscalização estão num repositório público, e a tela monta o
  endereço público; os documentos dos termos estão em repositórios que qualquer usuário ativo lê.
- **Motivo da diferença**: A-016.
- **Objetos do catálogo**: — (repositórios dos apps donos)
- **Origem**: A-016 (decidido).

### R-portal-008 — Apps acrescentam ao portal por registro

- **Comportamento desejado**: o portal oferece um registro de contribuições, como as telas do core
  (R-core-025):
  - páginas;
  - cartões do início;
  - itens de menu.

  Cada contribuição traz a consulta do app que a fornece e usa a regra de acesso dele. O processo
  sancionador e o planejamento registram as suas; a tramitação (spec 013) e o futuro módulo de
  cobrança registram as deles. Acrescentar ou retirar um app muda só o que ele registrou.
- **Comportamento atual**: as duas abas do portal estão fixas no código.
- **Motivo da diferença**: constituição v2.5.0, "Independência entre apps" (o portal vem antes da
  tramitação na ordem e não pode depender dela).
- **Objetos do catálogo**: — (composição de telas)
- **Origem**: constituição v2.5.0.

### R-portal-009 — O que não é levado

- **Comportamento desejado**: o sistema novo não tem as funções do banco que verificam o termo, as
  políticas do prestador nem os privilégios sem login: a regra do termo é aplicada pelo serviço do
  portal e pelas consultas dos apps donos, com teste.
- **Comportamento atual**: funções e políticas existem; parte delas não tem efeito por causa das
  políticas antigas.
- **Motivo da diferença**: A-005 (regras no serviço); A-027.
- **Objetos do catálogo**: `privilegio:can_access_fiscalizacao.PUBLIC`,
  `privilegio:can_access_fiscalizacao.anon`, `privilegio:can_access_fiscalizacao.authenticated`,
  `privilegio:can_access_fiscalizacao.service_role`, `privilegio:can_access_unidade.PUBLIC`,
  `privilegio:can_access_unidade.anon`, `privilegio:can_access_unidade.authenticated`,
  `privilegio:can_access_unidade.service_role`
- **Origem**: A-005, A-027 (decididos).

## Telas do sistema atual

### Início do portal (`src/pages/PortalPrestadorHome.jsx`, `src/components/portalPrestador/PortalPrestadorLayout.jsx`)

| Ação | Regra |
|---|---|
| Aba TNs: contadores por situação; lista dos termos publicados com município, RFP, determinações | R-portal-004, R-portal-006 |
| "Responder" (abre o termo) | R-portal-004 |
| Aba Autos de Infração: autos das remessas, RFP, TN, AM | R-portal-005 |
| Enviar AI assinado; registrar recebimento | R-portal-005 (regra: R-sancionador-010) |
| Defesa: texto, anexos, ofício de envio | R-portal-005 (regra: R-sancionador-011) |

### Responder termo (`src/pages/ResponderTermo.jsx`)

| Ação | Regra |
|---|---|
| Ver câmara, município, relatório, prazo máximo | R-portal-004 |
| Assinar o TN (enviar o assinado) | R-portal-004 (regra: R-sancionador-005) |
| Responder determinação: unidade, endereço, coordenadas, NC, constatação, manifestação, evidências | R-portal-003, R-portal-004 (regra: R-sancionador-006) |
| Termo de envio (concluir a resposta) | R-portal-004 (regra: R-sancionador-006) |
| Evidências da fiscalização (fotos por unidade) | R-portal-003, R-portal-007 |

### Restrição de rotas (`src/App.jsx`)

| Ação | Regra |
|---|---|
| Prestador só acessa o início do portal e a resposta do termo | R-portal-002 (no servidor) |

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Ver avisos e preferências de e-mail | R-portal-006 |
| Ver fiscalizações previstas | R-portal-006 |
| Ver parecer técnico e decisão final | R-portal-005 |
| Páginas e cartões de apps futuros | R-portal-008 |

## Migração

O módulo não tem tabelas nem colunas: não há dados a migrar nem mapa de migração. Os usuários da
entidade migram pelo core (perfis com papel prestador e vínculo à entidade, A-023). Os documentos e
as fotos que o portal mostra migram pelos apps donos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em teste com duas entidades, fiscalizações com e sem termo, e termos pelo portal e
  manuais, 0 dados de fiscalização sem termo emitido pelo portal são alcançados pela entidade, por
  qualquer caminho.
- **SC-002**: 0 fotos ou documentos alcançáveis sem endereço assinado.
- **SC-003**: 100% das ações da entidade ficam registradas pelo app dono, com usuário, data do
  servidor e pontualidade; 0 defesas perdidas.
- **SC-004**: Um usuário da entidade responde um termo com 10 determinações, com evidências, em
  menos de 30 minutos, sem ajuda.
- **SC-005**: O portal grava 0 vezes em modelos de outros apps (verificado por teste).
- **SC-006**: Um app de teste registra página e cartão e aparece no portal com 0 alterações no
  portal.
- **SC-007**: 100% das regras de acesso deste módulo têm teste automatizado.

## Assumptions

- **Uso pelo celular**: o portal é usado no computador e no celular, com rede; não tem uso sem rede.
- **Assinatura**: o TN, o AI e o ofício de defesa são assinados fora do sistema e enviados em PDF,
  como hoje; a assinatura eletrônica no sistema é uma melhoria futura.
- **Perfis dentro da entidade**: todos os usuários de uma entidade têm as mesmas permissões; perfis
  diferentes por usuário (ex.: só leitura) ficam para depois, se pedidos.
- **Idioma e acessibilidade**: português; telas acessíveis por teclado e leitor de tela, no padrão
  das demais telas do sistema.
