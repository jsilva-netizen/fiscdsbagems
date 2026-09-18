# Contrato do Provedor

O provedor é a peça substituível. Hoje existe uma implementação (Supabase); na fase 2
nasce outra (Django) e a aplicação não percebe. Este documento define as **oito** categorias
que qualquer provedor precisa cumprir — as sete enumeradas em *Key Entities* na spec, mais
*Alcançabilidade*, descoberta durante o levantamento de acoplamento do plano e ausente da
especificação original.

Nenhuma assinatura de código aparece aqui: o contrato é de **comportamento**, e a forma
concreta é decidida na implementação.

---

## 1. Registros

Leitura e escrita de dados estruturados.

| Operação | Comportamento esperado |
|---|---|
| Buscar muitos | Recebe coleção, critérios de filtro, ordenação e paginação; devolve lista e, quando solicitado, a contagem total |
| Buscar um | Recebe coleção e identificador; devolve o registro ou erro `nao_encontrado` |
| Criar | Recebe coleção e dados; devolve o registro criado, com identificador e campos preenchidos pelo servidor |
| Atualizar | Recebe coleção, identificador e campos alterados; devolve o registro atualizado |
| Remover | Recebe coleção e identificador; confirma remoção |
| Criar ou atualizar em lote | Recebe coleção e conjunto de registros; devolve os resultados na mesma ordem da entrada |

**Regras**

- A ordem dos resultados MUST ser determinística e igual à atual. Várias telas dependem de
  ordenação implícita hoje; alterá-la é regressão visível.
- Operação em lote MUST preservar a ordem de entrada na saída.
- Falha parcial em lote MUST ser reportada por item, não como falha global, se é assim que
  o comportamento atual se apresenta ao usuário.
- Relações carregadas junto (dados de tabelas ligadas numa mesma consulta) MUST ser
  declaradas de forma neutra — por nome de relação, nunca por sintaxe de backend.

**Caso especial — Auditoria**: a consulta ao histórico de alterações (`audit_logs`) usa
hoje um filtro PostgREST incomum (grupos `and(...)` combinados com operadores de caminho
JSON sobre colunas JSONB `old_data`/`new_data`), povoado por triggers de banco não
replicados nesta fase (ver `research.md`, decisão D12). Cabe em "Buscar muitos" como
operação, mas seu formato de filtro é específico o bastante para merecer nome de operação
próprio (`buscarHistoricoAlteracoes`) em vez de composição genérica de critérios — a
tradução deste filtro para outra forma de armazenar auditoria é decisão da fase 2, não
desta.

---

## 2. Arquivos

Envio e obtenção de fotos de evidência e documentos.

| Operação | Comportamento esperado |
|---|---|
| Enviar | Recebe repositório lógico, caminho e conteúdo; devolve referência do arquivo |
| Obter endereço de acesso | Recebe referência; devolve endereço utilizável pelo navegador, respeitando restrição de acesso |
| Remover | Recebe referência; confirma remoção |
| Listar | Recebe repositório e prefixo de caminho; devolve referências |

**Regras**

- O contrato MUST NOT expor como o endereço é construído. Hoje são URLs assinadas com
  expiração; na fase 2 será outra coisa, e nenhuma tela pode depender disso.
- O envio MUST aceitar conteúdo binário vindo do caminho offline, onde a foto é capturada
  como texto codificado e convertida antes do envio.
- Restrição de acesso MUST ser preservada: arquivo privado continua privado.

---

## 3. Identidade e sessão

| Operação | Comportamento esperado |
|---|---|
| Autenticar | Recebe credenciais; devolve sessão ou erro |
| Encerrar sessão | Invalida a sessão local e remota |
| Obter usuário corrente | Devolve identidade e perfil, ou ausência de sessão |
| Observar mudança de sessão | Notifica a aplicação quando a sessão muda, expira ou é renovada |
| Renovar credencial | Mantém a sessão válida durante uso prolongado |

**Regras**

- A renovação MUST continuar funcionando durante uso offline prolongado, cenário citado nos
  casos de borda da spec.
- Expiração MUST produzir o mesmo efeito visível de hoje — mesma mensagem, mesmo destino de
  navegação.
- Esta categoria é a que mais muda na fase 2 (a sessão passa a ser um token do Django).
  Quanto mais neutro o contrato aqui, menor o impacto lá.

---

## 4. Procedimentos remotos

Operações executadas no servidor que não são leitura ou escrita simples de uma coleção.

| Operação | Comportamento esperado |
|---|---|
| Executar procedimento | Recebe nome lógico e parâmetros; devolve resultado |

**Regras**

- O nome MUST ser lógico e do domínio, não o nome da função no banco. O Django não terá as
  mesmas funções, e um nome de banco vazando no contrato força mudança nas telas.
- Cada procedimento MUST ser documentado com a intenção de negócio que atende — é o que
  permite reimplementá-lo do outro lado sem arqueologia.

**Os 7 procedimentos reais** — identificados por leitura direta do SQL nas migrations, não
por inferência do uso no cliente (ver
[rpcs-funcoes-e-triggers-postgres.md](../rpcs-funcoes-e-triggers-postgres.md) para o
comportamento completo de cada um, decisão D11 de `research.md` para a tabela de
nomeação):

| Nome lógico | Intenção de negócio | Ressalva conhecida |
|---|---|---|
| `finalizarFiscalizacao` | Encerrar a fiscalização, consolidando NC/determinação/recomendação de cada unidade e gerando o número do termo | Numeração por **ranking** entre fiscalizações do ano, não contador simples — fácil de replicar errado na fase 2 |
| `reabrirFiscalizacao` | Reverter uma fiscalização finalizada para edição | — |
| `gerarNumeroAuto` | Obter o próximo número oficial de auto de infração | ⚠️ **Não é atômico** hoje (`SELECT COUNT(*) + 1` sem trava) — ver `debitos-tecnicos-e-inconsistencias.md` item 1. Esta camada transporta o comportamento fielmente; não corrige o defeito |
| `gerarNumeroAm` | Obter o próximo número oficial de auto de manifestação | Mesma ressalva de `gerarNumeroAuto` |
| `excluirUsuarioAdmin` | Exclusão administrativa de usuário (por ID ou e-mail), com verificação de privilégio | — |
| `obterResumoIndicadores` | Agregação do painel de indicadores, com filtros por ano/serviço/município/prestador/módulo | Envolve `unnest` de array Postgres (`servicos`) — a fase 2 precisa decidir o modelo de dado equivalente antes de traduzir |
| `importarDoCaters` | Importar recomendações e determinações de uma fiscalização para um processo CATERS | — |

**Regra adicional**: esta camada MUST preservar o comportamento de cada procedimento
**exatamente como está hoje**, incluindo defeitos conhecidos (como a numeração não atômica)
— corrigir esses defeitos é decisão do usuário, fora do escopo de um encapsulamento de
frontend, e nunca deve acontecer como efeito colateral da refatoração.

---

## 5. Processamento assíncrono

Tarefas longas: geração de relatório em PDF e análise assistida por IA (CATERS e CATESA).

| Operação | Comportamento esperado |
|---|---|
| Solicitar | Recebe tipo de tarefa e parâmetros; devolve identificador da tarefa |
| Consultar situação | Recebe identificador; devolve estado, progresso quando houver, e resultado quando concluída |
| Cancelar | Quando o comportamento atual permitir |

**Regras**

- O acompanhamento de progresso MUST preservar a cadência atual de consulta: alterá-la muda
  o que o usuário vê sem que nada tenha quebrado.
- Já existe abstração parcial em `src/lib/edgeFunctions.js`, com zero chamadas diretas no
  aplicativo. Esta categoria MUST absorvê-la em vez de criar caminho paralelo.

---

## 6. Sincronização offline

A ponte entre a fila local e o backend. É a categoria mais sensível da fase.

| Operação | Comportamento esperado |
|---|---|
| Enviar item da fila | Recebe um item do outbox; devolve confirmação de persistência remota |
| Confirmar persistência | Sinaliza que o item pode ser removido da fila local |
| Relatar falha | Devolve falha classificada, para o motor decidir entre repetir e adiar |

**Regras — nenhuma destas é negociável**

- A remoção do item da fila local MUST continuar ocorrendo **somente** após confirmação de
  persistência remota. É a invariante que hoje impede perda de dado de campo.
- A ordem de envio MUST ser preservada exatamente.
- A classificação de falha MUST distinguir o que é temporário (rede) do que é definitivo
  (dado inválido), porque o motor atual trata os dois de formas diferentes.
- Este contrato MUST ser exercitado por teste ponta a ponta com desligamento e religamento
  real da conectividade, não por chamada direta.

---

## 7. Alcançabilidade

Responde a uma única pergunta: **o backend está acessível agora?** É o gatilho de todo o
comportamento offline.

| Operação | Comportamento esperado |
|---|---|
| Verificar alcançabilidade | Devolve se o backend responde, dentro de um limite de tempo |
| Observar mudança de estado | Notifica a aplicação quando a conectividade muda |

**Por que esta categoria existe**

Hoje a verificação está codificada contra endereços do Supabase em dois lugares —
`src/hooks/useOnline.js` e a função de alcançabilidade dentro de `src/lib/offline/syncEngine.ts`
— e ambos requisitam `/auth/v1/health` e `/rest/v1/`.

Se isso não for abstraído, a fase 2 produz a pior falha possível deste sistema: com o
Supabase desligado, o aplicativo conclui que está **permanentemente offline**. E como o modo
offline funciona corretamente, não aparece erro algum. O fiscal trabalha, a fila local
cresce, nada sincroniza, e a descoberta acontece quando alguém nota que nenhum dado novo
chegou — com dias de trabalho de campo presos em dispositivos.

**Regras**

- O endereço consultado MUST ser determinado pelo provedor, nunca pelo consumidor.
- As duas implementações atuais MUST convergir para esta categoria. Manter duas noções
  independentes de "estou online" é fonte de divergência entre o que a interface mostra e o
  que o motor de sincronização decide.
- O limite de tempo e a cadência de verificação MUST preservar os valores atuais: alterá-los
  muda quando a sincronização dispara.

---

## 8. Registro de operações

Transversal às seis categorias anteriores (FR-023, FR-024).

| Aspecto | Comportamento esperado |
|---|---|
| Ativação | Desligado por padrão; ativável por configuração em tempo de execução |
| Conteúdo | Tipo de operação, domínio, alvo, duração, resultado |
| Exclusão | Valores trafegados, dado pessoal e conteúdo sigiloso MUST NOT ser registrados |

**Regra**: com o registro desligado, o custo MUST ser desprezível — nenhuma serialização,
nenhuma alocação significativa.
