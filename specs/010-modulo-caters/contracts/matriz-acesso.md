# Contrato: matriz de acesso do app da CATERS

É a fonte dos testes de autorização (R8 do core). Cada linha vira casos de teste para cada papel,
mais um caso "sem login", que responde sempre **401**.

**Legenda:**
- **T**: tudo;
- **Cr**: usuários da CATERS;
- **D**: diretoria DSB;
- **L**: leitura;
- **—**: recusado (404 para registro, 403 para operação sem registro).

| Recurso e operação | admin | coordenador | fiscal | diretor | prestador |
|---|---|---|---|---|---|
| processos, recomendações, resposta, dilações, documentos, linha do tempo: ler | T | Cr | Cr | D (L) | — |
| processo: criar, alterar, encerrar, reabrir; importar da fiscalização | T | Cr | Cr | — | — |
| processo: excluir (sem registros além da criação) | T | — | — | — | — |
| recomendações: criar, alterar, cumprir; excluir manual | T | Cr | Cr | — | — |
| resposta do município; dilação; evento; documento: anexar e remover | T | Cr | Cr | — | — |
| documento: endereço assinado | T | Cr | Cr | D | — |
| painel da CATERS | T | Cr | Cr | D | — |
| fiscalizações disponíveis para ligar | T | Cr | Cr | — | — |

**Observações:**
- Usuários de outras câmaras, diretores de outras diretorias e o prestador não alcançam nada deste
  app; o que o município vê, se vier a ver, é da spec do portal.
- Hoje qualquer usuário ativo mexe nas dilações; o caso "fiscal da CATESA registra dilação" é teste
  obrigatório e responde 404.
- Processo encerrado: só leitura e reabertura; qualquer outra escrita responde 409.
- Linha do tempo e dilação não têm alteração nem exclusão: os métodos respondem 405.
