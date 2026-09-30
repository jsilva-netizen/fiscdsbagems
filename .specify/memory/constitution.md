# Sistema de Fiscalização AGEMS (fiscdsbagems) Constitution

## Core Principles

### I. Preservação Integral (NÃO NEGOCIÁVEL)

Nenhuma funcionalidade e nenhum dado podem ser perdidos em qualquer migração,
refatoração ou reescrita. Especificamente:

- Toda capacidade existente MUST continuar disponível ao usuário final após a mudança.
- Todo dado em produção — registros, fotos, documentos e fiscalizações já executadas —
  MUST chegar ao destino. Completude é critério **binário**: 99% é falha.
- A conferência MUST ser feita registro a registro por identificador, não apenas por
  contagem agregada, e MUST partir do inventário do banco, não da lista de telas do app.

**Rationale**: o sistema registra atos de fiscalização regulatória — autos de infração,
termos de notificação, evidências fotográficas georreferenciadas — com efeito jurídico
sobre entidades reguladas. Dado perdido aqui não é bug de software, é prova perdida.

### II. Operação Offline em Campo

O funcionamento pleno sem conectividade é requisito central do produto, não recurso
acessório.

- Nenhuma alteração pode degradar a capacidade de registrar fiscalização, responder
  checklist ou capturar foto georreferenciada sem rede.
- Uma mudança que melhore qualquer outra dimensão às custas do offline MUST ser rejeitada.
- Dado que exista apenas no dispositivo (outbox local não sincronizado) MUST ser tratado
  como dado de produção para todo efeito, inclusive em migrações e cortes de sistema.

**Rationale**: os fiscais operam em áreas rurais e instalações industriais sem sinal
celular. Um sistema que exige conectividade não é uma versão pior deste produto — é um
produto que não serve ao seu caso de uso principal.

### III. Autorização Verificável

Regras de controle de acesso MUST ser demonstráveis por verificação automatizada, não
por leitura de código.

- Reimplementar uma regra lendo a anterior e reescrevendo-a NÃO constitui verificação.
- Toda tradução ou refatoração de autorização MUST ser acompanhada de teste que falhe
  quando a regra for violada.
- O isolamento entre câmaras técnicas MUST ser tratado como fronteira de segurança, não
  como filtro de conveniência de interface.

**Rationale**: o banco de produção concentra o controle de acesso em 173 políticas de Row
Level Security, apoiadas em funções auxiliares como `is_staff`, `current_role`,
`can_access_fiscalizacao` e `can_access_unidade`, além de controles fora da RLS
(inventário de produção, 2026-09-28). No sistema novo essas regras viram permissões do
Django. A perda silenciosa de uma única regra na tradução não gera erro — gera vazamento
entre áreas, e só é descoberta quando já aconteceu.

### IV. Produção Intocada e Mudança Reversível

O sistema em uso MUST permanecer estável e disponível até a virada para o sistema novo, e a
virada MUST ser um passo único, preparado e verificado.

- O sistema novo MUST ser construído em paralelo, sem nenhuma dependência de escrita no
  banco ou no armazenamento de produção do sistema atual.
- Enquanto o sistema novo não substituir o atual, a produção atual (Supabase, branch
  `main`) recebe apenas correção crítica; funcionalidade nova entra no sistema novo.
- Toda correção feita na produção atual durante o levantamento MUST ser refletida nas specs
  do sistema novo, para que a descrição não fique desatualizada.
- Todo passo MUST ser reversível até a virada. A virada e a migração de dados são
  irreversíveis e exigem os portões desta constituição satisfeitos e documentados.

**Rationale**: não existe janela de manutenção confortável para um sistema que a agência
usa em campo. A alternativa a "reversível" não é "rápido", é "indisponível por tempo
indeterminado". Construir o novo em paralelo mantém o atual funcionando até o último dia.

### V. Manutenibilidade Acima de Sofisticação

Entre duas soluções que resolvem o problema, MUST prevalecer a que qualquer desenvolvedor
do ecossistema consiga manter, e não a mais elegante, moderna ou concisa.

- Tecnologia de nicho MUST ser justificada por ganho que a alternativa mainstream não
  entregue — preferência pessoal não é justificativa.
- Abstração só se paga quando já existe a repetição que ela elimina.
- Código temporário (ponte, adaptador, scaffolding) MUST ter destino definido no momento
  em que é criado, ou não deve ser criado.

**Rationale**: este é um sistema de agência pública, com equipe pequena e rotatividade
real. Um sistema que só o seu autor sabe manter é um passivo, por melhor que seja.

## Arquitetura do Sistema Novo e Restrições Tecnológicas

A AGEMS descartou o SISREG por inteiro e constrói um sistema próprio, que substitui o
fiscdsbagems atual, reaproveitando a lógica de funcionamento dele (decisão registrada em
`.specify/assessments/novo-sistema-django-apps/`, que substitui a de
`.specify/assessments/django-refactor/`). Alterar as restrições abaixo exige emenda a esta
constituição.

**Stack obrigatória**

- Backend: Django + Django REST Framework, autenticação por JWT (SimpleJWT).
- Banco: PostgreSQL self-hosted, próprio do sistema. Sem Backend-as-a-Service.
- Assíncrono: Celery + Redis, para as tarefas de fundo, incluindo o agendamento de rotinas de
  prazo e a geração de relatórios.
- Arquivos: `django-storages` com backend abstraído; nunca caminho de filesystem direto
  no código de aplicação.
- Frontend: SPA React/Vite nova e separada, consumindo a API, no mesmo modelo offline do
  sistema atual: armazenamento local em Dexie/IndexedDB e sincronização com fila local.

**Organização em apps**

O sistema é modularizado ao máximo, em apps Django:

- **core**: autenticação, perfis, entidades reguladas, instrumentos, diretorias e câmaras
  técnicas.
- **fiscalização**: a fiscalização de campo comum às câmaras — fiscalizações, unidades
  fiscalizadas, respostas de checklist, não conformidades, constatações, determinações,
  recomendações e evidências fotográficas —, incluindo a operação offline.
- **checklists**: o motor de checklists, comum a todas as câmaras.
- **um app por diretoria/câmara técnica**: as especificidades de cada uma (ex.: DTR com mapa e
  KML) e o layout próprio de relatórios.
- **processo sancionador**: autos de infração, termos de notificação, análise da manifestação
  e pareceres técnicos.
- **portal do prestador**.
- **tramitação de documentos e dados**.

O que é comum a mais de uma câmara MUST viver em `core`, `fiscalização` ou `checklists`. O que é específico
de uma câmara MUST NOT vazar para os apps comuns.

**Inteligência artificial**: a análise por IA do sistema atual (filas de IA do CATERS e da
CATESA) não é migrada nem refeita no sistema novo (decisão do responsável em 2026-09-30,
achado A-039 da spec 003). Funcionalidade de IA só entra no sistema novo por nova decisão,
tomada pelo fluxo de assessment e registrada em emenda a esta constituição.

**Fronteiras de domínio**

- O `core` é a fonte única de entidades reguladas e instrumentos; nenhum outro app mantém
  cadastro próprio deles.
- Toda câmara técnica pertence a uma diretoria.
- Fiscalização é entidade própria; planejamento e execução de campo são conceitos distintos
  e MUST permanecer distintos.
- Chaves primárias em UUID, com geração de identificador no cliente preservada: o modelo
  offline depende dela.

## Fluxo de Desenvolvimento e Portões de Qualidade

**Pipeline**: ideias estruturais passam pelo fluxo de assessment
(`intake → research → define → shape → decide`) antes de chegar a `/speckit-specify`.
Matar uma ideia no assessment é resultado válido e desejável.

**Levantamento em specs**: antes de construir, todo o sistema atual MUST ser descrito em
specs neste repositório (a partir de `specs/003`), nesta ordem:

1. Inventário do banco de produção, que é a fonte da verdade do banco. As migrations do
   repositório não servem para isso: produção não tem registro de migrations aplicadas e
   diverge delas (inventário de 2026-09-28).
2. Mapa de rastreabilidade: cada objeto do banco aponta para a spec de módulo que o
   descreve. Objeto sem módulo é lacuna.
3. Specs de módulo, uma de cada vez, em ordem de dependência.
4. Jornadas de validação por perfil de usuário: cada passo de uma jornada MUST apontar para a
   regra de uma spec de módulo. Passo sem regra é lacuna; regra que contradiz a jornada é erro.

Cada spec descreve o comportamento **desejado** no sistema novo: todas as funcionalidades
preservadas (Princípio I), defeitos corrigidos. Quando o desejado diferir do atual, a spec
MUST registrar o comportamento atual e o motivo da mudança; diferença não registrada é perda.

**Isolamento**: `main` reflete a produção atual; o trabalho de levantamento ocorre em branch
dedicada. Deploys automáticos MUST estar configurados de modo que nenhum push em branch de
trabalho alcance produção.

**Dados de teste**: quando o desenvolvimento escrever no banco de produção, a escrita MUST
ser rastreável — por usuário dedicado de teste e por entidades fictícias identificáveis.
Dado de teste MUST ser expurgado ou explicitamente classificado antes de qualquer migração,
sob pena de invalidar o critério binário do Princípio I.

**Portões antes da virada para o sistema novo**

Antes da virada e da migração de dados, MUST estar satisfeito:

1. Inventário completo do banco de produção conferido contra o modelo do sistema novo. O
   inventário estrutural existe desde 2026-09-28; a conferência contra o modelo novo, não.
2. Nenhum dispositivo com fila local não sincronizada no momento da virada, comprovado por
   procedimento verificável dispositivo a dispositivo, e não por suposição.
3. Volume de arquivos medido e janela de indisponibilidade dimensionada. Em 2026-09-28 eram
   8 buckets, 1.554 arquivos e cerca de 1 GB.
4. Verificação de autorização executada e aprovada (Princípio III).
5. Dados de teste expurgados ou classificados.
6. Migração de dados conferida registro a registro por identificador (Princípio I).

**Premissas externas**: decisões que dependem de interlocutores externos ao time — por
exemplo, os requisitos das câmaras técnicas que ainda não têm funcionalidade — MUST ser
marcadas como provisórias até confirmação, e MUST NOT ser tratadas como fechadas no
planejamento.

## Governance

Esta constituição prevalece sobre qualquer outra prática, convenção ou preferência adotada
no projeto. Em conflito entre um princípio daqui e uma decisão de implementação, o princípio
vence — ou a constituição é emendada explicitamente, com registro do motivo.

**Emendas**: qualquer alteração exige (a) registro do que muda e por quê, (b) avaliação do
impacto sobre trabalho em andamento, (c) incremento de versão conforme a política abaixo, e
(d) aprovação do responsável pelo projeto.

**Versionamento**: MAJOR para remoção ou redefinição incompatível de princípio; MINOR para
princípio ou seção nova, ou expansão material de orientação; PATCH para esclarecimento,
redação e correção sem mudança de significado.

**Conformidade**: especificações, planos e revisões MUST verificar aderência a esta
constituição. Complexidade que viole o Princípio V MUST ser justificada por escrito ou
removida. Violação de princípio marcado NÃO NEGOCIÁVEL bloqueia a entrega, sem exceção
por prazo.

**Version**: 2.2.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-30
