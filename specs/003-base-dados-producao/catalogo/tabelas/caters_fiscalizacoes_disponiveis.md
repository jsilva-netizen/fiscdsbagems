<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# caters_fiscalizacoes_disponiveis

- **Tipo**: view
- **Dono**: módulo **caters**
- **Opções**: `security_invoker=true`

## Finalidade

View com as fiscalizações finalizadas da câmara CATERS, que podem ser ligadas a um processo
CATERS. A tela a usa na lista "vincular fiscalização".

**Acesso:** desde a migration 140, a view usa as permissões de quem consulta (`security_invoker`),
e só `authenticated` tem leitura. Vale, portanto, a política de `fiscalizacoes`: usuário ativo com
acesso à câmara CATERS, ou admin.

Até a 140, a view rodava com as permissões do dono (`postgres`) e dava leitura a `anon`: qualquer
pessoa, sem login, listava essas fiscalizações. *(fonte: src/lib/caters/processes.js:109, supabase/migrations/140_fix_view_caters_security_invoker.sql, .specify/bugs/view-caters-sem-login/assessment.md)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid |  |  | Id da fiscalização. *(fonte: tabela:fiscalizacoes)* |  |
| 2 | `municipio_nome` | text |  |  | Nome do município fiscalizado (cópia em `fiscalizacoes`). *(fonte: coluna:fiscalizacoes.municipio_nome)* |  |
| 3 | `prestador_servico_nome` | text |  |  | Nome da entidade fiscalizada (cópia em `fiscalizacoes`). *(fonte: coluna:fiscalizacoes.prestador_servico_nome)* |  |
| 4 | `servicos` | text[] |  |  | Serviços fiscalizados. *(fonte: coluna:fiscalizacoes.servicos)* |  |
| 5 | `status` | text |  |  | Sempre `finalizada` (filtro da view). *(fonte: coluna:fiscalizacoes.status)* |  |
| 6 | `data_inicio` | timestamp with time zone |  |  | Início da fiscalização. *(fonte: coluna:fiscalizacoes.data_inicio)* |  |
| 7 | `data_fim` | timestamp with time zone |  |  | Fim da fiscalização; a lista é ordenada por ela (mais recentes primeiro). *(fonte: src/lib/caters/processes.js:112)* |  |
| 8 | `numero_termo` | text |  |  | Número do termo de fiscalização. *(fonte: coluna:fiscalizacoes.numero_termo)* |  |
| 9 | `camara_tecnica_id` | text |  |  | Sempre `caters` (filtro da view). *(fonte: coluna:fiscalizacoes.camara_tecnica_id)* |  |

## Restrições e índices

_Nenhuma._

## Dependências

**Depende de:**

- [fiscalizacoes](../tabelas/fiscalizacoes.md) — consulta (catalogo)

**É usada por:**

- _nada_

## Gatilhos

_Nenhum._

## Políticas de acesso

_Nenhuma._

## Divergências e achados

- Achado **A-004** — View caters_fiscalizacoes_disponiveis sem security_invoker (situação: decidido; [detalhes](../../achados.md#a-004)).
