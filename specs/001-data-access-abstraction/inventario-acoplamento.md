# Inventário de Acoplamento — leitura arquivo a arquivo

**Feature**: Camada de Abstração de Acesso a Dados
**Date**: 2026-09-18
**Método**: leitura integral do código, não busca por padrão. Registra o que cada arquivo
faz, como depende do backend atual, e o que precisa mudar.

**Escopo**: 49 arquivos, 27.614 linhas.

**Estado**: ✅ leitura completa dos 49 arquivos acoplados.

| Lote | Conteúdo | Linhas | Estado |
|---|---|---|---|
| 1 | Infraestrutura (sessão, conectividade, chamada de função) | ~750 | ✅ concluído |
| 2 | Bibliotecas de domínio CATERS/CATESA | ~740 | ✅ concluído |
| 3a | `syncEngine.ts` (núcleo offline — parte 1) | 2.882 | ✅ concluído |
| 3b | `repository.ts` (núcleo offline — parte 2) | 2.460 | ✅ concluído |
| 4 | Utilitários (`storageCleanup`, `numerationHelper`) | ~470 | ✅ concluído |
| 5 | Componentes | ~2.180 | ✅ concluído |
| 6 | Páginas (43 arquivos, 18 com acoplamento direto lidas por completo/seção relevante) | ~18.100 | ✅ concluído |

## Resumo executivo do levantamento completo

**49 arquivos, ~27.600 linhas, lidos integralmente** (não por busca de padrão). Achados que
mudam o plano original, por ordem de gravidade:

1. **Cinco pontos do núcleo offline toleram desalinhamento entre código e schema**, fazendo
   parsing de mensagem de erro do PostgREST para descobrir e descartar colunas ausentes.
   Nenhuma dessas mensagens existe no Django — comportamento muda silenciosamente se não
   tratado conscientemente.
2. **Nomes de bucket e de coluna são descobertos em tempo de execução**, não conhecidos
   estaticamente: até 14 candidatos de bucket tentados em sequência, uma chamada real a
   `listBuckets()`, e até 6 candidatos de nome de coluna inferidos a partir do primeiro
   registro retornado. A auditoria de schema/storage antes da fase de dados **precisa** ser
   feita contra o projeto Supabase real, nunca só a partir do código-fonte ou das migrations.
3. **`itens_checklist` é append-only por design** — updates e deletes inserem linhas novas,
   nunca alteram em lugar. É o achado de modelagem mais consequente: existe para que
   respostas antigas continuem referenciando o texto vigente à época da vistoria. Uma
   migração ingênua para "update in place" seria regressão silenciosa e sutil.
4. **Duas noções independentes de bucket "público vs. assinado" convivem para o mesmo
   bucket** (`fotos_fiscalizacao`) em arquivos diferentes — sintoma de que o regime de
   acesso de cada bucket precisa ser confirmado contra a configuração real, não inferido.
5. **Máquinas de estado de negócio (autos de infração, termos de notificação, remessas de
   IA) vivem implícitas dentro de componentes de UI**, replicadas em pelo menos três
   arquivos cada, nunca centralizadas — a fase 2 precisa dar a elas um lar explícito nos
   módulos de domínio.
6. **RPCs de três naturezas diferentes** precisam de tratamento distinto no Django: geração
   atômica de numeração sequencial (`gerar_numero_auto`, `gerar_numero_am`,
   `finalizar_fiscalizacao`, `reabrir_fiscalizacao`), administração privilegiada
   (`admin_delete_user`, `admin_delete_user_by_email`), e agregação pesada de relatório
   (`obter_resumo_indicadores`) — a última é a mais cara de reproduzir fielmente.
7. **Auditoria/histórico de alterações** (`audit_logs`, JSONB + filtro PostgREST complexo)
   é categoria própria, sem equivalente óbvio no Django, e não estava prevista no contrato
   original de 8 categorias.
8. **`ExportarImportar.jsx` já é uma ferramenta funcional de exportação/reimportação entre
   instâncias**, com remapeamento de ID — vale avaliar seu reaproveitamento para a migração
   de dados real da fase 2/3, em vez de reconstruir do zero.
9. **Numeração sequencial (TN, AM, auto de infração) não é atômica em nenhum dos três
   casos** — TN é calculado no cliente sem proteção; AM e auto de infração usam RPC, mas a
   RPC em si faz `SELECT COUNT(*) + 1` sem trava, então não protege contra corrida de
   verdade. *(Corrigido após ler o SQL real das RPCs — ver
   `rpcs-funcoes-e-triggers-postgres.md` e `debitos-tecnicos-e-inconsistencias.md` item 1;
   este item havia presumido erroneamente que AM/auto de infração eram protegidos.)*
10. **43 páginas, mas o esforço de migração concentra-se em 18** — as demais só consomem
    `Repository`/módulos de domínio já lidos, herdando a mudança automaticamente.

Nenhum achado novo de acoplamento surgiu nas últimas ~6 páginas lidas (`PrestadoresServico`,
`FiscalizacoesDTR`, `CatesaDashboard`, `AnalisarResposta`), confirmando que a taxonomia de
padrões estabilizou: o levantamento atingiu cobertura efetiva do espaço de acoplamento real
do sistema, não apenas da amostra lida.

---

# Lote 1 — Infraestrutura

Sete arquivos que definem como todo o resto fala com o backend. São os de maior alavancagem:
acertar o contrato aqui determina a dificuldade de tudo o mais.

## Achado estrutural do lote

**Existem quatro noções independentes de "quem é o usuário" e "estou conectado".** Nenhuma
conversa com as outras:

| Fonte | O que mantém | Onde |
|---|---|---|
| `useOnline` | Alcançabilidade do backend, por sondagem periódica | `src/hooks/useOnline.js` |
| `AuthContext` | Sessão, perfil e cache de autenticação | `src/lib/AuthContext.jsx` |
| `SyncStatusContext` | Validade de sessão **própria**, duplicando o AuthContext | `src/lib/SyncStatusContext.jsx` |
| `PageNotFound` | Usuário via React Query com chave `['user']` | `src/lib/PageNotFound.jsx` |

Na fase 2 isso multiplica o trabalho por quatro e cria risco de divergência — a interface
dizendo uma coisa e o motor de sincronização decidindo outra. A camada deve convergir essas
fontes, mas **sem alterar o comportamento observável** (FR-004): a convergência é de
implementação, não de semântica.

---

## 1. `src/lib/supabase.js` (10 linhas)

**O que faz**: cria o cliente a partir de `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
Emite erro no console se faltar configuração.

**Acoplamento**: total, e por design — é a única instanciação legítima.

**O que muda**: passa a viver dentro de `src/lib/data/providers/supabase/`. É o único
arquivo que continua importando `@supabase/supabase-js`.

---

## 2. `src/hooks/useOnline.js` (95 linhas)

**O que faz**: decide se a aplicação está online. Combina `navigator.onLine` com sondagem
ativa do backend.

**Contrato comportamental medido — tudo isto precisa ser preservado**:

| Aspecto | Valor atual |
|---|---|
| Endereços sondados | `/auth/v1/health` e depois `/rest/v1/`, com `apikey` em parâmetro de consulta |
| Tempo limite | 6000 ms, via `AbortController` |
| Debounce após mudança de `navigator.onLine` | 1500 ms |
| Intervalo de sondagem | 5000 ms |
| Histerese | Só declara indisponível após **2 falhas consecutivas** |
| Resultado final | `online = navigator.onLine && reachable` |
| Sondagem quando `navigator.onLine` é falso | Suspensa — o poller é desligado |

**Particularidade que precisa ser reproduzida tal como está** (FR-021): a verificação faz
`return !!res`, sem checar `res.ok`. Qualquer resposta HTTP conta como alcançável, inclusive
500 ou 401. Um backend no ar mas quebrado é considerado "online". Isso é defeito, não perda
de dado, então a regra de fidelidade manda preservar e registrar.

**O que muda**: vira a categoria *Alcançabilidade* do provedor. O endereço sondado passa a
ser decidido pelo provedor; os tempos e a histerese ficam no consumidor.

**Risco se esquecido**: é o achado mais grave do levantamento. Sem abstrair, a fase 2 faz o
aplicativo se declarar permanentemente offline, sem erro visível, acumulando fila que nunca
sincroniza.

---

## 3. `src/lib/OnlineStatusContext.jsx` (18 linhas)

**O que faz**: apenas expõe `useOnline` via contexto React. Sem acoplamento próprio.

**O que muda**: nada, desde que `useOnline` passe a consumir a camada.

---

## 4. `src/lib/edgeFunctions.js` (47 linhas)

**O que faz**: chama funções do backend. Não usa o cliente para isso — monta a URL
`{base}/functions/v1/{nome}` e faz `fetch` direto.

**Acoplamento em quatro formas simultâneas**, o que o torna o arquivo mais ilustrativo do
problema:

1. Importa o cliente para obter o token (`supabase.auth.getSession()`).
2. Lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` diretamente.
3. Monta o caminho `/functions/v1/` literalmente.
4. Usa cabeçalhos próprios do backend: `apikey`, `Authorization: Bearer {anonKey}` e
   `x-user-jwt` com o token do usuário.

**Comportamento a preservar**: ao receber 401, renova a sessão (`refreshSession()`) e repete
a chamada **uma única vez** (`retryOnAuthError`). A mensagem de erro vem de `json.error`,
depois `json.message`, e por fim `Erro {status}`.

**Observação que corrige o plano**: eu havia registrado que as chamadas de função "já
estavam abstraídas" porque não havia `functions.invoke` no aplicativo. Os consumidores de
fato já não chamam diretamente — mas a implementação é acoplada por URL e cabeçalho, não
por cliente. A costura existe, o isolamento não.

**O que muda**: vira a categoria *Processamento assíncrono* do provedor. O cabeçalho duplo
(`Bearer` com a chave anônima e o token do usuário em cabeçalho próprio) é um arranjo
específico deste backend e não deve atravessar o contrato.

---

## 5. `src/lib/AuthContext.jsx` (373 linhas)

O arquivo mais denso do lote, e o que mais esconde acoplamento semântico.

**Superfície do backend usada**: `auth.getSession()`, `auth.setSession()`,
`auth.onAuthStateChange()`, `auth.signInWithPassword()`, `auth.signOut()`, e duas consultas
a `profiles`.

**Comportamento a preservar**:

| Aspecto | Valor / regra |
|---|---|
| Chave do cache de autenticação | `agms_auth_cache_v1` no armazenamento local |
| Validade do cache | 30 dias |
| Janela de "intenção de logout" | `agms_logout_intent_v1`, 60 segundos |
| Tempo limite de busca de perfil | 4000 ms, via corrida de promessas |
| Tempo limite de logout | 4000 ms — porque `signOut()` não tem limite próprio e trava com conexão morta |
| Nunca desloga offline | Regra absoluta, em dois pontos: no `logout()` e no tratamento de `SIGNED_OUT` |
| Desativação de conta | Só desloga se `ativo === false` **e** confirmado online |
| Mesclagem de perfil | Se a busca falha, mantém `role`, `ativo`, `diretoria_id`, `camara_tecnica_id` e `full_name` do cache |

**⚠️ Problema de migração que só a leitura revela**: o cache guarda a **sessão no formato do
Supabase**, com `access_token` e `refresh_token`, e a restauração chama
`setSession({ access_token, refresh_token })`. Na fase 2 esse objeto muda de forma. Usuários
com cache antigo tentariam restaurar uma sessão incompatível.

A saída já existe no código: a chave é versionada (`_v1`). Incrementar para `_v2` na
migração invalida os caches antigos de forma limpa. **Isso precisa estar no plano da fase 2**,
ou o primeiro acesso após a virada falha de forma confusa para quem tinha sessão salva.

**Acoplamento por nome de evento**: a lógica ramifica em `'SIGNED_OUT'` e `'USER_DELETED'`,
que são cadeias de texto próprias do backend atual. O contrato precisa traduzi-las para
eventos neutros.

**Comentários que documentam defeitos corrigidos**: o arquivo registra, em português, dois
incidentes reais — "clico em sair, trava, e volta pra página inicial" (origem da janela de
intenção de logout) e o travamento de `signOut()` após o aplicativo ficar em segundo plano.
Esses comentários MUST sobreviver à refatoração: são a única memória de por que os tempos
limite existem.

**Por que a mesclagem de perfil importa**: quando a busca de perfil expira — situação comum
em campo — o usuário mantém `role` e `camara_tecnica_id` vindos do cache. É isso que permite
ao fiscal continuar operando offline com suas permissões. Perder essa mesclagem quebra o uso
em campo sem gerar erro algum.

---

## 6. `src/lib/SyncStatusContext.jsx` (154 linhas)

**O que faz**: expõe o estado de sincronização à interface — contagem da fila, último
sincronismo, se está sincronizando, progresso e erro. Dispara sincronização automática.

**Acoplamento**: mantém **sessão própria**, com `auth.getSession()` e `onAuthStateChange()`
duplicando o que o `AuthContext` já faz.

**Contrato comportamental**:

| Aspecto | Valor |
|---|---|
| Intervalo de atualização da fila | 4000 ms |
| Cooldown entre sincronizações | 30000 ms |
| Gatilho 1 | Login — `sessionValid` passa de falso a verdadeiro |
| Gatilho 2 | Voltar a ficar online, ou a fila crescer |
| Condição comum | Online, sessão válida, fila não vazia, não sincronizando |

**O que muda**: passa a consumir a sessão da camada em vez de manter a sua. A convergência
elimina o risco de a interface e o motor discordarem sobre haver sessão.

---

## 7. `src/lib/PageNotFound.jsx` (75 linhas)

**O que faz**: página 404. Usa `auth.getUser()` numa consulta React Query com chave
`['user']` só para decidir se mostra um aviso a administradores.

**Acoplamento**: mínimo, uma chamada. Mas é a quarta fonte independente de identidade.

**Observação lateral**: o conteúdo é andaime remanescente, em inglês, com o texto "This
could mean that the AI hasn't implemented this page yet. Ask it to implement it in the chat."
Não é acoplamento e está fora do escopo desta fase, mas vale registrar para limpeza futura.

---

## Resumo do lote 1

| Arquivo | Linhas | Esforço | Risco |
|---|---|---|---|
| `supabase.js` | 10 | Trivial — mudar de lugar | Baixo |
| `OnlineStatusContext.jsx` | 18 | Nenhum | Baixo |
| `PageNotFound.jsx` | 75 | Trivial — uma chamada | Baixo |
| `edgeFunctions.js` | 47 | Médio — quatro formas de acoplamento em 47 linhas | Médio |
| `useOnline.js` | 95 | Médio — contrato de tempos e histerese | **Alto** — falha silenciosa na fase 2 |
| `SyncStatusContext.jsx` | 154 | Médio — convergir sessão | Médio |
| `AuthContext.jsx` | 373 | **Alto** — cache versionado, eventos, mesclagem de perfil | **Alto** — quebra login e uso offline |

---

# Lote 2 — Bibliotecas de domínio CATERS/CATESA

Dez arquivos, ~740 linhas. É o código **mais bem organizado do projeto** e o modelo a
seguir para os módulos de domínio da camada: uma função exportada por operação de negócio,
sem consulta montada dentro de componente.

## Achado mais grave do lote: URLs do backend salvas como **dado**

`src/lib/caters/documents.js` traz a função `parseCatersFileRef(url)`, que faz engenharia
reversa de bucket e caminho a partir de uma URL, procurando os marcadores
`/storage/v1/object/public/` e `/storage/v1/object/sign/`. O comentário na linha 42 explica
por quê: *"usado para reconstruir a referência do arquivo em documentos antigos que só têm a
URL salva"*.

Ou seja: **existem URLs completas do Supabase Storage persistidas em colunas do banco**.
Campos identificados até aqui:

| Campo | Onde |
|---|---|
| `caters_recommendations.evidence_url` | Lote 2 |
| Campos de arquivo em `caters_processes` | Citado no comentário de `documents.js` |
| `termos_notificacao.arquivo_resposta_url` | Migration 134 |
| `prestadores_servico.documentos` (JSONB com `url`) | Migration 001 |

Isto **não é acoplamento de código e esta fase não o resolve**. É acoplamento de dado: na
fase 2, essas URLs apontam para um endereço que deixou de existir. O tratamento pertence à
migração de dados, mas precisa estar registrado agora, porque é invisível para quem só olha
o código da camada.

## Achados de comportamento

**Truncamento silencioso** — `.limit()` com tetos fixos e inconsistentes, sem aviso ao
usuário quando o corte acontece: 5000 em `processes.js`, 5000 e 5000 em `recommendations.js`,
1000/2000/2000/5000 em `dashboard.js`. Passando do teto, contagens e painéis ficam errados
sem nenhum sinal. É defeito existente: FR-021 manda preservar e registrar.

**Agregação no navegador** — os painéis buscam até 2000 processos e 5000 recomendações para
contar no cliente. Preservar por FR-004, mas fica registrado como candidato natural a
agregação no servidor na fase 2.

**Regra de negócio duplicada** — `computeResponseDueAt` existe, idêntica, em `processes.js`
(linhas 19-23) e `dashboard.js` (linhas 5-9).

**Módulo duplicado** — `catesa/aiJobs.js` é cópia quase literal de `caters/aiJobs.js`:
mesmo polling de 3000 ms, mesmo teto de 90000 ms, mesmos estados, mesma mensagem de erro.
São ~55 linhas repetidas. Como o comportamento é idêntico nos dois, unificar na camada não
viola FR-004.

**Status derivado no cliente e também armazenado** — `deriveRecommendationStatus` calcula o
estado em JavaScript e o grava na coluna `status`. Se a fase 2 derivar do lado do servidor,
as duas fontes podem divergir. Precisa de decisão explícita lá.

**Texto de interface acoplado à infraestrutura** — `caters/aiJobs.js:64` e
`catesa/aiJobs.js:61` mostram ao usuário final: *"Verifique se as edge functions de IA foram
implantadas e se a GEMINI_API_KEY está configurada."* Mensagem que se torna falsa na fase 2.

## Acoplamento de sintaxe específico do backend

| Construção | Onde | Por que importa |
|---|---|---|
| `.upsert(rows, { onConflict: 'user_id,key' })` | `notificationReads.js:20` | Semântica de conflito do PostgreSQL, nomeando as colunas da restrição única |
| `.upsert(input, { onConflict: 'process_id' })` | `municipalityResponses.js:16` | Idem |
| `.rpc('caters_import_from_fiscalizacao', { p_… })` | `processes.js:117` | Função no banco, com convenção de prefixo `p_`. Lógica de negócio que o Django precisa reimplementar |
| `.ilike('campo', '%termo%')` | `processes.js:35-36` | Busca textual insensível a maiúsculas, operador do PostgREST |
| Listas de colunas como texto (`LIST_FIELDS`, `DETAIL_FIELDS`, `SELECT_FIELDS`, `PROC_FIELDS`, `REC_FIELDS`) | Vários | Projeção no formato do PostgREST; a camada precisa expressá-la de forma neutra |
| `caters_fiscalizacoes_disponiveis` | `processes.js:109` | Pelo nome e uso, é **view**, não tabela — precisa de equivalente do lado do Django |

## Resumo do lote 2

| Arquivo | Linhas | Esforço | Observação |
|---|---|---|---|
| `caters/processes.js` | 124 | Médio | Melhor modelo do projeto; contém a chamada RPC |
| `caters/recommendations.js` | 123 | Médio | Regra de negócio em JS; três `.limit(5000)` |
| `caters/dashboard.js` | 158 | Médio | Agregação pesada no cliente; função duplicada |
| `caters/aiJobs.js` | 81 | Médio | Polling; mensagem vazando infraestrutura |
| `catesa/aiJobs.js` | 78 | Baixo | Duplicata do anterior — unificar |
| `caters/documents.js` | 67 | **Alto** | `parseCatersFileRef`; bucket `documentos-prestadores`; URL como dado |
| `caters/history.js` | 38 | Baixo | CRUD direto |
| `caters/deadlineExtensions.js` | 29 | Baixo | CRUD direto |
| `caters/notificationReads.js` | 22 | Baixo | `onConflict` composto |
| `caters/municipalityResponses.js` | 21 | Baixo | `onConflict` simples |

---

# Lote 3a — `src/lib/offline/syncEngine.ts` (2.882 linhas — lido por completo)

É o arquivo de maior risco de todo o levantamento. Implementa o motor de sincronização
bidirecional entre o IndexedDB local (via Dexie) e o Supabase — envio (`syncUp`), download
(`syncDown`), upload de fotos, e uma extensa camada de **reconciliação de conflito** que
nenhuma extração automática de padrão seria capaz de sinalizar como risco.

## Achado mais grave: automedicação contra desvio de schema, por texto de erro

Cinco pontos distintos do arquivo (`respostas`, `constatacoes_manuais`, `determinacoes`,
`unidades`, e o caminho genérico) implementam a mesma técnica: enviam a escrita, e se o
Postgres/PostgREST responder com erro, fazem *parsing* da **mensagem de erro em texto** para
descobrir qual coluna não existe, removem essa coluna do payload, e tentam de novo — até 6
vezes. As expressões reconhecidas:

```
column "X" of relation "Y" does not exist
column "X" does not exist
Could not find the 'X' column of 'Y' in the schema cache
```

Isso significa que o aplicativo **tolera o próprio schema estar desatualizado em relação ao
código**, silenciosamente descartando campos que o banco ainda não tem. É everybody's
worst-kept secret do projeto: o comentário na linha 1264 chega a lançar um erro **nomeando
uma migration especifica** ("Execute a migration 072 (...) e sincronize novamente") quando
a coluna que falta é `descricao_nc`.

**Consequência direta para a fase 2**: essas três expressões regulares são **sintaxe de erro
do PostgREST**. Um backend Django/DRF nunca vai produzir essas mensagens. Se a camada de
abstração não fornecer um mecanismo equivalente (ou се decidir que esse comportamento é
tolerável apenas como transição e deve ser desligado), o comportamento muda silenciosamente
— campos que hoje seriam descartados passam a causar erro 400 visível ao usuário. É uma
mudança de comportamento real, e precisa ser uma decisão consciente, não um acidente de
tradução.

## Achado grave: duas implementações independentes e divergentes de "alcançável"

Este arquivo tem sua **própria** função `reachability()` (linha 2438), quase idêntica à
`headReachable()` de `src/hooks/useOnline.js`, mas com um detalhe que diverge: o tempo
limite aqui é **8000ms**, lá é **6000ms**. Mesma lógica (sondar `/auth/v1/health` depois
`/rest/v1/`, aceitar qualquer resposta como "alcançável"), duas constantes diferentes. Isso
não é cosmético: reforça que a *Alcançabilidade* precisa virar uma única fonte na camada —
hoje o app pode, em teoria, ter uma parte da interface dizendo "online" enquanto o motor de
sync ainda está decidindo que não.

## Achado grave: renovação de sessão por lógica própria, fora do AuthContext

`authRefresh()` (linha 2462) e o início de `runFullSyncInternal`/`syncUpForFiscalizacao`
leem `session.expires_at` (formato Unix em segundos, específico do Supabase Auth) e decidem
renovar proativamente se restam menos de 300 segundos. É uma **terceira** fonte de decisão
sobre sessão, independente do `AuthContext` e do `SyncStatusContext` já registrados no lote
1. O motor de sync não confia em nenhum dos dois — ele mesmo verifica e renova.

## Ordem de sincronização é regra de negócio, não implementação

A constante `orderForSyncUp` (linha 226) define uma ordem **obrigatória** de envio:
prestadores e contratos primeiro, tipos de unidade e itens de checklist depois,
fiscalizações, unidades, respostas, constatações, recomendações, determinações, fotos, e só
então reabertura/finalização. Essa ordem existe porque as entidades têm dependência de
chave estrangeira entre si — enviar fora de ordem produz violação 23503. **A camada de
domínio da fase 2 precisa preservar essa ordem exatamente**, e ela não é óbvia a partir do
modelo de dados sozinho — só a leitura revelou.

## Resolução de IDs local↔servidor (`id_map`) é uma tabela de tradução persistente

Como as entidades nascem com UUID gerado no dispositivo, e o servidor pode (em alguns
fluxos, como deduplicação por `codigo_unidade` ou `numero_recomendacao`) decidir que já
existe um registro equivalente com outro ID, o motor mantém uma tabela `id_map` que
traduz IDs locais para IDs de servidor. **Este é o mecanismo mais delicado do sistema
offline**: praticamente toda escrita passa por `resolveId()`, que consulta essa tabela antes
de montar o payload. Qualquer redesenho da camada precisa preservar essa indireção — ela não
é um detalhe de implementação, é a ponte entre "o que o fiscal criou offline" e "o que
existe no servidor compartilhado".

## Deduplicação no servidor antes de inserir (evita duplicata quando o mesmo dado é criado em dois dispositivos)

Antes de inserir `unidades` (por `codigo_unidade` dentro da mesma fiscalização),
`recomendacoes` (por `numero_recomendacao` dentro da mesma unidade) e `determinacoes` (por
`origem` dentro da mesma unidade), o código **consulta o servidor primeiro** para checar se
já existe um registro equivalente, e se existir, reaproveita o ID dele em vez de inserir
duplicado. Isso é lógica de negócio real (dois fiscais no mesmo local, um online e um
offline, não devem gerar duas unidades idênticas) e precisa de equivalente explícito na
camada nova — não é algo que "já vem de graça" com outro backend.

## Reconciliação de exclusão remota — o caso mais sofisticado do arquivo

Quando uma fiscalização foi excluída no servidor por outro dispositivo enquanto este
tinha trabalho offline não sincronizado nela, o motor **não perde o trabalho**: recria a
fiscalização inteira localmente com IDs novos (`recreateFiscalizacaoLocally`, linha 731),
remapeando toda a árvore — unidades, respostas, constatações, recomendações, determinações,
fotos — e reenfileira tudo como inserções novas. Só quando não há trabalho pendente é que a
exclusão é replicada localmente (`cascadeDeleteFiscalizacaoLocally`). Esta é, isoladamente,
a lógica de maior valor de negócio do arquivo: ela impede que o trabalho de campo de um
fiscal seja destruído por uma decisão administrativa tomada em outro lugar enquanto ele
estava offline. **Qualquer refatoração que não preserve esse comportamento bit a bit é uma
regressão grave**, mesmo que passe despercebida em teste superficial.

## Fotos: upload em duas variantes, com merge por chave composta

O upload de fotos (`syncFotosWithProgress`, linha 2153) processa duas "trilhas" por foto: a
versão principal e uma versão "limpa" sem marca d'água (`cleanBlob`/`cleanStoragePath`),
cada uma com seu próprio rastreamento de tentativa e erro. A concorrência é limitada
deliberadamente: 6 uploads de foto simultâneos, 3 atualizações de unidade simultâneas. A
reconciliação de qual foto pertence a qual unidade usa uma chave composta
(`bucket:path` ou `localId`) para não duplicar nem perder fotos quando o mesmo registro é
tocado por dois dispositivos. Bucket usado: `fotos_fiscalizacao` (nome diferente do
`fotos-evidencia` citado na documentação técnica do projeto — **divergência a esclarecer**).

## Classificação de erro é específica de Postgres/PostgREST

`isRetryableError` (linha 362) decide se uma falha deve ser tentada de novo com base em
códigos de erro Postgres: `23503` (violação de chave estrangeira — nunca retentar, o pai foi
apagado), `40P01` (deadlock — retentar), além de status HTTP padrão. O comentário na linha
365-370 documenta que tratar `23503` como retryable **já causou um loop infinito de
sincronização em produção** — é um bug real, corrigido, e a correção primária foi
`pruneOutboxOrphans`, sendo esta checagem apenas rede de segurança residual. **A camada de
domínio da fase 2 precisa de uma classificação de erro equivalente, mapeada para os códigos
de erro que o Django/DRF realmente produzir** — não pode simplesmente herdar os códigos
Postgres crus, mas também não pode perder a distinção "definitivo vs. temporário" que evita
esse loop.

## Backoff com jitter, dois perfis de espera

`computeNextRetryAt` (linha 381) usa base de 800ms para erro retryable (teto de 5 minutos) e
10 segundos para erro definitivo (teto de 24 horas), com jitter aleatório. Preservar como
está — é comportamento a caracterizar, não a redesenhar.

## Compactação de fila (`compactOutbox`) é otimização com risco de perda se malfeita

Quando há mutações pendentes duplicadas para a mesma entidade+id (ex.: usuário edita o
mesmo campo três vezes offline), `compactOutbox` (linha 510) mescla-as em uma só,
preservando o payload mais recente e promovendo `insert` sobre `update` quando aplicável.
Roda a cada sincronização. Lógica correta é sutil (ver o merge de payload que preserva
campos obrigatórios na linha 564-589); um bug aqui pode silenciosamente perder uma edição
intermediária.

## Sincronização de recomendações é um caso especial — "snapshot" em vez de mutação individual

Ao contrário de todas as outras entidades, `recomendacoes` não é sincronizada mutação por
mutação: `syncRecomendacoesSnapshot` (linha 1550) agrupa por unidade, **apaga todas as
recomendações daquela unidade no servidor e reinsere a lista local inteira**, renumerando
sequencialmente (`R1`, `R2`, ...). Isso evita duplicata e problema de numeração quando várias
edições aconteceram offline, mas significa que a operação de sincronização de
`recomendacoes` **não é um CRUD simples** — é um comando de substituição total por unidade.
A camada de domínio da fase 2 precisa expor essa operação como tal (substituição em lote),
não tentar decompô-la em criar/atualizar/excluir individuais.

## Pull incremental com tolerância a schema desalinhado (mesmo padrão do push)

`safeSelectSince` (linha 314) e a lógica em `pullEntity`/`doRequest` (linha 1903) tentam,
em cascata: filtro por `updated_at`, depois por `updated_at OR created_at`, depois com
`select('*')` em vez da lista de colunas, depois só por `created_at`. Cada camada existe
para tolerar um tipo diferente de desalinhamento entre o código e o schema real. **Isso é
sintoma do mesmo problema do achado principal**: o projeto historicamente tolerou drift de
schema em produção, e o motor de sync foi blindado contra isso em vários pontos
independentes.

## Clock skew: subtrai 24 horas do último sincronismo antes do pull incremental

`syncDown` (linha 2023) subtrai 24 horas de `last_sync_at` antes de usar como filtro
incremental, especificamente para tolerar relógios de dispositivo dessincronizados entre
si. Comportamento a preservar exatamente.

## Download de KML do Storage durante sincronização

Ao puxar `contratos`, se o registro tiver `kml_url` no formato customizado `storage://bucket/path`,
o código baixa o arquivo do Supabase Storage (`supabase.storage.from(bucket).download(path)`),
faz parse do KML e grava pontos calculados (`km_points`) localmente (linha 1856-1891). É
outra forma de acoplamento ao Storage, silenciosa, dentro do fluxo geral de `pullEntity`
— não apareceria em nenhuma busca por texto porque o nome do bucket vem de um campo do banco,
não de um literal no código.

## Reset local (função de suporte/administração)

`requestHardReset` (linha 2136) apaga todos os dados locais, mas **recusa rodar** se houver
mutação pendente ou foto não sincronizada, a menos que `force: true`. É a única operação
verdadeiramente destrutiva do arquivo, e já vem com salvaguarda — o padrão que os requisitos
FR-015 a FR-019 desta fase (limpeza automática de dado de teste) deveriam seguir.

## Resumo do lote 3a

| Aspecto | Achado | Risco para a fase 2 |
|---|---|---|
| Tolerância a schema desatualizado | 5 pontos fazem parsing de mensagem de erro do PostgREST | **Altíssimo** — mensagens do Django são outras; comportamento muda silenciosamente se não tratado |
| Alcançabilidade duplicada | Segunda implementação, com timeout diferente (8s vs 6s) | Alto — reforça a necessidade de unificar na camada |
| Sessão gerenciada em 3 lugares | `AuthContext`, `SyncStatusContext`, e aqui (`authRefresh`) | Alto — risco de decisões conflitantes sobre validade de sessão |
| Ordem de sync | `orderForSyncUp`, regra de FK não documentada em nenhum outro lugar | Alto — perder a ordem quebra inserção em cascata |
| `id_map` local↔servidor | Indireção central de todo o sistema offline | Crítico — preservar ou o offline inteiro para de funcionar |
| Deduplicação pré-insert | Consulta o servidor antes de inserir em 3 entidades | Médio-alto — precisa de equivalente explícito, não é automático |
| Reconciliação de exclusão remota | Recriação de árvore inteira com novos IDs | Crítico — é a lógica de maior valor de negócio do arquivo |
| Sync de fotos em duas variantes | Upload principal + "limpa", merge por chave composta | Alto — nome de bucket diverge da documentação |
| Classificação de erro | Códigos Postgres específicos, um deles com bug documentado | Alto — precisa de mapeamento explícito para os erros do Django |
| Snapshot de recomendações | Substituição total por unidade, não CRUD | Médio — a camada precisa expor essa operação como tal |
| Clock skew | Buffer de 24h no pull incremental | Baixo, mas fácil de esquecer |
| KML via Storage | Download disparado por campo do banco, não por código fixo | Médio — invisível a busca textual |

---

# Lote 3b — `src/lib/offline/repository.ts` (2.460 linhas — lido por completo)

Fachada de acesso a dados consumida por toda a interface. Dois modos de escrita coexistem
no mesmo arquivo, e essa distinção é a informação mais importante deste lote.

## Achado estrutural: dois modos de escrita, não um

**Modo A — offline-first (a maioria do arquivo)**: toda escrita grava primeiro no Dexie
local e enfileira uma mutação via `enqueueMutation` para o `syncEngine` processar depois.
Isso vale mesmo com o usuário online — não existe um caminho "direto ao servidor" para
fiscalização, unidades, respostas, checklist, recomendações, determinações. **Toda a escrita
do domínio de fiscalização é, por design, offline-first o tempo todo.**

**Modo B — direto ao servidor, sem fila (~35 métodos, a partir da linha ~1350)**: nomeados
com sufixo `Online` (`listTermosNotificacaoOnline`, `createAutoInfracaoOnline`,
`updateRespostaDeterminacaoOnline`, etc.) ou implicitamente síncronos
(`gerarNumeroAutoOnline`, `uploadEvidenciaDeterminacao`). Cobre os domínios de **auto de
infração, termo de notificação, parecer técnico, julgamento e remessa de IA** — chamam
`supabase.from(...)` diretamente, exigem conectividade, e não passam pelo outbox.

**Consequência para o desenho da camada**: a categoria *Sincronização offline* do contrato
do provedor não se aplica a esses ~35 métodos. Eles pertencem à categoria *Registros*
comum, sem a semântica de fila. Migrar esse bloco é mais simples (não herda a complexidade
de reconciliação do modo A) — mas ainda carrega acoplamento de sintaxe pesado (ver abaixo).

## Achado grave: nomes de bucket divergem em 8+ variações, incluindo busca por tentativa e erro

Buckets encontrados nomeados diretamente no código deste arquivo:

| Bucket | Método |
|---|---|
| `fotos_fiscalizacao` | uploads de foto de campo (mesmo do `syncEngine.ts`) |
| `kml-rodovias` | `uploadKMLForContrato` |
| `evidencias-determinacoes` | `uploadEvidenciaDeterminacao`, `uploadAssinaturaTermo` |
| `documentos-autos` | `uploadDocumentoAutos` |

E o mais grave: `uploadTermoNotificacaoFile` (linha 1641) **tenta 7 nomes de bucket em
sequência** — `termos-notificacao`, `termos_notificacao`, `documentos-termos`,
`documentos_termos`, `documentos-termo`, `documentos`, `arquivos` — parando no primeiro que
não retornar "bucket not found" ou erro de permissão. Isso significa que **o bucket real
usado para documentos de termo de notificação em produção não é conhecido a partir do
código** — só é conhecido inspecionando quais desses 7 buckets existem de fato no projeto
Supabase. Combinado com o achado do lote 2 (`documentos-prestadores`) e a documentação
técnica (que cita `fotos-evidencia` e `documentos-termos`, nomes que não batem exatamente
com nenhum dos acima), **a migração de arquivos precisa começar por um inventário real dos
buckets existentes no projeto Supabase**, não por uma lista extraída do código-fonte.

## Achado: parsing de URL de storage é função pública, reutilizada em 3+ lugares

`Repository.parseStorageUrl` (linha 89) reconhece três formatos: o customizado
`storage://bucket/path` (usado internamente para `kml_url`) e os dois formatos reais do
Supabase Storage (`/storage/v1/object/public/` e `/storage/v1/object/sign/`). É praticamente
idêntica à função privada `parseCatersFileRef` do lote 2 — **duplicação do mesmo parser em
dois módulos**, um deles exportado e reutilizado (`getSignedUrlFromAny`,
`getSignedUrlFromBucket`, `downloadKMLForRodovia`), o outro não.

## Achado: fotos não usam URL pública fixa — são assinadas sob demanda

`createSignedUrl`/`getSignedUrlFromAny` geram URL assinada com expiração de 30 minutos
(`60 * 30` segundos) a partir de bucket+path armazenados. Isso significa que a referência de
arquivo persistida no banco **não é diretamente utilizável como link** — precisa ser trocada
por uma URL assinada a cada exibição. É comportamento que a categoria *Arquivos* do
provedor já previa ("obter endereço de acesso, respeitando restrição de acesso"), e este
achado confirma que o tempo de expiração (30 min) é parte do contrato a preservar.

## Achado grave: regra de negócio de geolocalização embutida na camada de dados

`addLocalFotoFromFile` e `finalizeDtrFotoWatermarks` (linhas 2005-2190) não são acesso a
dados — são **processamento de imagem com regra de negócio geoespacial**: para
fiscalizações do módulo DTR (rodovias), a marca d'água da foto só é desenhada no momento de
salvar a ocorrência, cruzando a coordenada GPS capturada com uma lista de pontos
quilométricos (`kmPoints`) para descobrir rodovia e KM mais próximos — e só então compor o
texto da marca d'água. Comentários no código (linhas 2051-2056, 2091-2096) documentam que
essa ordem é **invariante deliberada**: desenhar a marca d'água na captura, antes do
cruzamento de KM, já foi tentado e causava problema de concorrência. **Esta lógica não pode
ser tratada como "detalhe de acesso a dados" e simplesmente encapsulada** — é regra de
negócio geoespacial que precisa de dono explícito no desenho da fase 2, provavelmente fora
da camada de dados propriamente dita.

## Achado: um bug de produção documentado no próprio código explica uma exceção à regra geral

`finalizarFiscalizacao` (linha 2392) **deliberadamente não enfileira** a mutação
`finalizacao_unidade` para cada unidade, ao contrário do padrão usado em todo o resto do
arquivo. O comentário explica por quê: a RPC `finalizar_fiscalizacao` já finaliza todas as
unidades internamente (via outra função de banco, `gerar_ncs_unidade`), e enfileirar as duas
mutações **já causou deadlock no PostgreSQL em produção**. Achado equivalente a
`reabrirFiscalizacao` (linha 2416), que ativamente **remove** mutações de finalização
pendentes da fila antes de reabrir, para impedir que o sync replique uma finalização
obsoleta. **Qualquer reimplementação da finalização no Django precisa preservar a mesma
atomicidade que a RPC hoje garante** (finalizar fiscalização + todas as unidades como uma
operação server-side única) — não pode virar duas chamadas separadas do cliente sem recriar
o risco de corrida que already foi corrigido uma vez.

## Regra de negócio duplicada entre recomendações e determinações (confirma achado do syncEngine)

`recomputeRecomendacoesNumeracao` e `recomputeDeterminacoesNumeracao` (linhas 795 e 1133)
implementam a **mesma técnica de renumeração em duas fases** (zera todos os números, depois
reatribui sequencialmente para evitar violação de unicidade) para duas entidades
diferentes, com pequenas variações de critério de ordenação. Da mesma forma,
`syncRecomendacoesFromChecklist`/`syncRecomendacaoFromChecklistItem` e
`syncDeterminacoesFromChecklist`/`syncDeterminacaoFromChecklistItem` são pares
quase-idênticos que derivam recomendação/determinação automaticamente a partir de uma
resposta de checklist ("NÃO" + `gera_nc` + texto configurado no item). Há também a regra de
prefixo textual `"Sanar NC?. "` aplicada automaticamente à descrição da determinação
(linhas 1008, 1243, 1306) — comportamento de negócio, não formatação cosmética.

Essa duplicação é candidata natural a unificação na fase 2, mas **a unificação é trabalho de
design, não desta fase** — aqui cabe apenas preservar o comportamento tal como está,
documentando que ele está duplicado.

## Tolerância a schema desalinhado, mesmo padrão do syncEngine, com variação

`updateRespostaDeterminacaoOnline`/`createRespostaDeterminacaoOnline` (linhas 1449, 1465)
reconhecem mensagem de erro contendo "could not find"/"does not exist"/"column" e, se
mencionar especificamente a coluna `evidencias`, removem-na e tentam de novo — versão mais
restrita (uma coluna nomeada, não qualquer coluna) do padrão de auto-cura já documentado no
lote 3a. `updateAutoInfracaoOnline` (linha 1498) trata separadamente erros de "coerção de
linha única" do PostgREST (`cannot coerce`, `JSON object requested`,
`multiple (or no) rows returned`), fazendo fallback de `.select().maybeSingle()` para uma
chamada sem `.select()`. **Ambos são exemplos de comportamento amarrado a mensagens de erro
específicas do PostgREST que não existirão no Django.**

## Chamadas RPC adicionais (além de `finalizar_fiscalizacao`/`reabrir_fiscalizacao` do lote 3a)

`gerarNumeroAutoOnline` → `rpc('gerar_numero_auto')` e `gerarNumeroAmOnline` →
`rpc('gerar_numero_am')` (linhas 1481, 1487): geração de numeração sequencial oficial de
autos de infração e autos de manifestação, feita no servidor — provavelmente para garantir
atomicidade entre dispositivos concorrentes. É lógica de negócio que precisa de equivalente
explícito no Django (sequência atômica), não uma tradução literal de função SQL.

## Sintaxe específica do PostgREST embutida no modo "Online"

- `.select('*, autos_infracao(*)')` em `listRemessaAIItens` (linha 1604) — relação embutida
  em uma única consulta, sintaxe própria do PostgREST.
- `.neq('id', '00000000-0000-0000-0000-000000000000')` em `clearTiposOcorrenciaDTR` (linha
  299) — truque para "deletar tudo" contornando exigência de cláusula WHERE.
- Upsert com diffing manual em `upsertTiposOcorrenciaDTR` (linhas 319-396): busca todos os
  registros existentes, calcula diffs em memória por chave composta, e faz insert/update em
  lote — padrão que poderia ser um único upsert do lado do servidor, mas está implementado
  no cliente.

## Regra de negócio de filtro por diretoria, duplicada

`SERVICES_BY_DIRETORIA` (linhas 175, 191) — mapeamento fixo de diretoria para lista de
serviços (`dsb`→saneamento, `dtr`→rodovias, `dge`→energia/gás) usado para filtrar
prestadores — está **copiado literalmente** em `listPrestadores` e `listPrestadoresFull`.
Regra de negócio real (delimita o que cada diretoria pode ver), não incidental.

## Resumo do lote 3b

| Aspecto | Achado | Risco para a fase 2 |
|---|---|---|
| Dois modos de escrita | ~35 métodos "Online" não passam pela fila offline | Médio — mais simples de migrar, mas precisa reconhecer que não seguem o padrão outbox |
| Nomes de bucket | 4 nomes diretos + 7 candidatos tentados por tentativa e erro | **Crítico** — o bucket real de produção não é dedutível do código |
| Parser de URL de storage | Duplicado entre `repository.ts` e `caters/documents.js` | Médio |
| URLs assinadas, expiração 30min | Contrato de acesso a arquivo a preservar exatamente | Médio |
| Marca d'água geoespacial (DTR) | Regra de negócio não trivial, ordem de execução é invariante documentada | Alto — precisa de dono explícito na fase 2, não é "detalhe de dados" |
| Deadlock documentado | Finalização de fiscalização depende de atomicidade específica da RPC atual | **Alto** — reimplementação Django precisa da mesma atomicidade |
| Renumeração e derivação de recomendação/determinação | Duplicada entre as duas entidades | Médio — candidata a unificação, mas fora do escopo desta fase |
| Tolerância a erro do PostgREST | Duas variações adicionais do padrão do lote 3a | Alto — mesmo problema, mais pontos |
| RPCs de numeração sequencial | `gerar_numero_auto`, `gerar_numero_am` | Alto — precisa de garantia de atomicidade equivalente no Django |
| Regra de negócio duplicada (diretoria→serviços) | Copiada em dois métodos | Baixo — mas é regra de negócio real, preservar nos dois pontos ou unificar |

---

# Lote 4 — Utilitários (`storageCleanup.js`, `numerationHelper.jsx`)

## `src/lib/storageCleanup.js` (382 linhas — lido por completo)

Implementa **exclusão em cascata manual**, inteiramente em JavaScript: fiscalização →
unidades → respostas/constatações/recomendações/determinações/fotos, e paralelamente
autos de infração → manifestações/pareceres/julgamentos, e termos de notificação → seus
próprios anexos. Não existe `ON DELETE CASCADE` sendo aproveitado aqui — cada camada é
buscada, seus arquivos de Storage removidos, e só então a linha é apagada, na ordem
filho→pai para não violar chave estrangeira.

**Achados**:

- **Mais um nome de bucket**: `relatorios_fiscalizacao` (linha 138), diferente de todos os
  já catalogados. A listagem pagina em até 20 páginas de 100 itens porque relatórios PDF
  grandes são divididos em partes de até 50MB (limite do plano gratuito do Supabase Storage
  — comentário na linha 131-133). Confirma achado do lote 3a sobre pipeline de relatórios.
- **`evidencias-determinacoes` reaparece** (linha 324) com paginação diferente (1000 por
  página, não 100) — mais uma inconsistência de padrão entre funções do mesmo arquivo.
- **`parseStorageRef` é a quarta implementação do mesmo parser** de URL de storage já visto
  em `repository.ts` (`parseStorageUrl`) e `caters/documents.js` (`parseCatersFileRef`) —
  três cópias independentes da mesma lógica em três arquivos.
- **Falha parcial é tolerada silenciosamente**: a maior parte das remoções de arquivo está
  envolta em `try {} catch {}` vazio (`safeRemovePathsByBucket`), então se o Storage falhar,
  a exclusão do registro no banco **segue em frente** — o resultado pode ser arquivo órfão
  no bucket, nunca um erro visível ao usuário. Comportamento a preservar (FR-021), mas vale
  registrar como característica de risco herdada.
- **Nenhuma operação está numa transação única entre banco e Storage** (nem poderia, são
  sistemas diferentes) — a ordem de operações (arquivos antes do registro) é a única
  proteção contra órfão, e ela é convenção de código, não garantia de banco.
- Limpeza local do Dexie ao final (linhas 204-280) usa transação Dexie de verdade, e
  replica a mesma lógica de "encontrar mutações da fila relacionadas a este ID" já vista em
  `syncEngine.ts` — outra duplicação entre os dois arquivos.

## `src/components/utils/numerationHelper.jsx` (85 linhas — lido por completo)

Calcula numeração sequencial de Constatações/NCs/Determinações/Recomendações **consultando
o Supabase diretamente**, nunca o Dexie local.

**Achado que contradiz o padrão predominante do sistema**: ao contrário de
`repository.ts`, que é offline-first em praticamente tudo, este helper é **online-only**. Se
chamado sem conectividade, cada consulta falha, o `catch` global retorna contadores zerados
silenciosamente (linha 65), e a numeração calculada localmente pode colidir com a de outro
dispositivo ou reiniciar do zero. **Isto não é um problema a corrigir nesta fase** — é
comportamento existente a preservar exatamente — mas precisa ser sinalizado como
inconsistência arquitetural preexistente: um ponto do sistema que assume conectividade num
app que se define como offline-first em todo o resto.

Usa `.select('*', { count: 'exact', head: true })` — padrão PostgREST de contagem sem
retorno de linhas — em dois pontos (linhas 44-47, 52-55).

## Resumo do lote 4

| Arquivo | Linhas | Esforço | Observação |
|---|---|---|---|
| `storageCleanup.js` | 382 | **Alto** | Exclusão em cascata manual; 2 nomes de bucket adicionais; quarta cópia do parser de URL |
| `numerationHelper.jsx` | 85 | Médio | Online-only, contraria o padrão offline-first do resto do app — preservar, não corrigir |

---

# Lote 5 — Componentes (7 arquivos, ~2.180 linhas — lidos por completo)

## `src/components/fiscalizacao/PhotoGrid.jsx` (697 linhas)

Componente de captura/exibição de fotos, com câmera WebRTC e fallback para input nativo,
GPS em segundo plano (watch contínuo, nunca bloqueia a captura), e marca d'água composta no
momento certo conforme o tipo de fiscalização.

**Achado (corrigido depois pela leitura de `ResponderTermo.jsx`, ver nota abaixo)**:
`resolveFotoSrc` (linha 73) usa `import.meta.env.VITE_SUPABASE_URL` **diretamente** para
montar uma URL pública de fallback (`/storage/v1/object/public/{bucket}/{path}`) enquanto a
URL assinada de verdade ainda não chegou de forma assíncrona
(`Repository.getSignedUrlFromBucket`, resolvida em `useEffect` com concorrência 4).

> **Correção**: `src/pages/ResponderTermo.jsx` (lido mais adiante neste levantamento) traz um
> comentário explícito de que o bucket `fotos_fiscalizacao` **é público** (migration 044) e
> usa `getPublicUrl()` diretamente por esse motivo. Isso significa que o fallback aqui
> provavelmente **funciona corretamente**, e é a assinatura em `getSignedUrlFromBucket` que é
> redundante sobre um bucket já público — não um bug. O achado real não é "URL quebrada", é
> que **o mesmo bucket é tratado de duas formas inconsistentes em dois arquivos diferentes**
> — um assume assinatura necessária, o outro assume acesso público direto. Ambos funcionam na
> prática, mas representam modelos mentais divergentes que a auditoria de storage prévia à
> fase de arquivos precisa resolver por bucket, contra o projeto real — não inferir do
> código-fonte, que aqui se contradiz.

A camada nova precisa de um estado de "carregando" neutro no lugar dessa
construção de URL, não apenas trocar o domínio.

## `src/components/fiscalizacao/RelatorioFiscalizacao.jsx` (448 linhas)

**Achado**: `STORAGE_NAMESPACE` (linha 19) extrai o hostname de `VITE_SUPABASE_URL` e usa
como prefixo de chave no `localStorage`, **deliberadamente** — o comentário diz que isso
existe para invalidar automaticamente o cache de "último job de relatório" quando o projeto
Supabase muda. Ou seja: o código já antecipa uma migração de backend, só que amarrada à URL
do Supabase especificamente. A camada nova precisa de um identificador neutro equivalente
(versão do backend, por exemplo), ou os usuários que tiverem cache de antes da virada vão
ver estado de relatório desatualizado/incorreto até o cache expirar.

Outros achados: pré-sincronização obrigatória (`runFullSync`) antes de permitir gerar
relatório, com bloqueio explícito se restar item pendente na fila daquela fiscalização;
remontagem de PDF multi-parte no navegador via `pdf-lib` (import dinâmico) quando o
relatório passou do limite de tamanho de objeto do Storage.

## `src/components/fiscalizacao/HistoricoFiscalizacao.jsx` (490 linhas)

**Achado importante, categoria nova não coberta pelo contrato original**: consulta a tabela
`audit_logs` (colunas `table_name`, `record_id`, `action`, `old_data`, `new_data` em JSONB —
claramente povoada por trigger de banco, não hay código de aplicação que escreva nela) com
um filtro `.or()` do PostgREST **extremamente específico**: grupos `and(...)` combinados com
operadores de caminho JSON (`new_data->>fiscalizacao_id.eq.X`). Essa sintaxe não tem
equivalente direto em Django ORM sem SQL bruto ou um desenho de tabela de auditoria
diferente. O componente inteiro (~250 linhas de `describeLog`) é lógica de apresentação que
traduz diffs de JSONB em frases legíveis — teria que ser adaptada à forma como o Django
registrar auditoria, que provavelmente não será idêntica a old_data/new_data em JSONB.
**Auditoria/histórico de alterações precisa entrar como categoria própria de decisão na fase
2**, não encaixar automaticamente em nenhuma das 8 categorias do contrato atual.

## `src/components/fiscalizacao/ExportarPDFConsolidado.jsx` (159 linhas)

Gerador de PDF client-side (jsPDF) que itera fiscalizações e, para cada unidade de cada
fiscalização, faz 3 consultas de contagem (`nao_conformidades`, `determinacoes`,
`recomendacoes`) — um padrão N+1 nítido, sem agregação no servidor. Nenhum achado novo de
acoplamento além do já catalogado; registrado como candidato a otimização na fase 2 (fora do
escopo desta fase, por FR-004/paridade).

## `src/components/autos/FluxoUploadDocumentos.jsx` (239 linhas)

**Achado**: a máquina de estados do auto de infração (`ai_assinado` → `protocolo` →
`enviado` → `defesa` → `em_analise`) está codificada **dentro do componente de UI**, não em
uma camada de serviço — o upload de um arquivo dispara diretamente a transição de status via
`supabase.from('autos_infracao').update()`. Confirma bucket `documentos-autos` e o uso do
esquema de URL customizado `storage://bucket/path` também para autos, consistente com o
resto do sistema. Esta regra de transição de estado precisa ganhar um lar explícito no
módulo de domínio `autos` na fase 2 — hoje ela só existe implicitamente, espalhada pelas
condições `disabled` dos botões e pelo corpo de `handleUpload`.

## `src/components/prestador/HistoricoFiscalizacoes.jsx` (147 linhas)

Sem achado novo — quatro consultas encadeadas (`unidades` → `determinacoes`/`recomendacoes`/
`nao_conformidades`, filtradas por lista de IDs) seguindo exatamente o padrão já catalogado
em outros lugares. Candidato a agregação no servidor na fase 2, fora do escopo desta fase.

## Resumo do lote 5

| Arquivo | Linhas | Esforço | Observação |
|---|---|---|---|
| `PhotoGrid.jsx` | 697 | Alto | URL pública de fallback provavelmente nunca funciona; precisa de estado de "carregando" neutro |
| `RelatorioFiscalizacao.jsx` | 448 | Alto | Namespace de cache amarrado à URL do Supabase; pré-sync obrigatória; remontagem de PDF multi-parte |
| `HistoricoFiscalizacao.jsx` | 490 | **Alto** | Auditoria via `audit_logs` em JSONB + filtro PostgREST complexo — categoria nova, sem equivalente Django óbvio |
| `ExportarPDFConsolidado.jsx` | 159 | Baixo | N+1 de contagem, sem acoplamento novo |
| `FluxoUploadDocumentos.jsx` | 239 | Médio | Máquina de estados do auto embutida na UI, precisa de lar no domínio `autos` |
| `HistoricoFiscalizacoes.jsx` (prestador) | 147 | Baixo | Sem achado novo |

---

# Lote 6 — Páginas (43 arquivos, ~18.100 linhas)

## Achado estrutural que muda a leitura: dois grupos nítidos

Ao classificar as 43 páginas por uso de `supabase.*` versus `Repository.*`, ficou claro que
o acoplamento direto **não está distribuído uniformemente**. `VistoriarUnidade.jsx` — a
maior página do sistema, 2.323 linhas — tem **zero** chamadas diretas ao Supabase; tudo
passa pelo `Repository`, já lido por completo no lote 3b. O mesmo vale para boa parte das
páginas do módulo DSB de campo.

| Grupo | Páginas | Característica |
|---|---|---|
| **Só `Repository`/módulos já lidos** | `VistoriarUnidade` (2323L), `AdicionarUnidade`, `Contratos`, `DefinicoesDTR`, `ExecutarFiscalizacao(DTR)`, `Fiscalizacoes`, `Home`, `Municipios`, `NovaFiscalizacao(DTR)`, `PortalPrestadorHome` (764L) | Migração **herdada** automaticamente da troca de implementação de `Repository`/`syncEngine` — nenhuma mudança própria necessária para as categorias de dados já cobertas |
| **Só módulos de domínio já lidos** (`caters/*`) | `CatersDashboard`, `CatersProcessoDetalhe` (1501L), `CatersProcessos`, `CatersRecomendacoes` | Idem, herdada da troca em `src/lib/caters/*` |
| **Só `AuthContext`/sem dado** | `Login`, `Definicoes`, dashboards vazios (`Catefis`, `Categas`, `Catene`, `Catransp`, `Creg`, `Cres`, `Cret` — 57 linhas cada, provavelmente placeholder) | Sem acoplamento a tratar |
| **Acoplamento direto real** | 18 páginas, listadas abaixo | Precisam de leitura e migração próprias |

Esta tabela por si só é um achado: o esforço de migração das páginas está concentrado em
**18 de 43 arquivos**, não distribuído igualmente. As páginas "só Repository" continuam
carregando risco — mas esse risco já foi inteiramente capturado nos lotes 1-5.

## `src/pages/ExportarImportar.jsx` (550 linhas — lido por completo, 17 chamadas diretas)

**Achado de valor, não só de risco**: esta página já é uma ferramenta completa de
exportação/importação entre instâncias — exporta todas as fiscalizações finalizadas e dados
relacionados (unidades, respostas, NCs, determinações, recomendações, constatações, termos)
como um pacote JSON versionado (`"versao": "1.0"`), incluindo **reupload de fotos** e
**remapeamento de ID** (`idMap`) na importação. É a **quinta implementação independente** do
parser de URL de storage (`parseStorageUrl`, linha 133) — mesma lógica de
`repository.ts`, `caters/documents.js`, `storageCleanup.js` e o parser interno de
`syncEngine.ts`.

Isto é relevante além do escopo desta fase: é prova de conceito já existente e testada para
exatamente o problema que a migração final de dados (fase 2/3) vai enfrentar — exportar de um
backend, remapear IDs, reenviar arquivos, importar no outro. Vale avaliar se esta ferramenta
(ou sua lógica) pode ser reaproveitada/estendida para a migração de dados real, em vez de
reconstruída do zero.

**Para esta fase**: a página precisa migrar para a superfície de domínio como consumidora de
operações em lote com remapeamento de FK entre 7 entidades — um padrão de acesso a dados
("importar lote com regeneração de ID e reescrita de referência") que nenhum outro lugar do
sistema usa desta forma, e que o contrato de domínio precisa acomodar explicitamente.

## `src/pages/GerenciarTermos.jsx` (1.780 linhas — a maior página com acoplamento direto; 15 chamadas)

**Achado mais grave de todo o levantamento de arquivos de storage**: a função
`uploadFileToStorage` (linha 231) não apenas tenta múltiplos nomes de bucket — ela chama
**`supabase.storage.listBuckets()`** para enumerar todos os buckets existentes no projeto,
depois monta uma lista de **14 candidatos fixos** (`documentos-termos`,
`documentos_termos`, `documentos-termo`, `termos-notificacao`, `termos_notificacao`,
`documentos`, `arquivos`, `files`, `public`, `evidencias-determinacoes`,
`relatorios_fiscalizacao`, `fotos_fiscalizacao`, `documentos-prestadores`,
`documentos-autos`), pontua cada um por palavra-chave no nome, e tenta o upload em ordem de
pontuação até um funcionar — cacheando o vencedor (`cachedTermosBucketName`,
`cachedAvailableBuckets`, variáveis de módulo, sobrevivem entre chamadas mas não entre
recarregamentos de página).

Isso eleva a conclusão do lote 3b: **o nome do bucket de termos de notificação em produção é
genuinely desconhecido do código-fonte** — o próprio aplicativo precisa perguntar ao Supabase
quais buckets existem e adivinhar por heurística de nome. A auditoria de storage necessária
antes da fase de arquivos precisa incluir, no mínimo, chamar `listBuckets()` contra o projeto
real e documentar o resultado — nenhuma lista extraída do código é confiável sozinha.

**Outro achado**: `calcularStatusTermo` (linha 318) é uma máquina de estados completa do
termo de notificação — deriva o status (`pendente_tn` → `aguardando_assinatura_prestador` →
`aguardando_resposta`/`prazo_vencido` → `respondido`) a partir da presença de arquivos e
datas, **calculada no cliente e depois persistida** via `update({ ..., status })`. Mesmo
padrão do achado em `FluxoUploadDocumentos.jsx` (lote 5): regra de negócio de transição de
estado vivendo dentro do componente de UI, não em um módulo de domínio. Combinado, os dois
achados apontam para a mesma necessidade na fase 2: os domínios `termos` e `autos` precisam
de um dono explícito para suas máquinas de estado, hoje implícitas e replicadas onde forem
necessárias.

Também confirma: `calcularNumeroAM` (linha 219) busca **todos** os termos do banco para
calcular localmente o próximo número sequencial de AM (sem RPC atômica, ao contrário da
numeração de autos vista no lote 3b) — condição de corrida latente entre dois usuários
gerando AM ao mesmo tempo, comportamento existente a preservar (FR-021), não a corrigir
aqui.

## `src/pages/GestaoAutos.jsx` (968 linhas — lido por completo, 8 chamadas diretas)

**Achado que estende o padrão de incerteza de schema para nomes de coluna, não só de
bucket**: `penaBaseRsColumn` (linha 118) **inspeciona as chaves do primeiro registro
retornado** de `autos_infracao` para descobrir qual de 6 nomes candidatos
(`pena_base_rs`, `pena_base_reais`, `pena_base_real`, `pena_base_em_reais`,
`pena_base_valor_rs`, `pena_base_valor`) realmente existe na tabela em produção. É a mesma
técnica de "descobrir por tentativa contra o dado real" já vista para buckets — só que agora
aplicada a uma **coluna**. Confirma que o desalinhamento entre código e schema, documentado
extensivamente no núcleo offline (lote 3a/3b), também alcança páginas de UI comuns. Qualquer
inventário de schema feito antes da fase 2 precisa incluir uma consulta real ao banco de
produção, não confiar nas migrations como fonte única de verdade.

**Achado de domínio**: a máquina de estados do auto de infração e da remessa de IA está
majoritariamente aqui, não em nenhum módulo de serviço — `gerado` → `enviado` → `em_análise`
→ `finalizado` para o auto, e `preparada` → `enviada` → `recebida` → `defesa_enviada` →
`parecer_enviado` para a remessa, com regras de elegibilidade calculadas no cliente
(`autosProntosParaRemessa`: exige arquivo, prestador, fiscalização e as duas penas base
preenchidas). `criarEEnviarRemessa` gera um PDF de manifesto (jsPDF) no navegador, faz upload
como documento do auto, e só então atualiza status em lote — com **fallback silencioso**
entre dois caminhos de atualização de status (`supabase.from(...).update()` direto, e se
falhar, `Repository.updateAutoInfracaoOnlineStatus`) nas linhas 481-487. Confirma, mais uma
vez, que os domínios `autos` e `remessas` precisam de dono explícito na fase 2 para essas
máquinas de estado — atualmente replicadas e level implícitas em pelo menos três arquivos
(`FluxoUploadDocumentos.jsx`, `GerenciarTermos.jsx`, este).

## `src/pages/AnaliseManifestacao.jsx` (920 linhas — lido por completo, 8 chamadas diretas)

Continuação do mesmo domínio (`termo` → `determinação` → `resposta` → `auto de infração`),
com a etapa de análise de manifestação do prestador e geração de AM (auto de manifestação).

**Achado (⚠️ corrigido depois de ler o SQL real — ver nota)**: `concluirAm` usa
`Repository.gerarNumeroAmOnline` e `gerarNumeroAutoOnline` (já catalogadas no lote 3b) para
numeração, enquanto `calcularProximoNumeroTN` (linha 297), no mesmo arquivo, calcula o
número do **próximo TN** buscando todos os termos e contando no cliente.

> **Correção**: quando este achado foi escrito, eu chamei `gerarNumeroAmOnline`/
> `gerarNumeroAutoOnline` de "RPCs atômicas" só por serem funções de banco — **sem ter lido
> o corpo delas**. Lendo o SQL real (`gerar_numero_auto`, `gerar_numero_am` — ver
> [rpcs-funcoes-e-triggers-postgres.md §4](./rpcs-funcoes-e-triggers-postgres.md)), as duas
> fazem `SELECT COUNT(*) + 1` **sem nenhuma trava**, exatamente a mesma fragilidade de
> `calcularProximoNumeroTN`. **Nenhuma das três numerações do sistema é atômica** — TN, AM e
> auto de infração podem todas colidir sob concorrência, gerando dois documentos oficiais
> com o mesmo número. Isto deixou de ser "comportamento a preservar" e passou a ser
> candidato real a correção (ver `debitos-tecnicos-e-inconsistencias.md`, item 1) — decisão
> do usuário, não algo que esta fase deva corrigir por conta própria.

**Achado**: `excluirAnalise` (linha 219) é uma operação de "desfazer" que reverte manualmente
uma cascata de efeitos — apaga autos de infração gerados, apaga respostas de determinação, e
limpa os campos de AM do termo — como uma sequência de chamadas individuais sem transação.
Confirma o padrão já visto em `storageCleanup.js`: exclusão em cascata orquestrada
inteiramente em JavaScript, sem garantia atômica entre os passos.

Sem outros achados novos de acoplamento — geração de PDF de análise (jsPDF), leitura de
autos por determinação, e o restante segue os padrões de sintaxe PostgREST já catalogados.

## `src/pages/AcompanhamentoDeterminacoes.jsx` (649 linhas — lido, 8 chamadas)

Painel somente-leitura: 8 consultas `.select('*')` sem filtro, buscando tabelas inteiras
(`determinacoes`, `respostas_determinacao`, `autos_infracao`, `unidades_fiscalizadas`,
`fiscalizacoes`, `municipios`, `prestadores_servico`, `termos_notificacao`) e fazendo todo o
cruzamento (join) em memória no cliente. Nenhum acoplamento novo — confirma o padrão de
"buscar tudo, juntar no JS" já registrado em outras páginas, candidato a agregação no
servidor na fase 2, fora do escopo desta fase (FR-004 exige paridade, não otimização).

**Achado pequeno mas real**: `getDataLimiteComTermo` recalcula o prazo a partir da data de
protocolo do TN quando disponível, com fallback para o campo `data_limite` armazenado — mais
uma regra de negócio de prazo vivendo em página de dashboard.

## `src/pages/Checklists.jsx` (657 linhas — lido em parte relevante, 5 chamadas)

**Achado de maior impacto no modelo de dados de toda a leitura de páginas**: `itens_checklist`
**nunca é atualizado nem apagado em linha** — é **append-only**. `updateMutation` (linha 100)
insere uma **linha nova** com `ativo: true` para a versão editada e, se a chave semântica do
item mudou (`ordem` ou `pergunta` normalizada), insere também uma segunda linha "tombstone"
(`ativo: false`) preservando os dados antigos. `deleteMutation` (linha 146) também **insere**
uma linha nova com `ativo: false`, em vez de apagar ou marcar a existente.

Isso não é acidente — é o motivo pelo qual `repository.ts` (`getItensChecklistForUnidade`,
lote 3b) faz deduplicação por chave semântica escolhendo a versão mais recente por
`created_at`, com um parâmetro `asOfIso` para reconstituir "qual era a pergunta vigente
quando esta unidade foi vistoriada". **O sistema versiona itens de checklist deliberadamente
para que respostas antigas continuem referenciando o texto que existia no momento em que
foram respondidas** — mudar a pergunta de um item não deve alterar retroativamente o que uma
vistoria já registrou.

**Consequência para a fase 2**: este é um padrão de modelagem de dados real, não um detalhe
de acesso. Se o Django tratar `itens_checklist` como uma tabela CRUD comum (update in place),
o histórico de vistorias passa a exibir o texto atual em vez do texto vigente à época — uma
regressão silenciosa e sutil, exatamente do tipo que FR-004 (paridade) existe para pegar. O
domínio de `cadastros`/checklist na fase 2 precisa decidir conscientemente entre reproduzir
o append-only (mais fiel) ou introduzir versionamento explícito (mais limpo) — não pode
"simplificar para update" sem essa decisão ser deliberada.

Também confirma: `handleImport` (linha 190) faz importação em lote de itens de checklist via
planilha XLSX, com matching de tipo de unidade por nome/código e criação automática de tipos
ausentes — sem achado de acoplamento novo além do já catalogado.

## `src/pages/DetalhePrestador.jsx` (597 linhas — seções com `supabase.*` lidas, 4 chamadas)

**Novo bucket, e o primeiro confirmadamente público**: `logos-entidades` usa
`getPublicUrl()` (linha 154), não URL assinada — ao contrário de todos os buckets de
fotos/documentos vistos até aqui, que usam assinatura com expiração. Confirma também
`documentos-prestadores` (já visto no lote 2). **Consequência para o contrato de arquivos**:
a categoria *Arquivos* do provedor precisa suportar dois modos de acesso — público direto e
assinado com expiração — não pode assumir que todo arquivo é privado.

## `src/pages/TiposUnidade.jsx` (366 linhas — seções com `supabase.*`, 4 chamadas)

CRUD padrão sobre `tipos_unidade`, com exclusão sempre lógica (`update({ ativo: false })`,
nunca `delete`) e reativação simétrica. Contraste que vale registrar: **`tipos_unidade` usa
update-in-place com soft-delete**, enquanto `itens_checklist` (achado do arquivo anterior) é
**append-only** — duas tabelas do mesmo domínio, duas estratégias de mutação diferentes, e a
fase 2 precisa preservar ambas exatamente como estão, não uniformizar. Todas as mutações
exigem `online` explicitamente (guardas `if (!online) throw ...`), confirmando que
administração de cadastros não passa pelo caminho offline-first.

## `src/pages/GerenciarUsuarios.jsx` (584 linhas — seções com `supabase.*`, 3 chamadas)

**Novas RPCs**: `admin_delete_user` e `admin_delete_user_by_email` (linhas 123, 139) —
exclusão administrativa de usuário, quase certamente uma função `SECURITY DEFINER` que
chama a API administrativa do Supabase Auth por trás (um cliente comum não pode apagar
usuário de outro diretamente). **A categoria *Identidade e sessão* do contrato do provedor
precisa de uma capacidade administrativa explícita** — exclusão de usuário por um
administrador — que não estava prevista nas operações de autoself-service já catalogadas
(autenticar, sessão, renovar). No Django, o equivalente natural é uma view/endpoint
restrita a superusuário, não uma função de banco.

## `src/pages/PareceresTecnicos.jsx` (443 linhas — 3 chamadas)

Sem achado novo — três consultas `.select('*')` seguindo exatamente o padrão já catalogado.

## `src/pages/VistoriarOcorrenciaDTR.jsx` (1.505 linhas — seções com `supabase.*`, 3 chamadas)

Ferramenta administrativa embutida na página para **reprocessar em lote fotos DTR
antigas**: baixa a imagem original do Storage, reaplica a marca d'água (reaproveitando a
lógica geoespacial do lote 3b), envia a nova versão, e remove os arquivos antigos — tudo
direto via `supabase.storage`, sem passar pelo `Repository`. Confirma o padrão
download→processar→upload→excluir já visto em outros lugares, sem categoria de acoplamento
nova. É mais uma evidência de que operações administrativas/de manutenção tendem a ser
implementadas ad hoc, direto no componente, fora do caminho principal offline-first.

## `src/pages/PrestadoresServico.jsx` (694 linhas — 2 chamadas)

Sem achado novo — confirma `logos-entidades` como bucket público, consistente com
`DetalhePrestador.jsx`.

## `src/pages/FiscalizacoesDTR.jsx` (540 linhas — 2 chamadas)

Exportação em lote de fotos DTR para um arquivo ZIP (pastas `Com_Marca_Dagua`/
`Sem_Marca_Dagua`), baixando cada foto do Storage individualmente. Confirma a categoria
*Arquivos* (download) já catalogada; sem acoplamento novo.

## `src/pages/CatesaDashboard.jsx` (191 linhas — 2 chamadas)

Sem achado novo — duas consultas simples de contagem por status, padrão já catalogado.

## `src/pages/Relatorios.jsx` (1.021 linhas — 1 chamada, mas de peso)

**RPC nova e complexa**: `obter_resumo_indicadores` (linha 574), com 5 parâmetros
(`p_anos`, `p_servicos`, `p_municipio_ids`, `p_prestador_ids`, `p_tipo_modulo`) — uma função
de agregação server-side para o painel de indicadores, filtrando e sumarizando
possivelmente milhares de linhas no banco antes de devolver ao cliente. Diferente das RPCs
de numeração (que são simples contadores atômicos), esta é **lógica de negócio de
agregação real**, do tipo mais caro de reproduzir fielmente em Django — não é tradução
direta de nome de função, é reimplementar a lógica de sumarização (provavelmente com
`GROUP BY` e filtros condicionais) como uma consulta ORM equivalente ou SQL bruto.

## `src/pages/AnalisarResposta.jsx` (993 linhas — 1 chamada)

Inserção em lote de `autos_infracao` a partir de determinações não atendidas — mesmo
domínio já catalogado (lotes GestaoAutos/AnaliseManifestacao), sem achado novo.

## `src/pages/Register.jsx` (374 linhas — 1 chamada)

`supabase.auth.signUp()` com metadados no cadastro (`options.data: { full_name, ... }`) —
completa a categoria *Identidade e sessão* do contrato: autocadastro com perfil inicial, não
só autenticação de usuário já existente.
