# Quickstart: validação da migração e da virada

Roteiro para provar, no repositório novo, que a migração e a virada atendem a spec. Pressupõe todos
os apps com os comandos de migração e um ambiente de homologação.

## 1. Testes automáticos

```bash
cd backend && pytest tests/virada tests/compartilhado/migracao
cd ../frontend && npx vitest run src/virada
```

Esperado:
- impressão digital reproduzível (mesma entrada, mesmo SHA-256) e sensível a cada campo;
- JSON de conferência de cada app válido contra o esquema;
- conferência de backup com backups sintéticos: liberado, bloqueado (operação `pending`, `error`,
  foto sem `syncedAt`) e de duas diretorias;
- conversor do backup antigo com um caso de cada tipo de operação (M9);
- a chave de abertura não liga sem aprovação.

## 2. Ensaio com dump sintético

```bash
cd backend && python manage.py virada executar --ensaio ensaio-sintetico --tipo ensaio \
  --origem <dsn-so-leitura> --arquivos <repositorio-origem> --teste <lista> --ajustes <tabela>
cd backend && python manage.py virada relatorio --ensaio ensaio-sintetico
cd backend && python manage.py virada portoes --ensaio ensaio-sintetico
```

Esperado: as 10 etapas e a conferência dos arquivos concluem; o relatório mostra 100% dos registros e
arquivos classificados, as amostras e os tempos; rodar de novo com o mesmo dump dá o mesmo relatório.
Com um valor alterado à mão no destino, o relatório mostra o campo e os três valores.

## 3. Pré-condições e falhas

1. Rodar com o banco do sistema novo não vazio.
2. Rodar sem a lista de teste.
3. Apagar um modelo de câmara antes da etapa 3.

Esperado: as três execuções param antes de carregar, com o motivo.

## 4. Aparelhos

Conferir 6 backups sintéticos: 5 sem pendência e 1 com 3 operações pendentes; depois, um novo backup
do sexto, sem pendência; marcar um sétimo usuário como exceção e importar o backup dele depois da
carga.

Esperado: a lista mostra 5 liberados e 1 bloqueado com as 3 operações; depois, 6 liberados; a
exceção aparece no relatório com as operações aplicadas e recusadas; o portão 2 fica satisfeito.

## 5. Congelamento e volta (ensaio geral, ambiente de teste)

Com um PostgreSQL de teste restaurado do dump e com as políticas do sistema atual:
1. rodar `roteiros/congelar.sql` e `roteiros/conferir-congelado.sql`;
2. rodar `roteiros/descongelar.sql` com cronômetro.

Esperado: toda gravação de teste recusada e a leitura funcionando; o descongelamento restaura as
políticas iguais às guardadas em menos de 1 hora.

## 6. Abertura

Aprovar o ensaio do tipo `virada` no ambiente de homologação e rodar `virada abrir`.

Esperado: a chave liga só depois da aprovação; as tarefas agendadas começam; nenhum aviso sai sobre
prazo vencido antes da data da carga; a conferência diária do dia seguinte dá `ok`.
