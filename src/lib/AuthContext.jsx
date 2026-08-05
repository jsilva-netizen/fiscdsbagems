import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useOnlineStatus } from '@/lib/OnlineStatusContext.jsx';

const AuthContext = createContext();

const AUTH_CACHE_KEY = 'agms_auth_cache_v1';
const LOGOUT_INTENT_KEY = 'agms_logout_intent_v1';
const AUTH_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Precisa ser maior que LOGOUT_TIMEOUT_MS (ver logout() abaixo): o evento SIGNED_OUT
// só chega depois que supabase.auth.signOut() resolve de verdade (ou o teto local
// expira), e se essa janela de "intenção" já tiver fechado quando o evento chega, o
// listener trata como sessão perdida por acidente e restaura do cache — ou seja,
// clicar em "Sair" te loga de volta sozinho. Ver AGENTS/histórico: bug relatado
// como "clico em sair, trava, e volta pra página inicial".
const LOGOUT_INTENT_MAX_AGE_MS = 60 * 1000;
const PROFILE_FETCH_TIMEOUT_MS = 4000;
// supabase.auth.signOut() não tem timeout próprio e depende de round-trip de rede
// pra revogar o token no servidor. Depois de o app ficar muito tempo em segundo
// plano/idle, a conexão costuma estar "morta" e esse await pode travar por dezenas
// de segundos sem nunca rejeitar. Damos um teto curto e limpamos o estado local de
// qualquer forma, pra o botão "Sair" nunca ficar parado esperando a rede.
const LOGOUT_TIMEOUT_MS = 4000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { online } = useOnlineStatus();
  // O listener do onAuthStateChange e o checkUserStatus são montados uma única vez
  // (useEffect com deps []), então um `online` capturado direto no closure ficaria
  // congelado no valor do primeiro render. Uma ref sempre lida na hora do evento
  // garante que a checagem de conectividade reflita o estado atual.
  const onlineRef = useRef(online);
  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {

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

    const consumeLogoutIntent = () => {
      try {
        const raw = localStorage.getItem(LOGOUT_INTENT_KEY);
        localStorage.removeItem(LOGOUT_INTENT_KEY);
        const ts = raw ? Number(raw) : 0;
        if (!Number.isFinite(ts) || ts <= 0) return false;
        return Date.now() - ts <= LOGOUT_INTENT_MAX_AGE_MS;
      } catch {
        return false;
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

      const cache = readAuthCache();
      const cachedUser = cache?.user;
      const sameUser = !!(cachedUser?.id && session?.user?.id && cachedUser.id === session.user.id);
      const cachedMerge = sameUser
        ? {
            ...(cachedUser?.role ? { role: cachedUser.role } : {}),
            ...(cachedUser?.ativo === false ? { ativo: false } : {}),
            ...(cachedUser?.diretoria_id ? { diretoria_id: cachedUser.diretoria_id } : {}),
            ...(cachedUser?.camara_tecnica_id ? { camara_tecnica_id: cachedUser.camara_tecnica_id } : {}),
            ...(cachedUser?.full_name ? { full_name: cachedUser.full_name } : {}),
          }
        : {};

      try {
        const profileRes = await Promise.race([
          supabase
            .from('profiles')
            .select('ativo, role, diretoria_id, camara_tecnica_id, full_name')
            .eq('id', session.user.id)
            .maybeSingle(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), PROFILE_FETCH_TIMEOUT_MS)),
        ]);
        const { data: profileRow, error } = profileRes || {};
        let profile = profileRow;
        if (error) {
          profile = null;
        }
        if (profile && profile.ativo === false && onlineRef.current) {
          // Só desloga por desativação quando de fato online e confirmado pelo
          // servidor — offline, o app nunca desloga (ver logout() e o handler de
          // SIGNED_OUT abaixo).
          await supabase.auth.signOut();
          clearAuthCache();
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        } else {
          const mergedUser = { ...session.user, ...(cachedMerge || {}), ...(profile || {}) };
          setSession(session);
          setUser(mergedUser);
          setIsAuthenticated(true);
          writeAuthCache(session, mergedUser);
        }
      } catch {
        const mergedUser = { ...session.user, ...(cachedMerge || {}) };
        setSession(session);
        setUser(mergedUser);
        setIsAuthenticated(true);
        writeAuthCache(session, mergedUser);
      } finally {
        setIsLoading(false);
      }
    };

    let cancelled = false;
    const bootstrapCache = readAuthCache();
    if (bootstrapCache?.user) {
      setUser(bootstrapCache.user);
      setSession(bootstrapCache.session || null);
      setIsAuthenticated(true);
      setIsLoading(false);
    }

    const bootstrap = async () => {
      if (!bootstrapCache?.user) setIsLoading(true);
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
        if (!onlineRef.current) {
          // Nunca desloga enquanto offline, de forma alguma — um fiscal em campo sem
          // sinal no meio de uma vistoria ficaria trancado fora do app sem conseguir
          // logar de novo. Ignora o evento e mantém (ou restaura do cache) a sessão
          // atual até a conectividade voltar; o listener roda de novo quando o
          // Supabase client tentar de fato confirmar o estado com o servidor.
          consumeLogoutIntent();
          const cache = readAuthCache();
          if (cache?.user) {
            setUser(cache.user);
            setSession(cache.session || null);
            setIsAuthenticated(true);
          }
          setIsLoading(false);
          return;
        }
        const isUserDeleted = event === 'USER_DELETED';
        const manual = !isUserDeleted && consumeLogoutIntent();
        if (manual || isUserDeleted) {
          clearAuthCache();
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
          setIsLoading(false);
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
    if (!online) {
      // Nunca desloga offline: sem conexão pra reautenticar depois, sair aqui
      // trancaria o usuário (tipicamente um fiscal em campo, sem sinal, no meio de
      // uma vistoria) fora do app até recuperar internet.
      throw new Error('Sem conexão com a internet. Não é possível sair enquanto o app estiver offline.');
    }

    try {
      localStorage.setItem(LOGOUT_INTENT_KEY, String(Date.now()));
    } catch {
    }

    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, LOGOUT_TIMEOUT_MS)),
      ]);
    } catch {
      // Mesmo se a chamada de rede falhar, o logout local abaixo garante que o
      // usuário saia da sessão no dispositivo.
    }

    try {
      localStorage.removeItem(AUTH_CACHE_KEY);
    } catch {
    }
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
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
