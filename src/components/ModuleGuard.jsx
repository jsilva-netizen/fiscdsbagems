import { Navigate } from 'react-router-dom';
import { useModulo } from '@/hooks/useModulo';

/**
 * ModuleGuard — Componente de proteção de rotas por diretoria
 *
 * Renderiza `children` somente se o usuário pertence a uma das
 * diretorias especificadas. Admins sempre têm acesso.
 *
 * Uso:
 *   <ModuleGuard diretorias={['dsb']}>
 *     <Checklists />
 *   </ModuleGuard>
 *
 * @param {string | string[]} diretorias   - Diretorias com acesso permitido
 * @param {string}            redirectTo   - Caminho de redirecionamento (padrão: '/Home')
 * @param {React.ReactNode}   children     - Conteúdo a proteger
 * @param {React.ReactNode}   fallback     - Alternativa em vez de redirect (opcional)
 */
export default function ModuleGuard({
  diretorias,
  redirectTo = '/Home',
  children,
  fallback = null,
}) {
  const { temAcesso } = useModulo();

  if (!temAcesso(diretorias)) {
    if (fallback !== null) return fallback;
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
