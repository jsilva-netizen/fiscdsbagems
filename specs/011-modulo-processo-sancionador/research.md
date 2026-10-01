# Research: Módulo processo sancionador

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-01

Decisões técnicas do processo sancionador. Valem, sem repetir, as do core: organização dos apps
(R3), papéis extensíveis (R4), escopo (R7), testes de autorização (R8), arquivos (R9), auditoria
(R10), central de avisos (R15). Valem também as da fiscalização: verificação de documento ligado
(F7), motor de documentos (F10, com P9 do planejamento) e alcance (F14).

As questões Q1 e Q2 da spec continuam em aberto. A N11 desenha as etapas de julgamento e
deliberação de forma que as respostas não mudem o resto do app. As tarefas da US5 esperam as
respostas.

## N1 — Lugar do app e dependências

**Decision**: app Django `processo_sancionador` em `backend/apps/processo_sancionador/` e módulo
`frontend/src/processo_sancionador/`. Depende do `core` e da `fiscalizacao`, pelas `consultas`, e
registra:
- na fiscalização, a verificação de documento ligado (`registrar_verificacao_documento`);
- no core, os tipos de aviso, o papel `julgador` (migração de dados, R4) e as telas (R-core-025).

Nenhum app anterior o importa. Os apps de câmara e o portal leem pelas consultas dele.

**Rationale**: 6º na ordem da spec 003; constituição v2.5.0 e v2.6.0.

**Alternatives considered**: um app por instância (câmara técnica, julgamento, diretoria): partiria o
processo e a linha do tempo, contra a decisão do responsável de um app completo.

## N2 — Processo como raiz, etapas como máquina de estados

**Decision**: o `ProcessoSancionador` é a raiz; termo, análises, autos, remessas, defesas, pareceres e
decisões pendem dele. A etapa é um campo com valores fixos (notificação, análise da manifestação,
autos e defesa, parecer técnico, julgamento, deliberação, encerrado) e uma situação (ativo,
encerrado, cancelado).

As passagens permitidas ficam numa tabela no código (`etapas.py`), cada uma com a função que
confere se a etapa está completa e devolve o que falta. O único caminho de mudança de etapa é o
serviço `movimentar(processo, para, usuario, motivo)`, que, numa transação com o processo travado:
1. confere a permissão e a completude;
2. grava a etapa;
3. registra o evento;
4. envia os avisos.

As passagens automáticas (ex.: AM sem não acatadas → encerrado) usam o mesmo serviço.

**Rationale**: R-sancionador-002; decisão do responsável (movimentações por etapa e por perfil).

**Alternatives considered**:
- biblioteca de máquina de estados (`django-fsm`): dependência a mais para uma tabela pequena,
  testável direto;
- etapa deduzida dos dados, como hoje: cada tela deduzia diferente.

## N3 — Numeração

**Decision**: `SequenciaDocumento` (tipo `tn`, `am`, `ai`; diretoria; ano; último). Na emissão, o
serviço trava a linha (`select_for_update`), cria se não existir, incrementa e grava o número no
formato `<TIPO> NNN/AAAA/<SIGLA>/AGEMS`. A sigla é o identificador da diretoria no core, em
maiúsculas. O ano é o da emissão, no fuso de MS. Restrição única no número de cada tipo. A migração
cria a sequência de cada tipo, diretoria e ano com o maior número migrado.

**Rationale**: A-028; mesmo padrão do número do termo de vistoria (F6).

**Alternatives considered**: sequência do PostgreSQL por tipo e ano: difícil de criar por ano e de
ajustar na migração.

## N4 — Ligação com a fiscalização e conteúdo notificado

**Decision**: `ProcessoSancionador.fiscalizacao` é chave estrangeira protegida, e o app registra a
verificação de documento: fiscalização com processo não é excluída. Na **emissão do TN**, o app grava
um retrato de cada determinação notificada (`DeterminacaoNotificada`): identificador na
fiscalização, registro de campo, número, texto, prazo em dias, NC e constatação. A partir daí,
resposta, análise e auto apontam para esse retrato, não para a determinação viva.

Se a fiscalização for reaberta e a determinação mudar, o processo mostra a diferença
(`alterada_depois` calculado na leitura), sem mudar o que foi notificado.

**Rationale**: R-sancionador-004 e R-sancionador-023; a consolidação da fiscalização reaberta pode
mudar ou remover determinações (F4), mas o TN emitido é um ato com o conteúdo daquela data.

**Alternatives considered**:
- chave estrangeira para a determinação: a remoção na consolidação apagaria ou travaria registros
  do processo;
- ler sempre a determinação viva: o processo mostraria um texto diferente do notificado.

## N5 — Prazos

**Decision**: módulo `prazos.py`, com datas no fuso `America/Campo_Grande`, contando o último dia:
- **ciência pelo portal**: no primeiro TN assinado aceito, `inicio_prazo` = data de hoje, e
  `data_limite` = início + prazo do termo. Ficam gravados, porque são fatos do processo; um reenvio
  não os altera;
- **ciência manual**: a equipe informa a data do protocolo; o servidor calcula a data-limite;
- **prazo de cumprimento** de cada determinação notificada: início + prazo da determinação,
  calculado na leitura;
- **pontualidade**: resposta, conclusão da resposta e defesa gravam a data do servidor e
  `no_prazo` = data ≤ data-limite;
- **prazo de defesa**: recebimento da remessa + prazo de defesa da câmara, gravado no auto;
- **situação do termo**: calculada na consulta, por expressão no banco, com a data de hoje de MS.

**Rationale**: R-sancionador-005 a R-sancionador-007, R-sancionador-010, R-sancionador-011; A-014.

**Alternatives considered**: gravar a situação e atualizá-la por rotina: fica errada entre a virada do
dia e a rotina.

## N6 — Escritas da entidade

**Decision**: as escritas da entidade são rotas deste app com o prefixo `portal/sancionador/`. As
telas são do portal, que as chama. Cada rota:
- tem serializador próprio, que aceita só os campos daquela ação;
- confere que a entidade do usuário é a do processo e que o termo foi emitido pelo portal;
- confere a etapa e a situação (ex.: resposta só antes da análise; defesa só depois do recebimento);
- grava as datas do servidor.

Ações: enviar o TN assinado; salvar ou enviar a resposta de uma determinação; concluir a resposta
com o termo de envio; registrar o recebimento da remessa com os AIs assinados; salvar ou enviar a
defesa de um auto.

**Rationale**: R-sancionador-005, R-sancionador-006, R-sancionador-010, R-sancionador-011; A-014,
A-034; o dono do dado é quem grava (constituição).

**Alternatives considered**: o portal gravar nos modelos deste app: fere "todo dado tem um app dono".

## N7 — Análise e AM com versões

**Decision**:
- `AnaliseManifestacao` tem versão e situação (`rascunho`, `concluida`, `substituida`).
- `AnaliseResposta` tem um resultado por determinação notificada (`acatada`, `nao_acatada`,
  `nao_atendida_no_prazo`) e o texto. É separada da resposta da entidade.
- **Concluir**: exige todas as determinações analisadas. Numa transação: número da AM, geração do
  documento (N8), autos das não acatadas (único por determinação entre os não cancelados, índice
  parcial), movimentação para "autos e defesa" ou, sem autos, para "encerrado".
- **Refazer**: só sem auto enviado. Cria a versão seguinte em rascunho, copiando as análises; a
  anterior fica `substituida`; os autos dela são cancelados com o motivo "análise refeita". Nada é
  apagado.

**Rationale**: R-sancionador-008; Princípio I.

**Alternatives considered**: editar a AM concluída: perderia o documento já assinado e o histórico.

## N8 — Documentos gerados pelo sistema

**Decision**: a AM e a lista de autos da remessa são geradas no servidor pelo motor de documentos
(HTML e CSS para PDF com WeasyPrint, como F10 e P9), numa tarefa Celery. Os layouts são registrados
pelo próprio app (`layouts/am_padrao`, `layouts/remessa_padrao`), e a configuração da câmara
escolhe o layout e dá o texto da base legal. O documento gerado vira um `DocumentoProcesso` do tipo
correspondente. A versão assinada é anexada à parte.

**Rationale**: R-sancionador-001, R-sancionador-008, R-sancionador-010; hoje o PDF é montado no
navegador.

**Alternatives considered**: gerar no navegador, como hoje: layout fixo no código e sem cópia no
servidor.

## N9 — Documentos e arquivos

**Decision**: `DocumentoProcesso` guarda todo arquivo do processo:
- processo e o registro dono (tipo e identificador);
- tipo do documento (lista fechada no data-model);
- arquivo no repositório privado, com prefixo fixo por tipo (A-019);
- nome original, tipo de conteúdo conferido pelo conteúdo, tamanho, checksum SHA-256;
- quem enviou e se foi a entidade;
- data e cancelamento.

Limite: PDF ou imagem, até 20 MB por arquivo, 20 evidências por resposta e 20 anexos por defesa.
Entrega só por endereço assinado de curta duração, depois da verificação de alcance (A-016).
Documento não é apagado; documento enviado por engano é cancelado com motivo e sai das listas.

**Rationale**: R-sancionador-016; A-016, A-019; mesmo limite dos documentos de entidade do core.

**Alternatives considered**: colunas de endereço por documento, como hoje: não guardam autor, data
nem versões.

## N10 — Autos, remessa e defesa

**Decision**:
- **Auto**:
  - situação (`gerado`, `enviado`, `defesa_recebida`, `com_parecer`, `julgado`, `deliberado`,
    `cancelado`) mudada só pelos serviços;
  - pena base: UFERMS inteiro > 0 e R$ ≥ 0, informadas pela câmara técnica enquanto `gerado`;
  - documentos ligados: AI assinado pela AGEMS e pela entidade (A-018), protocolos.
- **Remessa**: só autos `gerado` com pena base e AI assinado pela AGEMS. Uma remessa não cancelada
  por processo (índice parcial). O envio gera a lista (N8) e passa os autos a `enviado`.
- **Recebimento pela entidade** (N6): exige o AI assinado pela entidade em cada auto; grava o
  recebimento e o prazo de defesa de cada auto. No fluxo manual, a equipe registra os protocolos e a
  data de recebimento.
- **Defesa**: registro próprio, um por auto (A-029), com rascunho e envio. O envio grava a data e a
  pontualidade e passa o auto a `defesa_recebida`. A equipe pode registrar a defesa recebida em
  papel.
- **Passagem a "parecer técnico"**: quando todos os autos não cancelados têm defesa enviada ou prazo
  vencido.

**Rationale**: R-sancionador-009 a R-sancionador-011; A-018, A-029, A-034.

**Alternatives considered**: defesa no próprio auto, como hoje: é onde ela se perde (A-029).

## N11 — Colegiados, decisões e deliberações (provisório até Q1)

**Decision**:
- `Colegiado`, com dois registros fixos criados por migração de dados: `camara_julgamento` e
  `diretoria_executiva`. `MembroColegiado` (usuário, início, fim) é mantido pelo administrador. O
  papel `julgador` (sem vínculo de diretoria, câmara ou entidade) é declarado pelo app para quem não
  tem outro papel.
- `DecisaoAuto`, uma por auto e por instância (`julgamento`, `deliberacao`), com:
  - resultado (`mantem`, `atenua`, `cancela`) e a multa em UFERMS e em R$;
  - fundamentação e o documento (ata ou decisão assinada);
  - quem registrou e quando.

  A passagem de etapa exige a decisão de todos os autos não cancelados.
- **O que muda com a resposta de Q1**:
  - se for **voto por membro**, entra `VotoMembro` (decisão, membro, resultado, multa) e a
    `DecisaoAuto` passa a ser o resultado apurado, sem mudar o resto;
  - se houver **devolução**, entra a passagem de volta para "parecer técnico", com motivo, na tabela
    de passagens (N2);
  - **quem registra** é uma regra de alcance (N14) sobre o colegiado.
- **Q2** muda só os avisos (N13).

**Rationale**: R-sancionador-013 e R-sancionador-014. O resultado por auto é comum às duas formas de
registro da Q1, então o resto do app (autos, encerramento, consultas da cobrança) não depende da
resposta.

**Alternatives considered**: esperar a Q1 para desenhar qualquer coisa: as etapas da câmara técnica
e as consultas ficariam sem o modelo do fim do processo.

## N12 — Linha do tempo

**Decision**: `EventoProcesso` imutável: tipo, etapa de origem e de destino (nas movimentações),
descrição, registro relacionado, autor (ou "entidade" com o usuário do portal), data. É gravado pelos
serviços, na mesma transação da operação. Não há alteração nem exclusão (405), e um teste confere
que o modelo não é salvo fora do serviço.

**Rationale**: R-sancionador-017.

**Alternatives considered**: só a auditoria do core: é técnica; a linha do tempo é parte do processo
e aparece para todos os perfis do processo, inclusive a entidade, que vê os eventos dela e os atos
emitidos.

## N13 — Avisos

**Decision**: tipos registrados na central de avisos do core:
- `sancionador.termo_emitido`, `sancionador.remessa_enviada`, `sancionador.decisao_final` e
  `sancionador.prazo_proximo` (5 dias antes da data-limite do termo e do prazo de defesa): à
  entidade;
- `sancionador.resposta_concluida`, `sancionador.prazo_vencido`, `sancionador.defesa_enviada`: à
  câmara técnica;
- `sancionador.processo_encaminhado`: aos membros do colegiado da etapa.

Uma tarefa diária, às 7h de MS, avisa os prazos vencidos, um aviso por prazo (controle por tipo,
referência e data). Se a resposta da Q2 for "sim", entra `sancionador.decisao_julgamento` à entidade.

**Rationale**: R-sancionador-015; R-core-026.

**Alternatives considered**: avisos calculados na tela: cada perfil veria diferente.

## N14 — Alcance

**Decision**: escopo composto, aplicado pelo componente do core:
- **câmara técnica**: processos da câmara do usuário (coordenador e fiscal);
- **colegiado**: processos cuja etapa atual ou já passada inclui a do colegiado de que o usuário é
  membro vigente;
- **diretor**: processos das câmaras da diretoria, só leitura;
- **administrador**: tudo;
- **entidade**: rotas do portal, processos com termo emitido pelo portal para a entidade do usuário.

Cada ação confere também a etapa e o papel no colegiado: ler o processo não dá direito a agir nele.
Documentos, painéis e consultas usam o mesmo escopo.

**Rationale**: R-sancionador-018; A-026, A-027, A-034.

**Alternatives considered**: escopo só por câmara: a câmara de julgamento e a diretoria não veriam os
processos.

## N15 — Consultas para outros apps

**Decision**: `processo_sancionador/consultas.py` oferece:
- `contagem_termos(usuario, camara)` e `contagem_autos(usuario, camara)`, por situação, para os
  painéis da CATESA e da CATERS;
- `termos_da_entidade(usuario)` e `processo_da_entidade(usuario, id)`, para o portal: o que a
  entidade vê, com a regra do termo emitido (A-027);
- `decisoes_finais(desde)`, para o futuro módulo de cobrança e dívida: autos deliberados com
  resultado, multa, entidade e processo.

**Rationale**: R-sancionador-020.

**Alternatives considered**: os painéis lerem os modelos: fere R3 do core.

## N16 — Migração

**Decision**: comando `migrar_processo_sancionador --dump <arquivo> --excluir <lista> [--conferir]`,
depois de core e fiscalização, pelo mapa `anotacoes/migracao/processo_sancionador.toml`:
- a lista de identificadores de teste (A-002), fechada com o responsável, é obrigatória; o comando
  não roda sem ela;
- cada termo vira um processo e um termo **com o mesmo identificador**; as determinações da
  fiscalização (já migradas) viram os retratos notificados;
- a etapa é deduzida dos dados (ciência, resposta, AM, autos), e a situação gravada fica em
  `situacao_legado` para a conferência;
- as colunas de endereço viram `DocumentoProcesso`, com o arquivo copiado e o checksum conferido;
  arquivos de repositório sem registro (os 5 de autos) são listados e não migrados sem decisão;
- números de TN e AM migram como estão; as sequências começam no maior número de cada tipo,
  diretoria e ano;
- as tabelas de manifestações e de julgamentos (vazias) não são levadas (A-030).

**Rationale**: seção "Migração" da spec; Princípio I.

**Alternatives considered**: renumerar os termos migrados: mudaria documentos já emitidos.
