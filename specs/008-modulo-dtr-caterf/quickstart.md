# Quickstart: validar o app da CATERF

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Roteiro no **repositório novo**, com core, checklists, planejamento e fiscalização funcionando.

## Pré-requisitos

- Um contrato de concessão no core, de uma entidade com serviço de rodovias.
- Um KML sintético de teste (sem dado real) com duas rodovias, ~500 pontos de KM e o traçado em
  linhas, e um KML inválido (sem ponto nem linha).
- O modelo "Ocorrências do PER" da CATERF com 10 tipos de teste, 2 com etapas de obra e 1 específico
  de uma das rodovias.
- Um plano da CATERF aprovado com uma atividade cujo destino é a concessão; fiscal escalado.
- Usuários: coordenador e fiscal da CATERF, fiscal da CATESA, diretor da DTR, administrador,
  prestador.

## 1. Testes automáticos

```bash
cd backend && pytest tests/caterf
cd ../frontend && npx vitest run src/caterf
cd .. && lint-imports
```

Esperado:
- **leitura do KML** (C3): o KML de teste dá os pontos e segmentos esperados; o inválido é recusado
  com o motivo; um KML com entidade externa (XXE) é recusado sem ler o arquivo;
- **cálculo do KM** (SC-002): os casos de `tests/caterf/casos_km.json` dão o mesmo resultado em
  Python e TypeScript (ponto mais próximo, projeção no segmento, acima do limite = digitado,
  precisão acima de 20 m = impreciso);
- **traçado versionado** (SC-003): enviar um KML novo não muda o KM de ocorrências existentes;
- **matriz** (SC-005, SC-007): [contracts/matriz-acesso.md](./contracts/matriz-acesso.md) caso a
  caso;
- **dono dos dados** (SC-006): um teste falha se o app gravar direto em modelo de outro app;
- **independência**: nenhum app comum importa `caterf`.

## 2. Traçado

1. O coordenador envia o KML de teste: o sistema mostra os pontos lidos e a extensão.
2. O fiscal tenta enviar: recusado.
3. O coordenador envia outro KML: a versão 2 fica vigente e a 1, substituída.

## 3. Vistoria sem rede (SC-001)

1. No aparelho sem rede, o fiscal inicia a fiscalização da atividade de concessão: contrato e rodovia
   preenchidos, traçado no aparelho.
2. Com o GPS simulado sobre o traçado, ele fotografa: o KM aparece e a primeira foto o fixa; a marca
   d'água mostra "<rodovia> KM <km> <sentido>".
3. Ele escolhe frente, item do PER e descrição (vê o tipo específico da rodovia), marca NC (vê a
   cláusula e o prazo), sentido e observação — em menos de 1 minuto.
4. Com o GPS simulado a 800 m do traçado, a ocorrência pede o KM digitado e fica "KM impreciso".
5. O mapa mostra o traçado, os pontos e a posição; tocar num ponto abre a ocorrência.
6. Com rede, as filas da fiscalização e da CATERF são enviadas; a NC e a determinação saem das saídas
   do catálogo.

## 4. Recálculo, laudo e painéis

1. Com a fiscalização finalizada, o recálculo pede a reabertura. Reaberta, a prévia mostra KM
   antigo e novo; confirmar grava e redesenha as marcas; o histórico guarda o antes e o depois.
2. O relatório sai no layout de laudo (SC-004), com as tabelas de constatações e de NCs.
3. O painel da CATERF conta só a CATERF; o coordenador da CATESA não o vê.

## 5. Migração (dump sintético)

```bash
cd backend && python manage.py migrar_caterf --dump caminho/do/dump --conferir
```

Esperado: MIG-1 a MIG-6 da spec sem pendência; pontos relidos do KML conferidos com os do contrato;
ocorrências sem correspondência de tipo listadas.
