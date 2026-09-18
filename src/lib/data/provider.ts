// O ponto único de seleção do provedor ativo — data-model.md, "Transições de estado":
// "a camada é sem estado, com uma exceção: a seleção do provedor ativo, definida na
// inicialização da aplicação e imutável durante a execução."
//
// Este é literalmente o arquivo que muda quando a fase 2 troca o backend para Django — e
// só ele. Nenhum outro arquivo desta camada, e nenhuma tela, referencia a implementação
// concreta do provedor.

import type { DataProvider } from './contract'
import { supabaseProvider } from './providers/supabase'

let provedorAtivo: DataProvider = supabaseProvider

export function getProvider(): DataProvider {
  return provedorAtivo
}

/**
 * Só para uso em teste (T090, provedor de teste alternativo) — nunca chamado pelo código
 * de produção. Trocar o provedor de produção é decisão de configuração de build, não uma
 * chamada em runtime.
 */
export function __setProviderForTests(provider: DataProvider): void {
  provedorAtivo = provider
}
