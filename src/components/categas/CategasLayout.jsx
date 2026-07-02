import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: createPageUrl('CategasDashboard'), icon: BarChart3 },
];

export default function CategasLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CATEGAS"
      nome="Câmara Técnica de Gás Canalizado"
      diretoria="dge"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
