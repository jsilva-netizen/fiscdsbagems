# Contrato: matriz de acesso do app da CATESA

É a fonte dos testes de autorização (R8 do core). Cada linha vira casos de teste para cada papel,
mais um caso "sem login", que responde sempre **401**.

**Legenda:**
- **T**: tudo;
- **Cs**: usuários da CATESA;
- **D**: diretoria DSB;
- **—**: recusado (403).

| Recurso e operação | admin | coordenador | fiscal | diretor | prestador |
|---|---|---|---|---|---|
| `GET painel/catesa` | T | Cs | Cs | D | — |

**Observações:**
- O painel conta só registros da câmara CATESA que o usuário alcança, pelas consultas dos apps
  donos. Usuários de outras câmaras e diretores de outras diretorias recebem 403.
- A configuração da CATESA segue a matriz de cada app comum (spec 005, R-checklists-015; spec 006,
  matriz; spec 007, matriz): coordenador e administrador alteram; o fiscal também monta modelos de
  checklist.
- O comando `configurar_catesa` roda só no servidor, na implantação; não tem rota.
