<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Mapa de migração

Destino, no sistema novo, de cada coluna de tabela e de cada repositório de arquivos do banco de produção: o campo que recebe o dado (com a transformação, quando há) ou o motivo do descarte. Os mapas ficam em `anotacoes/migracao/<modulo>.toml`; destinos de apps com data-model são conferidos contra ele. Num módulo com mapa, o que não tem destino é **pendente**. Colunas de views não entram (não guardam dado).

Pendentes: 0 · módulos sem mapa: 4 · destinos não verificados: 33.

| Módulo | Mapa | Colunas e repositórios | Com destino | Descartados | Pendentes |
|---|---|---:|---:|---:|---:|
| Core | sim | 60 | 59 | 1 | 0 |
| Checklists | sim | 35 | 29 | 6 | 0 |
| Fiscalização | **sem mapa** | 114 | — | — | — |
| DTR | **sem mapa** | 21 | — | — | — |
| Processo sancionador | **sem mapa** | 120 | — | — | — |
| CATERS | **sem mapa** | 81 | — | — | — |
| fora do escopo | — | 25 | 0 | 25 | 0 |

## Core

Mapa: `anotacoes/migracao/core.toml` · data-model: `specs/004-modulo-core/data-model.md`

- Contas de autenticação (fora do catálogo; inventário, seção `autenticacao`): produção tem 8 contas e 7 perfis. O e-mail vem do perfil; a conta sem perfil é decidida na tabela de ajustes antes da carga (tarefa T086). Senhas não são migradas: cada usuário faz o primeiro acesso com código (R-core-005).
- Tabela de ajustes preenchida pelo responsável antes da carga (T086): câmara dos coordenadores e fiscais sem câmara, conta sem perfil e registros de teste do A-002.
- Serviços (`core.Servico`) e papéis (`core.Papel`) são carregados como referência, não migrados de uma coluna; os textos de `tipo_servico` e `role` são convertidos para eles.
- CATERM e CATESG (2 das 12 câmaras) não são migradas (A-010); nenhum registro as referencia.

| Objeto | Volume em produção | Destino | Transformação ou motivo do descarte |
|---|---|---|---|
| `bucket:documentos-prestadores` | 4 arquivos | `core.DocumentoEntidade.arquivo`<br>`caters.DocumentoProcesso.arquivo` | Arquivos em `<entidade>/...` viram documentos de entidade (nenhum em produção); os 4 em `caters/<processo>/...` vão para o app da CATERS, conferidos por checksum. |
| `bucket:logos-entidades` | 7 arquivos | `core.Entidade.logotipo` | Os 7 arquivos são copiados para o repositório público com chave nova (UUID), conferidos por checksum. |
| `coluna:audit_logs.action` | 19966 linhas | `core.RegistroAuditoria.operacao` | INSERT, UPDATE e DELETE viram inclusão, alteração e exclusão. |
| `coluna:audit_logs.created_at` | 19966 linhas | `core.RegistroAuditoria.criado_em` |  |
| `coluna:audit_logs.id` | 19966 linhas | `core.RegistroAuditoria.id` |  |
| `coluna:audit_logs.new_data` | 19966 linhas | `core.RegistroAuditoria.dados_depois` | Com `old_data`, também dá a câmara do registro auditado (campo `camara`), quando a tabela tem câmara. |
| `coluna:audit_logs.old_data` | 19966 linhas | `core.RegistroAuditoria.dados_antes` |  |
| `coluna:audit_logs.record_id` | 19966 linhas | `core.RegistroAuditoria.registro_id` |  |
| `coluna:audit_logs.table_name` | 19966 linhas | `core.RegistroAuditoria.tabela` | Nome da tabela atual, mantido como está (data-model). |
| `coluna:audit_logs.user_email` | 19966 linhas | `core.RegistroAuditoria.autor_email` |  |
| `coluna:audit_logs.user_id` | 19966 linhas | `core.RegistroAuditoria.autor`<br>`core.RegistroAuditoria.autor_nome` | Autor pelo id; o nome é o do perfil no momento da migração, porque o registro atual não o guarda. |
| `coluna:camaras_tecnicas.diretoria_id` | 12 linhas | `core.CamaraTecnica.diretoria` |  |
| `coluna:camaras_tecnicas.id` | 12 linhas | `core.CamaraTecnica.id` | Só as 10 câmaras em uso; `caterm` e `catesg` ficam de fora (A-010). |
| `coluna:camaras_tecnicas.nome` | 12 linhas | `core.CamaraTecnica.nome` |  |
| `coluna:contratos.ativo` | 2 linhas | `core.Contrato.vigente` |  |
| `coluna:contratos.created_at` | 2 linhas | `core.Contrato.criado_em` |  |
| `coluna:contratos.id` | 2 linhas | `core.Contrato.id` |  |
| `coluna:contratos.numero_contrato` | 2 linhas | `core.Contrato.numero` |  |
| `coluna:contratos.prestador_servico_id` | 2 linhas | `core.Contrato.entidade` |  |
| `coluna:contratos.updated_at` | 2 linhas | `core.Contrato.atualizado_em` |  |
| `coluna:diretorias.id` | 3 linhas | `core.Diretoria.id` |  |
| `coluna:diretorias.nome` | 3 linhas | `core.Diretoria.nome` |  |
| `coluna:municipios.codigo_ibge` | 79 linhas | `core.Municipio.codigo_ibge` |  |
| `coluna:municipios.created_at` | 79 linhas | `core.Municipio.criado_em`<br>`core.Municipio.atualizado_em` |  |
| `coluna:municipios.id` | 79 linhas | `core.Municipio.id` |  |
| `coluna:municipios.nome` | 79 linhas | `core.Municipio.nome` |  |
| `coluna:prestadores_servico.ativo` | 9 linhas | `core.Entidade.ativa` | Situação única: ativa se `ativo` for verdadeiro e `status` for 'ativa' (produção: as 9 nos dois); divergência vai para o relatório. |
| `coluna:prestadores_servico.cargo` | 9 linhas | `core.Entidade.cargo` |  |
| `coluna:prestadores_servico.cep` | 9 linhas | `core.Entidade.cep` |  |
| `coluna:prestadores_servico.cidade` | 9 linhas | `core.Entidade.cidade` |  |
| `coluna:prestadores_servico.cnpj` | 9 linhas | `core.Entidade.cnpj` | Só dígitos. CNPJ repetido ou com dígito verificador inválido é carregado e marcado como legado no relatório de conferência, para a equipe corrigir (não é recusado). |
| `coluna:prestadores_servico.created_at` | 9 linhas | `core.Entidade.criado_em` |  |
| `coluna:prestadores_servico.documentos` | 9 linhas | `core.DocumentoEntidade.nome`<br>`core.DocumentoEntidade.arquivo`<br>`core.DocumentoEntidade.enviado_em` | Cada item da lista vira um documento (R-core-018). Em produção as listas não têm documento de entidade. |
| `coluna:prestadores_servico.email_contato` | 9 linhas | `core.Entidade.email_contato` |  |
| `coluna:prestadores_servico.endereco` | 9 linhas | `core.Entidade.endereco` |  |
| `coluna:prestadores_servico.estado` | 9 linhas | `core.Entidade.estado` |  |
| `coluna:prestadores_servico.id` | 9 linhas | `core.Entidade.id` |  |
| `coluna:prestadores_servico.logo_url` | 9 linhas | `core.Entidade.logotipo` | Endereço do repositório `logos-entidades` vira a chave do arquivo copiado para o repositório público; imagem gravada como base64 é convertida em arquivo (A-008). |
| `coluna:prestadores_servico.nome` | 9 linhas | `core.Entidade.nome` |  |
| `coluna:prestadores_servico.observacoes` | 9 linhas | `core.Entidade.observacoes` |  |
| `coluna:prestadores_servico.razao_social` | 9 linhas | `core.Entidade.razao_social` |  |
| `coluna:prestadores_servico.responsavel` | 9 linhas | `core.Entidade.responsavel` |  |
| `coluna:prestadores_servico.status` | 9 linhas | `core.Entidade.ativa` | Ver `ativo`: os dois campos viram um só (R-core-016). |
| `coluna:prestadores_servico.telefone` | 9 linhas | `core.Entidade.telefone` |  |
| `coluna:prestadores_servico.tipo` | 9 linhas | descartado | Classificação que nenhuma tela usa (R-core-016, A-003). Valores em produção: 'prestador_servico' em 3 entidades, 'titular' em 1, vazio em 5; o relatório de migração lista os valores descartados. |
| `coluna:prestadores_servico.tipo_entidade` | 9 linhas | `core.Entidade.natureza` | 'Concessionária' e 'Órgão ou Entidade Pública' viram os dois valores de natureza. |
| `coluna:prestadores_servico.tipo_servico` | 9 linhas | `core.Entidade.servicos` | Cada texto vira o serviço do core ('Drenagem Urbana' incluída, A-021). |
| `coluna:prestadores_servico.updated_at` | 9 linhas | `core.Entidade.atualizado_em` |  |
| `coluna:prestadores_servico.user_id` | 9 linhas | `core.Usuario.entidade` | Não é carregado à parte: serve para conferir o vínculo de `profiles.prestador_servico_id` (R-core-004); divergência vai para o relatório. |
| `coluna:prestadores_servico.website` | 9 linhas | `core.Entidade.website` | Texto vazio vira nulo (5 entidades). |
| `coluna:profiles.ativo` | 7 linhas | `core.Usuario.ativo` |  |
| `coluna:profiles.camara_tecnica_id` | 7 linhas | `core.Usuario.camara` | Coordenador e fiscal sem câmara recebem a câmara da tabela de ajustes. Em produção, os 4 fiscais têm câmara (2 CATESA, 2 CATERF); os 3 perfis sem câmara são os 2 administradores e o prestador, que não levam câmara (R-core-003). |
| `coluna:profiles.created_at` | 7 linhas | `core.Usuario.criado_em` |  |
| `coluna:profiles.diretoria_id` | 7 linhas | `core.Usuario.diretoria` | Prestador fica sem diretoria (R-core-003). |
| `coluna:profiles.email` | 7 linhas | `core.Usuario.email` | Minúsculas; se divergir do e-mail da conta de autenticação, vale o da conta, e a divergência vai para o relatório de conferência. |
| `coluna:profiles.full_name` | 7 linhas | `core.Usuario.nome` |  |
| `coluna:profiles.id` | 7 linhas | `core.Usuario.id` |  |
| `coluna:profiles.prestador_servico_id` | 7 linhas | `core.Usuario.entidade` | Único lugar do vínculo (R-core-004); conferido contra `prestadores_servico.user_id`. |
| `coluna:profiles.role` | 7 linhas | `core.Usuario.papel` | Texto convertido para o papel do core (admin, coordenador, fiscal, diretor, prestador). Valor fora dessa lista (ex.: o padrão 'user') é decidido na tabela de ajustes; produção tem só admin, fiscal e prestador. |
| `coluna:profiles.updated_at` | 7 linhas | `core.Usuario.atualizado_em` |  |

## Checklists

Mapa: `anotacoes/migracao/checklists.toml` · sem data-model

- Cada tipo de unidade vira um catálogo do modelo 'Checklist por tipo de unidade' da câmara dos seus serviços (CATESA ou CATERS); os tipos de ocorrência da DTR viram os itens de um catálogo criado na migração, do modelo 'Ocorrências do PER' da CATERF (spec 005, 'Modelos de hoje').
- As 768 linhas de `itens_checklist` viram versões com o mesmo identificador (as respostas das vistorias apontam para ele), agrupadas em itens estáveis pela chave atual (tipo + ordem, ou pergunta), com vigência da data da linha até a da seguinte; versões idênticas à anterior são mantidas e marcadas como repetição (spec 005, premissa 'Migração da DSB').
- Os 79 tipos de ocorrência viram itens com uma versão cada, com o mesmo identificador no item e na versão (spec 005, premissa 'Migração da DTR'). As colunas frente, item do PER, rodovia e etapas de obra são da DTR e entram no mapa dela.

| Objeto | Volume em produção | Destino | Transformação ou motivo do descarte |
|---|---|---|---|
| `coluna:itens_checklist.artigo_portaria` | 768 linhas | `checklists.VersaoItem.valores.dispositivo_normativo` |  |
| `coluna:itens_checklist.ativo` | 768 linhas | `checklists.VersaoItem.vigente_ate` | `false` marca exclusão: encerra a vigência do item. Em produção as 768 linhas estão com `true`; a vigência de cada versão vem do agrupamento (R-checklists-004). |
| `coluna:itens_checklist.created_at` | 768 linhas | `checklists.VersaoItem.vigente_desde`<br>`checklists.VersaoItem.criado_em` |  |
| `coluna:itens_checklist.created_by` | 768 linhas | descartado | Campo herdado do app de origem, vazio em todas as linhas (R-checklists-011); a autoria das versões migradas fica em branco, e as novas registram o autor (R-checklists-010). |
| `coluna:itens_checklist.created_by_id` | 768 linhas | descartado | Campo herdado do app de origem, vazio em todas as linhas (R-checklists-011). |
| `coluna:itens_checklist.created_date` | 768 linhas | descartado | Cópia de `created_at` (R-checklists-011); conferida contra ele antes do descarte. |
| `coluna:itens_checklist.gera_nc` | 768 linhas | `checklists.VersaoItem.valores.gera_nc` |  |
| `coluna:itens_checklist.id` | 768 linhas | `checklists.VersaoItem.id` | Mesmo identificador; o item estável ganha identificador novo, e o agrupamento vai para o relatório de conferência. |
| `coluna:itens_checklist.is_sample` | 768 linhas | descartado | Marcador de exemplo, `false` nas 768 linhas (R-checklists-011). |
| `coluna:itens_checklist.ordem` | 768 linhas | `checklists.Item.ordem` | A ordem da versão mais recente vira a ordem do item; é também parte da chave de agrupamento. |
| `coluna:itens_checklist.pergunta` | 768 linhas | `checklists.VersaoItem.valores.pergunta` |  |
| `coluna:itens_checklist.prazo_dias` | 768 linhas | `checklists.VersaoItem.valores.prazo_dias` |  |
| `coluna:itens_checklist.texto_constatacao_nao` | 768 linhas | `checklists.VersaoItem.valores.constatacao_nao` |  |
| `coluna:itens_checklist.texto_constatacao_sim` | 768 linhas | `checklists.VersaoItem.valores.constatacao_sim` |  |
| `coluna:itens_checklist.texto_determinacao` | 768 linhas | `checklists.VersaoItem.valores.determinacao` |  |
| `coluna:itens_checklist.texto_nc` | 768 linhas | `checklists.VersaoItem.valores.texto_nc` |  |
| `coluna:itens_checklist.texto_recomendacao` | 768 linhas | `checklists.VersaoItem.valores.recomendacao` |  |
| `coluna:itens_checklist.tipo_unidade_id` | 768 linhas | `checklists.Item.catalogo` |  |
| `coluna:itens_checklist.updated_date` | 768 linhas | descartado | Campo herdado sem uso (R-checklists-011). |
| `coluna:tipos_ocorrencia_dtr.ativo` | 79 linhas | `checklists.VersaoItem.vigente_ate` | Os 79 estão ativos: versões sem fim de vigência. |
| `coluna:tipos_ocorrencia_dtr.created_at` | 79 linhas | `checklists.Item.criado_em` |  |
| `coluna:tipos_ocorrencia_dtr.descricao` | 79 linhas | `checklists.VersaoItem.valores.descricao` |  |
| `coluna:tipos_ocorrencia_dtr.gera_nc` | 79 linhas | descartado | Derivado: verdadeiro quando o tipo tem cláusula não atendida (51 de 79), e não vira campo do modelo DTR (spec 005, 'Modelos de hoje'). A migração confere que a regra vale para as 79 linhas antes do descarte. |
| `coluna:tipos_ocorrencia_dtr.id` | 79 linhas | `checklists.Item.id`<br>`checklists.VersaoItem.id` |  |
| `coluna:tipos_ocorrencia_dtr.nao_atendimento` | 79 linhas | `checklists.VersaoItem.valores.clausula_nao_atendida` |  |
| `coluna:tipos_ocorrencia_dtr.nome` | 79 linhas | `checklists.VersaoItem.valores.descricao` | A importação grava a descrição como nome; o nome só é usado quando a descrição está vazia (nesse caso ele é o item do PER ou a frente). |
| `coluna:tipos_ocorrencia_dtr.observacoes` | 79 linhas | `checklists.VersaoItem.valores.observacao_padrao` |  |
| `coluna:tipos_ocorrencia_dtr.prazo_dias_padrao` | 79 linhas | `checklists.VersaoItem.valores.prazo_padrao` |  |
| `coluna:tipos_ocorrencia_dtr.updated_at` | 79 linhas | `checklists.VersaoItem.vigente_desde` | A versão 1 vale desde a última alteração registrada. |
| `coluna:tipos_unidade.ativo` | 33 linhas | `checklists.Catalogo.ativo` |  |
| `coluna:tipos_unidade.codigo` | 33 linhas | `checklists.Catalogo.codigo` | Código vazio ou repetido (hoje é opcional e não único) é completado ou ajustado na tabela de ajustes antes da carga (R-checklists-001). |
| `coluna:tipos_unidade.created_at` | 33 linhas | `checklists.Catalogo.criado_em` |  |
| `coluna:tipos_unidade.id` | 33 linhas | `checklists.Catalogo.id` |  |
| `coluna:tipos_unidade.nome` | 33 linhas | `checklists.Catalogo.nome` | Nome repetido sem diferenciar maiúsculas é resolvido na tabela de ajustes antes da carga. |
| `coluna:tipos_unidade.servicos_aplicaveis` | 33 linhas | `checklists.Catalogo.servicos`<br>`checklists.Catalogo.modelo` | Cada texto vira o serviço do core ('Drenagem' da tela = drenagem urbana). Os serviços definem a câmara e, com ela, o modelo da câmara. |

## Módulos sem mapa

Ainda sem `anotacoes/migracao/<modulo>.toml`; o mapa entra com a spec do módulo.

- **Fiscalização**: 114 colunas e repositórios
- **DTR**: 21 colunas e repositórios
- **Processo sancionador**: 120 colunas e repositórios
- **CATERS**: 81 colunas e repositórios

## Fora do escopo

Descartados junto com o objeto, pelo motivo da anotação (spec 003).

| Objeto | Volume em produção | Motivo |
|---|---|---|
| `coluna:caters_ai_jobs.created_at` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.error_message` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.id` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.input_text` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.job_type` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.process_id` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.requested_by` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.result_json` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.reviewed_at` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.reviewed_by` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.status` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.storage_bucket` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.storage_path` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:caters_ai_jobs.updated_at` | 7 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.created_at` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.error_message` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.id` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.input_text` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.requested_by` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.result_json` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.reviewed_at` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.reviewed_by` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.status` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.termo_id` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |
| `coluna:catesa_ai_jobs.updated_at` | 0 linhas | Análise por IA não será refeita no sistema novo (decisão do responsável, 2026-09-30). |

## Destinos não verificados

Destinos em app que ainda não tem data-model; são conferidos quando ele existir.

- `coluna:tipos_unidade.id` → `checklists.Catalogo.id`
- `coluna:tipos_unidade.nome` → `checklists.Catalogo.nome`
- `coluna:tipos_unidade.codigo` → `checklists.Catalogo.codigo`
- `coluna:tipos_unidade.servicos_aplicaveis` → `checklists.Catalogo.servicos`
- `coluna:tipos_unidade.servicos_aplicaveis` → `checklists.Catalogo.modelo`
- `coluna:tipos_unidade.ativo` → `checklists.Catalogo.ativo`
- `coluna:tipos_unidade.created_at` → `checklists.Catalogo.criado_em`
- `coluna:itens_checklist.id` → `checklists.VersaoItem.id`
- `coluna:itens_checklist.tipo_unidade_id` → `checklists.Item.catalogo`
- `coluna:itens_checklist.ordem` → `checklists.Item.ordem`
- `coluna:itens_checklist.pergunta` → `checklists.VersaoItem.valores.pergunta`
- `coluna:itens_checklist.texto_constatacao_sim` → `checklists.VersaoItem.valores.constatacao_sim`
- `coluna:itens_checklist.texto_constatacao_nao` → `checklists.VersaoItem.valores.constatacao_nao`
- `coluna:itens_checklist.gera_nc` → `checklists.VersaoItem.valores.gera_nc`
- `coluna:itens_checklist.artigo_portaria` → `checklists.VersaoItem.valores.dispositivo_normativo`
- `coluna:itens_checklist.texto_nc` → `checklists.VersaoItem.valores.texto_nc`
- `coluna:itens_checklist.texto_determinacao` → `checklists.VersaoItem.valores.determinacao`
- `coluna:itens_checklist.prazo_dias` → `checklists.VersaoItem.valores.prazo_dias`
- `coluna:itens_checklist.texto_recomendacao` → `checklists.VersaoItem.valores.recomendacao`
- `coluna:itens_checklist.ativo` → `checklists.VersaoItem.vigente_ate`
- `coluna:itens_checklist.created_at` → `checklists.VersaoItem.vigente_desde`
- `coluna:itens_checklist.created_at` → `checklists.VersaoItem.criado_em`
- `coluna:tipos_ocorrencia_dtr.id` → `checklists.Item.id`
- `coluna:tipos_ocorrencia_dtr.id` → `checklists.VersaoItem.id`
- `coluna:tipos_ocorrencia_dtr.descricao` → `checklists.VersaoItem.valores.descricao`
- `coluna:tipos_ocorrencia_dtr.nome` → `checklists.VersaoItem.valores.descricao`
- `coluna:tipos_ocorrencia_dtr.nao_atendimento` → `checklists.VersaoItem.valores.clausula_nao_atendida`
- `coluna:tipos_ocorrencia_dtr.prazo_dias_padrao` → `checklists.VersaoItem.valores.prazo_padrao`
- `coluna:tipos_ocorrencia_dtr.observacoes` → `checklists.VersaoItem.valores.observacao_padrao`
- `coluna:tipos_ocorrencia_dtr.ativo` → `checklists.VersaoItem.vigente_ate`
- `coluna:tipos_ocorrencia_dtr.created_at` → `checklists.Item.criado_em`
- `coluna:tipos_ocorrencia_dtr.updated_at` → `checklists.VersaoItem.vigente_desde`
- `bucket:documentos-prestadores` → `caters.DocumentoProcesso.arquivo`
