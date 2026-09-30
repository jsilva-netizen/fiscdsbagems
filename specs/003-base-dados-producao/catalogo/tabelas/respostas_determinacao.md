<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# respostas_determinacao

- **Tipo**: tabela
- **Dono**: módulo **processo_sancionador**
- **Linhas em produção**: 34
- **RLS ativo**: sim

## Finalidade

Resposta da entidade a cada determinação do termo de notificação: manifestação escrita e
evidências anexadas pelo prestador no portal, depois a análise da equipe (atendida ou não
atendida). As determinações não atendidas viram autos de infração na Análise da Manifestação.

Desde a migration 139, quando quem grava é o prestador, o gatilho
`trg_proteger_resposta_determinacao_prestador` controla a gravação:

- só aceita rascunho ou envio;
- recusa alterar resposta já analisada;
- preserva a análise da equipe;
- tira os vínculos da determinação;
- calcula a data e a pontualidade no servidor.

Produção tem 34 respostas: 33 aguardando análise e 1 não atendida. As manifestações têm textos de
teste ("a", "aa", "aaa"), ou seja, **há dados de teste em produção**. *(fonte: src/pages/ResponderTermo.jsx:255, src/pages/AnalisarResposta.jsx:181, src/pages/AnaliseManifestacao.jsx:268, supabase/migrations/139_fix_prestador_prazos.sql, inventário: dominio_categorico)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador da resposta. *(fonte: src/lib/offline/repository.ts:1466)* |  |
| 2 | `determinacao_id` | uuid |  |  | Determinação respondida; o portal mantém uma resposta por determinação (atualiza se já existe).<br>Excluir a determinação exclui a resposta. *(fonte: src/pages/ResponderTermo.jsx:256, restricao:respostas_determinacao.respostas_determinacao_determinacao_id_fkey)* |  |
| 3 | `unidade_fiscalizada_id` | uuid |  |  | Unidade da determinação, copiada pelo portal. A chave estrangeira não tem regra de exclusão, então<br>não é possível excluir uma unidade com resposta. *(fonte: src/pages/ResponderTermo.jsx:263, restricao:respostas_determinacao.respostas_determinacao_unidade_fiscalizada_id_fkey)* |  |
| 4 | `fiscalizacao_id` | uuid |  |  | Fiscalização do termo, copiada pelo portal. É usada por `can_access_fiscalizacao` nas políticas do<br>prestador. *(fonte: src/pages/ResponderTermo.jsx:264, funcao:can_access_fiscalizacao(fiscalizacao uuid))* |  |
| 5 | `prestador_servico_id` | uuid |  |  | Entidade que respondeu, copiada do termo. Limita o que o prestador vê e altera. *(fonte: src/pages/ResponderTermo.jsx:265)* |  |
| 6 | `resposta` | text |  |  | Sem uso: nenhuma tela grava; a manifestação fica em `manifestacao_prestador`. ⚠️ *hipótese* |  |
| 7 | `status` | text |  |  | Situação da resposta:<br>- `rascunho`: o prestador salvou sem enviar;<br>- `aguardando_analise`: o prestador enviou;<br>- `atendida` ou `nao_atendida`: definido pela equipe na análise.<br>Não é validado pelo banco. Desde a migration 139, o prestador só grava `rascunho` ou<br>`aguardando_analise` e não altera resposta analisada. *(fonte: src/pages/ResponderTermo.jsx:268, src/pages/AnalisarResposta.jsx:891, supabase/migrations/139_fix_prestador_prazos.sql, inventário: dominio_categorico)* | `aguardando_analise` (33), `nao_atendida` (1) |
| 8 | `manifestacao_prestador` | text |  |  | Texto da manifestação da entidade sobre a determinação. Vai para a Análise da Manifestação. *(fonte: src/pages/ResponderTermo.jsx:266, src/pages/AnaliseManifestacao.jsx:377)* | `a` (14), `aa` (13), `aaa` (6), `aaaaaaaaa` (1) |
| 9 | `descricao_atendimento` | text |  |  | Análise da equipe sobre a resposta (por que foi ou não atendida). O prestador não a altera<br>(migration 139). *(fonte: src/pages/AnalisarResposta.jsx:183, src/pages/AnaliseManifestacao.jsx:378, supabase/migrations/139_fix_prestador_prazos.sql)* |  |
| 10 | `dentro_prazo` | boolean |  |  | Se a resposta foi enviada até a data-limite do termo, inclusive o último dia. Desde a migration<br>139, o servidor calcula no envio com a data de MS. Antes, o aparelho do prestador calculava<br>comparando com a meia-noite UTC. As 34 de produção estão `true`. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, src/pages/ResponderTermo.jsx:258, inventário: dominio_categorico)* | `true` (34) |
| 11 | `tipo_resposta` | text |  |  | Sem uso: nenhuma tela lê ou grava. ⚠️ *hipótese* |  |
| 12 | `data_resposta` | timestamp with time zone |  | `now()` | Quando a resposta foi enviada, pela hora do servidor (migration 139). É a base dos tempos médios<br>de resposta. *(fonte: supabase/migrations/139_fix_prestador_prazos.sql, src/components/determinacoes/AnaliseTemposMedios.jsx:12)* |  |
| 13 | `created_at` | timestamp with time zone |  | `now()` | Quando a resposta foi criada. *(fonte: src/lib/offline/repository.ts:1466)* |  |
| 14 | `evidencias` | jsonb |  | `'[]'::jsonb` | Evidências anexadas pela entidade (lista de arquivos no bucket `evidencias-determinacoes`, com<br>nome, tipo, tamanho, data, caminho e endereço). O portal remove duplicadas antes de gravar. *(fonte: src/lib/offline/repository.ts:1616, src/pages/ResponderTermo.jsx:260)* | JSON — formas: array (34) |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `respostas_determinacao_determinacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (determinacao_id) REFERENCES determinacoes(id) ON DELETE CASCADE` |
| `respostas_determinacao_fiscalizacao_id_fkey` | chave_estrangeira | `FOREIGN KEY (fiscalizacao_id) REFERENCES fiscalizacoes(id)` |
| `respostas_determinacao_pkey` | chave_primaria | `PRIMARY KEY (id)` |
| `respostas_determinacao_prestador_servico_id_fkey` | chave_estrangeira | `FOREIGN KEY (prestador_servico_id) REFERENCES prestadores_servico(id)` |
| `respostas_determinacao_unidade_fiscalizada_id_fkey` | chave_estrangeira | `FOREIGN KEY (unidade_fiscalizada_id) REFERENCES unidades_fiscalizadas(id)` |

| Índice | Definição |
|---|---|
| `respostas_determinacao_pkey` | `CREATE UNIQUE INDEX respostas_determinacao_pkey ON public.respostas_determinacao USING btree (id)` |

## Dependências

**Depende de:**

- [determinacoes](../tabelas/determinacoes.md) — referencia (catalogo)
- [fiscalizacoes](../tabelas/fiscalizacoes.md) — referencia (catalogo)
- [prestadores_servico](../tabelas/prestadores_servico.md) — referencia (catalogo)
- [unidades_fiscalizadas](../tabelas/unidades_fiscalizadas.md) — referencia (catalogo)

**É usada por:**

- _nada_

## Gatilhos

| Gatilho | Situação | Função | Efeito |
|---|---|---|---|
| `trg_proteger_resposta_determinacao_prestador` | ativo | [proteger_resposta_determinacao_prestador()](../funcoes/proteger_resposta_determinacao_prestador.md) | Antes de cada inclusão ou alteração de resposta, aplica `proteger_resposta_determinacao_prestador` (só age para o prestador). *(fonte: funcao:proteger_resposta_determinacao_prestador())* |

<details><summary>Definição de trg_proteger_resposta_determinacao_prestador</summary>

```sql
CREATE TRIGGER trg_proteger_resposta_determinacao_prestador BEFORE INSERT OR UPDATE ON respostas_determinacao FOR EACH ROW EXECUTE FUNCTION proteger_resposta_determinacao_prestador()
```

</details>

## Políticas de acesso

### Fiscais e Admins: acesso total em respostas determinacoes

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin, coordenador e fiscal ativos têm acesso total, sem olhar a câmara. *(fonte: funcao:get_my_role())*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))

WITH CHECK:
(get_my_role() = ANY (ARRAY['admin'::text, 'coordenador'::text, 'fiscal'::text]))
```

</details>

### Prestadores: ler suas próprias respostas determinacoes

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê as respostas da própria entidade. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (prestador_servico_id = get_my_prestador_id()))

WITH CHECK:
(nenhuma)
```

</details>

### respostas_det_prestador_insert

- **Papéis**: authenticated · **Operação**: INSERT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo cria respostas da própria entidade para fiscalizações com termo dirigido a ele,
só como rascunho ou envio. Desde a migration 139 é a única política de inclusão do prestador. *(fonte: funcao:can_access_fiscalizacao(fiscalizacao uuid), supabase/migrations/139_fix_prestador_prazos.sql)*
- **Funções auxiliares**: [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md), [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(nenhuma)

WITH CHECK:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id) AND (status = ANY (ARRAY['rascunho'::text, 'aguardando_analise'::text])))
```

</details>

### respostas_det_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Leitura pelo prestador exigindo também termo para a fiscalização. Sem efeito próprio: a política
"Prestadores: ler suas próprias respostas determinacoes" não exige termo. *(fonte: funcao:can_access_fiscalizacao(fiscalizacao uuid))*
- **Funções auxiliares**: [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md), [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id))

WITH CHECK:
(nenhuma)
```

</details>

### respostas_det_prestador_update

- **Papéis**: authenticated · **Operação**: UPDATE · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo altera as respostas da própria entidade com termo, mantendo rascunho ou envio.
Desde a migration 139 é a única política de alteração do prestador; o gatilho recusa alterar
resposta já analisada. *(fonte: funcao:can_access_fiscalizacao(fiscalizacao uuid), supabase/migrations/139_fix_prestador_prazos.sql)*
- **Funções auxiliares**: [can_access_fiscalizacao(fiscalizacao uuid)](../funcoes/can_access_fiscalizacao.md), [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id))

WITH CHECK:
(("current_role"() = 'prestador'::text) AND (prestador_servico_id = current_prestador_servico_id()) AND can_access_fiscalizacao(fiscalizacao_id) AND (status = ANY (ARRAY['rascunho'::text, 'aguardando_analise'::text])))
```

</details>

### respostas_det_staff_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Acesso total para admin, fiscal e coordenador ativos (`is_staff`); redundante. *(fonte: funcao:is_staff())*
- **Funções auxiliares**: [is_staff()](../funcoes/is_staff.md)

<details><summary>Condição original</summary>

```sql
USING:
is_staff()

WITH CHECK:
is_staff()
```

</details>

## Divergências e achados

- Divergência `politica:public.respostas_determinacao.respostas_det_prestador_insert`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.respostas_determinacao.respostas_det_prestador_select`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.respostas_determinacao.respostas_det_prestador_update`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.respostas_determinacao.respostas_det_staff_all`: **so_producao**, classificação **producao_vale** ([detalhes](../../divergencias.md)).
- Achado **A-002** — Dados de teste em produção (situação: aguardando_decisao; [detalhes](../../achados.md#a-002)).
- Achado **A-036** — IA da CATESA: botão em qualquer câmara, workers sem verificação e veredito que marca "no prazo"
 (situação: aguardando_decisao; [detalhes](../../achados.md#a-036)).
