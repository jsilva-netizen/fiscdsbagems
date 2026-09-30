# Contrato: matriz de acesso do app da CATERF

É a fonte dos testes de autorização (R8 do core). Cada linha vira casos de teste para cada papel,
mais um caso "sem login", que responde sempre **401**.

**Legenda:**
- **T**: tudo;
- **Cf**: usuários da CATERF;
- **Eq**: fiscalizações que o usuário alcança pela regra da fiscalização (câmara ou equipe);
- **D**: diretoria DTR;
- **L**: leitura;
- **—**: recusado (404 para registro, 403 para operação sem registro).

| Recurso e operação | admin | coordenador | fiscal | diretor | prestador |
|---|---|---|---|---|---|
| contratos rodoviários e traçados: ler | T | Cf | Cf (L) | D (L) | — |
| contratos rodoviários: criar e alterar; enviar traçado | T | Cf | — | — | — |
| configuração da CATERF | T | Cf | Cf (L) | D (L) | — |
| extensão da fiscalização e das ocorrências: ler | T (L) | Eq | Eq | D (L) | — |
| extensão das ocorrências: alterar (em andamento) | — | Eq | Eq | — | — |
| recálculo de KM (fiscalização reaberta) | — | Eq | Eq | — | — |
| painéis da CATERF | T | Cf | Cf | D | — |
| `sync/caterf` | Eq | Eq | Eq | — | — |

**Observações:**
- Coordenador ou fiscal de outra câmara, mesmo liberado para uma viagem da CATERF, alcança só as
  fiscalizações em que está na equipe (regra da fiscalização) e lê os traçados delas pelo pacote.
- O prestador não alcança nada por este app; o que a concessionária vê é da spec do portal.
