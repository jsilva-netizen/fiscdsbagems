// Registro de operações (contracts/provider.md #8, FR-023/024).
//
// Desligado por padrão — com o registro desligado, o custo MUST ser desprezível (regra do
// contrato): a checagem `ativo` é a primeira coisa que `registrar` faz, sem serialização
// nem alocação antes disso.
//
// FR-024: nunca registrar valores trafegados, dado pessoal ou conteúdo sigiloso — só tipo,
// domínio, alvo, duração e resultado.

import type { RegistroOperacoesProvider } from './contract'

let ativo = false

const entradas: Array<{
  tipo: string
  dominio: string
  alvo: string
  duracaoMs: number
  resultado: 'sucesso' | 'falha'
  em: string
}> = []

const MAX_ENTRADAS_EM_MEMORIA = 500 // evita crescimento sem limite se ninguém consumir o log

export const registroOperacoesProvider: RegistroOperacoesProvider = {
  ativo: () => ativo,
  ativar: () => {
    ativo = true
  },
  desativar: () => {
    ativo = false
  },
  registrar(entrada) {
    if (!ativo) return
    entradas.push({ ...entrada, em: new Date().toISOString() })
    if (entradas.length > MAX_ENTRADAS_EM_MEMORIA) entradas.shift()
  },
}

/** Só para depuração/teste — não é parte do contrato público da categoria. */
export function lerEntradasRegistradas() {
  return [...entradas]
}
