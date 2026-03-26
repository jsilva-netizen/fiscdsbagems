import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const AUTH_CACHE_KEY = 'agms_auth_cache_v1';
    const AUTH_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

    const readAuthCache = () => {
      try {
        const raw = localStorage.getItem(AUTH_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const cachedAt = typeof parsed?.cachedAt === 'number' ? parsed.cachedAt : 0;
        if (cachedAt && Date.now() - cachedAt > AUTH_CACHE_MAX_AGE_MS) return null;
        if (!parsed?.user && !parsed?.session?.user) return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const writeAuthCache = (session, mergedUser) => {
      try {
        localStorage.setItem(
          AUTH_CACHE_KEY,
          JSON.stringify({
            cachedAt: Date.now(),
            session,
            user: mergedUser
          })
        );
      } catch {
      }
    };

    const clearAuthCache = () => {
      try {
        localStorage.removeItem(AUTH_CACHE_KEY);
      } catch {
      }
    };

    const tryRestoreSession = async () => {
      const cache = readAuthCache();
      if (!cache) return null;
      const s = cache?.session;
      const access_token = s?.access_token;
      const refresh_token = s?.refresh_token;
      if (access_token && refresh_token) {
        try {
          const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error && data?.session?.user) return data.session;
        } catch {
        }
      }
      if (cache?.user) {
        return cache.session || { user: cache.user };
      }
      return null;
    };

    const checkUserStatus = async (session) => {
      if (!session?.user) return;

      try {
        const { data: profileRow, error } = await supabase
          .from('profiles')
          .select('ativo, role')
          .eq('id', session.user.id)
          .maybeSingle();
        let profile = profileRow;
        if (error) {
          profile = null;
        }
        if (profile && profile.ativo === false) {
          await supabase.auth.signOut();
          clearAuthCache();
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        } else {
          const mergedUser = { ...session.user, ...(profile || {}) };
          setSession(session);
          setUser(mergedUser);
          setIsAuthenticated(true);
          writeAuthCache(session, mergedUser);
        }
      } catch {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
        writeAuthCache(session, session.user);
      } finally {
        setIsLoading(false);
      }
    };

    let cancelled = false;

    const bootstrap = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user) {
          await checkUserStatus(session);
          return;
        }
        const restored = await tryRestoreSession();
        if (cancelled) return;
        if (restored?.user) {
          await checkUserStatus(restored);
          return;
        }
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      } catch {
        const cache = readAuthCache();
        if (cancelled) return;
        if (cache?.user) {
          setUser(cache.user);
          setSession(cache.session || null);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        }
        setIsLoading(false);
      }
    };

    void bootstrap();

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        clearAuthCache();
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      if (session?.user) {
        await checkUserStatus(session);
        return;
      }
      const cache = readAuthCache();
      if (cache?.user) {
        setUser(cache.user);
        setSession(cache.session || null);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }
      setUser(null);
      setSession(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    // 1. Tentar login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;

    // 2. Se logou, verificar o perfil
    if (data.user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('ativo')
          .eq('id', data.user.id)
          .single();

        // Se der erro ao buscar perfil, pode ser que não exista ainda.
        // O useEffect vai tratar isso depois com o self-healing.
        // Mas se o perfil existir e estiver inativo, bloqueamos aqui.
        if (profile && profile.ativo === false) {
          await supabase.auth.signOut();
          throw new Error('Sua conta aguarda aprovação do administrador.');
        }
      } catch (err) {
        // Se o erro for o nosso bloqueio, repassa
        if (err.message === 'Sua conta aguarda aprovação do administrador.') {
          throw err;
        }
        // Outros erros (ex: network, permissão de leitura se RLS falhar) não devem impedir o login inicial
        // Deixamos o useEffect lidar com a consistência depois
        console.warn('Erro ao verificar perfil no login:', err);
      }
    }

    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    try {
      localStorage.removeItem('agms_auth_cache_v1');
    } catch {
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated, 
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
