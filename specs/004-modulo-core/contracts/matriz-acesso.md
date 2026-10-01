# Contrato: matriz de acesso do core

Fonte dos testes de autorização ([research R8](../research.md)): cada linha vira casos de teste
para cada papel, e um caso a mais "sem login" (sempre **401**, exceto nas rotas de entrada e em
`GET saude`, que responde sem login e sem dados). Uma
regra removida ou enfraquecida no código faz algum caso falhar (constituição, Princípio III).

Legenda: **T** tudo; **P** próprio (o próprio usuário, a própria entidade); **E** escopo (câmara
para coordenador e fiscal; câmaras da diretoria para o diretor); **L** leitura; **—** recusado
(404 para registro, 403 para operação sem registro).

| Recurso e operação | admin | coordenador | fiscal | diretor | prestador |
|---|---|---|---|---|---|
| `eu` ler e alterar nome · senha · aparelhos | P | P | P | P | P |
| usuários: listar | T (todos os campos) | L (nome, papel, câmara da equipe) | L (idem) | L (idem) | — |
| usuários: criar, alterar, desativar, reativar, excluir, aparelhos | T | — | — | — | — |
| diretorias, câmaras, serviços, municípios: ler | T | L | L | L | L |
| diretorias, câmaras, serviços, municípios: alterar | T | — | — | — | — |
| papéis: ler e alterar | T | — | — | — | — |
| entidades: ler | T | L (todas) | L (todas) | L (todas) | P |
| entidades: criar, alterar, desativar, reativar, logotipo | T | T | T | — | — |
| entidades: excluir (sem registros) | T | T | T | — | — |
| documentos de entidade: ler endereço | T | T | T | L | P |
| documentos de entidade: enviar, excluir | T | T | T | — | — |
| contratos: ler | T | L | L | L | — |
| contratos: criar, alterar, excluir | T | T | T | — | — |
| auditoria: ler | T | E | E | — | — |
| credenciais de sistema | T | — | — | — | — |
| avisos: ler, marcar como lidos, preferências | P | P | P | P | P |
| avisos de outro usuário | — | — | — | — | — |
| sincronização do core: baixar | T | E | E | E | P |
| sincronização do core: enviar (entidades, contratos) | T | T | T | — | — |

Notas:

- Entidades e contratos são cadastros comuns a todas as câmaras (a entidade é fiscalizada por
  câmaras diferentes); o isolamento por câmara vale para os dados operacionais de cada módulo e
  para a auditoria desses dados (R-core-011, R-core-022).
- O diretor não escreve em registros operacionais; aprovações que outras specs derem a ele (ex.:
  aprovar o planejamento) entram na matriz do app dono (R-core-012).
- Papéis de outras áreas (RH, financeiro, frotas) entram com as linhas dos seus apps; nenhum deles
  ganha escrita em dado de outro app (constituição v2.4.0).
