# Quickstart: validação do motor de checklists

Roteiro para provar, no repositório novo, que o motor atende a spec. Pressupõe o core implantado e
o ambiente de desenvolvimento do [quickstart do core](../004-modulo-core/quickstart.md).

- Usuários: coordenador e fiscal da CATESA, fiscal da CATERS, diretor da DSB, administrador,
  prestador.
- App de teste: `backend/tests/apps/camara_teste/`, que registra uma saída, um contexto e um modo
  ([research K13](./research.md)).

## 1. Testes automáticos

```bash
cd backend && pytest tests/checklists
cd ../frontend && npx vitest run src/checklists
cd .. && lint-imports
```

Esperado:
- validação da definição (estrutura e semântica) com casos válidos e inválidos;
- versões imutáveis, uma vigente por item, ordem sem versão nova;
- importação: prévia, confirmação, 409 com catálogo alterado, reimportação sem versão nova (SC-002);
- aplicabilidade, agrupamento e escolha complementar com os mesmos casos em pytest e Vitest (K12);
- matriz de acesso ([contracts/matriz-acesso.md](./contracts/matriz-acesso.md)) caso a caso (SC-004,
  SC-007);
- varredura sem sigla de câmara nem campo dos modelos de hoje no motor (SC-009);
- o motor não importa nenhum app posterior (import-linter).

## 2. Montar um modelo pela tela (US1)

1. Como coordenador da CATESA, abrir CATESA › Configuração › Checklists › Modelos e montar um modelo com um
   campo de texto obrigatório, respostas Sim / Não / Não se aplica e a saída de teste em "Não".
2. Tentar salvar com uma saída que cita um campo inexistente.
3. Salvar o modelo correto.

Esperado: o passo 2 é recusado com o motivo; a prévia mostra o formulário e as colunas da planilha;
o modelo fica na versão 1 e convive com o "Checklist por tipo de unidade" da CATESA.

## 3. Catálogo, versões e importação (US2, US4)

1. Criar o catálogo "Estação de Tratamento de Água" com três itens; editar um, retirar outro e mudar
   a ordem.
2. Baixar a planilha modelo, preencher 10 itens e importar; reimportar a mesma planilha; alterar uma
   linha e reimportar.

Esperado: a lista mostra dois itens, o histórico mostra as versões, e a ordem não criou versão; a
primeira importação mostra a prévia e cria 10 itens; a segunda informa "nada a alterar"; a terceira
cria uma versão só.

## 4. Versão certa e sem rede (US3)

1. Pela API de teste da fiscalização (ou `consultas.versoes_vigentes`), pedir as versões vigentes
   num instante antes e depois de uma edição.
2. No aparelho, sincronizar, desligar a rede e abrir o catálogo.

Esperado: cada instante devolve a versão da época; sem rede, o catálogo da câmara está no aparelho, e
nenhuma lista fixa no código é usada.

## 5. Isolamento e cópia (US5)

1. Como fiscal da CATERS, listar catálogos e tentar abrir um da CATESA pelo identificador.
2. Como fiscal da CATERS, copiar o modelo da CATESA e alterar a cópia.
3. Como prestador, chamar `GET checklists/catalogos`.

Esperado: a CATERS vê só os seus catálogos e recebe 404 no da CATESA; a cópia registra a origem e não
altera o modelo da CATESA (SC-011); o prestador recebe 403.

## 6. Configuração inicial (R-checklists-020)

1. Aplicar duas vezes um pacote com um modelo válido para a câmara de teste.
2. Alterar o modelo pela tela e aplicar de novo.
3. Aplicar um pacote com um modelo inválido.

Esperado: a primeira aplicação cria, a segunda informa que já existia; a alteração continua; o pacote
inválido é recusado inteiro, sem gravar nada.

## 7. Migração (dump sintético)

```bash
cd backend && python manage.py migrar_checklists --dump caminho/do/dump --config caminho/da/config --conferir
```

Esperado: sem os modelos das câmaras, a migração não começa e lista as câmaras sem modelo; com eles,
MIG-1 a MIG-6 da spec sem pendência: 33 catálogos (25 na CATESA, 8 na CATERS), 768 versões com os
mesmos identificadores (as idênticas à anterior, nas 81 chaves reimportadas, marcadas como
repetição), 79 itens no catálogo de ocorrências da
CATERF, e as conferências de `created_date` e `gera_nc` antes do descarte.
