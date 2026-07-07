import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3, ClipboardCheck, TrendingUp } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',       to: createPageUrl('CaterfDashboard'),  icon: BarChart3 },
  { label: 'Fiscalização',    to: createPageUrl('FiscalizacoesDTR'), icon: ClipboardCheck },
  { label: 'Indicadores',     to: createPageUrl('Relatorios') + '?camara=caterf', icon: TrendingUp },
];

export default function CaterfLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CATERF"
      nome="Câmara Técnica de Rodovias e Ferrovias"
      diretoria="dtr"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
