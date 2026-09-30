# Idea Intake: Planejamento anual de fiscalizações

- **Slug**: planejamento-fiscalizacoes
- **Created**: 2026-09-30
- **Source**: pasted text (pedido do responsável na sessão de 2026-09-30), com referências no
  repositório: `.specify/memory/constitution.md` (v2.6.2), `specs/004-modulo-core/spec.md`,
  `specs/005-modulo-checklists/spec.md`, `specs/003-base-dados-producao/anotacoes/modulos.toml`
- **Type**: new-capability

## Idea (as captured)

Palavras do responsável (2026-09-30):

> "no novo sistema, queremos implantar antes da fiscalização, um fluxo de planejamento. Onde os
> coordenadores elaboram o planejamento anual de fiscalizações, escolherm os
> municipios/concessões/rodovias a serem fiscalizados, alocam a equipe, definiem as datas, veículos a
> serem utilizados, diárias.. O diretor aprova esse planejamento. Os ficais conseguem consultar. O RH
> recebe esses dados/acessa para lançar na folha de ponto (ou isso pode ser feito automaticamente dps
> via API); o financeiro recebe para lançar as diárias; o setor de frotas também para reservar os
> veiculos.. Isso tudo são modulos/apps que podem ser adicionados depois. [...] Mas o planejamento no
> fluxo de fiscalização deve ser incluido quando formos falar disso. COordenador elabora o
> planejamento, diretor aprova, vai pras areas pertinentes"

> "A minha ideia é que os apps consultem os mesmos dados, ex: o coorneador faz o plano e lança,
> diretor aprova. O RH na sua tela (app do mesmo sistema) acessa e consegue ver isso. O financeiro
> Tambem, em sua tela propria. O Frotas tambem, e assim por diante."

> "Deve haver bem claro a distinção, que por exemplo a area que recebe/consulta o planejamento nao
> deve conseguir editar esse dado. Deve ter um fluxo proprio dentro do seu app para executar as ações
> necessárias"

Pedido de abertura deste assessment (2026-09-30): app `planejamento`, 3º na ordem de módulos (depois
de core e checklists, antes da fiscalização).

## Restated

Criar no sistema novo um fluxo de planejamento anual de fiscalizações por câmara. O coordenador
elabora o plano: o que fiscalizar, com qual equipe, em que datas, com quais veículos e diárias. O
diretor aprova, os fiscais consultam, e as áreas de RH, financeiro e frotas usam o plano aprovado em
apps próprios, que só leem o plano.

## Origin & Context

- **Raised by**: responsável pelo projeto (jsilva), 2026-09-30, durante a definição da arquitetura do
  sistema novo.
- **Trigger**: a construção do sistema novo (substituição do sistema atual em Supabase por Django,
  assessment `novo-sistema-django-apps`) abriu espaço para incluir, antes da execução de campo, uma
  etapa de planejamento que hoje não existe no sistema. O motivo operacional (por que agora, que
  problema do processo atual resolve) não foi declarado:
  [NEEDS CLARIFICATION: como o planejamento é feito hoje fora do sistema (planilha, ofício, e-mail) e
  o que dói nesse processo].

**Contexto já decidido que afeta a ideia** (constituição e specs):

- O planejamento é um app comum (`planejamento`), na ordem depois de core e checklists e antes da
  fiscalização; não pode depender do app de fiscalização nem de apps de câmara (constituição,
  "Independência entre apps").
- Planejamento e execução de campo são conceitos distintos e MUST permanecer distintos
  (constituição, "Fronteiras de domínio").
- App comum é "lego": não pode ter nada de câmara chumbado; cada câmara tem o seu app e monta o seu
  uso por configuração (constituição v2.6.0 a v2.6.2).
- O diretor só lê os registros operacionais; a exceção prevista é aprovar o planejamento
  (R-core-012).
- RH, financeiro e frotas entram depois como apps de outras áreas, no mesmo banco. Só leem o plano,
  e cada área registra as próprias ações no app dela, apontando para o plano (constituição, "Extensão
  para outras áreas"; R-core-023). A integração por API usa credencial de sistema (R-core-024).
- O isolamento por câmara é requisito; o sistema funciona sem rede em campo (Princípios II e III).
- O sistema atual não tem nenhum objeto de planejamento. No inventário de produção não há tabela,
  status ou campo de data prevista; aparece só o termo "Fiscalização Programada" em textos de objeto
  de processos do CATERS.
- Referência histórica: no assessment descartado `django-refactor`, o planejamento era a entidade
  `Acao` do SISREG, distinta da fiscalização; o SISREG foi descartado por inteiro.

## First-Glance Unknowns

- [NEEDS CLARIFICATION: granularidade do plano: um plano por câmara por ano, com itens (cada
  fiscalização prevista), ou outra organização (por trimestre, por diretoria)?]
- [NEEDS CLARIFICATION: o que é o "objeto" de um item do plano em cada câmara: município (DSB),
  concessão/contrato (DTR), rodovia, entidade regulada, serviço? Como isso fica genérico, sem nada de
  câmara chumbado?]
- [NEEDS CLARIFICATION: fluxo de aprovação: só "rascunho → aprovado", ou também devolução com
  ajustes, reprovação, aprovação parcial de itens?]
- [NEEDS CLARIFICATION: o que acontece com o plano aprovado quando a realidade muda (remarcar data,
  trocar fiscal ou veículo, cancelar, incluir fiscalização nova): nova aprovação do diretor?
  versões do plano? E como RH, financeiro e frotas ficam sabendo da mudança?]
- [NEEDS CLARIFICATION: fiscalizações não previstas no plano (denúncia, emergência, eventual)
  continuam possíveis? Precisam de aprovação?]
- [NEEDS CLARIFICATION: vínculo com a execução: a fiscalização executada aponta para o item do plano?
  Quem cria esse vínculo, se o planejamento vem antes na ordem e não pode depender da fiscalização?]
- [NEEDS CLARIFICATION: equipe: só fiscais da câmara, ou também servidores de outras câmaras ou
  áreas (motorista, apoio)? O motorista é usuário do sistema?]
- [NEEDS CLARIFICATION: veículos: onde fica o cadastro de veículos (core, planejamento ou o app
  futuro de frotas) antes de o app de frotas existir?]
- [NEEDS CLARIFICATION: diárias: o plano só informa quantidade de diárias por pessoa e destino, ou
  calcula valores? Tabela de valores de diária é do planejamento ou do financeiro?]
- [NEEDS CLARIFICATION: quem mais consulta o plano: o prestador (entidade regulada) vê as
  fiscalizações previstas para ela? (Hoje o prestador não vê nada antes da fiscalização.)]
- [NEEDS CLARIFICATION: operação offline: o plano precisa estar no aparelho do fiscal em campo, ou só
  a execução?]
- [NEEDS CLARIFICATION: indicadores: o diretor acompanha planejado × executado nos painéis
  (R-core-012)? Isso é do planejamento ou da fiscalização?]
- [NEEDS CLARIFICATION: dados sensíveis: diárias e escalas são dados de pessoal; quem pode ver
  valores e nomes (fiscais de outras câmaras, prestador)?]
