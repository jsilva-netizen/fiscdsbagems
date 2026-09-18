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

**Rationale**: o sistema hoje concentra o controle de acesso em 163 policies de Row Level
Security que determinam quem enxerga processos, autos e pareceres de cada câmara técnica.
A perda silenciosa de uma única regra não gera erro — gera vazamento entre áreas, e só é
descoberta quando já aconteceu.

### IV. Produção Intocada e Mudança Reversível

O sistema em uso MUST permanecer estável e disponível durante qualquer trabalho estrutural.

- Reescritas e migrações MUST ocorrer sobre cópia isolada (branch), nunca sobre a produção.
- A produção recebe apenas correção crítica enquanto houver trabalho estrutural em curso;
  funcionalidade nova entra na cópia.
- Todo passo MUST ser reversível, e mudanças irreversíveis (virada, expurgo, migração de
  dados) exigem verificação prévia documentada.

**Rationale**: não existe janela de manutenção confortável para um sistema que a agência
usa em campo. A alternativa a "reversível" não é "rápido", é "indisponível por tempo
indeterminado".

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

## Restrições Tecnológicas e de Integração

O fiscdsbagems opera como app Django dentro do SISREG, o sistema guarda-chuva de regulação
da AGEMS. As restrições abaixo derivam dessa integração e do assessment registrado em
`.specify/assessments/django-refactor/`. Alterá-las exige emenda a esta constituição, e
aquelas que tocam o schema do SISREG exigem também acordo com a equipe responsável por ele.

**Stack obrigatória**

- Backend: Django + Django REST Framework, autenticação por JWT (SimpleJWT).
- Banco: PostgreSQL self-hosted, compartilhado com o SISREG. Sem Backend-as-a-Service.
- Assíncrono: Celery + Redis, incluindo o agendamento de rotinas de prazo.
- Arquivos: `django-storages` com backend abstraído; nunca caminho de filesystem direto
  no código de aplicação.
- Frontend: SPA React/Vite separada, consumindo a API. Armazenamento local offline em
  Dexie/IndexedDB.

**Fronteiras de domínio**

- O SISREG é fonte única de `Entidade` e `Instrumento`; campos exclusivos da fiscalização
  vivem em tabela de extensão 1:1, nunca poluindo o cadastro compartilhado.
- Câmara técnica corresponde à `Subunidade` do SISREG.
- Fiscalização é entidade própria, com referência opcional à `Acao` do SISREG — planejamento
  e execução de campo são conceitos distintos e MUST permanecer distintos.
- Chaves primárias: cada app mantém sua convenção (SISREG em INTEGER, fiscalização em UUID).
  A geração de identificador no cliente MUST ser preservada, pois o modelo offline depende dela.

## Fluxo de Desenvolvimento e Portões de Qualidade

**Pipeline**: ideias estruturais passam pelo fluxo de assessment
(`intake → research → define → shape → decide`) antes de chegar a `/speckit-specify`.
Matar uma ideia no assessment é resultado válido e desejável.

**Isolamento**: trabalho estrutural ocorre em branch dedicada; `main` reflete a produção.
Deploys automáticos MUST estar configurados de modo que nenhum push em branch de trabalho
alcance produção.

**Dados de teste**: quando o desenvolvimento escrever no banco de produção, a escrita MUST
ser rastreável — por usuário dedicado de teste e por entidades fictícias identificáveis.
Dado de teste MUST ser expurgado ou explicitamente classificado antes de qualquer migração,
sob pena de invalidar o critério binário do Princípio I.

**Portões antes de mudança irreversível**

Antes de qualquer virada de sistema ou migração de dados, MUST estar satisfeito:

1. Inventário completo das tabelas com dado, conferido contra o modelo de destino.
2. Plano verificável de drenagem dos dispositivos em campo, para que nenhum outbox local
   se perca.
3. Volume de arquivos medido e janela de indisponibilidade dimensionada.
4. Verificação de autorização executada e aprovada (Princípio III).
5. Dados de teste expurgados ou classificados.

**Premissas externas**: decisões que dependem do SISREG (schema, subunidades, aceite da
equipe) MUST ser marcadas como provisórias até confirmação, e MUST NOT ser tratadas como
fechadas no planejamento.

## Governance

Esta constituição prevalece sobre qualquer outra prática, convenção ou preferência adotada
no projeto. Em conflito entre um princípio daqui e uma decisão de implementação, o princípio
vence — ou a constituição é emendada explicitamente, com registro do motivo.

**Emendas**: qualquer alteração exige (a) registro do que muda e por quê, (b) avaliação do
impacto sobre trabalho em andamento, e (c) incremento de versão conforme a política abaixo.
Emendas que afetem as Restrições Tecnológicas e de Integração e toquem o schema do SISREG
exigem adicionalmente acordo com a equipe responsável por ele.

**Versionamento**: MAJOR para remoção ou redefinição incompatível de princípio; MINOR para
princípio ou seção nova, ou expansão material de orientação; PATCH para esclarecimento,
redação e correção sem mudança de significado.

**Conformidade**: especificações, planos e revisões MUST verificar aderência a esta
constituição. Complexidade que viole o Princípio V MUST ser justificada por escrito ou
removida. Violação de princípio marcado NÃO NEGOCIÁVEL bloqueia a entrega, sem exceção
por prazo.

**Version**: 1.0.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-18
