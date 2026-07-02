import { useAuth } from '@/lib/AuthContext';

/**
 * useModulo — Hook centralizado de metadados de módulo e diretoria
 *
 * Retorna informações sobre o módulo/diretoria do usuário autenticado,
 * facilitando o roteamento condicional de UI e filtros de dados.
 *
 * Admins têm acesso irrestrito a todos os módulos.
 */

// Nomes das Diretorias sem prefixo "Diretoria de Regulação e Fiscalização" para a UI
export const DIRETORIA_NOMES = {
  dsb: 'DSB - Saneamento Básico e Resíduos Sólidos',
  dtr: 'DTR - Transportes, Rodovias, Ferrovias, Portos e Aeroportos',
  dge: 'DGE - Gás Canalizado, Energia e Mineração',
};

// Siglas curtas para badges e headers compactos
const DIRETORIA_SIGLAS = {
  dsb: 'DSB',
  dtr: 'DTR',
  dge: 'DGE',
};

// -----------------------------------------------------------------------
// Mapeamento câmara técnica (id) → tipo_modulo de fiscalização
// IDs correspondem ao seed em 103_multi_diretoria.sql
// -----------------------------------------------------------------------
export const CAMARA_TO_TIPO_MODULO = {
  // DSB — Saneamento Básico e Resíduos Sólidos
  catesa: 'saneamento_dsb',   // CATESA — Câmara Técnica de Saneamento
  caters: 'residuos_dsb',     // CATERS — Câmara Técnica de Resíduos Sólidos
  cres:   'saneamento_dsb',   // CRES   — Câmara Técnica de Regulação Econômica do Saneamento

  // DTR — Transportes, Rodovias, Ferrovias, Portos e Aeroportos
  catransp: 'transportes_dtr', // CATRANSP — Câmara Técnica de Transporte
  caterf:   'rodovias_dtr',    // CATERF   — Câmara Técnica de Rodovias e Ferrovias
  catefis:  'fiscal_dtr',      // CATEFIS  — Câmara Técnica de Fiscalização
  cret:     'rodovias_dtr',    // CRET     — Câmara Técnica de Regulação Econômica

  // DGE — Gás Canalizado, Energia e Mineração
  categas: 'gas_dge',          // CATEGAS — Câmara Técnica de Gás Canalizado
  catene:  'energia_dge',      // CATENE  — Câmara Técnica de Energia e Mineração
  creg:    'gas_dge',          // CREG    — Câmara Técnica de Regulação Econômica
};

// tipo_modulo padrão por diretoria (quando usuário não tem câmara específica)
const DIRETORIA_TO_TIPO_MODULO = {
  dsb: 'saneamento_dsb',
  dtr: 'rodovias_dtr',
  dge: 'gas_dge',
};

// Todos os tipo_modulo de cada diretoria — usado em p_tipo_modulo da RPC
// (admin recebe [] = sem filtro)
export const MODULOS_POR_DIRETORIA = {
  dsb: ['saneamento_dsb', 'residuos_dsb'],
  dtr: ['rodovias_dtr', 'transportes_dtr', 'fiscal_dtr'],
  dge: ['gas_dge', 'energia_dge'],
};

// Tabela de câmaras por diretoria (referência para a UI)
export const CAMARAS_POR_DIRETORIA = {
  dsb: [
    { id: 'catesa',  sigla: 'CATESA',   nome: 'Câmara Técnica de Saneamento' },
    { id: 'caters',  sigla: 'CATERS',   nome: 'Câmara Técnica de Resíduos Sólidos' },
    { id: 'cres',    sigla: 'CRES',     nome: 'Câmara Técnica de Regulação Econômica do Saneamento' },
  ],
  dtr: [
    { id: 'catransp', sigla: 'CATRANSP', nome: 'Câmara Técnica de Transporte' },
    { id: 'caterf',   sigla: 'CATERF',   nome: 'Câmara Técnica de Rodovias e Ferrovias' },
    { id: 'catefis',  sigla: 'CATEFIS',  nome: 'Câmara Técnica de Fiscalização' },
    { id: 'cret',     sigla: 'CRET',     nome: 'Câmara Técnica de Regulação Econômica' },
  ],
  dge: [
    { id: 'categas', sigla: 'CATEGAS', nome: 'Câmara Técnica de Gás Canalizado' },
    { id: 'catene',  sigla: 'CATENE',  nome: 'Câmara Técnica de Energia e Mineração' },
    { id: 'creg',    sigla: 'CREG',    nome: 'Câmara Técnica de Regulação Econômica' },
  ],
};

export function useModulo() {
  const { user } = useAuth();

  const isAdmin       = user?.role === 'admin';
  const diretoria     = user?.diretoria_id ?? 'dsb';
  const camaraTecnica = user?.camara_tecnica_id ?? null;

  // Tipo de módulo mais específico: câmara > diretoria > fallback DSB
  const tipoModulo =
    (camaraTecnica && CAMARA_TO_TIPO_MODULO[camaraTecnica]) ||
    DIRETORIA_TO_TIPO_MODULO[diretoria] ||
    'saneamento_dsb';

  // Lista de módulos visíveis para p_tipo_modulo na RPC
  // Admin → [] (sem filtro); demais → todos os módulos da sua diretoria
  const modulosFiltro = isAdmin
    ? []
    : (MODULOS_POR_DIRETORIA[diretoria] ?? [tipoModulo]);

  // Sigla da câmara técnica atual (para exibição)
  const camaraSigla = camaraTecnica
    ? (CAMARAS_POR_DIRETORIA[diretoria] ?? []).find(c => c.id === camaraTecnica)?.sigla ?? camaraTecnica.toUpperCase()
    : null;

  /**
   * Verifica se o usuário tem acesso a uma ou mais diretorias.
   * Admins sempre têm acesso.
   *
   * @param {string | string[]} diretorias - Ex: 'dsb' ou ['dsb', 'dtr']
   */
  const temAcesso = (diretorias) => {
    if (isAdmin) return true;
    const lista = Array.isArray(diretorias) ? diretorias : [diretorias];
    return lista.includes(diretoria);
  };

  return {
    /** ID da diretoria: 'dsb' | 'dtr' | 'dge' */
    diretoria,
    /** Nome completo oficial da diretoria */
    diretoriaNome: DIRETORIA_NOMES[diretoria] ?? diretoria,
    /** Sigla curta: DSB | DTR | DGE */
    diretoriaSigla: DIRETORIA_SIGLAS[diretoria] ?? diretoria.toUpperCase(),
    /** ID da câmara técnica (pode ser null) */
    camaraTecnica,
    /** Sigla da câmara técnica (ex: 'CATERF', null se sem câmara) */
    camaraSigla,
    /** Módulo resolvido para uso em queries e relatórios */
    tipoModulo,
    /** Lista de todos os módulos da diretoria (para p_tipo_modulo na RPC) */
    modulosFiltro,
    /** Câmaras disponíveis na diretoria do usuário */
    camarasDiretoria: CAMARAS_POR_DIRETORIA[diretoria] ?? [],
    /** Atalhos booleanos */
    isDSB: isAdmin || diretoria === 'dsb',
    isDTR: isAdmin || diretoria === 'dtr',
    isDGE: isAdmin || diretoria === 'dge',
    /** Admin — acesso irrestrito */
    isAdmin,
    /** Verifica acesso por diretoria(s) */
    temAcesso,
  };
}
