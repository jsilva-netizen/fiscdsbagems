import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Bell, ClipboardList, Folder, FileText } from 'lucide-react';
import CamaraLayout from '@/components/camaras/CamaraLayout';
import { createPageUrl } from '@/utils';
import { fetchAlertsData } from '@/lib/caters/dashboard';

const NAV_ITEMS = [
  { label: 'Dashboard',     to: createPageUrl('CatersDashboard'),     icon: BarChart3 },
  { label: 'Notificações',  to: createPageUrl('GerenciarTermos') + '?camara=caters', icon: FileText },
  { label: 'Avisos',        to: createPageUrl('CatersAvisos'),        icon: Bell },
  { label: 'Processos',     to: createPageUrl('CatersProcessos'),     icon: Folder, activeFor: ['CatersProcessoDetalhe'] },
  { label: 'Recomendações', to: createPageUrl('CatersRecomendacoes'), icon: ClipboardList },
];

export default function CatersLayout({ children }) {
  const alertsQ = useQuery({ queryKey: ['caters-alerts'], queryFn: fetchAlertsData, staleTime: 60_000 });
  const alertCount = useMemo(() => {
    const d = alertsQ.data;
    if (!d) return 0;
    return d.awaitingAnalysis.length + d.overdueResponses.length + d.overdueRecommendations.length;
  }, [alertsQ.data]);

  const items = NAV_ITEMS.map((item) => ({
    ...item,
    badge: item.label === 'Avisos' ? alertCount : 0,
  }));

  return (
    <CamaraLayout
      sigla="CATERS"
      nome="Câmara Técnica de Resíduos Sólidos"
      navItems={items}
    >
      {children}
    </CamaraLayout>
  );
}
