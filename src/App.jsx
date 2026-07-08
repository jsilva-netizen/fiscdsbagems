import { useState, useEffect, Suspense, lazy } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { db } from '@/lib/offline/db';
import { useOfflineReady } from '@/lib/offlineReady';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ExportarImportar = lazy(() => import('@/pages/ExportarImportar'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const RouteLoadingFallback = () => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
    <img src="/logo.svg" alt="AGEMS" className="w-24 h-24 mb-4" />
    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-800 rounded-full animate-spin"></div>
  </div>
);

// Só aparece na primeira instalação, enquanto o service worker termina de cachear
// os chunks das páginas ainda lazy (ver useOfflineReady) — silenciosa de propósito
// (sem texto, sem spinner), pensada como uma continuação visual da tela de login.
const OfflineReadyTransition = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950">
    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-3 shadow-xl animate-pulse">
      <svg viewBox="0 0 128 128" className="w-full h-full" aria-label="AGEMS">
        <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
        <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
        <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#1894F2" />
        <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
      </svg>
    </div>
  </div>
);

const RoleAwareLayout = ({ children, currentPageName }) => {
  const { user } = useAuth();
  if (user?.role === 'prestador') return <>{children}</>;
  return Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;
};

// Componente para proteger rotas privadas
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const [offlineBypass, setOfflineBypass] = useState({ checked: false, allow: false });
  const assetsReady = useOfflineReady();

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer = null;
    const run = async () => {
      if (isLoading || isAuthenticated) {
        setOfflineBypass({ checked: false, allow: false });
        return;
      }
      fallbackTimer = setTimeout(() => {
        if (cancelled) return;
        setOfflineBypass({ checked: true, allow: false });
      }, 1500);
      try {
        const cacheRaw = localStorage.getItem('agms_auth_cache_v1');
        const hasCache = (() => {
          try {
            if (!cacheRaw) return false;
            const parsed = JSON.parse(cacheRaw);
            return !!(parsed?.user || parsed?.session?.user);
          } catch {
            return false;
          }
        })();

        if (!hasCache) {
          if (cancelled) return;
          if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
          }
          setOfflineBypass({ checked: true, allow: false });
          return;
        }

        const count = await db.fiscalizacoes.where('status').equals('em_andamento').count();
        if (cancelled) return;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        setOfflineBypass({ checked: true, allow: count > 0 });
      } catch {
        if (cancelled) return;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        setOfflineBypass({ checked: true, allow: false });
      }
    };
    void run();
    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    return <RouteLoadingFallback />;
  }

  if (!isAuthenticated) {
    if (!offlineBypass.checked) {
      return <RouteLoadingFallback />;
    }
    if (offlineBypass.allow) {
      return children;
    }
    return <Navigate to="/login" replace />;
  }

  if (!assetsReady) {
    return <OfflineReadyTransition />;
  }

  const pathname = location.pathname.replace(/^\//, '');
  const allowedForPrestador = ['PortalPrestadorHome', 'ResponderTermo'];
  if (user?.role === 'prestador') {
    if (pathname === '' || pathname.toLowerCase() === (mainPageKey || '').toLowerCase()) {
      return <Navigate to="/PortalPrestadorHome" replace />;
    }
    const top = pathname.split('/')[0];
    const ok = allowedForPrestador.map(s => s.toLowerCase()).includes(top.toLowerCase());
    if (!ok) {
      return <Navigate to="/PortalPrestadorHome" replace />;
    }
  }

  return children;
};

const RootShell = () => (
  <>
    <NavigationTracker />
    <Outlet />
  </>
);

 

function App() {
  const routes = [
    {
      element: <RootShell />,
      children: [
        { path: "/login", element: <Suspense fallback={<RouteLoadingFallback />}><Login /></Suspense> },
        { path: "/register", element: <Suspense fallback={<RouteLoadingFallback />}><Register /></Suspense> },
        {
          path: "/",
          element: (
            <ProtectedRoute>
              <RoleAwareLayout currentPageName={mainPageKey}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <MainPage />
                </Suspense>
              </RoleAwareLayout>
            </ProtectedRoute>
          ),
        },
        {
          path: "/ExportarImportar",
          element: (
            <ProtectedRoute>
              <RoleAwareLayout currentPageName={'ExportarImportar'}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ExportarImportar />
                </Suspense>
              </RoleAwareLayout>
            </ProtectedRoute>
          ),
        },
        ...Object.entries(pagesConfig.Pages).map(([path, Page]) => ({
          path: `/${path}`,
          element: (
            <ProtectedRoute>
              <RoleAwareLayout currentPageName={path}>
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Page />
                </Suspense>
              </RoleAwareLayout>
            </ProtectedRoute>
          ),
        })),
        { path: "*", element: <PageNotFound /> },
      ],
    },
  ];

  const router = createBrowserRouter(routes, {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  });

  useEffect(() => {
    const sm = navigator?.storage
    if (sm?.persist && sm?.persisted) {
      try {
        sm.persisted().then(async (isPersisted) => {
          if (!isPersisted) {
            try {
              await sm.persist()
            } catch {
              
            }
          }
        })
      } catch {}
    }
  }, [])
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <RouterProvider router={router} />
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
