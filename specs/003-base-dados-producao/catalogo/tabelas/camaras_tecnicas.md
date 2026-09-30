<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# camaras_tecnicas

- **Tipo**: tabela
- **Dono**: módulo **core**
- **Linhas em produção**: 12
- **RLS ativo**: sim

## Finalidade

As câmaras técnicas de cada diretoria. Produção tem 12:

- DSB: CATESA, CATERS e CRES;
- DTR: CATRANSP, CATERF, CATEFIS, CRET e CATERM (terminais rodoviários);
- DGE: CATEGAS, CATENE, CREG e CATESG (serviços de gás).

`caterm` e `catesg` existem só no banco: a lista da interface (`CAMARAS_POR_DIRETORIA`), o
mapa de dashboards (`CAMARA_DASHBOARD_PAGE`) e a tela de cadastro têm só as outras 10, então
nenhum usuário consegue escolhê-las.

A câmara organiza o acesso (usuário e registros têm câmara, e `can_access_camara` compara as
duas) e a navegação (cada câmara tem seu dashboard). *(fonte: inventário: dados_referencia.camaras_tecnicas, src/hooks/useModulo.js:64, src/lib/camaras.js:5, src/pages/Register.jsx:8, funcao:can_access_camara(row_camara text))*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | text | sim |  | Sigla da câmara em minúsculas (ex.: `caters`). É o valor gravado em `camara_tecnica_id` nos<br>perfis e nos registros (fiscalizações, autos, remessas…) e fixo no código da interface. *(fonte: restricao:profiles.profiles_camara_tecnica_id_fkey, src/lib/camaras.js:5)* |  |
| 2 | `diretoria_id` | text | sim |  | Diretoria a que a câmara pertence. Não pode ser apagada enquanto tiver câmara (`ON DELETE<br>RESTRICT`). *(fonte: restricao:camaras_tecnicas.camaras_tecnicas_diretoria_id_fkey)* |  |
| 3 | `nome` | text | sim |  | Nome da câmara, mostrado na tela de usuários. *(fonte: src/pages/GerenciarUsuarios.jsx:63)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `camaras_tecnicas_diretoria_id_fkey` | chave_estrangeira | `FOREIGN KEY (diretoria_id) REFERENCES diretorias(id) ON DELETE RESTRICT` |
| `camaras_tecnicas_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `camaras_tecnicas_pkey` | `CREATE UNIQUE INDEX camaras_tecnicas_pkey ON public.camaras_tecnicas USING btree (id)` |

## Dependências

**Depende de:**

- [diretorias](../tabelas/diretorias.md) — referencia (catalogo)

**É usada por:**

- [profiles](../tabelas/profiles.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Admins gerenciam câmaras técnicas

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin ativo lê, cria, altera e exclui câmaras. Não há tela para isso. *(fonte: funcao:get_my_role())*
- **Funções auxiliares**: [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
(get_my_role() = 'admin'::text)

WITH CHECK:
(nenhuma)
```

</details>

### Câmaras técnicas visíveis para todos autenticados

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Qualquer logado lê as câmaras, inclusive conta não aprovada. É dado público de referência. *(fonte: src/pages/GerenciarUsuarios.jsx:63)*

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

- Achado **A-010** — Câmaras caterm e catesg sem correspondência no código (situação: aguardando_decisao; [detalhes](../../achados.md#a-010)).
