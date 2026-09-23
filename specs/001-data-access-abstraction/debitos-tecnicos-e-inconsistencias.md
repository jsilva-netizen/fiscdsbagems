# Débitos Técnicos, Inconsistências e Oportunidades de Melhoria

**Feature**: Camada de Abstração de Acesso a Dados (contexto para a fase 2)
**Date**: 2026-09-18
**Fonte**: leitura integral dos 49 arquivos acoplados ([inventario-acoplamento.md](./inventario-acoplamento.md)) mais as RPCs/triggers reais ([rpcs-funcoes-e-triggers-postgres.md](./rpcs-funcoes-e-triggers-postgres.md)).

## Como ler este documento

Cada item recebe uma classificação de ação — isto é o que evita que este catálogo vire uma
lista de "coisas erradas" sem direção:

| Classificação | Significado |
|---|---|
| 🔴 **Corrigir agora** | Defeito com risco real (perda/duplicação/corrupção de dado); candidato a FR-022 desta própria fase |
| 🟡 **Decidir na fase 2** | Não é urgente, mas a reimplementação em Django não pode "herdar sem pensar" — exige escolha consciente |
| 🟢 **Preservar, revisitar depois** | Funciona, não é urgente, mas vale simplificar quando o domínio for redesenhado |
| ⚪ **Só registrar** | Achado de contexto, sem ação necessária |

Nenhum item aqui deve ser corrigido **dentro desta fase** de desacoplamento sem decisão
explícita sua — o próprio `concept.md` exclui "otimização de performance" e "melhoria de UX"
do escopo, e a constituição (Princípio IV) exige que a produção não seja tocada por conta
própria. Este documento existe para **decisão**, não para execução automática.

---

## 🔴 Corrigir agora (ou decidir explicitamente não corrigir)

### 1. Numeração sequencial de TN, AM e auto de infração não é atômica em nenhum caso

Todas as três usam `SELECT COUNT(*) + 1`, sem trava. Dois usuários gerando ao mesmo tempo
podem produzir **o mesmo número oficial em dois documentos diferentes** — termo de
notificação, auto de manifestação ou auto de infração, todos com efeito jurídico sobre uma
concessionária regulada. Detalhe completo em
[rpcs-funcoes-e-triggers-postgres.md](./rpcs-funcoes-e-triggers-postgres.md), seção 4
(`gerar_numero_auto` / `gerar_numero_am`).

**✅ Decisão do usuário (2026-09-18)**: **deferir para a fase Django.** Esta fase (camada de
abstração) preserva o comportamento atual fielmente, fragilidade incluída — nenhuma
correção client-side. A correção real (sequência atômica ou `SELECT FOR UPDATE`) fica
registrada como item de entrada obrigatório para o `/speckit-plan` da reimplementação em
Django.

### 2. `finalizar_fiscalizacao` gera o número do termo por *ranking*, não por contador

Não é bug — é comportamento correto e intencional — mas é **fácil de replicar errado**: o
número não é "próxima sequência ao finalizar", é a posição da fiscalização na ordem de
criação entre todas do mesmo ano, recalculada a cada finalização. Um Django que assumisse
"contador simples" produziria números diferentes dos que o sistema atual geraria para os
mesmos dados. Não é um defeito a corrigir — é um requisito de fidelidade a não errar.

### 3. `enforce_profile_security`: controle de segurança que não é RLS

Se a fase 2 replicar só as RLS policies e esquecer deste trigger, a proteção contra
auto-promoção a admin desaparece silenciosamente — ninguém vai "sentir falta" dela até
alguém explorar. Ver [rpcs-funcoes-e-triggers-postgres.md](./rpcs-funcoes-e-triggers-postgres.md),
seção 8, subseção `enforce_profile_security()`.
**Ação**: incluir como caso de teste nomeado na suíte de autorização exigida por FR-010.

---

## 🟡 Decidir na fase 2 (não corrigir agora, mas não herdar sem pensar)

### 4. Duas implementações independentes de "gerar NC/determinação/recomendação do checklist"

Uma em PL/pgSQL (`gerar_ncs_unidade`, servidor, chamada ao finalizar), outra em TypeScript
(`syncDeterminacoesFromChecklist`/`syncRecomendacoesFromChecklist` em `repository.ts`,
cliente, caminho offline). As duas precisam concordar hoje, mantidas por disciplina humana,
sem teste de paridade. É o maior risco técnico de toda a migração — ver
[rpcs-funcoes-e-triggers-postgres.md](./rpcs-funcoes-e-triggers-postgres.md), seção 1.

### 4a. Opção B (geração só no servidor) precisa resolver edição offline de texto já gerado — sem isso não é segura

Achado de 2026-09-21, ao avaliar concretamente a Opção B do item 4. Hoje o cliente não manda
só respostas cruas: ele mesmo gera e sincroniza as linhas de `determinacoes`/`recomendacoes`
offline (`syncDeterminacoesFromChecklist`/`syncRecomendacoesFromChecklist`,
`repository.ts:870-1330`), indexadas por `origem` (`checklist:<item_id>` ou
`manual_constatacao:<id>`), e o fiscal pode editar o texto gerado porque a linha **já existe
localmente** no momento da edição.

Duas propriedades já favorecem a Opção B e não precisam de decisão nova:

- **Reordenar é irrelevante.** A geração é indexada por `item_checklist_id`/id da constatação,
  nunca por posição na tela.
- **Editar uma resposta (SIM↔NÃO) offline é seguro por construção**, porque
  `gerar_ncs_unidade` já é full-recompute — relê o estado completo da unidade a cada execução,
  deduplica por mais recente e apaga só órfãos. Tolera qualquer ordem de chegada, desde que
  rode **depois** de todos os dados da unidade estarem sincronizados.

O que falta resolver, e não é automático: se a geração passa a ser só do servidor, uma linha de
`determinacoes`/`recomendacoes` **não existe no dispositivo** até o servidor rodar
`gerar_ncs_unidade` sobre dados já sincronizados. Uma edição de texto feita offline, antes de
qualquer sync, precisa ficar numa fila esperando a linha existir e ser aplicada **depois** que o
servidor a criar — mecanismo que não existe hoje nem do lado cliente nem do lado servidor.

**Decisão pendente, condição para escolher entre Opção A e B no `/speckit-plan` da fase
Django**: desenhar (ou descartar, conscientemente) a aplicação diferida de edição offline a
registro ainda não existente no servidor. Antes de decidir, escrever um cenário de teste e2e
nomeado cobrindo, na mesma fiscalização e sem sync intermediário: responder checklist offline →
editar uma resposta → inserir constatação manual offline → editar o texto de uma determinação
gerada → sincronizar → conferir convergência com o resultado que o sistema atual produziria.

### 5. `itens_checklist` é append-only por design — nunca é atualizado nem apagado em linha

Update e delete inserem linhas novas (uma ativa, opcionalmente uma "tombstone" inativa),
preservando o texto vigente à época de cada vistoria. Achado do inventário de acoplamento
(lote 6, `Checklists.jsx`). Uma migração para "update in place" seria regressão sutil e
silenciosa no histórico de vistorias. **Decisão pendente**: reproduzir o append-only tal como
está, ou introduzir versionamento explícito mais limpo (ex.: uma tabela de histórico
separada) — ambas são fiéis à intenção, mas são desenhos diferentes.

### 6. Nomes de bucket e de coluna são descobertos em tempo de execução, não conhecidos estaticamente

Até 14 candidatos de nome de bucket tentados em sequência (`GerenciarTermos.jsx`), uma
chamada real a `listBuckets()`, até 6 candidatos de nome de coluna inferidos do primeiro
registro retornado (`GestaoAutos.jsx`, `pena_base_rs` e variantes). **Ação necessária antes
da fase de dados**: auditoria real contra o projeto Supabase (schema efetivo + lista de
buckets), não confiar em migrations nem no código como fonte única.

### 7. O mesmo bucket (`fotos_fiscalizacao`) é tratado como público num arquivo e como privado/assinado em outro

`ResponderTermo.jsx` usa `getPublicUrl()` com comentário explícito de que o bucket é público
(migration 044); `PhotoGrid.jsx`/`repository.ts` usam assinatura com expiração de 30 min para
o mesmo bucket. Os dois "funcionam", mas representam modelos mentais divergentes.
**Decisão**: confirmar o regime real do bucket e unificar a forma de acesso na camada nova.

### 8. Cinco pontos do núcleo offline toleram desalinhamento de schema fazendo *parsing* de mensagem de erro do PostgREST

Removem coluna do payload e reenviam, até 6 tentativas, em `syncEngine.ts` e
`repository.ts`. As mensagens reconhecidas são específicas do PostgREST e não existirão no
Django. **Decisão**: a camada nova precisa de um mecanismo equivalente e explícito (ex.:
validação de schema antes do envio) ou aceitar que este comportamento de tolerância
simplesmente deixa de existir — mas a escolha precisa ser deliberada, não uma omissão.

### 9. `set_fiscalizacao_cache_fields` (trigger) e o cliente preenchem os mesmos campos, de forma redundante

O trigger denormaliza `municipio_nome`/`prestador_servico_nome`/`fiscal_nome`
automaticamente; `Repository.createFiscalizacao` e o backfill em `syncDown` tentam fazer o
mesmo no cliente. Hoje não conflita porque concordam. **Decisão**: no Django, a
denormalização deveria viver só de um lado — provavelmente só no servidor, com o cliente
parando de tentar preencher esses campos.

### 10. Máquinas de estado de negócio inteiras vivem dentro de componentes de UI, replicadas

Auto de infração (`gerado`→`enviado`→`em_análise`→`finalizado`), termo de notificação
(`pendente_tn`→...→`respondido`), remessa de IA (`preparada`→...→`parecer_enviado`) — cada
uma implícita e espalhada em pelo menos três arquivos (`FluxoUploadDocumentos.jsx`,
`GerenciarTermos.jsx`, `GestaoAutos.jsx`, `AnaliseManifestacao.jsx`). **Decisão**: os
domínios `autos`, `termos` e `remessas` da fase 2 precisam de um dono explícito para essas
transições — não podem continuar implícitas em condições de botão desabilitado.

### 11. Auditoria (`audit_logs`) é categoria própria, sem equivalente óbvio em Django

JSONB com `old_data`/`new_data`, filtro PostgREST complexo (`and(...)` combinado com
operadores de caminho JSON), povoada por 6 triggers `trg_audit_*` não lidos em profundidade.
**Decisão**: escolher entre reproduzir o formato old_data/new_data (menor mudança na UI de
histórico) ou adotar mecanismo idiomático do Django (`django-simple-history`,
`django-auditlog`, ou signals customizados) com nova UI de apresentação.

---

## 🟢 Preservar agora, simplificar quando o domínio for redesenhado

### 12. `catesa/aiJobs.js` é cópia quase literal de `caters/aiJobs.js`

~55 linhas duplicadas (mesmo polling, mesmas constantes, mesma mensagem de erro). Comportamento
idêntico, então unificar não viola FR-004 — mas não é urgente.

### 13. `computeResponseDueAt` duplicada, idêntica, entre `caters/processes.js` e `caters/dashboard.js`

Mesmo corpo de função em dois arquivos.

### 14. Regra `SERVICES_BY_DIRETORIA` (mapeamento diretoria→serviços) duplicada em `repository.ts`

Copiada literalmente em `listPrestadores` e `listPrestadoresFull`.

### 15. Renumeração e derivação de recomendação/determinação duplicadas entre as duas entidades

`recomputeRecomendacoesNumeracao`/`recomputeDeterminacoesNumeracao` e os pares
`sync*FromChecklist` em `repository.ts` — mesma técnica de renumeração em duas fases,
replicada para duas entidades quase idênticas.

### 16. Padrão N+1 em relatórios/dashboards client-side

`ExportarPDFConsolidado.jsx` faz 3 consultas de contagem por unidade, sem agregação no
servidor; `HistoricoFiscalizacoes.jsx` (prestador) e `AcompanhamentoDeterminacoes.jsx`
buscam tabelas inteiras e cruzam em memória. Candidatos naturais a agregação server-side no
Django (o próprio `obter_resumo_indicadores` já mostra que o sistema sabe fazer isso quando
quer).

### 17. Quatro implementações independentes do mesmo parser de URL de storage

`repository.ts` (`parseStorageUrl`), `caters/documents.js` (`parseCatersFileRef`),
`storageCleanup.js` (`parseStorageRef`), `ExportarImportar.jsx` (cópia inline). Mesma lógica,
quatro cópias. Naturalmente resolvido pela existência da camada de abstração desta fase — a
categoria *Arquivos* do contrato do provedor já centraliza isso.

### 18. Quatro noções independentes de "quem é o usuário"/"estou online"

`useOnline` (alcançabilidade), `AuthContext` (sessão), `SyncStatusContext` (sessão
duplicada), `PageNotFound` (React Query próprio). Já registrado como objetivo desta própria
fase de convergir — não é um item novo, é lembrete de que a convergência é trabalho real,
não trivial.

---

## ⚪ Só registrar — contexto, sem ação necessária

### 19. `numerationHelper.jsx` é online-only, contrariando o padrão offline-first do resto do app

Comportamento existente, não um defeito por si — mas vale saber que nem tudo segue o mesmo
modelo.

### 20. Mensagens de erro voltadas ao usuário final mencionam infraestrutura específica

"Verifique se as edge functions de IA foram implantadas e se a GEMINI_API_KEY está
configurada" (`caters/aiJobs.js`, `catesa/aiJobs.js`). Ficam obsoletas/confusas após a
migração — precisam de revisão de texto quando o backend mudar, não é bug, é manutenção de
copy.

### 21. `.limit()` fixo e inconsistente em consultas de agregação client-side

1000/2000/5000 em pontos diferentes de `caters/dashboard.js` e `caters/recommendations.js` —
truncamento silencioso além do teto, sem aviso ao usuário. Defeito existente (FR-021 manda
preservar), mas registrado aqui para não ser esquecido quando o domínio for redesenhado.

### 22. Andaime/texto de desenvolvimento remanescente

`PageNotFound.jsx` tem texto em inglês sobre "a IA não implementou esta página ainda, peça
no chat" — não é acoplamento, é limpeza cosmética para quando alguém passar por ali.

### 23. `ExportarImportar.jsx` já resolve, em miniatura, o problema da migração de dados real

Exportação/reimportação entre instâncias com remapeamento de ID. Vale avaliar seu
reaproveitamento (ou ao menos sua lógica) para a migração de dados da fase 2/3, em vez de
reconstruir do zero — ver inventário de acoplamento, lote 6.

---

## Triggers e funções ainda não lidos — bloqueiam o desenho completo da fase 2

Estes precisam ser lidos com o mesmo rigor das seções 1-7 do documento de RPCs antes do
`/speckit-plan` da próxima fase, porque tocam autorização e fluxo de dados diretamente:

- `trg_camara_autos`, `trg_camara_fiscalizacoes`, `trg_camara_remessas` — preenchimento
  automático de `camara_tecnica_id`, tocando a fronteira de isolamento mais importante do
  sistema.
- `process_audit_log()` — a função por trás dos 6 triggers de auditoria.
- `is_caters_user()` — autorização usada por `caters_import_from_fiscalizacao`.
- `sync_dates_itens_checklist`, `on_auth_user_created`, `on_profile_approved`,
  `trg_termos_notificacao_set_ano_geracao` — não lidos, escopo desconhecido.

## Resumo por número

- **3 itens** exigem decisão de correção imediata (🔴), sendo o mais grave a numeração não
  atômica de documentos com efeito jurídico.
- **9 itens** exigem decisão consciente de design na fase 2 (🟡), sem os quais a
  reimplementação corre risco real de regressão silenciosa ou brecha de segurança.
- **7 itens** são limpeza de baixo risco, adiável (🟢).
- **5 itens** são apenas contexto (⚪).
- **8 triggers/funções** permanecem não lidos e bloqueiam o desenho completo da autorização
  e do fluxo de dados da fase 2.
