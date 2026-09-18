# Decision: Migração do fiscdsbagems para app Django do SISREG

- **Slug**: django-refactor
- **Decided**: 2026-09-18
- **Verdict**: **go** (condicionado — ver *Condições*)
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | **strong** | O requisito é externo e explícito: o SISREG exige Django/Python e banco compartilhado para admitir o fiscdsbagems como app. Não é preferência técnica nem melhoria opcional. |
| Evidence strength | **adequate** | Lado nosso: medido diretamente no repositório (117 migrations, 163 policies, 9 edge functions, UUID e Dexie confirmados). Lado SISREG: documentação real, porém **comprovadamente imprecisa** (declara SQLite3, é PostgreSQL 15) e incompleta (`AcaoFoto`, `AcaoDocumento`, `AcaoMarcador`, Indicadores e georreferências sem especificação). Suficiente para decidir a estrutura; insuficiente para o mapeamento fino. |
| Value vs. inaction | **strong** | A inação não degrada o produto — ela o elimina: sem a migração o sistema não é oficialmente implantado na AGEMS. Todo o investimento já feito se perde. |
| Feasibility / appetite | **adequate** | Existe opção concreta e escolhida (Opção C, apetite `large`, meses), aceita conscientemente pelo usuário. Não é `strong` porque premissas críticas de viabilidade seguem fora do nosso controle: aceitação do schema pela equipe do SISREG e possibilidade de fazer deploy dentro do projeto deles. |
| Strategic fit | **strong** | É condição de existência do produto, não iniciativa paralela. Ressalva: `.specify/memory/constitution.md` é um template não preenchido, então o alinhamento foi avaliado contra os objetivos declarados em `problem.md`, não contra princípios ratificados. |
| Risk posture | **adequate** | Os riscos maiores estão nomeados concretamente: divergência entre cópia e produção, dados presos no outbox dos dispositivos, volume/janela de migração de arquivos, cobertura das 117 migrations e testabilidade da tradução das RLS. Dois deles têm mitigação já desenhada (UUID preservado permite conferência registro a registro; camada de abstração validável contra o comportamento atual). O congelamento da produção e a drenagem dos dispositivos estão identificados, mas ainda **sem plano**. |

## Verdict & Rationale

**Go.** O critério de corte é atendido com folga onde mais importa: o problema é real e imposto de fora (`strong`), o custo da inação é a não existência do produto (`strong`), e há uma opção de solução escolhida e dimensionada. A evidência é `adequate` — não `weak` — porque o lado que controlamos foi medido diretamente no código, e o lado do SISREG, ainda que documentado de forma imperfeita, foi suficiente para fundamentar as dez decisões estruturais registradas em `problem.md`.

Houve um caso legítimo para `needs-clarification`, dado que faltam os `models.py` do SISREG, o conteúdo real das `Subunidade` e o aceite da equipe deles quanto às duas alterações de schema. O que desfaz esse caso é a estratégia escolhida: a Opção C constrói sobre uma **cópia**, com a produção intocada, e sua primeira etapa — desacoplar o app das chamadas ao Supabase atrás de uma camada de abstração — **não depende de nenhuma dessas informações**. É trabalho necessário sob qualquer desfecho das perguntas pendentes, inteiramente sob nosso controle, e validável contra o comportamento atual do sistema. Bloquear todo o projeto por dados que só condicionam uma fase posterior seria paralisar trabalho que já pode começar com segurança.

Portanto: `go` para especificar, com as pendências tratadas como **condições de fase**, não como bloqueios do projeto.

## Condições

O `go` vale integralmente para a fase de desacoplamento. As condições abaixo precisam ser satisfeitas antes das fases que dependem delas:

1. **Antes de modelar o app Django**: obter os `models.py` do SISREG (decisão 10). Sem isso, o mapeamento fino de dados é suposição — e é justamente a etapa mais cara de refazer.
2. **Antes de consolidar as decisões 4 e 5**: confirmar o conteúdo real das `Subunidade` em produção e obter o aceite da equipe do SISREG para a tabela de extensão 1:1 e a FK opcional para `Acao`. Até lá, essas duas decisões são **provisórias**.
3. **Antes de iniciar a construção longa**: definir a regra de congelamento da produção. A Opção C depende de o alvo parar de se mover; sem essa regra, a cópia envelhece e a migração de dados precisa ser refeita.
4. **Antes da virada**: existir plano verificável de drenagem dos dispositivos em campo. Sem ele, o requisito de migração integral é falso na prática — fiscalizações e fotos ainda no outbox local não estão na produção.

## Decisões Operacionais de Desenvolvimento

Registradas em 2026-09-18, após o veredito.

- **Isolamento por branch, não por cópia de pasta.** O trabalho de migração acontece numa branch do próprio repositório (`origin`: GitHub, hoje só `main`), mantendo a produção em `main`. Motivo: a branch torna a divergência entre cópia e produção visível e reconciliável via merge, enquanto uma pasta separada a tornaria invisível e manual. *A confirmar*: que a production branch da Vercel é `main`, para que nenhum push na branch de migração vire produção. Um projeto Vercel separado apontando para a branch é opção em aberto, útil se for preciso URL estável para testes compartilhados.
- **Sem instância separada do Supabase.** Não haverá alteração de schema na fase de desacoplamento — nenhuma migration nova, nenhum drift — e validar a camada de abstração contra os dados reais dá confiança que um banco vazio não daria. Decisão consciente do usuário.
- **Testes de escrita ocorrem no banco de produção**, com o lixo identificado e tratado posteriormente. Decisão consciente do usuário, ciente de que isso flexibiliza o princípio de "produção intocada" no que diz respeito a dados (não a schema nem a código).
- **Mitigação adotada**: os testes são feitos com um **usuário dedicado de teste**, de modo que a escrita fique rastreável por `created_by` — transformando a identificação do lixo em consulta, não em memória. Ressalvas conhecidas: `created_by` não está presente em todas as tabelas (encontrado em 9 arquivos de migration), e arquivos no Supabase Storage não carregam autoria consultável; para estes, recomenda-se usar prestador/município fictício, tornando os caminhos rastreáveis.
- **Consequência para a migração final**: antes da virada, os dados de teste precisam ser expurgados ou explicitamente classificados. Sem isso, a métrica de completude — conferência registro a registro, critério binário — fica ambígua, já que não haverá como distinguir fiscalização real de artefato de teste na contagem.

## If go — Handoff to `/speckit-specify`

- **Problem**: O fiscdsbagems roda sobre Supabase como sistema autônomo e precisa operar como app Django dentro do projeto do SISREG, no mesmo PostgreSQL self-hosted e compartilhando entidades, sob pena de não ser oficialmente implantado na AGEMS.

- **Chosen approach**: Opção C — reconstrução sobre **cópia** do código, com a produção intocada e virada única. "Passo a passo" refere-se à ordem das alterações no código: primeiro isolar e remover as chamadas ao Supabase atrás de uma camada de abstração de acesso a dados, depois construir o app Django e trocar a implementação por trás dessa camada. A ordem detalhada é trabalho do `specify`.

- **Decisões estruturais já fechadas** (não reabrir sem motivo novo): PKs híbridas (SISREG INTEGER, fiscalização UUID); DRF + SimpleJWT; Celery + Redis; `django-storages` sobre filesystem; SISREG como fonte única de `Entidade`/`Instrumento` com extensão 1:1 para campos exclusivos; câmara técnica = `Subunidade`; fiscalização como entidade própria com FK opcional para `Acao`; `Notificacao` e `TermoNotificacao` convivendo separadas por app.

- **In scope**: remoção total do Supabase (Auth, Postgres gerenciado, Storage, Edge Functions); app Django no projeto do SISREG; API DRF para o SPA; autorização Django equivalente às 163 policies RLS; filas assíncronas (IA e relatórios) e agendamento de prazos; **migração integral dos dados**, incluindo fotos, documentos e fiscalizações já executadas.

- **Out of scope**: reescrever o frontend ou adotar templates Django (o React/Vite segue SPA separado); substituir o Dexie.js; converter PKs de qualquer lado; alterar a produção durante a construção; funcionalidade nova na produção; melhorias de UX aproveitando a reconstrução; refatorar o modelo do SISREG além do mínimo necessário; otimização de performance além da paridade.

- **Success metrics**: zero dependência de Supabase (baseline: 7 arquivos com `supabase.auth.*`, 19+ com Storage, 9 Edge Functions, 117 migrations → alvo 0); banco único com entidades referenciadas nos dois sentidos; fluxo offline completo de campo seguido de sincronização bem-sucedida; paridade funcional; **migração integral verificável** por conferência de origem e destino, registro a registro por UUID e não apenas por contagem — critério binário, 99% não passa.

- **Carried-forward open questions**:
  - [AÇÃO PENDENTE: obter os `models.py` do SISREG] — condição 1.
  - [NEEDS CLARIFICATION: contato técnico do SISREG e processo para propor alteração no schema deles] — condição 2.
  - [NEEDS CLARIFICATION: o que está cadastrado como `Subunidade` no SISREG em produção] — condição 2.
  - [NEEDS CLARIFICATION: existe critério de aceite formal do SISREG para admitir o app?]
  - [NEEDS CLARIFICATION: a produção pode ser congelada para funcionalidades novas durante os meses de construção?] — condição 3.
  - [NEEDS CLARIFICATION: como drenar e verificar todos os dispositivos em campo antes da virada?] — condição 4.
  - [NEEDS CLARIFICATION: volume total de fotos e documentos nos buckets, para dimensionar a janela de virada — precisa ser medido.]
  - [NEEDS CLARIFICATION: inventário completo das tabelas com dado nas 117 migrations, para garantir que nenhuma fique sem correspondente no modelo novo.]
  - [NEEDS CLARIFICATION: como **testar** que nenhuma das 163 regras de autorização foi perdida na tradução para Django — reimplementar por leitura não é verificação.]
