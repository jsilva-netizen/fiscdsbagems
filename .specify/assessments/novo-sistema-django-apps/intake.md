# Idea Intake: Sistema novo e próprio em Django, organizado em apps, sem o SISREG

- **Slug**: novo-sistema-django-apps
- **Created**: 2026-09-25
- **Source**: pasted text (usuário, na sessão de trabalho da `migracao-sisreg`)
- **Type**: other — mudança de direção arquitetural que substitui a decisão da avaliação `django-refactor`

## Idea (as captured)

> precisamos alinhar uma coisa: ficou definido que o sisreg será jogado fora, e utilizaremos a
> lógica de funcionamento do fiscdsb agems, mas faremos um novo sistema. Em django, baseado em
> apps: ex: o core, um app de fiscalização, um app de checklists, um app para cada camara
> tecnica com suas especificidades , compartilhando o que for comum e etc.. consegui falar pra
> mantera a ideia do front em react para o funcionamento offline e sync como é feito hj, via
> indexed db e etc

## Restated

O SISREG deixa de ser o destino: em vez de o fiscdsbagems virar um app dentro dele, será
construído um sistema novo em Django, organizado em apps (um núcleo comum, fiscalização,
checklists e um app por câmara técnica com suas especificidades), reaproveitando a lógica de
funcionamento do fiscdsbagems. O frontend continua em React, com o funcionamento offline e a
sincronização como são hoje (IndexedDB).

## Origin & Context

- **Raised by**: o usuário (jsilva), relatando uma decisão já tomada ("ficou definido") e uma
  negociação em que obteve a manutenção do frontend React ("consegui falar pra manter").
  Quem tomou a decisão e em que instância: [NEEDS CLARIFICATION: quem decidiu descartar o
  SISREG e quando]
- **Trigger**: [NEEDS CLARIFICATION: motivo do descarte do SISREG — técnico, institucional,
  de prazo, de equipe?]
- **Relação com trabalho anterior**:
  - Substitui a decisão de `.specify/assessments/django-refactor/decision.md` (2026-09-18,
    verdict **go** condicionado): "Migração do fiscdsbagems para app Django do SISREG".
  - A constituição (`.specify/memory/constitution.md`, v1.0.0) tem uma seção inteira
    ("Restrições Tecnológicas e de Integração") derivada daquela decisão: banco compartilhado
    com o SISREG, `Entidade`/`Instrumento` do SISREG como fonte única, câmara técnica =
    `Subunidade` do SISREG, referência opcional à `Acao` do SISREG.
  - Há trabalho em andamento baseado nela: branch `migracao-sisreg` e spec
    `specs/001-data-access-abstraction` (camada de abstração de acesso a dados, T001–T031
    concluídas e T032 em curso, com 7 commits locais ainda sem push).

## First-Glance Unknowns

- [NEEDS CLARIFICATION: a decisão é definitiva e formal, ou ainda depende de aprovação? Há
  registro dela fora desta conversa?]
- [NEEDS CLARIFICATION: o que exatamente "será jogado fora" — o SISREG como um todo, ou só a
  integração do fiscdsbagems com ele? Outros sistemas da AGEMS continuam usando o SISREG?]
- [NEEDS CLARIFICATION: de onde passam a vir os cadastros que o SISREG forneceria — entidades
  reguladas, instrumentos/contratos, subunidades/câmaras técnicas?]
- [NEEDS CLARIFICATION: banco de dados do sistema novo — próprio, em qual infraestrutura?]
- [NEEDS CLARIFICATION: "manter a ideia do front em react" significa reaproveitar o SPA atual
  (evoluído) ou escrever um frontend novo seguindo o mesmo modelo?]
- [NEEDS CLARIFICATION: quais câmaras técnicas entram (DSB, CATERS, CATESA, CATERF, DTR…) e o
  que é "comum" entre elas vs. específico de cada uma?]
- [NEEDS CLARIFICATION: os módulos que hoje não são fiscalização de campo (autos de infração,
  termos de notificação, pareceres, relatórios, portal do prestador, análises com IA) vão para
  o sistema novo? Em quais apps?]
- [NEEDS CLARIFICATION: como os dados de produção atuais (Supabase) chegam ao sistema novo, e
  o que acontece com dispositivos em campo que têm fila local não sincronizada no momento da
  virada?]
- [NEEDS CLARIFICATION: prazo, equipe e quem mantém o sistema novo?]
- [NEEDS CLARIFICATION: o que muda para o trabalho em andamento — a branch `migracao-sisreg`, a
  spec 001 (camada de abstração) e a T032 em curso continuam, mudam de rumo ou param?]
- [NEEDS CLARIFICATION: a constituição precisa de emenda (a seção de restrições tecnológicas e
  de integração cita o SISREG); quem aprova?]
