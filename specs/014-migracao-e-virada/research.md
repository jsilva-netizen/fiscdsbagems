# Research: Migração de dados e virada

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-01

Decisões técnicas da migração e da virada. Valem, sem repetir:
- as decisões de migração de cada módulo: R13 (core), K14 (checklists), F18 (fiscalização), C11
  (CATERF), N16 (processo sancionador), T12 (CATERS), S10 (CATESA);
- a importação da fila de aparelho da fiscalização (F12).

## M1 — App `virada`, último da ordem

**Decision**: app Django `virada` em `backend/apps/virada/`. Ele:
- orquestra a carga e registra ensaios, confirmações de aparelho, portões e aprovação;
- tem uma tela restrita no módulo `frontend/src/virada/`;
- depende de todos os apps, mas só chama os comandos de migração deles e lê os resultados de
  conferência que eles produzem (M4).

Nenhum app depende dele. Depois da virada, os registros do app ficam como histórico.

**Rationale**: R-virada-002, R-virada-003, R-virada-006, R-virada-009; cada app continua dono da
carga dos seus dados (constituição, "Todo dado tem um app dono").

**Alternatives considered**:
- um script solto fora do Django: sem modelo para guardar confirmações, portões e aprovação, e sem
  testes junto do resto;
- o orquestrador gravar direto nos modelos dos apps: fere a posse dos dados.

## M2 — Origem dos dados: dump restaurado e cópia de arquivos, só leitura

**Decision**: em cada ensaio e na virada:
- o dump é restaurado num banco PostgreSQL separado (`origem`), no mesmo servidor de homologação ou
  de produção do sistema novo, acessado por um papel **só de leitura** (configuração
  `DATABASES["origem"]`);
- a cópia dos 8 repositórios fica num repositório de arquivos separado (`origem-arquivos`), também
  só leitura para as ferramentas.

Os comandos de migração dos apps leem só dessas duas fontes. O dump e a cópia chegam com checksum,
que o orquestrador confere antes de começar. Ficam cifrados em repouso, com acesso só da equipe da
virada, e o ambiente de homologação é apagado ao fim de cada ensaio.

**Rationale**: R-virada-001; Princípio IV; dados pessoais no dump.

**Alternatives considered**: ler o dump como arquivo SQL, sem restaurar: exigiria interpretar o
formato do PostgreSQL à mão.

## M3 — Orquestrador da carga

**Decision**: comando `virada executar --ensaio <nome> --origem <dsn> --arquivos <repositorio>
--teste <lista> --ajustes <tabela>`. Ele:
1. confere os checksums da origem, a lista de teste e a tabela de ajustes;
2. confere que o banco do sistema novo está vazio (carga sempre do zero, R-virada-002);
3. roda as 10 etapas da R-virada-002, chamando o comando de migração de cada app com
   `call_command`. Antes de cada etapa, confere as pré-condições declaradas por ela (ex.: os modelos
   das câmaras existem);
4. para tudo na primeira falha;
5. registra cada etapa com início, fim, resultado e o log, num `Ensaio` (M10).

As etapas e as pré-condições ficam numa tabela no código (`etapas.py`), revista a cada app novo.

**Rationale**: R-virada-002 e R-virada-004.

**Alternatives considered**: ferramenta de orquestração externa: uma sequência linear com dez
passos cabe num comando testável.

## M4 — Contrato de conferência

**Decision**: cada comando de migração, com `--conferir`, produz um arquivo JSON com o mesmo
esquema, versionado em `backend/compartilhado/migracao/esquema_conferencia.json`:
- `modulo` e `etapa`;
- **registros**, por tabela de origem: total, conferidos, descartados, de teste, legados e
  pendentes, com o identificador e o motivo de cada pendente;
- **valores**: as diferenças (identificador, campo, origem, esperado, obtido);
- **arquivos**: total, conferidos, e as diferenças (caminho, checksum de origem e de destino,
  registro esperado e obtido);
- **ligações**: referências não encontradas;
- **descartes**: volume por item do mapa.

A biblioteca `backend/compartilhado/migracao/` (sem modelos; os apps podem importá-la) oferece:
- a leitura dos mapas da spec 003;
- a impressão digital dos valores (M5);
- o cálculo de checksum;
- a escrita do JSON.

O orquestrador junta os arquivos dos apps no relatório único (M6).

**Rationale**: R-virada-003; cada app confere o que é dele, com a mesma régua.

**Alternatives considered**: o orquestrador conferir lendo os modelos dos apps: fere R3 do core e
duplicaria o conhecimento das transformações.

## M5 — Impressão digital dos valores

**Decision**: para cada registro migrado:
- **esperado**: a linha de origem passa pelas transformações do mapa (as mesmas funções da carga), e
  os campos de destino são serializados em JSON canônico (chaves ordenadas, datas em ISO no fuso de
  MS, decimais como texto);
- **obtido**: os mesmos campos lidos do destino depois da carga, serializados da mesma forma;
- os dois lados geram SHA-256, e cada diferença é listada campo a campo.

Isso pega erro de gravação (campo perdido, truncado, ligado ao registro errado), mas não erro na
própria transformação, porque os dois lados usam a mesma função. Para esse erro, há duas defesas:
1. testes da transformação com os casos de cada mapa (`transformacao` dos arquivos `.toml`);
2. uma **amostra lado a lado** no relatório: 30 registros por tabela, sorteados com semente fixa,
   com a origem bruta e o destino, para o responsável revisar.

**Rationale**: R-virada-003 (MIG-2); conferir valor por valor sem depender só da carga.

**Alternatives considered**: comparar só contagens e identificadores: não mostra valor errado.

## M6 — Relatório único

**Decision**: o comando `virada relatorio --ensaio <nome>` junta os JSONs dos apps (M4), a
conferência dos arquivos (M7) e as amostras (M5). Ele gera:
- `relatorio.json`, com o esquema do M4 mais o total geral;
- `relatorio.html` e `relatorio.pdf`, pelo motor de documentos (WeasyPrint): resumo por módulo,
  pendências primeiro, depois diferenças, legados, descartes, dados de teste e amostras.

Cada pendência tem um campo de decisão (aceita, com justificativa, ou recusada), preenchido pelo
responsável na tela da virada. Com o mesmo dump e a mesma semente, os relatórios são idênticos
byte a byte, salvo o carimbo de data. O relatório e o checksum dele ficam guardados no `Ensaio`.

**Rationale**: R-virada-003 e R-virada-009 (evidência do portão 6).

**Alternatives considered**: só planilha: perde o resumo e a ordem de leitura.

## M7 — Arquivos

**Decision**: a cópia de `origem-arquivos` para o repositório do sistema novo é feita pelos comandos
de migração dos apps donos de cada arquivo, que calculam o SHA-256 na leitura e na gravação e ligam
o arquivo ao registro. Os comandos rodam em paralelo por repositório (8 trabalhadores), e o tempo
fica medido.

Um passo final do orquestrador percorre os 1.554 arquivos de origem e confere que cada um:
- foi copiado com o mesmo checksum para um registro;
- ou está numa lista de decisão (sem registro, A-018; de teste, A-002).

Arquivo de origem que não aparece em nenhum lugar é pendência.

**Rationale**: R-virada-003 (MIG-3); portão 3.

**Alternatives considered**: ferramenta de cópia em massa entre repositórios: copia rápido, mas não
liga ao registro nem passa pelo dono.

## M8 — Conferência do backup dos aparelhos

**Decision**: o backup local do aplicativo atual é um ZIP com `dados.json` (fiscalizações, unidades,
respostas, `fila_mutacoes`, `fotos_local`) e as fotos. Ele não traz usuário nem aparelho.

A conferência é feita pela tela restrita da virada (ou pelo comando `virada conferir-backup`). A
equipe recebe o arquivo do usuário pela rede interna e informa usuário, aparelho e diretoria. A
ferramenta:
1. calcula o checksum do arquivo;
2. lê `dados.json`;
3. conta as operações com `status` diferente de `done` e as fotos locais sem `syncedAt`;
4. confere que as fiscalizações do arquivo são de autoria compatível com o usuário informado;
5. grava a `ConfirmacaoAparelho`: liberado (zero pendências) ou bloqueado, com a lista das
   operações (entidade, tipo, data) e das fotos;
6. guarda o arquivo cifrado.

A lista de aparelhos parte dos usuários ativos de campo (coordenadores e fiscais) migrados no core.
Como o backup do aplicativo atual filtra a fila pela diretoria, quem trabalha em duas diretorias
precisa de uma confirmação em cada.

**Rationale**: R-virada-006; portão 2. O aplicativo atual já gera o arquivo, sem mudança em
produção.

**Alternatives considered**: mudar o aplicativo atual para enviar a contagem ao servidor: exigiria
mudança em produção para algo que o backup já resolve.

## M9 — Importação do trabalho pendente de backup antigo (exceção)

**Decision**: o comando `virada importar-backup-legado --confirmacao <id>` roda depois da carga e da
conferência. Ele:
1. converte as operações pendentes da `fila_mutacoes` (fiscalizações, unidades, respostas,
   constatações manuais, recomendações, determinações, fotos, finalização de unidade) e as fotos
   locais para as operações da fila da fiscalização nova;
2. entrega o resultado à importação de fila da fiscalização (F12), que valida com o alcance que o
   autor tinha, aplica em nome dele e audita.

O resultado (aplicadas, recusadas com motivo) entra num anexo do relatório. O conversor é testado
com backups sintéticos que cobrem cada tipo de operação, montados nos ensaios.

**Rationale**: R-virada-006 (exceção), Princípio II.

**Alternatives considered**: carregar o JSON do backup direto nos modelos: passaria por cima das
regras da fiscalização.

## M10 — Congelamento e descongelamento do sistema atual

**Decision**: dois roteiros SQL para o banco do sistema atual, revisados e versionados no repositório
novo, executados só pelo responsável:
- **congelar**:
  1. guarda num esquema de cópia as definições atuais das políticas e privilégios de escrita;
  2. revoga INSERT, UPDATE e DELETE das tabelas de dados para os papéis `authenticated` e `anon`;
  3. troca as políticas de escrita dos repositórios de arquivos por recusa;
  4. registra a data num quadro de controle.
- **descongelar**: restaura exatamente o que foi guardado e confere, por comparação, que as
  políticas e os privilégios voltaram iguais.

Os dois são testados em cada ensaio contra uma restauração do dump num PostgreSQL de teste com as
mesmas políticas, nunca contra a produção antes do dia.

O aviso de "só leitura" na tela do aplicativo atual é **opcional**. Sem ele, a gravação falha com a
mensagem de erro de permissão. Com ele, há uma correção pequena na `main`, que depende da sua
confirmação para ir a produção.

**Rationale**: R-virada-005; R-virada-008 (volta em menos de 1 hora).

**Alternatives considered**: desligar o sistema atual no congelamento: impediria a leitura, que deve
continuar.

## M11 — Abertura, ponto de não retorno e volta

**Decision**: o sistema novo tem uma chave de abertura (configuração do core, `sistema_aberto`).
Fechado, só entram o administrador e a equipe da virada, e as tarefas agendadas (Celery beat) ficam
desligadas.
- **Abrir**: depois da aprovação (M12), liga a chave e as tarefas agendadas. É o ponto de não
  retorno; a primeira gravação de usuário fica registrada.
- **Voltar** (antes da abertura): o banco do sistema novo e a cópia dos arquivos são descartados, e o
  responsável roda o descongelamento (M10). O ensaio geral cronometra a volta.

**Rationale**: R-virada-008 e R-virada-011.

**Alternatives considered**: abrir por partes (alguns usuários antes): dois sistemas gravando ao
mesmo tempo.

## M12 — Portões e aprovação

**Decision**: `VerificacaoPortao` guarda os seis portões, com a situação e as evidências (arquivo e
checksum). O comando `virada portoes --ensaio <nome>` calcula os automáticos:
- **1**: catálogo regenerado com o inventário novo e `--verificar` sem pendência;
- **2**: confirmações de aparelho;
- **3**: volumes e tempos do ensaio;
- **5**: lista de teste e volume deixado fora;
- **6**: relatório sem pendência sem decisão.

O **portão 4** junta o resultado da execução de todas as suítes de matriz de acesso (specs 004 a
013) contra o sistema carregado e a revisão das matrizes, marcada pelo responsável.

A **aprovação** (`AprovacaoVirada`) é feita pelo responsável na tela da virada, com o usuário dele, e
guarda a data, os seis portões e o checksum de cada evidência. Sem aprovação, a chave de abertura
não liga.

**Rationale**: R-virada-009; decisão do responsável (2026-10-01).

**Alternatives considered**: aprovação por e-mail: sem ligação verificável com as evidências.

## M13 — Avisos de prazos já vencidos

**Decision**: a etapa 10 chama, em cada app com controle de avisos (CATERS, processo sancionador),
um serviço do próprio app, `marcar_avisos_ate(data)`. Ele grava no controle de avisos os prazos
vencidos até a data da virada, sem enviar nada. A tramitação começa vazia e não precisa. O serviço
entra nas tarefas de cada app.

**Rationale**: R-virada-011; o controle de avisos é de cada app (T9, N13).

**Alternatives considered**: desligar os avisos nos primeiros dias: atrasaria avisos de prazos novos.

## M14 — Conferência depois da virada

**Decision**: uma tarefa diária, nos 30 dias seguintes à abertura, conta os registros migrados de
cada tabela de destino (pelos identificadores do relatório) e compara com a contagem do relatório.
Diferença (registro migrado que sumiu ou foi alterado sem auditoria) gera aviso à equipe e ao
responsável. Registros novos, criados depois da virada, não entram na conta.

**Rationale**: R-virada-010.

**Alternatives considered**: —
