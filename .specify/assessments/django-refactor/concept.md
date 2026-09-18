# Concept: Migração do fiscdsbagems para app Django do SISREG

- **Slug**: django-refactor
- **Created**: 2026-09-17
- **Updated**: 2026-09-18 (estratégia definida pelo usuário: Opção C, sobre cópia do código, com migração integral de dados)
- **Recommended option**: Opção C — reconstrução em cópia, com virada única

As decisões técnicas estão fechadas em `problem.md` (PKs híbridas, DRF+JWT, Celery+Redis, django-storages, SISREG como fonte única de Entidade/Instrumento, câmara técnica = Subunidade, fiscalização como entidade própria com FK opcional para `Acao`). As opções abaixo diferem em **estratégia e sequência**, não nessas escolhas.

## Options

### Option C — Reconstrução em cópia, com virada única *(escolhida)*

- **Sketch**: A produção atual **não é tocada** e segue rodando normalmente sobre o Supabase. Todo o trabalho acontece sobre uma **cópia do código**, transformada em etapas ordenadas até virar o app Django dentro do projeto do SISREG. Quando o novo sistema estiver completo e os dados integralmente migrados e conferidos, faz-se a virada única: o SPA passa a apontar para o backend novo e o Supabase é desligado. Para o fiscal, nada muda até o dia da virada — e depois dela, tudo continua funcionando igual, com os mesmos dados.
- **Appetite**: `large` (meses)
- **"Passo a passo" aqui significa a ordem das alterações no código, não entrega incremental em produção.** A sequência pretendida começa por **desacoplar**: isolar e remover as chamadas diretas ao Supabase espalhadas pelo app, colocando-as atrás de uma camada de abstração de acesso a dados. Só depois se constrói o app Django e se troca a implementação por trás dessa camada. A ordem exata não está fechada e é trabalho do `/speckit-specify`.
- **Trade-offs**: Ganha risco zero para o sistema em produção durante toda a construção — que é a maior vantagem sobre qualquer abordagem incremental, e que nenhuma outra opção oferece. Ganha também o código final mais limpo: como os dois backends nunca coexistem em produção, não existe ponte de sincronização temporária, que era o maior rabbit hole da alternativa incremental. Sacrifica a validação precoce em campo: o comportamento real com fiscais usando o sistema só é exercitado depois da virada. E concentra o risco num evento único, cujo ponto crítico não é o código — é o dado.
- **Rabbit holes**:
  - **Divergência entre a cópia e a produção.** É o risco que historicamente mata projetos de reconstrução paralela. Se a produção continuar recebendo funcionalidades enquanto a cópia é construída, a cópia fica para trás e o alvo da migração se move. O repositório mostra desenvolvimento ativo recente (termos de notificação, jobs de IA, relatórios), então isso não é hipotético: exige congelamento de funcionalidades na produção ou disciplina de portar cada mudança para a cópia — e esta segunda alternativa custa caro ao longo de meses.
  - **Dados presos nos dispositivos no momento da virada.** O requisito é que nada fique de fora, mas fiscalizações e fotos em base64 que estejam no outbox local de um celular e ainda não sincronizaram **não estão na produção** — estão no navegador do fiscal. Se a virada acontecer com dispositivos dessincronizados, esse dado some, e em contexto de fiscalização regulatória isso pode ter consequência jurídica. Exige uma etapa explícita de drenagem de todos os dispositivos antes do corte.
  - **Volume e tempo de migração dos arquivos.** Mover todas as fotos de evidência e documentos dos buckets para o filesystem tende a ser a parte mais lenta da virada, e o volume hoje é desconhecido. Precisa ser medido cedo, porque define o tamanho da janela de indisponibilidade.
  - **Cobertura do schema.** São 117 migrations e qualquer tabela que guarde dado e seja esquecida no modelo Django vira perda silenciosa — não falha, simplesmente não migra. A conferência precisa partir do inventário do banco, não da lista de telas do app.

### Option A — Fatia vertical piloto *(considerada, não escolhida como estratégia)*

- **Sketch**: Uma fatia estreita de ponta a ponta dentro do projeto do SISREG, para validar as suposições antes do compromisso maior.
- **Appetite**: `medium` (semanas)
- **Trade-offs**: Não foi adotada como estratégia de migração, mas a lógica por trás dela continua válida e pode ser absorvida pela Opção C: várias suposições do plano dependem do SISREG e estão fora do nosso controle (ver *Assumptions*). Validá-las cedo, dentro da própria construção da cópia, custa pouco e evita descobrir tarde que uma decisão estrutural não se sustenta.

### Option B — Estrangulamento incremental por domínio *(considerada, não escolhida)*

- **Sketch**: Migração em fatias sucessivas, com os dois backends coexistindo em produção e cada fatia trocando de fonte por baixo.
- **Appetite**: `large` (meses)
- **Trade-offs**: Rejeitada. Entregava validação contínua, mas ao custo de meses com dois backends ativos em produção e de uma ponte de sincronização offline — um outbox decidindo por registro se vai para o Supabase ou para o Django. Essa ponte é trabalho descartável e concentrava o maior risco técnico do projeto. A Opção C elimina esse problema inteiramente, o que é o argumento mais forte a favor da escolha feita.

### Option D — Não prosseguir *(descartada)*

- **Sketch**: Manter o fiscdsbagems como está, fora do SISREG.
- **Trade-offs**: Descartada, e não por preferência técnica: `problem.md` registra que a consequência da inação é o sistema **não ser oficialmente implantado na AGEMS**. A alternativa a migrar não é "continuar como está", é o produto não existir.

## Recommendation

**Opção C**, conforme decidido: construção sobre cópia, produção intocada, virada única, com migração integral dos dados.

A escolha é coerente com as restrições reais do projeto. Manter a produção intocada elimina toda uma classe de risco que as abordagens incrementais carregam, e a ausência de coexistência entre backends remove a ponte de sincronização offline, que era o ponto mais perigoso da alternativa incremental. A sequência proposta — desacoplar do Supabase atrás de uma camada de abstração antes de construir o Django — é especialmente boa por um motivo que vale explicitar: essa camada pode ser introduzida e validada **enquanto o app ainda roda sobre o Supabase**, com o comportamento atual como referência de corretude. É a forma mais barata de garantir que o frontend não regrediu, antes mesmo de existir backend novo.

A objeção que permanece é que o caminho offline só é exercitado com usuários reais depois da virada. Ela é mitigável sem mudar a estratégia: com a camada de abstração em pé, o SPA pode ser testado contra o backend Django em ambiente de desenvolvimento muito antes do corte, inclusive com cenários de campo simulados. Isso não elimina o risco, mas o tira do dia da virada, que é onde ele custaria caro.

O ponto que merece decisão consciente agora, e não depois, é o **congelamento da produção**. A Opção C só funciona se o alvo parar de se mover. Se a agência precisar de funcionalidades novas durante os meses de construção, elas devem entrar na cópia — nunca na produção — e a produção segue apenas recebendo correções críticas. Sem essa regra, a cópia envelhece e a migração de dados precisa ser refeita.

## Out of Scope (for the recommended option)

Herdado dos non-goals do `problem.md`:

- Reescrever o frontend ou migrá-lo para templates Django/Bootstrap do SISREG — o React/Vite continua SPA separado.
- Substituir o Dexie.js ou reprojetar o armazenamento local offline.
- Reduzir ou alterar escopo funcional para o usuário final.
- Converter as chaves primárias de qualquer um dos dois lados.
- Alterar o sistema em produção durante a construção.

Excluído adicionalmente neste concept:

- **Funcionalidade nova na produção durante a construção.** Recursos novos entram na cópia; a produção recebe apenas correção crítica.
- **Refatorar ou melhorar o modelo do SISREG** além do mínimo necessário à integração (a extensão 1:1 e a FK opcional).
- **Migrar o SISREG para outro storage, fila ou infraestrutura.** As decisões 7 e 8 valem para o app de fiscalização.
- **Otimização de performance** que não seja recuperar paridade com o comportamento atual.
- **Melhorias de UX aproveitando a reconstrução.** A virada já carrega risco suficiente; mudança de comportamento visível ao usuário dificulta distinguir regressão de mudança intencional.

## Assumptions to Validate

Fora do nosso controle, dependem do SISREG:

- Os `models.py` do SISREG estarão acessíveis (decisão 10 — ainda pendente).
- O PostgreSQL 15 em produção se confirma no ambiente real — a documentação do banco já se contradisse dizendo SQLite.
- As `Subunidade` cadastradas no SISREG correspondem às câmaras técnicas oficiais, ou podem ser ajustadas sem conflitar com uso existente.
- A equipe do SISREG aceita as duas alterações no schema deles: a extensão 1:1 e a FK opcional de fiscalização para `Acao`.
- É possível adicionar um app ao projeto Django do SISREG e fazer deploy sem quebrar o ciclo de release deles, e existe ambiente de homologação para testar antes.
- Existe processo e interlocutor definidos para propor mudanças no schema deles.

Sob nosso controle, mas não verificadas:

- **A produção pode ser congelada** para funcionalidades novas durante os meses de construção — premissa da qual a Opção C inteira depende.
- **Todos os dispositivos em campo podem ser drenados** antes da virada, de forma verificável, para que nenhum dado local se perca.
- O volume total de fotos e documentos nos buckets cabe numa janela de virada aceitável — precisa ser medido.
- Todo dado em produção tem destino no modelo novo: nenhuma das tabelas das 117 migrations que guarde informação fica sem correspondente.
- A preservação dos UUIDs (decisão 2) permite conferir a migração registro a registro por identificador, e não apenas por contagem — o que torna o critério de completude verificável de fato.
- DRF com JWT conviverá no mesmo projeto com a autenticação por sessão dos templates do SISREG.
- A camada de abstração consegue isolar o Supabase a ponto de a troca de implementação ficar contida, sem espalhar mudança pelo app inteiro.
- As 163 policies RLS podem ser traduzidas em autorização Django com cobertura **testável** — não apenas reimplementadas por leitura.
- Prestadores e contratos casam por CNPJ com as entidades do SISREG, com exceções em volume tratável manualmente.
