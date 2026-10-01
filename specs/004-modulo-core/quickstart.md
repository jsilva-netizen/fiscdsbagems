# Quickstart: validar o módulo core

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Roteiro para provar que o core atende a spec, no **repositório novo** do sistema
([research R1](./research.md)). Os comandos rodam da raiz dele.

## Pré-requisitos

- Docker e Docker Compose (PostgreSQL 16, Redis 7, MinIO e Mailpit sobem pelo `compose.yaml`).
- Python 3.12 e Node 20 para rodar backend e frontend fora dos contêineres, se preferir.

## 1. Subir o ambiente

```bash
docker compose up -d
cd backend && python manage.py migrate && python manage.py carregar_referencias
python manage.py criar_admin --email admin@exemplo.gov.br --nome "Administrador"
```

Esperado: 3 diretorias, 10 câmaras, 9 serviços, 5 papéis e 79 municípios carregados; o e-mail de
primeiro acesso do administrador aparece no Mailpit (`http://localhost:8025`).

## 2. Testes automáticos

```bash
cd backend && pytest
lint-imports
```

Esperado: todos passam, incluindo:

- a matriz de acesso de [contracts/matriz-acesso.md](./contracts/matriz-acesso.md), caso a caso
  (SC-001);
- a varredura que exige entrada na matriz para toda rota;
- o isolamento: usuários de duas câmaras não alcançam registros um do outro por nenhuma rota nem
  pela sincronização (SC-002);
- nenhuma rota responde sem login além das de entrada (SC-003);
- `lint-imports`: nenhum app importa outro fora da direção permitida (constituição v2.5.0).

## 3. Primeiro acesso e verificação por código (User Story 2)

1. Seguir o link do e-mail de primeiro acesso e definir a senha.
2. Entrar com e-mail e senha: a resposta pede código; o código chega no Mailpit.
3. Informar o código: acesso liberado e aparelho confirmado.
4. Sair e entrar de novo no mesmo navegador: sem código.
5. Entrar em outro navegador: pede código.
6. Errar o código 5 vezes: o desafio é encerrado; pedir novo código funciona.

Esperado: tudo em até 3 minutos no primeiro acesso (SC-004).

## 4. Cadastro de usuários pelo administrador (User Story 1)

1. Criar um fiscal da CATESA, um fiscal da CATERS, um diretor da DSB e dois prestadores da mesma
   entidade.
2. Tentar criar um prestador sem entidade e um fiscal com câmara de outra diretoria: recusados.
3. Com um coordenador, tentar criar ou desativar usuário pela API: recusado.
4. Desativar o fiscal da CATERS depois de ele ter criado uma entidade: ele não entra mais, e a
   auditoria da entidade continua com o nome dele (SC-006).

## 5. Entidades, documentos e contratos (User Stories 4 e 5)

1. Com o frontend sem rede (modo avião do navegador), procurar o cadastro de entidades: o item do
   menu fica desabilitado, e digitar o endereço leva ao início da área de campo; nela, as entidades
   baixadas aparecem para consulta. Com rede, cadastrar uma entidade e um contrato: aparecem para os demais.
2. Anexar um PDF à entidade; pedir o endereço com um prestador de outra entidade: 404.
3. Enviar um arquivo de texto como logotipo: recusado.
4. Tentar excluir uma entidade com contrato: 409; desativá-la: o contrato continua consultável.

## 6. Diretor e referência (User Stories 3 e 6)

1. Entrar com o diretor da DSB: vê os painéis consolidados; abre um registro da CATESA só para
   leitura; não vê nada da DTR.
2. Listar câmaras: 10, sem CATERM e CATESG. Tentar alterar um município como coordenador: recusado.

## 7. Migração de dados (SC-007)

```bash
cd backend && python manage.py migrar_core --dump <caminho do dump de produção> --conferir
```

Esperado: diretorias, câmaras em uso, municípios, entidades, contratos, usuários e os registros de
auditoria carregados com os mesmos identificadores; relatório de conferência registro a registro
sem pendência (exceto CATERM, CATESG e os registros decididos no A-002).
