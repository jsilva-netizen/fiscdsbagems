# Contrato: API do portal do prestador

As convenções são as da [API do core](../../004-modulo-core/contracts/api-core.md): prefixo
`/api/v1/`, JSON, JWT. Fiscalização sem termo emitido pelo portal responde **404**, como se não
existisse. Quem pode chamar cada rota está em [matriz-acesso.md](./matriz-acesso.md). O papel
prestador só alcança rotas sob `portal/` ([research V5](../research.md)).

## Rotas de composição (deste app; só leitura)

| Método e rota | Descrição |
|---|---|
| `GET portal/inicio` | cartões do início: termos que pedem ação, prazos próximos, remessas a receber, defesas em aberto e os cartões registrados por outros apps (V3) |
| `GET portal/termos?situacao=` | termos emitidos pelo portal para a entidade, com a situação e a data-limite calculadas pelo processo sancionador |
| `GET portal/termos/{id}` | termo com o retrato notificado, as respostas, a AM e, da fiscalização, as unidades (nome, endereço, coordenadas), as recomendações e a lista de fotos |
| `GET portal/autos?situacao=` | autos da entidade, com AM, remessa, prazo de defesa, defesa, parecer (depois do encaminhamento) e decisão final (depois da deliberação) |
| `GET portal/fiscalizacoes/{id}/fotos/{foto_id}/endereco` | endereço assinado da versão com marca d'água, depois da regra do termo |
| `GET portal/documentos/{id}/endereco` | endereço assinado de documento do processo, pedido ao processo sancionador depois da regra do termo |

## Rotas dos donos usadas pelo portal (não são deste app)

| Rota | Dono |
|---|---|
| `POST portal/sancionador/termos/{id}/tn-assinado`, `PUT portal/sancionador/determinacoes/{id}/resposta`, `POST portal/sancionador/determinacoes/{id}/evidencias`, `POST portal/sancionador/termos/{id}/concluir-resposta`, `POST portal/sancionador/remessas/{id}/recebimento`, `PUT portal/sancionador/autos/{id}/defesa`, `POST portal/sancionador/{registro}/{id}/documentos` | processo sancionador (spec 011) |
| `GET portal/planejamento/previstas` | planejamento (spec 006, P11) |
| avisos e preferências | core (R-core-026) |

## Registro de contribuições

| Lado | Função | Uso |
|---|---|---|
| servidor (`portal_prestador.registro`) | `registrar_cartao(codigo, app, titulo, funcao, ordem)` | cartões do início; tramitação e apps futuros |
| aparelho (`frontend/src/portal/extensoes.ts`) | `registrarPagina`, `registrarItemMenu`, `registrarComponenteCartao` | páginas e menu dos apps que se registram |

## Consultas novas pedidas a outros apps

| App | Consulta | Regra |
|---|---|---|
| fiscalização | `resumo_para_entidade(fiscalizacao_id)` | unidades, recomendações, fotos e relatório anexado; sem alcance de usuário; importável só pelo `portal_prestador` (import-linter) |
| fiscalização | `endereco_foto_para_entidade(fiscalizacao_id, foto_id)` | endereço assinado da foto com marca d'água; mesma restrição |
| processo sancionador | tipo de aviso `sancionador.prazo_proximo` | à entidade, 5 dias antes da data-limite do termo e do prazo de defesa (V7) |
