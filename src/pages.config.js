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
import AcompanhamentoDeterminacoes from './pages/AcompanhamentoDeterminacoes';
import AdicionarUnidade from './pages/AdicionarUnidade';
import AnalisarResposta from './pages/AnalisarResposta';
import AnaliseManifestacao from './pages/AnaliseManifestacao';
import CamaraJulgamento from './pages/CamaraJulgamento';
import Checklists from './pages/Checklists';
import DetalhePrestador from './pages/DetalhePrestador';
import ExecutarFiscalizacao from './pages/ExecutarFiscalizacao';
import ExecutarFiscalizacaoDTR from './pages/ExecutarFiscalizacaoDTR';
import Fiscalizacoes from './pages/Fiscalizacoes';
import FiscalizacoesDTR from './pages/FiscalizacoesDTR';
import GerenciarTermos from './pages/GerenciarTermos';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import GestaoAutos from './pages/GestaoAutos';
import Home from './pages/Home';
import Municipios from './pages/Municipios';
import NovaFiscalizacao from './pages/NovaFiscalizacao';
import NovaFiscalizacaoDTR from './pages/NovaFiscalizacaoDTR';
import PareceresTecnicos from './pages/PareceresTecnicos';
import PrestadoresServico from './pages/PrestadoresServico';
import Relatorios from './pages/Relatorios';
import TiposUnidade from './pages/TiposUnidade';
import VistoriarOcorrenciaDTR from './pages/VistoriarOcorrenciaDTR';
import VistoriarUnidade from './pages/VistoriarUnidade';
import PortalPrestadorHome from './pages/PortalPrestadorHome';
import ResponderTermo from './pages/ResponderTermo';
import Contratos from './pages/Contratos';
import ConfiguracoesDTR from './pages/ConfiguracoesDTR';
import CatersDashboard from './pages/CatersDashboard';
import CatersProcessos from './pages/CatersProcessos';
import CatersProcessoDetalhe from './pages/CatersProcessoDetalhe';
import CatersAvisos from './pages/CatersAvisos';
import CatersRecomendacoes from './pages/CatersRecomendacoes';
import CatesaDashboard from './pages/CatesaDashboard';
import CatesaFiscalizacoes from './pages/CatesaFiscalizacoes';
import CatersFiscalizacoes from './pages/CatersFiscalizacoes';
import CatersTermos from './pages/CatersTermos';
import CresDashboard from './pages/CresDashboard';
import Definicoes from './pages/Definicoes';
import CaterfDashboard from './pages/CaterfDashboard';
import CatranspDashboard from './pages/CatranspDashboard';
import CatefisDashboard from './pages/CatefisDashboard';
import CretDashboard from './pages/CretDashboard';
import CategasDashboard from './pages/CategasDashboard';
import CateneDashboard from './pages/CateneDashboard';
import CregDashboard from './pages/CregDashboard';
import CaterfConcessionarias from './pages/CaterfConcessionarias';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AcompanhamentoDeterminacoes": AcompanhamentoDeterminacoes,
    "AdicionarUnidade": AdicionarUnidade,
    "AnalisarResposta": AnalisarResposta,
    "AnaliseManifestacao": AnaliseManifestacao,
    "CamaraJulgamento": CamaraJulgamento,
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
    "ConfiguracoesDTR": ConfiguracoesDTR,
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
    "CaterfConcessionarias": CaterfConcessionarias,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
