# Research: Base de dados do sistema atual

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-09-28

Fontes: `.specify/assessments/novo-sistema-django-apps/inventario-producao.csv` (parte 1, 29
seções) e `inventario-producao-parte2.csv` (parte 2, 11 seções), ambos de produção, 2026-09-28.

## D1 — O catálogo é gerado a partir dos inventários; só a explicação é escrita à mão

**Decision**: separar o catálogo em duas camadas:
- **Estrutura:** colunas, tipos, restrições, índices, código de funções, políticas, contagens e
  dependências. É **gerada** por um script a partir dos CSVs do inventário. Não se edita à mão.
- **Explicação:** finalidade, significado de colunas, módulo dono, classificação de divergências,
  achados e decisões. É **escrita à mão** em arquivos de anotação, separados dos gerados.

O gerador junta as duas camadas e produz os documentos do catálogo.

**Rationale**:
- FR-022 exige regenerar o catálogo a partir de um inventário novo sem perder o texto explicativo.
  Isso só é possível se o texto não estiver nos arquivos gerados.
- Com 446 colunas, 173 políticas e 80 índices, copiar a estrutura à mão garantiria erro de
  transcrição e violaria o Princípio I, cuja completude é binária.
- O gerador também mede a completude, porque sabe quais objetos do inventário não têm anotação
  (SC-001, SC-002).

**Alternatives considered**:
- *Catálogo escrito à mão*: descartado pelo volume e porque desatualiza na primeira correção em
  produção (Princípio IV).
- *Catálogo só gerado, sem explicação*: descartado, porque não atende FR-002 e FR-003 (significado
  e finalidade) nem a meta de implementar sem abrir o código antigo.

## D2 — Anotações em TOML; ferramentas só com a biblioteca padrão do Python

**Decision**:
- **Anotações:** arquivos TOML, lidos com `tomllib`, que já vem no Python.
- **Ferramentas:** Python 3.11 ou mais novo, sem pacotes externos.
- **Testes:** `unittest`, também do Python.

**Rationale**: a máquina de trabalho tem Python 3.14 sem PyYAML e sem pytest (verificado em
2026-09-28). TOML aceita texto de várias linhas (`"""`), comentários e tabelas aninhadas, e é
legível para quem revisa. O gerador só **lê** as anotações, nunca escreve nelas, então a falta
de escrita de TOML na biblioteca padrão não pesa. Nenhuma dependência nova (Princípio V).

**Alternatives considered**:
- *YAML*: exigiria instalar PyYAML.
- *JSON*: ruim para texto longo e não aceita comentário.
- *Markdown com estrutura fixa, lido pelo gerador*: frágil de analisar, e erro de formatação vira
  anotação perdida em silêncio.

## D3 — Identidade estável de cada objeto

**Decision**: cada objeto tem uma chave textual estável, igual no inventário, nas anotações e no
mapa. O formato por tipo está em [data-model.md](./data-model.md#chave-do-objeto) (ex.:
`coluna:unidades_fiscalizadas.status`, `funcao:obter_resumo_indicadores(p_anos text[], ...)`,
`politica:storage.objects.<nome>`).

**Rationale**: funções com o mesmo nome e assinaturas diferentes (`obter_resumo_indicadores` tem
duas) e políticas com nome repetido em tabelas diferentes exigem chaves que não colidam. Chave
estável é o que permite regenerar e comparar inventários de datas diferentes (FR-022).

## D4 — De onde sai cada dependência

**Decision**: o gerador extrai quatro tipos de dependência e registra a origem de cada uma:

| Dependência | Origem | Como |
|---|---|---|
| tabela → tabela | registro do banco | chaves estrangeiras (seção `restricoes`) |
| view → tabela/coluna | registro do banco | seção `dependencias` (parte 2) |
| tabela → função (gatilho) | registro do banco | seção `gatilhos` |
| política → função | leitura de código | nomes de função nas condições das políticas |
| função → tabela (lê/escreve) | leitura de código | nomes de tabela no código da função. Escrita quando aparece como alvo de `INSERT INTO`, `UPDATE` ou `DELETE FROM`; leitura nos demais casos |
| função → função | leitura de código | chamadas `nome(` no código |

**Rationale**: o PostgreSQL não registra no catálogo a dependência entre funções procedurais e
tabelas. Verificado em 2026-09-28: nenhuma das 38 funções de produção monta SQL dinâmico
(`EXECUTE`), então a leitura do texto do código é confiável para essas dependências. O edge case
da spec pede que a origem de cada uma fique visível.

**Alternatives considered**: *extrair só as dependências registradas pelo banco*. Descartado:
deixaria de fora justamente as funções de negócio (`gerar_ncs_unidade`, `finalizar_fiscalizacao`)
e as de permissão (`get_my_role`, usada em 44 políticas).

## D5 — Divergências: o mesmo inventário rodado nos dois lados

**Decision**: gerar o inventário do banco das migrations com os **mesmos dois scripts SQL**,
rodados no Supabase local depois de reconstruído só pelas migrations do repositório. O
resultado é salvo em `inventario/migrations-*.tsv`, e as divergências saem da comparação
objeto a objeto pela chave estável (D3):

| Tipo de divergência | Critério |
|---|---|
| só em produção / só nas migrations | chave presente em um lado só |
| código diferente | mesma chave, definição diferente depois de normalizar espaços em branco |
| estrutura diferente | mesma chave, atributos diferentes (tipo, obrigatoriedade, padrão, definição de restrição/índice/política) |

A classificação de cada divergência (FR-010) é **anotação**, não saída do gerador. Divergência
sem classificação aparece como "não classificada" e conta contra o SC-003.

**Rationale**: comparar saídas do mesmo script elimina diferenças de formato. A medição
preliminar de 2026-09-28 usou esse procedimento e encontrou 66/18 políticas, 8/4 funções, 27
funções com código diferente, 15 índices, 6 restrições, 11 colunas, 2 buckets e 1 tabela.

**Alternatives considered**: *ler os arquivos SQL de migração e comparar com produção*.
Descartado: as 120 migrations recriam e apagam objetos em sequência (261 `DROP POLICY`), então
só o estado final, obtido executando-as, é comparável.

## D6 — Módulos: organização da constituição v2.1.0, ordem pelas dependências

**Decision**: a lista de módulos segue os apps da constituição v2.1.0. A atribuição inicial das
35 tabelas e 1 view, testada contra as chaves estrangeiras em 2026-09-28 e **sem nenhuma
violação de ordem**, é:

| Ordem | Módulo | Tabelas e views | Depende de |
|---|---|---|---|
| 1 | core | profiles, diretorias, camaras_tecnicas, municipios, prestadores_servico, contratos, audit_logs (+ `auth.users`) | — |
| 2 | checklists | tipos_unidade, itens_checklist | — |
| 3 | fiscalização | fiscalizacoes, unidades_fiscalizadas, respostas_checklist, nao_conformidades, constatacoes_manuais, determinacoes, recomendacoes, fotos_evidencia, relatorios_jobs | core, checklists |
| 4 | DTR | tipos_ocorrencia_dtr | — (o fluxo DTR usa as tabelas de fiscalização) |
| 5 | processo sancionador | termos_notificacao, respostas_determinacao, autos_infracao, manifestacoes_auto, pareceres_tecnicos, julgamentos, remessas_ai, remessas_ai_itens | core, fiscalização |
| 6 | CATERS | caters_processes, caters_recommendations, caters_analysis_history, caters_deadline_extensions, caters_extra_documents, caters_municipality_responses, caters_notification_reads, caters_ai_jobs, view caters_fiscalizacoes_disponiveis | core, fiscalização |

Funções, gatilhos, políticas e repositórios de arquivos seguem o dono da tabela que os justifica.
Funções de permissão (`get_my_role`, `is_staff`, `can_access_*`...) vão para o core. Casos
ambíguos são anotação explícita.

**Descobertas que a lista de módulos precisa registrar** (FR-013):
- **Portal do prestador** e **tramitação** não têm tabela própria no banco atual. O portal
  existe como políticas de acesso para o papel prestador e como telas. Se "tramitação" existe
  hoje (respostas a determinações? remessas?) ou é funcionalidade nova, é pergunta aberta da
  avaliação.
- **CATESA** não tem tabela em produção; `catesa_ai_jobs` existe só nas migrations. A
  funcionalidade atual dela está nas edge functions e nas telas.
- Módulos de outras câmaras entram só com requisitos (decisão da avaliação).

**Rationale**: a atribuição pelas chaves estrangeiras dá uma ordem sem ciclos entre tabelas. A
verificação completa, com chamadas entre funções e funções usadas por políticas, é tarefa da
implementação (SC-008), e a ordem pode mudar se ela encontrar dependência que as chaves
estrangeiras não mostram.

## D7 — Onde fica cada artefato

**Decision**: tudo dentro de `specs/003-base-dados-producao/`, com separação física entre o que
se edita e o que é gerado. Estrutura em [plan.md](./plan.md#source-code-repository-root). Os
documentos gerados são versionados, para que quem lê não precise rodar nada. Todo arquivo gerado
começa com um aviso de "não editar", que indica a fonte e o comando que o regenera.

**Rationale**: a spec, as ferramentas e os resultados andam juntos. A regeneração é
verificável: rodar o gerador sobre o mesmo inventário não pode produzir diferença (SC-007).

## D8 — Varredura de dados sensíveis

**Decision**: um verificador percorre **todos** os arquivos da pasta da spec (gerados e
anotações) e falha se encontrar:
- endereço de e-mail;
- CPF ou CNPJ, com ou sem máscara;
- sequência com cara de chave ou token (texto base64/hex longo, JWT);
- valor de segredo do Vault.

Nomes de pessoas não têm padrão confiável. A proteção para eles está na origem: os scripts de
inventário não extraem colunas de nome, responsável, contato ou autoria (parte 2, seção 32).
O verificador confere que nenhuma dessas colunas aparece com valores listados.

**Rationale**: SC-005 exige verificação automática. A parte 2 do inventário já mostrou que filtro
por nome de coluna pode deixar passar: o teste local pegou `prestadores_servico.responsavel`, e o
filtro foi corrigido.

## D9 — Significado de colunas e funções: sempre com fonte

**Decision**: toda anotação de significado traz o campo `fonte`, com o arquivo e a linha do
código atual, a função do banco ou o comentário do banco que a sustenta. Anotação sem fonte é
publicada como **hipótese**, com marcação visível no catálogo (FR-002).

**Rationale**: o banco tem comentário em só 26 das 446 colunas e 3 tabelas. O significado vem
do uso no código, e quem revisa precisa poder conferir.

## D10 — Formatos das specs seguintes

**Decision**: dois moldes em `formatos/`:
- **`spec-modulo.md`:** cada regra do módulo é um bloco com identificador (`R-<módulo>-NNN`),
  comportamento desejado, comportamento atual (quando diferente), motivo da diferença, objetos
  do catálogo envolvidos (chaves D3) e decisão de origem (achado ou divergência, quando houver).
- **`jornada.md`:** cada jornada é uma sequência de passos de um perfil, e cada passo referencia
  uma ou mais regras `R-...`. Passo sem referência é marcado `LACUNA`.

**Rationale**: FR-019 e FR-020. Identificadores de regra permitem ligar jornada → regra → objeto
do catálogo, a cadeia de rastreabilidade da constituição ("Levantamento em specs"). O molde é
validado na primeira spec de módulo (premissa da avaliação).
