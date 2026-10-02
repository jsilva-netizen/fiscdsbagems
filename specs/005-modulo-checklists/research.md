# Research: Módulo checklists — motor genérico de verificação

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-01

Decisões técnicas do motor de checklists. Valem, sem repetir, as do core: organização dos apps e
`consultas`/`servicos` (R3), escopo de acesso (R7), testes de autorização (R8), auditoria (R10) e
protocolo de sincronização (R11).

## K1 — Lugar do app e dependências

**Decision**: app Django `checklists` em `backend/apps/checklists/` e módulo `frontend/src/checklists/`.
Depende só do `core` (câmaras, serviços, usuários, auditoria, sincronização). Nenhum app posterior é
importado: o que vem dos outros apps chega por registro (K6, K8). Os apps posteriores leem pelas
`consultas` (K5) e, os apps de câmara, gravam a configuração inicial pelo serviço da K11.

**Rationale**: 2º na ordem da spec 003; constituição v2.5.0 ("Independência entre apps") e v2.6.0.

**Alternatives considered**: motor dentro da fiscalização: os apps de câmara e as câmaras futuras
que não usam a fiscalização comum dependeriam dela para ter catálogos.

## K2 — O modelo de catálogo é dado versionado, validado por esquema

**Decision**: `ModeloCatalogo` (câmara, código, nome, situação, origem) tem `VersaoModelo` imutáveis.
Cada versão guarda a **definição** num campo JSON (PostgreSQL `jsonb`):
- modo de aplicação;
- campos: nome, rótulo, tipo, obrigatório, padrão, valores permitidos, papel;
- respostas: código, rótulo, tipo (opção fixa, número, texto);
- saídas por resposta: código da saída registrada, condições (todas precisam valer; o modelo da DSB
  usa até três, como "gera NC" e "determinação" preenchida), mapa campo do item → dado da saída;
- formato de planilha: colunas, herança, junção, chave, colunas do catálogo.

A definição é validada em dois passos, num só módulo Python (`checklists/definicao.py`):
1. **estrutura**, por um JSON Schema versionado no app (`jsonschema`);
2. **semântica**: campos citados existem, papéis compatíveis com o tipo do campo, chave de importação
   só com campos obrigatórios, peças registradas (K6), nomes de campo únicos e no formato
   `[a-z][a-z0-9_]*`.

Mudar o modelo cria uma versão nova (R-checklists-017); nenhuma versão é alterada.

**Rationale**: R-checklists-015 e R-checklists-017. A definição muda em bloco e precisa ser
congelada por versão: um documento validado é mais simples que tabelas de campos, respostas e saídas
duplicadas a cada versão.

**Alternatives considered**:
- tabelas normalizadas (campo, resposta, saída por versão): muitas linhas copiadas a cada versão,
  sem consulta que precise delas separadas;
- EAV (atributos genéricos em linhas): difícil de validar e de ler.

## K3 — Valores do item

**Decision**: `VersaoItem.valores` (`jsonb`) guarda os valores dos campos da versão do modelo em que
a versão do item foi criada. O mesmo módulo da K2 valida tipo, obrigatoriedade, valores permitidos e
aplica os padrões, no formulário, na importação, na cópia e na configuração inicial. Tipos de campo:
texto curto (até 500 caracteres), texto longo (até 20 mil), inteiro, sim/não, lista de valores, lista
de linhas.

**Rationale**: R-checklists-003; o motor não tem campo fixo de conteúdo.

**Alternatives considered**: colunas genéricas (`texto1`, `texto2`...): limite arbitrário e nomes sem
sentido.

## K4 — Item estável, versões imutáveis e vigência

**Decision**:
- `Item`: identidade, catálogo, ordem e data de retirada. Mudar a ordem altera só o item.
- `VersaoItem`: número (1, 2, ...), versão do modelo, valores, `vigente_desde`, `vigente_ate` (vazio
  enquanto vigente), autor, origem (tela, importação, cópia, configuração, migração) e a marca
  `repeticao` (só na migração).
- Editar: no serviço, com o item travado (`select_for_update`), encerra a versão vigente no instante
  da gravação e cria a seguinte. Retirar: encerra a vigente e marca o item. Nenhum outro campo de
  uma versão muda depois de criada; o serviço é o único caminho de escrita, e um teste confere que
  não há outro.
- Restrições no banco: único (item, número); `vigente_ate` maior que `vigente_desde`; no máximo uma
  versão sem `vigente_ate` por item (índice único parcial).
- Versão vigente num instante: `vigente_desde <= instante < vigente_ate` (ou sem fim).

**Rationale**: R-checklists-004, R-checklists-005 e A-024. As restrições protegem a integridade sem
pôr regra de negócio em função do banco (A-005).

**Alternatives considered**:
- histórico por biblioteca de auditoria de linhas (`django-simple-history`): guarda alterações, mas
  a regra é não alterar; a versão precisa ser entidade própria, apontada pelas respostas;
- vigência por data (sem hora): duas edições no mesmo dia teriam a mesma vigência.

## K5 — Consultas para os outros apps

**Decision**: `checklists/consultas.py` oferece, sempre com o escopo do usuário ou da câmara:
- `catalogos_disponiveis(camara, servicos, modo)`: ativos, com item vigente, modelo completo
  (R-checklists-002, R-checklists-019);
- `versoes_vigentes(catalogo_id, em, contexto)`: aplica a aplicabilidade pelos valores de contexto,
  com o específico vencendo o genérico, e devolve agrupamento e ordem (R-checklists-014);
- `versao(versao_id)` e `versoes(ids)`: por identificador, inclusive encerradas;
- `declaracao(versao_id)`: respostas e saídas da versão do modelo da versão do item, já com os
  valores do item aplicados às condições e aos dados das saídas.

A fiscalização interpreta as saídas (F3 da spec 007); o motor só entrega a declaração.

**Rationale**: R-checklists-005, R-checklists-013; R3 do core.

**Alternatives considered**: a fiscalização ler os modelos do motor direto: fere R3 e espalha a regra
da aplicabilidade.

## K6 — Peças registradas pelos apps

**Decision**: registro em memória `checklists/pecas.py`, carregado no `AppConfig.ready` dos apps:
- `registrar_saida(codigo, app, nome, dados, depende_de=None)`: `dados` é a lista de (nome, tipo)
  que a saída recebe (ex.: `fiscalizacao.determinacao`: texto, prazo em dias); `depende_de` é o código
  de outra saída que precisa sair da mesma resposta junto com ela (ex.: a determinação depende da NC).
  A validação do modelo (K2) recusa a resposta que declara a dependente sem a outra ou com condições
  que não incluem as dela (R-checklists-013);
- `registrar_contexto(codigo, app, nome, tipo)` (ex.: `caterf.rodovia_fiscalizacao`);
- `registrar_modo(codigo, app, nome, tipo)`: `tipo` é um dos dois modos do motor, `lista` ou
  `avulso` (R-checklists-012); a fiscalização registra a vistoria por unidade, a CATERF a ocorrência.

Os códigos são prefixados pelo app. O modelo guarda só os códigos. Um modelo que cita peça não
registrada é marcado **incompleto** na leitura (calculado, não gravado), e os catálogos dele saem das
consultas de registro novo (R-checklists-019). A rota `GET checklists/pecas` lista o que está
registrado para a tela de montagem.

**Rationale**: R-checklists-019; o mesmo padrão dos pontos de extensão da fiscalização (F7) e dos
destinos do planejamento (P2).

**Alternatives considered**: tabela de peças no banco: as peças são código dos apps, não dado; uma
tabela ficaria fora de sincronia com o que está instalado.

## K7 — Importação por planilha, em duas etapas

**Decision**:
1. **Prévia**: envio de `.xlsx` (openpyxl, só leitura, sem fórmulas avaliadas) ou `.csv`, até 5 MB e
   5 mil linhas. O serviço aplica o formato da versão do modelo (herança, junção, chave), valida cada
   linha pela K3, compara com as versões vigentes pela chave e grava uma `ImportacaoPlanilha` com a
   prévia por linha (novo, nova versão, sem mudança, erro com motivo) e os ausentes, mais a impressão
   digital do estado do catálogo.
2. **Confirmação**: com a lista de ausentes a retirar, aplica tudo numa transação, com o catálogo
   travado. Se o catálogo mudou desde a prévia (impressão digital diferente), responde 409 e pede
   nova prévia.

O arquivo modelo é gerado pela definição (openpyxl), com as linhas de exemplo; células de texto que
começam com `=`, `+`, `-` ou `@` são gravadas como texto (injeção de fórmula). Sem mudança de
conteúdo, nenhuma versão é criada. A comparação usa os valores normalizados (espaços nas pontas,
quebras de linha).

**Rationale**: R-checklists-006; SC-002; mesma biblioteca do motor de documentos (constituição,
stack).

**Alternatives considered**: prévia só na tela, sem gravar: a confirmação poderia aplicar outra
coisa que a mostrada; importação em segundo plano (Celery): 5 mil linhas cabem numa requisição.

## K8 — Sincronização para o aparelho

**Decision**: `GET sync/checklists?desde=` (protocolo do core, sem `POST`, porque a manutenção é só
com rede) entrega:
- as versões de modelo dos catálogos alcançados;
- os catálogos ativos e desativados das câmaras alcançadas;
- os itens e as versões **vigentes** desses catálogos;
- as versões **em uso**: encerradas, mas citadas por registros do alcance do usuário.

As câmaras alcançadas e as versões em uso vêm da câmara do usuário e de um registro,
`checklists.alcance.registrar_alcance_aparelho(app, funcao)`, em que os apps que aplicam catálogos
dizem, para um usuário, as câmaras e as versões a mais (a fiscalização informa as câmaras das
fiscalizações em que ele está na equipe e as versões citadas nelas). O motor não conhece os apps.

**Rationale**: R-checklists-008; A-026 (escopo por câmara); viagem conjunta (servidor de outra câmara
escalado precisa do catálogo da fiscalização em que está).

**Alternatives considered**:
- baixar todas as versões da câmara: carrega 243 versões antigas sem uso;
- a fiscalização mandar os catálogos na sincronização dela: duplicaria a regra do motor no app que
  aplica.

## K9 — Escopos de acesso

**Decision**:
- **catálogos e itens**: câmara do catálogo (coordenador e fiscal leem e escrevem); diretoria
  (diretor lê); administrador, tudo; prestador, nada;
- **modelos**: os da câmara para escrita (coordenador, fiscal, administrador); a **estrutura** dos
  modelos de todas as câmaras para leitura de coordenador e fiscal, para copiar (R-checklists-018),
  sem catálogos nem itens;
- **importação**: só catálogos da câmara de quem importa; linha de outra câmara é erro na prévia.

A matriz está em [contracts/matriz-acesso.md](./contracts/matriz-acesso.md) e é testada caso a caso
(R8 do core).

**Rationale**: R-checklists-007, R-checklists-018; A-026.

**Alternatives considered**: modelos visíveis só da própria câmara: impediria a cópia sem o
administrador.

## K10 — Cópia entre câmaras

**Decision**: serviço `copiar_modelo(versao_origem, camara_destino, usuario, com_catalogos=False)`:
cria `ModeloCatalogo` na câmara de destino, com `VersaoModelo` 1 igual à de origem e `copiado_de`
apontando para a versão de origem. Com `com_catalogos` (só administrador), copia os catálogos do
modelo com as versões vigentes como itens novos (versão 1, `copiado_de` na versão do item), sujeitos à
regra de serviço e câmara; catálogo cujos serviços não são da câmara de destino é recusado e listado.
Tudo numa transação, auditado.

**Rationale**: R-checklists-018; constituição v2.6.1 (cópia independente).

**Alternatives considered**: modelo compartilhado com "herança": mudança na origem chegaria à cópia.

## K11 — Configuração inicial entregue pelo app da câmara

**Decision**: `servicos.aplicar_configuracao_inicial(camara, pacote, app)`, com
`pacote = {"modelos": [{"codigo", "nome", "definicao"}]}`:
- valida todas as definições (K2) antes de gravar; uma inválida recusa o pacote;
- cria `ModeloCatalogo` e `VersaoModelo` 1 só para os códigos que a câmara não tem, com
  `entregue_por_app`;
- não altera modelo existente; devolve criados e existentes; audita.

**Rationale**: R-checklists-020; research S4 da spec 009.

**Alternatives considered**: fixtures do Django: gravariam sem validação nem auditoria.

## K12 — Telas geradas pela definição

**Decision**: o frontend do motor tem cinco telas genéricas: montagem do modelo (com prévia do
formulário e da planilha, validada pela rota de validação do servidor), catálogos, itens (formulário
gerado pela definição), importação (prévia e confirmação) e histórico. O formulário é montado por um
componente que lê a definição e escolhe o controle pelo tipo do campo. As telas entram nas
Definições pelo registro de contribuições do core (R-core-025). A escolha do item na aplicação
(agrupamento, aplicabilidade, escolha complementar) é feita no aparelho por funções puras de
`frontend/src/checklists/aplicacao.ts`, sobre os dados sincronizados, com os mesmos casos de teste da
consulta `versoes_vigentes` do servidor (JSON compartilhado entre pytest e Vitest).

**Rationale**: R-checklists-014, R-checklists-016; sem rede, o aparelho precisa filtrar e agrupar sem
o servidor; os casos compartilhados impedem divergência (como na consolidação da spec 007, F4).

**Alternatives considered**: validação da definição também em TypeScript: a montagem é só com rede,
então basta o servidor.

## K13 — Garantia de que o motor não cita câmara

**Decision**: um teste varre o código do app (`backend/apps/checklists/`, exceto `migracao/`, e
`frontend/src/checklists/`) e falha se encontrar sigla de câmara ou diretoria (lida do cadastro de
referência do core) ou nome de campo dos modelos de hoje (`pergunta`, `frente`, `rodovia`, `per`...).
Outro teste usa um app de teste (`backend/tests/apps/camara_teste/`) que registra uma saída e um
contexto; um modelo montado pela API com essas peças é usado de ponta a ponta sem mudança no motor
(SC-008, SC-009).

O código de migração (`checklists/migracao/`) fica fora da varredura: lê o esquema do sistema atual,
cujos nomes trazem a câmara (`tipos_ocorrencia_dtr`), e é usado uma vez, na virada.

**Rationale**: R-checklists-016; constituição v2.6.2 exige o teste automatizado.

**Alternatives considered**: revisão manual: não impede regressão.

## K14 — Migração

**Decision**: comando `migrar_checklists --dump <arquivo> [--conferir]`, que lê o dump (nunca a
produção) e segue os mapas `checklists.toml` e, para os campos da rodovia, `dtr.toml` (os destinos
deles são modelos do motor, e quem grava é o dono). Ordem e pré-condições na seção "Migração" da spec.
Regras:
- **câmara → modelo**: um arquivo de configuração da migração, fora do código do app, diz o código
  do modelo de cada câmara (`checklist_unidade` para CATESA e CATERS, o código do modelo da CATERF
  para as ocorrências); a migração não começa se faltar algum modelo;
- **tipos de unidade**: viram catálogos com o mesmo identificador; serviços convertidos para os do
  core; nome ou código vazio ou repetido resolvido pela tabela de ajustes, revisada antes da carga;
- **itens da DSB**: agrupamento pela chave atual (tipo + ordem, ou pergunta), em ordem de criação;
  cada linha vira uma versão com o mesmo identificador; vigência da linha até a seguinte; versão
  idêntica à anterior mantida com `repeticao`; a ordem do item é a da versão mais recente;
- **tipos de ocorrência da DTR**: um catálogo criado na migração, no modelo da CATERF, com o serviço
  de rodovias; cada tipo vira item e versão 1 com o mesmo identificador;
- **conferência** (`--conferir`): MIG-1 a MIG-6 da spec, contagem de catálogos por câmara e, antes do
  descarte, as conferências de `created_date` e de `gera_nc`.

**Rationale**: seção "Migração" da spec; Princípio I.

**Alternatives considered**: recriar os itens sem os identificadores de produção: quebraria as 3.454
respostas que apontam para eles.
