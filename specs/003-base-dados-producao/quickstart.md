# Quickstart: validar o catálogo do banco

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Roteiro para provar que o catálogo atende à spec. Tudo roda de dentro de
`specs/003-base-dados-producao/`, conforme [contracts/ferramentas-cli.md](./contracts/ferramentas-cli.md).

## Pré-requisitos

- Python 3.11+ (`python --version`).
- Os dois inventários de produção em `.specify/assessments/novo-sistema-django-apps/`.
- Para as divergências: Docker com o Supabase local do projeto (`npx supabase start`).

## 1. Testes das ferramentas

```bash
python -m unittest discover -s ferramentas/testes -v
```

Esperado: todos passam. Os testes cobrem, com inventários pequenos de exemplo:
- inventário com seção faltando, total que não bate ou JSON quebrado → recusado (retorno 1);
- anotação com chave órfã, campo obrigatório ausente ou `descartar` sem achado → recusada (retorno 2);
- chave de função com sobrecarga → duas chaves distintas;
- dependências: FK, gatilho, política → função, função → tabela (lê/escreve), função → função, com a
  origem correta;
- divergências: só num lado, código diferente (ignorando espaços), estrutura diferente;
- violação de ordem de módulo detectada;
- varredura: e-mail, CPF/CNPJ e token detectados; texto limpo aprovado;
- gerar duas vezes o mesmo inventário → saída idêntica.

## 2. Inventário do banco das migrations (para as divergências)

```bash
python -m ferramentas.inventario_migrations --reconstruir
```

Esperado: `inventario/migrations-parte1.tsv` e `migrations-parte2.tsv` criados, com as mesmas
seções dos inventários de produção.

## 3. Gerar o catálogo

```bash
python -m ferramentas.gerar
```

Esperado: retorno 0 e, na última linha, o resumo de completude. Ao final do trabalho:

| Medida | Meta | Critério |
|---|---|---|
| objetos sem anotação | 0 | SC-001 |
| objetos sem módulo nem classificação | 0 | SC-002 |
| divergências não classificadas | 0 | SC-003 |
| violações de ordem sem justificativa | 0 | SC-008 |
| achados aguardando decisão | 0 antes da 1ª spec de módulo | SC-006 |

Durante o trabalho, esses números mostram o progresso.

## 4. Regeneração estável

```bash
python -m ferramentas.gerar --verificar
```

Esperado: retorno 0, ou seja, nada no disco difere do que seria gerado (SC-007).

## 5. Varredura de dados sensíveis

```bash
python -m ferramentas.varredura
```

Esperado: retorno 0 (SC-005).

## 6. Conferência por amostra (SC-004)

1. Sortear 10 chaves de tipos diferentes de `mapa-rastreabilidade.md` (pelo menos uma tabela,
   uma coluna, uma função, uma política de `storage.objects`, um bucket, um gatilho em
   `auth.users`).
2. Uma pessoa que não conhece o banco responde, só com `catalogo/`: o que é, de quem depende, quem
   depende dele e qual módulo o descreve — até 5 minutos por objeto.
3. Conferir as respostas contra os CSVs de inventário. Esperado: 10 de 10 corretas.

Casos obrigatórios da spec (User Story 1): `tabela:unidades_fiscalizadas` deve mostrar
`fiscalizacoes` como dependência, 8 tabelas dependentes, 3 gatilhos, 7 funções e 7 políticas;
`funcao:gerar_ncs_unidade(...)` deve mostrar as tabelas lidas e escritas e `get_my_role` como
função chamada.

## 7. Regeneração depois de mudança em produção (FR-022)

1. Rodar de novo os dois scripts de inventário em produção e substituir os CSVs.
2. `python -m ferramentas.gerar`.
3. Esperado: objetos novos aparecem como "sem anotação"; objetos que sumiram fazem as anotações
   deles aparecerem como órfãs (retorno 2, com a lista); nada do texto explicativo dos objetos que
   não mudaram se perde.
