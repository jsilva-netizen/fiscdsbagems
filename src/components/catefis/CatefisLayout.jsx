import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: createPageUrl('CatefisDashboard'), icon: BarChart3 },
];

export default function CatefisLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CATEFIS"
      nome="Câmara Técnica de Fiscalização"
      diretoria="dtr"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
