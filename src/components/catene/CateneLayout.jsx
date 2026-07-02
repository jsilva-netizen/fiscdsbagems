import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', to: createPageUrl('CateneDashboard'), icon: BarChart3 },
];

export default function CateneLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CATENE"
      nome="Câmara Técnica de Energia e Mineração"
      diretoria="dge"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
