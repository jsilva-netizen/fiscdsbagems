# Feature Specification: Módulo core — identidade, acesso, estrutura organizacional e cadastros de base

**Feature Branch**: `migracao-sisreg` (levantamento do sistema novo; constituição, "Levantamento em specs")

**Created**: 2026-09-30

**Status**: Draft

**Input**: Spec de módulo do core do sistema novo da AGEMS, primeiro módulo da ordem da spec 003
(`specs/003-base-dados-producao/ordem-modulos.md`), escrita no molde
`specs/003-base-dados-producao/formatos/spec-modulo.md`. Fontes: o catálogo do banco de produção
(objetos do módulo `core` no `mapa-rastreabilidade.md`), os achados decididos (`achados.md`) e as
divergências classificadas (`divergencias.md`) da spec 003.

## Contexto

O core é a base de todos os outros módulos: quem são os usuários e o que cada um pode fazer, como
a AGEMS se organiza em diretorias e câmaras técnicas, e os cadastros que todos usam (municípios,
entidades reguladas e seus contratos), além do registro de auditoria.

No sistema atual, esse papel é feito por 7 tabelas, 20 funções e cerca de 40 regras de acesso do
banco, com defeitos conhecidos: cadastro aberto com escalada de privilégio (já corrigido em
produção), isolamento entre câmaras que as regras da equipe anulam, exclusão de usuário que falha,
vínculo do prestador gravado em dois lugares e arquivos acessíveis a qualquer usuário ativo. Esta
spec descreve o comportamento desejado no sistema novo, preservando tudo o que funciona e
registrando, regra a regra, o que muda e por quê.

Fica fora desta spec: o que o prestador vê e faz no portal (módulo portal do prestador), o traçado
KML e os pontos de KM dos contratos (módulo DTR), as regras de acesso específicas de cada tabela
dos outros módulos (cada spec descreve as suas, usando as regras de base daqui), o planejamento anual
de fiscalizações (spec própria, antes da fiscalização), os apps de outras áreas da agência (RH,
financeiro, frotas), que virão depois, e a análise por IA, que não será refeita (A-039). O core
precisa nascer pronto para receber esses apps (R-core-023, R-core-024).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrador cadastra e mantém os usuários (Priority: P1)

O administrador cria o usuário com nome, e-mail, papel e vínculos (diretoria, câmara técnica ou
entidade regulada, conforme o papel). Depois pode alterar esses dados, desativar e reativar o
usuário. Ninguém mais cria usuário, e não existe cadastro feito pela própria pessoa.

**Why this priority**: sem usuários não há sistema; e o cadastro é a porta de entrada que, no
sistema atual, permitiu escalada de privilégio. É a base de todas as outras histórias.

**Independent Test**: o administrador cria um fiscal da CATESA, um diretor da DSB e um prestador
vinculado a uma entidade; cada um consegue entrar e vê só o que o papel permite; o administrador
desativa um deles, e ele perde o acesso.

**Acceptance Scenarios**:

1. **Given** um administrador ativo, **When** ele cria um usuário de papel fiscal com diretoria DSB
   e câmara CATESA, **Then** o usuário é criado ativo, e o e-mail informado recebe as instruções de
   primeiro acesso.
2. **Given** um coordenador ativo, **When** ele tenta criar, alterar o papel, desativar ou excluir
   outro usuário por qualquer meio (tela ou chamada direta ao servidor), **Then** o sistema recusa.
3. **Given** um usuário com registros no sistema (fiscalizações, relatórios, processos), **When** o
   administrador o desativa, **Then** o usuário perde o acesso e todos os registros continuam
   mostrando a autoria dele.
4. **Given** um formulário de criação com papel prestador e sem entidade, **When** o administrador
   salva, **Then** o sistema recusa e diz que o prestador precisa de uma entidade.

---

### User Story 2 - Usuário entra com verificação em duas etapas (Priority: P1)

O usuário entra com e-mail e senha. No primeiro acesso, e sempre que entrar num aparelho que ainda
não usou, recebe um código no e-mail e só entra depois de informá-lo. Num aparelho já confirmado,
entra só com e-mail e senha e continua podendo trabalhar sem rede.

**Why this priority**: o sistema é público e institucional e registra atos com efeito jurídico;
a verificação por código protege contas contra senha vazada. Precisa conviver com o uso offline em
campo.

**Independent Test**: um usuário novo entra pela primeira vez, recebe e informa o código; sai e
entra de novo no mesmo aparelho sem código; entra num segundo aparelho e recebe novo código; com o
primeiro aparelho sem rede, continua abrindo o app com a sessão existente.

**Acceptance Scenarios**:

1. **Given** um usuário que nunca entrou, **When** ele informa e-mail e senha corretos, **Then** o
   sistema envia um código ao e-mail cadastrado e só libera o acesso depois do código correto.
2. **Given** um aparelho já confirmado por esse usuário, **When** ele entra de novo, **Then** não é
   pedido código.
3. **Given** um código vencido ou errado várias vezes, **When** o usuário tenta usá-lo, **Then** o
   acesso é recusado e ele pode pedir um novo código.
4. **Given** um usuário desativado, **When** ele tenta entrar em qualquer aparelho, **Then** o
   acesso é recusado, sem revelar se o e-mail existe.

---

### User Story 3 - Cada usuário só alcança os dados da sua área (Priority: P1)

Fiscal e coordenador trabalham só com os dados da sua câmara técnica; o administrador vê tudo; o
prestador só vê o que é da própria entidade. Sem login, nada é acessível além da entrada no
sistema.

**Why this priority**: o isolamento entre câmaras é fronteira de segurança (constituição,
Princípio III) e foi confirmado como requisito (A-026). No sistema atual, regras de equipe somadas
às regras por câmara anulam o isolamento.

**Independent Test**: com um fiscal da CATESA e um da CATERS, cada um tenta ler e alterar um
registro da outra câmara pela tela e por chamada direta ao servidor; os dois são recusados. O
administrador lê os dois. Uma requisição sem login a qualquer recurso de dados é recusada.

**Acceptance Scenarios**:

1. **Given** um fiscal da CATESA, **When** ele pede um registro da CATERS, **Then** o sistema
   responde como se o registro não existisse.
2. **Given** um administrador, **When** ele pede registros de qualquer câmara, **Then** recebe.
3. **Given** um diretor da DSB, **When** ele entra, **Then** vê os painéis consolidados da DSB; ao
   abrir um registro da CATESA, consegue ler e não consegue alterar; um registro da DTR não aparece.
4. **Given** uma requisição sem login, **When** ela pede qualquer dado, **Then** é recusada; só a
   entrada no sistema, a verificação do código e a recuperação de acesso respondem sem login.
5. **Given** uma regra de acesso qualquer do módulo, **When** ela é removida ou enfraquecida no
   código, **Then** um teste automatizado falha.

---

### User Story 4 - Equipe mantém o cadastro das entidades reguladas (Priority: P2)

A equipe cadastra as entidades reguladas (concessionárias e órgãos públicos), com dados de
identificação, contato, serviços prestados, documentos anexos e logotipo. As entidades são a base
das fiscalizações e dos processos de todos os módulos.

**Why this priority**: todos os módulos seguintes apontam para as entidades; sem elas não há
fiscalização nem processo.

**Independent Test**: um fiscal cadastra uma entidade sem rede, com logotipo e um documento
anexo; ao voltar a rede, a entidade aparece para os demais; um documento anexo só abre para quem
tem acesso à entidade; uma entidade com processos não pode ser excluída, só desativada.

**Acceptance Scenarios**:

1. **Given** um fiscal ativo sem rede, **When** ele cadastra uma entidade, **Then** ela fica
   disponível no aparelho e é enviada ao servidor quando a rede voltar, com o mesmo identificador.
2. **Given** uma entidade com termos, autos ou respostas registrados, **When** alguém tenta
   excluí-la, **Then** o sistema recusa e oferece desativar.
3. **Given** um documento anexo a uma entidade, **When** um usuário sem acesso tenta abri-lo pelo
   endereço, **Then** o arquivo não é entregue.
4. **Given** um arquivo que não é imagem, **When** alguém tenta usá-lo como logotipo, **Then** o
   sistema recusa.

---

### User Story 5 - Equipe mantém os contratos das entidades (Priority: P2)

A equipe registra os contratos (instrumentos) firmados com as entidades reguladas: número, entidade
e vigência. Módulos de diretoria acrescentam o que é deles (a DTR, a rodovia e o traçado).

**Why this priority**: os contratos são a fonte única de instrumentos (constituição, "Fronteiras de
domínio"); hoje só a DTR os usa, e o módulo DTR depende deles.

**Independent Test**: um fiscal registra um contrato para uma entidade; o contrato aparece para a
equipe e não aparece para o prestador; desativar a entidade não apaga o contrato.

**Acceptance Scenarios**:

1. **Given** um fiscal ativo, **When** ele registra um contrato sem número, **Then** o sistema
   recusa.
2. **Given** um usuário prestador, **When** ele pede a lista de contratos, **Then** não recebe
   nenhum (o portal do prestador define o que ele pode ver).
3. **Given** uma entidade com contratos, **When** ela é desativada, **Then** os contratos continuam
   existindo e consultáveis.

---

### User Story 6 - Todos usam os mesmos dados de referência (Priority: P3)

Diretorias, câmaras técnicas e municípios são os mesmos para todos os módulos e aparecem nas listas
de escolha. O administrador é o único que os mantém.

**Why this priority**: são estáveis e pequenos, mas todas as telas dependem deles.

**Independent Test**: um fiscal vê as 3 diretorias, as 10 câmaras e os 79 municípios de MS nas
listas; não consegue alterá-los; o administrador consegue.

**Acceptance Scenarios**:

1. **Given** qualquer usuário ativo, **When** ele abre uma lista de câmaras, **Then** vê as 10
   câmaras em uso, cada uma na sua diretoria, e não vê CATERM nem CATESG.
2. **Given** um coordenador ativo, **When** ele tenta alterar um município, **Then** o sistema
   recusa.

---

### User Story 7 - Consultar quem mudou o quê (Priority: P3)

Toda inclusão, alteração e exclusão nos registros auditados fica gravada com quem fez, quando e os
dados antes e depois. A equipe consulta esse histórico dentro da sua área.

**Why this priority**: os registros têm efeito jurídico; o histórico já existe e é usado no
histórico da fiscalização.

**Independent Test**: um fiscal altera uma entidade; o histórico mostra a alteração com o nome dele,
a data e os valores antes e depois; um fiscal de outra câmara não vê o histórico de registros da
primeira.

**Acceptance Scenarios**:

1. **Given** uma alteração num registro auditado, **When** alguém consulta o histórico, **Then** vê
   quem fez, quando e o que mudou.
2. **Given** um usuário desativado que fez alterações, **When** o histórico é consultado, **Then** o
   nome e o e-mail dele continuam aparecendo.
3. **Given** qualquer usuário, **When** ele tenta alterar ou apagar um registro de auditoria,
   **Then** o sistema recusa.

---

### Edge Cases

- Usuário com o mesmo e-mail de outro já existente: o sistema recusa a criação, inclusive se o
  outro estiver desativado (e-mail é único).
- Administrador tenta desativar a si mesmo, ou o último administrador ativo: o sistema recusa.
- Usuário trocado de câmara: a partir da troca, passa a ver só a câmara nova; os registros que fez
  continuam na câmara onde foram criados.
- Código de verificação não chega (e-mail fora do ar): o usuário pode pedir reenvio; o código
  anterior deixa de valer.
- Aparelho confirmado que fica muito tempo sem rede: continua abrindo o app com a sessão existente;
  ao voltar a rede, se o usuário tiver sido desativado nesse meio tempo, a sessão é encerrada e o
  que estava pendente no aparelho não é descartado (Princípio II; a fila offline é da spec de
  fiscalização).
- Entidade criada offline em dois aparelhos com o mesmo CNPJ: o servidor aceita a primeira e
  sinaliza a segunda como duplicada para a equipe resolver.
- Envio do logotipo falha: a entidade é salva sem logotipo e o envio pode ser refeito; a imagem
  nunca é gravada dentro do cadastro.
- Registro legado sem câmara (produção tem registros assim): recebe câmara na migração de dados;
  os que não puderem ser classificados ficam visíveis só ao administrador até serem classificados.

## Requirements *(mandatory)*

### Functional Requirements

**Usuários e acesso**

- **FR-001**: Somente o administrador MUST poder criar usuários, alterar papel e vínculos,
  desativar e reativar (R-core-001, R-core-007).
- **FR-002**: Todo usuário MUST ter exatamente um papel entre administrador, coordenador, fiscal,
  diretor e prestador, e os vínculos exigidos pelo papel (R-core-002, R-core-003).
- **FR-003**: O primeiro acesso e o acesso por aparelho não confirmado MUST exigir um código enviado
  ao e-mail do usuário (R-core-005, R-core-006).
- **FR-004**: Um usuário desativado MUST perder o acesso, e seus registros MUST manter a autoria
  (R-core-007).
- **FR-005**: O usuário MUST poder alterar só o próprio nome e a própria senha; e-mail, papel e
  vínculos, só o administrador (R-core-008).
- **FR-006**: Sem login, o sistema MUST responder apenas à entrada, à verificação do código e à
  recuperação de acesso (R-core-010).
- **FR-007**: Fiscal e coordenador MUST alcançar apenas registros da própria câmara técnica; o
  administrador, todos (R-core-011).
- **FR-008**: O prestador MUST alcançar apenas dados da entidade que representa (R-core-013); uma
  entidade MAY ter vários usuários prestadores, cada um com a própria conta (R-core-004).
- **FR-008a**: O diretor MUST ver por padrão painéis e indicadores consolidados da sua diretoria e
  MUST poder consultar, só para leitura, qualquer registro das câmaras da sua diretoria (R-core-012).
- **FR-009**: Toda regra de acesso deste módulo MUST ter um teste automatizado que falhe quando a
  regra for violada (constituição, Princípio III).

**Estrutura e cadastros**

- **FR-010**: O sistema MUST ter as 3 diretorias e as 10 câmaras técnicas em uso, cada câmara numa
  diretoria, mantidas só pelo administrador (R-core-014).
- **FR-011**: O sistema MUST ter os 79 municípios de MS com código IBGE, legíveis por todo usuário
  ativo e mantidos só pelo administrador (R-core-015).
- **FR-012**: A equipe MUST poder cadastrar e manter entidades reguladas, inclusive sem rede
  (R-core-016, R-core-017, R-core-021).
- **FR-013**: Entidade com registros vinculados MUST poder ser desativada e MUST NOT poder ser
  excluída (R-core-017).
- **FR-014**: Documentos anexos às entidades MUST ser entregues só a quem tem acesso à entidade
  (R-core-018).
- **FR-015**: O logotipo MUST ser imagem, com tamanho limitado, e pode ser público (R-core-019).
- **FR-016**: A equipe MUST poder registrar contratos das entidades; o prestador MUST NOT alcançá-los
  por este módulo (R-core-020).

**Auditoria**

- **FR-017**: Toda inclusão, alteração e exclusão nos registros auditados MUST gerar um registro
  imutável com autor, data e dados antes e depois (R-core-022).
- **FR-018**: A consulta ao histórico MUST respeitar o isolamento por câmara (R-core-022).

**Extensão para outras áreas**

- **FR-019**: O cadastro de usuários e o controle de acesso MUST aceitar áreas e papéis novos,
  trazidos por apps de outras áreas da agência (ex.: RH, financeiro, frotas), sem alterar as regras dos
  papéis existentes (R-core-023).
- **FR-020**: Sistemas externos integrados MUST acessar o sistema só por credencial de sistema própria,
  com permissão limitada, revogável e auditada (R-core-024).
- **FR-021**: O menu, o início, a lista e o detalhe das entidades e as Definições MUST ser montados
  com o que cada app registra, sem o core depender desses apps, e cada contribuição MUST respeitar o
  acesso do app dono do dado (R-core-025).

### Key Entities

- **Usuário**: pessoa que usa o sistema. Nome, e-mail único, papel, situação (ativo ou desativado),
  diretoria, câmara técnica, entidade (só prestador), aparelhos confirmados.
- **Aparelho confirmado**: aparelho em que o usuário já informou um código válido; dispensa o código
  nos acessos seguintes enquanto não for revogado.
- **Diretoria**: uma das 3 áreas da AGEMS (DSB, DTR, DGE).
- **Câmara técnica**: subdivisão de uma diretoria; organiza o acesso e a navegação.
- **Município**: município de MS, com código IBGE.
- **Entidade regulada**: concessionária ou órgão público que presta serviço regulado; identificação,
  contato, serviços prestados, situação, documentos e logotipo.
- **Documento da entidade**: arquivo anexo a uma entidade, com nome, tipo e data.
- **Contrato**: instrumento firmado com uma entidade; número, entidade e vigência. Módulos de
  diretoria o estendem.
- **Área da agência**: unidade organizacional a que o usuário pertence. Hoje são as diretorias e
  câmaras técnicas; apps de outras áreas (RH, financeiro, frotas) acrescentam as suas.
- **Credencial de sistema**: acesso de um sistema externo integrado (ex.: folha de ponto), com
  permissões próprias, sem ser conta de pessoa.
- **Registro de auditoria**: tabela e registro alterados, operação, autor, data, dados antes e
  depois.

## Regras do módulo

Cada regra segue o molde `formatos/spec-modulo.md` da spec 003. As chaves citadas estão no catálogo
da spec 003 (`specs/003-base-dados-producao/catalogo/`).

### R-core-001 — Só o administrador cria usuários; não há cadastro pela própria pessoa

- **Comportamento desejado**: o administrador cria o usuário informando nome, e-mail, papel e
  vínculos. O usuário é criado ativo e recebe por e-mail as instruções de primeiro acesso (definir
  a senha). Não existe tela nem caminho de cadastro pela própria pessoa, nem lista de entidades
  acessível sem login. O administrador também é o único que altera papel e vínculos de outros
  usuários, desativa e reativa.
- **Comportamento atual**: a pessoa se cadastra sozinha escolhendo papel, diretoria, câmara e
  entidade; o perfil nasce inativo e o administrador aprova. A tela de cadastro lê a lista de
  entidades sem login. O coordenador, pela API, também pode excluir perfis e alterar nome e e-mail
  de qualquer usuário. Até a migration 137, o cadastro aceitava o papel administrador.
- **Motivo da diferença**: sistema público e institucional; cadastro aberto foi a origem da
  escalada de privilégio, e só o administrador deve decidir quem entra e com que papel.
- **Objetos do catálogo**: `tabela:profiles`, `funcao:handle_new_user()`,
  `gatilho:auth.users.on_auth_user_created`, `funcao:enforce_profile_security()`,
  `funcao:prestadores_para_cadastro()`, `politica:public.profiles.Admins e coordenadores gerenciam perfis`,
  `politica:public.profiles.Inserção Própria`, `politica:public.profiles.Admins can update any profile`
- **Origem**: A-038 (decidido), A-011 (decidido), A-022 (decidido).

### R-core-002 — Cinco papéis, um por usuário, sempre explícito

- **Comportamento desejado**: todo usuário tem exatamente um papel: administrador, coordenador,
  fiscal, diretor ou prestador. O papel é obrigatório na criação e não tem valor padrão; qualquer
  outro valor é recusado. O papel só tem efeito enquanto o usuário está ativo. Apps de outras áreas
  da agência acrescentam papéis próprios, sem mudar as regras destes cinco (R-core-023).
- **Comportamento atual**: o papel é texto livre, sem restrição de valores, com padrão `user`, que
  nenhuma regra reconhece; o gatilho de perfil troca papéis não permitidos por `fiscal`.
- **Motivo da diferença**: valor inválido ou padrão implícito cria usuários com acesso indefinido.
- **Objetos do catálogo**: `coluna:profiles.role`, `funcao:get_my_role()`, `funcao:current_role()`,
  `funcao:is_staff()`
- **Origem**: A-037 (decidido); divergência `coluna:profiles.role` (defeito_corrigir).

### R-core-003 — Vínculos obrigatórios por papel

- **Comportamento desejado**:
  - administrador: sem câmara; diretoria opcional;
  - diretor: uma diretoria; sem câmara;
  - coordenador e fiscal: uma diretoria e uma câmara técnica daquela diretoria;
  - prestador: uma entidade regulada; sem diretoria nem câmara.

  O sistema recusa gravar usuário com vínculo faltando, sobrando ou incoerente (câmara de outra
  diretoria).
- **Comportamento atual**: a diretoria tem padrão `dsb` para todos; a câmara é opcional, e
  coordenador ou fiscal sem câmara veem todas as câmaras. As restrições "prestador precisa de
  entidade" e "só prestador tem entidade" existem, mas não valem para as linhas antigas (`NOT VALID`).
- **Motivo da diferença**: o isolamento por câmara é requisito (A-026); usuário da equipe sem câmara
  furaria o isolamento.
- **Objetos do catálogo**: `coluna:profiles.diretoria_id`, `coluna:profiles.camara_tecnica_id`,
  `coluna:profiles.prestador_servico_id`,
  `restricao:profiles.profiles_prestador_must_have_prestador_id`,
  `restricao:profiles.profiles_non_prestador_must_not_have_prestador_id`,
  `restricao:profiles.profiles_camara_tecnica_id_fkey`, `restricao:profiles.profiles_diretoria_id_fkey`
- **Origem**: A-026 (decidido).

### R-core-004 — Vínculo do prestador com a entidade, vários usuários por entidade

- **Comportamento desejado**: o vínculo entre o usuário prestador e a entidade é guardado num único
  lugar (no usuário): cada usuário prestador representa exatamente uma entidade. Uma entidade pode
  ter vários usuários prestadores, cada um com a própria conta, o próprio e-mail e a própria
  verificação por código (R-core-005); o que cada um faz fica registrado com o nome dele
  (R-core-022). Desativar um deles não afeta os demais.
- **Comportamento atual**: o vínculo é gravado nos dois lados (na entidade e no perfil), em passos
  separados e sem transação, e os dois podem divergir. Índices únicos permitem no máximo um usuário
  por entidade.
- **Motivo da diferença**: dois lugares para o mesmo fato geram inconsistência; e a entidade costuma
  ter mais de um responsável. Com um usuário só, a conta seria compartilhada e não se saberia quem
  enviou ou recebeu cada documento (decisão do responsável, 2026-09-30).
- **Objetos do catálogo**: `coluna:profiles.prestador_servico_id`, `coluna:prestadores_servico.user_id`,
  `indice:ux_profiles_prestador_servico_id`, `indice:ux_prestadores_user_id`,
  `restricao:prestadores_servico.prestadores_servico_user_id_fkey`
- **Origem**: A-023 (decidido); divergência `coluna:prestadores_servico.user_id` (producao_vale no
  estado atual).

### R-core-005 — Verificação em duas etapas por código no e-mail

- **Comportamento desejado**: o usuário entra com e-mail e senha. No primeiro acesso, e em todo
  acesso por aparelho não confirmado, o sistema envia ao e-mail do usuário um código numérico de uso
  único, que vale por pouco tempo e aceita poucas tentativas; só depois do código correto o acesso é
  liberado e o aparelho passa a ser confirmado. O usuário pode pedir novo código, e o anterior deixa
  de valer. Mensagens de erro não revelam se o e-mail existe.
- **Comportamento atual**: e-mail e senha, sem segunda etapa. O login recusa perfil inativo com a
  mensagem "aguarda aprovação". A confirmação de e-mail depende da configuração de autenticação
  (fora do banco); as migrations tinham um gatilho que confirmava o e-mail na aprovação, ausente em
  produção.
- **Motivo da diferença**: decisão do responsável: sistema público e institucional com atos de
  efeito jurídico; o código no e-mail protege contra senha vazada e substitui a confirmação de
  e-mail e a aprovação de cadastro.
- **Objetos do catálogo**: `coluna:profiles.ativo`, `coluna:profiles.email`, `papel:anon`
- **Origem**: A-038 (decidido); divergência `funcao:confirm_email_on_approval()`, objeto que só existe
  nas migrations (aguardando_decisao, resolvida pelo A-038).

### R-core-006 — Aparelho confirmado e trabalho sem rede

- **Comportamento desejado**: o aparelho confirmado dispensa o código nos acessos seguintes do mesmo
  usuário e mantém a sessão para uso sem rede. O usuário vê seus aparelhos confirmados e pode
  revogá-los; o administrador pode revogar os de qualquer usuário. Aparelho revogado volta a pedir
  código no próximo acesso com rede.
- **Comportamento atual**: a sessão fica guardada no aparelho e o app funciona offline com ela; a
  sessão de um usuário desativado é encerrada quando o app está online. Não há registro de aparelhos.
- **Motivo da diferença**: a verificação em duas etapas precisa de um conceito de aparelho confirmado
  para não pedir código a cada entrada, sem prejudicar o uso offline (Princípio II).
- **Objetos do catálogo**: `coluna:profiles.ativo`
- **Origem**: A-038 (decidido).

### R-core-007 — Desativar em vez de excluir usuário

- **Comportamento desejado**: o administrador desativa e reativa usuários. Usuário desativado não
  entra, perde as sessões abertas no próximo contato com o servidor e não aparece nas listas de
  escolha, mas continua como autor dos registros que fez. Excluir só é possível para usuário sem
  nenhum registro. O administrador não desativa a si mesmo nem o último administrador ativo.
- **Comportamento atual**: o administrador "exclui" usuários (perfil e conta); a exclusão falha
  inteira se o usuário tiver criado fiscalizações, pedido relatórios, estiver vinculado a uma
  entidade ou tiver registros no CATERS. A desativação existe como "aprovação" (`ativo`).
- **Motivo da diferença**: preservar a autoria dos atos de fiscalização (Princípio I) e acabar com a
  exclusão que falha.
- **Objetos do catálogo**: `funcao:admin_delete_user(p_user_id uuid)`,
  `funcao:admin_delete_user_by_email(p_email text)`, `politica:public.profiles.Admins can delete profiles`,
  `restricao:fiscalizacoes.fiscalizacoes_created_by_fkey`, `coluna:profiles.ativo`
- **Origem**: A-020 (decidido).

### R-core-008 — O usuário altera só o próprio nome e a própria senha

- **Comportamento desejado**: o usuário altera o próprio nome e a própria senha. E-mail (que é o
  canal do código de verificação), papel e vínculos, só o administrador altera.
- **Comportamento atual**: três regras deixam o usuário alterar o próprio perfil, e um gatilho
  desfaz em silêncio as mudanças de papel, aprovação e vínculos; o e-mail do perfil é uma cópia do
  e-mail da conta, sem sincronização.
- **Motivo da diferença**: o e-mail passa a proteger o acesso (R-core-005); regras redundantes e
  reversões silenciosas escondem erros.
- **Objetos do catálogo**: `politica:public.profiles.Edição Própria`,
  `politica:public.profiles.profiles_self_update`,
  `politica:public.profiles.Usuários comuns atualizam apenas dados de contato próprios`,
  `gatilho:public.profiles.trg_enforce_profile_security`, `coluna:profiles.email`,
  `coluna:profiles.full_name`
- **Origem**: A-003 (decidido), A-038 (decidido).

### R-core-009 — Quem vê os dados dos usuários

- **Comportamento desejado**: todo usuário ativo vê o próprio perfil. A equipe (administrador,
  coordenador, fiscal, diretor) vê nome, papel e câmara dos usuários da equipe, para listas e
  atribuições; e-mail e aparelhos, só o administrador e o próprio usuário. O prestador vê só o
  próprio perfil.
- **Comportamento atual**: pelas regras da migration 137, quem tem perfil ativo, inclusive o
  prestador, lê todos os perfis, com e-mail; em produção, até 2026-09-30, qualquer conta logada lia
  todos, mesmo sem aprovação.
- **Motivo da diferença**: o e-mail de todos os usuários não é necessário para a equipe e não deve
  chegar ao prestador.
- **Objetos do catálogo**: `politica:public.profiles.Leitura pública de perfis`,
  `politica:public.profiles.profiles_self_select`, `politica:public.profiles.profiles_admin_all`
- **Origem**: A-012 (decidido).

### R-core-010 — Negar por padrão

- **Comportamento desejado**: todo recurso do sistema exige login, exceto a entrada, a verificação
  do código e a recuperação de acesso. Recurso novo nasce fechado. Nenhuma regra de negócio roda com
  permissão acima da do usuário que a acionou, exceto tarefas internas do sistema, que não são
  acionáveis por usuário.
- **Comportamento atual**: toda tabela nasce com todos os privilégios para quem não tem login, e
  quem protege são as regras por linha; 37 funções rodam com permissão elevada e várias eram
  executáveis sem login até as migrations 137, 138 e 141.
- **Motivo da diferença**: um descuido bastava para expor dados sem login (aconteceu em 5 funções e
  numa view).
- **Objetos do catálogo**: `papel:anon`, `papel:service_role`, `privilegio_padrao:postgres.public.tabela`,
  `privilegio_padrao:postgres.public.funcao`, `funcao:e_chave_de_servico()`
- **Origem**: A-005 (decidido), A-006 (decidido).

### R-core-011 — Isolamento por câmara técnica

- **Comportamento desejado**: todo registro de dados operacionais pertence a uma câmara técnica.
  Fiscal e coordenador alcançam (leem e alteram, conforme as regras de cada módulo) apenas registros
  da própria câmara; registros de outra câmara se comportam como inexistentes. O administrador
  alcança todos. A verificação vale para qualquer caminho de acesso (tela, sincronização offline,
  chamada direta, exportação), não só para a interface. A câmara de um registro novo é informada ou
  deduzida pelo módulo dono do registro; a dedução pelos serviços fiscalizados, que hoje fica no core,
  passa para a spec de fiscalização, com a correção de "Drenagem Urbana" (A-021).
- **Comportamento atual**: fiscal ou coordenador sem câmara vê todas; com câmara, vê a sua e os
  registros sem câmara. Regras de acesso total da equipe (`*_staff_all`) somam-se às regras por
  câmara e anulam o isolamento em várias tabelas.
- **Motivo da diferença**: o isolamento é requisito confirmado e fronteira de segurança
  (constituição, Princípio III).
- **Objetos do catálogo**: `funcao:can_access_camara(row_camara text)`, `funcao:get_my_camara_tecnica()`,
  `funcao:is_staff()`, `funcao:is_caters_user()`,
  `politica:public.unidades_fiscalizadas.unidades_staff_all`,
  `politica:public.autos_infracao.autos_staff_all`, `funcao:camara_from_servicos(p_servicos text[])`
- **Origem**: A-026 (decidido), A-021 (decidido).

### R-core-012 — Alcance do diretor

- **Comportamento desejado**: ao entrar, o diretor vê por padrão os painéis e indicadores
  consolidados da sua diretoria. A partir deles, pode consultar qualquer registro das câmaras da sua
  diretoria (fiscalizações, processos, relatórios), só para leitura: o diretor não cria, altera nem
  exclui registros operacionais. A exceção são as aprovações que outras specs atribuírem a ele, como a
  aprovação do planejamento anual de fiscalizações (spec de planejamento). Registros de câmaras de
  outras diretorias se comportam como inexistentes para ele.
- **Comportamento atual**: nenhuma regra do banco dá acesso ao diretor (`can_access_camara` e
  `is_staff` o excluem); a interface usa a diretoria dele só para escolher painéis e módulos.
- **Motivo da diferença**: o papel existe e é oferecido no cadastro, mas não tinha alcance definido
  (decisão do responsável, 2026-09-30).
- **Objetos do catálogo**: `coluna:profiles.diretoria_id`, `funcao:get_my_diretoria()`,
  `funcao:can_access_camara(row_camara text)`
- **Origem**: decisão do responsável em 2026-09-30, no esclarecimento desta spec.

### R-core-013 — O prestador só alcança a própria entidade

- **Comportamento desejado**: o usuário prestador só alcança dados ligados à entidade que
  representa. O que ele vê e faz em cada módulo é definido na spec do portal do prestador, que usa
  esta regra como base.
- **Comportamento atual**: igual ao desejado como regra de base (as funções de identidade devolvem a
  entidade do prestador ativo); há duas funções com o mesmo papel.
- **Motivo da diferença**: —
- **Objetos do catálogo**: `funcao:get_my_prestador_id()`, `funcao:current_prestador_servico_id()`
- **Origem**: —

### R-core-014 — Diretorias e câmaras técnicas

- **Comportamento desejado**: o sistema tem 3 diretorias — DSB (saneamento básico e resíduos
  sólidos), DTR (transportes, rodovias, ferrovias, portos e aeroportos) e DGE (gás canalizado,
  energia e mineração) — e 10 câmaras técnicas, cada uma de uma diretoria: CATESA, CATERS e CRES
  (DSB); CATRANSP, CATERF, CATEFIS e CRET (DTR); CATEGAS, CATENE e CREG (DGE). Todo usuário ativo lê
  essa estrutura; só o administrador a mantém. A lista vem do servidor, e não fica repetida no
  aplicativo. Cada serviço regulado pertence a uma diretoria e, quando houver, a uma câmara técnica
  (na DSB: água, esgoto e drenagem urbana na CATESA; limpeza urbana e resíduos sólidos na CATERS);
  é por esse vínculo que checklists e fiscalizações sabem de que câmara são.
- **Comportamento atual**: produção tem 12 câmaras; CATERM e CATESG existem só no banco e nenhum
  usuário consegue escolhê-las. A lista também está fixa no código da interface. Qualquer conta
  logada lê, mesmo sem aprovação; não há tela de manutenção.
- **Motivo da diferença**: CATERM e CATESG não existem (confirmado pelo responsável); lista repetida
  no código diverge do banco.
- **Objetos do catálogo**: `tabela:diretorias`, `tabela:camaras_tecnicas`,
  `coluna:camaras_tecnicas.diretoria_id`,
  `politica:public.camaras_tecnicas.Câmaras técnicas visíveis para todos autenticados`,
  `politica:public.camaras_tecnicas.Admins gerenciam câmaras técnicas`,
  `politica:public.diretorias.Diretorias visíveis para todos autenticados`,
  `funcao:camara_from_servicos(p_servicos text[])`
- **Origem**: A-010 (decidido), A-021 (decidido).

### R-core-015 — Municípios

- **Comportamento desejado**: o sistema tem os 79 municípios de MS, cada um com nome único e código
  IBGE de 7 dígitos. Todo usuário ativo lê e pesquisa; só o administrador mantém. O aplicativo
  offline baixa a lista.
- **Comportamento atual**: os 79 municípios foram carregados de uma vez; a tela só lista e busca;
  a regra de acesso também deixa o coordenador alterar, sem tela para isso.
- **Motivo da diferença**: dado de referência oficial; alteração só pelo administrador evita
  divergência entre câmaras.
- **Objetos do catálogo**: `tabela:municipios`, `coluna:municipios.codigo_ibge`, `coluna:municipios.nome`,
  `politica:public.municipios.Leitura pública de municípios`,
  `politica:public.municipios.Operadores gerenciam municípios`
- **Origem**: —

### R-core-016 — Cadastro de entidades reguladas

- **Comportamento desejado**: a equipe (administrador, coordenador e fiscal) cadastra e altera
  entidades reguladas, inclusive sem rede, com identificador gerado no aparelho. Dados: nome de
  exibição, razão social e CNPJ (obrigatórios; CNPJ único), natureza (concessionária ou órgão/
  entidade pública), serviços prestados (que definem em que diretoria a entidade aparece), endereço,
  contato, responsável e cargo, site, observações e situação (ativa ou desativada, num campo só).
  Todo usuário ativo da equipe lê as entidades; o prestador, só a própria (R-core-013).
- **Comportamento atual**: a mesma equipe cria, edita e exclui pela fila offline. A situação está
  em dois campos que dizem a mesma coisa (`ativo` e `status`); há um campo de classificação que
  nenhuma tela usa (`tipo`); o CNPJ não é único; o prestador lê todas as entidades.
- **Motivo da diferença**: campos duplicados e sem uso confundem; CNPJ repetido gera entidade
  duplicada; o prestador não precisa ver outras entidades.
- **Objetos do catálogo**: `tabela:prestadores_servico`, `coluna:prestadores_servico.nome`,
  `coluna:prestadores_servico.razao_social`, `coluna:prestadores_servico.cnpj`,
  `coluna:prestadores_servico.tipo_entidade`, `coluna:prestadores_servico.tipo_servico`,
  `coluna:prestadores_servico.ativo`, `coluna:prestadores_servico.status`,
  `coluna:prestadores_servico.tipo`, `politica:public.prestadores_servico.Operadores gerenciam prestadores`,
  `politica:public.prestadores_servico.Leitura pública de prestadores`,
  `politica:public.prestadores_servico.prestadores_staff_all`,
  `politica:public.prestadores_servico.prestadores_prestador_select_own`
- **Origem**: A-003 (decidido).

### R-core-017 — Entidade com registros é desativada, não excluída

- **Comportamento desejado**: entidade sem nenhum registro vinculado pode ser excluída pela equipe.
  Entidade com registros (contratos, fiscalizações, termos, respostas, autos, remessas, usuário
  prestador) só pode ser desativada: some das listas de escolha, mas continua consultável e
  referenciada pelos registros.
- **Comportamento atual**: excluir a entidade apaga os contratos dela em cascata e deixa as remessas
  sem entidade; falha se houver termos, autos, julgamentos, respostas ou perfil vinculados.
- **Motivo da diferença**: apagar contratos em cascata perde instrumentos (Princípio I); a exclusão
  que falha no meio confunde o usuário.
- **Objetos do catálogo**: `restricao:contratos.contratos_prestador_servico_id_fkey`,
  `restricao:remessas_ai.remessas_ai_prestador_servico_id_fkey`,
  `restricao:termos_notificacao.termos_notificacao_prestador_servico_id_fkey`,
  `restricao:autos_infracao.autos_infracao_prestador_servico_id_fkey`
- **Origem**: A-020 (decidido, por analogia: desativar em vez de excluir).

### R-core-018 — Documentos da entidade

- **Comportamento desejado**: a equipe anexa documentos à entidade e os exclui; cada documento tem
  nome, tipo, tamanho e data. O arquivo só é entregue a quem tem acesso à entidade, por endereço
  temporário emitido depois dessa verificação. Tipos aceitos: PDF e imagens; tamanho limitado. A
  mesma regra vale para os arquivos de todos os módulos: cada spec define quem alcança o registro dono
  do arquivo, e o arquivo só é entregue a quem alcança o registro.
- **Comportamento atual**: os documentos ficam numa lista dentro do cadastro, regravada inteira a
  cada anexo; o repositório é privado, mas qualquer usuário ativo, inclusive o prestador, lê, troca
  e apaga qualquer arquivo dele (inclusive de outras entidades e do CATERS). Sem limite de tipo nem
  de tamanho. Em produção, nenhum documento de entidade (os 4 arquivos são do CATERS). Regras de
  arquivo que cobrem vários repositórios de uma vez dão o mesmo acesso amplo aos arquivos de todos os
  módulos.
- **Motivo da diferença**: documento de uma entidade não pode chegar a outra; a lista regravada
  inteira perde anexos em edições simultâneas.
- **Objetos do catálogo**: `coluna:prestadores_servico.documentos`, `bucket:documentos-prestadores`,
  `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_0`,
  `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_1`,
  `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_2`,
  `politica:storage.objects.documentos-prestadores authenticated all 1rt2ofe_3`,
  `politica:storage.objects.Storage read authenticated`, `politica:storage.objects.Storage insert authenticated`,
  `politica:storage.objects.Storage update authenticated`, `politica:storage.objects.Storage delete authenticated`
- **Origem**: A-016 (decidido).

### R-core-019 — Logotipo da entidade

- **Comportamento desejado**: a equipe envia o logotipo da entidade (imagem PNG ou JPEG, tamanho
  limitado). O logotipo é público: aparece em telas e relatórios, com endereço não adivinhável. Se o
  envio falha, a entidade é salva sem logotipo; a imagem nunca é gravada dentro do cadastro.
- **Comportamento atual**: o repositório de logotipos é público e sem limite de tipo ou tamanho;
  qualquer usuário ativo envia, troca e apaga logotipos. Se o envio falha, a tela grava a imagem
  inteira (base64) no campo do logotipo.
- **Motivo da diferença**: imagem dentro do cadastro pesa na sincronização offline; sem limite de
  tipo, o repositório público aceita qualquer arquivo.
- **Objetos do catálogo**: `coluna:prestadores_servico.logo_url`, `bucket:logos-entidades`,
  `politica:storage.objects.logos_entidades_public_access`,
  `politica:storage.objects.logos_entidades_authenticated_insert`,
  `politica:storage.objects.logos_entidades_authenticated_update`,
  `politica:storage.objects.logos_entidades_authenticated_delete`
- **Origem**: A-008 (decidido).

### R-core-020 — Contratos (instrumentos)

- **Comportamento desejado**: a equipe registra contratos de uma entidade, inclusive sem rede: número
  (obrigatório), entidade e vigência (vigente ou encerrado). Módulos de diretoria acrescentam dados
  próprios ao contrato (a DTR, a rodovia, o traçado KML e os pontos de KM). O prestador não alcança
  contratos por este módulo. Desativar a entidade não apaga os contratos. Contrato sem nenhum
  registro que o referencie (de qualquer app) pode ser excluído, com a confirmação em dois passos de
  hoje; com registros, só passa a encerrado.
- **Comportamento atual**: qualquer usuário com perfil ativo, inclusive o prestador, lê, cria, altera
  e exclui qualquer contrato (política de desenvolvimento). Excluir a entidade apaga os contratos.
  A tela exclui contrato mesmo com registros ligados, depois de pedir que se digite "EXCLUIR".
  Produção tem 2 contratos, ambos da DTR.
- **Motivo da diferença**: contrato é instrumento da AGEMS; o prestador não deve alterá-lo; excluir
  contrato com registros perderia a referência deles (A-020, por analogia).
- **Objetos do catálogo**: `tabela:contratos`, `coluna:contratos.numero_contrato`,
  `coluna:contratos.prestador_servico_id`, `coluna:contratos.ativo`,
  `politica:public.contratos.Acesso total autenticado (DEV)`
- **Origem**: —

### R-core-021 — Cadastros do core funcionam sem rede

- **Comportamento desejado**: o aplicativo baixa e mantém no aparelho diretorias, câmaras,
  municípios, entidades e contratos que o usuário alcança, e baixa depois só o que mudou. Entidades e
  contratos criados ou alterados sem rede entram na fila local e são enviados quando a rede volta,
  com o identificador gerado no aparelho.
- **Comportamento atual**: igual ao desejado; a data de alteração de entidades e contratos é gravada
  pelo aparelho e por gatilhos, e a sincronização incremental a usa.
- **Motivo da diferença**: —
- **Objetos do catálogo**: `funcao:update_updated_at_column()`,
  `gatilho:public.prestadores_servico.update_prestadores_updated_at`,
  `gatilho:public.contratos.update_contratos_updated_at`, `coluna:prestadores_servico.updated_at`,
  `coluna:contratos.updated_at`, `extensao:uuid-ossp`
- **Origem**: —

### R-core-022 — Auditoria

- **Comportamento desejado**: toda inclusão, alteração e exclusão nos registros auditados gera um
  registro com tabela, identificador, operação, autor (nome e e-mail gravados no momento), data e os
  dados antes e depois. Registros de auditoria não podem ser alterados nem apagados por ninguém. São
  auditados os registros que já são hoje (fiscalizações, unidades, respostas de checklist,
  constatações, determinações, recomendações, pedidos de relatório) e também os cadastros do core:
  usuários (incluindo desativação e troca de papel), entidades e contratos. Administrador, coordenador
  e fiscal consultam o histórico dos registros que alcançam (R-core-011). Nas tarefas internas do
  sistema, o autor é quem as pediu.
- **Comportamento atual**: auditoria das 7 tabelas acima, com autor e e-mail; perfis, entidades e
  contratos não são auditados. Administrador, coordenador e fiscal leem todos os registros de
  auditoria, de qualquer câmara. Ninguém grava pela API.
- **Motivo da diferença**: mudanças de papel e de acesso precisam de trilha; o histórico de outra
  câmara fura o isolamento.
- **Objetos do catálogo**: `tabela:audit_logs`, `funcao:process_audit_log()`,
  `coluna:audit_logs.user_email`, `coluna:audit_logs.old_data`, `coluna:audit_logs.new_data`,
  `politica:public.audit_logs.Fiscais, Coordenadores e Admins leem logs de auditoria`
- **Origem**: —

### R-core-023 — Áreas e papéis extensíveis

- **Comportamento desejado**: a estrutura de áreas e papéis admite que novos apps tragam as áreas
  deles e os papéis dessas áreas (ex.: servidor do RH que consulta o planejamento aprovado para lançar
  a folha de ponto; servidor do financeiro que lança as diárias; servidor de frotas que reserva os
  veículos). O administrador cadastra esses usuários como os demais (R-core-001), com a verificação
  por código (R-core-005). Os apps são do mesmo sistema e consultam os mesmos dados: cada área, na sua
  tela, vê o que o papel dela permite (o RH, o financeiro e frotas veem o planejamento aprovado). Cada
  dado tem um app dono, o único que o cria e altera; papéis de outras áreas só leem o dado, por nenhum
  caminho o editam, e executam as próprias ações em fluxos do seu app, com registros próprios que
  apontam para o dado consultado (o RH lança o ponto, o financeiro as diárias, frotas a reserva de
  veículos). O controle de acesso do core garante essa separação: permissão de leitura sobre dado de
  outro app nunca inclui escrita. Acrescentar uma área ou um papel não muda o que os papéis existentes alcançam, e o isolamento
  por câmara (R-core-011) continua valendo para os dados de fiscalização.
- **Comportamento atual**: os papéis são fixos (cinco), e só diretorias e câmaras técnicas organizam
  os usuários.
- **Motivo da diferença**: decisão do responsável (2026-09-30): o sistema nasce preparado para receber
  apps de outras áreas, interligados; o planejamento de fiscalizações, aprovado pelo diretor, segue
  para RH, financeiro e frotas.
- **Objetos do catálogo**: `coluna:profiles.role`, `tabela:diretorias`, `tabela:camaras_tecnicas`
- **Origem**: decisão do responsável em 2026-09-30; constituição v2.4.0, "Extensão para outras áreas".

### R-core-024 — Credenciais de sistema para integrações

- **Comportamento desejado**: um sistema externo integrado (ex.: a folha de ponto do RH, recebendo o
  planejamento aprovado) acessa o sistema por uma credencial de sistema, criada e revogada pelo
  administrador, com permissão limitada ao que a integração precisa. Toda ação feita por ela é
  auditada com a identificação da integração (R-core-022). Integração nunca usa a conta de uma pessoa.
- **Comportamento atual**: não há integração externa; as tarefas internas usam uma chave de serviço
  única, com acesso total ao banco.
- **Motivo da diferença**: integrações com outras áreas estão previstas (decisão do responsável,
  2026-09-30); chave com acesso total ou conta de pessoa emprestada não deixa rastro nem limite.
- **Objetos do catálogo**: `papel:service_role`, `funcao:e_chave_de_servico()`
- **Origem**: decisão do responsável em 2026-09-30.

### R-core-025 — Telas do core montadas com o que cada app registra

- **Comportamento desejado**: as telas do core que reúnem informação de vários módulos são montadas
  com o que cada app instalado registra nelas, e o core não conhece esses apps:
  - o menu de navegação e o início de cada papel (os painéis do diretor, R-core-012, são painéis
    registrados pelos apps);
  - a lista de entidades reguladas (contadores, como fiscalizações e recomendações) e o detalhe da
    entidade (abas, como fiscalizações, determinações e autos);
  - as Definições (entradas de configuração, como tipos de unidade, checklists e as definições da
    DTR).

  Cada contribuição declara quais papéis a veem e usa as regras de acesso do app dono do dado
  (R-core-011, R-core-012, R-core-013): o que o usuário não alcança não aparece, nem como contador.
  Acrescentar, alterar ou retirar um app muda só o que ele registrou; as telas do core continuam
  funcionando sem ele.
- **Comportamento atual**: as telas do core têm o conteúdo dos outros módulos fixo no código: o
  detalhe da entidade tem as abas Fiscalizações, Determinações e Autos com contagens; a lista de
  entidades conta fiscalizações e recomendações; as Definições têm abas fixas (Tipos de Unidade,
  Checklists, Prestadores), e a DTR tem Definições separadas; o início mostra as últimas
  fiscalizações; cada câmara tem um painel próprio no código, sete deles só com a lista de
  "funcionalidades previstas".
- **Motivo da diferença**: constituição v2.5.0, "Independência entre apps": o core não depende de
  apps posteriores, e mudar o app de uma área não exige mudar o core. Com o conteúdo fixo, cada app
  novo obrigaria a alterar as telas do core.
- **Objetos do catálogo**: — (composição de telas; não há objeto no banco)
- **Origem**: constituição v2.5.0 (decisão do responsável, 2026-09-30).

## Telas do sistema atual

Ações das telas atuais que pertencem ao core, no molde `formatos/spec-modulo.md` da spec 003. Fonte:
`src/pages/` do sistema atual.

### Entrar (`src/pages/Login.jsx`)

| Ação | Regra |
|---|---|
| Entrar com e-mail e senha | R-core-005 |
| Mensagem "aguarda aprovação" para perfil inativo | R-core-005 (retirada: não há aprovação de cadastro; usuário desativado recebe a mesma recusa genérica) |
| Link "Cadastre-se" | R-core-001 (retirada: sem cadastro pela própria pessoa) |
| Sem opção "esqueci a senha" | R-core-010 (nova: recuperação de acesso por e-mail com código; premissa "Recuperação de acesso") |

### Cadastro (`src/pages/Register.jsx`)

| Ação | Regra |
|---|---|
| A pessoa se cadastra escolhendo papel, diretoria, câmara e entidade (lista de entidades sem login) | R-core-001 (retirada: tela inteira; A-038) |

### Gerenciar usuários (`src/pages/GerenciarUsuarios.jsx`)

| Ação | Regra |
|---|---|
| Tela só para o administrador | R-core-001 |
| Listar usuários com nome, e-mail, papel, câmara e situação | R-core-009 |
| Criar usuário (o botão de convite foi retirado; hoje só existe o cadastro pela pessoa) | R-core-001 (nova: o administrador cria) |
| Trocar o papel | R-core-002 |
| Escolher diretoria e câmara (câmaras filtradas pela diretoria) | R-core-003 |
| Aprovar ou desativar (alternar situação); na aprovação de prestador, escolher a entidade | R-core-007, R-core-004 |
| Vincular ou trocar a entidade de um prestador | R-core-004 |
| Excluir usuário (perfil e conta) | R-core-007 (só sem registros) |
| Excluir usuário digitando o e-mail | R-core-007 (retirada: exclusão só pela lista, com a mesma regra) |
| Link "Exportar / Importar Dados" (exporta e importa fiscalizações) | fora: fiscalizacao |

### Entidades reguladas (`src/pages/PrestadoresServico.jsx`)

| Ação | Regra |
|---|---|
| Listar entidades; o administrador filtra por diretoria (Todos, DSB, DTR, DGE); os demais veem só as da própria diretoria, pelos serviços | R-core-016 |
| Título "Prestadores de Serviço" (DSB) ou "Concessionárias" (demais) | R-core-016 |
| Contadores de fiscalizações e recomendações por entidade | R-core-025; fora: fiscalizacao |
| Criar e editar: nome, razão social, CNPJ, natureza, serviços, situação, contato, endereço, responsável, cargo, observações | R-core-016 |
| Enviar logotipo | R-core-019 |
| Excluir, digitando "EXCLUIR" | R-core-017 |
| Abrir o detalhe | R-core-016 |

### Detalhe da entidade (`src/pages/DetalhePrestador.jsx`)

| Ação | Regra |
|---|---|
| Aba Informações; editar os dados | R-core-016 |
| Trocar o logotipo | R-core-019 |
| Abas Fiscalizações, Determinações e Autos, com contagem | R-core-025; fora: fiscalizacao, processo_sancionador |
| Aba Documentos: enviar e excluir documento | R-core-018 |

### Contratos (`src/pages/Contratos.jsx`)

| Ação | Regra |
|---|---|
| Listar contratos | R-core-020 |
| Criar e editar: número, entidade, situação | R-core-020 |
| Campo rodovia | fora: dtr (extensão do contrato, R-core-020) |
| Excluir, digitando "EXCLUIR" | R-core-020 (só sem registros) |

### Municípios (`src/pages/Municipios.jsx`)

| Ação | Regra |
|---|---|
| Listar e buscar por nome ou código IBGE | R-core-015 |

### Definições, início e painéis de câmara

| Tela | Ação | Regra |
|---|---|---|
| Definições (`src/pages/Definicoes.jsx`) | Abas Tipos de Unidade, Checklists e Prestadores | R-core-025; Tipos de Unidade e Checklists: fora: checklists (spec 005); Prestadores: R-core-016 |
| Início (`src/pages/Home.jsx`) | Boas-vindas e últimas fiscalizações | R-core-025; fora: fiscalizacao |
| Painéis de câmara (`src/pages/*Dashboard.jsx`) | Painel fixo por câmara; CATEFIS, CATEGAS, CATENE, CATRANSP, CREG, CRES e CRET só listam "funcionalidades previstas" | R-core-025 (retirada: o início da câmara mostra o que os apps registram); CATERS e CATESA: fora: caters, fiscalizacao |

### Ações novas, sem tela hoje

| Ação | Regra |
|---|---|
| Informar o código recebido por e-mail; pedir novo código | R-core-005 |
| Ver e revogar os próprios aparelhos confirmados; o administrador, os de qualquer usuário | R-core-006 |
| Alterar o próprio nome e a própria senha | R-core-008 |
| Consultar o histórico de alterações de um registro | R-core-022 |
| Criar e revogar credenciais de sistema | R-core-024 |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das regras de acesso deste módulo têm teste automatizado que falha quando a regra
  é violada.
- **SC-002**: Em teste com um usuário de cada câmara, 0 registros de outra câmara são alcançados por
  qualquer caminho (tela, sincronização, chamada direta).
- **SC-003**: 0 recursos respondem sem login além da entrada, da verificação do código e da
  recuperação de acesso.
- **SC-004**: Um usuário novo completa o primeiro acesso (senha e código) em até 3 minutos.
- **SC-005**: Um usuário num aparelho confirmado sem rede abre o app e trabalha com os cadastros do
  core sem nenhum erro de acesso.
- **SC-006**: Desativar um usuário com registros funciona em 100% dos casos, e 100% dos registros
  dele continuam com a autoria.
- **SC-007**: Todos os usuários, entidades, contratos, municípios, diretorias e câmaras de produção
  (exceto CATERM, CATESG e os registros de teste decididos no A-002) chegam ao sistema novo, conferidos
  registro a registro por identificador.
- **SC-008**: Todo objeto do catálogo atribuído ao core no mapa de rastreabilidade é citado por pelo
  menos uma regra desta spec ou tem o destino registrado (descartado, ou descrito por outra spec).
- **SC-009**: Toda ação das telas atuais do core tem regra ou destino em outro módulo (0 `LACUNA`
  na seção "Telas do sistema atual").
- **SC-010**: Acrescentar um app de teste que registra uma aba no detalhe da entidade e uma entrada
  nas Definições exige 0 alterações no core.

## Assumptions

- **Parâmetros da verificação em duas etapas** (a confirmar no plano): código de 6 dígitos, válido por
  10 minutos, até 5 tentativas; aparelho confirmado vale até ser revogado, por decisão do usuário ou do
  administrador, ou até a troca de senha.
- **Primeiro acesso exige rede**: o código e a definição de senha não funcionam offline. Depois disso,
  o aparelho confirmado trabalha sem rede.
- **Limites de arquivo** (a confirmar no plano): logotipo até 2 MB (PNG ou JPEG); documentos de
  entidade até 20 MB (PDF, PNG, JPEG).
- **Registros legados sem câmara**: a migração de dados atribui câmara pelos serviços da fiscalização
  (regra corrigida do A-021); o que não puder ser atribuído fica visível só ao administrador até ser
  classificado.
- **Usuários de produção**: os 7 perfis ativos de produção entram no sistema novo com os mesmos papéis
  e vínculos, completados onde a R-core-003 exigir (coordenador e fiscal sem câmara recebem a câmara na
  migração, com confirmação do responsável). Todos fazem o primeiro acesso (código) no sistema novo.
- **Chaves estrangeiras que produção não tem** (fiscalização → município e entidade, unidade → tipo,
  A-037) são exigidas pelas specs dos módulos donos dessas tabelas; o core garante só que município e
  entidade existem e têm identificador estável.
- **Constituição**: a emenda v2.2.0 (2026-09-30) retirou a IA da arquitetura do sistema novo, em
  linha com o A-039.
- **Recuperação de acesso** (esqueci a senha) segue o mesmo canal de e-mail e também exige o código
  de verificação.
- **Assinatura eletrônica (futura)**: a AGEMS pretende implantar depois a assinatura eletrônica para
  validar o envio e o recebimento de documentos. Fica fora desta spec; o core já garante os
  pré-requisitos: cada pessoa tem conta própria verificada por e-mail (R-core-004, R-core-005) e toda
  ação fica registrada com o autor (R-core-022). A spec que a introduzir define em que documentos ela
  se aplica.
