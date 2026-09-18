import globals from "globals";
import pluginJs from "@eslint/js";
import pluginUnusedImports from "eslint-plugin-unused-imports";
import pluginReact from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";

// ---------------------------------------------------------------------------
// Fronteira da camada de abstração de acesso a dados (specs/001-data-access-
// abstraction). Regra de fronteira, decisão D5 de research.md: só
// src/lib/data/providers/supabase/** (e o arquivo que instancia o cliente,
// src/lib/supabase.js) podem importar o cliente Supabase, ler variáveis
// VITE_SUPABASE_*, ou escrever caminho literal da API do Supabase.
// ---------------------------------------------------------------------------

const SUPABASE_PROVIDER_PATHS = [
  "src/lib/data/providers/supabase/**",
  "src/lib/supabase.js",
];

// Lista temporária (tasks.md T004) dos arquivos ainda não migrados para a
// camada nova — gerada por leitura completa em inventario-acoplamento.md.
// Cada tarefa de migração remove sua própria entrada daqui (T039, T056, T061,
// T065, T071, T076, T084); T088 remove a lista inteira. NÃO adicionar arquivo
// novo aqui — arquivo novo não deve nascer acoplado.
const LEGACY_SUPABASE_COUPLING_ALLOWLIST = [
  "src/components/autos/FluxoUploadDocumentos.jsx",
  "src/components/fiscalizacao/ExportarPDFConsolidado.jsx",
  "src/components/fiscalizacao/HistoricoFiscalizacao.jsx",
  "src/components/fiscalizacao/PhotoGrid.jsx",
  "src/components/fiscalizacao/RelatorioFiscalizacao.jsx",
  "src/components/prestador/HistoricoFiscalizacoes.jsx",
  "src/components/utils/numerationHelper.jsx",
  "src/hooks/useOnline.js",
  "src/lib/AuthContext.jsx",
  "src/lib/PageNotFound.jsx",
  "src/lib/SyncStatusContext.jsx",
  "src/lib/caters/aiJobs.js",
  "src/lib/caters/dashboard.js",
  "src/lib/caters/deadlineExtensions.js",
  "src/lib/caters/documents.js",
  "src/lib/caters/history.js",
  "src/lib/caters/municipalityResponses.js",
  "src/lib/caters/notificationReads.js",
  "src/lib/caters/processes.js",
  "src/lib/caters/recommendations.js",
  "src/lib/catesa/aiJobs.js",
  "src/lib/edgeFunctions.js",
  "src/lib/offline/repository.ts",
  "src/lib/offline/syncEngine.ts",
  "src/lib/storageCleanup.js",
  "src/pages/AcompanhamentoDeterminacoes.jsx",
  "src/pages/AnalisarResposta.jsx",
  "src/pages/AnaliseManifestacao.jsx",
  "src/pages/CaterfDashboard.jsx",
  "src/pages/CatersDashboard.jsx",
  "src/pages/CatesaDashboard.jsx",
  "src/pages/Checklists.jsx",
  "src/pages/DetalhePrestador.jsx",
  "src/pages/ExportarImportar.jsx",
  "src/pages/Fiscalizacoes.jsx",
  "src/pages/FiscalizacoesDTR.jsx",
  "src/pages/GerenciarTermos.jsx",
  "src/pages/GerenciarUsuarios.jsx",
  "src/pages/GestaoAutos.jsx",
  "src/pages/PareceresTecnicos.jsx",
  "src/pages/PortalPrestadorHome.jsx",
  "src/pages/PrestadoresServico.jsx",
  "src/pages/Register.jsx",
  "src/pages/Relatorios.jsx",
  "src/pages/ResponderTermo.jsx",
  "src/pages/TiposUnidade.jsx",
  "src/pages/VistoriarOcorrenciaDTR.jsx",
  "src/pages/VistoriarUnidade.jsx",
];

const SUPABASE_LITERAL_PATH_PATTERN = "\\/(rest|auth|storage|functions)\\/v1\\/";

export default [
  {
    ignores: ["dev-dist/**/*", "dist/**/*", "node_modules/**/*"],
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    ignores: [
      ...SUPABASE_PROVIDER_PATHS,
      ...LEGACY_SUPABASE_COUPLING_ALLOWLIST,
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/lib/supabase", "**/lib/supabase.js"],
              message:
                "Só src/lib/data/providers/supabase/** pode importar o cliente Supabase. Use a camada de dados (src/lib/data).",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[property.name=/^VITE_SUPABASE_/]",
          message:
            "Só src/lib/data/providers/supabase/** pode ler variáveis VITE_SUPABASE_*. Use a camada de dados (src/lib/data).",
        },
        {
          selector: `Literal[value=/${SUPABASE_LITERAL_PATH_PATTERN}/]`,
          message:
            "Só src/lib/data/providers/supabase/** pode referenciar caminhos da API do Supabase. Use a camada de dados (src/lib/data).",
        },
        {
          selector: `TemplateElement[value.raw=/${SUPABASE_LITERAL_PATH_PATTERN}/]`,
          message:
            "Só src/lib/data/providers/supabase/** pode referenciar caminhos da API do Supabase. Use a camada de dados (src/lib/data).",
        },
      ],
    },
  },
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "unused-imports": pluginUnusedImports,
      "react": pluginReact,
    },
    rules: {
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/jsx-no-undef": "error",
      "react/react-in-jsx-scope": "off",
    },
  },
  {
    files: [
      "src/pages/VistoriarUnidade.jsx",
      "src/pages/TiposUnidade.jsx",
    ],
    rules: {
      "unused-imports/no-unused-imports": "off",
      "unused-imports/no-unused-vars": "off",
      "no-unused-vars": "off",
    },
  },
];
