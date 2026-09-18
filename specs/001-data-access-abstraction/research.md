# Phase 0 — Pesquisa e Decisões Técnicas

**Feature**: Camada de Abstração de Acesso a Dados
**Date**: 2026-09-18

Todas as questões marcadas como abertas no contexto técnico foram resolvidas. Nenhuma
pendência bloqueia a Fase 1.

**Atualização de 2026-09-18**: as decisões D1-D10 abaixo foram tomadas antes da leitura
integral do código acoplado e do SQL real das migrations. Duas decisões novas (D11, D12)
foram acrescentadas depois dessa leitura; nenhuma das dez originais precisou mudar. Os
achados completos estão em [inventario-acoplamento.md](./inventario-acoplamento.md),
[rpcs-funcoes-e-triggers-postgres.md](./rpcs-funcoes-e-triggers-postgres.md) e
[debitos-tecnicos-e-inconsistencias.md](./debitos-tecnicos-e-inconsistencias.md).

---

## D1 — Ferramenta de teste ponta a ponta

**Decision**: Playwright.

**Rationale**: a exigência decisiva é o ciclo offline (FR-005, FR-006, história P1), e o
Playwright é o único candidato com controle de conectividade de primeira classe no nível do
contexto do navegador. Ele também cobre, nativamente, os três recursos que esta suíte
precisa simular:

- desligar e religar a rede para exercitar o outbox do Dexie;
- definir coordenadas de geolocalização e conceder a permissão, atendendo FR-020;
- injetar arquivo em campo de captura, simulando a câmera sem hardware real.

Soma-se o suporte a *service worker*, relevante porque o projeto é uma aplicação web
progressiva (`vite-plugin-pwa`) e um worker desatualizado pode mascarar ou forjar
regressões.

**Alternatives considered**:

- **Cypress** — ergonomia de escrita superior, mas o suporte a offline é indireto e
  historicamente frágil, e o controle de *service worker* é limitado. Como o offline é
  justamente o ponto onde uma regressão destrói dado em silêncio, testá-lo por caminho
  indireto contraria o motivo de a suíte existir.
- **WebdriverIO** — capaz, porém com mais configuração e menor base de uso em projetos
  React, o que atrita com o Princípio V da constituição.
- **Testing Library isolada** — cobre componente, não jornada. Não exercita o ciclo
  offline completo, que é atravessado por várias telas.

---

## D2 — Executor de testes de unidade

**Decision**: Vitest.

**Rationale**: reaproveita a configuração Vite que o projeto já tem, sem duplicar
transformações nem aliases. Serve para verificar os contratos da camada isoladamente —
por exemplo, que um módulo de domínio traduz corretamente filtros e erros — sem o custo de
subir o navegador.

**Alternatives considered**:

- **Jest** — exigiria pipeline de transformação próprio e configuração paralela à do Vite,
  com risco de divergência entre o que o teste executa e o que a aplicação executa.
- **Somente Playwright** — cobriria jornadas, mas verificar tradução de filtro ou
  mapeamento de erro por ponta a ponta é lento e instável.

---

## D3 — Formato da camada

**Decision**: contrato de provedor único, com módulos organizados **por domínio** e uma
implementação Supabase isolada em `src/lib/data/providers/supabase/`.

**Rationale**: o app importa apenas de `src/lib/data`. Por trás, cada domínio
(fiscalizações, autos, termos, prestadores, CATERS, CATESA, relatórios) expõe operações de
negócio, e o provedor as traduz para o backend concreto. Agrupar por domínio, e não por
tabela, é deliberado: na fase 2 o Django exporá recursos por domínio, e uma camada
organizada por tabela precisaria ser reorganizada exatamente no momento da troca — que é o
pior momento possível.

**Alternatives considered**:

- **Repositório por tabela** — mapeia um-para-um com o estado atual e seria mais rápido de
  escrever, mas transfere para a fase 2 o trabalho de reagrupar, além de vazar o modelo de
  dados atual para dentro do contrato.
- **Invólucro fino sobre o cliente** (mesma API, outro nome) — trocaria o acoplamento de
  lugar sem removê-lo: o formato de consulta do Supabase continuaria espalhado pelo app,
  e a fase 2 teria de reimplementá-lo sobre o Django.
- **Camada gerada automaticamente a partir do schema** — reduziria digitação, mas
  acopla a camada ao schema atual e adiciona geração de código ao projeto, contrariando o
  Princípio V.

---

## D4 — Posição da camada em relação ao cache de consultas

**Decision**: a camada fica **abaixo** do React Query. Os hooks continuam sendo os mesmos e
passam a chamar funções da camada como *query function*.

**Rationale**: FR-004 exige comportamento idêntico, e um dos casos de borda registrados na
spec é justamente o cache: se a camada assumisse o cache, mudaria quando o dado é
revalidado e, por consequência, o que o usuário vê — sem que nenhuma consulta tivesse
mudado. Mantendo o React Query por cima, chaves de cache, tempos de invalidação e
revalidação permanecem exatamente como hoje.

**Alternatives considered**:

- **Camada acima do cache** — daria controle total, mas obrigaria a reimplementar a
  política de cache e violaria a paridade de comportamento.
- **Camada substituindo o React Query** — mudança grande, fora do escopo, e sem relação com
  o objetivo da fase.

---

## D5 — Como impedir o retorno do acoplamento (FR-007)

**Decision**: detecção em **três frentes**, porque o acoplamento existe em três formas
distintas e nenhuma regra isolada cobre as outras duas.

| Forma de acoplamento | Detecção |
|---|---|
| Importar o cliente (`src/lib/supabase`) | Regra de lint `no-restricted-imports`, com exceção para `src/lib/data/providers/supabase/**` |
| Ler `import.meta.env.VITE_SUPABASE_*` | Regra de lint sobre identificador restrito, mesma exceção |
| Escrever caminho literal do Supabase (`/storage/v1/`, `/functions/v1/`, `/rest/v1/`, `/auth/v1/`) | Regra de lint sobre literal de texto, mesma exceção |

**Rationale**: o levantamento mostrou que **a maior parte do acoplamento perigoso não
importa o cliente**. A detecção de conectividade, as chamadas de função e as URLs públicas
de arquivo usam a variável de ambiente ou o caminho literal diretamente. Uma regra que
olhasse apenas importações declararia a fronteira limpa com o acoplamento intacto — e
justamente nos pontos que quebram de forma silenciosa na fase 2.

O projeto já usa ESLint (`eslint.config.js`), então o custo é de configuração, não de
ferramenta nova. As três regras rodam a cada alteração e falham o build.

**Alternatives considered**:

- **Apenas a regra de importação** — era a decisão original desta pesquisa, e estava
  **errada**. Deixaria passar os três pontos de Classe B identificados no levantamento.
- **Busca por texto na integração contínua** — cobriria as três formas, mas sem retorno ao
  desenvolvedor no momento da escrita.
- **`dependency-cruiser`** — forte para dependência entre módulos, mas não detecta literal
  de texto nem leitura de variável de ambiente, que são dois terços do problema aqui.

---

## D6 — Limpeza automática dos dados de teste (FR-015 a FR-017)

**Decision**: duas rotinas complementares — **limpeza ao final** de cada execução e
**varredura no início** de cada execução.

**Rationale**: a limpeza ao final cobre o caminho normal. A varredura inicial existe porque
FR-016 exige que a limpeza funcione mesmo quando a execução é interrompida — e execução
interrompida, por definição, não chega ao final. Varrer no início, removendo resíduo
anterior do usuário de teste, é o que torna o requisito cumprível.

O escopo da remoção é delimitado por dois critérios combinados: autoria do usuário dedicado
de teste (`created_by`, presente nas tabelas principais) e um marcador da execução aplicado
em campos de texto já existentes, sem alteração de schema. Onde `created_by` não existir, o
marcador textual é o único critério, e a tabela precisa ser mapeada explicitamente durante a
implementação.

**Alternatives considered**:

- **Transação revertida ao final** — elegante, mas inaplicável: as escritas acontecem por
  requisição HTTP, fora do controle transacional do teste, e envolvem arquivos.
- **Apenas limpeza ao final** — falha exatamente no cenário que FR-016 descreve.
- **Ambiente isolado em vez de limpeza** — já avaliado e recusado na fase de especificação.

---

## D7 — Trava de execução (FR-018)

**Decision**: a suíte exige uma variável de ambiente cujo valor deve corresponder ao
identificador da base alvo. Sem correspondência exata, a execução aborta antes de qualquer
requisição.

**Rationale**: o modo de falha real é alguém clonar o repositório e rodar os testes supondo
ambiente de sandbox. Exigir que a pessoa declare explicitamente qual base está sendo usada
torna o acidente impossível por omissão — o padrão passa a ser não executar.

**Alternatives considered**:

- **Bloquear por nome de ambiente** (recusar se for "produção") — depende de nomenclatura
  correta e falha em silêncio quando a configuração muda.
- **Confirmação interativa** — inviável em execução automatizada.

---

## D8 — Restrição de permissão do usuário de teste (FR-019)

**Decision**: política de acesso aditiva no banco, restrita ao usuário de teste, limitando
alteração e remoção aos registros de sua própria autoria.

**Rationale**: é a garantia que não depende da correção do código de teste. Um defeito na
rotina de limpeza passa a ser incapaz de alcançar dado legítimo, porque o banco recusa.

**⚠️ Ponto de atenção — qualifica uma premissa da spec**: a spec assume que "nenhuma
alteração de schema é feita nesta fase". Esta decisão exige **uma alteração no banco** —
não em tabelas ou colunas, mas uma política de acesso nova. Ela é **aditiva e escopada ao
usuário de teste**: não altera nenhuma política existente e não tem efeito sobre nenhum
outro usuário do sistema. Ainda assim, é uma mudança na base de produção e precisa ser
tratada como tal, com revisão e reversibilidade. Não há como satisfazer FR-019 sem ela.

**Alternatives considered**:

- **Confiar apenas em FR-017** (escopo no código) — foi explicitamente recusado na
  clarificação, que escolheu duas camadas de proteção.
- **Usuário com credencial de menor privilégio sem política nova** — o modelo atual concede
  acesso por perfil, e o perfil necessário para exercitar os fluxos já carrega permissão
  ampla de escrita. Não há combinação existente que produza a restrição desejada.

---

## D9 — Registro de operações (FR-023, FR-024)

**Decision**: função de registro interna à camada, desligada por padrão e ativável por
configuração em tempo de execução, emitindo tipo de operação, domínio, alvo, duração e
resultado — nunca os valores trafegados.

**Rationale**: por estar no ponto único de passagem, o custo de embutir agora é baixo e o de
adicionar depois é mexer na camada de novo. Desligado por padrão, não impõe custo à operação
normal. A exclusão dos valores atende FR-024 e evita criar um problema de dado pessoal ao
resolver um de diagnóstico.

**Alternatives considered**:

- **Registro sempre ativo** — cria ruído e risco de vazamento em ambiente do usuário.
- **Somente falhas** — insuficiente para o caso que motivou o requisito: na fase 2, a
  pergunta é qual chamada divergiu, e divergência frequentemente ocorre sem erro.

---

## D10 — Ordem de migração dos 44 arquivos

**Decision**: caracterizar primeiro, depois migrar em quatro ondas — módulos simples de
leitura, depois o caminho offline, depois os demais domínios de escrita, e por fim ligar a
regra de lint.

**Rationale**: a suíte precisa existir **antes** da primeira refatoração, porque ela é a
referência do comportamento atual; caracterizar depois de mexer registra o comportamento já
alterado. Começar pelos módulos simples valida o formato da camada em superfície barata —
se o contrato estiver errado, o erro aparece com dois arquivos migrados, não com trinta. O
caminho offline vem logo em seguida, e não por último, porque é o de maior risco e o que
pode forçar mudança no contrato; descobrir isso tarde seria caro. A regra de lint só é
ligada quando o último consumidor migrar, senão o build quebra durante toda a transição.

**Alternatives considered**:

- **Offline primeiro** — enfrenta o caso mais difícil com o contrato ainda não validado.
- **Offline por último** — deixa o maior risco para o fim, quando o custo de mudar o
  contrato é máximo.
- **Migrar tudo de uma vez** — contraria o Princípio IV: sem passos revertíveis
  isoladamente.

---

## D11 — O que a categoria "Procedimentos remotos" cobre de fato

**Decision**: a categoria envolve as **8 funções RPC reais** identificadas por leitura direta
do SQL das migrations (não por inferência do uso no cliente), cada uma com nome lógico
próprio no contrato, mapeando 1:1 para a função atual nesta fase:

| Nome lógico no contrato | Função Supabase hoje |
|---|---|
| `finalizarFiscalizacao` | `finalizar_fiscalizacao` |
| `reabrirFiscalizacao` | `reabrir_fiscalizacao` |
| `gerarNumeroAuto` | `gerar_numero_auto` |
| `gerarNumeroAm` | `gerar_numero_am` |
| `excluirUsuarioAdmin` | `admin_delete_user` / `admin_delete_user_by_email` |
| `obterResumoIndicadores` | `obter_resumo_indicadores` |
| `importarDoCaters` | `caters_import_from_fiscalizacao` |

**Rationale**: nomear logicamente agora, mesmo sem trocar de backend, é o que permite à fase
2 substituir a implementação sem tocar nas telas — exatamente o objetivo da fase. A leitura
do SQL real (ver [rpcs-funcoes-e-triggers-postgres.md](./rpcs-funcoes-e-triggers-postgres.md))
revelou que duas dessas funções (`gerar_numero_auto`, `gerar_numero_am`) têm uma falha de
atomicidade real (`SELECT COUNT(*) + 1` sem trava) — **esta fase não corrige o defeito**,
apenas o transporta fielmente por trás do nome lógico; corrigir é decisão pendente do
usuário, registrada em `debitos-tecnicos-e-inconsistencias.md` item 1, e escapa do escopo de
um encapsulamento de frontend.

**Alternatives considered**:

- **Nome igual ao da função Postgres** — mais rápido de escrever agora, mas vaza
  implementação para dentro do contrato, exatamente o que a Regra 1 de `contracts/README.md`
  proíbe.
- **Agrupar as 8 funções numa única operação genérica "executar procedimento"** — já era o
  desenho original (`provider.md`, categoria 4, antes desta decisão); mantido como
  **mecanismo**, mas com os 8 nomes lógicos documentados explicitamente aqui em vez de
  ficarem implícitos, porque "documentado com a intenção de negócio que atende" (regra já
  existente) exige que a lista seja concreta, não uma promessa vaga.

---

## D12 — Fronteira explícita entre esta fase e os triggers do banco

**Decision**: **esta fase não reimplementa, não altera e não tenta reproduzir nenhum
trigger Postgres.** A camada de abstração encapsula *chamadas* ao backend atual; os
triggers continuam disparando exatamente como hoje, porque o Supabase não é desligado nesta
fase. Nenhuma linha de `propagate_modification_to_parent`, `set_fiscalizacao_cache_fields`
ou `enforce_profile_security` precisa de equivalente em JavaScript agora.

**Rationale**: a leitura das migrations (ver
[rpcs-funcoes-e-triggers-postgres.md §8](./rpcs-funcoes-e-triggers-postgres.md)) revelou uma
camada inteira de lógica que só existe no banco — invisível a qualquer leitura de `src/` — e
seria fácil, sob a pressão de "cobrir tudo", tentar replicá-la client-side "por segurança".
Isso seria trabalho desperdiçado (o trigger já roda) e risco novo (duas implementações
divergindo, o mesmo problema já diagnosticado para `gerar_ncs_unidade`). A única exceção
consciente: o comportamento de `enforce_profile_security` **precisa** aparecer como caso de
teste na suíte de caracterização (FR-010) — não porque a camada o reimplementa, mas porque a
suíte caracteriza o comportamento observável do sistema como um todo, e esse trigger produz
comportamento observável (cadastro de admin é silenciosamente rebaixado a fiscal) que passa
pela camada nova a caminho do backend.

**Alternatives considered**:

- **Replicar os triggers client-side "para garantir"** — rejeitado: duplica lógica sem
  necessidade nesta fase (o backend não muda), e cria uma terceira fonte de verdade além do
  trigger e de qualquer futura implementação Django.
- **Ignorar os triggers completamente, inclusive na suíte** — rejeitado para
  `enforce_profile_security` especificamente: é comportamento de segurança observável, e
  FR-010 exige cobertura de todo fluxo de escrita, sem exceção para escrita que passa por
  trigger.
