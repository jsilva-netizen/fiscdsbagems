# Research: Módulo core

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-30

Decisões técnicas do core, primeiro módulo do sistema novo. Cada uma: decisão, motivo e
alternativas descartadas. As restrições de partida são as da constituição v2.5.0 (stack
obrigatória, organização em apps, extensão para outras áreas, independência entre apps).

## R1 — Onde o código mora e onde ficam as specs

**Decision**: o sistema novo nasce num **repositório novo**, separado deste. Um repositório só para
o sistema inteiro, com `backend/` (projeto Django com um app por módulo) e `frontend/` (SPA
React/Vite). Este repositório (`fiscdsbagems`) continua com o sistema atual e com o levantamento
(spec 003 e seguintes). Quando o repositório novo for criado, ele recebe uma cópia da constituição
e das specs de módulo (004 em diante), que passam a viver lá; o catálogo da spec 003 fica aqui e é
citado por referência.

**Rationale**: decisão do responsável ("o novo código vai morar num repositório completamente
novo"; este repositório existe para descrever o sistema atual). Um repositório só para backend e
frontend mantém juntas as mudanças que atravessam os dois (API e cliente offline) e simplifica o
versionamento, sem ferir a exigência de SPA separada, que é de aplicação, não de repositório.

**Alternatives considered**:
- *Repositórios separados para backend e frontend*: dobra o trabalho de coordenação de versões da
  API e da sincronização offline, sem ganho para uma equipe pequena (Princípio V).
- *Código novo neste repositório*: descartado pelo responsável; misturaria o sistema atual, que
  continua em produção, com o novo (Princípio IV).

## R2 — Versões e ferramentas

**Decision**: Python 3.12, Django 5.2 LTS, Django REST Framework 3.16, djangorestframework-simplejwt
5.x, PostgreSQL 16, Celery 5.4 com Redis 7, django-storages com backend S3 compatível (MinIO no
ambiente local e na infraestrutura própria), pytest + pytest-django + factory_boy nos testes,
import-linter para verificar a direção das dependências entre apps. Frontend: React 18, Vite,
Dexie 4, Vitest.

**Rationale**: Django 5.2 é a versão de suporte longo vigente (suporte até 2028), o que combina com
um sistema institucional de manutenção longa (Princípio V). As demais são as da constituição ou as
escolhas mais comuns no ecossistema Django. import-linter é a ferramenta usual para verificar
regras de importação entre pacotes Python e é o jeito automático de cumprir "Independência entre
apps" (a constituição exige que a verificação de ordem valha também para o sistema novo).

**Alternatives considered**: Django 6.0 (mais novo, suporte mais curto); unittest puro (menos
legível para as matrizes de autorização parametrizadas); verificação de dependências por revisão
de código (não é verificação automática).

## R3 — Organização dos apps e direção das dependências

**Decision**: `backend/apps/<modulo>/` com um app Django por módulo da ordem da spec 003 (`core`
agora; `checklists`, `planejamento`, `fiscalizacao` e os demais depois). Cada app expõe para os
outros só dois pontos de entrada:

- `consultas.py`: funções e serializadores **somente leitura** sobre os dados do app, já com o
  escopo de acesso aplicado;
- `servicos.py`: as operações de escrita do app, usadas pelas views dele próprio e, quando uma
  regra do app dono permitir, pelas tarefas internas.

Outros apps nunca importam `models` nem `servicos` de outro app para escrever; importam só
`consultas` (leitura). Um contrato do import-linter por app impõe isso, junto com a ordem: um app
só importa apps anteriores na ordem.

**Rationale**: realiza "todo dado tem um app dono, o único que o cria e altera" e "a área que
consulta não edita" (constituição v2.4.0) e a direção única das dependências (v2.5.0) de forma
verificável em cada commit, com o banco único compartilhado.

**Alternatives considered**: apps que leem `models` uns dos outros livremente (sem garantia de que
quem consulta não escreve); serviços separados com bancos próprios (vedado pela constituição
v2.4.1).

## R4 — Usuário, papéis e vínculos extensíveis

**Decision**: modelo de usuário próprio (`AUTH_USER_MODEL`), com chave UUID e e-mail como login.
O papel é uma referência a uma tabela `Papel` (código, nome, app dono e regras de vínculo:
diretoria, câmara e entidade, cada uma obrigatória, opcional ou proibida). O core cria os cinco
papéis de hoje; um app novo acrescenta os papéis dele por migração de dados. A validação dos
vínculos (R-core-003) lê as regras do papel, não uma lista fixa no código.

**Rationale**: R-core-002, R-core-003 e R-core-023: papéis de áreas futuras (RH, financeiro,
frotas) entram sem mudar o código do core nem o que os papéis existentes alcançam.

**Alternatives considered**: `choices` fixo no campo (exige mudar o core a cada área nova);
`Group` e permissões de modelo do Django como fonte das regras (as regras de alcance por câmara,
diretoria e entidade não cabem em permissões de modelo; ficariam em dois lugares).

## R5 — Verificação em duas etapas e aparelho confirmado

**Decision**: fluxo próprio, pequeno, no core, sobre o SimpleJWT:

1. `entrar` recebe e-mail, senha e, se houver, o token do aparelho. Senha certa e aparelho
   confirmado e não revogado: emite os tokens. Senão: cria um desafio e envia o código por e-mail
   (tarefa Celery), respondendo só com o identificador do desafio.
2. `verificar` recebe desafio e código. Certo: marca o desafio usado, cria o aparelho confirmado
   (segredo aleatório; o servidor guarda só o hash) e emite os tokens e o token do aparelho.
3. Código: 6 dígitos, aleatório criptográfico, guardado só como hash, válido por 10 minutos, até 5
   tentativas por desafio; pedir outro código invalida o anterior. Limite de tentativas de entrada
   por conta e por endereço (throttling do DRF). As respostas não revelam se o e-mail existe.
4. Primeiro acesso e recuperação: o e-mail leva um link de uso único (gerador de tokens do Django)
   para definir a senha; depois, o fluxo normal de entrada com código.

**Rationale**: A-038 e R-core-005/006. Os requisitos (código por e-mail, aparelho confirmado,
tokens JWT) são pequenos e combinam primitivas do próprio Django (hash, gerador de tokens,
throttling), sem dependência extra (Princípio V).

**Alternatives considered**: django-otp com `EmailDevice` (orientado a sessão, não tem aparelho
confirmado e exigiria adaptação ao JWT); TOTP por aplicativo autenticador (o responsável escolheu
código por e-mail).

## R6 — Sessão e uso sem rede

**Decision**: token de acesso de 15 minutos e token de renovação de 30 dias, com rotação e lista de
bloqueio (recursos do SimpleJWT). Sem rede, o aplicativo trabalha com os dados locais e a fila de
envio, sem chamar o servidor; ao voltar a rede, renova o token. Se a renovação for recusada
(usuário desativado, aparelho revogado, token vencido), a sessão é encerrada e a fila local **não é
apagada**: fica guardada no aparelho até alguém com acesso enviá-la ou o administrador decidir
(Princípio II; o tratamento da fila é detalhado na spec de fiscalização). Desativar o usuário
coloca os tokens de renovação dele na lista de bloqueio.

**Rationale**: R-core-006 e R-core-007, sem degradar o offline.

**Alternatives considered**: tokens de acesso longos (desativação demoraria a valer); exigir rede
para abrir o app (viola o Princípio II).

## R7 — Isolamento por câmara e demais escopos

**Decision**: o escopo de acesso é aplicado no servidor, em todo caminho, por um componente do core:

- toda view e todo endpoint de sincronização declaram o escopo do modelo (por câmara, por
  diretoria, por entidade, ou global de referência); endpoint sem escopo declarado não sobe (teste
  de varredura das rotas);
- o escopo filtra a consulta antes de qualquer outra lógica: registro fora do escopo responde como
  inexistente (404), inclusive para escrita;
- regras: administrador, tudo; coordenador e fiscal, a própria câmara; diretor, as câmaras da
  própria diretoria, só leitura (exceto aprovações que outras specs atribuírem); prestador, a
  própria entidade; papéis de outras áreas, o que o app deles declarar;
- a matriz papel × câmara × operação de cada endpoint é testada automaticamente (R8).

**Rationale**: R-core-010 a R-core-013 e constituição, Princípio III ("fronteira de segurança, não
filtro de interface").

**Alternatives considered**: Row Level Security do PostgreSQL (é o que o sistema atual usa e onde
os defeitos se acumularam; incomum com Django, difícil de testar e de manter pela equipe);
filtrar só na interface (vedado).

## R8 — Testes de autorização

**Decision**: para cada endpoint, um teste parametrizado cobre a matriz papel × câmara (própria,
outra, sem login) × operação, com o resultado esperado lido de uma tabela declarada ao lado da
view (a mesma tabela dos contratos). Uma regra removida ou enfraquecida faz algum caso falhar. Um
teste de varredura garante que toda rota tem entrada na tabela.

**Rationale**: constituição, Princípio III, e SC-001/SC-002 da spec.

**Alternatives considered**: testes escritos um a um (esquecimento de caso não é detectado).

## R9 — Arquivos

**Decision**: django-storages com backend S3 compatível, dois repositórios: `privado` (documentos
de entidade e, depois, dos outros módulos) e `publico` (logotipos). Arquivo privado só é entregue
por endereço assinado de 5 minutos, emitido depois de verificar o acesso ao registro dono. Chaves
de arquivo aleatórias (UUID). Limites: logotipo PNG ou JPEG até 2 MB; documento PDF, PNG ou JPEG
até 20 MB; tipo conferido pelo conteúdo, não só pela extensão.

**Rationale**: R-core-018, R-core-019, A-008 e A-016; a constituição exige backend abstraído.

**Alternatives considered**: servir arquivos pelo próprio Django com verificação a cada download
(mais carga no servidor da aplicação); repositório público para tudo (vedado pelo A-016).

## R10 — Auditoria

**Decision**: modelo `RegistroAuditoria` próprio no core, gravado pelos serviços de escrita de cada
app (todo `servicos.py` audita), com tabela, registro, operação, autor (usuário ou credencial de
sistema), nome e e-mail do autor no momento, dados antes e depois (JSON) e câmara do registro, para
aplicar o escopo na consulta. A tabela não aceita alteração nem exclusão (gatilho no banco que
recusa `UPDATE` e `DELETE`). Os 19.966 registros de auditoria de produção são importados na
migração de dados.

**Rationale**: R-core-022 pede os dados inteiros antes e depois (como hoje), autor com nome e
e-mail congelados, escopo por câmara e importação do histórico atual; o formato próprio segue o do
sistema atual e facilita a importação.

**Alternatives considered**: django-auditlog (guarda só a diferença e o autor por chave, sem os dados
completos nem o escopo por câmara); django-simple-history (uma tabela de histórico por modelo;
importação do histórico atual mais trabalhosa e consulta transversal difícil).

## R11 — Sincronização dos cadastros do core

**Decision**: o core provê o protocolo de sincronização comum (constituição: o que é comum vive no
core), usado por todos os apps:

- **baixar**: `GET /sync/<app>?desde=<marca>` devolve, só do escopo do usuário, os registros
  alterados depois da marca e as remoções (tabela de remoções); a marca é do servidor, não do
  aparelho;
- **enviar**: lote de operações com o UUID gerado no aparelho; cada operação é idempotente
  (repetir não duplica) e passa pelos mesmos serviços e regras da API comum; o resultado volta por
  operação (aceita, recusada com motivo);
- conflito de alteração simultânea: vence a última recebida pelo servidor, como hoje, e as duas
  versões ficam na auditoria; duplicidade de CNPJ é recusada com motivo, para a equipe resolver.

Os detalhes da fila no aparelho são da spec de fiscalização; o core define o protocolo.

**Rationale**: R-core-021, Princípio II e "Chaves primárias em UUID, com geração no cliente".

**Alternatives considered**: marca de tempo do aparelho (relógio errado perde alterações); cada app
com o próprio protocolo (repetição e divergência entre apps).

## R12 — Credenciais de sistema para integrações

**Decision**: modelo `CredencialSistema` (nome, prefixo visível, hash da chave, escopos de leitura
permitidos, criada por, revogada em, último uso). Autenticação por cabeçalho próprio
(`Authorization: Api-Key <chave>`), só em rotas marcadas para integração; escopos só de leitura
por padrão; toda chamada auditada com a credencial como autor.

**Rationale**: R-core-024. Ainda não há integração real; o mínimo que garante limite, revogação e
rastro.

**Alternatives considered**: OAuth2 client credentials (django-oauth-toolkit): adequado quando
houver vários integradores externos; reavaliar na primeira integração real.

## R13 — Migração dos dados do core

**Decision**: scripts de migração no repositório novo leem um dump de produção (nunca a produção
diretamente) e carregam, preservando os UUIDs: diretorias, as 10 câmaras em uso, os 79 municípios,
as 9 entidades, os 2 contratos (a parte da DTR vai pelo app DTR), os usuários e os 19.966
registros de auditoria. Senhas **não** são migradas: cada usuário faz o primeiro acesso
(definição de senha e código). Usuário coordenador ou fiscal sem câmara recebe a câmara indicada
pelo responsável antes da carga. Conferência registro a registro por identificador (Princípio I,
SC-007). A conta de autenticação sem perfil (produção tem 8 contas e 7 perfis) é identificada e
decidida com o responsável antes da carga.

**Rationale**: SC-007, Princípio I e R-core-005 (o primeiro acesso já exige código).

**Alternatives considered**: migrar os hashes de senha (o formato do provedor atual exigiria outro
algoritmo no Django e não dispensaria o código; nenhum ganho).

## R14 — Envio de e-mail

**Decision**: backend SMTP do Django, apontado para o servidor de e-mail institucional, com envio
por tarefa Celery (com novas tentativas). No ambiente local, Mailpit para ver os e-mails. O código
nunca é gravado em log.

**Rationale**: R-core-005; o envio fora da requisição evita que falha de e-mail derrube a entrada.

**Alternatives considered**: serviço de e-mail transacional externo (dependência externa para um
sistema institucional; reavaliar se o servidor institucional não atender).

## R15 — Central de avisos

**Decision**: um submódulo `core/avisos/` com:
- o registro de tipos de aviso, em memória, preenchido por cada app no `AppConfig.ready`;
- os modelos `Aviso` e `PreferenciaAviso`;
- o serviço `enviar_aviso`, que:
  - resolve os destinatários (usuários, papel na câmara, papel na diretoria), só ativos;
  - cria um aviso por destinatário numa transação;
  - agenda o e-mail pela tarefa de envio (R14) depois do commit, respeitando a preferência;
- as rotas de leitura, só do próprio usuário;
- a inclusão dos avisos do usuário no `sync/core`, com a marcação de lido aceita no envio;
- uma tarefa diária que apaga os avisos lidos há mais de um ano.

O frontend mostra o contador de não lidos no cabeçalho, com a central numa tela do core. Aviso não é
auditado, porque não é registro de ato, mas o ato que o gerou é.

**Rationale**: R-core-026. Planejamento, fiscalização e processo sancionador precisam da peça, e
pela constituição o que é comum vive no core. Os avisos em tempo real não são necessários: a lista
atualiza ao abrir e na sincronização.

**Alternatives considered**:
- django-notifications-hq: modelo genérico por `GenericForeignKey` e sem tipos com regra de e-mail,
  preferências nem sincronização offline; a adaptação seria maior que a peça;
- avisos em tempo real (WebSocket, Django Channels): infraestrutura a mais sem necessidade hoje;
- uma central em cada app: repetição e divergência.
