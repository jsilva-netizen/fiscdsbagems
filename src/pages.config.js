/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const AcompanhamentoDeterminacoes = lazy(() => import('./pages/AcompanhamentoDeterminacoes'));
const AdicionarUnidade = lazy(() => import('./pages/AdicionarUnidade'));
const AnalisarResposta = lazy(() => import('./pages/AnalisarResposta'));
const AnaliseManifestacao = lazy(() => import('./pages/AnaliseManifestacao'));
const Checklists = lazy(() => import('./pages/Checklists'));
const DetalhePrestador = lazy(() => import('./pages/DetalhePrestador'));
const ExecutarFiscalizacao = lazy(() => import('./pages/ExecutarFiscalizacao'));
const ExecutarFiscalizacaoDTR = lazy(() => import('./pages/ExecutarFiscalizacaoDTR'));
const Fiscalizacoes = lazy(() => import('./pages/Fiscalizacoes'));
const FiscalizacoesDTR = lazy(() => import('./pages/FiscalizacoesDTR'));
const GerenciarTermos = lazy(() => import('./pages/GerenciarTermos'));
const GerenciarUsuarios = lazy(() => import('./pages/GerenciarUsuarios'));
const GestaoAutos = lazy(() => import('./pages/GestaoAutos'));
const Home = lazy(() => import('./pages/Home'));
const Municipios = lazy(() => import('./pages/Municipios'));
const NovaFiscalizacao = lazy(() => import('./pages/NovaFiscalizacao'));
const NovaFiscalizacaoDTR = lazy(() => import('./pages/NovaFiscalizacaoDTR'));
const PareceresTecnicos = lazy(() => import('./pages/PareceresTecnicos'));
const PrestadoresServico = lazy(() => import('./pages/PrestadoresServico'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const TiposUnidade = lazy(() => import('./pages/TiposUnidade'));
const VistoriarOcorrenciaDTR = lazy(() => import('./pages/VistoriarOcorrenciaDTR'));
const VistoriarUnidade = lazy(() => import('./pages/VistoriarUnidade'));
const PortalPrestadorHome = lazy(() => import('./pages/PortalPrestadorHome'));
const ResponderTermo = lazy(() => import('./pages/ResponderTermo'));
const Contratos = lazy(() => import('./pages/Contratos'));
const DefinicoesDTR = lazy(() => import('./pages/DefinicoesDTR'));
const CatersDashboard = lazy(() => import('./pages/CatersDashboard'));
const CatersProcessos = lazy(() => import('./pages/CatersProcessos'));
const CatersProcessoDetalhe = lazy(() => import('./pages/CatersProcessoDetalhe'));
const CatersAvisos = lazy(() => import('./pages/CatersAvisos'));
const CatersRecomendacoes = lazy(() => import('./pages/CatersRecomendacoes'));
const CatesaDashboard = lazy(() => import('./pages/CatesaDashboard'));
const CatesaFiscalizacoes = lazy(() => import('./pages/CatesaFiscalizacoes'));
const CatersFiscalizacoes = lazy(() => import('./pages/CatersFiscalizacoes'));
const CatersTermos = lazy(() => import('./pages/CatersTermos'));
const CresDashboard = lazy(() => import('./pages/CresDashboard'));
const Definicoes = lazy(() => import('./pages/Definicoes'));
const CaterfDashboard = lazy(() => import('./pages/CaterfDashboard'));
const CatranspDashboard = lazy(() => import('./pages/CatranspDashboard'));
const CatefisDashboard = lazy(() => import('./pages/CatefisDashboard'));
const CretDashboard = lazy(() => import('./pages/CretDashboard'));
const CategasDashboard = lazy(() => import('./pages/CategasDashboard'));
const CateneDashboard = lazy(() => import('./pages/CateneDashboard'));
const CregDashboard = lazy(() => import('./pages/CregDashboard'));


export const PAGES = {
    "AcompanhamentoDeterminacoes": AcompanhamentoDeterminacoes,
    "AdicionarUnidade": AdicionarUnidade,
    "AnalisarResposta": AnalisarResposta,
    "AnaliseManifestacao": AnaliseManifestacao,
    "Checklists": Checklists,
    "DetalhePrestador": DetalhePrestador,
    "ExecutarFiscalizacao": ExecutarFiscalizacao,
    "ExecutarFiscalizacaoDTR": ExecutarFiscalizacaoDTR,
    "Fiscalizacoes": Fiscalizacoes,
    "FiscalizacoesDTR": FiscalizacoesDTR,
    "GerenciarTermos": GerenciarTermos,
    "GerenciarUsuarios": GerenciarUsuarios,
    "GestaoAutos": GestaoAutos,
    "Home": Home,
    "Municipios": Municipios,
    "NovaFiscalizacao": NovaFiscalizacao,
    "NovaFiscalizacaoDTR": NovaFiscalizacaoDTR,
    "PareceresTecnicos": PareceresTecnicos,
    "PrestadoresServico": PrestadoresServico,
    "Relatorios": Relatorios,
    "TiposUnidade": TiposUnidade,
    "VistoriarOcorrenciaDTR": VistoriarOcorrenciaDTR,
    "VistoriarUnidade": VistoriarUnidade,
    "PortalPrestadorHome": PortalPrestadorHome,
    "ResponderTermo": ResponderTermo,
    "Contratos": Contratos,
    "DefinicoesDTR": DefinicoesDTR,
    "CatersDashboard": CatersDashboard,
    "CatersProcessos": CatersProcessos,
    "CatersProcessoDetalhe": CatersProcessoDetalhe,
    "CatersAvisos": CatersAvisos,
    "CatersRecomendacoes": CatersRecomendacoes,
    "CatesaDashboard": CatesaDashboard,
    "CatesaFiscalizacoes": CatesaFiscalizacoes,
    "CatersFiscalizacoes": CatersFiscalizacoes,
    "CatersTermos": CatersTermos,
    "CresDashboard": CresDashboard,
    "Definicoes": Definicoes,
    "CaterfDashboard": CaterfDashboard,
    "CatranspDashboard": CatranspDashboard,
    "CatefisDashboard": CatefisDashboard,
    "CretDashboard": CretDashboard,
    "CategasDashboard": CategasDashboard,
    "CateneDashboard": CateneDashboard,
    "CregDashboard": CregDashboard,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
