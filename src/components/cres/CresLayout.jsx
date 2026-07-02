import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3, ClipboardCheck, TrendingUp } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',    to: createPageUrl('CresDashboard'), icon: BarChart3 },
  { label: 'Fiscalização', to: createPageUrl('Fiscalizacoes') + '?camara=cres', icon: ClipboardCheck },
  { label: 'Indicadores',  to: createPageUrl('Relatorios') + '?camara=cres',    icon: TrendingUp },
];

export default function CresLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CRES"
      nome="Câmara Técnica de Regulação Econômica do Saneamento"
      diretoria="dsb"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
