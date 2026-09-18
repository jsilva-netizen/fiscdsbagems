# Feature Specification: Camada de Abstração de Acesso a Dados

**Feature Branch**: `migracao-sisreg`

**Created**: 2026-09-18

**Status**: Draft

**Input**: User description: "Fase 1 da migração para o SISREG: introduzir uma camada de abstração de acesso a dados no frontend React/Vite e remover toda chamada direta ao Supabase do código da aplicação. O app continua rodando sobre o Supabase ao final desta fase — a implementação da camada apenas encapsula o cliente atual. O objetivo é que, na fase seguinte, trocar o backend para a API Django seja uma troca de implementação por trás dessa camada, sem espalhar mudança pelo app. Requisitos: preservação funcional total (nenhuma regressão visível ao usuário), preservação integral da operação offline com Dexie/IndexedDB e o outbox de sincronização, e verificação de que o comportamento permaneceu idêntico ao atual."

## Clarifications

### Session 2026-09-18

- Q: Quais fluxos exatamente a suíte automatizada precisa cobrir para a fase ser considerada concluída? → A: Ciclo offline completo + todo fluxo que grava dado + um caminho de leitura por módulo (cobertura ponderada por risco)
- Q: Que salvaguarda deve impedir que a suíte seja executada por engano contra dados legítimos? → A: Duas camadas — trava de execução exigindo confirmação explícita da base alvo, mais permissão restrita do usuário de teste no banco
- Q: Fluxo que depende de hardware (foto com GPS) conta como coberto se o teste simular câmera e localização? → A: Sim — simular conta como cobertura completa; o objeto da verificação é o comportamento da aplicação, não o hardware
- Q: Comportamento defeituoso descoberto durante a refatoração deve ser reproduzido ou corrigido? → A: Preservar fielmente como regra, com exceção para defeito que perca ou corrompa dado, que é corrigido nesta fase
- Q: A camada deve registrar as operações que executa? → A: Sim — todas as operações (tipo, alvo, duração, resultado), com o registro ativável por configuração e desligado por padrão

## User Scenarios & Testing *(mandatory)*

Esta fase é deliberadamente invisível ao usuário final. Seu valor não está em algo novo que
o usuário passe a fazer, e sim em **nada mudar para ele** enquanto o sistema ganha a
capacidade de trocar de origem de dados. As histórias abaixo refletem isso: as duas
primeiras são de preservação, e a terceira é a capacidade que justifica a fase existir.

### User Story 1 - Fiscal em campo não percebe diferença alguma (Priority: P1)

Um fiscal sai para uma vistoria em área sem sinal. Ele abre o sistema, registra a
fiscalização, percorre o checklist da unidade, tira fotos georreferenciadas e encerra o
trabalho — tudo offline. Ao voltar para uma área com conectividade, o material sincroniza
e aparece no sistema exatamente como sempre apareceu. Do ponto de vista dele, nenhuma
alteração aconteceu no produto.

**Why this priority**: é o caso de uso mais crítico do sistema e o mais sensível a
regressão. A constituição do projeto o define como requisito, não recurso. Se esta
história falhar, a fase inteira está errada, independentemente do que mais tenha
funcionado.

**Independent Test**: teste automatizado ponta a ponta que simula o dispositivo sem
conectividade, executa o roteiro completo de campo, restabelece a conexão e verifica que
todos os registros, fotos e respostas de checklist chegaram íntegros — com o comportamento
da versão atual como referência.

**Acceptance Scenarios**:

1. **Given** um dispositivo sem conectividade, **When** o fiscal registra uma fiscalização
   com ocorrências, respostas de checklist e fotos, **Then** todos os itens ficam
   preservados localmente e a interface se comporta exatamente como antes da mudança.
2. **Given** registros pendentes na fila local de sincronização, **When** a conectividade
   é restabelecida, **Then** todos são enviados e confirmados, sem perda, duplicação ou
   mudança de ordem em relação ao comportamento atual.
3. **Given** uma fila de sincronização criada **antes** da mudança, **When** o usuário
   atualiza para a versão com a camada de abstração, **Then** os registros pendentes
   continuam sendo sincronizados normalmente, sem intervenção manual.

---

### User Story 2 - Fluxos online continuam idênticos (Priority: P2)

Fiscais, coordenadores, administradores e prestadores usam o sistema conectados —
consultando fiscalizações, gerando autos de infração e termos de notificação, anexando
documentos, solicitando relatórios, acompanhando análises assistidas por IA e
administrando cadastros. Todos esses fluxos continuam funcionando da mesma forma, com as
mesmas permissões de acesso e as mesmas mensagens de erro.

**Why this priority**: cobre a maior superfície do sistema. É menos crítica que a P1
apenas porque uma falha aqui é imediatamente visível e corrigível, enquanto uma falha no
offline pode destruir dado de campo silenciosamente.

**Independent Test**: percorrer cada módulo do sistema conectado, comparando resultado,
permissões e tratamento de erro com a versão atual.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado de qualquer perfil, **When** ele percorre os fluxos do
   seu módulo, **Then** os resultados são idênticos aos da versão atual.
2. **Given** um usuário sem permissão sobre determinado registro, **When** ele tenta
   acessá-lo, **Then** o acesso é negado exatamente como antes — nenhuma regra de
   isolamento entre câmaras técnicas é afrouxada ou endurecida pela mudança.
3. **Given** uma operação que falha (rede indisponível, arquivo inválido, permissão
   negada), **When** o erro ocorre, **Then** o usuário vê a mesma mensagem e o mesmo
   comportamento de recuperação de hoje.
4. **Given** uma solicitação de relatório ou de análise assistida por IA, **When** o
   processamento é disparado, **Then** o acompanhamento de progresso e o resultado final
   permanecem inalterados.

---

### User Story 3 - A origem dos dados passa a ter um único ponto de troca (Priority: P3)

A equipe de desenvolvimento precisa poder substituir a origem dos dados do sistema sem
percorrer o aplicativo inteiro. Ao fim desta fase, toda comunicação com o backend passa
por um ponto único e identificável, de modo que a fase seguinte — apontar para a API
Django — seja uma troca de implementação, não uma reescrita distribuída.

**Why this priority**: é a razão de existir da fase, mas vem em terceiro porque só tem
valor se as duas anteriores forem verdadeiras. Uma camada elegante que quebre o offline
não serve para nada.

**Independent Test**: verificar que nenhum módulo da aplicação, fora da camada de dados,
referencia a origem dos dados; e demonstrar, com uma implementação alternativa mínima de
teste, que substituir a origem não exige alteração em nenhuma tela.

**Acceptance Scenarios**:

1. **Given** o código da aplicação, **When** se busca por referências diretas à origem
   dos dados fora da camada, **Then** não há nenhuma ocorrência.
2. **Given** uma implementação alternativa da camada, **When** ela é ativada no lugar da
   atual, **Then** nenhum arquivo de tela, componente ou fluxo precisa ser modificado.
3. **Given** um desenvolvedor novo no projeto, **When** ele precisa entender de onde vêm
   os dados de uma tela, **Then** encontra um único lugar a consultar.

---

### Edge Cases

- **Vazamento pela borda**: um módulo que continue acessando a origem de dados diretamente
  anula o objetivo da fase sem quebrar nada visivelmente. É preciso haver forma de detectar
  isso de modo automático e contínuo, não por inspeção manual.
- **Operações que não são leitura/escrita comum**: upload de arquivos, chamadas a
  procedimentos remotos e disparo de processamento assíncrono seguem caminhos diferentes do
  CRUD. Se ficarem de fora da camada, a fase 2 falha justamente nos pontos mais complexos.
- **Autenticação e expiração de sessão**: renovação de credencial e logout por expiração
  precisam continuar se comportando igual, inclusive durante uso prolongado offline.
- **Fila de sincronização em trânsito**: usuários que atualizarem o aplicativo com
  registros pendentes na fila local não podem perdê-los nem ver o formato da fila mudar sob
  seus pés.
- **Dados em cache**: o sistema mantém cache de consultas em memória. A camada não pode
  alterar quando o cache é invalidado, sob pena de mudar o que o usuário vê sem que nenhuma
  consulta tenha mudado.
- **Concorrência e ordem**: operações disparadas em sequência rápida (salvar e navegar,
  por exemplo) precisam manter a mesma ordem e o mesmo resultado de hoje.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Todo acesso a dados remotos feito pela aplicação MUST ocorrer através da
  camada de abstração, sem exceção.
- **FR-002**: Nenhum módulo da aplicação, fora da camada, MUST referenciar ou ter
  conhecimento da origem dos dados.
- **FR-003**: A camada MUST cobrir todas as categorias de comunicação com o backend
  listadas em *Key Entities*, e não apenas leitura e escrita de registros.
- **FR-004**: O comportamento observável pelo usuário MUST permanecer idêntico ao da versão
  atual em todos os fluxos — resultados, permissões, mensagens de erro e tempos de resposta
  perceptíveis.
- **FR-005**: A operação offline MUST ser integralmente preservada, incluindo o
  armazenamento local, a fila de sincronização e a captura de fotos sem conectividade.
- **FR-006**: Filas de sincronização criadas antes da mudança MUST continuar processáveis
  após a atualização, sem intervenção do usuário e sem perda de registros.
- **FR-007**: O sistema MUST dispor de verificação automática que detecte, a cada
  alteração de código, qualquer acesso à origem de dados feito fora da camada.
- **FR-008**: A substituição da implementação da camada MUST ser possível sem alterar
  nenhum arquivo de tela, componente ou fluxo da aplicação.
- **FR-009**: As regras de visibilidade e permissão atualmente aplicadas MUST permanecer
  exatamente com o mesmo efeito, sem afrouxamento nem endurecimento.
- **FR-010**: A equivalência de comportamento entre a versão atual e a versão com a camada
  MUST ser demonstrada por uma suíte de testes automatizados ponta a ponta, com a seguinte
  cobertura obrigatória, ponderada por risco:
  - o **ciclo completo de trabalho offline** — registro sem conectividade, acúmulo na fila
    local e sincronização ao reconectar;
  - **todo fluxo que grave dado**, em qualquer módulo e para qualquer perfil de usuário;
  - **ao menos um caminho de leitura por módulo**.

  A assimetria é deliberada: falha em escrita pode corromper ou destruir registro de
  fiscalização silenciosamente, enquanto falha em leitura é imediatamente visível e não
  danifica dado.
- **FR-011**: Ao final da fase, o sistema MUST continuar operando sobre a origem de dados
  atual, em pleno funcionamento — esta fase não troca o backend.
- **FR-012**: A suíte de testes MUST ser executável automaticamente a cada alteração de
  código, sem depender de disciplina humana para produzir resultado confiável.
- **FR-013**: A suíte MUST cobrir explicitamente o cenário de fila de sincronização criada
  antes da mudança (FR-006), por ser o caso com maior risco de perda silenciosa de dado de
  campo.
- **FR-014**: A suíte MUST permanecer válida como critério de aceite para as fases
  seguintes da migração, servindo para verificar a implementação futura contra o mesmo
  comportamento de referência.
- **FR-015**: A suíte MUST remover automaticamente, ao final de cada execução, todo dado
  que tenha criado — registros, arquivos e vínculos — sem depender de ação manual.
- **FR-016**: A limpeza MUST ocorrer mesmo quando a execução falha ou é interrompida, e
  MUST ser verificável: ao final, nenhum resíduo da execução permanece na base.
- **FR-017**: A suíte MUST NOT remover nem alterar qualquer dado que não tenha criado. O
  alcance da limpeza é restrito ao que a própria execução produziu.
- **FR-018**: A suíte MUST se recusar a executar sem confirmação explícita de qual base
  está sendo usada. Na ausência dessa confirmação, a execução falha de imediato, antes de
  tocar em qualquer dado.
- **FR-019**: O usuário de teste MUST ter, no próprio banco de dados, permissão restrita
  aos registros que ele mesmo criou — de forma que nem um defeito na rotina de limpeza
  consiga alcançar dado legítimo de fiscalização. Esta é a garantia de última instância de
  FR-017: ela não depende da correção do código de teste.
- **FR-020**: Fluxos que dependem de recursos do dispositivo — câmera e localização —
  MUST ser considerados plenamente cobertos quando o teste simula esses recursos. O objeto
  da verificação é o comportamento da aplicação: se a foto entra na fila local, se as
  coordenadas são gravadas junto ao registro e se o envio ocorre na sincronização. O
  hardware do aparelho não é afetado pela refatoração e não precisa ser exercitado.
- **FR-021**: Comportamento defeituoso identificado durante a fase MUST ser reproduzido
  fielmente pela camada e registrado para correção em trabalho próprio. Refatorar e
  corrigir ao mesmo tempo destrói a capacidade de atribuir qualquer diferença observada à
  refatoração, que é a única garantia de que nada regrediu.
- **FR-022**: Exceção a FR-021 — defeito que cause **perda ou corrupção de dado** MUST ser
  corrigido dentro desta fase. O desvio em relação ao comportamento anterior MUST ser
  documentado de forma explícita e refletido na suíte, para não ser confundido com
  regressão.
- **FR-023**: A camada MUST ser capaz de registrar cada operação que realiza — tipo, alvo,
  duração e resultado. O registro MUST ser ativável por configuração e MUST vir desligado
  por padrão, de modo a não impor custo à operação normal.
- **FR-024**: O registro MUST NOT expor conteúdo de dado pessoal ou sigiloso. Ele
  identifica a operação e seu alvo, não os valores trafegados — restrição necessária num
  sistema que manipula dados de pessoas e de processos administrativos.

### Key Entities

As categorias de comunicação com o backend que a camada precisa cobrir. Esta lista é o
critério de completude da fase: se alguma ficar de fora, a fase 2 encontra o problema no
pior momento.

- **Consulta de registros**: leitura de dados, com filtros, ordenação e paginação.
- **Escrita de registros**: criação, alteração e remoção, incluindo operações em lote.
- **Arquivos**: envio e obtenção de fotos de evidência e documentos, com controle de acesso.
- **Identidade e sessão**: autenticação, encerramento de sessão, renovação de credencial e
  identificação do usuário corrente.
- **Procedimentos remotos**: operações executadas no servidor que não correspondem a
  leitura ou escrita simples de uma tabela.
- **Processamento assíncrono**: solicitação, acompanhamento de progresso e obtenção de
  resultado de tarefas longas, como relatórios e análises assistidas por IA.
- **Sincronização offline**: o envio dos registros acumulados na fila local e a confirmação
  de persistência remota.
- **Alcançabilidade**: a verificação de que o backend está acessível, que é o gatilho de todo
  o comportamento offline. *(Acrescentada durante o planejamento: o levantamento revelou que
  a detecção de conectividade consulta endereços do backend atual em dois pontos do código.
  Sem esta categoria, a fase 2 faria o aplicativo se considerar permanentemente offline, sem
  emitir erro algum — falha silenciosa com acúmulo de fila não sincronizada.)*

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos fluxos verificados apresentam comportamento idêntico ao da versão
  atual — zero regressão observável pelo usuário.
- **SC-002**: O número de pontos do código, fora da camada de dados, que conhecem a origem
  dos dados é **zero** (hoje: 7 arquivos acessam identidade/sessão, 19 ou mais acessam
  arquivos, além dos acessos a registros distribuídos pelas telas).
- **SC-003**: Um roteiro completo de trabalho de campo executado offline preserva 100% dos
  registros, fotos e respostas de checklist após a sincronização.
- **SC-004**: Substituir a implementação da camada exige alteração em **um único ponto** do
  código, sem tocar em nenhuma tela ou componente.
- **SC-005**: Qualquer tentativa futura de acessar a origem de dados por fora da camada é
  detectada automaticamente, sem depender de revisão humana.
- **SC-006**: Um desenvolvedor sem familiaridade com o projeto consegue identificar a
  origem dos dados de qualquer tela consultando um único lugar.
- **SC-007**: Existe cobertura automatizada para 100% dos fluxos de escrita do sistema, para
  o ciclo completo de trabalho offline e para ao menos um caminho de leitura por módulo,
  executada a cada alteração de código (hoje: nenhuma cobertura automatizada existe).
- **SC-008**: Uma regressão introduzida propositalmente em qualquer fluxo crítico é
  detectada pela suíte sem intervenção humana — a verificação prova que verifica.

## Assumptions

- **A origem de dados não muda nesta fase.** O sistema continua operando sobre o backend
  atual ao final dela; a camada apenas encapsula o que já existe. Trocar para a API Django
  é escopo da fase seguinte.
- **Nenhuma alteração de schema** é feita nesta fase, conforme registrado nas decisões
  operacionais do assessment.
- **O armazenamento local offline permanece como está** (Dexie/IndexedDB), por decisão
  registrada na constituição. Apenas o transporte de sincronização será trocado, e isso
  ocorre na fase seguinte.
- **Autenticação, arquivos e processamento assíncrono entram na camada agora.** Embora
  sigam caminhos diferentes do CRUD, deixá-los de fora faria a fase 2 falhar exatamente
  nos pontos mais difíceis. Assumido como escopo, apesar de não estar explícito na
  descrição original.
- **A verificação de escrita ocorre na base de produção**, com usuário dedicado de teste,
  conforme decidido no assessment — o que exige que os dados de teste sejam identificáveis
  e removíveis.
- **A suíte faz limpeza automática ao final de cada execução** (FR-015 a FR-017), em vez de
  operar sobre um ambiente isolado. Decisão consciente, tomada porque uma suíte que roda a
  cada alteração de código geraria volume incompatível com a exigência de migração integral
  e verificável do assessment. A contrapartida é que a limpeza passa a ser código crítico:
  ela escreve e apaga na base real, e uma falha nela pode tanto deixar resíduo quanto —
  no pior caso — atingir dado legítimo. Daí FR-017 restringir seu alcance ao que a própria
  execução criou.
- **Não existe infraestrutura de testes no projeto hoje** (nenhum arquivo de teste, nenhuma
  ferramenta configurada). Construir a suíte ponta a ponta exigida por FR-010 faz parte
  desta fase, e não de uma iniciativa separada. **Isso amplia a fase de forma relevante**:
  parte substancial do esforço será gasta em infraestrutura de teste antes da primeira
  linha de refatoração. Foi uma escolha consciente, por dois motivos — o fluxo offline é o
  único ponto onde uma regressão pode destruir dado de campo em silêncio, e a suíte
  permanece válida para as fases seguintes, inclusive como critério de aceite da virada.
- **A suíte precisa exercitar o comportamento offline de verdade**, com simulação de perda
  e retomada de conectividade, e não apenas chamadas diretas à camada — do contrário não
  cobre o caso que motivou a escolha.
- **O trabalho ocorre na branch `migracao-sisreg`**, com a produção congelada para
  funcionalidades novas, conforme a estratégia aprovada no `decision.md`.
- **A interface do usuário não é alterada** — nem visualmente, nem em comportamento. Esta
  fase não é oportunidade de melhoria de UX.
