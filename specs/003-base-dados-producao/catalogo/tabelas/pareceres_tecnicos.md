<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# pareceres_tecnicos

- **Tipo**: tabela
- **Dono**: módulo **processo_sancionador**
- **Linhas em produção**: 0
- **RLS ativo**: sim

## Finalidade

Parecer técnico sobre a defesa de cada auto de infração. A equipe o escreve na tela Pareceres
Técnicos, finaliza, anexa a versão assinada e encaminha junto com a remessa. **Vazia em
produção.** *(fonte: src/pages/PareceresTecnicos.jsx:119, src/lib/offline/repository.ts:1548, src/pages/GestaoAutos.jsx:251, inventário: tabelas)*

## Colunas

| # | Coluna | Tipo | Obrig. | Padrão | Significado | Valores em uso / estrutura |
|---:|---|---|:---:|---|---|---|
| 1 | `id` | uuid | sim | `uuid_generate_v4()` | Identificador do parecer. *(fonte: src/lib/offline/repository.ts:1548)* |  |
| 2 | `auto_id` | uuid |  |  | Auto de infração analisado; excluir o auto exclui o parecer. *(fonte: src/lib/offline/repository.ts:1566, restricao:pareceres_tecnicos.pareceres_tecnicos_auto_id_fkey)* |  |
| 3 | `recomendacao` | text |  |  | Conclusão do parecer: o que se recomenda decidir sobre o auto. ⚠️ *hipótese* |  |
| 4 | `valor_multa_sugerido` | numeric(10,2) |  |  | Valor de multa sugerido pelo parecer. ⚠️ *hipótese* |  |
| 5 | `analise_tecnica` | text |  |  | Texto da análise técnica da defesa. ⚠️ *hipótese* |  |
| 6 | `status` | text |  | `'pendente'::text` | `rascunho` enquanto é escrito, `finalizado` ao concluir e `parecer_enviado` ao encaminhar; o<br>padrão da coluna é `pendente`. *(fonte: src/pages/PareceresTecnicos.jsx:119, src/pages/PareceresTecnicos.jsx:145, src/pages/PareceresTecnicos.jsx:177)* |  |
| 7 | `created_at` | timestamp with time zone |  | `now()` | Quando o parecer foi criado. *(fonte: src/lib/offline/repository.ts:1548)* |  |
| 8 | `arquivo_parecer_assinado_url` | text |  |  | Parecer assinado, anexado na Gestão de Autos. O parecer só conta como pronto quando tem este<br>arquivo. *(fonte: src/pages/GestaoAutos.jsx:251, src/pages/GestaoAutos.jsx:274)* |  |

## Restrições e índices

| Restrição | Tipo | Definição |
|---|---|---|
| `pareceres_tecnicos_auto_id_fkey` | chave_estrangeira | `FOREIGN KEY (auto_id) REFERENCES autos_infracao(id) ON DELETE CASCADE` |
| `pareceres_tecnicos_pkey` | chave_primaria | `PRIMARY KEY (id)` |

| Índice | Definição |
|---|---|
| `pareceres_tecnicos_pkey` | `CREATE UNIQUE INDEX pareceres_tecnicos_pkey ON public.pareceres_tecnicos USING btree (id)` |

## Dependências

**Depende de:**

- [autos_infracao](../tabelas/autos_infracao.md) — referencia (catalogo)

**É usada por:**

- [julgamentos](../tabelas/julgamentos.md) — referencia (catalogo)

## Gatilhos

_Nenhum._

## Políticas de acesso

### Fiscais e Admins: acesso por camara em pareceres

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Admin total; coordenador e fiscal ativos, pelos pareceres de autos da sua câmara. Sem efeito
prático: `pareceres_staff_all` libera a equipe toda. *(fonte: funcao:get_my_role(), funcao:get_my_camara_tecnica())*
- **Funções auxiliares**: [can_access_camara(row_camara text)](../funcoes/can_access_camara.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM autos_infracao ai
  WHERE ((ai.id = pareceres_tecnicos.auto_id) AND can_access_camara(ai.camara_tecnica_id))))))

WITH CHECK:
((get_my_role() = 'admin'::text) OR ((get_my_role() = ANY (ARRAY['coordenador'::text, 'fiscal'::text])) AND (EXISTS ( SELECT 1
   FROM autos_infracao ai
  WHERE ((ai.id = pareceres_tecnicos.auto_id) AND can_access_camara(ai.camara_tecnica_id))))))
```

</details>

### Prestadores: ler pareceres de seus autos

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: O prestador ativo lê os pareceres dos autos da própria entidade. *(fonte: funcao:get_my_prestador_id())*
- **Funções auxiliares**: [get_my_prestador_id()](../funcoes/get_my_prestador_id.md), [get_my_role()](../funcoes/get_my_role.md)

<details><summary>Condição original</summary>

```sql
USING:
((get_my_role() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = pareceres_tecnicos.auto_id) AND (a.prestador_servico_id = get_my_prestador_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### pareceres_prestador_select

- **Papéis**: authenticated · **Operação**: SELECT · **PERMISSIVE**
- **Em linguagem simples**: Mesma leitura pelo prestador, de outro conjunto de políticas; redundante. *(fonte: funcao:current_prestador_servico_id())*
- **Funções auxiliares**: [current_prestador_servico_id()](../funcoes/current_prestador_servico_id.md)

<details><summary>Condição original</summary>

```sql
USING:
(("current_role"() = 'prestador'::text) AND (EXISTS ( SELECT 1
   FROM autos_infracao a
  WHERE ((a.id = pareceres_tecnicos.auto_id) AND (a.prestador_servico_id = current_prestador_servico_id())))))

WITH CHECK:
(nenhuma)
```

</details>

### pareceres_staff_all

- **Papéis**: authenticated · **Operação**: ALL · **PERMISSIVE**
- **Em linguagem simples**: Acesso total para admin, fiscal e coordenador ativos (`is_staff`), sem olhar a câmara. *(fonte: funcao:is_staff())*
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

- Divergência `politica:public.pareceres_tecnicos.pareceres_prestador_select`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
- Divergência `politica:public.pareceres_tecnicos.pareceres_staff_all`: **so_producao**, classificação **nao_classificada** ([detalhes](../../divergencias.md)).
