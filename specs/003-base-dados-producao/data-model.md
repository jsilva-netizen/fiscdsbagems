# Data Model: Base de dados do sistema atual

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

Entidades do catálogo, não do banco descrito. Nenhuma delas vira tabela: vivem como arquivos
(inventários CSV/TSV, anotações TOML, documentos Markdown gerados).

## Inventário

Retrato de um banco numa data.

| Campo | Descrição |
|---|---|
| origem | `producao` ou `migrations` |
| data | data e hora de geração (seção `metadados`) |
| arquivos | parte 1 (29 seções) e parte 2 (11 seções) |
| seções | cada seção: nome, total declarado, conteúdo (lista ou objeto JSON) |

**Validação** (o gerador recusa o inventário se falhar):
- todas as seções esperadas estão presentes;
- em cada seção de lista, o total declarado é igual ao número de itens (prova de que não houve
  truncamento);
- o JSON de cada seção abre. A exceção é uma seção de mensagem de texto, como "pg_cron não
  instalado", aceita como seção vazia.

## Objeto do banco

| Campo | Descrição |
|---|---|
| chave | identidade estável (abaixo) |
| tipo | tabela, view, coluna, restrição, índice, função, gatilho, política, tipo, bucket, papel, privilégio, privilégio padrão, segredo, event trigger |
| atributos | tudo o que o inventário traz sobre ele (gerado) |
| anotação | finalidade/significado, fonte, módulo dono ou classificação fora do escopo (manual) |
| contagem | linhas (tabela) ou arquivos (bucket), quando houver |

### Chave do objeto

| Tipo | Formato | Exemplo |
|---|---|---|
| tabela, view | `tabela:<nome>` | `tabela:unidades_fiscalizadas` |
| coluna | `coluna:<tabela>.<coluna>` | `coluna:unidades_fiscalizadas.status` |
| restrição | `restricao:<tabela>.<nome>` | `restricao:unidades_fiscalizadas.unidades_fiscalizadas_pkey` |
| índice | `indice:<nome>` | `indice:idx_unidades_fiscalizacao` |
| função | `funcao:<nome>(<argumentos>)` | `funcao:obter_resumo_indicadores(p_anos text[], ...)` |
| gatilho | `gatilho:<esquema>.<tabela>.<nome>` | `gatilho:auth.users.on_auth_user_created` |
| política | `politica:<esquema>.<tabela>.<nome>` | `politica:storage.objects.<nome>` |
| tipo | `tipo:<nome>` | `tipo:caters_process_status` |
| bucket | `bucket:<id>` | `bucket:fotos_fiscalizacao` |
| papel | `papel:<nome>` | `papel:authenticated` |
| privilégio | `privilegio:<tabela ou função>.<papel>` | `privilegio:profiles.anon` |
| segredo | `segredo:<nome>` | `segredo:RELATORIOS_WORKER_SECRET` |
| privilégio padrão | `privilegio_padrao:<dono>.<esquema>.<tipo_objeto>` | `privilegio_padrao:postgres.public.tabela` |
| privilégio de coluna | `privilegio_coluna:<tabela>.<coluna>.<papel>` | (nenhum em produção) |
| event trigger | `evento:<nome>` | `evento:pgrst_ddl_watch` |
| extensão | `extensao:<nome>` | `extensao:pg_net` |
| sequência, publicação, agendamento | `sequencia:<nome>`, `publicacao:<pub>.<tabela>`, `agendamento:<nome>` | (nenhum em produção) |

**Regras**:
- chave é única no inventário, e o gerador falha se houver colisão;
- a função tem os argumentos completos na chave, porque há sobrecarga;
- nomes com caractere corrompido entram na chave como estão (são objetos distintos e viram achado).

### Classificação fora do escopo

Um objeto sem módulo dono tem uma destas classificações, sempre com motivo:
- `plataforma` — mantido pelo provedor atual, sem equivalente no sistema novo (ex.: event triggers
  `pgrst_ddl_watch`, papéis `supabase_*`).
- `descartar` — resíduo que não vai para o sistema novo (ex.: políticas `e2e_test_*`), sempre
  ligado a um achado com decisão.

## Dependência

| Campo | Descrição |
|---|---|
| de | chave do objeto dependente |
| para | chave do objeto de que depende |
| natureza | `referencia` (FK), `dispara` (gatilho → função), `usa` (política → função), `le` / `escreve` (função → tabela), `chama` (função → função), `consulta` (view → tabela) |
| origem | `catalogo` (registrado pelo banco) ou `codigo` (lido do texto) |

Derivada; nunca anotada à mão. A tabela de extração está em [research.md D4](./research.md#d4--de-onde-sai-cada-dependência).

## Divergência

| Campo | Descrição |
|---|---|
| chave | do objeto |
| tipo | `so_producao`, `so_migrations`, `codigo_diferente`, `estrutura_diferente` |
| detalhe | atributos que diferem; para código, o resumo da mudança (FR-011) |
| classificação | `producao_vale`, `residuo_descartar`, `defeito_corrigir`, `aguardando_decisao` (anotação) |
| justificativa | texto (anotação) |

**Regra**: divergência sem anotação é publicada como `nao_classificada` (conta contra SC-003).

## Módulo

| Campo | Descrição |
|---|---|
| id | `core`, `fiscalizacao`, `checklists`, `dtr`, `processo_sancionador`, `caters`, `catesa`, `portal_prestador`, `tramitacao` |
| nome | nome de exibição |
| ordem | posição na ordem de especificação |
| app | app da constituição v2.1.0 correspondente |
| objetos | chaves dos objetos de que é dono (derivado das anotações) |
| spec | caminho da spec de módulo quando existir (ou vazio → objetos em lacuna) |
| observação | ex.: "sem tabela própria no banco atual" |

**Regras**:
- cada objeto tem exatamente um dono ou uma classificação fora do escopo;
- nenhuma dependência de um objeto aponta para objeto de módulo com ordem maior, salvo exceção
  anotada com justificativa (SC-008).

## Achado

| Campo | Descrição |
|---|---|
| id | `A-NNN` |
| título | uma linha |
| evidência | chaves dos objetos envolvidos e números do inventário |
| risco | o que acontece se for herdado sem decisão |
| opções | alternativas |
| recomendação | a opção sugerida, com motivo |
| situação | `aguardando_decisao` ou `decidido` |
| decisão | texto, quem decidiu e data (vazio enquanto aguarda) |

**Transições**: `aguardando_decisao` → `decidido`, somente pelo responsável pelo projeto
(FR-017). Não há volta; mudar uma decisão é novo registro no mesmo achado, com data.

## Formato de spec de módulo / jornada

Moldes em Markdown (`formatos/`), sem estado. Estrutura em [research.md D10](./research.md#d10--formatos-das-specs-seguintes).
