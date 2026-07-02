import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: createPageUrl('CatranspDashboard'), icon: BarChart3 },
];

export default function CatranspLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CATRANSP"
      nome="Câmara Técnica de Transporte"
      diretoria="dtr"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
