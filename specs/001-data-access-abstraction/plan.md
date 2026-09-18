# Implementation Plan: Camada de Abstração de Acesso a Dados

**Branch**: `migracao-sisreg` | **Date**: 2026-09-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-data-access-abstraction/spec.md`

## Summary

Concentrar todo o acesso a dados do frontend em uma camada única, para que a fase seguinte
da migração troque o backend alterando uma implementação em vez de percorrer o aplicativo.
Ao final desta fase o sistema continua operando sobre o Supabase, com comportamento
idêntico ao atual, comprovado por uma suíte automatizada ponta a ponta que hoje não existe.

O acoplamento medido no código tem **duas classes distintas**, e a segunda é a mais
perigosa porque é invisível às ferramentas que detectam a primeira.

**Classe A — via cliente**: 222 pontos de chamada em 44 arquivos (158 acessos a tabelas, 35
a arquivos, 21 a identidade/sessão, 8 a procedimentos remotos).

**Classe B — sem o cliente**: uso direto das variáveis `VITE_SUPABASE_*` e de formatos de
URL do Supabase, em 3 arquivos adicionais que nem importam o cliente, mais 11 ocorrências
de URL de armazenamento montada à mão em 6 arquivos:

| Ponto | O que faz |
|---|---|
| `src/hooks/useOnline.js` | Detecta conectividade requisitando `/auth/v1/health` e `/rest/v1/` do Supabase |
| `src/lib/offline/syncEngine.ts` | Possui função própria de alcançabilidade, idem |
| `src/lib/edgeFunctions.js` | Monta `/functions/v1/{nome}` e chama por `fetch` direto, sem o cliente |
| `PhotoGrid.jsx`, `RelatorioFiscalizacao.jsx`, `caters/documents.js`, `offline/repository.ts`, `storageCleanup.js`, `ExportarImportar.jsx`, `VistoriarUnidade.jsx` | Constroem URL pública no formato `/storage/v1/object/public/{repositório}/{caminho}` |

**Total: 47 arquivos acoplados.**

O projeto possui três costuras parciais que reduzem o risco — `src/lib/edgeFunctions.js`
(consumidores já não chamam função diretamente, embora a implementação seja acoplada por
URL), `src/lib/offline/repository.ts` (padrão de repositório já aplicado ao caminho offline)
e `src/lib/AuthContext.jsx` (identidade majoritariamente centralizada). O trabalho é
**completar e unificar um padrão que já começou**, não introduzir um conceito novo.

**Classe C — sintaxe de consulta**: cerca de 700 operadores encadeados (`.select(` 209,
`.eq(` 141, `.update(` 117, `.order(` 46, `.in(` 44, `.single()` 33, `.delete()` 33,
`.insert(` 32, `.maybeSingle()` 26, `.limit(` 15, `.upsert(` 13, e uma cauda menor).
É a medida do trabalho real: os 158 acessos a tabela não são 158 traduções simples, cada um
carrega em média quatro a cinco operadores no formato do backend atual. *(Limite conhecido:
parte dos `.update(` pertence ao Dexie, não ao Supabase — a atribuição exata exige análise
cadeia a cadeia, que pertence ao `/speckit-tasks`.)*

⚠️ **A descoberta mais importante do levantamento**: a detecção de estar online ou offline
está acoplada ao Supabase. Na fase 2, com o Supabase desligado, o aplicativo se consideraria
**permanentemente offline** — e como o modo offline funciona, a falha não se manifesta como
erro: a fila local acumula e nunca sincroniza. É a falha silenciosa que o Princípio I da
constituição existe para impedir. Por isso o contrato do provedor ganhou uma oitava
categoria, *Alcançabilidade*.

### Fora de `src/` — acoplamento não coberto por esta fase

A varredura do repositório inteiro encontrou acoplamento adicional, que **não** está no
escopo desta fase mas precisa estar registrado para não ser esquecido:

| Local | Natureza | Quando tratar |
|---|---|---|
| `scripts/check_supabase_schema.mjs`, `scripts/fix_photo_paths.mjs` | Ferramentas operacionais com instanciação própria de cliente | Fase 2 — deixam de funcionar quando o backend mudar |
| `.env`, `.env.local` | Credenciais e endereço do backend | Fase 2 |
| `package.json` | A dependência `@supabase/supabase-js` | Só pode sair quando o último consumidor migrar |
| `supabase/migrations/` (117 arquivos) | O schema em si | Fases posteriores — migração de dados |
| `supabase/functions/` (9 funções) | Processamento assíncrono no backend | Fase posterior — substituído por Celery |

### Verificado e limpo

Para registro, itens que a varredura descartou como acoplamento:

- **`vite.config.js`** — menciona Supabase apenas em comentário. O service worker faz
  precache de estáticos e `navigateFallback`, sem `runtimeCaching` apontando para o backend.
- **Nenhum uso de tempo real** (`channel`, `postgres_changes`, `removeChannel`): zero
  ocorrências.
- **Nenhuma manipulação direta de chave de sessão** no armazenamento local do navegador.
- **Uma única instanciação de cliente** no código da aplicação (`src/lib/supabase.js`).

### Limites deste levantamento (na época — ver atualização abaixo)

Honestidade sobre o método: esta seção descreve a varredura textual inicial, por padrão em
todo o repositório. Ela encontrava acoplamento **nomeado**, mas não o **semântico** — código
que depende de um comportamento particular do backend sem citá-lo.

Essa limitação foi parcialmente resolvida depois: uma leitura integral, arquivo por arquivo,
dos 49 pontos de acoplamento (não mais busca por padrão) revelou semântica real que nenhuma
busca textual capturaria — ver **Leitura completa** abaixo. O que ainda não é capturável por
leitura de código é o comportamento que só a execução revela (ordenação implícita de fato,
timing exato de visibilidade de escrita); esse tipo continua exigindo a suíte de
caracterização como referência, construída **antes** da refatoração.

### Leitura completa (49 arquivos, ~27.600 linhas) — atualização de 2026-09-18

A varredura textual acima foi seguida por uma **leitura integral** de todo o código
acoplado, mais o SQL real das migrations do Supabase (funções RPC e triggers, que nenhuma
leitura de `src/` revelaria). Três documentos novos registram o resultado, e substituem os
números aproximados desta seção onde divergirem:

- **[inventario-acoplamento.md](./inventario-acoplamento.md)** — os 49 arquivos lidos por
  completo, achado por achado, com o resumo executivo dos 10 pontos que mudam o plano.
- **[rpcs-funcoes-e-triggers-postgres.md](./rpcs-funcoes-e-triggers-postgres.md)** — as 7
  funções RPC e os triggers do banco, lidos na fonte SQL real, com o que cada um exige da
  reimplementação em Django (fase 2). Não é trabalho desta fase, mas informa decisões que
  esta fase não pode tomar por ignorância — ver abaixo.
- **[debitos-tecnicos-e-inconsistencias.md](./debitos-tecnicos-e-inconsistencias.md)** — 23
  achados classificados por urgência de ação (correção candidata / decisão de fase 2 /
  limpeza adiável / só contexto).

**Os quatro achados que mais pesam sobre esta fase e a seguinte**:

1. **Existe uma trilha inteira de lógica invisível a qualquer leitura de `src/`**: triggers
   Postgres que disparam sozinhos. `propagate_modification_to_parent` é pré-requisito
   silencioso do `syncDown` incremental (lote 3a) — sem equivalente na fase 2, a
   sincronização para de detectar mudança em filhos, sem erro algum. `enforce_profile_security`
   é um controle de segurança contra auto-promoção a admin que **não é RLS** — precisa de
   caso de teste nomeado na suíte desta fase (FR-010), não só da fase 2.
2. **`gerar_ncs_unidade`** (a RPC que gera não conformidade/determinação/recomendação a
   partir do checklist) tem uma **segunda implementação, em TypeScript, no caminho offline**
   (`syncDeterminacoesFromChecklist` em `repository.ts`) — as duas precisam concordar hoje
   só por disciplina humana, sem teste de paridade. É o maior risco técnico de toda a
   migração, não apenas desta fase.
3. **A numeração de TN, AM e auto de infração não é atômica em nenhum dos três casos**,
   incluindo as que são RPC — todas fazem `SELECT COUNT(*) + 1` sem trava. É candidato real
   a correção (FR-022), não preservação automática — decisão do usuário, não desta fase por
   conta própria.
4. **`itens_checklist` é append-only por design** (update/delete inserem linha nova, nunca
   alteram em lugar) — para que uma vistoria antiga continue mostrando o texto vigente à
   época. Uma migração ingênua para "update in place" na fase 2 seria regressão silenciosa.

## Technical Context

**Language/Version**: JavaScript e TypeScript sobre Node.js, com React 18 e Vite 5

**Primary Dependencies**: `@supabase/supabase-js` ^2.97 (a ser isolado), `@tanstack/react-query`
^5.84 (cache de consultas), `dexie` ^4.3 (armazenamento local offline), `vite-plugin-pwa` ^1.2
(service worker)

**Storage**: PostgreSQL gerenciado pelo Supabase (remoto, inalterado nesta fase) e
IndexedDB via Dexie (local, preservado conforme constituição)

**Testing**: Nenhuma ferramenta hoje. Serão introduzidos **Playwright** (ponta a ponta,
incluindo simulação de offline, geolocalização e câmera) e **Vitest** (testes de unidade da
camada, aproveitando a configuração Vite já existente). Justificativa em [research.md](./research.md).

**Target Platform**: Navegador em desktop e dispositivo móvel, como aplicação web
progressiva com operação offline

**Project Type**: Aplicação web de página única (SPA). O backend Django é fase posterior e
repositório distinto.

**Performance Goals**: Paridade com o comportamento atual. A camada não deve introduzir
latência perceptível: nenhuma requisição adicional, nenhuma alteração na política de cache
do React Query.

**Constraints**: Operação offline integral é inegociável; a interface do usuário não muda;
a produção não é alterada; a suíte grava e apaga em base real e precisa de travas.

**Scale/Scope**: **49 arquivos acoplados** (número definitivo após leitura completa — ver
[inventario-acoplamento.md](./inventario-acoplamento.md); a varredura textual inicial havia
contado 47) — 222+ pontos de chamada via cliente mais o acoplamento por variável de
ambiente e URL literal; 43 páginas e 7 componentes de acoplamento direto relevante, das
quais só 18 páginas têm acoplamento direto real (as demais herdam a mudança por consumir
`Repository`/módulos já cobertos); 8 categorias de acesso; 4 perfis de usuário. Os dois
arquivos centrais do caminho offline somam 5342 linhas (`syncEngine.ts` com 2882 e
`repository.ts` com 2460) e concentram o maior risco da fase — confirmado pela leitura
integral, que encontrou ali o padrão de tolerância a desalinhamento de schema (parsing de
mensagem de erro do PostgREST) e a lógica de reconciliação de exclusão remota, o achado de
maior valor de negócio do núcleo offline.

## Constitution Check

*GATE: avaliado antes da Fase 0 e reavaliado após a Fase 1.*

| Princípio | Avaliação | Situação |
|---|---|---|
| I. Preservação Integral | A fase não migra dado nem altera schema. O risco é de regressão funcional, endereçado pela suíte de caracterização (FR-010) e pela regra de fidelidade (FR-021/022). | **Passa** |
| II. Operação Offline em Campo | Dexie e o outbox permanecem intactos; a camada encapsula apenas o transporte. A cobertura do ciclo offline completo é obrigatória, e FR-006 exige que filas criadas antes da mudança continuem processáveis. | **Passa** |
| III. Autorização Verificável | A suíte inclui cenários de permissão negada (US2, cenário 2), transformando isolamento entre câmaras técnicas em teste executável. Ganhou um caso concreto adicional após a leitura do SQL real: o trigger `enforce_profile_security` impede auto-promoção a admin no cadastro e **não é RLS** — precisa de teste nomeado próprio ("usuário não-admin não consegue se cadastrar como admin nem se autoativar"), não só o isolamento por câmara. É o primeiro passo concreto para cumprir este princípio, hoje sem qualquer base. | **Passa** |
| IV. Produção Intocada e Reversível | Trabalho na branch `migracao-sisreg`; a migração dos 49 arquivos acoplados ocorre módulo a módulo, cada um revertível isoladamente. As travas FR-018/019 protegem a base real. | **Passa** |
| V. Manutenibilidade Acima de Sofisticação | Playwright e Vitest são as escolhas de maior adoção no ecossistema. A camada é composta de módulos simples, sem metaprogramação. A abstração se justifica porque a repetição que ela elimina **já existe**: 222 pontos de chamada. | **Passa** |

**Resultado**: nenhum gate violado. Nenhuma entrada em *Complexity Tracking*.

Observação sobre o Princípio V: introduzir duas ferramentas de teste é custo real. Ele se
justifica porque FR-010 exige verificação automatizada e o projeto parte do zero — não há
alternativa mais simples que atenda ao requisito.

### Reavaliação após a Fase 1

Os cinco gates continuam passando com o desenho concluído. Uma ressalva surgiu e precisa
ficar registrada:

**Princípio IV — Produção Intocada**: a decisão D8 da pesquisa (restrição de permissão do
usuário de teste no banco) exige **uma alteração na base de produção**. Não é alteração de
schema — nenhuma tabela ou coluna muda — mas é uma política de acesso nova, aditiva e
restrita ao usuário de teste, sem efeito sobre qualquer outro usuário. Isso qualifica a
premissa da spec de que "nenhuma alteração é feita na produção nesta fase".

Não é violação de princípio, porque o Princípio IV trata de reversibilidade e de não
desestabilizar o sistema em uso, e uma política aditiva escopada a um usuário satisfaz os
dois critérios. Mas é mudança em base de produção e MUST ser tratada como tal: revisão antes
de aplicar, e reversão documentada.

**✅ Decisão do usuário (2026-09-18)**: aplicar a política aditiva de FR-019 na base de
produção. Confirmado — segue como pré-requisito de implementação, com revisão antes de
aplicar e reversão documentada.

**Segunda ressalva, após a leitura completa do SQL real**: a numeração sequencial de TN, AM
e auto de infração não é atômica em nenhum dos três casos hoje (`debitos-tecnicos-e-
inconsistencias.md`, item 1) — um defeito genuíno com efeito jurídico potencial (dois
documentos oficiais com o mesmo número), não apenas uma inconsistência de estilo.

**✅ Decisão do usuário (2026-09-18)**: **deferir para a fase Django.** Não corrigir agora.
A implementação desta fase MUST preservar o comportamento atual de `gerarNumeroAuto` e
`gerarNumeroAm` (categoria *Procedimentos remotos*) exatamente como está, incluindo a
fragilidade — nenhuma trava, retentativa ou mitigação client-side deve ser introduzida como
efeito colateral do encapsulamento. A correção real (sequência atômica ou `SELECT FOR
UPDATE`) fica registrada como item de entrada obrigatório para o `/speckit-plan` da fase de
reimplementação em Django, não para esta.

## Project Structure

### Documentation (this feature)

```text
specs/001-data-access-abstraction/
├── plan.md              # Este arquivo
├── research.md          # Fase 0: decisões técnicas e alternativas
├── data-model.md        # Fase 1: operações e formas de dado da camada
├── quickstart.md        # Fase 1: como executar e validar
├── contracts/           # Fase 1: contratos da camada
│   ├── README.md        # índice, a regra de fronteira e os princípios comuns
│   ├── provider.md      # as 8 categorias de comunicação com o backend
│   └── domains.md       # a superfície de negócio que as telas importam
├── inventario-acoplamento.md              # leitura completa dos 49 arquivos acoplados
├── rpcs-funcoes-e-triggers-postgres.md    # RPCs e triggers do banco, na fonte SQL real
├── debitos-tecnicos-e-inconsistencias.md  # 23 achados, classificados por urgência de ação
├── checklists/
│   └── requirements.md
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── data/                    # NOVO — a camada de abstração
│   │   ├── index.ts             # superfície pública: o app importa só daqui
│   │   ├── provider.ts          # contrato do provedor + seleção do ativo
│   │   ├── logging.ts           # registro de operações (FR-023/024)
│   │   ├── domains/             # módulos por domínio, não por tabela
│   │   │   ├── fiscalizacoes.ts
│   │   │   ├── autos.ts
│   │   │   ├── termos.ts
│   │   │   ├── prestadores.ts
│   │   │   ├── caters.ts
│   │   │   ├── catesa.ts
│   │   │   └── relatorios.ts
│   │   └── providers/
│   │       └── supabase/        # ÚNICO lugar que conhece o Supabase
│   │           ├── index.ts
│   │           ├── registros.ts
│   │           ├── arquivos.ts
│   │           ├── identidade.ts
│   │           └── procedimentos.ts
│   ├── supabase.js              # passa a ser importado só por providers/supabase
│   ├── edgeFunctions.js         # absorvido pelo provedor
│   ├── offline/                 # preservado; passa a falar com a camada
│   └── AuthContext.jsx          # passa a consumir a camada
├── pages/                       # 18 de 43 têm acoplamento direto real (ver inventario-acoplamento.md)
└── components/                  # 6 de 7 componentes de fiscalização têm acoplamento direto

tests/
├── e2e/                         # NOVO — Playwright
│   ├── offline/                 # ciclo de campo completo
│   ├── escrita/                 # todo fluxo que grava
│   ├── leitura/                 # um caminho por módulo
│   └── permissoes/              # isolamento entre câmaras
├── unit/                        # NOVO — Vitest, contratos da camada
└── support/
    ├── guard.ts                 # trava de execução (FR-018)
    └── cleanup.ts               # limpeza automática (FR-015/016/017)
```

**Structure Decision**: projeto único de frontend. A camada vive em `src/lib/data/`, com a
regra central de que **apenas `src/lib/data/providers/supabase/` importa `src/lib/supabase.js`**.
Essa regra é verificável automaticamente por lint (FR-007), o que a torna uma fronteira real
e não uma convenção que se erode com o tempo.

Os módulos de domínio agrupam operações por conceito de negócio (fiscalização, auto, termo),
não por tabela. Isso importa para a fase 2: o Django vai expor recursos por domínio, não
tabelas cruas, e uma camada organizada por tabela precisaria ser reorganizada justamente no
momento da troca.

## Complexity Tracking

Nenhuma violação de princípio constitucional a justificar. Tabela omitida.
