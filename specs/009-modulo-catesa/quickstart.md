# Quickstart: validação do app da CATESA

Roteiro para provar, no repositório novo, que o app da CATESA atende a spec. Pressupõe core,
checklists, planejamento e fiscalização implantados, e o ambiente de desenvolvimento do
[quickstart do core](../004-modulo-core/quickstart.md).

## 1. Testes automatizados

```bash
cd backend && pytest tests/catesa
cd ../frontend && npx vitest run src/catesa
cd .. && lint-imports
```

Esperado: pacote válido nos três apps comuns, aplicação idempotente, independência da CATERS,
matriz de acesso, nenhuma escrita pelas rotas do app e contratos do import-linter (o `catesa` não
importa `models` de outro app nem outro app de câmara; nenhum app comum importa o `catesa`)
([research S9](./research.md)).

## 2. Configuração inicial (US1)

```bash
cd backend && python manage.py configurar_catesa --conferir
cd backend && python manage.py configurar_catesa
cd backend && python manage.py configurar_catesa
```

Esperado:
1. `--conferir` lista o modelo de checklist, a configuração de fiscalização e a de planejamento como
   "a criar", sem gravar.
2. A primeira aplicação cria os três; a segunda informa que já existiam e não cria nada.
3. Como coordenador da CATESA, abrir CATESA › Configuração: o modelo "Checklist por tipo de unidade", o
   título "TERMO DE VISTORIA AGEMS/DSB", as três linhas da marca d'água, o limite de 20 m e os três
   tipos de atividade.
4. Mudar o título na tela e rodar `configurar_catesa` de novo: o título mudado continua. A
   configuração da CATERS não mudou (SC-003).

## 3. Vistoria ponta a ponta (SC-001)

1. Importar na tela do modelo a planilha de exemplo fictícia dos testes (ambiente sem dump) ou usar
   o ambiente de homologação com o dump sintético migrado.
2. Como fiscal da CATESA, iniciar uma fiscalização de água e esgoto, adicionar uma "Estação de
   Tratamento de Água", responder o checklist e tirar uma foto.

Esperado: a foto tem a marca "<código>, <município> - MS", data e hora e coordenadas; o relatório
sai com o título "TERMO DE VISTORIA AGEMS/DSB Nº ..."; nenhuma configuração manual.

## 4. Painel (US2)

1. Com fiscalizações da CATESA e da CATERS em andamento, abrir o início como fiscal da CATESA.
2. Abrir o início como diretor da DSB e como fiscal da CATERS.

Esperado: o fiscal da CATESA vê o painel com as fiscalizações só da CATESA (SC-004), e tocar em
"Em andamento" abre a lista filtrada; o diretor da DSB vê o painel da CATESA e o da CATERS; o fiscal
da CATERS não vê o painel da CATESA, e `GET painel/catesa` responde 403 a ele. Sem o processo
sancionador instalado, os blocos de termos e autos não aparecem.

## 5. Implantação com dados (homologação, dump sintético)

Ordem ([research S10](./research.md)):

1. migração do core: `python manage.py migrar_core`;
2. `python manage.py configurar_catesa`, e a configuração inicial da CATERS e da CATERF (planos das
   specs 010 e 008);
3. migração dos checklists, com a conferência (comando do plano da spec 005).

Esperado: a conferência dos checklists mostra os 25 tipos de unidade de água, esgoto e drenagem nos
catálogos do modelo da CATESA e nenhum nos da CATERS (SC-002).
