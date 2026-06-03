import { useAuth } from '@/lib/AuthContext';

/**
 * useModulo — Hook centralizado de metadados de módulo e diretoria
 *
 * Retorna informações sobre o módulo/diretoria do usuário autenticado,
 * facilitando o roteamento condicional de UI e filtros de dados.
 *
 * Admins têm acesso irrestrito a todos os módulos.
 */

const DIRETORIA_TO_TIPO_MODULO = {
  dsb: 'saneamento_dsb',
  dtr: 'rodovias_dtr',   // padrão para DTR; câmara técnica pode refinar
  dge: 'gas_dge',
};

const CAMARA_TO_TIPO_MODULO = {
  caterf: 'rodovias_dtr',
  caterm: 'terminais_dtr',
  catesg: 'gas_dge',
};

const DIRETORIA_NOMES = {
  dsb: 'Diretoria de Saneamento Básico',
  dtr: 'Diretoria de Transportes',
  dge: 'Diretoria de Gás e Energia',
};

export function useModulo() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const diretoria = user?.diretoria_id ?? 'dsb';
  const camaraTecnica = user?.camara_tecnica_id ?? null;

  // Resolve o tipo_modulo a partir da câmara técnica (mais específico) ou da diretoria
  const tipoModulo =
    (camaraTecnica && CAMARA_TO_TIPO_MODULO[camaraTecnica]) ||
    DIRETORIA_TO_TIPO_MODULO[diretoria] ||
    'saneamento_dsb';

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
    /** Nome legível da diretoria */
    diretoriaNome: DIRETORIA_NOMES[diretoria] ?? diretoria,
    /** ID da câmara técnica (pode ser null) */
    camaraTecnica,
    /** Módulo resolvido para uso em queries e relatórios */
    tipoModulo,
    /** Atalhos booleanos */
    isDSB: isAdmin || diretoria === 'dsb',
    isDTR: isAdmin || diretoria === 'dtr',
    isDGE: isAdmin || diretoria === 'dge',
    /** O usuário é admin (acesso irrestrito a todos os módulos) */
    isAdmin,
    /** Função de verificação de acesso por diretoria(s) */
    temAcesso,
  };
}
