import { useModulo } from '@/hooks/useModulo';
import CatesaLayout from '@/components/camaras/CatesaLayout';
import CatersLayout from '@/components/caters/CatersLayout';
import CresLayout from '@/components/cres/CresLayout';
import CaterfLayout from '@/components/caterf/CaterfLayout';

const LAYOUT_BY_CAMARA = {
  catesa: CatesaLayout,
  caters: CatersLayout,
  cres: CresLayout,
  caterf: CaterfLayout,
};

/**
 * Resolves the chamber shell (header + sync bar + tabs) for the current page.
 *
 * @param {string} [camaraOverride] - câmara id read from the URL (?camara=xxx). Takes
 *   priority over the logged-in user's own câmara técnica — needed because an admin
 *   navigates freely between chambers via the in-header switcher, so the shell must follow
 *   whichever chamber tab they actually clicked, not their own (often empty) profile field.
 * Falls back to CatesaLayout when neither resolves to a known chamber (e.g. admin without
 * a chamber, reached via the legacy Home).
 */
export function useCamaraLayout(camaraOverride) {
  const { camaraTecnica } = useModulo();
  const effective = camaraOverride || camaraTecnica;
  return LAYOUT_BY_CAMARA[effective] || CatesaLayout;
}
