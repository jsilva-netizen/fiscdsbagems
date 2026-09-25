// Formas compartilhadas da camada de acesso a dados — data-model.md, "Formas compartilhadas".
// Neutras de backend por definição: nada aqui pode nomear Supabase, PostgREST ou Django.

export type ErroTipo =
  | 'nao_encontrado'
  | 'sem_permissao'
  | 'conflito'
  | 'invalido'
  | 'rede_indisponivel'
  | 'falha_servidor'

export type Erro = {
  tipo: ErroTipo
  /** Texto destinado ao usuário — preservar exatamente o que ele vê hoje (FR-004). */
  mensagem: string
  /** Erro bruto do provedor, só para diagnóstico. Nunca exibir ao usuário. */
  origem?: unknown
}

export type Resultado<T> = { ok: true; dado: T } | { ok: false; erro: Erro }

export function sucesso<T>(dado: T): Resultado<T> {
  return { ok: true, dado }
}

export function falha(erro: Erro): Resultado<never> {
  return { ok: false, erro }
}

/**
 * Transforma o dado de um sucesso e repassa a falha intacta. Não depende de estreitamento de
 * tipo pelo `ok`, que a configuração não estrita do projeto (jsconfig.json) não faz — os
 * módulos da camada também são compilados por ela quando importados pelo app.
 */
export function mapear<T, U>(r: Resultado<T>, f: (dado: T) => U): Resultado<U> {
  return r.ok === true ? sucesso(f((r as { ok: true; dado: T }).dado)) : (r as Resultado<never>)
}

/** Tipo do erro de uma falha, ou undefined num sucesso — mesma razão de `mapear`. */
export function tipoDoErro(r: Resultado<unknown>): ErroTipo | undefined {
  return r.ok === true ? undefined : (r as { ok: false; erro: Erro }).erro.tipo
}

// --- Filtro e paginação (data-model.md "Filtro e paginação") ---------------------------
//
// Restrição de fidelidade: o conjunto de operadores é exatamente o que os pontos de acesso
// atuais usam (igualdade, pertencimento, intervalo, busca textual, ordenação, paginação).
// Não antecipar operador sem consumidor — Princípio V da constituição.

export type CriterioIgualdade = { campo: string; op: 'igual' | 'diferente'; valor: unknown }
export type CriterioPertencimento = { campo: string; op: 'em' | 'nao_em'; valores: unknown[] }
export type CriterioIntervalo = {
  campo: string
  op: 'maior' | 'maior_ou_igual' | 'menor' | 'menor_ou_igual'
  valor: unknown
}
export type CriterioBuscaTextual = { campo: string; op: 'contem_texto'; valor: string }
/**
 * Basta um dos critérios valer (OU). Só comparações simples dentro — o consumidor atual é o
 * sync-down do motor ("updated_at OU created_at a partir de"), T032 parte 2.
 */
export type CriterioQualquer = { op: 'qualquer'; criterios: (CriterioIgualdade | CriterioIntervalo)[] }

export type Criterio =
  | CriterioIgualdade
  | CriterioPertencimento
  | CriterioIntervalo
  | CriterioBuscaTextual
  | CriterioQualquer

export type Ordenacao = { campo: string; direcao: 'asc' | 'desc' }

export type Filtro = {
  /** Campos a devolver. Ausente = todos. */
  colunas?: string[]
  criterios?: Criterio[]
  ordenacao?: Ordenacao[]
  limite?: number
  deslocamento?: number
  /** Devolver a contagem total junto com a página, quando o provedor suportar sem custo extra. */
  comContagem?: boolean
}

export type PaginaResultado<T> = {
  itens: T[]
  total?: number
}

// --- Referência de arquivo (data-model.md "Referência de arquivo") ---------------------

export type ReferenciaArquivo = {
  /** Repositório lógico (ex.: "fotos-fiscalizacao"), nunca o nome de bucket do provedor. */
  repositorio: string
  caminho: string
}

// --- Identidade e sessão -----------------------------------------------------------------

export type Usuario = {
  id: string
  email?: string
  papel?: string
  [chaveAdicional: string]: unknown
}

export type Sessao = {
  usuario: Usuario
  /** Instante de expiração em segundos desde 1970-01-01 UTC, como texto (ex.: "1790000000"). */
  expiraEm?: string
}

export type EventoSessao =
  | { tipo: 'autenticado'; sessao: Sessao }
  | { tipo: 'renovada'; sessao: Sessao }
  | { tipo: 'expirada' }
  | { tipo: 'encerrada' }
