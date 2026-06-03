# 🚀 AGEMS - Sistema de Fiscalização e Sancionamento

**Versão 1.0 - Junho 2026**

Sistema completo de **Fiscalização de Campo, Checklists de Instalações, Gestão de Não Conformidades (NCs) e Sancionamento Administrativo** da **AGEMS - Agência de Regulação de Serviços Públicos de Mato Grosso do Sul**. O sistema possui arquitetura offline-first para uso em campo e motor de sincronização reativa com o Supabase.

---

## 📦 1. Instalação e Configuração do Ambiente de Desenvolvimento

### **Pré-requisitos**
- ✅ Node.js (Versão 18.x ou superior)
- ✅ NPM (Versão 9.x ou superior)
- ✅ Supabase CLI instalado globalmente (para desenvolvimento local de banco de dados)
- ✅ Docker Desktop (caso queira rodar o Supabase localmente)

### **Passo a Passo de Instalação**

1.  **Instalação de Dependências:**
    No diretório raiz do projeto, instale os pacotes npm necessários:
    ```bash
    npm install
    ```

2.  **Configuração de Variáveis de Ambiente:**
    Crie o arquivo `.env.local` na raiz do projeto com as credenciais do seu projeto Supabase:
    ```env
    VITE_SUPABASE_URL=https://sua-url-supabase.supabase.co
    VITE_SUPABASE_ANON_KEY=seu-anon-key-aqui
    ```

3.  **Executar Servidor de Desenvolvimento:**
    Inicie o bundler Vite localmente:
    ```bash
    npm run dev
    ```
    Acesse a aplicação em: `http://localhost:5173`

4.  **Gerar Build de Produção:**
    Valide e compile o projeto para distribuição estática:
    ```bash
    npm run build
    ```

---

## 💾 2. Arquitetura Técnica do Banco de Dados (Supabase/PostgreSQL)

O banco de dados relacional utiliza o **PostgreSQL** do Supabase com as seguintes diretrizes estruturais e de segurança:

### **Migrações e Modelagem**
Todas as tabelas, índices, triggers e funções estão versionadas no diretório [supabase/migrations](file:///c:/Users/jsilva/Documents/AGEMS/antigravity/fiscdsbagems/supabase/migrations). A modelagem técnica completa das 22 tabelas pode ser consultada no arquivo de documentação do banco [ESTRUTURA_BANCO_DADOS.md](file:///c:/Users/jsilva/Documents/AGEMS/antigravity/fiscdsbagems/ESTRUTURA_BANCO_DADOS.md).

### **Sincronização de Triggers e Eventos**
O banco de dados do sistema é reativo e automatiza processos usando triggers PL/pgSQL:
-   **Consolidação de Modificações:** Alterações em tabelas filhas (como respostas de checklist ou constatações manuais) propagam atualizações para a tabela pai (`fiscalizacoes`), garantindo invalidação de caches no frontend.
-   **Auditoria Transacional:** A tabela `audit_logs` armazena o histórico em formato JSON de qualquer inserção, deleção ou modificação de registros críticos, apontando o autor e a alteração efetuada.

---

## 📴 3. Mecanismo de Armazenamento Offline (Offline-First Engine)

O aplicativo foi projetado para operar sem sinal de internet em campo, utilizando um motor de persistência híbrida:

### **Como funciona a Persistência Local:**
-   **Repositório (`Repository`):** Localizado em `src/lib/offline/repository.ts`. Ele encapsula as operações de leitura e gravação no banco de dados. Caso o sistema esteja online, as queries e escritas são direcionadas diretamente à API do Supabase. Caso esteja offline, os dados são armazenados localmente no navegador utilizando **IndexedDB** por meio de esquemas de tabelas locais.
-   **Motor de Sincronização (`syncEngine`):** O módulo `src/lib/offline/syncEngine.ts` monitora o status de conectividade do navegador.
    -   Quando há alterações offline, as operações de escrita são salvas em um buffer local de saída (**Outbox Queue**).
    -   Assim que a rede é restabelecida, o `syncEngine` executa um loop sequencial esvaziando a fila de outbox por chamadas HTTP, garantindo a ordem lógica e evitando conflitos de integridade e RLS no banco de dados remoto.
-   **Extração de Metadados de Fotos:** A câmera do app lê metadados **EXIF** dos arquivos de imagem para recuperar latitude/longitude GPS locais de onde a foto foi tirada em campo, mesmo sem rede celular ativa.

---

## ⚛️ 4. Arquitetura de Estado e Query (React Query)

O gerenciamento de dados remotos no frontend é estruturado com o **TanStack React Query**:

-   **Gerenciamento de Caches:**
    -   `staleTime`: Configurado em `60000ms` (1 minuto) para listagens gerais, evitando consultas redundantes à API durante a navegação.
    -   `gcTime` (Garbage Collector): Mantido em `300000ms` (5 minutos) para limpeza de memória cache inativa.
-   **RPC de Resumo de Indicadores:**
    O dashboard da tela de relatórios consome os indicadores compilados de forma unificada através da RPC `obter_resumo_indicadores`. Isso elimina a necessidade de fazer múltiplas requisições simultâneas para tabelas de NCs, Checklist, Respostas, Determinações e Recomendações e evita o estouro do limite de 1.000 linhas padrão do PostgREST.

---

## 📁 5. Estrutura de Diretórios do Projeto

```
fiscdsbagems/
├── 📄 README.md                 # Documentação do Desenvolvedor (este arquivo)
├── 📄 MANUAL_USUARIO.md          # Manual de uso didático e FAQ para Fiscais
├── 📄 ESTRUTURA_BANCO_DADOS.md  # Dicionário de dados, PL/pgSQL e Triggers
├── 📄 package.json              # Scripts e pacotes npm
├── 📄 vite.config.js            # Configurações do bundler Vite
├── 📂 public/                   # Recursos estáticos de imagem e logos
├── 📂 supabase/                 # Infraestrutura do banco de dados remota
│   ├── 📂 migrations/           # Scripts SQL organizados e indexados por número
│   └── 📂 functions/            # Edge Functions de processamento
└── 📂 src/                      # Código-fonte da aplicação React
    ├── 📂 components/           # Componentes UI reutilizáveis (Card, Modais)
    │   ├── 📂 fiscalizacao/     # Geradores de PDFs e Relatórios
    │   └── 📂 ui/               # Componentes básicos (Button, Switch, etc)
    ├── 📂 lib/                  # Inicializadores de conexões e motores offline
    │   ├── 📂 offline/          # Repositório de dados e Sync Engine (IndexedDB)
    │   ├── 📄 auth.js           # Funções de autenticação e tokens
    │   └── 📄 supabase.js       # Instanciação do cliente JS do Supabase
    ├── 📂 pages/                # Páginas / Telas principais da aplicação
    └── 📂 utils/                # Utilitários de roteamento e data-formatting
```

---

## 📄 Licença

Código de propriedade intelectual fechada desenvolvido sob medida para a **AGEMS - Agência de Regulação de Serviços Públicos de Mato Grosso do Sul**.

---

**Última atualização:** 03/06/2026 | **Status do Projeto:** ✅ Em Homologação
