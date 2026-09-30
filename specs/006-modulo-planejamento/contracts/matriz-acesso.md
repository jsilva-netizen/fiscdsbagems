# Contrato: matriz de acesso do planejamento

É a fonte dos testes de autorização (R8 do core): cada linha vira casos de teste para cada papel,
mais um caso "sem login", que responde sempre **401**. Uma regra removida ou enfraquecida no código
faz algum caso falhar (constituição, Princípio III).

**Legenda:**
- **T**: tudo;
- **C**: a própria câmara;
- **D**: as câmaras da própria diretoria;
- **Es**: viagens em que o usuário tem escala ativa (`escalado` ou `liberado`), de qualquer câmara;
- **Or**: o coordenador da câmara de origem do servidor;
- **P**: a própria entidade, com o serializador restrito;
- **L**: leitura;
- **—**: recusado (404 para registro, 403 para operação sem registro).

**Colunas extras:**
- "outra área": papéis de apps futuros com a permissão `planejamento.leitura_aprovados`;
- "credencial": `Api-Key` com o escopo `planejamento.leitura`.

| Recurso e operação | admin | coordenador | fiscal | diretor | prestador | outra área | credencial |
|---|---|---|---|---|---|---|---|
| configuração da câmara, tipos de atividade: ler | T | C | C (L) | D (L) | — | — | — |
| configuração, tipos de atividade: alterar, copiar | T | C | — | — | — | — | — |
| peças disponíveis (colunas, tipos de mudança, tipos de destino) | L | L | L | L | — | — | — |
| busca de destinos | L | L (escopo do app dono) | L (idem) | L (idem) | — | — | — |
| veículos, tabela de diárias: ler | T | L | L | L | — | — | — |
| veículos, tabela de diárias: criar, alterar, desativar | T | — | — | — | — | — | — |
| planos: listar e ler (vigentes) | T (L) | C | C (L) | D (L) | — | — | — |
| planos: ver versões pendentes | T (L) | C | — | D | — | — | — |
| plano: criar, alterar em rascunho, enviar | — | C | — | — | — | — | — |
| plano: aprovar, devolver | — | — | — | D | — | — | — |
| viagem: ler | T (L) | C e Es | C e Es (L) | D (L) | — | — | — |
| viagem: criar, alterar, propor mudança, cancelar, convidar (câmara organizadora) | — | C | — | — | — | — | — |
| participação: alterar a própria parte, aceitar ou recusar convite | — | C (só a parte da câmara) | — | — | — | — | — |
| viagem extra: enviar | — | C | — | — | — | — | — |
| viagem extra, mudança: aprovar, devolver | — | — | — | D | — | — | — |
| mudança: retirar | — | C (autor) | — | — | — | — | — |
| histórico da viagem | T (L) | C e Es | C e Es (L) | D (L) | — | — | — |
| escalas: escalar, cancelar | — | C (participação da câmara) | — | — | — | — | — |
| liberação: liberar, recusar | — | Or | — | — | — | — | — |
| cronograma, atualização | T | C | C | D | — | — | — |
| minhas viagens e `sync/planejamento` | Es | Es | Es | Es | — | — | — |
| `portal/planejamento/previstas` | — | — | — | — | P | — | — |
| `integracao/planejamento/viagens` (aprovados) | T (L) | — | — | — | — | L (aprovados) | L (aprovados) |

**Observações:**
- O administrador lê tudo e mantém veículos e diárias, mas não elabora nem aprova planos
  (R-planejamento-007 e R-planejamento-016).
- Uma viagem de outra câmara só é legível pela escala: fora dela, responde 404.
- O prestador nunca recebe equipe, veículo, diárias, custos nem versões pendentes; a rota dele usa
  serializador próprio (research P11).
- Outras áreas e credenciais leem só versões vigentes de planos aprovados, e nunca escrevem
  (R-planejamento-020).
