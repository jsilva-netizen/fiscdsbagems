import { CAMARAS_POR_DIRETORIA } from '@/hooks/useModulo';

// Registro central: câmara técnica (id) → página do dashboard dela.
// Mantém Home.jsx e CamaraLayout.jsx (seletor de câmara do admin) em sincronia.
export const CAMARA_DASHBOARD_PAGE = {
  // DSB
  catesa: 'CatesaDashboard',
  caters: 'CatersDashboard',
  cres: 'CresDashboard',
  // DTR
  catransp: 'CatranspDashboard',
  caterf: 'CaterfDashboard',
  catefis: 'CatefisDashboard',
  cret: 'CretDashboard',
  // DGE
  categas: 'CategasDashboard',
  catene: 'CateneDashboard',
  creg: 'CregDashboard',
};

// Câmara padrão de cada diretoria — pra onde o admin cai ao escolher o módulo na Home.
// CATERF é a única câmara DTR com conteúdo real; as demais diretorias usam a primeira câmara da lista.
export const DEFAULT_CAMARA_POR_DIRETORIA = {
  dsb: 'catesa',
  dtr: 'caterf',
  dge: 'categas',
};

// Câmara (id) → URL da aba "Fiscalização" dela. Usado pra logar direto na fiscalização
// (em vez do dashboard) usuários com cargo "fiscal". Só cobre câmaras com essa aba de
// verdade (as placeholder "em breve" não têm) — nessas, cai no dashboard mesmo.
export const CAMARA_FISCALIZACAO_PATH = {
  catesa: '/Fiscalizacoes?camara=catesa',
  caters: '/Fiscalizacoes?camara=caters',
  cres: '/Fiscalizacoes?camara=cres',
  caterf: '/FiscalizacoesDTR',
};

// Reverso de CAMARAS_POR_DIRETORIA: câmara (id) → diretoria dona dela.
// Usado por páginas compartilhadas entre câmaras (Fiscalizacoes.jsx, Relatorios.jsx) pra
// saber a diretoria/câmara "efetiva" quando o admin navega via ?camara=xxx na URL, em vez
// de confiar só na diretoria/câmara do próprio perfil do usuário (que pra admin é irrelevante).
export const CAMARA_TO_DIRETORIA = Object.fromEntries(
  Object.entries(CAMARAS_POR_DIRETORIA).flatMap(([diretoria, camaras]) =>
    camaras.map((c) => [c.id, diretoria])
  )
);
