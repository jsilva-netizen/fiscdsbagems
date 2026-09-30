# Quickstart: validar o módulo fiscalização

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Roteiro para provar que a fiscalização atende a spec, no **repositório novo**, com core,
checklists e planejamento funcionando. Os comandos rodam da raiz do repositório novo.

## Pré-requisitos

- Ambiente do core no ar e as referências carregadas.
- Checklists com os modelos de hoje: um catálogo "Estação de Tratamento de Água" da CATESA, com um
  item que gera NC com determinação (prazo 30) e outro com recomendação.
- Um plano da CATESA aprovado, com uma viagem e uma atividade "Fiscalização" de SAA e SES em
  Miranda. Na equipe: dois fiscais da CATESA e um fiscal da CATERS liberado.
- Usuários de teste:
  - coordenador e fiscais da CATESA;
  - fiscal da CATERS;
  - diretor da DSB e da DTR;
  - administrador;
  - prestador da entidade fiscalizada.
- Um aparelho de teste (navegador em modo sem rede) para os passos offline.

## 1. Testes automáticos

```bash
cd backend && pytest tests/fiscalizacao
cd ../frontend && npx vitest run src/fiscalizacao
cd .. && lint-imports
```

Esperado: todos passam, incluindo:
- **consolidação** (SC-003): os casos de `tests/fiscalizacao/casos_consolidacao.json` dão o mesmo
  resultado no Python e no TypeScript; consolidar duas vezes mantém identificadores e edições;
  resposta que volta para Sim remove a NC e a determinação;
- **numeração**: NCs seguem a ordem dos registros; congelada depois da finalização;
- **número do termo** (SC-004): duas finalizações simultâneas recebem números diferentes; reabrir,
  finalizar de novo e excluir outra fiscalização não mudam o número;
- **matriz de acesso** (SC-005, SC-010): [contracts/matriz-acesso.md](./contracts/matriz-acesso.md)
  caso a caso, com o fiscal da CATERS liberado (alcança a fiscalização da equipe e não outras da
  CATESA), o diretor e o prestador sem nada;
- **fila**: finalização com contador de reaberturas antigo é descartada; operação sobre
  fiscalização excluída volta `fiscalizacao_inexistente`; limpar dados com pendência é recusado;
- **extensão** (SC-008): o app `camara_teste` pluga layout, registro avulso, campos de marca d'água
  e enriquecedor sem alterar o app;
- **independência**: `lint-imports` confirma que `fiscalizacao` não importa processo sancionador,
  portal nem apps de câmara, e um teste falha se o código citar uma câmara.

## 2. Vistoria completa sem rede (SC-002, SC-007)

1. No aparelho sem rede, o fiscal da CATESA abre "Minhas viagens", escolhe a atividade e inicia a
   fiscalização: entidade, município, serviços e equipe preenchidos.
2. Ele adiciona a unidade "ETA-001" do catálogo de teste e registra o ponto. Com GPS ruim, o ponto é
   gravado como impreciso, sem travar.
3. Ele responde Não ao item com determinação e vê C1, NC1 e "D1 Sanar NC1. ..." com prazo 30. Depois
   edita o texto da D1.
4. Ele acrescenta uma constatação manual com NC e recomendação e vê C2, NC2 e R1.
5. Ele tira 20 fotos, cada uma em menos de 5 segundos, com a marca "ETA-001, Miranda - MS", a data,
   a hora e as coordenadas. A 21ª é recusada. Depois reordena e escreve legendas.
6. Ele finaliza a unidade e a fiscalização, ainda sem rede.
7. Com a rede de volta, a fila é enviada. O servidor devolve a mesma numeração, a D1 com o texto
   editado e o número do termo. A conferência item a item não acusa perda.

## 3. Relatório, reabertura e versões (SC-006)

1. O coordenador pede o relatório e recebe o aviso de pronto. O PDF é único, com as 20 fotos em
   "Figura n – legenda", e o cabeçalho vem da configuração da CATESA.
2. Ele gera de novo: a lista mostra a versão 2 vigente e a versão 1 substituída.
3. O fiscal reabre com o motivo "foto trocada". Sem motivo, é recusado; sem rede, pede rede.
4. A versão 2 aparece como desatualizada. Ao finalizar de novo, o número do termo é o mesmo.

## 4. Urgência (SC-001)

1. O coordenador cria uma fiscalização de urgência com motivo. Ela aparece como pendente de ligação
   para ele e no painel do diretor.
2. O diretor aprova uma viagem extra com período já iniciado, e o coordenador liga a fiscalização à
   atividade. A pendência some.

## 5. Indicadores, exportação e importação

1. O coordenador da CATERS abre os indicadores: conta só fiscalizações da CATERS (SC-009). O diretor
   da DSB vê CATESA e CATERS, separadas e juntas.
2. O administrador exporta a fiscalização e importa o `.zip` em outro ambiente de teste. A prévia
   mostra o que será criado; a gravação cria com identificadores novos e origem "importada", e as
   fotos são conferidas por checksum. Um arquivo com catálogo inexistente é recusado na linha.
3. Num aparelho com fila pendente de um usuário que o administrador desativou, o aparelho exporta o
   trabalho pendente. O administrador importa, e os registros aparecem com o autor original e quem
   importou.

## 6. Migração (com dump de teste)

```bash
cd backend && python manage.py migrar_fiscalizacao --dump caminho/do/dump --conferir
```

Esperado: o relatório MIG-1 a MIG-6 da spec, sem pendência. O dump de teste é sintético, sem dado
real (Princípio IV).
