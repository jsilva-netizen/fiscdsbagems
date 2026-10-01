# Contrato: matriz de acesso do portal do prestador

É a fonte dos testes de autorização (R8 do core). Cada linha vira casos de teste para cada papel,
mais um caso "sem login", que responde sempre **401**.

**Legenda:**
- **E**: entidade do usuário, só fiscalizações com termo emitido pelo portal (V2);
- **—**: recusado (404 para registro, 403 para operação sem registro).

| Recurso e operação | prestador | admin | coordenador | fiscal | diretor |
|---|---|---|---|---|---|
| `portal/inicio` | E | — | — | — | — |
| `portal/termos`, `portal/termos/{id}` | E | — | — | — | — |
| `portal/autos` | E | — | — | — | — |
| endereço de foto e de documento | E | — | — | — | — |
| qualquer rota fora de `portal/` | — (403) | conforme o app | conforme o app | conforme o app | conforme o app |

**Observações:**
- As rotas do portal são só para o papel prestador; a equipe vê os mesmos dados pelas telas dos apps
  donos.
- Casos obrigatórios da regra do termo, para duas entidades: fiscalização sem termo; termo pelo
  portal pendente de emissão; termo pelo portal emitido; termo manual; termo cancelado depois de
  emitido. Só o emitido e o cancelado depois de emitido são alcançados, e só pela entidade dele.
- Usuário prestador desativado ou sem entidade recebe 401 no login e 403 em qualquer rota.
