# Contrato: matriz de acesso da tramitação

É a fonte dos testes de autorização (R8 do core). Cada linha vira casos de teste para cada perfil,
mais um caso "sem login", que responde sempre **401**.

**Legenda:**
- **T**: tudo;
- **U**: membro da unidade responsável atual;
- **H**: membro de unidade que já foi responsável (leitura);
- **D**: unidades da diretoria do usuário (leitura);
- **E**: entidade do usuário, pelas rotas `portal/tramitacao/`;
- **L**: leitura;
- **—**: recusado (404 para registro, 403 para operação sem registro).

| Recurso e operação | admin | membro de unidade | diretor | prestador |
|---|---|---|---|---|
| unidades `outra` e membros: escrever | T | — | — | — |
| tipos de expediente e formatos da unidade: ler e escrever | T | U | D (L) | — |
| expediente: ler | T | U, H (L) | D (L) | E |
| expediente: criar, enviar, mensagem, encaminhar, encerrar, cancelar | T | U | — | — |
| expediente: responder, protocolar | — | — | — | E |
| pedidos de dados: criar, alterar, quadro, dados recebidos | T | U | D (L) | — |
| pedido do período: planilha modelo, envio | — | — | — | E |
| operações no protocolo externo | T | U | D (L) | — |
| documentos: endereço assinado | T | U, H | D | E |

**Observações:**
- "Membro de unidade": coordenador e fiscal da câmara; diretor da diretoria (age nas unidades de
  diretoria e lê as das câmaras dela); membro vigente das unidades `outra`.
- Entidade sem expediente enviado a ela não vê o expediente em rascunho.
- Mensagens, documentos enviados, ciências, movimentações e eventos não têm alteração nem exclusão
  (405).
- Casos obrigatórios:
  - unidade que encaminhou tenta responder (404 na ação, leitura permitida);
  - entidade B pede expediente da entidade A (404);
  - envio de dados fora do formato (400, nada gravado).
