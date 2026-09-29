<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Repositórios de arquivos

8 buckets · 1554 arquivos · 1023883073 bytes.

## documentos-autos

- **Dono**: módulo **processo_sancionador**
- **Público**: não · **Limite de tamanho**: sem limite · **Tipos aceitos**: qualquer
- **Volume**: 5 arquivos, 9795622 bytes (2026-03-30T17:25:00.998358+00:00 a 2026-03-30T18:03:44.793953+00:00)

**Finalidade**: Documentos dos autos de infração e das remessas de autos à entidade. Privado, sem limite de
tamanho nem de tipo. Em produção: 5 arquivos (9,8 MB), todos de 2026-03-30.

Caminhos gravados pelo código:

- `autos_infracao/<auto>/parecer/<ts>-<rand>.pdf`: parecer técnico assinado (Gestão de autos e
  Pareceres técnicos);
- `autos_infracao/<auto>/defesa/<ts>-<rand>.<ext>`: anexos da defesa, enviados pelo portal;
- `autos_infracao/<auto>/ai_assinado_prestador/<ts>-<rand>.pdf`: AI assinado pela entidade,
  enviado pelo portal. Nenhuma das colunas que o portal procura para guardar a referência existe
  em produção, então o arquivo fica sem referência;
- `remessas_ai/<remessa>/lista/<ts>-<rand>.pdf`: lista da remessa, gerada pela equipe;
- `remessas_ai/<remessa>/oficio_defesa/<ts>-<rand>.pdf`: ofício de defesa, enviado pelo portal;
- `<auto>/<tipo>_<ts>.pdf` e `<auto>/<ts>.<ext>`: AI assinado e protocolos, pelo fluxo antigo de
  envio (componente FluxoUploadDocumentos e botão da Gestão de autos).

Há em produção um arquivo em `remessas_ai/<remessa>/recebimento/`, caminho que o código atual não
grava mais. *(fonte: src/lib/offline/repository.ts:1690, src/pages/GestaoAutos.jsx:243, src/pages/GestaoAutos.jsx:467, src/pages/GestaoAutos.jsx:188, src/pages/PareceresTecnicos.jsx:136, src/pages/PortalPrestadorHome.jsx:274, src/pages/PortalPrestadorHome.jsx:569, src/pages/PortalPrestadorHome.jsx:634, src/pages/PortalPrestadorHome.jsx:701, src/components/autos/FluxoUploadDocumentos.jsx:23)*

| Padrão de caminho | Arquivos |
|---|---:|
| `autos_infracao/<uuid>/defesa/<arquivo>.pdf` | 2 |
| `<uuid>/<arquivo>.pdf` | 1 |
| `remessas_ai/<uuid>/lista/<arquivo>.pdf` | 1 |
| `remessas_ai/<uuid>/recebimento/<arquivo>.pdf` | 1 |

- **Funções que citam o bucket**: —
- **Referenciado por (anotado)**: coluna:autos_infracao.arquivo_url (src/components/autos/FluxoUploadDocumentos.jsx:34, src/pages/GestaoAutos.jsx:193), coluna:autos_infracao.arquivo_protocolo_oficio (src/components/autos/FluxoUploadDocumentos.jsx:36), coluna:autos_infracao.arquivo_protocolo_ai_recebido (src/components/autos/FluxoUploadDocumentos.jsx:38), coluna:autos_infracao.arquivo_defesa_oficio (src/components/autos/FluxoUploadDocumentos.jsx:44), coluna:autos_infracao.arquivo_defesa (src/components/autos/FluxoUploadDocumentos.jsx:46), coluna:autos_infracao.defesa_arquivos (src/pages/PortalPrestadorHome.jsx:636), coluna:pareceres_tecnicos.arquivo_parecer_assinado_url (src/pages/PareceresTecnicos.jsx:144, src/pages/GestaoAutos.jsx:251), coluna:remessas_ai.arquivo_lista_pdf_url (src/pages/GestaoAutos.jsx:472), coluna:remessas_ai.arquivo_oficio_defesa_url (src/pages/PortalPrestadorHome.jsx:705)

**Políticas de acesso:**

- **Storage delete authenticated** — DELETE para authenticated: Usuário com perfil ativo apaga arquivos dos mesmos seis buckets. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage insert authenticated** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para os mesmos seis buckets (um deles inexistente). *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage read authenticated** — SELECT para authenticated: Usuário com perfil ativo lê arquivos de `evidencias-determinacoes`, `relatorios_fiscalizacao`,
`fotos_fiscalizacao`, `documentos-prestadores`, `documentos-autos` e de `termos-notificacao`, bucket
que não existe. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage update authenticated** — UPDATE para authenticated: Usuário com perfil ativo substitui arquivos nos mesmos seis buckets, sem poder levá-los para outro bucket. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-autos authenticated all 1fhxxna_0** — SELECT para authenticated: Usuário com perfil ativo lê qualquer arquivo de `documentos-autos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-autos authenticated all 1fhxxna_1** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para `documentos-autos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-autos authenticated all 1fhxxna_2** — UPDATE para authenticated: Usuário com perfil ativo substitui qualquer arquivo de `documentos-autos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-autos authenticated all 1fhxxna_3** — DELETE para authenticated: Usuário com perfil ativo apaga qualquer arquivo de `documentos-autos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*

## documentos-prestadores

- **Dono**: módulo **core**
- **Público**: não · **Limite de tamanho**: sem limite · **Tipos aceitos**: qualquer
- **Volume**: 4 arquivos, 7581121 bytes (2026-07-09T18:38:53.104847+00:00 a 2026-07-09T19:40:18.709093+00:00)

**Finalidade**: Documentos das entidades reguladas. Privado, sem limite de tamanho nem de tipo. Dois usos:

- **Cadastro da entidade** (core): anexos da tela da entidade, em `<entidade>/<data>.<ext>`,
  listados na coluna `documentos` de `prestadores_servico`. Excluir o anexo apaga o arquivo.
- **CATERS**: documentos do processo, em `caters/<processo>/<tipo>/<ts>.<ext>` (termo, relatório,
  AR, cronograma, ofício de resposta, documentos extras). O código grava o endereço público do
  arquivo, que não abre porque o bucket é privado; a tela recupera bucket e caminho desse
  endereço e assina na hora de abrir. A fila de IA do CATERS lê o PDF daqui.

Em produção: 4 arquivos (7,6 MB), todos do CATERS, de 2026-07-09. *(fonte: src/pages/DetalhePrestador.jsx:186, src/pages/DetalhePrestador.jsx:211, src/lib/caters/documents.js:3, src/lib/caters/documents.js:30, src/lib/caters/documents.js:42)*

| Padrão de caminho | Arquivos |
|---|---:|
| `caters/<uuid>/relatorio/<arquivo>.pdf` | 2 |
| `caters/<uuid>/ar/<arquivo>.pdf` | 1 |
| `caters/<uuid>/termo/<arquivo>.pdf` | 1 |

- **Funções que citam o bucket**: —
- **Referenciado por (anotado)**: coluna:prestadores_servico.documentos (src/pages/DetalhePrestador.jsx:191), coluna:caters_processes.termo_notificacao_url (src/lib/caters/documents.js:30), coluna:caters_processes.relatorio_url (src/lib/caters/documents.js:30), coluna:caters_processes.ar_digitalizado_url (src/lib/caters/documents.js:30), coluna:caters_processes.cronograma_url (src/lib/caters/documents.js:30), coluna:caters_processes.oficio_resposta_url (src/lib/caters/documents.js:30), coluna:caters_extra_documents.file_url (src/lib/caters/documents.js:30), coluna:caters_ai_jobs.storage_bucket e storage_path

**Políticas de acesso:**

- **Storage delete authenticated** — DELETE para authenticated: Usuário com perfil ativo apaga arquivos dos mesmos seis buckets. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage insert authenticated** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para os mesmos seis buckets (um deles inexistente). *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage read authenticated** — SELECT para authenticated: Usuário com perfil ativo lê arquivos de `evidencias-determinacoes`, `relatorios_fiscalizacao`,
`fotos_fiscalizacao`, `documentos-prestadores`, `documentos-autos` e de `termos-notificacao`, bucket
que não existe. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage update authenticated** — UPDATE para authenticated: Usuário com perfil ativo substitui arquivos nos mesmos seis buckets, sem poder levá-los para outro bucket. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-prestadores authenticated all 1rt2ofe_0** — SELECT para authenticated: Usuário com perfil ativo lê qualquer arquivo de `documentos-prestadores`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-prestadores authenticated all 1rt2ofe_1** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para `documentos-prestadores`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-prestadores authenticated all 1rt2ofe_2** — DELETE para authenticated: Usuário com perfil ativo apaga qualquer arquivo de `documentos-prestadores`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-prestadores authenticated all 1rt2ofe_3** — UPDATE para authenticated: Usuário com perfil ativo substitui qualquer arquivo de `documentos-prestadores` (usado pelo CATERS, que envia com substituição). *(fonte: supabase/migrations/138_fix_open_policies.sql:91, src/lib/caters/documents.js:33)*

## documentos-termos

- **Dono**: módulo **processo_sancionador**
- **Público**: não · **Limite de tamanho**: sem limite · **Tipos aceitos**: application/pdf
- **Volume**: 28 arquivos, 106778327 bytes (2026-03-18T15:38:26.307967+00:00 a 2026-08-11T14:30:43.077524+00:00)

**Finalidade**: Documentos dos termos de notificação (TN) e das análises de manifestação (AM). Privado, aceita
só PDF, sem limite de tamanho. Em produção: 28 arquivos (107 MB), de 2026-03-18 a 2026-08-11.

Caminhos gravados pelo código:

- `termos_notificacao/<ts>_<rand>.<ext>`: pela tela Gerenciar termos (TN e relatório assinados
  pela AGEMS, TN assinado pela entidade, AR e ofícios de protocolo e de resposta);
- `termos_notificacao/<tipo>/<termo>/<ts>-<rand>.<ext>`, com `<tipo>` = `tn_prestador` e
  `termo_envio` (portal) ou `am_assinada` (Análise da manifestação).

O código não fixa o bucket: tenta uma lista de nomes (`termos-notificacao`, `documentos-termos`,
`documentos`...) e usa o primeiro que aceita o envio. Em produção só este existe. No sistema novo,
o repositório dos termos é fixo. *(fonte: src/lib/offline/repository.ts:1641, src/pages/GerenciarTermos.jsx:231, src/pages/ResponderTermo.jsx:667, src/pages/ResponderTermo.jsx:906, src/pages/AnaliseManifestacao.jsx:825)*

| Padrão de caminho | Arquivos |
|---|---:|
| `termos_notificacao/<arquivo>.pdf` | 21 |
| `termos_notificacao/termo_envio/<uuid>/<arquivo>.pdf` | 4 |
| `termos_notificacao/tn_prestador/<uuid>/<arquivo>.pdf` | 2 |
| `termos_notificacao/am_assinada/<uuid>/<arquivo>.pdf` | 1 |

- **Funções que citam o bucket**: —
- **Referenciado por (anotado)**: coluna:termos_notificacao.arquivo_url (src/pages/GerenciarTermos.jsx:346), coluna:termos_notificacao.arquivo_rfp_url (src/pages/GerenciarTermos.jsx:380), coluna:termos_notificacao.arquivo_tn_prestador_url (src/pages/ResponderTermo.jsx:667), coluna:termos_notificacao.arquivo_protocolo_url (src/pages/GerenciarTermos.jsx:1400), coluna:termos_notificacao.arquivo_oficio_protocolo (src/pages/GerenciarTermos.jsx:1401), coluna:termos_notificacao.arquivo_resposta_url (src/pages/GerenciarTermos.jsx:1575), coluna:termos_notificacao.arquivo_oficio_resposta (src/pages/GerenciarTermos.jsx:1576), coluna:termos_notificacao.arquivo_am_assinada_url (src/pages/AnaliseManifestacao.jsx:828), coluna:termos_notificacao.arquivos_resposta (src/pages/ResponderTermo.jsx:908)

**Políticas de acesso:**

- **documentos-termos authenticated all 16irk4e_0** — SELECT para authenticated: Usuário com perfil ativo lê qualquer arquivo de `documentos-termos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-termos authenticated all 16irk4e_1** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para `documentos-termos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-termos authenticated all 16irk4e_2** — DELETE para authenticated: Usuário com perfil ativo apaga qualquer arquivo de `documentos-termos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **documentos-termos authenticated all 16irk4e_3** — UPDATE para authenticated: Usuário com perfil ativo substitui qualquer arquivo de `documentos-termos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **tn_delete_authenticated** — DELETE para authenticated: Repete `16irk4e_2`: usuário com perfil ativo apaga arquivos de `documentos-termos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **tn_update_authenticated** — UPDATE para authenticated: Repete `16irk4e_3`: usuário com perfil ativo substitui arquivos de `documentos-termos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **tn_upload_authenticated** — INSERT para authenticated: Repete `16irk4e_1`: usuário com perfil ativo envia arquivos para `documentos-termos`. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*

## evidencias-determinacoes

- **Dono**: módulo **processo_sancionador**
- **Público**: não · **Limite de tamanho**: sem limite · **Tipos aceitos**: qualquer
- **Volume**: 20 arquivos, 31601020 bytes (2026-03-18T14:22:45.864895+00:00 a 2026-03-30T16:12:58.545821+00:00)

**Finalidade**: Evidências que a entidade anexa às respostas das determinações, pelo portal, em
`<determinação>/<ts>-<rand>.<ext>` (fotos e PDFs). Privado, sem limite de tamanho nem de tipo.
Em produção: 20 arquivos (31,6 MB), de 2026-03-18 a 2026-03-30, dados de teste.

Excluir a fiscalização apaga as evidências das suas respostas. Há no código um envio de
assinatura do termo para `assinaturas/<termo>/`, que nenhuma tela chama. *(fonte: src/lib/offline/repository.ts:1616, src/lib/offline/repository.ts:1629, src/pages/ResponderTermo.jsx:315, src/lib/storageCleanup.js:324)*

| Padrão de caminho | Arquivos |
|---|---:|
| `<uuid>/<arquivo>.jpg` | 16 |
| `<uuid>/<arquivo>.pdf` | 4 |

- **Funções que citam o bucket**: —
- **Referenciado por (anotado)**: coluna:respostas_determinacao.evidencias (src/pages/ResponderTermo.jsx:315)

**Políticas de acesso:**

- **Storage delete authenticated** — DELETE para authenticated: Usuário com perfil ativo apaga arquivos dos mesmos seis buckets. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage insert authenticated** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para os mesmos seis buckets (um deles inexistente). *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage read authenticated** — SELECT para authenticated: Usuário com perfil ativo lê arquivos de `evidencias-determinacoes`, `relatorios_fiscalizacao`,
`fotos_fiscalizacao`, `documentos-prestadores`, `documentos-autos` e de `termos-notificacao`, bucket
que não existe. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage update authenticated** — UPDATE para authenticated: Usuário com perfil ativo substitui arquivos nos mesmos seis buckets, sem poder levá-los para outro bucket. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **p_evid_write** — ALL para authenticated: Usuário com perfil ativo lê, envia, substitui e apaga qualquer arquivo de
`evidencias-determinacoes` (uma política para todas as operações). *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*

## fotos_fiscalizacao

- **Dono**: módulo **fiscalizacao**
- **Público**: não · **Limite de tamanho**: sem limite · **Tipos aceitos**: qualquer
- **Volume**: 1445 arquivos, 460593664 bytes (2026-07-21T16:25:13.055595+00:00 a 2026-09-25T12:08:05.310592+00:00)

**Finalidade**: Fotos das unidades fiscalizadas. Privado, sem limite de tamanho nem de tipo. É o maior bucket:
1.445 arquivos (461 MB), desde 2026-07-21.

A fila de fotos do aparelho envia cada foto em `fiscalizacoes/<fiscalização>/<unidade>/<foto>.jpg`
(com marca d'água) e, quando há, a versão sem marca d'água em `..._original.jpg`; depois grava a
lista na unidade. Na DTR, fotos de ponto novo vão para `fiscalizacoes/<fiscalização>/novo-ponto/`
e são movidas para a unidade quando o ponto é criado. A importação de pacote também envia fotos
para cá. O relatório da fiscalização usa essas fotos.

A migration 044 criou o bucket público; em produção ele é privado. O portal da entidade ainda
monta endereço público para mostrar as fotos das unidades (ResponderTermo), e esse endereço não
abre em bucket privado. *(fonte: src/lib/offline/syncEngine.ts:2180, src/lib/offline/syncEngine.ts:2224, src/lib/offline/syncEngine.ts:2251, src/pages/VistoriarOcorrenciaDTR.jsx:1077, src/pages/ExportarImportar.jsx:189, src/pages/ResponderTermo.jsx:346, supabase/migrations/044_create_storage_bucket.sql:3)*

| Padrão de caminho | Arquivos |
|---|---:|
| `fiscalizacoes/<uuid>/<uuid>/<arquivo>.jpg` | 1439 |
| `fiscalizacoes/<uuid>/novo-ponto/<arquivo>.jpg` | 6 |

- **Funções que citam o bucket**: —
- **Referenciado por (anotado)**: coluna:unidades_fiscalizadas.fotos_unidade (src/lib/offline/syncEngine.ts:2251), coluna:nao_conformidades.fotos (vazia em produção; só a limpeza de arquivos a lê, src/lib/storageCleanup.js:189)

**Políticas de acesso:**

- **Storage delete authenticated** — DELETE para authenticated: Usuário com perfil ativo apaga arquivos dos mesmos seis buckets. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage insert authenticated** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para os mesmos seis buckets (um deles inexistente). *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage read authenticated** — SELECT para authenticated: Usuário com perfil ativo lê arquivos de `evidencias-determinacoes`, `relatorios_fiscalizacao`,
`fotos_fiscalizacao`, `documentos-prestadores`, `documentos-autos` e de `termos-notificacao`, bucket
que não existe. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage update authenticated** — UPDATE para authenticated: Usuário com perfil ativo substitui arquivos nos mesmos seis buckets, sem poder levá-los para outro bucket. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*

## kml-rodovias

- **Dono**: módulo **dtr**
- **Público**: não · **Limite de tamanho**: 10485760 · **Tipos aceitos**: application/vnd.google-earth.kml+xml, application/xml, text/xml, text/plain
- **Volume**: 2 arquivos, 4974232 bytes (2026-07-01T14:07:35.434944+00:00 a 2026-07-07T13:11:20.876852+00:00)

**Finalidade**: Traçado das rodovias (KML) dos contratos da DTR, em `<rodovia>_<8 primeiros caracteres do
contrato>.kml`; reenviar substitui o arquivo. Privado, até 10 MB, só tipos KML/XML/texto. Em
produção: 2 arquivos (5 MB). O aparelho baixa o KML na sincronização para usar o mapa offline. *(fonte: src/lib/offline/repository.ts:400, src/lib/offline/repository.ts:438, src/lib/offline/syncEngine.ts:1872, supabase/migrations/115_dtr_tipos_ocorrencia_e_kml.sql:83)*

| Padrão de caminho | Arquivos |
|---|---:|
| `ms_<n>_<n>.kml` | 2 |

- **Funções que citam o bucket**: —
- **Referenciado por (anotado)**: coluna:contratos.kml_url (src/lib/offline/repository.ts:406)

**Políticas de acesso:**

- **kml_rodovias_authenticated_delete** — DELETE para authenticated: Usuário com perfil ativo apaga KML. *(fonte: supabase/migrations/115_dtr_tipos_ocorrencia_e_kml.sql:103, supabase/migrations/138_fix_open_policies.sql:91)*
- **kml_rodovias_authenticated_insert** — INSERT para authenticated: Usuário com perfil ativo envia KML. A tela de envio é das Definições da DTR, mas a política não restringe papel nem câmara. *(fonte: supabase/migrations/115_dtr_tipos_ocorrencia_e_kml.sql:93, supabase/migrations/138_fix_open_policies.sql:91)*
- **kml_rodovias_authenticated_read** — SELECT para authenticated: Usuário com perfil ativo lê os KML das rodovias. *(fonte: supabase/migrations/115_dtr_tipos_ocorrencia_e_kml.sql:88, supabase/migrations/138_fix_open_policies.sql:91)*
- **kml_rodovias_authenticated_update** — UPDATE para authenticated: Usuário com perfil ativo substitui KML (o envio usa substituição). *(fonte: supabase/migrations/115_dtr_tipos_ocorrencia_e_kml.sql:98, supabase/migrations/138_fix_open_policies.sql:91)*

## logos-entidades

- **Dono**: módulo **core**
- **Público**: **sim** · **Limite de tamanho**: sem limite · **Tipos aceitos**: qualquer
- **Volume**: 7 arquivos, 232086 bytes (2026-06-19T17:09:34.303072+00:00 a 2026-08-03T15:28:31.031793+00:00)

**Finalidade**: Logotipos das entidades, em `<uuid>.<ext>`, usados nas telas e nos relatórios. É o único bucket
público: qualquer pessoa com o endereço abre o arquivo, sem login. Em produção: 7 arquivos
(232 KB). *(fonte: src/pages/PrestadoresServico.jsx:243, src/pages/DetalhePrestador.jsx:152, supabase/migrations/106_dtr_contratos.sql:99)*

| Padrão de caminho | Arquivos |
|---|---:|
| `<uuid>.png` | 7 |

- **Funções que citam o bucket**: —
- **Referenciado por (anotado)**: coluna:prestadores_servico.logo_url (endereço público; src/pages/PrestadoresServico.jsx:252, src/pages/DetalhePrestador.jsx:155)

**Políticas de acesso:**

- **logos_entidades_authenticated_delete** — DELETE para authenticated: Usuário com perfil ativo apaga logotipos. *(fonte: supabase/migrations/106_dtr_contratos.sql:117, supabase/migrations/138_fix_open_policies.sql:91)*
- **logos_entidades_authenticated_insert** — INSERT para authenticated: Usuário com perfil ativo envia logotipos. *(fonte: supabase/migrations/106_dtr_contratos.sql:105, supabase/migrations/138_fix_open_policies.sql:91)*
- **logos_entidades_authenticated_update** — UPDATE para authenticated: Usuário com perfil ativo substitui logotipos. *(fonte: supabase/migrations/106_dtr_contratos.sql:111, supabase/migrations/138_fix_open_policies.sql:91)*
- **logos_entidades_public_access** — SELECT para public: Qualquer pessoa, com ou sem login, lê e lista os logotipos. A migration 138 manteve assim: o
bucket é público e os logotipos aparecem em relatórios. *(fonte: supabase/migrations/106_dtr_contratos.sql:100, supabase/migrations/138_fix_open_policies.sql:88)*

## relatorios_fiscalizacao

- **Dono**: módulo **fiscalizacao**
- **Público**: não · **Limite de tamanho**: 314572800 · **Tipos aceitos**: qualquer
- **Volume**: 43 arquivos, 402327001 bytes (2026-05-22T12:31:34.738195+00:00 a 2026-09-15T16:00:06.343866+00:00)

**Finalidade**: PDF final do relatório de fiscalização, gravado pelo worker de relatórios com a chave de serviço.
Privado, até 300 MB por arquivo. Em produção: 43 arquivos (402 MB), desde 2026-05-22.

Caminho: `fiscalizacoes/<fiscalização>/latest.pdf` quando o relatório sai em uma parte, ou
`latest_part1.pdf`, `latest_part2.pdf`... quando é dividido. Cada geração limpa a pasta antes. A
consulta de situação devolve endereços assinados válidos por 1 hora. Excluir a fiscalização apaga
a pasta. Há em produção um arquivo solto em `fiscalizacoes/`, fora desse padrão. *(fonte: supabase/functions/relatorios_worker/index.ts:26, supabase/functions/relatorios_worker/index.ts:71, supabase/functions/relatorios_status/index.ts:106, src/lib/storageCleanup.js:138)*

| Padrão de caminho | Arquivos |
|---|---:|
| `fiscalizacoes/<uuid>/<arquivo>.pdf` | 42 |
| `fiscalizacoes/<arquivo>` | 1 |

- **Funções que citam o bucket**: —
- **Referenciado por (anotado)**: coluna:relatorios_jobs.storage_path (supabase/functions/relatorios_worker/index.ts:71)

**Políticas de acesso:**

- **Storage delete authenticated** — DELETE para authenticated: Usuário com perfil ativo apaga arquivos dos mesmos seis buckets. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage insert authenticated** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para os mesmos seis buckets (um deles inexistente). *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage read authenticated** — SELECT para authenticated: Usuário com perfil ativo lê arquivos de `evidencias-determinacoes`, `relatorios_fiscalizacao`,
`fotos_fiscalizacao`, `documentos-prestadores`, `documentos-autos` e de `termos-notificacao`, bucket
que não existe. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **Storage update authenticated** — UPDATE para authenticated: Usuário com perfil ativo substitui arquivos nos mesmos seis buckets, sem poder levá-los para outro bucket. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **relatorios_fiscalizacao authenticated all 1760aao_0** — SELECT para authenticated: Usuário com perfil ativo lê qualquer relatório. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **relatorios_fiscalizacao authenticated all 1760aao_1** — DELETE para authenticated: Usuário com perfil ativo apaga qualquer relatório (usado ao excluir a fiscalização). *(fonte: supabase/migrations/138_fix_open_policies.sql:91, src/lib/storageCleanup.js:142)*
- **relatorios_fiscalizacao authenticated all 1760aao_2** — INSERT para authenticated: Usuário com perfil ativo envia arquivos para `relatorios_fiscalizacao`; nenhuma tela faz isso. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
- **relatorios_fiscalizacao authenticated all 1760aao_3** — UPDATE para authenticated: Usuário com perfil ativo substitui qualquer relatório; nenhuma tela faz isso. *(fonte: supabase/migrations/138_fix_open_policies.sql:91)*
