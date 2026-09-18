// Categoria Procedimentos remotos (contracts/provider.md #4) — implementação Supabase.
//
// Mapeamento de nome lógico → função real, fixado em research.md decisão D11. Traduzir aqui,
// e só aqui — nenhuma tela deve conhecer o nome da função no banco.
//
// ⚠️ gerarNumeroAuto/gerarNumeroAm: transportar fielmente a fragilidade de corrida
// conhecida (rpcs-funcoes-e-triggers-postgres.md §4) — decisão do usuário em 2026-09-18 foi
// deferir a correção para a fase Django. NÃO introduzir trava aqui.

import { supabase } from '@/lib/supabase'
import type { NomeProcedimento, ProcedimentosProvider } from '../../contract'
import { sucesso, falha, type Resultado } from '../../types'

const FUNCAO_REAL: Record<NomeProcedimento, string> = {
  finalizarFiscalizacao: 'finalizar_fiscalizacao',
  reabrirFiscalizacao: 'reabrir_fiscalizacao',
  gerarNumeroAuto: 'gerar_numero_auto',
  gerarNumeroAm: 'gerar_numero_am',
  excluirUsuarioAdmin: 'admin_delete_user', // ou admin_delete_user_by_email, ver parametros
  obterResumoIndicadores: 'obter_resumo_indicadores',
  importarDoCaters: 'caters_import_from_fiscalizacao',
}

// excluirUsuarioAdmin tem duas funções reais possíveis, dependendo do parâmetro recebido
// (por id ou por e-mail) — RPCs 5 de rpcs-funcoes-e-triggers-postgres.md.
function resolverFuncaoExcluirUsuario(parametros?: Record<string, unknown>): string {
  return parametros && 'email' in parametros ? 'admin_delete_user_by_email' : 'admin_delete_user'
}

export const procedimentosProvider: ProcedimentosProvider = {
  async executar<T>(nome: NomeProcedimento, parametros?: Record<string, unknown>): Promise<Resultado<T>> {
    const funcaoReal =
      nome === 'excluirUsuarioAdmin' ? resolverFuncaoExcluirUsuario(parametros) : FUNCAO_REAL[nome]

    const { data, error } = await supabase.rpc(funcaoReal, parametros as any)
    if (error) {
      return falha({ tipo: 'falha_servidor', mensagem: error.message, origem: error })
    }
    // finalizar_fiscalizacao/reabrir_fiscalizacao/gerar_ncs_unidade retornam jsonb com
    // { success: false, error: '...' } em vez de erro Postgres — traduzir também esse caso
    // (rpcs-funcoes-e-triggers-postgres.md §1/§2).
    if (data && typeof data === 'object' && (data as any).success === false) {
      return falha({
        tipo: 'invalido',
        mensagem: String((data as any).error || 'Falha ao executar procedimento.'),
        origem: data,
      })
    }
    return sucesso(data as T)
  },
}
