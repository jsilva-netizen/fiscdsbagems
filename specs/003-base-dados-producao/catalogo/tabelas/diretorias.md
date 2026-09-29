<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# diretorias

- **Tipo**: tabela
- **Dono**: módulo **core**
- **Linhas em produção**: 3
- **RLS ativo**: sim

## Finalidade

As 3 diretorias da AGEMS: `dsb` (saneamento básico e resíduos sólidos), `dtr` (transportes,
rodovias, ferrovias, portos e aeroportos) e `dge` (gás canalizado, energia e mineração). Cada
câmara técnica pertence a uma diretoria, e cada usuário tem uma.

Dado de referência sem tela de manutenção: a interface também repete a lista no código. *(fonte: inventário: dados_referencia.diretorias, src/pages/GerenciarUsuarios.jsx:51, src/hooks/useModulo.js:57)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | text | sim |  | Sigla da diretoria em minúsculas (`dsb`, `dtr`, `dge`). Usada como chave em<br>`camaras_tecnicas.diretoria_id` e `profiles.diretoria_id`, e fixa no código da interface. *(fonte: restricao:camaras_tecnicas.camaras_tecnicas_diretoria_id_fkey, restricao:profiles.profiles_diretoria_id_fkey)* |  |
| 2 | `nome` | text | sim |  | Nome oficial da diretoria, mostrado na tela de usuários. *(fonte: src/pages/GerenciarUsuarios.jsx:51)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `diretorias_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `diretorias_pkey` | `CREATE UNIQUE INDEX diretorias_pkey ON public.diretorias USING btree (id)` |

## Dependências

**Depende de:**

- _nada_

**É usada por:**

- [camaras_tecnicas](../tabelas/camaras_tecnicas.md) — referencia (catalogo)
- [profiles](../tabelas/profiles.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Diretorias visíveis para todos autenticados

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Qualquer logado lê as diretorias, inclusive conta não aprovada. É dado público de referência. *(fonte: src/pages/GerenciarUsuarios.jsx:51)*

<details><summary>Condição original</summary>

```sql
USING:
true

WITH CHECK:
(nenhuma)
```

</details>

## Divergências e achados

_Nenhuma divergência entre produção e migrations, nenhum achado._
