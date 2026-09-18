// O contrato do provedor, em TypeScript — tradução direta de contracts/provider.md.
// Qualquer implementação (Supabase hoje, Django na fase 2) precisa satisfazer esta
// interface por completo. Nenhum tipo aqui nomeia backend concreto.

import type {
  Criterio,
  Erro,
  Filtro,
  Ordenacao,
  PaginaResultado,
  ReferenciaArquivo,
  Resultado,
  Sessao,
  Usuario,
  EventoSessao,
} from './types'

// --- 1. Registros ------------------------------------------------------------------------

export type RegistrosProvider = {
  buscarMuitos<T = Record<string, unknown>>(
    colecao: string,
    filtro?: Filtro
  ): Promise<Resultado<PaginaResultado<T>>>
  buscarUm<T = Record<string, unknown>>(
    colecao: string,
    id: string
  ): Promise<Resultado<T>>
  criar<T = Record<string, unknown>>(
    colecao: string,
    dados: Partial<T>
  ): Promise<Resultado<T>>
  atualizar<T = Record<string, unknown>>(
    colecao: string,
    id: string,
    dados: Partial<T>
  ): Promise<Resultado<T>>
  remover(colecao: string, id: string): Promise<Resultado<void>>
  criarOuAtualizarEmLote<T = Record<string, unknown>>(
    colecao: string,
    registros: Partial<T>[]
  ): Promise<Resultado<T>[]>
  /** Caso especial — Auditoria (contracts/provider.md categoria 1). */
  buscarHistoricoAlteracoes(
    filtro: Filtro
  ): Promise<Resultado<PaginaResultado<Record<string, unknown>>>>
}

// --- 2. Arquivos -------------------------------------------------------------------------

export type ArquivosProvider = {
  enviar(
    ref: ReferenciaArquivo,
    conteudo: Blob | ArrayBuffer | string,
    opcoes?: { tipoConteudo?: string }
  ): Promise<Resultado<ReferenciaArquivo>>
  obterEnderecoAcesso(ref: ReferenciaArquivo): Promise<Resultado<string>>
  remover(ref: ReferenciaArquivo): Promise<Resultado<void>>
  listar(repositorio: string, prefixoCaminho?: string): Promise<Resultado<ReferenciaArquivo[]>>
}

// --- 3. Identidade e sessão ----------------------------------------------------------------

export type IdentidadeProvider = {
  autenticar(credenciais: { email: string; senha: string }): Promise<Resultado<Sessao>>
  cadastrar(dados: {
    email: string
    senha: string
    metadados?: Record<string, unknown>
  }): Promise<Resultado<Sessao>>
  encerrarSessao(): Promise<Resultado<void>>
  obterUsuarioCorrente(): Promise<Resultado<Usuario | null>>
  observarSessao(ouvinte: (evento: EventoSessao) => void): () => void
  renovarCredencial(): Promise<Resultado<Sessao>>
}

// --- 4. Procedimentos remotos --------------------------------------------------------------
//
// Nomes lógicos fixados em research.md decisão D11 — não usar nome de função do banco aqui.

export type NomeProcedimento =
  | 'finalizarFiscalizacao'
  | 'reabrirFiscalizacao'
  | 'gerarNumeroAuto'
  | 'gerarNumeroAm'
  | 'excluirUsuarioAdmin'
  | 'obterResumoIndicadores'
  | 'importarDoCaters'

export type ProcedimentosProvider = {
  executar<T = unknown>(
    nome: NomeProcedimento,
    parametros?: Record<string, unknown>
  ): Promise<Resultado<T>>
}

// --- 5. Processamento assíncrono ------------------------------------------------------------

export type SituacaoTarefa = 'na_fila' | 'processando' | 'concluida' | 'erro'

export type TarefaAssincrona = {
  id: string
  situacao: SituacaoTarefa
  progresso?: { atual: number; total: number }
  resultado?: unknown
  mensagemErro?: string
}

export type AssincronoProvider = {
  solicitar(tipo: string, parametros?: Record<string, unknown>): Promise<Resultado<{ id: string }>>
  /** @param tipo O mesmo usado em `solicitar` — necessário para resolver qual fila consultar. */
  consultarSituacao(tipo: string, id: string): Promise<Resultado<TarefaAssincrona>>
  cancelar?(tipo: string, id: string): Promise<Resultado<void>>
}

// --- 6. Sincronização offline ---------------------------------------------------------------

export type FalhaSincronizacao = { classificacao: 'temporaria' | 'definitiva'; erro: Erro }

export type ResultadoSincronizacao<T> =
  | { ok: true; dado: T }
  | { ok: false; falha: FalhaSincronizacao }

export type SincronizacaoProvider = {
  /**
   * Ao contrário das demais categorias, o retorno aqui MUST vir sempre classificado
   * (temporária vs. definitiva) — é essa distinção que o motor de sync usa para decidir
   * entre repetir e adiar. Por isso não reaproveita Resultado<T>: um "falha genérica" sem
   * classificação obrigaria o consumidor a reclassificar, duplicando a lógica desta
   * categoria.
   */
  enviarItemFila<T = unknown>(
    colecao: string,
    tipo: 'insert' | 'update' | 'delete',
    payload: T
  ): Promise<ResultadoSincronizacao<Record<string, unknown>>>
}

// --- 7. Alcançabilidade -----------------------------------------------------------------------

export type AlcancabilidadeProvider = {
  /**
   * @param timeoutMs Opcional — os dois consumidores atuais (hook de UI, motor de sync)
   *   usam timeouts diferentes (6000ms/8000ms, ver inventario-acoplamento.md lote 3a) e
   *   isso é preservado como parâmetro de chamada, não fixado na implementação. Sem
   *   argumento, usa o valor de referência (o que a UI usa hoje).
   */
  verificar(timeoutMs?: number): Promise<boolean>
  observar(ouvinte: (alcancavel: boolean) => void): () => void
}

// --- 8. Registro de operações (transversal, FR-023/024) ------------------------------------

export type RegistroOperacoesProvider = {
  ativo(): boolean
  ativar(): void
  desativar(): void
  registrar(entrada: {
    tipo: string
    dominio: string
    alvo: string
    duracaoMs: number
    resultado: 'sucesso' | 'falha'
  }): void
}

// --- O contrato completo -------------------------------------------------------------------

export type DataProvider = {
  registros: RegistrosProvider
  arquivos: ArquivosProvider
  identidade: IdentidadeProvider
  procedimentos: ProcedimentosProvider
  assincrono: AssincronoProvider
  sincronizacao: SincronizacaoProvider
  alcancabilidade: AlcancabilidadeProvider
  registroOperacoes: RegistroOperacoesProvider
}

export type { Criterio, Ordenacao }
