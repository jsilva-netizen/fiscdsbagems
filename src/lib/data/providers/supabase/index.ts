// Ponto de entrada do provedor Supabase — único lugar, junto com os módulos irmãos nesta
// pasta, autorizado a importar src/lib/supabase.js (contracts/README.md, "a regra que
// sustenta tudo").

import type { DataProvider } from '../../contract'
import { registroOperacoesProvider } from '../../logging'
import { alcancabilidadeProvider } from './alcancabilidade'
import { arquivosProvider } from './arquivos'
import { assincronoProvider } from './assincrono'
import { identidadeProvider } from './identidade'
import { procedimentosProvider } from './procedimentos'
import { registrosProvider } from './registros'
import { sincronizacaoProvider } from './sincronizacao'

export const supabaseProvider: DataProvider = {
  registros: registrosProvider,
  arquivos: arquivosProvider,
  identidade: identidadeProvider,
  procedimentos: procedimentosProvider,
  assincrono: assincronoProvider,
  sincronizacao: sincronizacaoProvider,
  alcancabilidade: alcancabilidadeProvider,
  registroOperacoes: registroOperacoesProvider,
}
