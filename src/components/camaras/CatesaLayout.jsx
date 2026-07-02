import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { BarChart3, ClipboardCheck, GitMerge, FileWarning, ClipboardList, Scale, FileText, TrendingUp } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',         to: createPageUrl('CatesaDashboard'),     icon: BarChart3 },
  { label: 'Fiscalização',      to: createPageUrl('Fiscalizacoes') + '?camara=catesa', icon: ClipboardCheck },
  { label: 'Notificações',      to: createPageUrl('GerenciarTermos') + '?camara=catesa', icon: FileText },
  { label: 'Manifestações',     to: createPageUrl('AnaliseManifestacao'), icon: GitMerge, activeFor: ['AnalisarResposta'] },
  { label: 'Autos de Infração', to: createPageUrl('GestaoAutos'),         icon: FileWarning },
  { label: 'Pareceres',         to: createPageUrl('PareceresTecnicos'),   icon: ClipboardList },
  { label: 'Câm. Julgamento',   to: createPageUrl('CamaraJulgamento'),    icon: Scale },
  { label: 'Indicadores',       to: createPageUrl('Relatorios') + '?camara=catesa', icon: TrendingUp },
];

export default function CatesaLayout({ children }) {
  return (
    <CamaraLayout
      sigla="CATESA"
      nome="Câmara Técnica de Saneamento Básico"
      diretoria="dsb"
      navItems={NAV_ITEMS}
    >
      {children}
    </CamaraLayout>
  );
}
