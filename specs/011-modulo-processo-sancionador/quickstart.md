# Quickstart: validação do processo sancionador

Roteiro para provar, no repositório novo, que o app atende a spec. Pressupõe core e fiscalização
implantados.

- Usuários: coordenador e fiscal da CATESA, fiscal da CATERS, dois membros da câmara de julgamento,
  dois da diretoria executiva, diretor da DSB, administrador, prestadores de duas entidades.
- Dados: uma fiscalização finalizada da CATESA com 4 determinações (prazos de 15 e 30 dias).

## 1. Testes automáticos

```bash
cd backend && pytest tests/processo_sancionador
cd ../frontend && npx vitest run src/processo_sancionador
cd .. && lint-imports
```

Esperado:
- matriz de acesso caso a caso, com os casos obrigatórios;
- numeração sem repetição com 50 emissões simultâneas (SC-001);
- prazos com relógio fixo no fuso de MS, contando o último dia;
- passagens de etapa só com a etapa completa;
- a análise e a AM nunca alteram a resposta da entidade (SC-003);
- linha do tempo e decisões sem alteração (405);
- o app não grava em modelos de outros apps (SC-007);
- nenhuma câmara citada no código.

## 2. Notificação e resposta (US1)

1. Criar o processo da fiscalização, anexar TN e relatório assinados, emitir.
2. Como prestador da entidade, enviar o TN assinado; reenviar outro arquivo.
3. Responder as 4 determinações, com evidências, e concluir com o termo de envio.
4. Tentar criar outro processo para a mesma fiscalização; como fiscal da CATERS, abrir o processo.

Esperado: número "TN 001/AAAA/DSB/AGEMS"; ciência e data-limite gravadas no primeiro envio, sem
mudar no reenvio; resposta recebida e marcada no prazo; segundo processo recusado; 404 para a
CATERS.

## 3. Análise da Manifestação (US2)

1. Analisar: 3 acatadas e 1 não acatada; concluir a AM.
2. Refazer a análise antes de enviar a remessa.

Esperado: número da AM, PDF gerado com a base legal da câmara, 1 auto numerado, processo em "autos e
defesa"; ao refazer, a versão 1 fica substituída, o auto é cancelado com motivo, as 4 respostas da
entidade continuam iguais.

## 4. Autos, remessa e defesa (US3)

1. Informar a pena base, anexar o AI assinado e enviar a remessa.
2. Como prestador, registrar o recebimento com o AI assinado e enviar a defesa com 2 anexos.
3. Como prestador da outra entidade, tentar registrar o recebimento.

Esperado: lista da remessa gerada; prazo de defesa = recebimento + 30 dias; defesa registrada e no
prazo; processo passa a "parecer técnico"; a outra entidade recebe 404.

## 5. Parecer, julgamento e deliberação (US4, US5)

1. Escrever o parecer ("atenuar para 50 UFERMS"), anexar o assinado, finalizar e encaminhar.
2. Como membro da câmara de julgamento, registrar a decisão; encaminhar à deliberação.
3. Como membro da diretoria executiva, registrar a deliberação.

Esperado: encaminhamento recusado antes do parecer assinado; o julgamento vê o processo só para
leitura e registra só a decisão; depois da deliberação, o processo fica encerrado, e a entidade vê a
decisão final e recebe o aviso. Os passos 2 e 3 seguem a forma de registro definida na Q1.

## 6. Acompanhamento (US6)

Com o termo assinado em 01/03, abrir o acompanhamento em 10/03 e em 17/03.

Esperado: a determinação de 15 dias aparece "a vencer" e depois "vencida", igual no painel e na
lista; o fiscal da CATERS não a vê; o painel da CATESA conta o termo pela consulta
`contagem_termos`.

## 7. Migração (dump sintético)

```bash
cd backend && python manage.py migrar_processo_sancionador --dump caminho/do/dump --excluir caminho/da/lista --conferir
```

Esperado: sem a lista de teste, o comando não roda; com ela, MIG-1 a MIG-6 da spec sem pendência:
termos fora da lista como processos com o mesmo identificador e a etapa deduzida; documentos com o
mesmo checksum; os 5 arquivos de autos sem referência listados; respostas e evidências de teste
fora da carga.
