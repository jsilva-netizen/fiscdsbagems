# Problem Definition: Integrar fiscdsbagems ao SISREG como app Django, removendo o Supabase

- **Slug**: django-refactor
- **Created**: 2026-09-17
- **Updated**: 2026-09-17 (4ª rodada — as 10 questões em aberto foram decididas com o usuário)
- **Inputs used**: intake.md, research.md, esclarecimentos do usuário (4 rodadas), documentação do SISREG em `sisreg/`

## Problem Statement

O fiscdsbagems precisa deixar de ser um sistema autônomo sobre Supabase e passar a operar como um **app Django dentro do projeto do SISREG** — o sistema guarda-chuva de regulação da AGEMS (v3.0, em produção: Django 5.x, Python 3.11, PostgreSQL 15, Docker), compartilhando o **mesmo banco PostgreSQL self-hosted** e as **mesmas entidades**, nos dois sentidos. O obstáculo não é apenas de stack: os dois sistemas modelam **o mesmo domínio regulatório de formas diferentes** — o SISREG já possui Entidade (alias `Concessionaria`), Instrumento (alias `Contrato`), Obrigacao, Acao (fiscalizações de campo com checklist, fotos com GPS e documentos), Usuario e Notificacao, com chaves inteiras e arquivos em filesystem, enquanto o fiscdsbagems tem seu modelo equivalente com chaves UUID, autorização em 163 policies RLS e arquivos em buckets do Supabase Storage. O problema, portanto, é de **convergência de modelo de domínio e de identidade**, não só de substituição de backend.

## Affected Users & Stakeholders

- **Users**: Fiscais e técnicos que usam o fiscdsbagems em campo, **inclusive totalmente offline** — é o caso de uso mais sensível da migração e não pode regredir. Também admins e prestadores.
- **Users (SISREG)**: Usuários já ativos no SISREG em produção, em 6 perfis hierárquicos (0–5) mapeados para Grupos do Django (`Gestores`, `Tecnicos`, `Visualizadores`).
- **Stakeholders**: AGEMS, dona e operadora do SISREG, que impõe o requisito de compatibilidade e cuja decisão determina se o fiscdsbagems é oficialmente implantado.
- **Stakeholders**: Equipe de desenvolvimento do fiscdsbagems, que executa a migração e responde pela reconciliação dos dois modelos.
- **Stakeholders**: Equipe do SISREG — o schema deles será referenciado e estendido; há trabalho e risco do lado deles também.

## Goals

- **Objetivo primário**: fiscdsbagems roda integralmente como um **app Django dentro do projeto do SISREG**, self-hosted, com **zero dependência de Supabase**.
- **Banco e entidades compartilhados**: um único PostgreSQL self-hosted, com as entidades conversando nos dois sentidos.
- **Backend único**: Django/Python, requisito do SISREG.
- **Autorização em Django**: as garantias das 163 policies RLS reimplementadas em nível de aplicação, convivendo com o RBAC de 6 perfis do SISREG.
- **Offline preservado integralmente com Dexie.js** — que o projeto **já usa hoje** (`dexie@^4.3.0`). Muda o transporte de sincronização, não o armazenamento local.
- **Frontend React permanece SPA separado**, consumindo API do Django.
- **Migração de usuários com mapeamento de equivalência** explícito entre contas atuais e usuários do SISREG.
- **Preservação funcional total**, com código manutenível a longo prazo por qualquer dev.
- **Execução sobre uma cópia, com virada única**: a produção atual **não é tocada** e segue rodando normalmente; todo o trabalho ocorre sobre uma cópia do código. "Passo a passo" refere-se à **ordem das alterações no código** (ex.: primeiro isolar e remover as chamadas ao Supabase atrás de uma camada de abstração, depois construir o app Django), não a uma migração incremental em produção. Sem prazo imposto.
- **Migração integral de dados**: absolutamente **todo** o dado hoje em produção — registros, fotos, documentos e fiscalizações já executadas — precisa chegar ao novo ecossistema dentro do SISREG. Nada pode ficar para trás.

## Non-Goals

- **Não** migrar o frontend para templates Django/Bootstrap do SISREG.
- **Não** substituir o Dexie.js nem reprojetar o armazenamento local offline.
- **Não** alterar o sistema em produção durante a construção do novo — ele permanece intocado até a virada.
- **Não** portar o motor de sincronização "como está" — preserva-se a funcionalidade, não a implementação acoplada ao Supabase.
- **Não** reduzir escopo funcional para o usuário final.
- **Não** converter as PKs existentes de nenhum dos dois lados (ver decisão 2).

## Decisões Tomadas

Restrições de entrada acordadas com o usuário. O desdobramento em opções de implementação e sequenciamento é trabalho do `/speckit-assess-shape`.

| # | Tema | Decisão | Racional |
|---|------|---------|----------|
| 1 | Banco do SISREG | **PostgreSQL 15** (o "SQLite3" da doc está desatualizado) | Sem projeto prévio de migração; o banco compartilhado já existe |
| 2 | Chaves primárias | **Híbrido**: SISREG segue INTEGER, fiscalização segue UUID; FKs cruzadas usam o tipo do dono | Nenhum lado converte PKs; preserva a geração de ID no cliente, que o offline exige |
| 3 | `fiscalizacoes` × `Acao` | **Entidade própria com FK opcional para `Acao`** | São coisas diferentes: `Acao` é planejamento (pende de Obrigacao, NOT NULL); fiscalização é execução de campo com nível intermediário de unidade |
| 4 | Entidade e Contrato | **SISREG é fonte única** (`Entidade`, `Instrumento`); campos exclusivos da fiscalização em **tabela de extensão 1:1** | Mesmo objeto do mundo real (CNPJ único); não polui cadastro genérico com campos de rodovia |
| 5 | Isolamento organizacional | **Câmara Técnica = `Subunidade` do SISREG** | Os dois já modelam a hierarquia real da AGEMS; o `Usuario` do SISREG já tem `diretoria_id` e `subunidade_id` |
| 6 | API e autenticação | **DRF + SimpleJWT** | Padrão de facto, maior base de devs; JWT sobrevive ao uso offline prolongado e é o modelo que o frontend já usa |
| 7 | Arquivos | **Filesystem via `django-storages`** (backend abstraído) | Alinha ao SISREG, zero infra nova, acesso restrito por view Django; trocar para S3/MinIO depois é configuração |
| 8 | Filas assíncronas | **Celery + Redis** | Cobre IA, relatórios e o agendamento das rotinas de prazo com uma só ferramenta conhecida por qualquer dev Django |
| 9 | Colisão de nomes | **Manter `Notificacao` (SISREG) e `TermoNotificacao` (fiscalização)**, separados por app | Namespace do Django já resolve; "Termo de Notificação" é o termo jurídico correto |
| 10 | Schema do SISREG | **Obter `models.py` do projeto** | Documentação incompleta e já comprovadamente imprecisa; código é a fonte de verdade e será necessário de todo modo |

## Success Metrics

- **Zero Supabase**: nenhuma chamada a Supabase Auth, Postgres gerenciado, Storage ou Edge Functions. Baseline do research.md: 7 arquivos com `supabase.auth.*`, 19+ com Storage, 9 Edge Functions, 117 migrations → alvo 0 em todos.
- **Banco único e entidades compartilhadas**: fiscalização e SISREG sobre a mesma instância PostgreSQL, com referência cruzada real funcionando nos dois sentidos.
- **Offline intacto**: fluxo completo de campo sem rede — ocorrência, checklist, foto com GPS — seguido de sincronização bem-sucedida ao reconectar.
- **Paridade funcional**: autorização equivalente às RLS, sync offline e pipelines assíncronos de IA e relatórios continuam funcionando.
- **Migração integral de dados, verificável**: contagem por tabela e por bucket conferindo origem e destino, sem nenhum registro, foto ou documento faltando. É critério binário — 99% não passa.
- **Produção intocada até a virada**: nenhuma alteração no fiscdsbagems em produção durante a construção do novo sistema.

## Cost of Inaction

**Se a migração não acontecer, o sistema não será utilizado — não será oficialmente implantado na AGEMS.** O custo da inação não é degradação gradual: é a perda total do investimento já feito no fiscdsbagems, que permaneceria fora do guarda-chuva regulatório oficial da agência. Isso eleva a integração de "melhoria técnica" para **condição de existência do produto**.

## Open Questions

As 10 questões da rodada anterior foram decididas (ver tabela acima). Restam pendências de insumo e de processo, não de definição:

- **[AÇÃO PENDENTE: obter os `models.py` do SISREG]** — decidido na questão 10, ainda não cumprido. É o principal bloqueio para o mapeamento fino de dados (`AcaoFoto`, `AcaoDocumento`, `AcaoMarcador`, Indicadores e georreferências não têm especificação na documentação disponível).
- [NEEDS CLARIFICATION: quem é o contato técnico do lado do SISREG e qual o processo para propor alterações no schema deles — a decisão 4 (extensão 1:1) e a 5 (câmara como Subunidade) dependem de acordo com essa equipe.]
- [NEEDS CLARIFICATION: existe critério de aceite formal do SISREG para admitir o fiscdsbagems como app?]
- [NEEDS CLARIFICATION: o que já está cadastrado como `Subunidade` no SISREG em produção — precisa bater com a lista oficial de câmaras técnicas para a decisão 5 se concretizar sem conflito.]
