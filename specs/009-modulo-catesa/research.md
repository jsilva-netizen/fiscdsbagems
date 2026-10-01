# Research: Módulo CATESA — app da câmara de saneamento

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-10-01

Decisões técnicas do app da CATESA. Valem, sem repetir, as do core (R1 a R15), do planejamento (P13
configuração da câmara), da fiscalização (F7 pontos de extensão, F13 configuração da câmara, F14
alcance) e do app da CATERF (C1, C2), que é o precedente de app de câmara.

## S1 — Nome, lugar e dependências

**Decision**: app Django `catesa` em `backend/apps/catesa/` e módulo `frontend/src/catesa/`. Ele
depende de `core`, `checklists`, `planejamento` e `fiscalizacao` e, quando instalado, de
`processo_sancionador`, sempre pelas `consultas` e, para a configuração inicial, pelo serviço que
cada app comum oferece a apps de câmara (S4). Nenhum app comum importa o `catesa`, e o `catesa` não
importa outro app de câmara (`caters`, `caterf`). As duas regras são contratos do import-linter.

**Rationale**: um app por câmara (constituição v2.6.0); a CATESA é a 8ª na ordem da spec 003,
depois do processo sancionador, então pode ler as consultas dele sem violar a ordem.

**Alternatives considered**:
- app `dsb`, comum às câmaras da DSB: fere "um app por câmara";
- configuração da CATESA dentro dos apps comuns: chumba câmara no comum (constituição v2.6.2).

## S2 — Sem modelo de dados próprio

**Decision**: o app não tem modelo (tabela). Tudo o que a CATESA configura fica nos modelos dos
apps comuns (`checklists`, `ConfiguracaoFiscalizacao`, `ConfiguracaoPlanejamento`), ligado à câmara.
O app guarda só código: o pacote de configuração inicial (S3), o comando que o aplica (S4) e o
painel (S7).

**Rationale**: R-catesa-001; nada do que a CATESA usa hoje é dado próprio dela. Tabela sem uso
seria manutenção sem ganho (Princípio V).

**Alternatives considered**: modelo `ConfiguracaoCatesa`, como o `ConfiguracaoCaterf`: a CATERF
tem um parâmetro próprio (limite de distância ao traçado), e a CATESA não tem nenhum.

## S3 — Pacote de configuração inicial

**Decision**: a configuração inicial é um conjunto de arquivos JSON versionados no app, um por app
comum, em `backend/apps/catesa/configuracao/`:
- `checklists.json`: o modelo "Checklist por tipo de unidade" (campos, respostas e saídas, papéis,
  formato de planilha), na forma que o motor de checklists aceita na tela de montagem;
- `fiscalizacao.json`: layout, título do documento, linhas da marca d'água e limite de imprecisão;
- `planejamento.json`: tipos de atividade, tipos de mudança que pedem aprovação e layout do
  cronograma.

Cada arquivo é validado pelo **validador do próprio app comum** (o mesmo da tela), num teste do
`catesa` e de novo na aplicação. O conteúdo está em [data-model.md](./data-model.md).

**Rationale**: R-catesa-002 a R-catesa-004; o formato é do app dono, então a configuração entregue
pelo app é igual a uma montada na tela, e o motor não importa código do app (R-checklists-015).

**Alternatives considered**:
- fixtures do Django: gravariam direto nos modelos dos apps comuns, sem passar pela validação nem
  pelo serviço do dono (fere "todo dado tem um app dono");
- código Python que monta os objetos: mistura dado com lógica e dificulta a revisão do conteúdo.

## S4 — Aplicação idempotente

**Decision**: o comando `configurar_catesa` aplica o pacote chamando, em cada app comum, o serviço
`servicos.aplicar_configuracao_inicial(camara, pacote, app="catesa")`. O serviço é do app dono e
segue estas regras:
- cria só o que a câmara ainda não tem: o modelo de checklist pela chave (câmara, código do
  modelo); a configuração de fiscalização e a de planejamento, se a câmara não tiver;
- nunca altera o que já existe: depois da implantação, o que vale é o que a câmara mantém na tela;
- registra na auditoria do core a criação, com o app de origem;
- devolve o que criou e o que já existia.

O comando roda na implantação, depois das migrações do banco, e pode rodar de novo sem efeito. Ele
falha com mensagem clara se a câmara CATESA não existir no core (S8).

**Rationale**: FR-001 a FR-003, US1 (cenário 2: mudar na tela vale só para a CATESA e não é
desfeito); R-catesa-007 (a escrita é do app dono).

**Alternatives considered**:
- aplicar no sinal `post_migrate`: roda a cada migração e esconde a aplicação no processo de
  implantação;
- sobrescrever a cada implantação: desfaria o que a câmara montou na tela;
- registro de configuração no core, com um comando geral: acrescentaria ao core uma peça que hoje
  só os apps de câmara usam; pode vir depois, se os comandos por app se repetirem demais.

## S5 — Catálogos e itens

**Decision**: o pacote traz o **modelo**, não os catálogos nem os itens. Os 25 catálogos (tipos de
unidade) e os itens da CATESA chegam:
- **em produção**: pela migração dos checklists (`anotacoes/migracao/checklists.toml`), que põe cada
  tipo de unidade no modelo da câmara dos seus serviços. Por isso o `configurar_catesa` roda antes
  da migração dos checklists (ordem em [quickstart.md](./quickstart.md));
- **em ambiente novo sem dump** (desenvolvimento e testes): pela importação da planilha do modelo
  (R-checklists-006), com uma planilha de exemplo fictícia nos testes.

**Rationale**: os itens são dado mantido pela câmara na tela, com versões (R-checklists-004); fixá-los
no código deixaria um texto que envelhece e duplicaria o que a migração carrega com os
identificadores de produção, dos quais as respostas das vistorias dependem.

**Alternatives considered**: os itens no pacote: perderiam os identificadores e as versões de
produção, e o pacote divergiria dos itens assim que a câmara alterasse um.

## S6 — Cópia própria e independência da CATERS

**Decision**: o app da CATERS tem o seu próprio pacote, hoje com o mesmo conteúdo. Nenhum dos dois
apps lê o pacote do outro. Um teste do `catesa` aplica os dois pacotes, altera a configuração da
CATESA pelo serviço do app comum e confere que a da CATERS não mudou (SC-003).

**Rationale**: constituição v2.6.1 (cópia independente); premissa "Configuração idêntica à da
CATERS" da spec.

**Alternatives considered**:
- a CATERS copiar a configuração da CATESA na implantação: liga um app de câmara ao outro;
- um pacote "DSB" compartilhado: volta a juntar as câmaras da diretoria.

## S7 — Painel da CATESA

**Decision**:
- **Servidor**: `catesa/painel.py` monta os contadores, e a rota `GET painel/catesa` os devolve,
  com o alcance do usuário. Fontes:
  - fiscalizações em andamento e finalizadas: `fiscalizacao.consultas.contagem_por_situacao(usuario,
    camara)`, consulta acrescentada ao contrato da spec 007 por este plano;
  - termos e autos por situação: as consultas de contagem do processo sancionador, definidas na spec
    dele. Enquanto o app não estiver instalado (`django.apps.apps.is_installed`), a resposta não traz
    esses blocos.
- **Aparelho**: `frontend/src/catesa/registros.ts` registra o painel no início (registro de
  contribuições do core, R-core-025) para coordenador e fiscal da CATESA, diretor da DSB e
  administrador. Cada número abre a lista do app dono com o filtro (`fiscalizacoes?camara=&situacao=`
  e as listas do processo sancionador).
- O painel é consulta online: não entra na sincronização.

**Rationale**: R-catesa-005; filtro no servidor, pelo alcance (A-026), no lugar do filtro pelo
texto "CATESA" no navegador.

**Alternatives considered**:
- o painel contar direto nos modelos dos outros apps: fere R3 do core (só `consultas`);
- um painel genérico de câmara no core, configurado por câmara: o core passaria a conhecer termos e
  autos (fere R-core-025).

## S8 — Identificação da câmara

**Decision**: o app identifica a câmara pela sigla `CATESA` do cadastro de câmaras do core, numa
constante do próprio app. A sigla só aparece no app da CATESA.

**Rationale**: o app é de uma câmara só; citar a câmara é permitido no app dela e vedado nos comuns
(constituição v2.6.2, com o teste automatizado dos apps comuns).

**Alternatives considered**: identificador da câmara em variável de ambiente: configuração a mais
para um valor que não muda.

## S9 — Testes

**Decision**:
- **pacote**: cada arquivo passa no validador do app comum dono;
- **aplicação**: aplicar duas vezes não duplica nada; uma alteração feita pelo serviço do app comum
  sobrevive a uma nova aplicação; câmara ausente gera erro claro;
- **independência**: S6;
- **painel**: a matriz de acesso ([contracts/matriz-acesso.md](./contracts/matriz-acesso.md)) caso a
  caso; dados de outras câmaras nunca entram na contagem (SC-004); sem o processo sancionador, os
  blocos de termos e autos não aparecem;
- **dono dos dados**: as rotas do app não gravam no banco (contagem das instruções de escrita
  durante as chamadas), e o import-linter recusa importar `models` de outro app (SC-005);
- **ponta a ponta**: num ambiente com o pacote aplicado e a planilha de exemplo importada, uma
  vistoria de "Estação de Tratamento de Água" gera o relatório com o título e a marca d'água da DSB
  (SC-001; em homologação, com o dump sintético migrado).

**Rationale**: FR-006 e Princípio III; SC-001 a SC-005.

**Alternatives considered**: testar só o pacote, sem a aplicação: não pegaria a sobrescrita do que a
câmara alterou.

## S10 — Migração

**Decision**: não há dados próprios a migrar nem mapa de migração (seção "Migração" da spec). Na
sequência de implantação com dados, o app entra assim: migração do core → `configurar_catesa`,
`configurar_caters` e a configuração da CATERF → migração dos checklists (catálogos nos modelos das
câmaras) → demais migrações. A conferência dos checklists (MIG-1 da spec 005) confere os 25
catálogos no modelo da CATESA e nenhum no da CATERS (SC-002).

**Rationale**: o mapa dos checklists liga cada tipo de unidade ao modelo da câmara dos seus serviços,
e o modelo precisa existir antes.

**Alternatives considered**: a migração dos checklists criar os modelos: poria no app comum o
conteúdo do modelo de uma câmara.
