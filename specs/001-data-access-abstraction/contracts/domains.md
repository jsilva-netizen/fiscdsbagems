# Superfície de Domínio

O que as telas efetivamente importam. Enquanto o [contrato do provedor](./provider.md) fala
em coleções e critérios, esta superfície fala em **operações de negócio** — e é isso que
protege a aplicação da troca de backend.

## Por que domínio e não tabela

Uma tela não pede "leia a coleção `unidades_fiscalizadas` filtrando por `fiscalizacao_id`".
Ela pede "liste as unidades desta fiscalização". A diferença parece cosmética e não é: na
fase 2 o Django exporá recursos por domínio, e uma camada organizada por tabela precisaria
ser reagrupada exatamente no momento da troca — o pior momento possível.

## Módulos

### `fiscalizacoes`

Núcleo de campo e único domínio atravessado pelo caminho offline.

Operações: listar e abrir fiscalizações com seus filtros atuais; criar fiscalização;
gerenciar unidades fiscalizadas; responder checklist; registrar não conformidades,
constatações manuais, determinações e recomendações; anexar e listar fotos; consultar tipos
de unidade e itens de checklist; registrar auditoria.

**Atenção**: as operações consumidas pelo motor de sincronização MUST ser identificáveis
como tais. Elas carregam a invariante de confirmação antes de limpar a fila local e não
podem ser alteradas sem passar pelo teste de ciclo offline completo.

**Atenção adicional — `itens_checklist` é append-only, não CRUD comum**: editar ou remover
um item de checklist hoje **insere uma linha nova** (uma versão ativa, opcionalmente uma
"tombstone" inativa preservando a anterior) — nunca altera em lugar. Isso existe para que
uma vistoria antiga continue mostrando o texto do item vigente à época em que foi
respondida, não o texto atual. A operação de domínio "atualizar item de checklist" MUST
refletir essa semântica de versionamento, não uma operação `Atualizar` genérica da
categoria *Registros* — traduzir para "update in place" na fase 2 seria regressão silenciosa
no histórico de vistorias. Detalhe completo em `debitos-tecnicos-e-inconsistencias.md`,
item 5.

### `autos`

Processo sancionador. Predominantemente escrita, com forte encadeamento de estado.

Operações: emitir e listar autos de infração; registrar manifestações; emitir pareceres
técnicos e julgamentos; montar e acompanhar remessas.

**Atenção**: transições de estado do auto (`gerado`→`enviado`→`em_análise`→`finalizado`) e
da remessa de IA (`preparada`→`enviada`→`recebida`→`defesa_enviada`→`parecer_enviado`) são a
regra de negócio mais delicada do domínio — e hoje vivem **implícitas dentro de componentes
de UI** (`FluxoUploadDocumentos.jsx`, `GestaoAutos.jsx`, `AnaliseManifestacao.jsx`), sem
nenhum lugar único que as declare. A camada desta fase MUST apenas transportar — qualquer
validação acrescentada aqui é mudança de comportamento — mas o módulo de domínio é o lugar
natural para, na fase 2, dar a essas transições um dono explícito em vez de continuarem
espalhadas em condição de botão desabilitado. Ver `debitos-tecnicos-e-inconsistencias.md`,
item 10.

### `termos`

Termos de notificação. Tabela única, mas o maior volume de acessos concentrado numa única
tela (`GerenciarTermos.jsx`, 105 KB). É bom candidato para validar o formato da camada numa
superfície grande e de domínio simples.

Operações: emitir, listar, consultar, atualizar situação, registrar resposta do prestador e
anexar arquivo de resposta.

**Atenção**: o status do termo (`pendente_tn`→`aguardando_assinatura_prestador`→
`aguardando_resposta`/`prazo_vencido`→`respondido`) também é uma máquina de estado hoje
implícita em `GerenciarTermos.jsx`, calculada no cliente a partir da presença de arquivos e
datas. Mesma observação do domínio `autos`: transportar fielmente agora, dar um dono
explícito na fase 2.

### `cadastros`

Dados de referência — e o domínio que a fase 2 mais altera.

Operações: prestadores de serviço, municípios, contratos, unidades, perfis de usuário,
diretorias e câmaras técnicas.

**Atenção**: `prestadores_servico` e `contratos` serão substituídos por `Entidade` e
`Instrumento` do SISREG, com tabela de extensão 1:1 para os campos exclusivos. Um contrato
neutro aqui absorve a troca; um contrato que espelhe as colunas atuais propaga a mudança
para todas as telas que consomem cadastro.

### `caters`

Já possui organização própria em `src/lib/caters/` (9 arquivos). O módulo de domínio nasce
**reaproveitando** essa estrutura, não a substituindo — é a costura parcial mais avançada do
projeto.

Operações: processos, recomendações, histórico de análise, documentos extras, prorrogações,
respostas de município, leitura de notificações e tarefas de IA.

### `catesa`

Tarefas de análise assistida por IA da câmara de saneamento. Superfície pequena.

### `relatorios`

Solicitação e acompanhamento de geração de PDF. Consome a categoria de processamento
assíncrono do provedor.

## Procedimentos remotos, por domínio

Os 7 procedimentos catalogados em `contracts/provider.md` (categoria 4) pertencem a domínios
específicos, não à camada em si:

| Procedimento | Domínio |
|---|---|
| `finalizarFiscalizacao`, `reabrirFiscalizacao` | `fiscalizacoes` |
| `gerarNumeroAuto` | `autos` |
| `gerarNumeroAm` | `termos` |
| `obterResumoIndicadores` | Nenhum módulo existente — é agregação cross-domínio (fiscalizações, unidades, determinações, recomendações). Fica em `fiscalizacoes` por ora, sujeito a revisão na fase 2. |
| `importarDoCaters` | `caters` |
| `excluirUsuarioAdmin` | `cadastros` (perfis de usuário) |

## Regras da superfície

1. **Nenhum termo de backend atravessa.** Nome de tabela, código de erro do provedor e
   sintaxe de consulta ficam do lado de dentro.
2. **Uma operação por intenção de negócio.** Se duas telas fazem a mesma pergunta de formas
   ligeiramente diferentes, a operação é uma só, e a diferença vira parâmetro.
3. **Fidelidade ao que existe.** Cada operação nasce de um ponto de chamada real. Nenhuma
   operação é criada por antecipação.
4. **O motor de sincronização é consumidor de primeira classe**, não caso especial. Ele
   importa a mesma superfície que as telas.

## Ordem sugerida de construção

Coerente com a decisão D10 da pesquisa:

1. `cadastros` e `termos` — superfície grande, domínio simples, risco baixo. Validam o
   formato do contrato antes do compromisso.
2. `fiscalizacoes` — inclui o caminho offline. Se o contrato precisar mudar, é aqui que
   isso aparece, e ainda há tempo de mudar barato.
3. `autos`, `caters`, `catesa`, `relatorios` — restante da escrita.
4. Ligar a regra de lint quando o último consumidor migrar.
