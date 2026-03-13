import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserStatus = async (session) => {
      if (!session?.user) {
        setUser(null);
        setSession(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

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
          setUser(null);
          setSession(null);
          setIsAuthenticated(false);
        } else {
          setSession(session);
          setUser({ ...session.user, ...(profile || {}) });
          setIsAuthenticated(true);
        }
      } catch {
        setSession(session);
        setUser(session.user);
        setIsAuthenticated(true);
      } finally {
        setIsLoading(false);
      }
    };

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserStatus(session);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserStatus(session);
    });

    return () => subscription.unsubscribe();
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
