# Research: Módulo fiscalização

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-30

Decisões técnicas da fiscalização, quarto app do sistema novo. Cada uma tem a decisão, o motivo e as
alternativas descartadas. Valem, sem repetir aqui:

- do core ([research do core](../004-modulo-core/research.md)):
  - repositório novo (R1) e versões (R2);
  - `consultas`/`servicos` e import-linter (R3);
  - escopos e matriz de acesso (R7, R8);
  - arquivos por endereço assinado (R9);
  - auditoria (R10) e sincronização (R11);
  - e-mail (R14) e central de avisos (R15);
- do planejamento ([research do planejamento](../006-modulo-planejamento/research.md)): o motor de
  documentos (P9), com openpyxl e WeasyPrint.

As restrições de partida são as da constituição v2.6.2.

## F1 — Lugar do app e dependências

**Decision**: o app fica em `backend/apps/fiscalizacao/` e o frontend em
`frontend/src/fiscalizacao/`. O app depende de:
- `core.consultas`: usuários, câmaras, serviços, municípios, entidades e auditoria;
- `checklists.consultas`: catálogos, versões vigentes numa data e declaração das saídas;
- `planejamento.consultas`: atividades de fiscalização aprovadas e escalas.

Ele não depende do processo sancionador, do portal nem de apps de câmara. Os apps posteriores
dependem dele pelas `consultas` e pelos pontos de extensão (F7, F10). O contrato do import-linter
proíbe importar qualquer app posterior.

**Rationale**: constituição, "Independência entre apps"; spec, R-fiscalizacao-022 e
R-fiscalizacao-025.

**Alternatives considered**: a fiscalização conhecer o processo sancionador para montar o termo
inverte a ordem, e o termo é do processo sancionador.

## F2 — Modelo: tabelas próprias no lugar de listas em JSON

**Decision**: as fotos viram uma tabela (`Foto`), com ordem, legenda, os dois arquivos e o
checksum, no lugar da lista em JSON dentro da unidade. O ponto de localização vira campos do
registro de campo. A equipe vira `MembroEquipe`. A reabertura vira `Reabertura`, com o motivo. O
relatório vira `Relatorio`, uma linha por versão.

**Rationale**:
- a foto precisa de identidade: checksum na migração e na importação, entrega por endereço assinado,
  exclusão sincronizada;
- a lista em JSON regravada inteira perde fotos em edições simultâneas, o mesmo problema dos
  documentos de entidade (R-core-018).

**Alternatives considered**: manter a lista JSON (sem identidade por foto nem conferência por
arquivo).

## F3 — Execução do catálogo e das saídas

**Decision**: a fiscalização não tem tipos de saída próprios: os tipos de registro gerado vêm do
modelo da câmara (R-checklists-022), e ela interpreta qualquer tipo montado. O que ela registra no
motor (R-checklists-019):
- o modo "lista por unidade";
- os estilos de seção do relatório `fiscalizacao.lista` (lista por registro de campo) e
  `fiscalizacao.quadro_respostas` (item, resposta no rótulo da câmara, observação; soma e média
  quando há valor ou nota).

Ela guarda tudo num modelo genérico, `RegistroGerado` (tipo, sigla, origem, referência, campos,
texto, prazo, número), e monta o texto pelo modelo de texto do tipo. Os papéis (R-checklists-019)
dizem a outros apps quais tipos eles consomem: as consultas `registros_gerados(fiscalizacao, papel)`
devolvem os registros dos tipos com o papel pedido.

O registro do modo "lista por unidade" também é dela. Para montar a unidade, ela pede ao motor as
versões vigentes do catálogo na data de criação da unidade e guarda, em cada resposta, a versão
respondida. As regras de cada resposta vêm da declaração do modelo, lida pelo motor.

**Rationale**: R-fiscalizacao-005 e R-fiscalizacao-007; o motor não sabe o que é uma NC
(R-checklists-013).

**Alternatives considered**:
- a regra "Não com NC gera determinação ou recomendação" no código da fiscalização: chumba o modelo
  da DSB no app comum;
- quatro tipos fixos (constatação, NC, determinação, recomendação) registrados pela fiscalização,
  com só as referências e os textos configuráveis: não atende à montagem completa pela câmara
  (decisão do responsável, 2026-10-02).

## F4 — Consolidação: um algoritmo puro, o mesmo no servidor e no aparelho

**Decision**: a consolidação é uma função pura em `fiscalizacao/consolidacao.py`:
- **entradas**: as respostas e as entradas manuais do registro (ou o registro avulso), as
  declarações de saída e de tipos das versões do modelo e os registros gerados já existentes;
- **saída**: o conjunto desejado, indexado por tipo e `origem` (`resposta:<id>`, `manual:<id>`,
  `registro:<id>`), com os textos montados pelos modelos de texto.

Aplicar o resultado cria o que falta, atualiza os textos não editados (`texto_editado` falso),
preserva os editados e a ordem, e remove o que perdeu a origem. O identificador de cada registro
existente é mantido, e cada registro é religado ao referenciado da mesma origem. Os acrescentados
à mão e os suprimidos são preservados.

A mesma função existe em TypeScript no aparelho, para o trabalho sem rede. As duas implementações
rodam **os mesmos casos de teste**, num arquivo JSON compartilhado (pytest e Vitest). O servidor
consolida:
- ao aplicar um lote de operações que toca o registro;
- na finalização;
- antes do relatório.

O resultado do servidor prevalece e desce na sincronização.

**Rationale**: R-fiscalizacao-007 (identificador estável e repetível) e SC-003. Os casos
compartilhados impedem que tela e servidor divirjam, o que a planilha do planejamento mostrou
acontecer com contas feitas à parte.

**Alternatives considered**:
- só no servidor: sem rede, o fiscal não veria as NCs e determinações da vistoria;
- apagar e recriar, como hoje: identificador muda a cada finalização.

## F5 — Numeração

**Decision**: a função `numerar(fiscalizacao)` percorre os registros de campo com um contador por
sigla dos tipos numerados, que **não recomeça** a cada registro. A ordem dos registros vem do modo: na lista
por unidade, a `ordem` (depois a criação); no avulso, a chave de ordenação que o app da câmara
registrou para o `tipo_avulso` (`registrar_ordem_registros`, contrato de extensões; a CATERF registra
item do PER, rodovia e KM). Dentro de cada registro de campo, numera primeiro os tipos sem referência e depois os que
referenciam, cada registro pela ordem que o tipo define: a `ordem` da equipe, ou a do referenciado
e, no mesmo referenciado, a `ordem`. Na DSB, isso dá C pela ordem do fiscal, NC pela da constatação,
D pela da NC e R pela da equipe; na CATERF, um registro gerado por registro avulso, na ordem dos
registros.

Os textos que citam números (o `{ref}` dos modelos de texto) são reescritos só na parte do número.
As referências são vínculos entre registros gerados (R-checklists-022). A função roda
junto com a consolidação enquanto `numeracao_congelada` é falso. A finalização a liga, e a
reabertura a desliga.

**Rationale**: R-fiscalizacao-008; é a numeração dos relatórios emitidos hoje, que passa a ser
gravada; a das NCs gravadas hoje (ordem de finalização das unidades) não é reproduzível, e a de C,
D e R gravada pelo aparelho recomeça em cada unidade.

**Alternatives considered**: numerar só no relatório, como hoje. A tela e o termo mostrariam
números diferentes.

## F6 — Número do termo

**Decision**: a tabela `SequenciaTermo` guarda o ano e o último número. Na primeira finalização, o
serviço trava a linha do ano (`select_for_update`), incrementa e grava "NNN/AAAA" na fiscalização,
com três dígitos no mínimo. A reabertura e a nova finalização não mexem. A migração cria a
sequência de cada ano com o maior número migrado.

**Rationale**: R-fiscalizacao-013; a trava evita números repetidos com duas finalizações ao mesmo
tempo.

**Alternatives considered**: sequência do PostgreSQL por ano. É mais difícil de criar por ano e de
ajustar na migração.

## F7 — Pontos de extensão para os apps de câmara

**Decision**: dois registros, sem gravar dados.

- **No servidor** (`fiscalizacao/extensoes.py`):
  - `registrar_layout_relatorio(codigo, app, template, contexto)`;
  - `registrar_tipo_registro_avulso(codigo, app, serializador_extensao)`, para o app da câmara
    criar o registro avulso pela consulta de escrita (`servicos.criar_registro_avulso`), que valida
    e consolida como qualquer registro. Os dados próprios da câmara ficam num modelo do app dela,
    ligado ao registro por chave.
- **No aparelho** (`frontend/src/fiscalizacao/extensoes.ts`):
  - linhas da marca d'água, por câmara;
  - enriquecimento do ponto (a CATERF calcula rodovia e KM pelo KML sem rede);
  - telas do registro avulso;
  - camadas do mapa.

A configuração da câmara (`ConfiguracaoFiscalizacao`, F13) escolhe o layout e as linhas.

**Rationale**: R-fiscalizacao-004, R-fiscalizacao-010, R-fiscalizacao-011, R-fiscalizacao-016 e
R-fiscalizacao-025. A CATERF calcula o KM no aparelho, sem rede, então o ponto de extensão do
ponto é do frontend.

**Alternatives considered**: colunas da DTR no registro de campo, como hoje. Chumba câmara no app
comum.

## F8 — Fotos

**Decision**:
- **No aparelho**:
  - redução para 1.600 px, JPEG com qualidade 0,78 e limite de 5 MB (os parâmetros de hoje);
  - EXIF com data e GPS;
  - duas versões: a sem marca e a com marca d'água, desenhada com as linhas da câmara.
- **Envio**: a fila de fotos usa a rota idempotente `POST sync/fiscalizacao/fotos`, pelo
  identificador gerado no aparelho, com o checksum SHA-256 de cada versão. O servidor confere o
  checksum, a dimensão e o limite de 20 fotos por registro.
- **Armazenamento**: repositório privado, com as chaves
  `fiscalizacoes/<fiscalização>/<registro>/<foto>.jpg` e `..._original.jpg`.
- **Entrega**: endereço assinado de 5 minutos, depois de verificar o alcance.
- **Relatório**: usa a versão com marca, reduzida para 1.200 px.

**Rationale**: R-fiscalizacao-011, A-016 e A-017; preserva os parâmetros que já funcionam em campo.

**Alternatives considered**: desenhar a marca no servidor. A foto sem rede não teria marca, e na
CATERF a marca depende do KM calculado no aparelho.

## F9 — Finalização, reabertura e a fila

**Decision**:
- **Finalizar** é uma operação da fila (`acao: finalizar`), idempotente, que leva o contador de
  reaberturas conhecido pelo aparelho. O servidor recusa, como "descartada pela reabertura", a
  finalização cujo contador é menor que o atual.
- **Reabrir** é uma rota só com rede (`POST fiscalizacoes/{id}/reabrir`), com motivo, e cria uma
  `Reabertura`.
- As duas funções de serviço (`finalizar`, `reabrir`) verificam o papel, a câmara e a equipe, e
  gravam a auditoria (A-005).

**Rationale**: R-fiscalizacao-012 e R-fiscalizacao-014; o contador resolve a disputa entre uma
finalização pendente e uma reabertura feita depois.

**Alternatives considered**: reabrir pela fila, como hoje. Uma finalização pendente refinalizaria a
fiscalização logo depois.

## F10 — Relatório

**Decision**: tarefa Celery `gerar_relatorio(relatorio_id)`:
1. consolida sem finalizar;
2. monta o contexto;
3. renderiza o template HTML do layout registrado (F7) com WeasyPrint, num único PDF;
4. grava no repositório privado;
5. atualiza o progresso (registros e fotos) e a situação;
6. avisa quem pediu (R-core-026).

O layout padrão do app é genérico ("vistoria por registro de campo") e parametrizado pela
configuração da câmara (título do documento, cabeçalho). O texto "TERMO DE VISTORIA AGEMS/DSB Nº"
é configuração das câmaras da DSB. Ao ficar pronto, o relatório vira o vigente, e o anterior passa a
substituído. A reabertura marca o vigente como desatualizado. As imagens entram reduzidas
(F8) para caber na memória.

**Rationale**:
- R-fiscalizacao-016;
- motor de documentos único com o planejamento (P9);
- um único PDF: as partes de hoje eram contorno do limite das funções externas.

**Alternatives considered**:
- ReportLab, pelo mesmo motivo do planejamento;
- manter partes: o navegador juntar arquivos é frágil em aparelho fraco.

## F11 — Sincronização da fiscalização

**Decision**: o app usa o protocolo do core (`GET` e `POST sync/fiscalizacao`).

- **Baixar**: o aparelho recebe:
  - as fiscalizações em que o usuário está na equipe, em andamento ou finalizadas há até 90 dias,
    com tudo o que pende delas;
  - as atividades planejadas em que ele está escalado, pelo `sync/planejamento`.

  As demais fiscalizações da câmara são consultadas com rede. O protocolo desce só o que mudou, sem
  a propagação por gatilho de hoje.
- **Enviar**: um lote de operações idempotentes por identificador. O servidor aplica, consolida os
  registros tocados, numera e devolve o resultado por operação e o que mudou.
- **Conflito**: vence a última operação recebida pelo servidor, e as duas versões ficam na
  auditoria.
- **Fiscalização excluída no servidor**: a operação é recusada com `fiscalizacao_inexistente`, e o
  aparelho oferece "enviar como nova", recriando a árvore com identificadores novos, ligada à mesma
  atividade.
- **Limpar dados do aparelho**: recusado com operação ou foto pendente, como hoje.

**Rationale**: R-fiscalizacao-017 e R-core-021; hoje o aparelho baixa tudo o que o usuário vê e
rebaixa a fiscalização inteira a cada mudança.

**Alternatives considered**: baixar tudo da câmara (mais dados no aparelho, sem necessidade).

## F12 — Fila de aparelho de usuário desativado

**Decision**: o aparelho oferece "Exportar trabalho pendente": um arquivo compactado com as
operações pendentes, as fotos, o identificador do usuário e do aparelho, e o checksum de cada
parte. O administrador importa pela rota `importacoes/fila`. O servidor valida as operações com o
alcance que o autor tinha, aplica em nome dele e registra na auditoria o autor e quem importou. O
autor é avisado se for reativado.

**Rationale**: R-fiscalizacao-017; constituição, Princípio II ("dado que exista apenas no
dispositivo é dado de produção").

**Alternatives considered**: reativar o usuário para enviar. Isso dá acesso a quem foi desativado,
às vezes por desligamento.

## F13 — Configuração da câmara

**Decision**: `ConfiguracaoFiscalizacao`, uma por câmara, com:
- o layout do relatório (código registrado);
- o título do documento;
- as linhas da marca d'água, como modelo com campos (`{codigo}`, `{municipio}`, `{uf}`, `{data}`,
  `{hora}`, `{coordenadas}`, e os campos que o app da câmara acrescenta);
- o limite de imprecisão do GPS (padrão 20 m).

Ela é mantida na tela pelo coordenador e pelo administrador, com cópia entre câmaras (constituição
v2.6.1). A configuração inicial das câmaras da DSB reproduz a de hoje.

**Rationale**: R-fiscalizacao-011, R-fiscalizacao-016 e R-fiscalizacao-025.

**Alternatives considered**: parâmetros fixos no código, que chumbam câmara.

## F14 — Alcance

**Decision**: o escopo da fiscalização, aplicado pelo componente do core, é:
- câmara da fiscalização igual à do usuário, **ou** usuário em `MembroEquipe` da fiscalização
  (coordenador e fiscal): leitura e escrita;
- diretor: câmaras da diretoria, só leitura;
- administrador: tudo;
- prestador: nada por este app. O portal lê pelas consultas, com a regra do termo.

Tudo o que pende da fiscalização herda o escopo dela: consulta pelo `fiscalizacao_id`, nunca direta.
As fotos e os relatórios só saem por endereço assinado depois dessa verificação.

**Rationale**: R-fiscalizacao-003, A-026 e A-027.

**Alternatives considered**: escopo só por câmara. O servidor liberado de outra câmara não
trabalharia na viagem conjunta.

## F15 — Ligação com o planejamento e urgência

**Decision**: `Fiscalizacao.atividade_id` guarda o `atividade_id` estável do planejamento
(R-planejamento-021), sem chave estrangeira entre apps, porque a atividade é uma linha versionada.
O vínculo é conferido por `planejamento.consultas.atividade(atividade_id)`:
- ao criar, a atividade tem de estar aprovada, ser do tipo fiscalização e da câmara, e ter o usuário
  escalado;
- ao ligar uma urgência, a atividade tem de estar aprovada.

Há restrição única parcial: uma fiscalização por atividade. A urgência tem `urgencia = verdadeiro`,
motivo e `atividade_id` vazio, e sai da pendência quando é ligada.

**Rationale**: R-fiscalizacao-002 e R-planejamento-021.

**Alternatives considered**: chave estrangeira para a versão da atividade, que mudaria a cada nova
versão.

## F16 — Indicadores

**Decision**: consultas agregadas pelo ORM, com o escopo aplicado antes de agregar (F14), na rota
`indicadores/fiscalizacao?ano=&de=&ate=&servico=&municipio=&entidade=&camara=`. As definições são
as da R-fiscalizacao-018. A exportação sai em PDF, pelo motor de documentos, e em JSON. O app
registra no core o painel "Últimas fiscalizações", o painel dos indicadores do diretor e o
planejado × executado, que lê `planejamento.consultas.atividades_de_fiscalizacao`.

**Rationale**: R-fiscalizacao-018; A-005 (sem função do banco com permissão elevada).

**Alternatives considered**: views materializadas. O volume (dezenas de fiscalizações por ano) não
pede.

## F17 — Exportar e importar

**Decision**:
- **Formato**: um arquivo `.zip` com:
  - `manifesto.json` (versão do formato, gerado em, sistema de origem, checksum SHA-256 de cada
    parte);
  - `dados.json` (fiscalizações e tudo o que pende delas, com os identificadores de origem);
  - `fotos/<id>.jpg` e `fotos/<id>_original.jpg`.
- **Importar** tem duas etapas:
  1. `POST importacoes` recebe o arquivo, valida contra as regras das telas (entidade, município,
     catálogo e versão, câmara, serviços) e devolve a prévia;
  2. `POST importacoes/{id}/confirmar` grava numa tarefa Celery, em transação por fiscalização, com
     identificadores novos, `origem = importada` e o arquivo e a data registrados, e confere o
     checksum de cada foto.
- **O que não é importado**: termos de notificação e outros dados de outros apps, que ficam na
  prévia como "não importado".

**Rationale**: R-fiscalizacao-020; decisão do responsável.

**Alternatives considered**: importar gravando direto, como hoje, sem as validações.

## F19 — Área de campo, barra de sincronização e backup local

**Decision**: o módulo `frontend/src/fiscalizacao/campo/` tem:
- **barra**: aparece só nas telas registradas como área de campo (R-core-027), lendo do banco local
  o estado da fila (operações não concluídas e fotos não enviadas) e a última sincronização completa;
- **sincronização completa**: um orquestrador que, em ordem, envia a fila da fiscalização e depois
  as dos participantes registrados, e baixa `sync/core`, `sync/checklists`, `sync/planejamento`,
  `sync/fiscalizacao` e os dos participantes. Roda ao tocar em "Sincronizar", ao voltar a rede e
  a cada 15 minutos com rede;
- **participantes**: os apps das câmaras registram-se no ponto de extensão "participante da
  sincronização" (rota de baixar, fila de envio, ordem), como a CATERF com `sync/caterf`;
- **backup local**: o mesmo arquivo da exportação de trabalho pendente (F12), acrescido dos dados
  locais das fiscalizações do usuário, gerado no aparelho sem rede e importável pela rota
  `importacoes/fila`.

- **pacote de campo** (R-fiscalizacao-027): o `GET sync/fiscalizacao` passa a trazer também a
  `ConfiguracaoFiscalizacao` das câmaras alcançadas e a miniatura (até 400 px, gerada no servidor no
  envio) das fotos que **não** foram tiradas no aparelho. As fotos tiradas no aparelho ficam nele em
  tamanho cheio, nas duas versões, depois do envio, durante a fiscalização e até 90 dias depois de
  finalizada; a limpeza por espaço começa pelos tamanhos cheios já enviados de fiscalizações
  finalizadas e nunca toca em foto pendente;
- **conferência de prontidão**: função pura `frontend/src/fiscalizacao/campo/prontidao.ts`, que lê o
  banco local e devolve, por atividade (próximos 7 dias) e fiscalização em andamento, a lista do que
  falta. Os apps das câmaras acrescentam verificações pelo ponto de extensão "verificação de
  prontidão" (a CATERF confere o traçado vigente da rodovia da atividade);
- **mapa-base**: as imagens de mapa ficam no cache do aplicativo quando vistas (limite de 50 MB, as
  mais antigas saem primeiro); não há download em massa de mapas, que os servidores de mapa públicos
  não permitem.

**Rationale**: R-fiscalizacao-026 e R-fiscalizacao-027; decisão do responsável (2026-10-01).

**Alternatives considered**: a barra no core, para todas as telas: mostraria sincronização onde não
há trabalho sem rede; um backup diferente da exportação: dois formatos para a mesma recuperação.

## F20 — Endereço sugerido pelas coordenadas

**Decision**: a rota `GET enderecos/reverso?lat=&lng=` do app consulta, pelo servidor, um serviço de
geocodificação reversa (Nominatim do OpenStreetMap, como hoje), com cache por coordenada arredondada
(cerca de 10 m), limite de uma consulta por segundo e identificação da AGEMS, como a política de uso
do serviço exige. Só as coordenadas saem do sistema. Sem rede ou com o serviço fora, o aparelho grava
as coordenadas no campo de endereço. Trocar de serviço muda só o adaptador.

**Rationale**: R-fiscalizacao-010; hoje cada aparelho chama o serviço público direto, sem limite nem
cache, o que pode bloquear o endereço da agência.

**Alternatives considered**: o aparelho chamar o serviço direto, como hoje: sem controle de uso.

## F18 — Migração

**Decision**: o comando `migrar_fiscalizacao` lê o dump de produção (nunca a produção), segue o
mapa `anotacoes/migracao/fiscalizacao.toml` e carrega com os mesmos identificadores, depois de core,
checklists e o app da CATERF. Regras:
- as fiscalizações ganham `origem = migrada`, sem atividade;
- o número do termo migra como está; os de C, NC, D e R são recalculados por `numerar`, que
  reproduz a conta do relatório de hoje (registros por ordem e criação; constatações pelo número
  gravado e pela criação; NCs pela constatação; determinações pela NC; nos registros avulsos da CATERF, item do PER, rodovia e KM, como o laudo), e os gravados ficam no
  `legado`; a numeração das finalizadas fica congelada;
- NCs, determinações e recomendações viram `RegistroGerado` dos tipos `nc`, `determinacao` e
  `recomendacao` do modelo da câmara, com os mesmos identificadores; as constatações (respostas com
  texto e constatações manuais) viram `RegistroGerado` do tipo `constatacao`, com identificador novo;
  as constatações manuais viram `EntradaManual`; as ocorrências da DTR geram, na carga, a
  constatação ou a NC com os dados da época (spec 008);
- a origem e a referência das NCs são reconstruídas: com `resposta_checklist_id`, `resposta:<id>`;
  sem ela, pela constatação manual da mesma unidade com NC, na ordem do número; a NC referencia a
  constatação da mesma origem, e a determinação, a NC;
- a lista de fotos vira linhas de `Foto`, na mesma ordem, com o checksum calculado na cópia;
- os relatórios em partes viram versões com `partes_legado`;
- registros que as regras novas recusariam são carregados e marcados como legado.

`--conferir` gera o relatório MIG-1 a MIG-6 da spec.

**Rationale**: seção "Migração" da spec; Princípio I.

**Alternatives considered**: migrar os números gravados como estão: são por unidade e diferem dos
documentos já emitidos a partir da segunda unidade.
