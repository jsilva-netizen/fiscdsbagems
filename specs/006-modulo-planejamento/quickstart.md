# Quickstart: validar o módulo planejamento

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Roteiro para provar que o planejamento atende a spec, no **repositório novo** do sistema, com o
core já funcionando ([quickstart do core](../004-modulo-core/quickstart.md)). Os comandos rodam da
raiz do repositório novo.

## Pré-requisitos

- Ambiente do core no ar (PostgreSQL, Redis, MinIO, Mailpit), com as referências carregadas.
- Usuários de teste criados pelo administrador:
  - um coordenador e dois fiscais da CATESA;
  - um coordenador e um fiscal da CATERS;
  - um coordenador da CATERF;
  - um diretor da DSB e um da DTR;
  - um prestador de uma entidade da DSB.
- Tabela de diárias de teste com os valores do Anexo I (R$ 200,00, R$ 240,00, R$ 250,00) para os
  municípios das 10 viagens, e um veículo com 8 km/L.

## 1. Testes automáticos

```bash
cd backend && pytest tests/planejamento
lint-imports
```

Esperado: todos passam, incluindo:
- **custos** (SC-001): as 10 viagens do Anexo I, carregadas de um fixture, dão os litros, o
  combustível e as diárias da planilha nas 7 viagens sem erro, e os valores corretos nas duas de
  agosto (diárias R$ 1.000,00 e R$ 1.400,00) e em junho (total R$ 2.625,00);
- **mudanças** (SC-004): toda proposta que aumenta o valor das diárias fica pendente, com qualquer
  configuração; datas no mesmo mês, com o tipo desmarcado, valem na hora;
- **matriz de acesso** (SC-005, SC-010): [contracts/matriz-acesso.md](./contracts/matriz-acesso.md)
  caso a caso, com duas câmaras, duas diretorias, prestador, papel de outra área e credencial;
- **equipe**: recusa acima da quantidade aprovada e em período sobreposto; pedido de liberação
  antes da aprovação é recusado; pedido sem resposta expira no início da viagem;
- **extensão** (SC-009): um app de teste registra um tipo de destino, usado numa viagem sem mudar o
  planejamento;
- **independência**: `lint-imports` confirma que `planejamento` não importa `fiscalizacao` nem
  apps de câmara, e um teste falha se o código do planejamento citar uma câmara
  (R-planejamento-022).

## 2. Fluxo completo pela API ou pela tela

1. **Coordenador da CATESA**:
   - cria o plano de 2027 com preço do litro de R$ 7,00;
   - registra a viagem "Ribas do Rio Pardo, Água Clara, Inocência", de 23 a 25/03, com 1.200 KM,
     4 servidores, atividade Fiscalização de SAA e SES e 14 diárias;
   - esperado: 150 L, R$ 1.050,00 de combustível e R$ 2.800,00 de diárias.
2. **Viagem conjunta**: ele convida a CATERS. O coordenador da CATERS aceita e acrescenta a parte
   dela (Fiscalização de RS).
3. **Aprovação**: os dois coordenadores enviam os planos. O diretor da DSB devolve o da CATERS com
   motivo, o coordenador ajusta e reenvia, e o diretor aprova os dois. O histórico mostra envio,
   devolução, reenvio e aprovação (SC-002).
4. **Escala e liberação**: o coordenador da CATESA escala os 2 fiscais dele e pede o fiscal da
   CATERS. O coordenador da CATERS libera.
5. **Consulta sem rede** (SC-006): o fiscal da CATERS, escalado, abre o aplicativo sem rede e vê a
   viagem.
6. **Mudança com aprovação**: o coordenador aumenta as diárias para 16. A mudança fica pendente, o
   fiscal continua vendo 14, e o diretor aprova.
7. **Prestador**: vê a atividade prevista para a entidade dele (tipo, serviços, destinos, datas),
   sem equipe nem valores. Com a atividade marcada como escondida, não vê.
8. **Cronograma** (SC-008): o coordenador emite o cronograma de março em XLSX e PDF, com as colunas
   do Anexo I e os valores aprovados. A atualização de março lista a mudança de diárias.
9. **Diretor da DTR**: não alcança nada da DSB, e a resposta é 404.

## 3. Critérios de aceite da spec

A lista de critérios está em [spec.md, "Success Criteria"](./spec.md). O SC-007 (registrar uma
viagem com três destinos e duas atividades em menos de 5 minutos) é medido com um coordenador real,
na primeira homologação.
