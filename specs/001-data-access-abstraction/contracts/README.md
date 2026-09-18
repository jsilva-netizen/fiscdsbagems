# Contratos da Camada de Acesso a Dados

**Feature**: Camada de Abstração de Acesso a Dados
**Date**: 2026-09-18

A camada expõe duas superfícies, e a distinção entre elas é o que faz a fase 2 funcionar:

| Documento | O que define | Quem consome |
|---|---|---|
| [provider.md](./provider.md) | O **contrato do provedor** — as oito categorias de comunicação com o backend, em termos neutros | Implementado pelo provedor Supabase hoje, pelo provedor Django na fase 2 |
| [domains.md](./domains.md) | A **superfície de domínio** — as operações de negócio que as telas chamam | Importado pelas páginas, componentes, hooks e pelo motor de sincronização |

Os dois contratos acima são normativos — o que a camada MUST fazer. O material de
referência por trás deles, com a evidência linha a linha que fundamenta cada regra, está em
três documentos na raiz da feature:
[inventario-acoplamento.md](../inventario-acoplamento.md) (leitura completa dos 49 arquivos
acoplados), [rpcs-funcoes-e-triggers-postgres.md](../rpcs-funcoes-e-triggers-postgres.md)
(as 7 RPCs e os triggers, na fonte SQL real) e
[debitos-tecnicos-e-inconsistencias.md](../debitos-tecnicos-e-inconsistencias.md) (achados
classificados por urgência de ação).

## A regra que sustenta tudo

> Apenas `src/lib/data/providers/supabase/` pode: importar `src/lib/supabase.js`, ler as
> variáveis `VITE_SUPABASE_*`, ou escrever caminhos literais do backend (`/rest/v1/`,
> `/auth/v1/`, `/storage/v1/`, `/functions/v1/`).
> Apenas `src/lib/data/domains/` importa o provedor.
> Todo o resto do aplicativo importa apenas `src/lib/data`.

Verificada automaticamente por lint em três frentes (FR-007), não por convenção.

**As três frentes existem porque o acoplamento existe em três formas.** O levantamento
mostrou que a parte mais perigosa não importa o cliente: a detecção de conectividade, as
chamadas de função e as URLs públicas de arquivo usam variável de ambiente ou caminho
literal. Uma regra que olhasse só importações declararia a fronteira limpa com o acoplamento
intacto.

## Princípios que valem para todos os contratos

**Neutralidade** — nenhum termo, código de erro ou formato de consulta específico de
backend atravessa a fronteira. Se um conceito só existe no Supabase, ele não aparece no
contrato.

**Fidelidade antes de elegância** — o contrato cobre o que os 222 pontos de chamada atuais
realmente fazem, nada além. Capacidade sem consumidor é código morto nascendo, e contraria
o Princípio V da constituição.

**Falha é resultado, não exceção** — permissão negada, registro inexistente e rede
indisponível retornam erro estruturado. Isso preserva o tratamento atual das telas.

**A camada não decide nada** — não valida, não autoriza, não transforma regra de negócio.
Qualquer decisão acrescentada aqui é mudança de comportamento e viola FR-004.

## Como um contrato é considerado cumprido

1. Teste de unidade (Vitest) demonstra que a operação traduz entrada e erro corretamente.
2. Teste ponta a ponta (Playwright) demonstra que a tela que a consome continua se
   comportando como antes.
3. A regra de lint não acusa nenhum acesso fora da camada.
