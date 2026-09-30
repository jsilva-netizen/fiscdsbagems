# Research: Módulo planejamento

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-30

Decisões técnicas do planejamento, terceiro app do sistema novo. Cada uma tem a decisão, o motivo e
as alternativas descartadas. Valem, sem repetir aqui, as decisões do core
([research do core](../004-modulo-core/research.md)):
- R1: repositório novo;
- R2: versões;
- R3: `consultas`/`servicos` e import-linter;
- R7 e R8: escopos e matriz de acesso;
- R10: auditoria;
- R11: sincronização;
- R12: credenciais de sistema;
- R14: e-mail.

As restrições de partida são as da constituição v2.6.2.

## P1 — Lugar do app e dependências

**Decision**: o app fica em `backend/apps/planejamento/` e depende só do `core`, por
`core.consultas` (usuários, câmaras, diretorias, serviços, municípios, entidades). Ele não depende
de `checklists` nem de `fiscalizacao`, e não conhece nenhum app de câmara. Os apps posteriores
dependem dele, nunca o contrário:
- a fiscalização lê as atividades planejadas;
- o app da CATERF registra os tipos de destino "concessão" e "rodovia";
- RH, financeiro e frotas leem o plano aprovado.

O contrato do import-linter do planejamento proíbe importar qualquer app posterior.

**Rationale**: constituição, "Independência entre apps", e R-planejamento-021/022.

**Alternatives considered**:
- planejamento dependendo da fiscalização para marcar o que foi executado: inverte a ordem, e a
  constituição proíbe;
- colocar o planejamento dentro da fiscalização: fere "planejamento e execução são conceitos
  distintos".

## P2 — Tipos de destino como peças registradas

**Decision**: o planejamento mantém um **registro de tipos de destino** (`planejamento/destinos.py`).
Cada tipo tem:
- código;
- nome;
- app que o oferece;
- uma função de busca e resolução, que o app dono fornece usando as próprias `consultas`, com o
  escopo do usuário.

Os tipos "município" e "entidade regulada" são registrados pelo próprio planejamento, sobre
`core.consultas`, porque são do core e não de uma câmara. O app da CATERF registra "concessão" e
"rodovia" ao iniciar (no `AppConfig.ready`). É o app da CATERF que importa o registro do
planejamento, e não o contrário.

O destino gravado na viagem guarda o código do tipo, o identificador do objeto e o **nome do objeto
no momento**. Assim ele continua legível se o app dono sair ou o objeto mudar de nome.

**Rationale**: R-planejamento-003 e R-planejamento-022; o mesmo padrão das peças registradas do
motor de checklists (R-checklists-019).

**Alternatives considered**:
- chave estrangeira genérica do Django (`GenericForeignKey`): acopla ao modelo do outro app, e o
  planejamento teria de conhecer os modelos da CATERF;
- colunas fixas "município" e "rodovia": chumba câmara no app comum.

## P3 — Versões: logística da viagem e parte de cada câmara

**Decision**: dois níveis versionados, com versões imutáveis depois de vigentes.

- **`Viagem`** (identidade estável) com **`ViagemVersao`**: a logística, que é da câmara
  organizadora (período, destinos, distância, veículo ou autonomia, preço do litro e combustível
  calculado).
- **`Participacao`** (identidade estável, uma por câmara na viagem) com **`ParticipacaoVersao`**: a
  parte da câmara (quantidade de servidores, lançamentos de diárias e totais). As atividades de uma
  versão são linhas com um `atividade_id` estável, repetido entre versões, para que a fiscalização
  aponte sempre para a mesma atividade (P12).

Cada versão tem a situação `rascunho`, `pendente`, `vigente`, `substituida` ou `devolvida`:
- antes da aprovação do plano, a versão em rascunho é editada no próprio registro;
- depois, toda mudança cria uma versão nova `pendente`, ou já `vigente` quando não pede aprovação;
- aprovar torna a versão `vigente` e a anterior `substituida`;
- no máximo uma versão pendente por viagem e por participação;
- os leitores veem sempre a versão `vigente`.

**Rationale**: R-planejamento-005 (cada coordenador cuida da sua parte), R-planejamento-008 (vale a
versão aprovada enquanto a mudança espera) e R-planejamento-010. Os valores congelados de
R-planejamento-006 ficam dentro da versão.

**Alternatives considered**:
- uma versão única da viagem inteira: numa viagem conjunta, uma câmara bloquearia a outra, e a
  aprovação de um plano mexeria na parte de outro;
- django-simple-history: guarda o histórico, mas não tem o conceito de versão pendente convivendo
  com a vigente;
- JSON com a viagem inteira por versão: dificulta consultar e filtrar por destino, atividade e
  câmara.

## P4 — Cálculo dos custos

**Decision**: o cálculo é feito no servidor, num módulo puro (`planejamento/custos.py`), com
`Decimal`:
- litros = distância ÷ autonomia, com 2 casas;
- combustível = litros × preço do litro;
- diárias = quantidade × valor unitário, com a quantidade em múltiplos de 0,5.

O arredondamento é meio para cima, em centavos, aplicado só nos valores finais de cada linha. Os
totais são somas das linhas. Os valores calculados são gravados na versão no momento em que ela se
torna vigente ou pendente, e não são recalculados depois (congelamento). O valor unitário da diária
vem da tabela vigente na data de início da viagem, para o município de referência do lançamento.
Sem valor na tabela, é aceito o valor informado, com justificativa, e a versão fica marcada. O
aplicativo mostra uma prévia pelo mesmo cálculo, pedida ao servidor.

**Rationale**: R-planejamento-006 e SC-001, que reproduz as 10 viagens do Anexo I, com os 3 erros
corrigidos. O cálculo único no servidor evita a divergência da planilha.

**Alternatives considered**:
- cálculo no navegador: duas implementações, e a planilha mostra o que acontece quando a conta é
  feita à parte;
- `float`: erros de centavo.

## P5 — Tipos de mudança: lista fechada e classificação automática

**Decision**: os tipos de mudança são uma enumeração fixa no código do planejamento (genérica, sem
câmara): `DATAS_MESMO_MES`, `DATAS_OUTRO_MES`, `INCLUIR_DESTINO`, `RETIRAR_DESTINO`,
`INCLUIR_ATIVIDADE`, `RETIRAR_ATIVIDADE`, `TROCAR_VEICULO`, `ALTERAR_DISTANCIA`,
`ALTERAR_SERVIDORES`, `AUMENTAR_DIARIAS`, `REDUZIR_DIARIAS`, `CANCELAR_VIAGEM`,
`INCLUIR_PARTICIPACAO`.

O coordenador não escolhe o tipo. O serviço compara a versão proposta com a vigente e **classifica**
a mudança em um ou mais tipos. `AUMENTAR_DIARIAS` é detectado pelo valor total das diárias da
participação, qualquer que seja a causa. A mudança pede aprovação se qualquer tipo dela estiver
marcado na configuração da câmara ou se for `AUMENTAR_DIARIAS`, que é sempre marcado e não pode ser
desmarcado. Mudanças que não mexem na viagem, como escalar, trocar servidor ou editar observação,
não passam por aqui.

**Rationale**: R-planejamento-008. A classificação automática impede que a escolha errada do tipo
fure a aprovação.

**Alternatives considered**:
- o coordenador escolhe o tipo: erro humano ou esquiva da aprovação;
- motor de regras configurável: vedado pelo limite aceito no assessment.

## P6 — Fluxo de aprovação

**Decision**: estados e transições em funções de serviço explícitas (`enviar_plano`,
`aprovar_plano`, `devolver_plano`, `propor_mudanca`, `aprovar_mudanca`, `devolver_mudanca`,
`retirar_mudanca`, `enviar_extra`, `aprovar_extra`, `devolver_extra`). Cada função verifica o estado
atual e o papel e grava a auditoria. Devolver exige motivo. O administrador não aprova.

**Rationale**: poucos estados, e as regras cabem em funções testáveis (Princípio V).

**Alternatives considered**: django-fsm ou viewflow: dependência a mais para uma máquina de estados
pequena.

## P7 — Escala, conflito de período e liberação

**Decision**: o modelo `Escala` liga um usuário a uma participação, com a situação `escalado`,
`pedido`, `liberado`, `recusado`, `expirado` ou `cancelado`.

- **Servidor da própria câmara**: entra direto como `escalado`.
- **Servidor de outra câmara**: nasce como `pedido`, e o coordenador da câmara de origem é avisado.
  Ele libera (a escala passa a `liberado` e conta na equipe) ou recusa, com motivo.
- **Conflito de período**: ao escalar ou liberar, o serviço verifica sobreposição com outras escalas
  ativas do mesmo usuário em versões vigentes e recusa se houver.
- **Limite**: o número de escalas ativas não passa da quantidade aprovada.
- **Expiração**: uma tarefa diária (Celery beat) expira os pedidos sem resposta cuja viagem já
  começou.
- **Mudança de período**: aplicada depois da liberação, volta as escalas de outra câmara para
  `pedido`.

**Rationale**: R-planejamento-011 e R-planejamento-012.

**Alternatives considered**: a liberação como mudança do plano: misturaria o fluxo do diretor com o
dos coordenadores.

## P8 — Avisos

**Decision**: o planejamento usa a central de avisos do core (R-core-026, research R15 do core). Ele
registra os tipos dele e manda os avisos por `core.servicos.enviar_aviso`:

| Tipo | Destinatários | E-mail |
|---|---|---|
| `planejamento.plano_enviado` | diretor da diretoria da câmara | sim |
| `planejamento.plano_decidido` (aprovado ou devolvido) | coordenadores da câmara | sim |
| `planejamento.extra_enviada`, `planejamento.mudanca_pendente` | diretor da diretoria | sim |
| `planejamento.mudanca_decidida`, `planejamento.extra_decidida` | coordenador autor | sim |
| `planejamento.convite_viagem` | coordenadores da câmara convidada | sim |
| `planejamento.liberacao_pedida` | coordenadores da câmara de origem | sim |
| `planejamento.liberacao_decidida`, `planejamento.liberacao_expirada` | coordenador que pediu | sim |
| `planejamento.escalado` | servidor escalado | sim |
| `planejamento.viagem_alterada` | servidores escalados e câmaras participantes | não |

As telas do planejamento mantêm a lista "minhas pendências" (o que espera ação do usuário), que é
uma consulta do planejamento, e não um aviso.

**Rationale**: decisão do responsável, 2026-09-30: a central de avisos é comum e fica no core.

**Alternatives considered**: e-mail direto pelo planejamento: cada app teria o próprio jeito de
avisar, e o usuário não teria um lugar só.

## P9 — Cronograma e atualização

**Decision**: o documento é gerado sob demanda, no servidor, em dois formatos: planilha XLSX
(openpyxl) e PDF (WeasyPrint, a partir de HTML). O layout é uma lista ordenada de colunas, escolhidas
entre as colunas disponíveis que o planejamento oferece:
- mês, datas, destinos, atividades e serviços;
- KM, autonomia, litros, preço do litro e combustível;
- servidores, diárias (quantidade, valor unitário, total) e total geral.

O layout padrão é o do Anexo I. A atualização de um período lista as mudanças aplicadas nele (antes,
depois, decisão). Com o volume atual, dezenas de viagens por plano, a geração síncrona basta; se
passar de alguns segundos, vira tarefa Celery.

**Rationale**: R-planejamento-015 e SC-008. O Anexo I é hoje uma planilha publicada como PDF.

**Alternatives considered**:
- ReportLab: layout mais trabalhoso de manter que HTML e CSS;
- só PDF: a equipe hoje trabalha em planilha;
- gerador de relatórios da fiscalização: ainda não especificado. Se ela escolher outro motor, os
  dois devem convergir; fica anotado para a spec da fiscalização.

## P10 — Consulta sem rede

**Decision**: a rota `GET sync/planejamento?desde=` do protocolo do core devolve, só para o usuário,
as viagens vigentes em que ele tem escala ativa (`escalado` ou `liberado`). Cada viagem vem com a
logística, a participação dele, as atividades, a equipe e o veículo, e o protocolo informa também as
remoções (escala cancelada, viagem cancelada). Não há `POST sync/planejamento`: nada do
planejamento é escrito sem rede.

**Rationale**: R-planejamento-017; o planejamento é trabalho de escritório, só a consulta vai a
campo.

**Alternatives considered**: baixar o plano inteiro da câmara para todos os fiscais: mais dados no
aparelho, sem necessidade.

## P11 — Prestador

**Decision**: a rota `GET portal/planejamento/previstas` devolve, com um serializador próprio e
restrito, as atividades vigentes de planos aprovados cuja entidade alvo é a entidade do prestador e
que não estão escondidas: tipo de atividade, serviços, destinos, mês e datas previstas. O filtro por
entidade usa o escopo do core (R-core-013). Viagem cancelada e mudança pendente não aparecem. A
spec do portal do prestador define a tela; o planejamento fornece a rota.

**Rationale**: R-planejamento-019; a spec do portal ainda não existe.

**Alternatives considered**: o portal ler as viagens com o serializador comum e esconder campos na
tela: vazaria equipe e diárias pela API.

## P12 — Elo com a execução

**Decision**: `planejamento.consultas.atividades_de_fiscalizacao(camara, desde, ate)` devolve as
atividades vigentes de tipos marcados "é fiscalização de campo", de viagens não canceladas de planos
aprovados, com:
- `atividade_id` (estável entre versões);
- viagem, câmara, período e destinos;
- serviços, entidade alvo e equipe.

A fiscalização guarda o `atividade_id`. O planejamento não guarda nada sobre a fiscalização.
Atividade retirada ou viagem cancelada continuam consultáveis por identificador, marcadas, para a
fiscalização mostrar a inconsistência.

**Rationale**: R-planejamento-021, sem depender da fiscalização.

**Alternatives considered**: chave estrangeira da fiscalização para a versão da atividade: mudaria
de destino a cada versão.

## P13 — Configuração da câmara e cópia

**Decision**: o modelo `ConfiguracaoPlanejamento` tem uma linha por câmara, com:
- os tipos de atividade, em tabela própria, com nome e a marca "é fiscalização de campo";
- a lista dos tipos de mudança que pedem aprovação, com `AUMENTAR_DIARIAS` sempre incluído;
- o layout do cronograma, como lista de códigos de coluna.

Uma câmara sem configuração recebe a padrão da R-planejamento-018 no primeiro acesso ao
planejamento. Copiar de outra câmara duplica a configuração, com a origem registrada, e não mantém
vínculo. Os tipos de atividade não são apagados se usados em viagens, só desativados.

**Rationale**: R-planejamento-018; constituição v2.6.1.

**Alternatives considered**: configuração global por diretoria: fere "um app por câmara" e a
decisão de configuração por câmara.

## P14 — Veículos e tabela de diárias

**Decision**: os modelos `Veiculo` e `ValorDiaria` (município, valor, início de vigência) ficam no
planejamento, escritos só pelo administrador e lidos por toda a equipe. Veículo usado em viagem é só
desativado. O valor vigente de um município numa data é o de maior início de vigência até aquela
data. Uma carga por planilha (`carregar_tabela_diarias`) recebe a tabela que a agência já tem.

Quando frotas e financeiro existirem, cada um passa a ser dono do seu cadastro. Uma migração de
dados leva os registros, preservando os identificadores, e o planejamento passa a ler pelas
`consultas` do novo dono. As viagens guardam o identificador e os valores congelados, então nada
muda nelas.

**Rationale**: R-planejamento-013 e R-planejamento-014; constituição, "nenhum app mantém cópia
própria de dado de outro" (a posse é transferida, não copiada).

**Alternatives considered**:
- veículos no core: não é cadastro de base de todos os apps;
- esperar frotas: bloquearia o cálculo de combustível.

## P15 — Escopos de acesso

**Decision**: o escopo segue o componente do core (R7 do core), com escopos próprios do
planejamento:
- **plano e viagem**: câmara (coordenador lê e escreve; fiscal lê), diretoria (diretor lê e
  aprova) e administrador (lê);
- **viagem de outra câmara**: legível por quem tem escala ativa nela;
- **prestador**: só a rota de P11;
- **outras áreas**: papéis com a permissão declarada `planejamento.leitura_aprovados` e credenciais
  com o escopo `planejamento.leitura`.

A matriz está em [contracts/matriz-acesso.md](./contracts/matriz-acesso.md) e é testada caso a caso
(R8 do core).

**Rationale**: R-planejamento-016 e R-planejamento-020; Princípio III.

**Alternatives considered**: permissões de modelo do Django: não expressam câmara, diretoria nem
escala.

## P16 — Painel do diretor e integração com o core

**Decision**: o planejamento registra nas telas do core (R-core-025):
- a entrada "Planejamento" no menu, por papel;
- o painel "Planos da diretoria" no início do diretor (situação e totais de cada câmara, pendências
  de aprovação);
- a entrada "Planejamento" nas Definições, com a configuração da câmara, os veículos e a tabela de
  diárias.

O painel planejado × executado será registrado pela fiscalização.

**Rationale**: R-core-025, R-planejamento-007 e R-planejamento-021.

**Alternatives considered**: telas do planejamento soltas, fora do registro do core: fere a
R-core-025.
