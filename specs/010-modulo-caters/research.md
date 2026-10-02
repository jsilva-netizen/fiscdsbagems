# Research: Módulo CATERS — app da câmara de resíduos sólidos e limpeza urbana

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-01

Decisões técnicas do app da CATERS. Valem, sem repetir, as do core (R1 a R15, em especial R9
arquivos e R15 central de avisos), da fiscalização (F7 pontos de extensão, F14 alcance), do motor de
checklists (K11 configuração inicial) e do app da CATESA (S3 a S6, S8), cuja configuração inicial a
CATERS repete com cópia própria.

## T1 — Nome, lugar e dependências

**Decision**: app Django `caters` em `backend/apps/caters/` e módulo `frontend/src/caters/`. Depende de
`core`, `checklists`, `planejamento` e `fiscalizacao` e, quando instalado, de `processo_sancionador`,
pelas `consultas`, pelo serviço de configuração inicial de cada app comum e pelos registros de
extensão. Nenhum app comum importa o `caters`, e ele não importa outro app de câmara (import-linter).

**Rationale**: um app por câmara (constituição v2.6.0); a CATERS é a 7ª na ordem da spec 003, depois
do processo sancionador.

**Alternatives considered**: o processo de acompanhamento num app comum desde já: só a CATERS o usa;
vira peça genérica se outra câmara precisar (R-caters-001).

## T2 — Configuração inicial

**Decision**: igual à da CATESA (research S3 a S6 da spec 009), com pacote próprio em
`backend/apps/caters/configuracao/` (`checklists.json` com o modelo `checklist_unidade`,
`fiscalizacao.json`, `planejamento.json`) e o comando `configurar_caters`, idempotente, que chama
`servicos.aplicar_configuracao_inicial` de cada app comum. A câmara é identificada pela sigla `CATERS`
numa constante do app.

**Rationale**: R-caters-002; constituição v2.6.1 (cópia independente).

**Alternatives considered**: copiar a configuração da CATESA na implantação: liga um app de câmara ao
outro.

## T3 — Modelos próprios e ligação com a fiscalização

**Decision**: os modelos do processo ([data-model.md](./data-model.md)) são do app. A ligação com a
fiscalização é chave estrangeira protegida (`PROTECT`) para `fiscalizacao.Fiscalizacao`, e o app
registra na fiscalização a verificação de documento ligado (`registrar_verificacao_documento`): a
fiscalização com processo da CATERS não é excluída (R-fiscalizacao-015).

As recomendações acompanhadas guardam a **origem** como tipo (`recomendacao`, `determinacao`,
`manual`) e identificador, **sem chave estrangeira**, mais a cópia do texto: a consolidação da
fiscalização pode remover uma recomendação quando a vistoria é reaberta (F4), e o acompanhamento
precisa continuar com o texto que foi notificado.

**Rationale**: R-caters-004 (nova importação lista o que deixou de existir, sem apagar); integridade
da ligação com a fiscalização (Princípio I).

**Alternatives considered**:
- chave estrangeira para as recomendações com `SET_NULL`, como hoje: a remoção na fiscalização
  alteraria dado da CATERS sem passar pelo serviço dela;
- `PROTECT` nas recomendações: travaria a consolidação da fiscalização reaberta.

## T4 — Importação das recomendações e determinações

**Decision**: serviço `importar_da_fiscalizacao(processo, usuario, prazo_dias=30)`, numa transação
com o processo travado:
1. lê a fiscalização e os registros gerados por `fiscalizacao.consultas` (`fiscalizacao`,
   `registros_gerados(fiscalizacao, papel="caters.acompanhado")`), com o alcance do usuário; recusa
   fiscalização não finalizada ou de outra câmara;
2. cria uma recomendação acompanhada para cada registro ainda não importado (chave: tipo +
   identificador de origem), com prioridade média: tipo sem prazo, prazo = data de fim da
   fiscalização + `prazo_dias`, no fuso de MS; tipo com prazo, prazo = `data_limite` do registro;
3. marca `origem_removida_em` nas importadas cuja origem não existe mais, sem apagar;
4. registra o evento "importação" com as quantidades.

**Rationale**: R-caters-004; A-005 (sem função do banco); a determinação ganha prazo.

**Alternatives considered**: importar automaticamente ao finalizar a fiscalização: a CATERS decide
quando abrir o processo.

## T5 — Prazos e datas

**Decision**:
- **Fuso**: datas calculadas em `America/Campo_Grande` (data de hoje, prazos, "marcar como
  cumprida").
- **Prazo de resposta efetivo**, calculado no servidor ao ler (não gravado): o informado; senão, o
  recebimento do AR + 30 dias; senão, o envio do relatório + 30 dias; senão, vazio. A API devolve o
  prazo, a origem (`informado`, `ar`, `envio`) e os dias restantes.
- **Dilação aprovada**: grava o novo prazo como prazo informado.
- **Situação da recomendação**, calculada na consulta (expressão no banco, com a data de hoje de MS):
  `cumprida` com data de cumprimento; senão `vencida` com prazo passado; senão `em_andamento` se a
  equipe marcou; senão `pendente`.

**Rationale**: R-caters-005, R-caters-009; o painel, a lista e os avisos usam o mesmo cálculo; o
defeito da data UTC some.

**Alternatives considered**: gravar a situação e atualizá-la por rotina noturna: fica errada entre a
virada do dia e a rotina.

## T6 — Dilação

**Decision**: serviço `registrar_dilacao(processo, dados, usuario)`, numa transação com o processo
travado: calcula o novo prazo (referência + dias), grava a dilação (imutável) e, se aprovada, muda o
prazo informado do processo, põe a situação em `dilacao_solicitada` (ou mantém a atual, se pedido) e
registra o evento "prazo estendido" com o novo prazo. A rota de prévia calcula o novo prazo sem gravar.

**Rationale**: R-caters-007; A-031 (situação incluída e prazo atualizado na mesma operação).

**Alternatives considered**: duas chamadas da tela, como hoje: a segunda falha e deixa a dilação sem
efeito.

## T7 — Linha do tempo imutável

**Decision**: `EventoProcesso` só tem criação, pelo serviço do app. Os eventos automáticos são
gravados pelos próprios serviços na mesma transação da operação (criação, situação, importação, AR,
resposta, dilação, documento, encerramento, reabertura); os registrados pela equipe usam os tipos
`registro` e `observacao`. A API não tem alteração nem exclusão (405), e um teste confere que o
modelo não é salvo fora do serviço de criação.

**Rationale**: R-caters-011; A-032.

**Alternatives considered**: usar só a auditoria do core: a auditoria é técnica; a linha do tempo é
parte do processo, mostrada à equipe.

## T8 — Documentos

**Decision**: `DocumentoProcesso` com tipo (`relatorio`, `termo_notificacao`, `ar_digitalizado`,
`oficio_resposta`, `cronograma`, `evidencia`, `extra`). Arquivos no repositório privado (R9 do core),
PDF ou imagem conferidos pelo conteúdo, até 20 MB, com checksum, entregues por endereço assinado
depois da verificação de alcance. Remover marca `removido_em` e registra o evento; o arquivo é
mantido. O relatório vigente da fiscalização ligada não é copiado: a API do processo o mostra pela
consulta `relatorio_vigente` da fiscalização, com o endereço assinado que ela fornece.

**Rationale**: R-caters-010; A-016.

**Alternatives considered**: colunas de endereço por documento, como hoje: não registram autor nem
data, e um segundo arquivo do mesmo tipo substitui o primeiro sem rastro.

## T9 — Avisos

**Decision**: o app registra na central de avisos do core (`core.avisos.registrar_tipo`) os tipos
`caters.resposta_atrasada`, `caters.recomendacao_vencida` e `caters.aguardando_analise`. Uma tarefa
Celery diária (7h, horário de MS) calcula as pendências pelo T5 e envia o aviso à equipe da CATERS por
`core.servicos.enviar_aviso`. O modelo `ControleAviso` (tipo, referência, prazo; único) garante um aviso
por prazo: prazo prorrogado gera aviso novo quando vencer.

**Rationale**: R-caters-012; R-core-026.

**Alternatives considered**: guardar a chave com o prazo nas leituras, como hoje: a central de avisos
já guarda a leitura; falta só não repetir o envio.

## T10 — Painel

**Decision**: `GET painel/caters`, só leitura, com o alcance e calculado no banco (sem o limite de
linhas de hoje): processos ativos, processos em acompanhamento, respostas atrasadas, recomendações
vencidas, aguardando análise (definições na R-caters-012) e, com o processo sancionador instalado, termos
da CATERS por situação (consultas dele). Registrado no início do core (R-core-025) para a CATERS, o
diretor da DSB e o administrador.

**Rationale**: R-caters-012; mesmo desenho do painel da CATESA (S7).

**Alternatives considered**: contadores calculados no navegador, como hoje: fora do alcance e sem o
mesmo cálculo dos avisos.

## T11 — Alcance e exclusão

**Decision**: escopo próprio pelo componente do core: câmara CATERS (coordenador e fiscal leem e
escrevem), diretoria DSB (diretor lê), administrador (tudo, e é o único que exclui processo, só sem
recomendação, documento ou evento além da criação). Tudo o que pende do processo herda o escopo dele.
Processo encerrado só aceita a reabertura, com motivo.

**Rationale**: R-caters-013; A-026.

**Alternatives considered**: dilação aberta a qualquer usuário, como hoje: fere o isolamento.

## T12 — Migração

**Decision**: comando `migrar_caters --dump <arquivo> [--conferir]`, depois de core, fiscalização e
o comando de configuração, pelo mapa `anotacoes/migracao/caters.toml`:
- processos e recomendações com os mesmos identificadores;
- município e técnico ligados aos cadastros do core pelo nome, sem diferenciar maiúsculas e acentos,
  com o texto original guardado; sem correspondência, fica vazio e listado;
- as 5 colunas de endereço viram `DocumentoProcesso` do tipo correspondente, com o arquivo copiado do
  repositório de documentos de entidades e o checksum conferido (os 4 arquivos de produção);
- situação da recomendação: `em_andamento` vira a marca da equipe; a situação gravada fica em
  `situacao_legado`, e a conferência lista as que o cálculo novo mostra diferente;
- ligação com a fiscalização: as recomendações e determinações migradas pela fiscalização mantêm o
  identificador, então a origem é a mesma;
- as tabelas vazias são lidas e conferidas com 0 linhas; as leituras de aviso são descartadas.

**Rationale**: seção "Migração" da spec; Princípio I.

**Alternatives considered**: recalcular o prazo das recomendações na migração: mudaria o que foi
comunicado ao município.
