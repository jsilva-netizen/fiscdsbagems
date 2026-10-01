# Quickstart: validação do app da CATERS

Roteiro para provar, no repositório novo, que o app da CATERS atende a spec. Pressupõe core,
checklists, planejamento e fiscalização implantados e o `configurar_caters` aplicado.

- Usuários: coordenador e fiscal da CATERS, fiscal da CATESA, diretor da DSB, administrador,
  prestador.
- Dados: uma fiscalização finalizada da CATERS com 10 recomendações e 3 determinações.

## 1. Testes automáticos

```bash
cd backend && pytest tests/caters
cd ../frontend && npx vitest run src/caters
cd .. && lint-imports
```

Esperado: matriz de acesso caso a caso; importação sem duplicar; prazos no fuso de MS (inclusive
"cumprir" às 21h, que grava o dia de MS); dilação com prazo, situação e evento na mesma transação;
linha do tempo e dilação sem alteração (405); um aviso por prazo; o app não grava em modelo de outro
app; configuração da CATERS independente da CATESA.

## 2. Processo e importação (US1)

1. Criar o processo para Três Lagoas e ligar a fiscalização; importar.
2. Importar de novo.
3. Reabrir a fiscalização, retirar uma recomendação, finalizar e importar de novo.

Esperado: 13 itens (recomendações com prazo = fim + 30 dias; determinações com a data-limite); a
segunda importação cria 0; a terceira cria 0 e marca 1 com "origem removida", sem apagar. Tentar
excluir a fiscalização é recusado.

## 3. Prazo, resposta e dilação (US2)

1. Registrar o AR recebido em 01/03, sem prazo informado.
2. Prévia de dilação de 15 dias a partir de 31/03; registrar aprovada.
3. Registrar outra negada; registrar a resposta do município com o cronograma "adequação".

Esperado: prazo 31/03 (origem `ar`); depois da aprovação, 15/04, situação "dilação solicitada" e o
evento "prazo estendido"; a negada não muda o prazo; a resposta com adequação solicitada põe a situação em "em análise", e a aprovada, em "respondido".

## 4. Recomendações (US3)

Com uma recomendação de prazo ontem, abrir a lista geral; marcar como cumprida.

Esperado: aparece como vencida sem gravação; depois, cumprida com a data de hoje de MS, e o total de
vencidas cai 1.

## 5. Linha do tempo, documentos e acesso (US4)

1. Anexar o ofício de resposta; registrar uma observação; tentar alterar o evento pela API.
2. Como fiscal da CATESA, pedir o endereço do documento e registrar uma dilação.

Esperado: eventos "documento anexado" e "observação" no topo; alteração responde 405; o fiscal da
CATESA recebe 404 nas duas chamadas.

## 6. Painel e avisos (US5)

Com um processo de prazo de resposta vencido ontem, rodar a tarefa diária duas vezes; prorrogar o
prazo para amanhã e rodar no dia seguinte ao novo prazo.

Esperado: um aviso "resposta atrasada" para a equipe da CATERS no primeiro dia, nenhum a mais na
segunda execução, e um novo depois do prazo prorrogado vencer; o painel conta o atraso.

## 7. Migração (dump sintético)

```bash
cd backend && python manage.py migrar_caters --dump caminho/do/dump --conferir
```

Esperado: MIG-1 a MIG-6 da spec sem pendência: 2 processos e 27 recomendações com os mesmos
identificadores; município e técnico ligados ou listados; os 4 arquivos como documentos, com o mesmo
checksum; as recomendações com situação calculada diferente da gravada listadas.
