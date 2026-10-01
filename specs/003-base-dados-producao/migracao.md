<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Mapa de migração

Destino, no sistema novo, de cada coluna de tabela e de cada repositório de arquivos do banco de produção: o campo que recebe o dado (com a transformação, quando há) ou o motivo do descarte. Os mapas ficam em `anotacoes/migracao/<modulo>.toml`; destinos de apps com data-model são conferidos contra ele. Num módulo com mapa, o que não tem destino é **pendente**. Colunas de views não entram (não guardam dado).

Pendentes: 0 · módulos sem mapa: 0 · destinos não verificados: 0.

| Módulo | Mapa | Colunas e repositórios | Com destino | Descartados | Pendentes |
|---|---|---:|---:|---:|---:|
| Core | sim | 60 | 59 | 1 | 0 |
| Checklists | sim | 35 | 29 | 6 | 0 |
| Fiscalização | sim | 115 | 87 | 28 | 0 |
| DTR | sim | 20 | 20 | 0 | 0 |
| Processo sancionador | sim | 120 | 90 | 30 | 0 |
| CATERS | sim | 81 | 75 | 6 | 0 |
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

Mapa: `anotacoes/migracao/checklists.toml` · data-model: `specs/005-modulo-checklists/data-model.md`

- Ordem de carga: depois da migração do core e da configuração inicial da CATESA, da CATERS e da CATERF (modelos das câmaras); antes da fiscalização e das extensões da CATERF (spec 005, 'Migração', 'Ordem'; research K14).
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

## Fiscalização

Mapa: `anotacoes/migracao/fiscalizacao.toml` · data-model: `specs/007-modulo-fiscalizacao/data-model.md`

- Ordem de carga: depois de core, checklists (versões dos itens) e do app da CATERF (catálogo e dados da rodovia), porque respostas e registros avulsos apontam para eles (research F18).
- Toda fiscalização migrada recebe `origem = migrada`, sem atividade planejada e sem contar como pendência de ligação (spec, 'Casos conhecidos').
- Os números (termo, C, NC, D, R) migram como estão e não são recalculados; a sequência de termos de cada ano continua do maior número migrado (R-fiscalizacao-013). A numeração das fiscalizações migradas e finalizadas fica congelada.
- Registros que as regras novas recusariam são carregados e marcados em `legado`, com o motivo no relatório de conferência (MIG-4).
- As colunas da DTR nas tabelas deste módulo (rodovia, km, sentido, frente, per, não atendimento, prazo da NC, gravidade, trecho, tipo de ocorrência, KM impreciso) são do módulo dtr e entram no mapa dele.

| Objeto | Volume em produção | Destino | Transformação ou motivo do descarte |
|---|---|---|---|
| `bucket:fotos_fiscalizacao` | 1445 arquivos | `fiscalizacao.Foto.arquivo`<br>`fiscalizacao.Foto.arquivo_original` | Os 1.445 arquivos são copiados para o repositório privado com a chave da Foto, conferidos por checksum. Arquivos de `novo-ponto/` sem registro e arquivos que nenhuma lista cita são listados como órfãos no relatório, e não descartados sem decisão. |
| `bucket:relatorios_fiscalizacao` | 43 arquivos | `fiscalizacao.Relatorio.arquivo`<br>`fiscalizacao.Relatorio.partes_legado` | Os 43 arquivos vão para a versão vigente de cada fiscalização, conferidos por checksum; o arquivo solto fora do padrão é listado no relatório. |
| `coluna:constatacoes_manuais.artigo_portaria` | 299 linhas | `fiscalizacao.ConstatacaoManual.dispositivo` |  |
| `coluna:constatacoes_manuais.created_at` | 299 linhas | `fiscalizacao.ConstatacaoManual.criado_em` |  |
| `coluna:constatacoes_manuais.descricao` | 299 linhas | `fiscalizacao.ConstatacaoManual.descricao` |  |
| `coluna:constatacoes_manuais.descricao_nc` | 299 linhas | `fiscalizacao.ConstatacaoManual.descricao_nc` |  |
| `coluna:constatacoes_manuais.gera_nc` | 299 linhas | `fiscalizacao.ConstatacaoManual.gera_nc` |  |
| `coluna:constatacoes_manuais.id` | 299 linhas | `fiscalizacao.ConstatacaoManual.id` |  |
| `coluna:constatacoes_manuais.numero_constatacao` | 299 linhas | `fiscalizacao.ConstatacaoManual.numero_constatacao`<br>`fiscalizacao.ConstatacaoManual.ordem_constatacao` |  |
| `coluna:constatacoes_manuais.ordem` | 299 linhas | descartado | Posição que a numeração não usa (padrão 0 em produção); a ordem vem do número da constatação. |
| `coluna:constatacoes_manuais.texto_determinacao` | 299 linhas | `fiscalizacao.ConstatacaoManual.texto_determinacao` |  |
| `coluna:constatacoes_manuais.texto_recomendacao` | 299 linhas | `fiscalizacao.ConstatacaoManual.texto_recomendacao` |  |
| `coluna:constatacoes_manuais.unidade_fiscalizada_id` | 299 linhas | `fiscalizacao.ConstatacaoManual.registro` |  |
| `coluna:constatacoes_manuais.updated_at` | 299 linhas | `fiscalizacao.ConstatacaoManual.atualizado_em` |  |
| `coluna:determinacoes.created_at` | 183 linhas | `fiscalizacao.Determinacao.criado_em` |  |
| `coluna:determinacoes.data_limite` | 183 linhas | `fiscalizacao.Determinacao.data_limite` |  |
| `coluna:determinacoes.descricao` | 183 linhas | `fiscalizacao.Determinacao.descricao`<br>`fiscalizacao.Determinacao.texto_editado` | Texto como está, marcado como editado, para a consolidação nunca reescrever o texto migrado. |
| `coluna:determinacoes.id` | 183 linhas | `fiscalizacao.Determinacao.id` |  |
| `coluna:determinacoes.nao_conformidade_id` | 183 linhas | `fiscalizacao.Determinacao.nao_conformidade` |  |
| `coluna:determinacoes.numero_determinacao` | 183 linhas | `fiscalizacao.Determinacao.numero`<br>`fiscalizacao.Determinacao.ordem` |  |
| `coluna:determinacoes.origem` | 183 linhas | `fiscalizacao.Determinacao.origem` | `checklist:<item>` → `resposta:<id da resposta daquele item na unidade>`; `manual_constatacao:<id>` → `constatacao:<id>`; `legacy:<id>` fica e vira legado. |
| `coluna:determinacoes.prazo` | 183 linhas | descartado | Coluna antiga que ninguém grava (A-025). |
| `coluna:determinacoes.prazo_dias` | 183 linhas | `fiscalizacao.Determinacao.prazo_dias` | Vazio (1 em produção) vira 30, com a marca de legado. |
| `coluna:determinacoes.status` | 183 linhas | descartado | Nada muda a situação (as 183 estão pendentes); o cumprimento é do processo sancionador (R-fiscalizacao-009). A migração confere que todas estão pendentes. |
| `coluna:determinacoes.unidade_fiscalizada_id` | 183 linhas | `fiscalizacao.Determinacao.registro` |  |
| `coluna:determinacoes.updated_at` | 183 linhas | `fiscalizacao.Determinacao.atualizado_em` |  |
| `coluna:fiscalizacoes.camara_tecnica_id` | 26 linhas | `fiscalizacao.Fiscalizacao.camara` | Vazia: deduzida dos serviços pela regra corrigida do A-021. Sem dedução possível, a fiscalização é carregada com a marca de legado 'sem câmara' e fica visível só ao administrador até ser classificada (premissa do core). |
| `coluna:fiscalizacoes.created_at` | 26 linhas | `fiscalizacao.Fiscalizacao.criado_em` |  |
| `coluna:fiscalizacoes.created_by` | 26 linhas | `fiscalizacao.Fiscalizacao.criado_por` |  |
| `coluna:fiscalizacoes.data_fim` | 26 linhas | `fiscalizacao.Fiscalizacao.data_fim` |  |
| `coluna:fiscalizacoes.data_inicio` | 26 linhas | `fiscalizacao.Fiscalizacao.data_inicio` |  |
| `coluna:fiscalizacoes.fiscal_email` | 26 linhas | `fiscalizacao.Fiscalizacao.responsavel`<br>`fiscalizacao.MembroEquipe.usuario` | O usuário do e-mail vira o responsável e o único membro da equipe (origem 'informado'). E-mail sem usuário é guardado na marca de legado. |
| `coluna:fiscalizacoes.fiscal_nome` | 26 linhas | `fiscalizacao.Fiscalizacao.responsavel` | Usado só quando o e-mail não identifica o usuário; o nome fica na marca de legado. |
| `coluna:fiscalizacoes.id` | 26 linhas | `fiscalizacao.Fiscalizacao.id` |  |
| `coluna:fiscalizacoes.last_modified_at` | 26 linhas | descartado | Idem `last_modified_by`. |
| `coluna:fiscalizacoes.last_modified_by` | 26 linhas | descartado | Quem alterou por último está na auditoria migrada (R-fiscalizacao-024); a migração confere que a auditoria tem a mesma última alteração. |
| `coluna:fiscalizacoes.latitude_inicio` | 26 linhas | descartado | O app não grava (A-025). |
| `coluna:fiscalizacoes.longitude_inicio` | 26 linhas | descartado | O app não grava (A-025). |
| `coluna:fiscalizacoes.municipio_id` | 26 linhas | `fiscalizacao.Fiscalizacao.municipio`<br>`fiscalizacao.Fiscalizacao.destinos` | O município vira também o destino do tipo município. Vazio nas fiscalizações rodoviárias, cujos destinos (concessão e rodovia) vêm do app da CATERF. Município inexistente (não há chave em produção, A-037) é carregado como legado e listado. |
| `coluna:fiscalizacoes.municipio_nome` | 26 linhas | descartado | Cópia do nome do município, que vem do core. A migração confere a cópia contra o município antes do descarte, e a divergência vai para o relatório. |
| `coluna:fiscalizacoes.numero_termo` | 26 linhas | `fiscalizacao.Fiscalizacao.numero_termo` | Como está; alimenta a sequência do ano (SequenciaTermo). |
| `coluna:fiscalizacoes.prestador_servico_id` | 26 linhas | `fiscalizacao.Fiscalizacao.entidade` | Entidade inexistente (sem chave em produção, A-037) é carregada como legado e listada. |
| `coluna:fiscalizacoes.prestador_servico_nome` | 26 linhas | descartado | Cópia do nome da entidade, que vem do core; conferida antes do descarte, como o município. |
| `coluna:fiscalizacoes.servicos` | 26 linhas | `fiscalizacao.Fiscalizacao.servicos` | Cada texto vira o serviço do core (a ordem da lista não importa); serviço fora da câmara da fiscalização vira legado. |
| `coluna:fiscalizacoes.status` | 26 linhas | `fiscalizacao.Fiscalizacao.situacao`<br>`fiscalizacao.Fiscalizacao.numeracao_congelada` | `finalizada` também congela a numeração (19 fiscalizações); `em_andamento` fica aberta (7). |
| `coluna:fiscalizacoes.tipo_modulo` | 26 linhas | descartado | A diretoria vem da câmara (R-fiscalizacao-001, R-fiscalizacao-025); a migração confere que o módulo bate com a diretoria da câmara (24 DSB, 2 DTR) e lista a divergência. |
| `coluna:fiscalizacoes.updated_at` | 26 linhas | `fiscalizacao.Fiscalizacao.atualizado_em` |  |
| `coluna:fotos_evidencia.bucket_path` | 0 linhas | descartado | Tabela sem uso, vazia (A-030). |
| `coluna:fotos_evidencia.created_at` | 0 linhas | descartado | Tabela sem uso, vazia (A-030). |
| `coluna:fotos_evidencia.descricao` | 0 linhas | descartado | Tabela sem uso, vazia (A-030). |
| `coluna:fotos_evidencia.fiscalizacao_id` | 0 linhas | descartado | Tabela sem uso, vazia (A-030). |
| `coluna:fotos_evidencia.id` | 0 linhas | descartado | Tabela sem uso, vazia (A-030). |
| `coluna:fotos_evidencia.unidade_fiscalizada_id` | 0 linhas | descartado | Tabela sem uso, vazia (A-030). |
| `coluna:fotos_evidencia.url` | 0 linhas | descartado | Tabela sem uso, vazia (A-030). |
| `coluna:nao_conformidades.artigo_portaria` | 478 linhas | `fiscalizacao.NaoConformidade.dispositivo` |  |
| `coluna:nao_conformidades.created_at` | 478 linhas | `fiscalizacao.NaoConformidade.criado_em`<br>`fiscalizacao.NaoConformidade.atualizado_em` |  |
| `coluna:nao_conformidades.descricao` | 478 linhas | `fiscalizacao.NaoConformidade.descricao` |  |
| `coluna:nao_conformidades.fotos` | 478 linhas | descartado | Vazia em produção; as fotos são do registro (R-fiscalizacao-024). |
| `coluna:nao_conformidades.gravidade` | 478 linhas | descartado | Valor fixo 'Média' nas 478 linhas (R-fiscalizacao-024). |
| `coluna:nao_conformidades.id` | 478 linhas | `fiscalizacao.NaoConformidade.id` | Mesmo identificador da última regeneração; passa a ser estável. |
| `coluna:nao_conformidades.latitude_foto` | 478 linhas | descartado | Sem uso (R-fiscalizacao-024). |
| `coluna:nao_conformidades.longitude_foto` | 478 linhas | descartado | Sem uso (R-fiscalizacao-024). |
| `coluna:nao_conformidades.numero_nc` | 478 linhas | `fiscalizacao.NaoConformidade.numero` |  |
| `coluna:nao_conformidades.resposta_checklist_id` | 478 linhas | `fiscalizacao.NaoConformidade.resposta`<br>`fiscalizacao.NaoConformidade.origem`<br>`fiscalizacao.NaoConformidade.constatacao_manual` | Com resposta: origem `resposta:<id>`. Sem resposta: a constatação manual com NC da mesma unidade, na ordem do número, dá a origem `constatacao:<id>`. NC sem origem reconhecível vira legado (research F18). |
| `coluna:nao_conformidades.unidade_fiscalizada_id` | 478 linhas | `fiscalizacao.NaoConformidade.registro` |  |
| `coluna:recomendacoes.created_at` | 350 linhas | `fiscalizacao.Recomendacao.criado_em` |  |
| `coluna:recomendacoes.descricao` | 350 linhas | `fiscalizacao.Recomendacao.descricao`<br>`fiscalizacao.Recomendacao.texto_editado` | Texto como está, marcado como editado. |
| `coluna:recomendacoes.id` | 350 linhas | `fiscalizacao.Recomendacao.id` |  |
| `coluna:recomendacoes.numero_recomendacao` | 350 linhas | `fiscalizacao.Recomendacao.numero`<br>`fiscalizacao.Recomendacao.ordem` |  |
| `coluna:recomendacoes.origem` | 350 linhas | `fiscalizacao.Recomendacao.origem` | Como nas determinações; `checklist` sem id e `legacy_rec:<id>` viram legado. |
| `coluna:recomendacoes.unidade_fiscalizada_id` | 350 linhas | `fiscalizacao.Recomendacao.registro` |  |
| `coluna:recomendacoes.updated_at` | 350 linhas | `fiscalizacao.Recomendacao.atualizado_em` |  |
| `coluna:relatorios_jobs.created_at` | 18 linhas | `fiscalizacao.Relatorio.pedido_em` |  |
| `coluna:relatorios_jobs.error_message` | 18 linhas | `fiscalizacao.Relatorio.mensagem_erro` |  |
| `coluna:relatorios_jobs.fiscalizacao_id` | 18 linhas | `fiscalizacao.Relatorio.fiscalizacao`<br>`fiscalizacao.Relatorio.versao` | Versões numeradas pela data do pedido, por fiscalização. |
| `coluna:relatorios_jobs.id` | 18 linhas | `fiscalizacao.Relatorio.id` |  |
| `coluna:relatorios_jobs.parts_count` | 18 linhas | `fiscalizacao.Relatorio.partes_legado` | Com mais de uma parte, as chaves das partes (`latest_part1.pdf`...) vão para as partes de legado. |
| `coluna:relatorios_jobs.progress_fotos` | 18 linhas | `fiscalizacao.Relatorio.progresso_fotos` |  |
| `coluna:relatorios_jobs.progress_unidades` | 18 linhas | `fiscalizacao.Relatorio.progresso_registros` |  |
| `coluna:relatorios_jobs.requested_by` | 18 linhas | `fiscalizacao.Relatorio.pedido_por` |  |
| `coluna:relatorios_jobs.status` | 18 linhas | `fiscalizacao.Relatorio.situacao`<br>`fiscalizacao.Relatorio.estado` | `queued` → na_fila, `processing` → gerando, `done` → pronto, `error` → erro (as 18 estão prontas). O mais recente pronto de cada fiscalização fica vigente; os demais, substituídos. |
| `coluna:relatorios_jobs.storage_path` | 18 linhas | `fiscalizacao.Relatorio.arquivo` |  |
| `coluna:relatorios_jobs.updated_at` | 18 linhas | `fiscalizacao.Relatorio.gerado_em` |  |
| `coluna:respostas_checklist.comentario` | 3454 linhas | descartado | Campo antigo que a tela não usa (divergência residuo_descartar); a migração lista as respostas com valor nele. |
| `coluna:respostas_checklist.created_at` | 3454 linhas | `fiscalizacao.Resposta.criado_em` |  |
| `coluna:respostas_checklist.gera_nc` | 3454 linhas | descartado | Derivado do catálogo e da resposta (R-fiscalizacao-005); a migração confere, antes, que a marca bate com a declaração do item e a resposta (355 respostas com NC). |
| `coluna:respostas_checklist.id` | 3454 linhas | `fiscalizacao.Resposta.id` |  |
| `coluna:respostas_checklist.item_checklist_id` | 3454 linhas | `fiscalizacao.Resposta.item_versao_id` | Mesmo identificador da versão migrada (spec 005); 100% das respostas precisam encontrar a versão, e a que não encontrar vira legado. |
| `coluna:respostas_checklist.numero_constatacao` | 3454 linhas | `fiscalizacao.Resposta.numero_constatacao`<br>`fiscalizacao.Resposta.ordem_constatacao` | O número vira também a ordem, junto com o das constatações manuais da unidade. |
| `coluna:respostas_checklist.observacao` | 3454 linhas | `fiscalizacao.Resposta.observacao` |  |
| `coluna:respostas_checklist.pergunta` | 3454 linhas | `fiscalizacao.Resposta.texto_constatacao`<br>`fiscalizacao.Resposta.constatacao_excluida` | Texto da constatação como está (inclusive o editado); pergunta vazia com resposta preenchida marca a constatação como excluída. |
| `coluna:respostas_checklist.resposta` | 3454 linhas | `fiscalizacao.Resposta.valor` | `SIM` → `sim`; `NAO` e `NÃO` → `nao`; vazio ou outro valor vira legado. |
| `coluna:respostas_checklist.unidade_fiscalizada_id` | 3454 linhas | `fiscalizacao.Resposta.registro` |  |
| `coluna:respostas_checklist.updated_at` | 3454 linhas | `fiscalizacao.Resposta.atualizado_em` |  |
| `coluna:unidades_fiscalizadas.codigo_unidade` | 402 linhas | `fiscalizacao.RegistroCampo.codigo` |  |
| `coluna:unidades_fiscalizadas.coordenadas` | 402 linhas | `fiscalizacao.RegistroCampo.coordenadas_digitadas`<br>`fiscalizacao.RegistroCampo.origem_ponto` | Texto como está. Sem coordenada numérica, o texto é convertido para latitude e longitude quando possível, com origem 'digitado'; o que não converte fica só no texto e é listado. |
| `coluna:unidades_fiscalizadas.created_at` | 402 linhas | `fiscalizacao.RegistroCampo.criado_em` | Define a versão do catálogo da unidade; a migração confere que as respostas apontam para versões vigentes nessa data ou já respondidas. |
| `coluna:unidades_fiscalizadas.data_hora_vistoria` | 402 linhas | `fiscalizacao.RegistroCampo.data_hora_vistoria` |  |
| `coluna:unidades_fiscalizadas.endereco` | 402 linhas | `fiscalizacao.RegistroCampo.endereco` |  |
| `coluna:unidades_fiscalizadas.fiscalizacao_id` | 402 linhas | `fiscalizacao.RegistroCampo.fiscalizacao` |  |
| `coluna:unidades_fiscalizadas.fotos_unidade` | 402 linhas | `fiscalizacao.Foto.arquivo`<br>`fiscalizacao.Foto.arquivo_original`<br>`fiscalizacao.Foto.legenda`<br>`fiscalizacao.Foto.ordem`<br>`fiscalizacao.Foto.latitude`<br>`fiscalizacao.Foto.longitude`<br>`fiscalizacao.Foto.largura`<br>`fiscalizacao.Foto.altura` | Cada item da lista vira uma Foto, na mesma ordem: `bucket`/`path` → arquivo; `cleanBucket`/`cleanPath` → original (quando há); `localId` → identificador (se for UUID; senão, um novo); `resolucao_km` e `resolucao_rodovia` vão ao app da CATERF. O checksum é calculado na cópia do arquivo. |
| `coluna:unidades_fiscalizadas.gps_accuracy_m` | 402 linhas | `fiscalizacao.RegistroCampo.precisao_m`<br>`fiscalizacao.RegistroCampo.impreciso` | Impreciso quando passa de 20 m (o limite de hoje); vazio nas unidades de saneamento, que ficam sem precisão. |
| `coluna:unidades_fiscalizadas.id` | 402 linhas | `fiscalizacao.RegistroCampo.id` |  |
| `coluna:unidades_fiscalizadas.latitude` | 402 linhas | `fiscalizacao.RegistroCampo.latitude`<br>`fiscalizacao.RegistroCampo.origem_ponto` | Origem do ponto 'gps' quando há coordenada numérica. |
| `coluna:unidades_fiscalizadas.longitude` | 402 linhas | `fiscalizacao.RegistroCampo.longitude` |  |
| `coluna:unidades_fiscalizadas.nome_unidade` | 402 linhas | `fiscalizacao.RegistroCampo.nome` |  |
| `coluna:unidades_fiscalizadas.ordem` | 402 linhas | `fiscalizacao.RegistroCampo.ordem` |  |
| `coluna:unidades_fiscalizadas.status` | 402 linhas | `fiscalizacao.RegistroCampo.situacao` | `finalizada` vira finalizado; `em_andamento` fica; `pendente` (4 em produção) vira em andamento com a marca de legado. |
| `coluna:unidades_fiscalizadas.tipo_unidade_id` | 402 linhas | `fiscalizacao.RegistroCampo.catalogo_id`<br>`fiscalizacao.RegistroCampo.item_versao_id`<br>`fiscalizacao.RegistroCampo.tipo_avulso` | Unidade de saneamento: o tipo vira o catálogo (mesmo identificador, spec 005). Ocorrência da DTR (tipo vazio): catálogo da CATERF, com o item e a versão ligados pelo app da CATERF (frente, PER e descrição) e o tipo avulso registrado por ele. Tipo inexistente vira legado. |
| `coluna:unidades_fiscalizadas.tipo_unidade_nome` | 402 linhas | descartado | Cópia do nome do tipo que o app não grava (A-025). |
| `coluna:unidades_fiscalizadas.total_constatacoes` | 402 linhas | descartado | Total calculado dos registros (A-025); a migração confere o total gravado contra o calculado e lista a diferença. |
| `coluna:unidades_fiscalizadas.total_determinacoes` | 402 linhas | descartado | Nunca gravado pelo app atual (A-025, divergência defeito_corrigir). |
| `coluna:unidades_fiscalizadas.total_ncs` | 402 linhas | descartado | Idem `total_constatacoes`. |
| `coluna:unidades_fiscalizadas.total_recomendacoes` | 402 linhas | descartado | Nunca gravado pelo app atual (A-025, divergência defeito_corrigir). |
| `coluna:unidades_fiscalizadas.updated_at` | 402 linhas | `fiscalizacao.RegistroCampo.atualizado_em` |  |

## DTR

Mapa: `anotacoes/migracao/dtr.toml` · data-model: `specs/008-modulo-dtr-caterf/data-model.md`

- Ordem de carga: core → checklists → caterf (contratos, traçados, pontos) → fiscalização (fiscalizações e registros) → caterf (extensões das fiscalizações e das ocorrências) (research C11).
- Os campos da DTR nos tipos de ocorrência vão para os valores do modelo 'Ocorrências do PER' no motor de checklists; conferidos contra o data-model da spec 005 e gravados pela migração dos checklists (research K14 da spec 005).

| Objeto | Volume em produção | Destino | Transformação ou motivo do descarte |
|---|---|---|---|
| `bucket:kml-rodovias` | 2 arquivos | `caterf.Tracado.arquivo`<br>`caterf.Tracado.checksum` | Os 2 arquivos viram a versão 1 do traçado de cada contrato, conferidos por checksum. |
| `coluna:contratos.km_points` | 2 linhas | `caterf.PontoKm.km`<br>`caterf.PontoKm.latitude`<br>`caterf.PontoKm.longitude`<br>`caterf.PontoKm.rodovia` | Os pontos são os relidos do KML migrado; a lista gravada no contrato (cerca de 15 mil pontos) serve para conferir, ponto a ponto, e a divergência vai para o relatório (MIG-2). |
| `coluna:contratos.kml_url` | 2 linhas | `caterf.Tracado.arquivo`<br>`caterf.Tracado.versao` | O KML referenciado vira a versão 1 do traçado, relido no servidor (C3). |
| `coluna:contratos.rodovia` | 2 linhas | `caterf.ContratoRodoviario.rodovias` | A rodovia do contrato vira a lista de rodovias ("112/306" é separado em MS-112 e MS-306, conferido com as rodovias dos pontos do KML). |
| `coluna:fiscalizacoes.rodovia` | 26 linhas | `caterf.FiscalizacaoRodoviaria.rodovia`<br>`caterf.FiscalizacaoRodoviaria.contrato_rodoviario` | Cria a extensão das fiscalizações da DTR, com o contrato da rodovia; vazia nas fiscalizações da DSB, que não recebem extensão. |
| `coluna:tipos_ocorrencia_dtr.etapas_obra` | 79 linhas | `checklists.VersaoItem.valores.etapas_obra` | Uma etapa por linha vira a lista de linhas do campo. |
| `coluna:tipos_ocorrencia_dtr.frente` | 79 linhas | `checklists.VersaoItem.valores.frente` |  |
| `coluna:tipos_ocorrencia_dtr.item_contrato` | 79 linhas | `checklists.VersaoItem.valores.item_per` |  |
| `coluna:tipos_ocorrencia_dtr.rodovia` | 79 linhas | `checklists.VersaoItem.valores.rodovias` | "112/306" vira a lista das rodovias; vazio vale para todas. |
| `coluna:unidades_fiscalizadas.frente` | 402 linhas | `caterf.Ocorrencia.frente_epoca` | Texto da época guardado; usado, com o item do PER e a descrição, para ligar a ocorrência à versão do tipo (sem diferenciar maiúsculas e espaços); sem correspondência, a ocorrência fica sem versão e é listada. |
| `coluna:unidades_fiscalizadas.gravidade` | 402 linhas | `caterf.Ocorrencia.gravidade` | Quando houver (o assistente atual não tem o passo): leve, média, grave, gravíssima. |
| `coluna:unidades_fiscalizadas.km` | 402 linhas | `caterf.Ocorrencia.km`<br>`caterf.Ocorrencia.km_valor`<br>`caterf.Ocorrencia.km_origem` | Texto como está e o valor numérico quando converte; a origem migrada é 'ponto' (a mais comum hoje) salvo quando o KM impreciso indica digitado, com a marca de legado. |
| `coluna:unidades_fiscalizadas.km_impreciso` | 402 linhas | `caterf.Ocorrencia.km_impreciso` |  |
| `coluna:unidades_fiscalizadas.nao_atendimento` | 402 linhas | `caterf.Ocorrencia.clausula_epoca` | Texto da época guardado; é o que foi notificado. |
| `coluna:unidades_fiscalizadas.per` | 402 linhas | `caterf.Ocorrencia.item_per_epoca` | Texto da época guardado (a grafia varia em produção); usado na ligação ao tipo. |
| `coluna:unidades_fiscalizadas.prazo_dias_nc` | 402 linhas | `caterf.Ocorrencia.prazo_epoca` | Prazo da época (1, 15 ou 30 em produção); o prazo da determinação migrada vem da fiscalização. |
| `coluna:unidades_fiscalizadas.rodovia` | 402 linhas | `caterf.Ocorrencia.rodovia` | Cria a extensão só nas unidades de fiscalizações da DTR; vazia nas de saneamento. |
| `coluna:unidades_fiscalizadas.sentido` | 402 linhas | `caterf.Ocorrencia.sentido` |  |
| `coluna:unidades_fiscalizadas.tipo_ocorrencia` | 402 linhas | `fiscalizacao.RegistroCampo.resposta` | `constatacao` (72) e `nc` (6) viram as respostas do modelo 'Ocorrências do PER'. |
| `coluna:unidades_fiscalizadas.trecho` | 402 linhas | `caterf.Ocorrencia.trecho` |  |

## Processo sancionador

Mapa: `anotacoes/migracao/processo_sancionador.toml` · data-model: `specs/011-modulo-processo-sancionador/data-model.md`

- Ordem de carga: depois de core e fiscalização (as determinações, já migradas com os identificadores de produção, viram os retratos notificados) (research N16).
- O comando exige a lista de identificadores de teste fechada com o responsável (A-002): as 34 respostas e as 20 evidências de produção são de teste.
- Cada termo vira um processo e um termo com o mesmo identificador; a etapa é deduzida dos dados, e a situação gravada fica em `situacao_legado`.
- Autos, remessas, itens e pareceres estão vazios; as tabelas de manifestações e de julgamentos não são levadas (A-030).

| Objeto | Volume em produção | Destino | Transformação ou motivo do descarte |
|---|---|---|---|
| `bucket:documentos-autos` | 5 arquivos | `processo_sancionador.DocumentoProcesso.arquivo` | Os 5 arquivos de produção não têm registro que aponte para eles (A-018): são listados, com caminho, tamanho e data, e não migrados sem decisão do responsável. |
| `bucket:documentos-termos` | 28 arquivos | `processo_sancionador.DocumentoProcesso.arquivo` | Os 28 arquivos: os referenciados pelos termos viram documentos, com checksum conferido; os sem referência são listados para decisão do responsável. |
| `bucket:evidencias-determinacoes` | 20 arquivos | `processo_sancionador.DocumentoProcesso.arquivo` | Os 20 arquivos são das respostas de teste (A-002) e não migram se confirmados na lista; os demais viram documentos `evidencia`. |
| `coluna:autos_infracao.arquivo_defesa` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `defesa_anexo` da defesa. |
| `coluna:autos_infracao.arquivo_defesa_oficio` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `defesa_oficio` da defesa. |
| `coluna:autos_infracao.arquivo_protocolo_ai_recebido` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `protocolo_recebimento_ai` do auto. |
| `coluna:autos_infracao.arquivo_protocolo_oficio` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `protocolo_oficio_ai` do auto. |
| `coluna:autos_infracao.arquivo_url` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `ai_agems` do auto. |
| `coluna:autos_infracao.camara_tecnica_id` | 0 linhas | descartado | Derivado do processo; conferido antes do descarte. |
| `coluna:autos_infracao.created_at` | 0 linhas | `processo_sancionador.AutoInfracao.criado_em` |  |
| `coluna:autos_infracao.data_emissao` | 0 linhas | `processo_sancionador.AutoInfracao.emitido_em` |  |
| `coluna:autos_infracao.defesa_arquivos` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.nome_original` | Cada item vira documento `defesa_anexo` da defesa. |
| `coluna:autos_infracao.defesa_texto` | 0 linhas | `processo_sancionador.Defesa.texto` | Cria a defesa do auto: `enviada` se a remessa do auto tem `defesa_enviada_em`; senão, `rascunho`. |
| `coluna:autos_infracao.descricao` | 0 linhas | `processo_sancionador.AutoInfracao.descricao` |  |
| `coluna:autos_infracao.determinacao_id` | 0 linhas | `processo_sancionador.AutoInfracao.determinacao` | O retrato notificado da determinação; a AM concluída do termo é a `analise`. |
| `coluna:autos_infracao.fiscalizacao_id` | 0 linhas | `processo_sancionador.AutoInfracao.processo` | O processo da fiscalização. |
| `coluna:autos_infracao.id` | 0 linhas | `processo_sancionador.AutoInfracao.id` |  |
| `coluna:autos_infracao.numero_auto` | 0 linhas | `processo_sancionador.AutoInfracao.numero` |  |
| `coluna:autos_infracao.pena_base_rs` | 0 linhas | `processo_sancionador.AutoInfracao.pena_base_rs` |  |
| `coluna:autos_infracao.pena_base_uferms` | 0 linhas | `processo_sancionador.AutoInfracao.pena_base_uferms` |  |
| `coluna:autos_infracao.prestador_servico_id` | 0 linhas | descartado | Derivado do processo; conferido antes do descarte. |
| `coluna:autos_infracao.resposta_determinacao_id` | 0 linhas | descartado | Não é gravado pelas telas (R-sancionador-022); o auto aponta para a determinação notificada. |
| `coluna:autos_infracao.status` | 0 linhas | `processo_sancionador.AutoInfracao.situacao` | `pendente` e `gerado` → gerado; `enviado` → enviado; `em_analise` → defesa_recebida; `finalizado` → com_parecer. |
| `coluna:autos_infracao.unidade_fiscalizada_id` | 0 linhas | descartado | Derivado da determinação notificada (`registro_id`); conferido antes do descarte. |
| `coluna:autos_infracao.valor` | 0 linhas | descartado | Sem uso; as telas usam a pena base (R-sancionador-022). |
| `coluna:julgamentos.auto_id` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:julgamentos.created_at` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:julgamentos.data_julgamento` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:julgamentos.decisao` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:julgamentos.id` | 0 linhas | descartado | Tabela sem uso e vazia; o julgamento é a etapa nova da R-sancionador-013 (A-030). |
| `coluna:julgamentos.justificativa_decisao` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:julgamentos.parecer_tecnico_id` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:julgamentos.prestador_servico_id` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:julgamentos.status` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:julgamentos.valor_multa_final` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:manifestacoes_auto.arquivo_url` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:manifestacoes_auto.auto_infracao_id` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:manifestacoes_auto.created_at` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:manifestacoes_auto.data_manifestacao` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:manifestacoes_auto.descricao` | 0 linhas | descartado | Tabela sem uso e vazia (A-030). |
| `coluna:manifestacoes_auto.id` | 0 linhas | descartado | Tabela sem uso e vazia; a defesa é registro próprio (A-030, R-sancionador-011). |
| `coluna:pareceres_tecnicos.analise_tecnica` | 0 linhas | `processo_sancionador.ParecerTecnico.analise_tecnica` |  |
| `coluna:pareceres_tecnicos.arquivo_parecer_assinado_url` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `parecer_assinado` do parecer. |
| `coluna:pareceres_tecnicos.auto_id` | 0 linhas | `processo_sancionador.ParecerTecnico.auto` |  |
| `coluna:pareceres_tecnicos.created_at` | 0 linhas | `processo_sancionador.ParecerTecnico.criado_em` |  |
| `coluna:pareceres_tecnicos.id` | 0 linhas | `processo_sancionador.ParecerTecnico.id` |  |
| `coluna:pareceres_tecnicos.recomendacao` | 0 linhas | `processo_sancionador.ParecerTecnico.recomendacao` | "Aplicar multa" → mantem; "Arquivar" → cancela. |
| `coluna:pareceres_tecnicos.status` | 0 linhas | `processo_sancionador.ParecerTecnico.situacao` | `pendente` e `rascunho` → rascunho; `finalizado` e `parecer_enviado` → finalizado. |
| `coluna:pareceres_tecnicos.valor_multa_sugerido` | 0 linhas | `processo_sancionador.ParecerTecnico.multa_sugerida_rs` |  |
| `coluna:remessas_ai.arquivo_lista_pdf_url` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `lista_remessa` da remessa. |
| `coluna:remessas_ai.arquivo_oficio_defesa_url` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `defesa_oficio` da remessa. |
| `coluna:remessas_ai.arquivo_parecer_assinado_url` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `parecer_assinado` da remessa. |
| `coluna:remessas_ai.arquivo_recebimento_assinado_url` | 0 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `recebimento_remessa` da remessa, `pela_entidade` verdadeiro. |
| `coluna:remessas_ai.camara_tecnica_id` | 0 linhas | descartado | Derivado do processo; conferido antes do descarte. |
| `coluna:remessas_ai.criada_em` | 0 linhas | `processo_sancionador.Remessa.criada_em` |  |
| `coluna:remessas_ai.defesa_enviada_em` | 0 linhas | `processo_sancionador.Remessa.defesa_enviada_em` | Hora do aparelho do prestador; marcada como tal no `legado` do processo. `defesa_no_prazo` é calculado contra o prazo de defesa dos autos. |
| `coluna:remessas_ai.enviada_em` | 0 linhas | `processo_sancionador.Remessa.enviada_em` |  |
| `coluna:remessas_ai.fiscalizacao_id` | 0 linhas | descartado | Derivado do processo; conferido antes do descarte. |
| `coluna:remessas_ai.id` | 0 linhas | `processo_sancionador.Remessa.id` |  |
| `coluna:remessas_ai.numero_rfp` | 0 linhas | descartado | Derivado do termo (tipo e número do relatório). |
| `coluna:remessas_ai.numero_tn` | 0 linhas | descartado | Sempre vazio: a tela lia um campo inexistente (R-sancionador-022). |
| `coluna:remessas_ai.parecer_enviado_em` | 0 linhas | `processo_sancionador.EventoProcesso.criado_em` | Evento de envio dos pareceres à entidade, como era no sistema atual. |
| `coluna:remessas_ai.prestador_servico_id` | 0 linhas | descartado | Derivado do processo; conferido antes do descarte. |
| `coluna:remessas_ai.recebida_em` | 0 linhas | `processo_sancionador.Remessa.recebida_em` | Hora do aparelho do prestador; marcada como tal no `legado` do processo. |
| `coluna:remessas_ai.status` | 0 linhas | `processo_sancionador.Remessa.situacao` | `defesa_enviada` → defesa_recebida; `parecer_enviado` → defesa_recebida, com evento de encaminhamento; demais iguais. |
| `coluna:remessas_ai.termo_id` | 0 linhas | `processo_sancionador.Remessa.processo` | O processo do termo (mesmo identificador). |
| `coluna:remessas_ai.updated_at` | 0 linhas | `processo_sancionador.Remessa.atualizado_em` |  |
| `coluna:remessas_ai_itens.auto_infracao_id` | 0 linhas | `processo_sancionador.RemessaItem.auto` |  |
| `coluna:remessas_ai_itens.created_at` | 0 linhas | `processo_sancionador.RemessaItem.criado_em` |  |
| `coluna:remessas_ai_itens.id` | 0 linhas | `processo_sancionador.RemessaItem.id` |  |
| `coluna:remessas_ai_itens.remessa_ai_id` | 0 linhas | `processo_sancionador.RemessaItem.remessa` |  |
| `coluna:respostas_determinacao.created_at` | 34 linhas | `processo_sancionador.RespostaDeterminacao.criado_em` |  |
| `coluna:respostas_determinacao.data_resposta` | 34 linhas | `processo_sancionador.RespostaDeterminacao.enviada_em` | Migrada como está; a análise da equipe sobrescrevia esta data, e a conferência marca as respostas analisadas cuja data coincide com a da análise. |
| `coluna:respostas_determinacao.dentro_prazo` | 34 linhas | `processo_sancionador.RespostaDeterminacao.no_prazo` |  |
| `coluna:respostas_determinacao.descricao_atendimento` | 34 linhas | `processo_sancionador.AnaliseResposta.texto` |  |
| `coluna:respostas_determinacao.determinacao_id` | 34 linhas | `processo_sancionador.RespostaDeterminacao.determinacao` | Ligada ao retrato notificado da mesma determinação (`DeterminacaoNotificada.determinacao_id`). |
| `coluna:respostas_determinacao.evidencias` | 34 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.nome_original` | Cada item vira documento `evidencia` da resposta, com `pela_entidade` verdadeiro. |
| `coluna:respostas_determinacao.fiscalizacao_id` | 34 linhas | descartado | Derivado do processo; conferido contra a fiscalização do termo antes do descarte. |
| `coluna:respostas_determinacao.id` | 34 linhas | `processo_sancionador.RespostaDeterminacao.id` | Só as que não estão na lista de teste (A-002); hoje, nenhuma. |
| `coluna:respostas_determinacao.manifestacao_prestador` | 34 linhas | `processo_sancionador.RespostaDeterminacao.manifestacao` |  |
| `coluna:respostas_determinacao.prestador_servico_id` | 34 linhas | descartado | Derivado do processo; conferido contra a entidade do termo antes do descarte. |
| `coluna:respostas_determinacao.resposta` | 34 linhas | descartado | Sem uso: nenhuma tela grava (R-sancionador-022). |
| `coluna:respostas_determinacao.status` | 34 linhas | `processo_sancionador.RespostaDeterminacao.situacao`<br>`processo_sancionador.AnaliseResposta.resultado` | `rascunho` → rascunho; `aguardando_analise` → enviada; `atendida` → enviada, com análise `acatada`; `nao_atendida` → enviada, com análise `nao_acatada` (na AM do termo). |
| `coluna:respostas_determinacao.tipo_resposta` | 34 linhas | descartado | Sem uso: nenhuma tela lê nem grava (R-sancionador-022). |
| `coluna:respostas_determinacao.unidade_fiscalizada_id` | 34 linhas | `processo_sancionador.DeterminacaoNotificada.registro_id` | Conferido contra a unidade da determinação; divergência vai para `legado` do processo. |
| `coluna:termos_notificacao.am_concluida_em` | 5 linhas | `processo_sancionador.AnaliseManifestacao.concluida_em` |  |
| `coluna:termos_notificacao.ano_geracao` | 5 linhas | `processo_sancionador.TermoNotificacao.ano_relatorio` |  |
| `coluna:termos_notificacao.arquivo_am_assinada_url` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `am_assinada` da AM versão 1. |
| `coluna:termos_notificacao.arquivo_oficio_protocolo` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Como o TN, com o tipo `oficio_protocolo`. |
| `coluna:termos_notificacao.arquivo_oficio_resposta` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Como o TN, com o tipo `oficio_resposta`. |
| `coluna:termos_notificacao.arquivo_protocolo_url` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Como o TN, com o tipo `protocolo`. |
| `coluna:termos_notificacao.arquivo_resposta_url` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Como o TN, com o tipo `resposta_manual`. |
| `coluna:termos_notificacao.arquivo_rfp_url` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Como o TN, com o tipo `relatorio`. |
| `coluna:termos_notificacao.arquivo_tn_prestador_url` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Como o TN, com o tipo `tn_entidade` e `pela_entidade` verdadeiro. |
| `coluna:termos_notificacao.arquivo_url` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.tipo` | Documento `tn_agems` do termo: caminho extraído do endereço, arquivo copiado para o repositório privado, checksum conferido. |
| `coluna:termos_notificacao.arquivos_resposta` | 5 linhas | `processo_sancionador.DocumentoProcesso.arquivo`<br>`processo_sancionador.DocumentoProcesso.nome_original` | Cada item da lista vira um documento: categoria `termo_envio` → tipo `termo_envio` do termo; categoria `evidencia_determinacao` → tipo `evidencia` da resposta da determinação indicada em `determinacao_id`, sem repetir o arquivo que já veio de `respostas_determinacao.evidencias` (mesmo caminho); demais → `resposta_manual` do termo; nome, tamanho e data do item conferidos com o arquivo. |
| `coluna:termos_notificacao.assinatura_prestador_valida` | 5 linhas | `processo_sancionador.TermoNotificacao.assinatura_aceita` |  |
| `coluna:termos_notificacao.camara_tecnica` | 5 linhas | `processo_sancionador.ProcessoSancionador.camara`<br>`processo_sancionador.TermoNotificacao.camara` | Texto em maiúsculas (`CATESA`, `CATERS`) ligado à câmara do core pela sigla; conferido contra a câmara da fiscalização, e divergência vai para `legado`. |
| `coluna:termos_notificacao.created_at` | 5 linhas | `processo_sancionador.ProcessoSancionador.criado_em` |  |
| `coluna:termos_notificacao.data_assinatura_prestador` | 5 linhas | `processo_sancionador.TermoNotificacao.assinatura_entidade_em` |  |
| `coluna:termos_notificacao.data_geracao` | 5 linhas | `processo_sancionador.TermoNotificacao.criado_em`<br>`processo_sancionador.TermoNotificacao.emitido_em` | `emitido_em` só quando o termo tem o TN e o relatório assinados; senão fica vazio (pendente de emissão). |
| `coluna:termos_notificacao.data_inicio_prazo` | 5 linhas | `processo_sancionador.TermoNotificacao.inicio_prazo` |  |
| `coluna:termos_notificacao.data_maxima_resposta` | 5 linhas | `processo_sancionador.TermoNotificacao.data_limite` | Migrada como está; a conferência compara com início + prazo e lista as diferenças, sem recalcular. |
| `coluna:termos_notificacao.data_protocolo` | 5 linhas | `processo_sancionador.TermoNotificacao.data_protocolo` |  |
| `coluna:termos_notificacao.data_recebimento_resposta` | 5 linhas | `processo_sancionador.TermoNotificacao.resposta_recebida_em` |  |
| `coluna:termos_notificacao.fiscalizacao_id` | 5 linhas | `processo_sancionador.ProcessoSancionador.fiscalizacao` | As determinações da fiscalização viram os retratos notificados (`DeterminacaoNotificada`), na ordem do número. |
| `coluna:termos_notificacao.fluxo_manual` | 5 linhas | `processo_sancionador.TermoNotificacao.fluxo` | `true` → `manual`; `false` → `portal`. |
| `coluna:termos_notificacao.id` | 5 linhas | `processo_sancionador.ProcessoSancionador.id`<br>`processo_sancionador.TermoNotificacao.id` | O mesmo identificador no processo e no termo. |
| `coluna:termos_notificacao.municipio_id` | 5 linhas | `processo_sancionador.ProcessoSancionador.municipio` |  |
| `coluna:termos_notificacao.numero_am` | 5 linhas | `processo_sancionador.AnaliseManifestacao.numero` | Termo com número de AM ganha a AM versão 1, concluída, com as análises das respostas; a sequência de AM começa no maior número migrado. |
| `coluna:termos_notificacao.numero_processo` | 5 linhas | `processo_sancionador.ProcessoSancionador.numero_processo` |  |
| `coluna:termos_notificacao.numero_rfp` | 5 linhas | `processo_sancionador.TermoNotificacao.numero_relatorio` |  |
| `coluna:termos_notificacao.numero_termo_notificacao` | 5 linhas | `processo_sancionador.TermoNotificacao.numero` | Migrado como está; número repetido ou fora do formato vai para o relatório de conferência. A sequência de TN de cada diretoria e ano começa no maior número migrado. |
| `coluna:termos_notificacao.observacoes` | 5 linhas | `processo_sancionador.TermoNotificacao.observacoes` |  |
| `coluna:termos_notificacao.prazo_resposta_dias` | 5 linhas | `processo_sancionador.TermoNotificacao.prazo_resposta_dias` |  |
| `coluna:termos_notificacao.prestador_servico_id` | 5 linhas | `processo_sancionador.ProcessoSancionador.entidade` |  |
| `coluna:termos_notificacao.recebida_no_prazo` | 5 linhas | `processo_sancionador.TermoNotificacao.resposta_no_prazo` |  |
| `coluna:termos_notificacao.status` | 5 linhas | `processo_sancionador.TermoNotificacao.situacao_legado`<br>`processo_sancionador.ProcessoSancionador.etapa` | O valor gravado fica em `situacao_legado`; a etapa é deduzida dos dados (AM concluída → autos e defesa ou encerrado; resposta recebida → análise da manifestação; senão notificação). A conferência lista a situação calculada que difere da gravada. |
| `coluna:termos_notificacao.tipo_relatorio` | 5 linhas | `processo_sancionador.TermoNotificacao.tipo_relatorio` |  |
| `coluna:termos_notificacao.updated_at` | 5 linhas | `processo_sancionador.ProcessoSancionador.atualizado_em`<br>`processo_sancionador.TermoNotificacao.atualizado_em` |  |

## CATERS

Mapa: `anotacoes/migracao/caters.toml` · data-model: `specs/010-modulo-caters/data-model.md`

- Ordem de carga: depois de core, fiscalização (recomendações e determinações com os mesmos identificadores) e do comando configurar_caters (research T12).
- Produção tem 2 processos e 27 recomendações; as demais tabelas estão vazias e são conferidas com 0 linhas.
- Os 4 arquivos do CATERS no repositório de documentos de entidades viram documentos dos processos, com checksum conferido (mapa do core, bucket documentos-prestadores).

| Objeto | Volume em produção | Destino | Transformação ou motivo do descarte |
|---|---|---|---|
| `coluna:caters_analysis_history.action_type` | 0 linhas | `caters.EventoProcesso.tipo` | Os 7 valores de hoje existem na lista nova com o mesmo código. |
| `coluna:caters_analysis_history.created_at` | 0 linhas | `caters.EventoProcesso.criado_em` |  |
| `coluna:caters_analysis_history.description` | 0 linhas | `caters.EventoProcesso.descricao` |  |
| `coluna:caters_analysis_history.id` | 0 linhas | `caters.EventoProcesso.id` |  |
| `coluna:caters_analysis_history.new_fatal_date` | 0 linhas | `caters.EventoProcesso.novo_prazo` |  |
| `coluna:caters_analysis_history.performed_by` | 0 linhas | `caters.EventoProcesso.autor` |  |
| `coluna:caters_analysis_history.process_id` | 0 linhas | `caters.EventoProcesso.processo` |  |
| `coluna:caters_analysis_history.related_document_url` | 0 linhas | `caters.EventoProcesso.documento` | Endereço ligado ao documento do processo com o mesmo arquivo; sem documento, vira documento `extra`. |
| `coluna:caters_deadline_extensions.calculated_date` | 0 linhas | `caters.Dilacao.novo_prazo` | Conferido contra referência + dias; divergência vai para o relatório de conferência. |
| `coluna:caters_deadline_extensions.created_at` | 0 linhas | `caters.Dilacao.criado_em` |  |
| `coluna:caters_deadline_extensions.created_by` | 0 linhas | `caters.Dilacao.criado_por` |  |
| `coluna:caters_deadline_extensions.extension_days` | 0 linhas | `caters.Dilacao.dias` |  |
| `coluna:caters_deadline_extensions.id` | 0 linhas | `caters.Dilacao.id` |  |
| `coluna:caters_deadline_extensions.municipality_protocol` | 0 linhas | `caters.Dilacao.protocolo_municipio` |  |
| `coluna:caters_deadline_extensions.municipality_request_at` | 0 linhas | `caters.Dilacao.pedido_em` |  |
| `coluna:caters_deadline_extensions.notes` | 0 linhas | `caters.Dilacao.observacoes` |  |
| `coluna:caters_deadline_extensions.process_id` | 0 linhas | `caters.Dilacao.processo` |  |
| `coluna:caters_deadline_extensions.reference_date` | 0 linhas | `caters.Dilacao.data_referencia` |  |
| `coluna:caters_deadline_extensions.status` | 0 linhas | `caters.Dilacao.decisao` | `aprovado` → `aprovada`; `negado` → `negada`. |
| `coluna:caters_deadline_extensions.updated_at` | 0 linhas | descartado | A dilação passa a ser imutável (research T6); a tabela está vazia. |
| `coluna:caters_extra_documents.created_at` | 0 linhas | `caters.DocumentoProcesso.criado_em` |  |
| `coluna:caters_extra_documents.created_by` | 0 linhas | `caters.DocumentoProcesso.criado_por` |  |
| `coluna:caters_extra_documents.description` | 0 linhas | `caters.DocumentoProcesso.descricao` |  |
| `coluna:caters_extra_documents.file_url` | 0 linhas | `caters.DocumentoProcesso.arquivo` | Como as colunas de endereço do processo, com o tipo `extra`. |
| `coluna:caters_extra_documents.id` | 0 linhas | `caters.DocumentoProcesso.id` |  |
| `coluna:caters_extra_documents.process_id` | 0 linhas | `caters.DocumentoProcesso.processo` |  |
| `coluna:caters_extra_documents.title` | 0 linhas | `caters.DocumentoProcesso.titulo` |  |
| `coluna:caters_municipality_responses.created_at` | 0 linhas | `caters.RespostaMunicipio.criado_em` |  |
| `coluna:caters_municipality_responses.created_by` | 0 linhas | `caters.RespostaMunicipio.criado_por` |  |
| `coluna:caters_municipality_responses.cronograma_status` | 0 linhas | `caters.RespostaMunicipio.situacao_cronograma` |  |
| `coluna:caters_municipality_responses.id` | 0 linhas | `caters.RespostaMunicipio.id` |  |
| `coluna:caters_municipality_responses.notes` | 0 linhas | `caters.RespostaMunicipio.observacoes` |  |
| `coluna:caters_municipality_responses.process_id` | 0 linhas | `caters.RespostaMunicipio.processo` |  |
| `coluna:caters_municipality_responses.protocol_number` | 0 linhas | `caters.RespostaMunicipio.protocolo` |  |
| `coluna:caters_municipality_responses.received_at` | 0 linhas | `caters.RespostaMunicipio.recebida_em` |  |
| `coluna:caters_municipality_responses.updated_at` | 0 linhas | `caters.RespostaMunicipio.atualizado_em` |  |
| `coluna:caters_notification_reads.created_at` | 0 linhas | descartado | Substituída pela central de avisos do core (R-caters-012); a tabela está vazia. |
| `coluna:caters_notification_reads.id` | 0 linhas | descartado | Substituída pela central de avisos do core (R-caters-012); a tabela está vazia. |
| `coluna:caters_notification_reads.key` | 0 linhas | descartado | Substituída pela central de avisos e pelo controle de um aviso por prazo (research T9); a tabela está vazia. |
| `coluna:caters_notification_reads.read_at` | 0 linhas | descartado | Substituída pela central de avisos do core (R-caters-012); a tabela está vazia. |
| `coluna:caters_notification_reads.user_id` | 0 linhas | descartado | Substituída pela central de avisos do core (R-caters-012); a tabela está vazia. |
| `coluna:caters_processes.ar_digitalizado_url` | 2 linhas | `caters.DocumentoProcesso.arquivo`<br>`caters.DocumentoProcesso.tipo` | Como o relatório, com o tipo `ar_digitalizado`. |
| `coluna:caters_processes.ar_protocol_number` | 2 linhas | `caters.ProcessoAcompanhamento.ar_protocolo` |  |
| `coluna:caters_processes.ar_received_at` | 2 linhas | `caters.ProcessoAcompanhamento.ar_recebido_em` |  |
| `coluna:caters_processes.ar_sent_at` | 2 linhas | `caters.ProcessoAcompanhamento.ar_enviado_em` |  |
| `coluna:caters_processes.ar_tracking_code` | 2 linhas | `caters.ProcessoAcompanhamento.ar_codigo_rastreio` |  |
| `coluna:caters_processes.created_at` | 2 linhas | `caters.ProcessoAcompanhamento.criado_em` |  |
| `coluna:caters_processes.created_by` | 2 linhas | `caters.ProcessoAcompanhamento.criado_por` |  |
| `coluna:caters_processes.cronograma_url` | 2 linhas | `caters.DocumentoProcesso.arquivo`<br>`caters.DocumentoProcesso.tipo` | Como o relatório, com o tipo `cronograma`. |
| `coluna:caters_processes.fatal_date` | 2 linhas | `caters.ProcessoAcompanhamento.data_fatal` |  |
| `coluna:caters_processes.fiscalizacao_id` | 2 linhas | `caters.ProcessoAcompanhamento.fiscalizacao` |  |
| `coluna:caters_processes.id` | 2 linhas | `caters.ProcessoAcompanhamento.id` |  |
| `coluna:caters_processes.municipality` | 2 linhas | `caters.ProcessoAcompanhamento.municipio`<br>`caters.ProcessoAcompanhamento.municipio_texto_original` | Ligado ao município do core pelo nome, sem diferenciar maiúsculas e acentos; o texto fica guardado. Sem correspondência, o município fica vazio e o caso vai para `legado` e para o relatório de conferência. |
| `coluna:caters_processes.object` | 2 linhas | `caters.ProcessoAcompanhamento.objeto` |  |
| `coluna:caters_processes.observations` | 2 linhas | `caters.ProcessoAcompanhamento.observacoes` |  |
| `coluna:caters_processes.oficio_resposta_url` | 2 linhas | `caters.DocumentoProcesso.arquivo`<br>`caters.DocumentoProcesso.tipo` | Como o relatório, com o tipo `oficio_resposta`. |
| `coluna:caters_processes.process_number` | 2 linhas | `caters.ProcessoAcompanhamento.numero_processo` |  |
| `coluna:caters_processes.relatorio_url` | 2 linhas | `caters.DocumentoProcesso.arquivo`<br>`caters.DocumentoProcesso.tipo` | Endereço vira documento do tipo `relatorio`: o caminho é extraído do endereço público ou assinado, o arquivo é copiado para o repositório privado e o checksum conferido. |
| `coluna:caters_processes.report_sent_at` | 2 linhas | `caters.ProcessoAcompanhamento.relatorio_enviado_em` |  |
| `coluna:caters_processes.status` | 2 linhas | `caters.ProcessoAcompanhamento.situacao` |  |
| `coluna:caters_processes.technician_name` | 2 linhas | `caters.ProcessoAcompanhamento.tecnico`<br>`caters.ProcessoAcompanhamento.tecnico_texto_original` | Ligado ao usuário pelo nome, só entre usuários da CATERS; o texto fica guardado. Sem correspondência única, o técnico fica vazio e o caso vai para `legado`. |
| `coluna:caters_processes.termo_notificacao_url` | 2 linhas | `caters.DocumentoProcesso.arquivo`<br>`caters.DocumentoProcesso.tipo` | Como o relatório, com o tipo `termo_notificacao`. |
| `coluna:caters_processes.titular_response_due_at` | 2 linhas | `caters.ProcessoAcompanhamento.prazo_resposta_informado` | Vazio continua vazio: o prazo efetivo passa a ser calculado (research T5). |
| `coluna:caters_processes.updated_at` | 2 linhas | `caters.ProcessoAcompanhamento.atualizado_em` |  |
| `coluna:caters_recommendations.category` | 27 linhas | `caters.RecomendacaoAcompanhada.categoria` |  |
| `coluna:caters_recommendations.created_at` | 27 linhas | `caters.RecomendacaoAcompanhada.criado_em` |  |
| `coluna:caters_recommendations.created_by` | 27 linhas | `caters.RecomendacaoAcompanhada.criado_por` |  |
| `coluna:caters_recommendations.description` | 27 linhas | `caters.RecomendacaoAcompanhada.descricao` |  |
| `coluna:caters_recommendations.determinacao_id` | 27 linhas | `caters.RecomendacaoAcompanhada.origem_tipo`<br>`caters.RecomendacaoAcompanhada.origem_id` | Preenchido: origem `determinacao` com o mesmo identificador. |
| `coluna:caters_recommendations.evidence_url` | 27 linhas | `caters.RecomendacaoAcompanhada.evidencia`<br>`caters.DocumentoProcesso.arquivo` | Endereço de arquivo do repositório vira documento do processo do tipo `evidencia`, ligado à recomendação; outro texto vai para `observacoes`, com a marca da origem. |
| `coluna:caters_recommendations.fulfilled_at` | 27 linhas | `caters.RecomendacaoAcompanhada.cumprida_em` |  |
| `coluna:caters_recommendations.id` | 27 linhas | `caters.RecomendacaoAcompanhada.id` |  |
| `coluna:caters_recommendations.item_code` | 27 linhas | `caters.RecomendacaoAcompanhada.codigo_item` |  |
| `coluna:caters_recommendations.notes` | 27 linhas | `caters.RecomendacaoAcompanhada.observacoes` |  |
| `coluna:caters_recommendations.priority` | 27 linhas | `caters.RecomendacaoAcompanhada.prioridade` |  |
| `coluna:caters_recommendations.process_id` | 27 linhas | `caters.RecomendacaoAcompanhada.processo` |  |
| `coluna:caters_recommendations.promised_due_at` | 27 linhas | `caters.RecomendacaoAcompanhada.prazo_prometido` | Migrado como está, mesmo vazio nas determinações importadas: não é recalculado (research T12). |
| `coluna:caters_recommendations.recomendacao_id` | 27 linhas | `caters.RecomendacaoAcompanhada.origem_tipo`<br>`caters.RecomendacaoAcompanhada.origem_id` | Preenchido: origem `recomendacao` com o mesmo identificador (a fiscalização migra as recomendações com os identificadores de produção). Vazio nas duas colunas de origem: `manual`. |
| `coluna:caters_recommendations.status` | 27 linhas | `caters.RecomendacaoAcompanhada.em_andamento`<br>`caters.RecomendacaoAcompanhada.situacao_legado` | `em_andamento` vira a marca da equipe; o valor gravado fica em `situacao_legado`. A conferência lista as recomendações cuja situação calculada difere da gravada (ex.: vencidas gravadas como pendentes). |
| `coluna:caters_recommendations.titular_response` | 27 linhas | `caters.RecomendacaoAcompanhada.resposta_titular` |  |
| `coluna:caters_recommendations.updated_at` | 27 linhas | `caters.RecomendacaoAcompanhada.atualizado_em` |  |

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
