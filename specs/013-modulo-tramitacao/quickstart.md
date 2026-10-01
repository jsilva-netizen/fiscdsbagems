# Quickstart: validação da tramitação

Roteiro para provar, no repositório novo, que o app atende a spec. Pressupõe core, portal e os apps
anteriores implantados.

- Usuários: fiscal da CATESA, fiscal da CATERS, diretor da DSB, membro da unidade "Jurídico",
  administrador, usuários das entidades A, B e C.
- Adaptador de protocolo: o falso de testes até a resposta da Q1; depois, o do e-MS em homologação.

## 1. Testes automáticos

```bash
cd backend && pytest tests/tramitacao
cd ../frontend && npx vitest run src/tramitacao
cd .. && lint-imports
```

Esperado:
- matriz de acesso caso a caso;
- protocolo sem repetição com envios simultâneos;
- abertura de períodos idempotente com duas execuções da tarefa (SC-003);
- validação de formato com casos válidos e inválidos (SC-002);
- operações no protocolo com o adaptador falso fora do ar e de volta (SC-004);
- mensagens, documentos e eventos sem alteração (405);
- o app não grava em modelos de outros apps (SC-007);
- nenhuma câmara citada no código.

## 2. Comunicação à entidade (US1)

1. Criar um expediente para a entidade A, com 1 PDF e prazo de 15 dias; enviar.
2. Como usuário da entidade A, abrir o expediente; responder com 2 PDFs.
3. Como usuário da entidade B, pedir o expediente pelo endereço.

Esperado: protocolo e comprovante com checksum; ciência gravada na primeira abertura; resposta "no
prazo"; 404 para a entidade B.

## 3. Pedido de dados periódico (US2)

1. Montar o formato "Indicadores operacionais" (5 campos, um "número não negativo"); criar o pedido
   mensal para A, B e C, prazo no dia 10.
2. Rodar a tarefa de abertura duas vezes em 1º de abril.
3. Como entidade A, enviar uma planilha com valor negativo; corrigir e reenviar.
4. Rodar a tarefa diária em 11 de abril.

Esperado: 3 pedidos de março, sem duplicar; o primeiro envio recusado com linha e campo, nada
gravado; o segundo aceito; em 11/04, B e C atrasadas e a CATESA avisada; a exportação traz os dados
de A.

## 4. Protocolo pela entidade e movimentação (US3, US4)

1. Como entidade A, protocolar "Plano de ação" para a CATESA.
2. Como CATESA, encaminhar ao Jurídico com despacho; como Jurídico, devolver.

Esperado: comprovante com hora do servidor; a CATERS não vê; duas movimentações na linha do tempo; a
CATESA só lê enquanto o Jurídico é o responsável.

## 5. Protocolo externo (US5)

Com o adaptador falso: enviar 2 documentos ao processo "51.011.137-2025"; desligar o adaptador e
enviar de novo; religar.

Esperado: a primeira operação fica concluída com o retorno; a segunda fica pendente, é refeita e
conclui depois; a unidade é avisada; nenhum segredo aparece no pedido nem no retorno gravados.

## 6. Caixas (US6)

Abrir a caixa da CATESA e, como diretor da DSB, as caixas da diretoria.

Esperado: contagens de a responder, aguardando a entidade e vencidos, e o quadro do pedido mensal;
o diretor vê só para leitura.
