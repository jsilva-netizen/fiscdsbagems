# Research: Módulo tramitação de documentos e dados

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-01

Decisões técnicas da tramitação. Valem, sem repetir:
- as do core: organização dos apps (R3), escopo (R7), testes de autorização (R8), arquivos (R9),
  auditoria (R10), credenciais (R12), central de avisos (R15);
- as do portal: registro de contribuições (V3) e fronteira do papel prestador (V5).

As questões Q1 (API do e-MS) e Q2 (numeração dos ofícios) seguem em aberto. A X10 desenha a
integração com o e-MS como uma porta com um adaptador, para a resposta da Q1 mudar só o adaptador.
As tarefas da US5 esperam a Q1.

## X1 — Lugar do app e dependências

**Decision**: app Django `tramitacao` em `backend/apps/tramitacao/` e módulo
`frontend/src/tramitacao/`. Depende de:
- `core`;
- `fiscalizacao`, `planejamento` e `processo_sancionador`, pelas consultas, só para mostrar os
  registros ligados (X13);
- `portal_prestador`, pelo registro (cartões e páginas).

É o último da ordem: nenhum app o importa.

**Rationale**: 10º na ordem da spec 003; R-tramitacao-012.

**Alternatives considered**: tramitação dentro do core: o core ficaria com fluxos de negócio de um
uso só (constituição v2.5.0).

## X2 — Unidades

**Decision**: `UnidadeTramitacao` representa quem envia, recebe e responde, e tem três tipos:
- **câmara** e **diretoria**: criadas por migração de dados, uma para cada câmara e diretoria do
  core. Os membros vêm do vínculo do usuário no core (coordenador e fiscal da câmara; diretor da
  diretoria);
- **outra** (presidência, jurídico, ouvidoria): criada pelo administrador, com membros explícitos
  (`MembroUnidade`, com vigência).

Quando o core tiver áreas (R-core-023), as unidades "outra" passam a apontar para elas.

**Rationale**: R-tramitacao-001 e premissa "Unidades internas"; o core ainda não tem áreas além de
câmaras e diretorias.

**Alternatives considered**: criar áreas no core agora: mudaria o core por uma necessidade só da
tramitação, antes de as áreas existirem para os outros apps.

## X3 — Expediente, mensagens e numeração

**Decision**:
- **Expediente**:
  - protocolo `NNNNN/AAAA`, por uma sequência por ano travada no servidor (como N3 da spec 011),
    atribuído no envio, ou na abertura quando a entidade protocola;
  - estado gravado: `rascunho`, `ativo`, `encerrado`, `cancelado`;
  - situação calculada na consulta: aguardando resposta, prazo vencido, respondido.
- **Mensagem**: todo conteúdo trocado é uma mensagem imutável do expediente, com:
  - tipo: `envio`, `resposta`, `pedido_complemento`, `complemento`, `protocolo`, `encerramento`;
  - lado (AGEMS ou entidade), autor, texto, documentos;
  - data do servidor e, nas respostas, a pontualidade.

  Corrigir é mandar uma nova mensagem: nada é alterado depois de enviado.

O número oficial do ofício (Q2) fica num campo opcional do expediente, informado pela unidade ou
trazido do e-MS, até a resposta da Q2.

**Rationale**: R-tramitacao-002 a R-tramitacao-004 e R-tramitacao-008.

**Alternatives considered**: campos de resposta no próprio expediente: só caberia uma resposta, e o
complemento perderia o histórico.

## X4 — Ciência

**Decision**: `Ciencia` (expediente, mensagem, usuário, data e hora, lado) é gravada pelo servidor na
primeira vez que um usuário da entidade abre a mensagem pela rota do portal. Na movimentação interna,
a ciência da unidade de destino é a primeira abertura por um membro dela. Vale a primeira; as
seguintes não mudam nada.

**Rationale**: R-tramitacao-003 e R-tramitacao-007.

**Alternatives considered**: botão "dar ciência": a entidade poderia ler sem registrar.

## X5 — Comprovante

**Decision**: o comprovante é um PDF gerado no servidor (motor de documentos, P9 e F10) no envio e
no protocolo. Ele traz:
- protocolo, data e hora, remetente e destinatário, assunto;
- a lista de documentos com o checksum SHA-256 de cada um.

O comprovante vira um documento da mensagem e é baixado por endereço assinado.

**Rationale**: R-tramitacao-004; FR-002.

**Alternatives considered**: comprovante só na tela: a entidade não teria o que guardar.

## X6 — Formato de dados

**Decision**: `FormatoDados` tem `VersaoFormato` imutáveis. A definição é um JSON validado por
esquema e por regras, no mesmo padrão do motor de checklists (K2), mas com módulo próprio:
- **campos**: nome, rótulo, tipo (`texto`, `numero`, `numero_nao_negativo`, `inteiro`, `data`,
  `lista_valores`, `sim_nao`, `arquivo`), obrigatório, mínimo e máximo, valores permitidos;
- **planilha**: colunas → campos, linha de cabeçalho, várias linhas ou uma só;
- **regras de linha**: unicidade de uma chave entre as linhas.

A planilha modelo é gerada pela versão (openpyxl), com as células de texto escapadas contra injeção
de fórmula.

**Rationale**: R-tramitacao-005; o padrão já desenhado no motor de checklists é conhecido e
testado.

**Alternatives considered**:
- reutilizar o motor de checklists: ele é de catálogos com itens versionados para aplicar em
  vistorias, não de dados periódicos enviados pela entidade;
- extrair agora uma biblioteca comum de campos no core: só vale quando um terceiro uso aparecer.

## X7 — Pedidos e períodos

**Decision**:
- **`PedidoDados`**: formato, unidade, entidades e canal (`portal` ou `integracao`), e a
  periodicidade:
  - `pontual`, com data-limite;
  - ou `mensal`, `trimestral`, `semestral`, `anual`, com dia do prazo, início e fim opcional.
- **`PedidoPeriodo`**: pedido, entidade, início e fim do período, prazo, a versão do formato vigente
  na abertura e a situação.
- **Abertura**: uma tarefa Celery diária abre os períodos que começaram. A restrição única (pedido,
  entidade, início do período) garante a abertura uma vez só, mesmo com duas execuções.
- **Mudança de formato**: vale para os períodos abertos depois.

**Rationale**: R-tramitacao-005; SC-003.

**Alternatives considered**: criar todos os períodos do ano de uma vez: um pedido alterado ou
encerrado deixaria períodos órfãos.

## X8 — Envio de dados

**Decision**: o envio (preenchimento na tela ou planilha) é validado inteiro numa etapa só:
- **com erro**: não grava nada e devolve a lista de erros (linha, campo, motivo);
- **aceito**: grava `EnvioDados` com:
  - as linhas normalizadas em JSON e o arquivo original como documento;
  - autor, data do servidor e pontualidade;
  - a marca `automatico` (canal integração).

  Um novo envio no mesmo período passa a ser o vigente, e o anterior fica com `vigente` falso.

A consulta e a exportação (planilha) leem só os envios vigentes, por entidade e período.

**Rationale**: R-tramitacao-005; SC-002.

**Alternatives considered**: aceitar as linhas válidas e recusar só as inválidas: os dados do período
ficariam incompletos sem que a entidade percebesse.

## X9 — Conectores das entidades (preparados)

**Decision**: registro `tramitacao/conectores.py`:
`registrar_conector(codigo, app, nome, buscar(periodo) -> linhas)`. Um pedido com canal
`integracao` escolhe um conector registrado. A tarefa de abertura do período chama o conector, e o
retorno passa pela mesma validação e vira um envio automático. Nenhum conector é entregue agora; um
conector de teste prova o caminho.

**Rationale**: R-tramitacao-006.

**Alternatives considered**: desenhar os conectores agora: não há sistema de concessionária definido.

## X10 — Integração com o e-MS (porta e adaptador)

**Decision**: o app define uma porta, `IntegracaoProtocolo`, com quatro operações:
- `enviar_documentos(processo, documentos)`;
- `abrir_processo(dados)`;
- `andamentos(processo)`;
- `baixar_documento(processo, id)`.

O adaptador do e-MS (`adaptadores/ems.py`) é escrito quando a documentação da API chegar (Q1).
Até lá, um adaptador falso de testes prova o fluxo.

Cada pedido vira uma `OperacaoProtocolo` (expediente, tipo, pedido, retorno, situação, tentativas,
próxima tentativa, autor) e é executado por uma tarefa Celery:
- tentativas com espera crescente, até 10 em 24 horas;
- depois, situação `erro`, com aviso à unidade;
- recusa do e-MS (documento inválido): situação `recusada`, com o motivo.

A credencial fica em variável de ambiente do servidor, lida pelo adaptador, nunca gravada no banco
nem nos registros (os pedidos e retornos são gravados sem cabeçalhos de autenticação). Andamentos e
documentos trazidos do e-MS entram como mensagens do tipo `externo`, marcadas como vindas do e-MS.

**Rationale**: R-tramitacao-009; SC-004; decisão do responsável (o e-MS é o oficial e tem API).

**Alternatives considered**: chamar a API do e-MS direto na requisição do usuário: com o e-MS fora do
ar, o trabalho pararia.

## X11 — Movimentação interna

**Decision**: `Movimentacao` (expediente, unidade de origem, unidade de destino, despacho, autor,
data, ciência) é gravada pelo serviço `encaminhar`, que troca a unidade responsável do expediente
numa transação. Só a unidade responsável atual age; as anteriores leem.

**Rationale**: R-tramitacao-007.

**Alternatives considered**: várias unidades responsáveis ao mesmo tempo: ninguém saberia quem
responde.

## X12 — Alcance, caixas e avisos

**Decision**:
- **Escopo**:
  - membros da unidade responsável atual ou de uma unidade que já foi responsável (só leitura);
  - diretor: unidades da diretoria, só leitura;
  - administrador: tudo;
  - entidade: rotas `portal/tramitacao/...`, expedientes dela com mensagem enviada e os que ela
    protocolou.
- **Caixas**: consultas por unidade (a responder, aguardando a entidade, vencidos, encaminhados e
  quadro dos pedidos).
- **Avisos**: tipos `tramitacao.*` registrados na central do core. Uma tarefa diária, às 7h de MS,
  envia os lembretes à entidade (3 dias antes do prazo) e os vencimentos à unidade, um aviso por
  prazo.
- **Portal**: a tramitação registra os cartões "Expedientes a responder" e "Pedidos de dados
  pendentes" e as páginas dela.

**Rationale**: R-tramitacao-010 e R-tramitacao-011; spec 012 (V3, V5).

**Alternatives considered**: escopo só pela unidade atual: a unidade que encaminhou perderia o
acompanhamento.

## X13 — Registros ligados

**Decision**: `LigacaoRegistro` (expediente, tipo, objeto_id). Os tipos (`fiscalizacao`,
`processo_sancionador`, `viagem`) são definidos neste app, que lê os anteriores. Cada tipo tem um
resolvedor que usa a consulta do app dono com o escopo do usuário, e devolve só um resumo (número,
entidade, situação) ou "sem acesso". A ligação nunca grava no registro ligado.

**Rationale**: R-tramitacao-012.

**Alternatives considered**: os apps anteriores registrarem tipos de ligação na tramitação: eles vêm
antes na ordem e não podem importá-la.

## X14 — Linha do tempo e documentos

**Decision**: `EventoExpediente` é imutável e gravado pelos serviços na mesma transação: mensagens,
ciências, movimentações, operações no protocolo, encerramento e cancelamento.

`DocumentoExpediente` tem:
- a mensagem dona;
- o arquivo no repositório privado;
- nome, tipo de conteúdo conferido, tamanho (até 20 MB) e checksum;
- autor e lado.

Só é entregue por endereço assinado. Não há alteração nem exclusão (405).

**Rationale**: R-tramitacao-008.

**Alternatives considered**: —

## X15 — Migração

**Decision**: não há dados a migrar. As unidades de câmara e de diretoria são criadas por migração de
dados a partir do core.

**Rationale**: seção "Migração" da spec.

**Alternatives considered**: importar processos antigos do e-MS: fora do escopo; o expediente novo
aponta para eles pelo número.
