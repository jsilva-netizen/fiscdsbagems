import { supabase } from '@/lib/supabase';

async function ensureAuth() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.access_token;
}

export async function invokeEdgeFunction(functionName, body, { retryOnAuthError = true } = {}) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const jwt = await ensureAuth();
  if (!jwt) throw new Error('Sessão inválida. Faça login novamente.');
  if (!baseUrl || !anonKey) throw new Error('Configuração do Supabase ausente (URL/ANON_KEY).');

  const url = `${String(baseUrl).replace(/\/$/, '')}/functions/v1/${functionName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'x-user-jwt': jwt,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (!res.ok) {
    // Token de sessão pode ter expirado entre carregar a tela e essa chamada.
    // Tenta renovar a sessão uma vez antes de propagar o erro pro usuário.
    if (res.status === 401 && retryOnAuthError) {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        return invokeEdgeFunction(functionName, body, { retryOnAuthError: false });
      }
    }
    const msg = json?.error || json?.message || `Erro ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function invokeEdgeFunctionBinary(functionName, body, { retryOnAuthError = true } = {}) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const jwt = await ensureAuth();
  if (!jwt) throw new Error('Sessão inválida. Faça login novamente.');
  if (!baseUrl || !anonKey) throw new Error('Configuração do Supabase ausente (URL/ANON_KEY).');

  const url = `${String(baseUrl).replace(/\/$/, '')}/functions/v1/${functionName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'x-user-jwt': jwt,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  });

  if (!res.ok) {
    if (res.status === 401 && retryOnAuthError) {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session?.access_token) {
        return invokeEdgeFunctionBinary(functionName, body, { retryOnAuthError: false });
      }
    }
    let msg = `Erro ${res.status}`;
    try {
      const json = await res.json();
      msg = json?.error || json?.details || json?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  const filenameMatch = /filename="?([^"]+)"?/i.exec(disposition);
  const filename = filenameMatch?.[1] || null;
  const blob = await res.blob();
  return { blob, filename };
}
