import { useState, useEffect } from 'react'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { createBrowserRouter, RouterProvider, Navigate, Outlet, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ExportarImportar from '@/pages/ExportarImportar';
import { db } from '@/lib/offline/db';
 

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

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

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer = null;
    const run = async () => {
      if (isLoading || isAuthenticated) {
        setOfflineBypass({ checked: true, allow: false });
        return;
      }
      fallbackTimer = setTimeout(() => {
        if (cancelled) return;
        setOfflineBypass({ checked: true, allow: false });
      }, 1500);
      try {
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
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
        <img src="/logo.svg" alt="AGEMS" className="w-24 h-24 mb-4" />
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (!offlineBypass.checked) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white">
          <img src="/logo.svg" alt="AGEMS" className="w-24 h-24 mb-4" />
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-800 rounded-full animate-spin"></div>
        </div>
      );
    }
    if (offlineBypass.allow) {
      return children;
    }
    return <Navigate to="/login" replace />;
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
        { path: "/login", element: <Login /> },
        { path: "/register", element: <Register /> },
        {
          path: "/",
          element: (
            <ProtectedRoute>
              <RoleAwareLayout currentPageName={mainPageKey}>
                <MainPage />
              </RoleAwareLayout>
            </ProtectedRoute>
          ),
        },
        {
          path: "/ExportarImportar",
          element: (
            <ProtectedRoute>
              <RoleAwareLayout currentPageName={'ExportarImportar'}>
                <ExportarImportar />
              </RoleAwareLayout>
            </ProtectedRoute>
          ),
        },
        ...Object.entries(pagesConfig.Pages).map(([path, Page]) => ({
          path: `/${path}`,
          element: (
            <ProtectedRoute>
              <RoleAwareLayout currentPageName={path}>
                <Page />
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
