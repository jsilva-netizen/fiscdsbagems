# Contrato: matriz de acesso do processo sancionador

É a fonte dos testes de autorização (R8 do core). Cada linha vira casos de teste para cada perfil,
mais um caso "sem login", que responde sempre **401**. Além do perfil, cada ação confere a etapa e a
situação (409 fora delas).

**Legenda:**
- **T**: tudo;
- **C**: processos da câmara do usuário;
- **J**: membro vigente da câmara de julgamento, processos que chegaram ao julgamento;
- **X**: membro vigente da diretoria executiva, processos que chegaram à deliberação;
- **D**: câmaras da diretoria do usuário;
- **E**: entidade do usuário, termo emitido pelo portal;
- **L**: leitura;
- **—**: recusado (404 para registro, 403 para operação sem registro).

| Recurso e operação | admin | coordenador | fiscal | julgamento | diretoria executiva | diretor | prestador |
|---|---|---|---|---|---|---|---|
| processos e documentos: ler | T | C | C | J (L) | X (L) | D (L) | E (L, pelo portal) |
| criar processo e termo; emitir; ciência manual; aceitar assinatura | T | C | C | — | — | — | — |
| análise e AM: registrar, concluir, refazer | T | C | C | — | — | — | — |
| autos: pena base, cancelar; remessa; recebimento e defesa manuais | T | C | C | — | — | — | — |
| parecer: escrever, finalizar; encaminhar ao julgamento | T | C | C | — | — | — | — |
| decisão de julgamento | — | — | — | J | — | — | — |
| deliberação | — | — | — | — | X | — | — |
| cancelar processo (etapas da câmara técnica) | T | C | — | — | — | — | — |
| colegiados: composição | T | — | — | J (L) | X (L) | — | — |
| configuração da câmara | T | C | C (L) | — | — | D (L) | — |
| portal: TN assinado, resposta, evidências, concluir resposta | — | — | — | — | — | — | E |
| portal: recebimento da remessa, AI assinado, defesa | — | — | — | — | — | — | E |

**Observações:**
- Cancelar o processo é do coordenador da câmara (premissa do plano); o fiscal cancela autos e
  documentos.
- O administrador não registra decisão nem deliberação: são atos dos colegiados. Ele mantém a
  composição.
- Membro de colegiado que também é coordenador ou fiscal mantém o alcance da câmara dele e ganha só
  as ações da etapa do colegiado.
- Prestador de outra entidade, e entidade de termo em fluxo manual, recebem 404 nas rotas do portal
  (A-034).
- Linha do tempo, decisões registradas e documentos não têm alteração nem exclusão (405); documentos
  só são cancelados com motivo.
- Processo encerrado ou cancelado: só leitura para todos.
- Casos obrigatórios, vindos dos defeitos de hoje:
  - fiscal da CATERS lendo termo da CATESA (404);
  - prestador alterando a remessa de outra entidade (404);
  - prestador alterando a resposta depois da análise (409);
  - membro da câmara de julgamento registrando deliberação (403).
