# Quickstart: validação do portal do prestador

Roteiro para provar, no repositório novo, que o portal atende a spec. Pressupõe core, fiscalização,
planejamento e processo sancionador implantados.

- Usuários: três usuários da entidade A (um com e-mail de aviso desligado), um da entidade B, fiscal
  da CATESA.
- Dados: para a entidade A, uma fiscalização com TN emitido pelo portal (4 determinações), uma sem
  termo e uma com termo manual; uma atividade prevista visível e uma escondida.

## 1. Testes automáticos

```bash
cd backend && pytest tests/portal_prestador
cd ../frontend && npx vitest run src/portal
cd .. && lint-imports
```

Esperado: matriz da regra do termo (SC-001); varredura das rotas do papel prestador (V5); as rotas
do portal não gravam (SC-005); o app de teste aparece com cartão e página (SC-006); só o portal
importa as consultas `resumo_para_entidade` e `endereco_foto_para_entidade`.

## 2. Regra do termo (US1)

1. Como usuário da entidade A, abrir o início e a lista de termos.
2. Pedir pelo endereço a fiscalização sem termo, a de termo manual e uma foto de cada.
3. Como usuário da entidade B, pedir o termo da entidade A.

Esperado: só o termo emitido aparece; os pedidos do passo 2 e 3 respondem 404; nenhuma contagem do
início inclui as fiscalizações sem termo.

## 3. Termo e resposta (US2)

1. Enviar o TN assinado; ver o prazo.
2. Um usuário salva o rascunho da resposta de uma determinação; outro abre e vê o rascunho e quem
   salvou.
3. Responder as 4, anexar evidências (tentar um arquivo de 25 MB) e concluir com o termo de envio.

Esperado: prazo calculado pelo servidor; o arquivo de 25 MB é barrado antes do envio; "respondido no
prazo"; a resposta enviada fica sem a ação de alterar; o modelo do termo de envio só é liberado
com as 4 respondidas.

## 4. Autos e defesa (US3)

Com a remessa de 2 autos: enviar o AI assinado de um só; depois do outro; salvar a defesa do
primeiro; tentar enviar a defesa da remessa; escrever a do segundo, anexar o ofício e enviar.

Esperado: com um só AI, a remessa segue aguardando recebimento; com os dois, recebimento e prazo de
defesa mostrados; o primeiro envio da defesa mostra o auto que falta; o segundo registra a defesa
dos 2 autos, no prazo; os contadores da aba passam de "aguardando defesa" a "defesa enviada".

## 5. Avisos e previstas (US4)

Emitir um TN para a entidade A; rodar a rotina diária 5 dias antes da data-limite; abrir as
previstas.

Esperado: os 3 usuários recebem o aviso no portal, e só 2 por e-mail; o lembrete de prazo próximo
chega uma vez; a atividade escondida não aparece.

## 6. Contribuição de app (US5)

Instalar o app de teste e abrir o início; retirá-lo e abrir de novo.

Esperado: o cartão e a página aparecem só para as entidades que o app alcança e somem sem erro
quando ele é retirado.
