import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: createPageUrl('CregDashboard'), icon: BarChart3 },
];

export default function CregLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CREG"
      nome="Câmara Técnica de Regulação Econômica"
      diretoria="dge"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
