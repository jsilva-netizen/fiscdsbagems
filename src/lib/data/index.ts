// Superfície pública da camada de acesso a dados (contracts/README.md, "a regra que
// sustenta tudo"): todo o resto do aplicativo importa só daqui.
//
// Os módulos de domínio (tasks.md T022+) são a forma pretendida de consumo — operações de
// negócio, não coleções cruas. `getProvider()` fica disponível para os próprios módulos de
// domínio montarem essas operações; código de tela não deveria precisar dele diretamente.

export { getProvider } from './provider'
export type {
  Criterio,
  Erro,
  ErroTipo,
  Filtro,
  Ordenacao,
  PaginaResultado,
  ReferenciaArquivo,
  Resultado,
  Sessao,
  Usuario,
  EventoSessao,
} from './types'
export type { DataProvider, NomeProcedimento } from './contract'
