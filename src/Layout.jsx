
export default function Layout({ children, currentPageName }) {
    // Páginas que não precisam de layout (fullscreen)
    const fullscreenPages = [
        'Home',
        'NovaFiscalizacao',
        'ExecutarFiscalizacao',
        'VistoriarUnidade',
        'AdicionarUnidade',
        'Municipios',
        'TiposUnidade',
        'Checklists',
        'Fiscalizacoes',
        'Relatorios',
        'CatersDashboard',
        'CatersProcessos',
        'CatersProcessoDetalhe',
        'CatersRecomendacoes',
        'CatesaDashboard',
        'GerenciarTermos',
        'AnalisarResposta',
        'GestaoAutos',
        'AnaliseManifestacao',
        'PareceresTecnicos',
        'CresDashboard',
        'Definicoes',
        'FiscalizacoesDTR',
        'Contratos',
        'CaterfDashboard',
        'CatranspDashboard',
        'CatefisDashboard',
        'CretDashboard',
        'CategasDashboard',
        'CateneDashboard',
        'CregDashboard',
        'DefinicoesDTR',
    ];

    if (fullscreenPages.includes(currentPageName)) {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {children}
        </div>
    );
}