import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ClipboardList,
  Folder,
  ArrowLeft,
  LogOut,
  Recycle,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/CatersDashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/CatersAvisos', label: 'Avisos', icon: Bell },
  { to: '/CatersProcessos', label: 'Processos', icon: Folder },
  { to: '/CatersRecomendacoes', label: 'Recomendações', icon: ClipboardList },
];

function NavLink({ to, label, icon: Icon, badge }) {
  const { pathname } = useLocation();
  const active = pathname === to || pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors',
        active
          ? 'bg-emerald-600/20 text-emerald-300 font-medium'
          : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{label}</span>
      </div>
      {badge > 0 ? (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function CatersLayout({ children, alertCount = 0 }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="flex w-64 flex-shrink-0 flex-col bg-[#1a2535] text-white">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 p-5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-600/20">
            <Recycle className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-100">CATERS / DSB</div>
            <div className="truncate text-[11px] text-slate-400">Resíduos Sólidos</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              {...item}
              badge={item.to === '/CatersAvisos' ? alertCount : 0}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="space-y-0.5 border-t border-white/10 p-3">
          <Link
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>Voltar ao início</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-100"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sair</span>
          </button>
          <div className="px-3 pt-2 text-[11px] text-slate-500 truncate">
            {user?.email ?? ''}
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
