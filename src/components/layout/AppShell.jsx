import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut, Settings, ChevronDown, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useModulo, CAMARAS_POR_DIRETORIA } from '@/hooks/useModulo';
import { CAMARA_DASHBOARD_PAGE } from '@/lib/camaras';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import SyncBar from '@/components/camaras/SyncBar';
import { cn } from '@/lib/utils';

// Paleta oficial AGEMS (mesma do sistema de referência): azul institucional
// #0066B3 -> #004A8F, usada na barra lateral, cabeçalho da logo e destaques.
export const BRAND_GRADIENT = 'bg-gradient-to-br from-[#0066B3] to-[#004A8F]';

const DESKTOP_BREAKPOINT = 1024; // Tailwind `lg`

export function AgemsLogo({ className = 'w-full h-full' }) {
  return (
    <svg viewBox="0 0 128 128" className={className} aria-label="Logo AGEMS">
      <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
      <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
      <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#0066B3" />
      <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
    </svg>
  );
}

function isItemActive(item, pathname, search) {
  if (item.active !== undefined) return item.active;
  if (!item.to) return false;
  const [toPath, toQuery] = item.to.split('?');
  // Itens que apontam pra mesma página com querystrings diferentes (ex.: "Termos de
  // Notificação" de CATESA e CATERS, ambos em GerenciarTermos) só devem acender o que
  // bate exatamente com a querystring atual — senão os dois ficam ativos ao mesmo tempo.
  if (toQuery) {
    return pathname === toPath && search === `?${toQuery}`;
  }
  return (
    pathname === toPath ||
    pathname.startsWith(toPath + '/') ||
    (item.activeFor || []).some((p) => pathname.startsWith(createPageUrl(p)))
  );
}

function NavItem({ item, pathname, search, onNavigate }) {
  const active = isItemActive(item, pathname, search);
  const className = cn(
    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all',
    active ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
  );
  const inner = (
    <>
      <item.icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {!!item.badge && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {item.badge}
        </span>
      )}
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} onClick={onNavigate} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        item.onClick?.();
        onNavigate?.();
      }}
      className={className}
    >
      {inner}
    </button>
  );
}

// No desktop a sidebar fica sempre visível (sem opção de recolher); só no mobile ela
// funciona como um drawer que abre/fecha via o botão de hambúrguer no cabeçalho.
function useSidebarOpen() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window === 'undefined' ? true : window.innerWidth >= DESKTOP_BREAKPOINT
  );
  const [open, setOpen] = useState(
    typeof window === 'undefined' ? true : window.innerWidth >= DESKTOP_BREAKPOINT
  );

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktop(desktop);
      if (desktop) setOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggle = () => setOpen((prev) => !prev);

  return { open, isDesktop, toggle, close: () => setOpen(false) };
}

/**
 * Shell padrão do app: cabeçalho branco fixo (70px) — marca (sempre
 * "SIFIS/AGEMS") + título da página + avatar do usuário — e barra lateral
 * azul (gradiente institucional AGEMS) fixa abaixo dele, com recolhimento
 * real (desktop e mobile). Usado por `CamaraLayout`, `AdminShell` e
 * `PortalPrestadorLayout`.
 *
 * @param {string}   sigla              - Sigla da câmara (ex. 'CATESA'), usada como título de página.
 * @param {string}   nome               - Nome completo/subtítulo da câmara.
 * @param {string}   diretoria          - 'dsb' | 'dtr' | 'dge' — habilita o seletor de câmara do admin.
 * @param {Array}    navItems           - [{ label, icon, to?, onClick?, active?, badge?, activeFor?, section? }]
 *                                        `section` agrupa itens sob um rótulo (ex. "ADMINISTRAÇÃO").
 * @param {boolean}  showCamaraSwitcher - Mostra o seletor de câmara (só pra admin).
 * @param {string}   title              - Título da página, mostrado no cabeçalho ao lado do menu.
 * @param {string}   subtitle           - Subtítulo opcional (câmaras: nome completo).
 * @param {ReactNode} actions           - Ações à direita do título (ex.: botão "Novo").
 */
export default function AppShell({
  sigla,
  nome,
  diretoria,
  navItems = [],
  showCamaraSwitcher = false,
  title,
  subtitle,
  actions,
  children,
}) {
  const { pathname, search } = useLocation();
  const { logout, user } = useAuth();
  const { isAdmin } = useModulo();
  const navigate = useNavigate();
  const { open: sidebarOpen, isDesktop, toggle: toggleSidebar, close: closeSidebar } = useSidebarOpen();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      alert(err?.message || 'Não foi possível sair.');
    } finally {
      setLoggingOut(false);
    }
  };

  const camarasDoModulo = diretoria ? (CAMARAS_POR_DIRETORIA[diretoria] ?? []) : [];
  const currentCamaraId = camarasDoModulo.find((c) => c.sigla === sigla)?.id;

  const nomeCompleto = user?.full_name || user?.user_metadata?.full_name || user?.email || '';
  const iniciais = nomeCompleto.trim().charAt(0).toUpperCase() || '?';
  const roleLabel = {
    admin: 'Administrador', diretor: 'Diretor', coordenador: 'Coordenador',
    fiscal: 'Fiscal', user: 'Fiscal', prestador: 'Prestador',
  }[user?.role] || null;

  const pageTitle = title || sigla;
  const pageSubtitle = subtitle || nome;

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      {/* Cabeçalho fixo — título da página + usuário. Começa depois da barra
          lateral quando ela está aberta no desktop, pra formar uma faixa só
          junto com o cabeçalho da marca (que vive dentro da própria sidebar). */}
      <header className={cn('fixed inset-x-0 top-0 z-30 flex h-[70px] items-center bg-white shadow-sm left-0', sidebarOpen && 'lg:left-[260px]')}>
        {/* Só existe no mobile — a sidebar do desktop fica sempre aberta, sem opção de
            recolher. Abre o drawer; fechar é só clicando fora (overlay), sem botão dedicado. */}
        {!isDesktop && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="ml-3 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gray-500 hover:bg-gray-100"
            title="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {pageTitle && (
          <div className="ml-3 min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold leading-tight text-gray-900">{pageTitle}</h1>
            {pageSubtitle && <p className="hidden truncate text-[11px] text-gray-400 sm:block">{pageSubtitle}</p>}
          </div>
        )}
        {!pageTitle && <div className="flex-1" />}

        {actions && <div className="flex shrink-0 items-center gap-2 pr-2">{actions}</div>}

        <div className="flex items-center gap-2 pr-3 sm:pr-4">
          {isAdmin && showCamaraSwitcher && currentCamaraId && (
            <Select
              value={currentCamaraId}
              onValueChange={(id) => {
                const page = CAMARA_DASHBOARD_PAGE[id];
                if (page) navigate(createPageUrl(page));
              }}
            >
              <SelectTrigger className="hidden h-8 w-[130px] rounded-lg border-gray-200 text-xs sm:flex">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {camarasDoModulo.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.sigla}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((o) => !o)}
              onBlur={() => setTimeout(() => setUserMenuOpen(false), 150)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-gray-100"
            >
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', BRAND_GRADIENT)}>
                {iniciais}
              </div>
              <div className="hidden text-left md:block">
                <p className="max-w-[160px] truncate text-xs font-semibold leading-tight text-gray-800">{nomeCompleto}</p>
                {roleLabel && <p className="text-[11px] leading-tight text-gray-400">{roleLabel}</p>}
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-gray-400 md:block" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg">
                {isAdmin && (
                  <Link
                    to={createPageUrl('GerenciarUsuarios')}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4 text-gray-400" /> Usuários
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {loggingOut ? (
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 text-gray-400" />
                  )}
                  {loggingOut ? 'Saindo...' : 'Sair'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Overlay mobile */}
      {sidebarOpen && !isDesktop && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={closeSidebar}
        />
      )}

      {/* Barra lateral — a marca vive aqui dentro, então recolhe/aparece junto com o menu */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col transition-transform duration-200',
          BRAND_GRADIENT,
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-[70px] shrink-0 items-center px-4">
          <Link to={createPageUrl('Home')} className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm">
              <AgemsLogo />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-white">SIFIS/AGEMS</p>
              <p className="truncate text-[10px] text-blue-100">Sistema Integrado de Fiscalização</p>
            </div>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto border-t border-white/10 px-3 py-4">
          {navItems.map((item, idx) => {
            const prevSection = navItems[idx - 1]?.section;
            const showSectionLabel = item.section && item.section !== prevSection;
            return (
              <div key={item.to || `${item.label}-${idx}`}>
                {showSectionLabel && (
                  <p className={cn('px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/40', idx > 0 && 'pt-3')}>
                    {item.section}
                  </p>
                )}
                <NavItem item={item} pathname={pathname} search={search} onNavigate={() => !isDesktop && closeSidebar()} />
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <SyncBar diretoria={diretoria} />
        </div>
      </aside>

      {/* Conteúdo */}
      <main className={cn('min-h-screen pt-[70px] transition-[margin] duration-200', sidebarOpen && isDesktop && 'lg:ml-[260px]')}>
        {children}
      </main>
    </div>
  );
}
