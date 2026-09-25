// Categoria Registros (contracts/provider.md #1) — implementação Supabase.
//
// Traduz Filtro (types.ts) para sintaxe PostgREST. Regras a preservar (contracts/provider.md
// #1): ordem determinística, lote preserva ordem de entrada, falha parcial em lote reportada
// por item.

import { supabase } from '@/lib/supabase'
import type { RegistrosProvider } from '../../contract'
import type { Criterio, Filtro, PaginaResultado } from '../../types'
import { sucesso, falha, type Resultado, type Erro } from '../../types'

function mapearErro(erro: unknown): Erro {
  const e = erro as { code?: string; message?: string; status?: number } | null
  const status = e?.status
  const code = e?.code
  if (code === 'PGRST116' || status === 404) {
    return { tipo: 'nao_encontrado', mensagem: 'Registro não encontrado.', origem: erro }
  }
  if (status === 401 || status === 403 || code === '42501') {
    return { tipo: 'sem_permissao', mensagem: 'Você não tem permissão para esta operação.', origem: erro }
  }
  if (code === '23505') {
    return { tipo: 'conflito', mensagem: 'Já existe um registro com esses dados.', origem: erro }
  }
  if (code === '23503' || code === '23502' || code === '22P02') {
    return { tipo: 'invalido', mensagem: 'Dados inválidos para esta operação.', origem: erro }
  }
  if (typeof status === 'number' && status >= 500) {
    return { tipo: 'falha_servidor', mensagem: 'Erro no servidor. Tente novamente.', origem: erro }
  }
  const msg = String(e?.message || '').toLowerCase()
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('timeout')) {
    return { tipo: 'rede_indisponivel', mensagem: 'Sem conexão com o servidor.', origem: erro }
  }
  return { tipo: 'falha_servidor', mensagem: e?.message || 'Erro inesperado.', origem: erro }
}

// Operadores simples na sintaxe de filtro do PostgREST, usada dentro de .or().
const OPERADOR_POSTGREST: Record<string, string> = {
  igual: 'eq',
  diferente: 'neq',
  maior: 'gt',
  maior_ou_igual: 'gte',
  menor: 'lt',
  menor_ou_igual: 'lte',
}

function aplicarCriterio(query: any, c: Criterio): any {
  switch (c.op) {
    case 'qualquer':
      return query.or(c.criterios.map((s) => `${s.campo}.${OPERADOR_POSTGREST[s.op]}.${s.valor}`).join(','))
    case 'igual':
      return query.eq(c.campo, c.valor)
    case 'diferente':
      return query.neq(c.campo, c.valor)
    case 'em':
      return query.in(c.campo, c.valores)
    case 'nao_em':
      return query.not(c.campo, 'in', `(${c.valores.join(',')})`)
    case 'maior':
      return query.gt(c.campo, c.valor)
    case 'maior_ou_igual':
      return query.gte(c.campo, c.valor)
    case 'menor':
      return query.lt(c.campo, c.valor)
    case 'menor_ou_igual':
      return query.lte(c.campo, c.valor)
    case 'contem_texto':
      return query.ilike(c.campo, `%${c.valor}%`)
    default:
      return query
  }
}

function aplicarFiltro(query: any, filtro?: Filtro): any {
  if (!filtro) return query
  let q = query
  for (const c of filtro.criterios ?? []) q = aplicarCriterio(q, c)
  for (const o of filtro.ordenacao ?? []) q = q.order(o.campo, { ascending: o.direcao === 'asc' })
  if (typeof filtro.limite === 'number') {
    const from = filtro.deslocamento ?? 0
    q = q.range(from, from + filtro.limite - 1)
  }
  return q
}

function colunasDe(filtro?: Filtro): string {
  return filtro?.colunas?.length ? filtro.colunas.join(',') : '*'
}

const TAMANHO_PAGINA = 1000 // o de selectAllPages (syncEngine.ts)

export const registrosProvider: RegistrosProvider = {
  async buscarMuitos<T>(colecao: string, filtro?: Filtro): Promise<Resultado<PaginaResultado<T>>> {
    let query = filtro?.comContagem
      ? supabase.from(colecao).select(colunasDe(filtro), { count: 'exact' })
      : supabase.from(colecao).select(colunasDe(filtro))
    query = aplicarFiltro(query, filtro)
    const { data, error, count } = await query
    if (error) return falha(mapearErro(error))
    return sucesso({ itens: (data ?? []) as T[], total: count ?? undefined })
  },

  async buscarTodos<T>(colecao: string, filtro?: Filtro): Promise<Resultado<T[]>> {
    const query = aplicarFiltro(supabase.from(colecao).select(colunasDe(filtro)), {
      ...filtro,
      limite: undefined,
      deslocamento: undefined,
    })
    const todas: T[] = []
    let de = 0
    while (true) {
      const { data, error } = await query.range(de, de + TAMANHO_PAGINA - 1)
      if (error) return falha(mapearErro(error))
      const pagina = (data ?? []) as T[]
      todas.push(...pagina)
      if (pagina.length < TAMANHO_PAGINA) break
      de += TAMANHO_PAGINA
    }
    return sucesso(todas)
  },

  async buscarUm<T>(colecao: string, id: string): Promise<Resultado<T>> {
    const { data, error } = await supabase.from(colecao).select('*').eq('id', id).maybeSingle()
    if (error) return falha(mapearErro(error))
    if (!data) return falha({ tipo: 'nao_encontrado', mensagem: 'Registro não encontrado.' })
    return sucesso(data as T)
  },

  async criar<T>(colecao: string, dados: Partial<T>): Promise<Resultado<T>> {
    const { data, error } = await supabase.from(colecao).insert(dados as any).select().single()
    if (error) return falha(mapearErro(error))
    return sucesso(data as T)
  },

  async atualizar<T>(colecao: string, id: string, dados: Partial<T>): Promise<Resultado<T>> {
    const { data, error } = await supabase.from(colecao).update(dados as any).eq('id', id).select().single()
    if (error) return falha(mapearErro(error))
    return sucesso(data as T)
  },

  async remover(colecao: string, id: string): Promise<Resultado<void>> {
    const { error } = await supabase.from(colecao).delete().eq('id', id)
    if (error) return falha(mapearErro(error))
    return sucesso(undefined)
  },

  async criarOuAtualizarEmLote<T>(colecao: string, registros: Partial<T>[]): Promise<Resultado<T>[]> {
    // Preserva ordem de entrada na saída (contracts/provider.md #1) e reporta falha por
    // item, não como falha global — cada registro processado individualmente.
    const resultados: Resultado<T>[] = []
    for (const registro of registros) {
      const id = (registro as any)?.id
      if (id) {
        const { data, error } = await supabase.from(colecao).upsert(registro as any).select().single()
        resultados.push(error ? falha(mapearErro(error)) : sucesso(data as T))
      } else {
        const { data, error } = await supabase.from(colecao).insert(registro as any).select().single()
        resultados.push(error ? falha(mapearErro(error)) : sucesso(data as T))
      }
    }
    return resultados
  },

  async buscarHistoricoAlteracoes(filtro: Filtro): Promise<Resultado<PaginaResultado<Record<string, unknown>>>> {
    // Implementado quando a página consumidora migrar (tasks.md T080) — reproduz o filtro
    // .or() complexo de HistoricoFiscalizacao.jsx sobre audit_logs. Ver
    // contracts/provider.md #1, "Caso especial — Auditoria".
    return registrosProvider.buscarMuitos('audit_logs', filtro)
  },
}

/** Só para teste (T023) — acesso direto às funções de tradução, sem passar pelo Supabase real. */
export const __internoParaTeste = { mapearErro, aplicarCriterio, aplicarFiltro }
