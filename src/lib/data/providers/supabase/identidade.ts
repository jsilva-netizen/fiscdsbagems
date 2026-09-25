// Categoria Identidade e sessão (contracts/provider.md #3) — implementação Supabase.
//
// Traduz eventos SIGNED_OUT/USER_DELETED (nomes do Supabase Auth) para EventoSessao neutro.
// Esta categoria é a que mais muda na fase 2 (research.md) — quanto mais neutro o contrato
// aqui, menor o impacto lá.

import { supabase } from '@/lib/supabase'
import type { IdentidadeProvider } from '../../contract'
import type { EventoSessao, Sessao, Usuario } from '../../types'
import { sucesso, falha, type Resultado } from '../../types'

function mapearUsuario(u: any): Usuario {
  return { id: u.id, email: u.email ?? undefined, papel: u.role ?? undefined, ...u }
}

function mapearSessao(s: any): Sessao {
  return { usuario: mapearUsuario(s.user), expiraEm: s.expires_at ? String(s.expires_at) : undefined }
}

export const identidadeProvider: IdentidadeProvider = {
  async autenticar({ email, senha }): Promise<Resultado<Sessao>> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error || !data.session) {
      return falha({ tipo: 'sem_permissao', mensagem: error?.message || 'Falha ao autenticar.', origem: error })
    }
    return sucesso(mapearSessao(data.session))
  },

  async cadastrar({ email, senha, metadados }): Promise<Resultado<Sessao>> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: metadados },
    })
    if (error || !data.session) {
      return falha({ tipo: 'invalido', mensagem: error?.message || 'Falha ao cadastrar.', origem: error })
    }
    return sucesso(mapearSessao(data.session))
  },

  async encerrarSessao(): Promise<Resultado<void>> {
    const { error } = await supabase.auth.signOut()
    if (error) return falha({ tipo: 'falha_servidor', mensagem: error.message, origem: error })
    return sucesso(undefined)
  },

  async obterUsuarioCorrente(): Promise<Resultado<Usuario | null>> {
    const { data, error } = await supabase.auth.getUser()
    if (error) return falha({ tipo: 'sem_permissao', mensagem: error.message, origem: error })
    return sucesso(data.user ? mapearUsuario(data.user) : null)
  },

  async obterSessaoLocal(): Promise<Resultado<Sessao | null>> {
    const { data, error } = await supabase.auth.getSession()
    if (error) return falha({ tipo: 'sem_permissao', mensagem: error.message, origem: error })
    return sucesso(data.session ? mapearSessao(data.session) : null)
  },

  observarSessao(ouvinte: (evento: EventoSessao) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // USER_DELETED não está mais no union de tipos desta versão do SDK, mas o código
      // original (AuthContext.jsx) trata esse evento explicitamente — preservado via cast
      // de string em vez de removido, para não descartar tratamento defensivo existente
      // sem uma decisão consciente (FR-021).
      if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
        ouvinte({ tipo: 'expirada' })
        return
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        ouvinte({ tipo: 'renovada', sessao: mapearSessao(session) })
        return
      }
      if (session) {
        ouvinte({ tipo: 'autenticado', sessao: mapearSessao(session) })
      }
    })
    return () => data.subscription.unsubscribe()
  },

  async renovarCredencial(): Promise<Resultado<Sessao>> {
    const { data, error } = await supabase.auth.refreshSession()
    if (error || !data.session) {
      return falha({ tipo: 'sem_permissao', mensagem: error?.message || 'Falha ao renovar sessão.', origem: error })
    }
    return sucesso(mapearSessao(data.session))
  },
}
