# Inventário de RPCs, Funções e Triggers Postgres — o que existe hoje e como pensar o Django

**Feature**: Camada de Abstração de Acesso a Dados (contexto para a fase 2)
**Date**: 2026-09-18
**Método**: leitura do código-fonte SQL real nas migrations — não inferência a partir do
uso no cliente. Cada função abaixo foi lida na sua versão mais recente (a última migration
que a redefine com `CREATE OR REPLACE`).

**Por que este documento existe**: o cliente chama essas funções pelo nome, mas o que elas
fazem de fato só existe no banco. Uma "tradução" apressada para Django, baseada só em como o
JS as usa, perderia regras de negócio inteiras — algumas de segurança. Este documento é o
material de referência para meses de trabalho, é um mapa para desenhar deliberadamente.

---

## Resumo — o que precisa de decisão de design, não só tradução

| Função/Trigger | Complexidade real | Risco se mal traduzida |
|---|---|---|
| `gerar_ncs_unidade` | **Altíssima** — 376 linhas, 10 migrations de correção | Perde edição do usuário, duplica NC/determinação, ou diverge da versão cliente |
| `finalizar_fiscalizacao` | Alta — numeração por ranking + chama `gerar_ncs_unidade` em loop | Numeração de termo errada; finalização parcial |
| `enforce_profile_security` (trigger) | Média, mas **crítica de segurança** | Não replicar = brecha de auto-promoção a admin |
| `propagate_modification_to_parent` (trigger) | Baixa, mas **estrutural** | Sync incremental para de detectar mudança em filhos |
| `gerar_numero_auto` / `gerar_numero_am` | Baixa em código, **mas já tem bug de corrida hoje** | Preservar o bug ou corrigi-lo é decisão consciente, não acidente |
| `obter_resumo_indicadores` | Média — agregação com array Postgres (`unnest`) | Exige `ArrayField`/tabela normalizada equivalente em Django |
| `admin_delete_user(_by_email)` | Baixa | Django resolve de forma mais simples nativamente |
| `caters_import_from_fiscalizacao` | Baixa, escopo isolado | — |
| `set_fiscalizacao_cache_fields` (trigger) | Baixa | Duplica lógica que o cliente também tenta fazer — checar redundância |

---

## 1. `gerar_ncs_unidade(p_unidade_fiscalizada_id, p_fotos, p_finalizar)` — a peça mais complexa do sistema

**Fonte**: `supabase/migrations/099_preserve_determinacoes_edits.sql` (versão final; 10
migrations de correção desde a 066, cada uma um incidente real corrigido).

**O que faz, de verdade**: a partir das respostas de checklist e das constatações manuais de
uma unidade, **gera automaticamente** não conformidades, determinações e recomendações —
com uma regra de preservação sofisticada:

- Deduplica respostas de checklist por chave (`item_checklist_id`, ou pergunta, ou número da
  constatação), mantendo só a mais recente — via `row_number() OVER (PARTITION BY ...)`.
- Para cada resposta "NÃO" que gera NC: cria a não conformidade, e **se já existe uma
  determinação com a mesma origem** (`checklist:<item_id>` ou `manual_constatacao:<id>`),
  **preserva a descrição editada pelo usuário**, só atualizando o vínculo com a NC nova.
  Só cria do zero se não existir.
- Mesma lógica espelhada para recomendações.
- Ao final, **apaga apenas as órfãs** — determinações/recomendações cuja origem não está
  mais na lista de origens válidas desta rodada (porque a resposta mudou de NÃO para SIM, ou
  a constatação manual foi removida).
- Recalcula totais (`total_constatacoes`, `total_ncs`) e, se `p_finalizar=true`, marca a
  unidade como finalizada.
- Autorização: bloqueia se o `role` do usuário autenticado não for `admin`, `coordenador` ou
  `fiscal` — checagem explícita dentro da função, redundante com (mas independente de) RLS.

**Por que isto preocupa, com razão**: existe uma **segunda implementação, em TypeScript**,
de uma lógica muito parecida — `syncDeterminacoesFromChecklist`/
`syncRecomendacoesFromChecklist` em `src/lib/offline/repository.ts` (lote 3b do
inventário de acoplamento), usada no caminho **offline**, para o fiscal ver a determinação/
recomendação aparecer na tela antes mesmo de sincronizar. As duas implementações **precisam
concordar**, e hoje isso é mantido por disciplina de dois desenvolvedores lembrando de
atualizar os dois lados — não há teste que garanta paridade entre elas.

**Decisão que a fase 2 precisa tomar, explicitamente**:

- **Opção A** — Portar `gerar_ncs_unidade` para Python como está, linha a linha, como a
  fonte única de verdade, e fazer a versão offline (Dexie) chamá-la via uma função
  compartilhada ou reproduzi-la fielmente com testes de paridade automatizados contra ela.
- **Opção B** — Repensar o desenho: já que o Django será o único backend, talvez a lógica
  possa viver **só** no lado do servidor, e o cliente offline apenas registra respostas cruas
  (sem gerar NC/determinação/recomendação localmente), deixando a geração para a
  sincronização. Isso mudaria o que o fiscal vê **antes** de sincronizar — precisa de
  validação de produto, não é decisão só técnica.
- **Em qualquer caso**: os testes de caracterização desta fase (FR-010) devem capturar o
  comportamento de `gerar_ncs_unidade` como referência de paridade — é o candidato número um
  a regressão silenciosa se a fase 2 não tratá-lo com o mesmo cuidado que o próprio
  histórico de 10 correções sugere que merece.

---

## 2. `finalizar_fiscalizacao(p_fiscalizacao_id)`

**Fonte**: `supabase/migrations/110_finalizar_fiscalizacao_force_finalize_units.sql`.

**O que faz, além do que o cliente já deixava entender**:

- Autorização explícita (mesmo papel exigido de `gerar_ncs_unidade`).
- **Gera o número do termo por ranking**, não por contador: `row_number() OVER (PARTITION BY
  ano ORDER BY created_at, id)` entre **todas** as fiscalizações do mesmo ano, travando a
  linha da fiscalização com `FOR UPDATE` antes de calcular. Ou seja, o número do termo de uma
  fiscalização não é "a próxima sequência disponível quando finalizada" — é **a posição dela
  na ordem de criação entre todas as fiscalizações daquele ano**, calculada no momento da
  finalização. Isso é sutil e fácil de replicar errado: um Django que apenas incrementasse um
  contador a cada finalização produziria números diferentes dos que este sistema geraria.
- Chama `gerar_ncs_unidade(..., true)` para **cada unidade** da fiscalização, em loop, antes
  de consolidar totais.
- **A própria função verifica em `information_schema.columns`** se colunas como
  `total_constatacoes` existem em `fiscalizacoes` antes de tentar preenchê-las — o
  desalinhamento de schema documentado no inventário de acoplamento não é só um problema do
  cliente: **está refletido dentro do próprio banco**, provavelmente porque esta função
  sobreviveu a mudanças de schema que nem sempre vieram acompanhadas de migration para todas
  as colunas que ela referencia.

**Para o Django**: a numeração por ranking precisa ser reproduzida exatamente (uma `window
function` equivalente via ORM, ou uma consulta anotada), e a finalização em cascata das
unidades precisa continuar **atômica** — é exatamente a atomicidade que o comentário em
`repository.ts` (lote 3b) diz já ter evitado um deadlock quando foi feita como duas chamadas
separadas do cliente.

---

## 3. `reabrir_fiscalizacao(p_fiscalizacao_id)`

**Fonte**: `supabase/migrations/114_fix_reabrir_fiscalizacao_units_status.sql`.

Simples e direta: autorização, muda status da fiscalização e de todas as suas unidades para
`em_andamento`, zera `data_fim`. Tradução para Django é direta — uma transação atômica com
dois `UPDATE` em cascata. Nenhuma decisão de design pendente aqui.

---

## 4. `gerar_numero_auto()` e `gerar_numero_am()` — ⚠️ não são realmente atômicas

**Fontes**: `supabase/migrations/001_initial_schema.sql` (auto) e
`supabase/migrations/062_fluxo_portal_manual_am_remessas_ai.sql` (AM).

**O que fazem**: as duas seguem o mesmo padrão —

```sql
SELECT COUNT(*) + 1 INTO seq FROM <tabela> WHERE to_char(created_at,'YYYY') = ano;
RETURN '<PREFIXO> ' || lpad(seq::text,3,'0') || '/' || ano || '/DSB/AGEMS';
```

**Isto não protege contra corrida.** `SELECT COUNT(*)` sem `FOR UPDATE`, sem sequência
dedicada, sem trava — apenas conta as linhas existentes no momento da chamada. A função
**só devolve o texto do número**; a inserção do registro (`autos_infracao` ou
`termos_notificacao.numero_am`) acontece **depois, numa chamada separada do cliente**.
Se dois usuários gerarem um auto de infração no mesmo segundo, ambos podem receber
`AI 004/2026/DSB/AGEMS` e ambos inserir — **dois autos de infração oficiais com o mesmo
número**, em um documento de efeito jurídico sobre uma concessionária regulada.

**Isto corrige uma afirmação errada do próprio [inventario-acoplamento.md](./inventario-acoplamento.md)** — na seção sobre
`AnaliseManifestacao.jsx`, eu havia escrito que `gerarNumeroAmOnline`/`gerarNumeroAutoOnline`
eram "RPCs atômicas", em oposição à numeração de TN (calculada no cliente, sem RPC). Essa
afirmação foi feita sem ler a função em si — só a chamada do lado do cliente — e está
**errada**: nenhuma das três é atômica. Na prática, **TN, AM e auto de infração têm
exatamente a mesma fragilidade**, só que duas fazem a conta no servidor e uma no cliente.
*(A correção equivalente foi aplicada diretamente no inventário de acoplamento.)*

**Recomendação explícita, para decisão do usuário**: isto é candidato real a **FR-022**
(correção obrigatória de defeito que pode causar dado corrompido/duplicado — aqui não é
perda de dado, mas duplicação de numeração oficial, que tem gravidade equivalente ou maior
num contexto de fiscalização regulatória com efeito legal). Duas opções:

- **Corrigir apenas na reimplementação Django** — usar `SELECT ... FOR UPDATE` numa tabela de
  contadores, ou uma `SEQUENCE` do Postgres por ano/prefixo, garantindo atomicidade real pela
  primeira vez. É a correção "de graça" que a reescrita permite.
- **Preservar o comportamento atual e a fragilidade**, se por algum motivo a paridade byte-a-
  byte com o sistema atual for mais importante que corrigir o defeito agora. Dado o histórico
  do sistema (não há evidência de que a colisão já tenha ocorrido em produção, mas o risco
  cresce com uso concorrente), a recomendação é **corrigir**, não preservar.

---

## 5. `admin_delete_user(p_user_id)` / `admin_delete_user_by_email(p_email)`

**Fonte**: `supabase/migrations/056_admin_delete_auth_user.sql`.

Verifica que quem chama é `admin` e `ativo`, impede autoexclusão, apaga o perfil e depois o
usuário em `auth.users`. Existe como `SECURITY DEFINER` porque um cliente comum não pode
apagar usuário de outra pessoa via API padrão do Supabase Auth.

**Para o Django**: isto fica **mais simples**, não mais complexo — é exatamente o tipo de
operação para a qual o Django Admin (ou uma view restrita a `is_staff`/`is_superuser`) foi
desenhado, sem precisar de nenhum truque de elevação de privilégio no nível do banco. Um dos
poucos casos em que a migração reduz complexidade em vez de aumentar.

---

## 6. `obter_resumo_indicadores(p_anos, p_servicos, p_municipio_ids, p_prestador_ids, p_tipo_modulo)`

**Fonte**: `supabase/migrations/104_rpc_multi_modulo.sql` (versão final, retrocompatível com
a 102).

**O que faz**: agregação do painel de indicadores — cria tabelas temporárias filtradas
(fiscalizações totais e finalizadas, por ano/serviço/município/prestador/módulo, todos os
filtros opcionais via `cardinality(...) = 0 OR ...`), conta NCs/determinações/recomendações/
constatações das unidades correspondentes, calcula conformidades por subtração, monta um
**ranking top 10 de determinações por município**, e uma **distribuição por serviço** — que
exige `unnest(f.servicos)` porque `servicos` é um **array Postgres** na tabela
`fiscalizacoes`.

**Para o Django**: é a RPC mais "genuinamente de agregação" do sistema, mas **traduzível**
com cuidado:

- Filtros opcionais → `Q()` objects combinados condicionalmente.
- `unnest(servicos)` → exige decisão de modelo: se `servicos` virar `ArrayField` (Postgres,
  suportado pelo Django ORM) mantém-se `unnest`-like via anotação; se virar tabela de
  junção normalizada (mais idiomático em Django), a agregação muda de forma, mas fica mais
  simples de expressar com `annotate`/`values`/`Count`.
- Ranking top 10 com `GROUP BY`/`ORDER BY`/`LIMIT` → `annotate(Count(...)).order_by(...)[:10]`.
- Esta é a função que mais se beneficia de ser **redesenhada**, não só traduzida — é onde a
  fase 2 deve investir tempo de design de verdade, não tradução mecânica.

---

## 7. `caters_import_from_fiscalizacao(p_fiscalizacao_id, p_caters_process_id, p_prazo_dias)`

**Fonte**: `supabase/migrations/121_caters_fiscalizacao_link.sql` — lida por completo (a
versão anterior deste documento citava esta função com base numa leitura parcial; corrigido
aqui).

Escopo isolado e bem definido: verifica que o usuário pertence à CATERS
(`is_caters_user()` — mais uma função de autorização a mapear), calcula uma data-base de
prazo (`data_fim`, senão `data_inicio`, senão hoje), e importa para
`caters_recommendations` — uma **tabela única que serve dois propósitos**, diferenciada por
qual coluna de vínculo está preenchida:

- **Recomendações** da fiscalização: `recomendacao_id` preenchido, prioridade `'media'`,
  prazo = data-base + `p_prazo_dias` (padrão 30).
- **Determinações** da fiscalização: `determinacao_id` preenchido, prioridade `'alta'`,
  prazo = `COALESCE(d.prazo, data-base + p_prazo_dias)` — usa o prazo próprio da
  determinação quando existe.

Ambas evitam duplicar via `NOT EXISTS`. Ao final, vincula `caters_processes.fiscalizacao_id`
ao processo. **O comentário da própria migration marca a importação de determinações como
"futuro — já preparado"** — ou seja, o código existe e está ativo na função, mas pode não
fazer parte do fluxo de produto hoje considerado "em uso"; vale confirmar com quem usa o
CATERS se essa metade da função é exercitada na prática antes de decidir quanto esforço de
paridade dedicar a ela.

A função também confirma que `caters_fiscalizacoes_disponiveis` (citada no inventário de
acoplamento, lote 2) é de fato uma **view**, não tabela — criada logo em seguida no mesmo
arquivo de migration, filtrando fiscalizações para exibição sem expor dados de outras
câmaras.

Nenhuma decisão de design pendente de peso — tradução direta para um método de serviço no
domínio `caters`, respeitando a dualidade recomendação/determinação descrita acima.

---

## 8. Triggers — lógica que dispara sozinha, invisível a qualquer leitura de código cliente

Estes **não aparecem em nenhuma chamada explícita do JS/TS** — disparam automaticamente no
banco a cada INSERT/UPDATE/DELETE. É a categoria de acoplamento que nenhuma leitura de
`src/` poderia revelar; só apareceu ao ler as migrations diretamente.

### `propagate_modification_to_parent()` — estrutural para o sync incremental

**Fonte**: `supabase/migrations/100_audit_system.sql`, restaurada em
`112_rollback_cleanup_triggers.sql` (o nome do arquivo sugere que alguém tentou remover
esses triggers em algum momento, e teve que reverter — um incidente real).

Sempre que uma unidade, resposta, constatação manual, recomendação ou determinação muda,
este trigger **atualiza `fiscalizacoes.updated_at`** do pai. **Isto é o que faz o `syncDown`
do motor offline (lote 3a) funcionar** — a sincronização incremental filtra por
`updated_at >= since`, e sem este trigger, mudar uma resposta de checklist não faria a
fiscalização pai ser considerada "modificada", e outro dispositivo nunca puxaria essa
mudança. **Se o Django não reproduzir este comportamento — via `signals` do Django ou lógica
equivalente no service layer — a sincronização incremental quebra silenciosamente**, sem
erro nenhum, só com dado desatualizado nunca chegando a outros dispositivos.

### `set_fiscalizacao_cache_fields()` — denormalização automática, possivelmente redundante com o cliente

**Fonte**: `supabase/migrations/100_audit_system.sql`.

Preenche `municipio_nome`, `prestador_servico_nome` e `fiscal_nome` a partir das tabelas
relacionadas, automaticamente, antes de inserir/atualizar uma fiscalização. **O código
cliente também tenta fazer isso manualmente** — `Repository.createFiscalizacao` em
`repository.ts` já busca `municipio.nome`/`prestador.nome` e preenche o payload, e `syncDown`
faz um backfill adicional de `municipio_nome` quando ausente. **Há duas fontes preenchendo o
mesmo campo, uma no cliente e outra no banco** — hoje isso não causa problema porque os dois
concordam, mas é redundância que a fase 2 deveria resolver conscientemente: decidir se a
denormalização vive só no Django (mais correto) e o cliente para de tentar preenchê-la.

### `enforce_profile_security()` — ⚠️ controle de segurança real, não é só RLS

**Fonte**: `supabase/migrations/103_multi_diretoria.sql` (versão final).

Este trigger é uma salvaguarda **ativa** contra escalonamento de privilégio, independente
das RLS policies:

- Ao **inserir** um perfil nome: se quem está criando **não é admin**, e o novo perfil tenta
  se cadastrar como `admin` ou `coordenador`, o trigger **força silenciosamente** o valor
  para `fiscal`. Se o novo perfil tenta nascer já `ativo = true`, o trigger força para
  `false`, a menos que quem execute seja admin.
- (A leitura não cobriu a cláusula de UPDATE por completo, mas o padrão indica proteção
  equivalente para edição de perfil existente.)

**Por que isto é crítico para o Princípio III da constituição (Autorização Verificável)**:
se a reimplementação em Django só copiar as regras de RLS/permissão de leitura e visibilidade
por câmara técnica, mas não replicar **esta** trava específica, um usuário comum que
descubra (ou simplesmente tente) enviar `{"role": "admin", "ativo": true}` no cadastro
poderia se auto-promover — não porque o Django "esqueceu de proteger", mas porque essa
proteção específica nunca esteve nas RLS, só neste trigger. **Isto precisa entrar
explicitamente na suíte de testes de autorização exigida por FR-010** como um caso de teste
nomeado: "usuário não-admin não consegue se cadastrar como admin nem se autoativar."

### Outros triggers identificados, não lidos em profundidade (ver Ação Pendente)

- `trg_camara_autos`, `trg_camara_fiscalizacoes`, `trg_camara_remessas` — pelo nome,
  provavelmente preenchem `camara_tecnica_id` automaticamente a partir de contexto
  relacionado (usuário ou diretoria). Precisam de leitura antes da fase 2, porque tocam
  diretamente a fronteira de isolamento entre câmaras técnicas — a fronteira de segurança
  mais importante do sistema (163 RLS policies existem para reforçá-la).
- `trg_audit_*` (6 triggers) — todos chamam `process_audit_log()`, a função por trás de
  `audit_logs` (achado do lote 5 do inventário de acoplamento). Não lida em profundidade;
  precisa ser lida antes de desenhar o equivalente de auditoria no Django.
- `sync_dates_itens_checklist`, `on_auth_user_created`, `on_profile_approved`,
  `trg_termos_notificacao_set_ano_geracao` — não lidos; nomes sugerem lógica de negócio
  pontual (sincronização de datas, criação automática de perfil no signup, aprovação de
  perfil, ano de geração do termo).
- `is_caters_user()` (usada por `caters_import_from_fiscalizacao`) — função de autorização
  não lida; provavelmente checa papel/vínculo com a câmara CATERS.

**⚠️ AÇÃO PENDENTE explícita**: os triggers e funções desta seção não foram lidos com o
mesmo rigor que as RPCs principais (1-7), por priorização de tempo. Antes do `/speckit-plan`
da fase 2 (integração com o SISREG e reimplementação em Django), **cada um destes precisa
ser lido na íntegra**, com o mesmo método usado aqui — a fonte real, não suposição.

---

## O que isto muda no plano geral

1. **A migração de dados e comportamento não pode ser feita só olhando o código cliente.**
   Uma parcela real e crítica do sistema (`gerar_ncs_unidade`, os triggers de propagação e
   de segurança) só existe em SQL, no banco, e não aparece em nenhuma leitura de `src/`.
   Qualquer "levantamento de acoplamento" que não incluísse as migrations teria perdido
   isto inteiramente.
2. **`gerar_ncs_unidade` é o maior risco técnico de toda a migração** — mais que qualquer
   arquivo TypeScript já lido. Merece tratamento como projeto à parte dentro da fase de
   reimplementação: leitura linha a linha, teste de paridade dedicado, e uma decisão de
   produto sobre se a duplicação de lógica cliente/servidor continua existindo no Django ou
   é eliminada.
3. **A numeração sequencial (TN, AM, auto de infração) não é atômica em nenhum dos três
   casos hoje**, ao contrário do que o inventário de acoplamento havia presumido. É uma
   correção candidata explícita, não uma preservação automática.
4. **Existe pelo menos um controle de segurança (`enforce_profile_security`) que não é RLS**
   e precisa de tradução deliberada — do contrário, a fase 2 pode introduzir uma
   vulnerabilidade de escalonamento de privilégio que não existe hoje, por simplesmente não
   saber que ela precisa ser replicada.
5. **Os triggers de propagação (`propagate_modification_to_parent`) são pré-requisito
   silencioso do sync incremental** — sem equivalente no Django, o offline para de
   sincronizar corretamente sem erro visível algum.
