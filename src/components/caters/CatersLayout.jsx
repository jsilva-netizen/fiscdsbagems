import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ClipboardList,
  Folder,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

const NAV_ITEMS = [
  { to: createPageUrl('CatersDashboard'), label: 'Dashboard', icon: BarChart3 },
  { to: createPageUrl('CatersAvisos'), label: 'Avisos', icon: Bell },
  { to: createPageUrl('CatersProcessos'), label: 'Processos', icon: Folder },
  { to: createPageUrl('CatersRecomendacoes'), label: 'Recomendações', icon: ClipboardList },
];

function NavTab({ to, label, icon: Icon, badge }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/') ||
    (to === createPageUrl('CatersProcessos') && pathname.startsWith(createPageUrl('CatersProcessoDetalhe')));

  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'border-white text-white'
          : 'border-transparent text-blue-200 hover:border-blue-300 hover:text-white'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
      {badge > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function CatersLayout({ children, alertCount = 0 }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-0">
          <div className="flex items-center gap-4 pb-3">
            {/* Logo */}
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-md flex-shrink-0">
              <svg viewBox="0 0 128 128" className="w-full h-full" aria-label="Logo AGEMS">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
                <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
                <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#1894F2" />
                <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight">CATERS</h1>
              <p className="text-blue-200 text-xs">Câmara Técnica de Resíduos Sólidos</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-blue-200 hover:text-white hover:bg-white/10 rounded-lg gap-1.5 h-8"
              >
                <Link to={createPageUrl('Home')}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline text-xs">Início</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-blue-200 hover:text-white hover:bg-white/10 rounded-lg gap-1.5 h-8"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Sair</span>
              </Button>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-end gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <NavTab
                key={item.to}
                {...item}
                badge={item.label === 'Avisos' ? alertCount : 0}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
