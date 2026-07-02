import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: createPageUrl('CretDashboard'), icon: BarChart3 },
];

export default function CretLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CRET"
      nome="Câmara Técnica de Regulação Econômica"
      diretoria="dtr"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
