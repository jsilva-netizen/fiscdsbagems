// Categoria Sincronização offline (contracts/provider.md #6) — implementação Supabase.
//
// A categoria mais sensível da fase. Esta implementação cobre a operação genérica de envio
// de item — a lógica completa de reconciliação (id_map, ordem de orderForSyncUp, dedup
// pré-insert, reconciliação de exclusão remota) pertence ao domínio `fiscalizacoes`
// (tasks.md T030-T032), que É o consumidor desta categoria, não a própria categoria.
//
// classificarFalha reproduz isRetryableError de syncEngine.ts EXATAMENTE — inclusive o caso
// 23503 (violação de FK) como definitivo, que syncEngine.ts documenta como correção de um
// loop infinito de sincronização já visto em produção (inventario-acoplamento.md lote 3a).
// Não simplificar esta função sem entender por que cada ramo existe.

import { supabase } from '@/lib/supabase'
import type { FalhaSincronizacao, SincronizacaoProvider } from '../../contract'
import type { Erro } from '../../types'

function classificarFalha(erro: unknown): FalhaSincronizacao {
  const e = erro as { status?: number; code?: string | number; message?: string } | null
  const status = typeof e?.status === 'number' ? e.status : undefined
  const code = typeof e?.code === 'string' ? e.code : undefined
  const mensagem = String(e?.message || erro || '')
  const msgLower = mensagem.toLowerCase()

  const erroBase: Erro = { tipo: 'falha_servidor', mensagem, origem: erro }

  // Violação de FK: o pai foi apagado em outro dispositivo, não "aparece de novo" numa
  // retentativa — tratar como retryable aqui já causou loop infinito em produção.
  if (code === '23503') {
    return { classificacao: 'definitiva', erro: { ...erroBase, tipo: 'invalido' } }
  }
  if (status === 401 || status === 403) {
    return { classificacao: 'temporaria', erro: { ...erroBase, tipo: 'sem_permissao' } }
  }
  if (status === 408 || status === 409 || status === 429) {
    return { classificacao: 'temporaria', erro: erroBase }
  }
  if (typeof status === 'number' && status >= 500) {
    return { classificacao: 'temporaria', erro: erroBase }
  }
  if (code && ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND'].includes(code)) {
    return { classificacao: 'temporaria', erro: { ...erroBase, tipo: 'rede_indisponivel' } }
  }
  if (code === '40P01' || msgLower.includes('deadlock')) {
    return { classificacao: 'temporaria', erro: erroBase }
  }
  if (msgLower.includes('timeout') || msgLower.includes('network') || msgLower.includes('failed to fetch')) {
    return { classificacao: 'temporaria', erro: { ...erroBase, tipo: 'rede_indisponivel' } }
  }
  return { classificacao: 'definitiva', erro: erroBase }
}

export const sincronizacaoProvider: SincronizacaoProvider = {
  async enviarItemFila<T>(colecao: string, tipo: 'insert' | 'update' | 'delete', payload: T) {
    try {
      if (tipo === 'delete') {
        const id = (payload as any)?.id
        const { error } = await supabase.from(colecao).delete().eq('id', id)
        if (error) return { ok: false as const, falha: classificarFalha(error) }
        return { ok: true as const, dado: {} }
      }
      const { data, error } = await supabase.from(colecao).upsert(payload as any, { onConflict: 'id' }).select()
      if (error) return { ok: false as const, falha: classificarFalha(error) }
      return { ok: true as const, dado: (data?.[0] ?? {}) as Record<string, unknown> }
    } catch (erro) {
      return { ok: false as const, falha: classificarFalha(erro) }
    }
  },
}

export { classificarFalha }
