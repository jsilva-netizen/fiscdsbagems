# Research: Módulo portal do prestador

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-01

Decisões técnicas do portal. Valem, sem repetir, as do core: organização dos apps (R3), escopo (R7),
testes de autorização (R8), arquivos (R9), central de avisos (R15) e telas por registro
(R-core-025). Também valem as do planejamento (P11, rota das previstas) e do processo sancionador
(N6, escritas da entidade; N15, consultas para o portal).

## V1 — Lugar do app e dependências

**Decision**:
- **servidor**: app Django `portal_prestador` em `backend/apps/portal_prestador/`, pequeno e sem
  modelos. Contém a regra do termo, as rotas de composição e o registro de contribuições;
- **aparelho**: módulo `frontend/src/portal/`, com casca própria (menu e cabeçalho do portal) dentro
  do mesmo aplicativo, carregada só para o papel prestador.

O app depende de `core`, `fiscalizacao`, `planejamento` e `processo_sancionador`, pelas consultas.
A `tramitacao` e os apps futuros dependem dele pelo registro (V3). Nenhum app anterior o importa.

**Rationale**: 9º na ordem da spec 003; R-portal-001 (composição sem dados próprios).

**Alternatives considered**:
- aplicativo separado para o portal: duplicaria login, verificação em duas etapas, avisos e
  componentes;
- telas do portal dentro de cada app dono: a entidade veria um portal costurado de partes, sem
  início comum, e a regra do termo ficaria espalhada.

## V2 — A regra do termo

**Decision**: `portal_prestador/alcance.py` concentra a regra:
- `fiscalizacoes_liberadas(usuario)` devolve as fiscalizações com termo **emitido pelo portal** para
  a entidade do usuário, cancelado ou não, pela consulta `termos_da_entidade` do processo
  sancionador;
- `exigir_liberada(usuario, fiscalizacao_id)` levanta "não encontrado" quando a fiscalização não está
  na lista.

Toda rota do portal que mostra dado de fiscalização chama `exigir_liberada` antes de ler. Depois
dela, o portal lê:
- o conteúdo notificado (retrato do TN), pela consulta `processo_da_entidade` do processo
  sancionador;
- as unidades (nome, endereço, coordenadas), as recomendações, as fotos e o relatório anexado, por
  duas consultas novas da fiscalização, que não aplicam alcance de usuário e só são chamadas pelo
  portal depois da regra: `resumo_para_entidade(fiscalizacao_id)` e
  `endereco_foto_para_entidade(fiscalizacao_id, foto_id)`.

Um contrato do import-linter limita quem importa essas duas consultas ao `portal_prestador`.

**Rationale**: R-portal-003; A-027; a regra fica num só lugar e é testável.

**Alternatives considered**: cada app aplicar a regra do termo nas próprias consultas: a fiscalização
dependeria do processo sancionador, que vem depois dela na ordem.

## V3 — Registro de contribuições

**Decision**: o registro tem dois lados:
- **servidor** (`portal_prestador/registro.py`): `registrar_cartao(codigo, app, titulo, funcao)`; a
  função recebe o usuário e devolve contagem, itens e link, já com o alcance do app dono;
- **aparelho** (`frontend/src/portal/extensoes.ts`): páginas, itens de menu e o componente de cada
  cartão.

O portal monta o início com os cartões registrados e os próprios: termos, autos e previstas. Os
apps anteriores ao portal (processo sancionador, planejamento) não o conhecem, então os cartões e
as páginas deles são do próprio portal, que lê as consultas deles. A tramitação e os apps futuros
registram os seus. Um app de teste registra um cartão e uma página (SC-006).

**Rationale**: R-portal-006 e R-portal-008; constituição v2.5.0.

**Alternatives considered**: o processo sancionador registrar as suas páginas no portal: ele vem
antes do portal na ordem e não pode importá-lo.

## V4 — Rotas: o que o portal compõe e o que vem direto do dono

**Decision**:
- **o portal compõe**, com rotas próprias (`portal/...`): o início, a lista e o detalhe dos termos
  e dos autos (dados do processo sancionador com o resumo da fiscalização) e os endereços de fotos;
- **o aparelho chama direto as rotas do dono** quando o dado já sai pronto e com a regra aplicada:
  - as escritas da entidade (`portal/sancionador/...`, spec 011);
  - as previstas (`portal/planejamento/previstas`, P11);
  - os avisos e as preferências do core.

**Rationale**: o portal só faz o que exige compor ou aplicar a regra do termo; o resto não ganha uma
camada a mais.

**Alternatives considered**: todo pedido passar pelo portal: repetiria as validações dos donos.

## V5 — Fronteira do papel prestador

**Decision**: o componente de escopo do core recusa (403) qualquer rota fora do prefixo `portal/`
para o papel prestador. Um teste de varredura percorre todas as rotas do sistema e confere duas
coisas:
- toda rota acessível ao prestador está sob `portal/`;
- toda rota sob `portal/` declara o escopo da entidade.

No aparelho, a casca do portal é a única carregada para esse papel.

**Rationale**: R-portal-002 (o limite passa a ser do servidor; hoje é uma lista no navegador).

**Alternatives considered**: só o limite no navegador, como hoje: chamadas diretas à API passariam.

## V6 — Telas no aparelho

**Decision**:
- telas responsivas, para computador e celular, com o kit de componentes do sistema;
- o envio de arquivos confere tipo e tamanho (PDF ou imagem, até 20 MB) antes de enviar e mostra o
  progresso;
- rascunhos de resposta e de defesa são gravados no servidor a cada salvamento, com quem salvou e
  quando, para os usuários da mesma entidade verem o mesmo rascunho;
- sem cache para uso sem rede: com a rede caída, o portal avisa e não envia nada pela metade;
- acessibilidade por teclado e leitor de tela, no padrão das demais telas.

**Rationale**: premissas da spec; R-portal-004 a R-portal-007.

**Alternatives considered**: rascunho só no navegador: dois usuários da entidade sobrescreveriam o
trabalho um do outro.

## V7 — Avisos

**Decision**: os tipos de aviso são dos apps donos: processo sancionador (N13), planejamento e
tramitação. O portal mostra a central de avisos do core e as preferências de e-mail de cada usuário.
O lembrete de "prazo próximo do fim" para a entidade é um tipo do processo sancionador
(`sancionador.prazo_proximo`, 5 dias antes da data-limite), acrescentado ao contrato dele por este
plano.

**Rationale**: R-portal-006; R-core-026; o portal não tem dados próprios.

**Alternatives considered**: tipos de aviso do portal: o portal não sabe dos prazos.

## V8 — Testes

**Decision**:
- **regra do termo** (SC-001): matriz com duas entidades e quatro casos de fiscalização: sem termo,
  termo pelo portal emitido, termo pelo portal pendente de emissão e termo manual. Para cada caso e
  cada rota do portal (inclusive fotos e documentos), a entidade certa alcança só o caso emitido, e
  a outra entidade não alcança nada;
- **fronteira** (V5): varredura das rotas;
- **dono dos dados** (SC-005): as rotas do portal não gravam no banco (contagem das instruções de
  escrita);
- **registro** (SC-006): app de teste com cartão e página;
- **ponta a ponta** (SC-004): roteiro com usuário de teste respondendo 10 determinações.

**Rationale**: FR-008; Princípio III.

**Alternatives considered**: testar só pela tela: a regra é do servidor.

## V9 — Migração

**Decision**: não há dados do portal a migrar. Os usuários da entidade migram pelo core (perfil com
papel prestador e um vínculo, A-023). Os conteúdos migram pelos apps donos.

**Rationale**: seção "Migração" da spec.

**Alternatives considered**: —
