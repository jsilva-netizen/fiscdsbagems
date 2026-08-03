import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Home as HomeIcon,
  ClipboardCheck,
  Settings,
  TrendingUp,
  BarChart3,
  FileText,
  GitMerge,
  FileWarning,
  ClipboardList,
  Folder,
} from 'lucide-react';
import AppShell from './AppShell';
import { createPageUrl } from '@/utils';
import { useModulo } from '@/hooks/useModulo';
import { fetchAlertsData } from '@/lib/caters/dashboard';

function useAdminNavItems() {
  const { isDSB, isDTR, isAdmin, camaraTecnica } = useModulo();
  const ambosModulos = isDSB && isDTR;
  const showCatesa = isAdmin || camaraTecnica === 'catesa';
  const showCaters = isAdmin || camaraTecnica === 'caters';

  // Contagem de alertas da CATERS (avisos pendentes) — usada como badge no item
  // "Dashboard" da seção CATERS. Mesma queryKey usada em CatersDashboard.jsx pra
  // o React Query deduplicar a requisição entre a sidebar e a página.
  const alertsQ = useQuery({
    queryKey: ['caters-alerts'],
    queryFn: fetchAlertsData,
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: showCaters,
  });
  const catersAlertCount = useMemo(() => {
    const d = alertsQ.data;
    if (!d) return 0;
    return d.awaitingAnalysis.length + d.overdueResponses.length + d.overdueRecommendations.length;
  }, [alertsQ.data]);

  const items = [{ label: 'Início', to: createPageUrl('Home'), icon: HomeIcon }];

  if (isDSB) {
    items.push({ label: ambosModulos ? 'Fiscalizações (DSB)' : 'Fiscalizações', to: createPageUrl('Fiscalizacoes'), icon: ClipboardCheck });
  }
  if (isDTR) {
    items.push({ label: ambosModulos ? 'Fiscalizações (DTR)' : 'Fiscalizações', to: createPageUrl('FiscalizacoesDTR'), icon: ClipboardCheck });
  }

  if (ambosModulos) {
    items.push(
      { label: 'Indicadores (DSB)', to: createPageUrl('Relatorios') + '?diretoria=dsb', icon: TrendingUp },
      { label: 'Indicadores (DTR)', to: createPageUrl('Relatorios') + '?diretoria=dtr', icon: TrendingUp },
    );
  } else {
    items.push({ label: 'Indicadores', to: createPageUrl('Relatorios'), icon: TrendingUp });
  }

  if (showCatesa) {
    items.push(
      { label: 'Dashboard', to: createPageUrl('CatesaDashboard'), icon: BarChart3, section: 'CATESA' },
      { label: 'Termos de Notificação', to: createPageUrl('GerenciarTermos') + '?camara=catesa', icon: FileText, section: 'CATESA' },
      { label: 'Análise das Manifestações', to: createPageUrl('AnaliseManifestacao'), icon: GitMerge, activeFor: ['AnalisarResposta'], section: 'CATESA' },
      { label: 'Autos de Infração', to: createPageUrl('GestaoAutos'), icon: FileWarning, section: 'CATESA' },
      { label: 'Pareceres Técnicos', to: createPageUrl('PareceresTecnicos'), icon: ClipboardList, section: 'CATESA' },
    );
  }

  if (showCaters) {
    items.push(
      { label: 'Dashboard', to: createPageUrl('CatersDashboard'), icon: BarChart3, badge: catersAlertCount, section: 'CATERS' },
      { label: 'Termos de Notificação', to: createPageUrl('GerenciarTermos') + '?camara=caters', icon: FileText, section: 'CATERS' },
      { label: 'Processos', to: createPageUrl('CatersProcessos'), icon: Folder, activeFor: ['CatersProcessoDetalhe'], section: 'CATERS' },
    );
  }

  // Tipos de Unidade, Checklists, Prestadores/Concessionárias e Contratos vivem
  // dentro de Definicoes/DefinicoesDTR (abas internas) — só o link "Configurações" aparece no menu.
  if (isDSB) {
    items.push({ label: ambosModulos ? 'Configurações (DSB)' : 'Configurações', to: createPageUrl('Definicoes'), icon: Settings, section: 'Administração' });
  }
  if (isDTR) {
    items.push({ label: ambosModulos ? 'Configurações (DTR)' : 'Configurações', to: createPageUrl('DefinicoesDTR'), icon: Settings, section: 'Administração' });
  }

  return items;
}

/**
 * Shell para páginas fora do contexto de uma câmara técnica específica
 * (Fiscalizações, Relatórios, Definições/Configurações etc.) — mesma chrome
 * visual das páginas de câmara (`CamaraLayout`), com um menu fixo baseado
 * no módulo (DSB/DTR) do usuário logado.
 *
 * @param {string} title    - Título mostrado no cabeçalho.
 * @param {string} subtitle - Subtítulo opcional.
 * @param {ReactNode} actions - Ações opcionais alinhadas ao cabeçalho (ex.: botão "Novo").
 */
export default function AdminShell({ title, subtitle, actions, children }) {
  const navItems = useAdminNavItems();

  return (
    <AppShell navItems={navItems} title={title} subtitle={subtitle} actions={actions}>
      {children}
    </AppShell>
  );
}
