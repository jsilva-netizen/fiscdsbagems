// Categoria Processamento assíncrono (contracts/provider.md #5) — implementação Supabase.
//
// Absorve src/lib/edgeFunctions.js por completo (tasks.md T019) — cabeçalho duplo (apikey +
// x-user-jwt) e o retry único em 401 com renovação de sessão são comportamento a preservar
// exatamente (inventario-acoplamento.md lote 1).

import { supabase, supabaseUrl, supabaseAnonKey } from '@/lib/supabase'
import type { AssincronoProvider, SituacaoTarefa, TarefaAssincrona } from '../../contract'
import { sucesso, falha, type Resultado } from '../../types'

async function invocarFuncao(
  nomeFuncao: string,
  body: Record<string, unknown>,
  tentarNovamenteEm401 = true
): Promise<Resultado<any>> {
  const { data: sessaoData, error: erroSessao } = await supabase.auth.getSession()
  if (erroSessao) return falha({ tipo: 'sem_permissao', mensagem: erroSessao.message, origem: erroSessao })
  const jwt = sessaoData?.session?.access_token
  if (!jwt) return falha({ tipo: 'sem_permissao', mensagem: 'Sessão inválida. Faça login novamente.' })
  if (!supabaseUrl || !supabaseAnonKey) {
    return falha({ tipo: 'falha_servidor', mensagem: 'Configuração do backend ausente.' })
  }

  const url = `${String(supabaseUrl).replace(/\/$/, '')}/functions/v1/${nomeFuncao}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'x-user-jwt': jwt,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body || {}),
    })
  } catch (erroRede) {
    return falha({ tipo: 'rede_indisponivel', mensagem: 'Sem conexão com o servidor.', origem: erroRede })
  }

  let json: any = null
  try {
    json = await res.json()
  } catch {
    json = null
  }

  if (!res.ok) {
    if (res.status === 401 && tentarNovamenteEm401) {
      const { data: renovada, error: erroRenovacao } = await supabase.auth.refreshSession()
      if (!erroRenovacao && renovada?.session?.access_token) {
        return invocarFuncao(nomeFuncao, body, false)
      }
    }
    const msg = json?.error || json?.message || `Erro ${res.status}`
    if (res.status === 401 || res.status === 403) return falha({ tipo: 'sem_permissao', mensagem: msg, origem: json })
    if (res.status >= 500) return falha({ tipo: 'falha_servidor', mensagem: msg, origem: json })
    return falha({ tipo: 'invalido', mensagem: msg, origem: json })
  }
  return sucesso(json)
}

function traduzirSituacao(status: string | undefined): SituacaoTarefa {
  if (status === 'queued') return 'na_fila'
  if (status === 'processing') return 'processando'
  if (status === 'done') return 'concluida'
  return 'erro'
}

export const assincronoProvider: AssincronoProvider = {
  async solicitar(tipo: string, parametros?: Record<string, unknown>): Promise<Resultado<{ id: string }>> {
    const resultado = await invocarFuncao(`${tipo}_enqueue`, parametros ?? {})
    if (!resultado.ok) return resultado
    const jobId = resultado.dado?.job_id
    if (!jobId) return falha({ tipo: 'falha_servidor', mensagem: 'Falha ao criar tarefa.' })
    return sucesso({ id: jobId })
  },

  async consultarSituacao(tipo: string, id: string): Promise<Resultado<TarefaAssincrona>> {
    const resultado = await invocarFuncao(`${tipo}_status`, { job_id: id })
    if (!resultado.ok) return resultado
    const d = resultado.dado
    if (d?.status === 'not_found') {
      return falha({ tipo: 'nao_encontrado', mensagem: 'Tarefa não encontrada.' })
    }
    return sucesso({
      id,
      situacao: traduzirSituacao(d?.status),
      progresso:
        typeof d?.progress_unidades === 'number' || typeof d?.progress_fotos === 'number'
          ? { atual: d?.progress_unidades ?? d?.progress_fotos ?? 0, total: 0 }
          : undefined,
      resultado: d,
      mensagemErro: d?.error_message,
    })
  },
}
