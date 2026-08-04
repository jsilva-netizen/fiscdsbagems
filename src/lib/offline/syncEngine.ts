import { db, UUID } from './db'
import { supabase } from '@/lib/supabase'
import { base64ToBlob } from './image'
import { clearAllPreviewUrls, revokeManyPreviewUrls } from './photoPreviewCache'
import { parseKMLKmPoints } from '@/utils/rodoviasGeoJSON'

type Entity =
  | 'fiscalizacoes'
  | 'unidades'
  | 'respostas'
  | 'constatacoes_manuais'
  | 'fotos'
  | 'finalizacao_unidade'
  | 'tipos_unidade'
  | 'itens_checklist'
  | 'recomendacoes'
  | 'determinacoes'
  | 'finalizacao_fiscalizacao'
  | 'reabrir_fiscalizacao'
  | 'prestadores'
  | 'contratos'

type MutationType = 'insert' | 'update' | 'delete' | 'finalize' | 'reopen'

export type SyncProgress = {
  message: string
  current: number
  total: number
  isError?: boolean
}

const entityTableMap: Record<Entity, string> = {
  fiscalizacoes: 'fiscalizacoes',
  unidades: 'unidades_fiscalizadas',
  respostas: 'respostas_checklist',
  constatacoes_manuais: 'constatacoes_manuais',
  fotos: 'unidades_fiscalizadas',
  finalizacao_unidade: 'unidades_fiscalizadas',
  tipos_unidade: 'tipos_unidade',
  itens_checklist: 'itens_checklist',
  recomendacoes: 'recomendacoes',
  determinacoes: 'determinacoes',
  finalizacao_fiscalizacao: 'fiscalizacoes',
  reabrir_fiscalizacao: 'fiscalizacoes'
  ,
  prestadores: 'prestadores_servico',
  contratos: 'contratos'
}

function serializePayload(entity: Entity, type: MutationType, payload: any): any {
  // envia apenas colunas válidas
  const pick = (obj: any, keys: string[]) =>
    keys.reduce((acc, k) => {
      if (obj[k] !== undefined) acc[k] = obj[k]
      return acc
    }, {} as any)
  switch (entity) {
    case 'fiscalizacoes':
      return pick(payload, [
        'id',
        'municipio_id',
        'municipio_nome',
        'prestador_servico_id',
        'prestador_servico_nome',
        'fiscal_nome',
        'servicos',
        'status',
        'data_inicio',
        'data_fim',
        'numero_termo',
        'fiscal_email',
        'last_modified_by',
        'last_modified_at',
        'created_at',
        'updated_at',
        'tipo_modulo',
        'rodovia'
      ])
    case 'unidades':
      // fotos_unidade é tratada separadamente em 'fotos'
      return pick(payload, [
        'id',
        'fiscalizacao_id',
        'tipo_unidade_id',
        'status',
        'ordem',
        'codigo_unidade',
        'nome_unidade',
        'endereco',
        'coordenadas',
        'latitude',
        'longitude',
        'data_hora_vistoria',
        'created_at',
        'updated_at',
        'rodovia',
        'trecho',
        'km',
        'sentido',
        'per',
        'frente',
        'tipo_ocorrencia',
        'gravidade',
        'nao_atendimento',
        'prazo_dias_nc',
        'gps_accuracy_m',
        'km_impreciso'
      ])
    case 'respostas':
      return pick(payload, [
        'id',
        'unidade_fiscalizada_id',
        'item_checklist_id',
        'resposta',
        'observacao',
        'pergunta',
        'numero_constatacao',
        'gera_nc',
        'created_at',
        'updated_at'
      ])
    case 'constatacoes_manuais':
      return pick(payload, [
        'id',
        'unidade_fiscalizada_id',
        'numero_constatacao',
        'descricao',
        'descricao_nc',
        'gera_nc',
        'ordem',
        'artigo_portaria',
        'texto_determinacao',
        'texto_recomendacao',
        'created_at',
        'updated_at'
      ])
    case 'recomendacoes':
      return pick(payload, [
        'id',
        'unidade_fiscalizada_id',
        'numero_recomendacao',
        'descricao',
        'origem',
        'created_at',
        'updated_at'
      ])
    case 'determinacoes':
      return pick(payload, [
        'id',
        'unidade_fiscalizada_id',
        'numero_determinacao',
        'descricao',
        'prazo_dias',
        'data_limite',
        'status',
        'origem',
        'created_at',
        'updated_at'
      ])
    case 'tipos_unidade':
      return pick(payload, [
        'id',
        'nome',
        'codigo',
        'servicos_aplicaveis',
        'ativo',
        'created_at'
      ])
    case 'itens_checklist':
      return pick(payload, [
        'id',
        'tipo_unidade_id',
        'ordem',
        'pergunta',
        'texto_constatacao_sim',
        'texto_constatacao_nao',
        'gera_nc',
        'artigo_portaria',
        'texto_determinacao',
        'texto_recomendacao',
        'texto_nc',
        'prazo_dias',
        'ativo',
        'created_at'
      ])
    case 'prestadores':
      return pick(payload, [
        'id',
        'nome',
        'razao_social',
        'endereco',
        'cidade',
        'telefone',
        'email_contato',
        'cnpj',
        'responsavel',
        'cargo',
        'tipo',
        'documentos',
        'created_at',
        'updated_at',
        'tipo_entidade',
        'tipo_servico',
        'logo_url',
        'status',
        'website',
        'estado',
        'cep',
        'observacoes'
      ])
    case 'contratos':
      return pick(payload, [
        'id',
        'numero_contrato',
        'prestador_servico_id',
        'rodovia',
        'ativo',
        'created_at',
        'updated_at'
      ])
    default:
      return payload
  }
}

const orderForSyncUp: Entity[] = [
  'prestadores',
  'contratos',
  'tipos_unidade',
  'itens_checklist',
  'fiscalizacoes',
  'unidades',
  'respostas',
  'constatacoes_manuais',
  'recomendacoes',
  'determinacoes',
  'fotos',
  'reabrir_fiscalizacao',
  'finalizacao_unidade',
  'finalizacao_fiscalizacao'
]

const now = () => new Date().toISOString()

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function withBackoff<T>(fn: () => Promise<T>, retries = 4, baseDelayMs = 500): Promise<T> {
  let attempt = 0
  let lastErr: any
  while (attempt <= retries) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      const delay = baseDelayMs * Math.pow(2, attempt)
      await new Promise((res) => setTimeout(res, delay))
      attempt++
    }
  }
  throw lastErr
}

function withTimeout<T>(fn: () => Promise<T>, timeoutMs = 15000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let done = false
    const timer = setTimeout(() => {
      if (done) return
      done = true
      reject(new Error('Timeout'))
    }, timeoutMs)
    fn()
      .then((res) => {
        if (done) return
        done = true
        clearTimeout(timer)
        resolve(res)
      })
      .catch((err) => {
        if (done) return
        done = true
        clearTimeout(timer)
        reject(err)
      })
  })
}

async function selectAllPages(q: any, pageSize = 1000): Promise<any[]> {
  const out: any[] = []
  let from = 0
  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await q.range(from, to)
    if (error) throw error
    const rows = (data || []) as any[]
    out.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return out
}

async function safeSelect(table: string, cols: string): Promise<any[]> {
  try {
    return await selectAllPages(supabase.from(table).select(cols))
  } catch {
    return await selectAllPages(supabase.from(table).select('*'))
  }
}

async function safeSelectSince(table: string, cols: string, since?: string, preferStrategy: 'updated' | 'or' = 'updated'): Promise<any[]> {
  const run = async (selectCols: string, mode: 'since' | 'created' | 'all', v?: string, strategy: 'updated' | 'or' = 'updated') => {
    let q = supabase.from(table).select(selectCols)
    if (mode === 'since' && v) {
      q = strategy === 'or' ? q.or(`updated_at.gte.${v},created_at.gte.${v}`) : q.gte('updated_at', v)
    }
    if (mode === 'created' && v) q = q.gte('created_at', v)
    return await selectAllPages(q)
  }
  if (since) {
    const primary = preferStrategy
    const secondary: 'updated' | 'or' = primary === 'or' ? 'updated' : 'or'
    try {
      try {
        try {
          return await run(cols, 'since', since, primary)
        } catch {
          return await run(cols, 'since', since, secondary)
        }
      } catch {
        try {
          return await run('*', 'since', since, primary)
        } catch {
          return await run('*', 'since', since, secondary)
        }
      }
    } catch {
      try {
        return await run(cols, 'created', since)
      } catch {
        return await run('*', 'created', since)
      }
    }
  }
  return safeSelect(table, cols)
}

function errorInfo(err: any): { status?: number; code?: string; message: string } {
  const status = typeof err?.status === 'number' ? err.status : typeof err?.code === 'number' ? err.code : undefined
  const code = typeof err?.code === 'string' ? err.code : undefined
  const baseMsg = String(err?.message || err || '')
  const details = typeof err?.details === 'string' ? err.details : ''
  const hint = typeof err?.hint === 'string' ? err.hint : ''
  const extra = [details, hint].map((s) => String(s || '').trim()).filter(Boolean).join(' | ')
  const message = extra ? `${baseMsg} | ${extra}` : baseMsg
  return { status, code, message }
}

function isRetryableError(err: any): boolean {
  const { status, code, message } = errorInfo(err)
  const msg = message.toLowerCase()
  // Violação de chave estrangeira (23503) não é um problema transitório — o pai
  // (fiscalização/unidade) foi apagado em outro dispositivo e não vai "aparecer de
  // novo" numa próxima tentativa. Tratar como retryable aqui era a causa do loop
  // infinito de sincronização quando isso acontecia; correção primária é limpar a
  // mutação órfã antes de tentar reenviá-la (ver pruneOutboxOrphans), isto é só
  // uma rede de segurança contra corridas remanescentes.
  if (code === '23503') return false
  if (status === 401 || status === 403) return true
  if (status === 408 || status === 409 || status === 429) return true
  if (typeof status === 'number' && status >= 500) return true
  if (code && ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND'].includes(code)) return true
  if (code === '40P01' || msg.includes('deadlock')) return true
  if (msg.includes('timeout') || msg.includes('network') || msg.includes('failed to fetch')) return true
  return false
}

function computeNextRetryAt(attempts: number, retryable: boolean): string {
  const cappedAttempts = Math.max(1, Math.min(12, attempts))
  const base = retryable ? 800 : 10_000
  const maxDelay = retryable ? 5 * 60_000 : 24 * 60 * 60_000
  const raw = base * Math.pow(2, cappedAttempts - 1)
  const delay = Math.min(maxDelay, raw)
  const jitter = Math.floor(Math.random() * Math.min(1500, Math.floor(delay / 3)))
  return new Date(Date.now() + delay + jitter).toISOString()
}

async function fetchExistingIds(table: string, ids: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  const parts = chunk(ids, 500)
  for (const part of parts) {
    if (part.length === 0) continue
    const rows = await withBackoff(() =>
      withTimeout(async () => {
        const { data, error } = await supabase.from(table).select('id').in('id', part as any)
        if (error) throw error
        return (data || []) as any[]
      }, 15000)
    )
    for (const r of rows) out.add(String((r as any)?.id || ''))
  }
  out.delete('')
  return out
}

export async function enqueueMutation(payload: any, type: MutationType, entity: Entity) {
  const id = crypto?.randomUUID?.() || Math.random().toString(36).slice(2)
  await db.fila_mutacoes.add({
    id: id as UUID,
    tipo: type,
    entity,
    payload,
    status: 'pending',
    attempts: 0,
    lastError: '',
    nextRetryAt: undefined,
    created_at: now()
  })
  const pending = await getOutboxCount()
  await db.estados_sync.put({
    id: 'global' as UUID,
    entidade: 'global',
    updated_at: now(),
    pending_count: pending
  })
}

export async function getOutboxCount(): Promise<number> {
  const [pendingOrError, unknownStatus] = await Promise.all([
    db.fila_mutacoes.where('status').anyOf('pending', 'error').count(),
    db.fila_mutacoes.filter((m: any) => !m?.status).count()
  ])
  return (pendingOrError || 0) + (unknownStatus || 0)
}

export async function getSyncPendingForFiscalizacao(
  fiscalizacaoId: UUID
): Promise<{ outboxCount: number; fotosCount: number; sampleErrors?: string[] }> {
  if (!fiscalizacaoId) return { outboxCount: 0, fotosCount: 0, sampleErrors: [] }
  const unidades = await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId as any).toArray()
  const unidadeIds = new Set<string>(unidades.map((u: any) => String(u?.id || '')).filter(Boolean))

  const [pendingOrError, unknownStatus] = await Promise.all([
    db.fila_mutacoes.where('status').anyOf('pending', 'error').toArray(),
    db.fila_mutacoes.filter((m: any) => !m?.status).toArray()
  ])
  const all = [...(pendingOrError || []), ...(unknownStatus || [])]

  const matchesFiscalizacao = (m: any): boolean => {
    const entity = String(m?.entity || '')
    // Ignore reabrir_fiscalizacao mutations
    if (entity === 'reabrir_fiscalizacao') return false
    const p = m?.payload || {}
    const pid = p?.id
    const pfisc = p?.fiscalizacao_id
    if (entity === 'fiscalizacoes' || entity === 'finalizacao_fiscalizacao') {
      return String(pid || '') === String(fiscalizacaoId) || String(pfisc || '') === String(fiscalizacaoId)
    }
    if (entity === 'unidades' || entity === 'finalizacao_unidade') {
      if (String(pfisc || '') === String(fiscalizacaoId)) return true
      const uid = String(pid || p?.unidade_fiscalizada_id || '')
      return uid ? unidadeIds.has(uid) : false
    }
    if (entity === 'respostas' || entity === 'constatacoes_manuais' || entity === 'recomendacoes' || entity === 'fotos') {
      const uid = String(p?.unidade_fiscalizada_id || '')
      return uid ? unidadeIds.has(uid) : false
    }
    return false
  }

  const isOnlyStatusReopen = (m: any): boolean => {
    const entity = String(m?.entity || '')
    const p = m?.payload || {}
    // Check if it's just updating status to em_andamento
    if (entity === 'fiscalizacoes') {
      // Check if payload only has id, status: em_andamento, updated_at, data_fim: null
      const keys = Object.keys(p).filter(k => k !== 'id' && k !== 'updated_at' && k !== 'data_fim')
      return keys.length === 0 || (keys.length === 1 && keys[0] === 'status' && p.status === 'em_andamento')
    }
    if (entity === 'unidades') {
      // Check if payload only has id, status: em_andamento, updated_at
      const keys = Object.keys(p).filter(k => k !== 'id' && k !== 'updated_at')
      return keys.length === 0 || (keys.length === 1 && keys[0] === 'status' && p.status === 'em_andamento')
    }
    return false
  }

  const related = all.filter((m) => matchesFiscalizacao(m) && !isOnlyStatusReopen(m))
  const outboxCount = related.length
  const sampleErrors = related
    .filter((m: any) => String(m?.status || '') === 'error' && m?.lastError)
    .slice(0, 3)
    .map((m: any) => `${String(m?.entity || '')}:${String(m?.tipo || '')}: ${String(m?.lastError || '').slice(0, 140)}`)

  const fotosCount = await db.fotos_local
    .filter((f: any) => !f?.syncedAt && unidadeIds.has(String(f?.unidadeLocalId || '')))
    .count()

  return { outboxCount, fotosCount, sampleErrors }
}

export async function getLastSync(): Promise<{ lastSyncAt?: string }> {
  const st = await db.estados_sync.get('global' as UUID)
  return { lastSyncAt: st?.last_sync_at }
}

async function compactOutbox(): Promise<number> {
  const pending = await db.fila_mutacoes.where('status').equals('pending').toArray()
  if (!Array.isArray(pending) || pending.length < 2) return 0
  
  // Sort chronologically by created_at to preserve order of operations
  pending.sort((a: any, b: any) => {
    const at = a.created_at || ''
    const bt = b.created_at || ''
    return at.localeCompare(bt)
  })

  const mergeable = new Set<string>([
    'respostas',
    'constatacoes_manuais',
    'recomendacoes',
    'unidades',
    'fiscalizacoes',
    'prestadores',
    'tipos_unidade',
    'itens_checklist'
  ])
  const mergePayloadDefined = (prev: any, next: any) => {
    const out: any = { ...(prev || {}) }
    for (const [k, v] of Object.entries(next || {})) {
      if (v !== undefined) out[k] = v
    }
    return out
  }
  const keepByKey = new Map<string, { id: UUID; ts: number; payload: any; entity: string; tipo: string }>()
  const deletables: UUID[] = []
  for (const m of pending) {
    const entity = String((m as any)?.entity || '')
    const pid = (m as any)?.payload?.id
    if (!entity || typeof pid !== 'string' || !pid) continue
    const key = `${entity}:${pid}`
    const ts = Number.isFinite(Date.parse((m as any)?.created_at || '')) ? Date.parse((m as any).created_at) : 0
    const prev = keepByKey.get(key)
    if (!prev) {
      keepByKey.set(key, { id: (m as any).id as UUID, ts, payload: (m as any).payload, entity, tipo: String((m as any)?.tipo || '') })
      continue
    }
    if (ts >= prev.ts) {
      deletables.push(prev.id)
      const nextPayload =
        mergeable.has(entity) && prev?.payload && (m as any)?.payload
          ? mergePayloadDefined(prev.payload, (m as any).payload)
          : (m as any).payload
      const nextTipo = (prev.tipo === 'insert' || String((m as any)?.tipo || '') === 'insert') ? 'insert' : String((m as any)?.tipo || '')
      keepByKey.set(key, { id: (m as any).id as UUID, ts, payload: nextPayload, entity, tipo: nextTipo })
    } else {
      deletables.push((m as any).id as UUID)
    }
  }
  if (deletables.length === 0) return 0
  // Garante que, quando substituímos insert por update (ou várias updates),
  // o payload final mantenha campos obrigatórios (ex.: unidade_fiscalizada_id).
  for (const [, k] of keepByKey) {
    try {
      const row = pending.find((p: any) => p.id === k.id)
      if (row && mergeable.has(k.entity)) {
        const currentPayload = (row as any).payload
        const desiredPayload = k.payload
        const currentTipo = (row as any).tipo
        const desiredTipo = k.tipo
        const updates: any = {}
        let needsUpdate = false
        if (desiredPayload && currentPayload && JSON.stringify(desiredPayload) !== JSON.stringify(currentPayload)) {
          updates.payload = desiredPayload
          needsUpdate = true
        }
        if (desiredTipo && currentTipo && desiredTipo !== currentTipo) {
          updates.tipo = desiredTipo
          needsUpdate = true
        }
        if (needsUpdate) {
          await db.fila_mutacoes.update(k.id as any, updates)
        }
      }
    } catch {}
  }
  await db.fila_mutacoes.bulkDelete(deletables as any)
  const pendingCount = await getOutboxCount()
  await db.estados_sync.put({
    id: 'global' as UUID,
    entidade: 'global',
    updated_at: now(),
    pending_count: pendingCount
  })
  return deletables.length
}

async function retryOutboxErrors(force = false): Promise<void> {
  const errs = await db.fila_mutacoes.where('status').equals('error').toArray()
  const nowIso = now()
  for (const e of errs) {
    const nextRetryAt = (e as any).nextRetryAt as string | undefined
    if (force || !nextRetryAt || nextRetryAt <= nowIso) {
      await db.fila_mutacoes.update(e.id as any, { status: 'pending', nextRetryAt: undefined })
    }
  }
}

async function ensureBaseEntitiesEnqueued(): Promise<void> {
  const pending = await db.pending_entities.toArray()
  if (pending.length === 0) return

  const fiscPend = pending.filter((p: any) => p.entity === 'fiscalizacoes')
  const unPend = pending.filter((p: any) => p.entity === 'unidades')

  if (fiscPend.length > 0) {
    const ids = fiscPend.map((p: any) => String(p.local_id))
    const remote = await fetchExistingIds('fiscalizacoes', ids)
    for (const p of fiscPend) {
      const id = String((p as any).local_id)
      if (remote.has(id)) {
        await db.pending_entities.delete((p as any).id)
        continue
      }
      const local = await db.fiscalizacoes.get(id as any)
      if (!local) {
        await db.pending_entities.delete((p as any).id)
        continue
      }
      await enqueueMutation(local, 'insert', 'fiscalizacoes')
      await db.pending_entities.delete((p as any).id)
    }
  }

  if (unPend.length > 0) {
    const ids = unPend.map((p: any) => String(p.local_id))
    const remote = await fetchExistingIds('unidades_fiscalizadas', ids)
    for (const p of unPend) {
      const id = String((p as any).local_id)
      if (remote.has(id)) {
        await db.pending_entities.delete((p as any).id)
        continue
      }
      const local = await db.unidades.get(id as any)
      if (!local) {
        await db.pending_entities.delete((p as any).id)
        continue
      }
      await enqueueMutation(local, 'insert', 'unidades')
      await db.pending_entities.delete((p as any).id)
    }
  }
}

type PruneResult = {
  prunedFiscalizacaoIds: string[]
  recreatedFiscalizacoes: { oldId: string; newId: string }[]
}

const newLocalId = (): UUID => (crypto?.randomUUID?.() || Math.random().toString(36).slice(2)) as UUID

const RECONCILE_CHILD_ENTITIES = ['unidades', 'respostas', 'constatacoes_manuais', 'recomendacoes', 'determinacoes', 'fotos', 'finalizacao_unidade']

// Existe alguma mutação pendente/com erro (trabalho ainda não sincronizado) ou foto
// local ainda não enviada, referenciando essa fiscalização ou qualquer uma das suas
// unidades? Usado para decidir entre simplesmente remover (nada a perder) ou recriar
// (preservar o que foi feito offline) quando a fiscalização some do servidor.
async function hasUnsyncedWorkForFiscalizacao(fiscId: string, unidadeIds: string[]): Promise<boolean> {
  const fiscMut = await db.fila_mutacoes
    .where('entity').equals('fiscalizacoes')
    .and((m) => String(m?.payload?.id || '') === fiscId && m.status !== 'done')
    .count()
  if (fiscMut > 0) return true

  if (unidadeIds.length > 0) {
    const unidadeIdSet = new Set(unidadeIds)
    const childMut = await db.fila_mutacoes
      .filter((m: any) => {
        if (String(m?.status) === 'done') return false
        if (!RECONCILE_CHILD_ENTITIES.includes(String(m?.entity || ''))) return false
        const p = m?.payload || {}
        const candidateId = String(p?.id || p?.unidade_fiscalizada_id || '')
        return unidadeIdSet.has(candidateId)
      })
      .count()
    if (childMut > 0) return true

    const unsyncedFotos = await db.fotos_local
      .filter((f: any) => !f?.syncedAt && unidadeIdSet.has(String(f?.unidadeLocalId || '')))
      .count()
    if (unsyncedFotos > 0) return true
  }
  return false
}

// Apaga localmente uma fiscalização e toda sua cascata (unidades, respostas,
// constatações manuais, fotos, recomendações, determinações) mais qualquer mutação
// na fila referente a ela ou suas unidades. Só deve ser chamada quando já se sabe que
// não há trabalho offline pendente nessa árvore (ver hasUnsyncedWorkForFiscalizacao) —
// caso contrário use recreateFiscalizacaoLocally.
async function cascadeDeleteFiscalizacaoLocally(f: { id: UUID }): Promise<void> {
  const unidadesLocal = await db.unidades.where('fiscalizacao_id').equals(f.id as any).toArray()
  for (const u of unidadesLocal) {
    const respostas = await db.respostas.where('unidade_fiscalizada_id').equals(u.id as any).toArray()
    for (const r of respostas) await db.respostas.delete(r.id as any)
    const constatacoes = await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(u.id as any).toArray()
    for (const c of constatacoes) await db.constatacoes_manuais.delete(c.id as any)
    const fotos = await db.fotos.where('unidade_fiscalizada_id').equals(u.id as any).toArray()
    for (const ft of fotos) await db.fotos.delete((ft as any).id)
    const recs = await db.recomendacoes.where('unidade_fiscalizada_id').equals(u.id as any).toArray()
    for (const r of recs) await db.recomendacoes.delete(r.id as any)
    const dets = await (db as any).determinacoes.where('unidade_fiscalizada_id').equals(u.id as any).toArray()
    for (const d of dets) await (db as any).determinacoes.delete(d.id as any)
    await db.fotos_local.where('unidadeLocalId').equals(u.id as any).delete()
    await db.id_map.where('local_id').equals(u.id as any).delete()
    await db.unidades.delete(u.id as any)
  }
  await db.fila_mutacoes.where('entity').equals('fiscalizacoes').and((m) => String(m?.payload?.id || '') === f.id).delete()
  await db.id_map.where('local_id').equals(f.id as any).delete()
  await db.fiscalizacoes.delete(f.id as any)
}

// A fiscalização sumiu do servidor (outro dispositivo excluiu), mas este dispositivo
// tem trabalho offline não sincronizado nela — em vez de descartar esse levantamento de
// campo, recriamos a fiscalização e toda sua árvore (unidades, respostas,
// constatações, recomendações, determinações, fotos) com ids novos, como se fosse um
// registro criado agora, e enfileiramos inserts frescos para o próximo envio.
async function recreateFiscalizacaoLocally(f: { id: UUID }): Promise<string> {
  const oldFiscId = String(f.id)
  const oldFisc = await db.fiscalizacoes.get(oldFiscId as any)
  if (!oldFisc) return oldFiscId

  const unidadesLocal = await db.unidades.where('fiscalizacao_id').equals(oldFiscId as any).toArray()
  const newFiscId = newLocalId()
  const unidadeIdMap = new Map<string, string>()
  for (const u of unidadesLocal) unidadeIdMap.set(String(u.id), newLocalId())

  await db.fiscalizacoes.delete(oldFiscId as any)
  await db.fiscalizacoes.put({ ...(oldFisc as any), id: newFiscId } as any)

  for (const u of unidadesLocal) {
    const oldUnidadeId = String(u.id)
    const newUnidadeId = unidadeIdMap.get(oldUnidadeId)!

    await db.respostas.where('unidade_fiscalizada_id').equals(oldUnidadeId as any)
      .modify({ unidade_fiscalizada_id: newUnidadeId } as any)
    await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(oldUnidadeId as any)
      .modify({ unidade_fiscalizada_id: newUnidadeId } as any)
    await db.recomendacoes.where('unidade_fiscalizada_id').equals(oldUnidadeId as any)
      .modify({ unidade_fiscalizada_id: newUnidadeId } as any)
    await (db as any).determinacoes.where('unidade_fiscalizada_id').equals(oldUnidadeId as any)
      .modify({ unidade_fiscalizada_id: newUnidadeId })

    // db.fotos é só um cache derivado de fotos_unidade — descarta, será reconstruído
    // normalmente na próxima atualização de fotos dessa unidade.
    await db.fotos.where('unidade_fiscalizada_id').equals(oldUnidadeId as any).delete()

    // Fotos ainda não enviadas: nenhum upload real aconteceu sob o caminho antigo,
    // então é seguro recalculá-lo com os ids novos.
    await db.fotos_local.where('unidadeLocalId').equals(oldUnidadeId as any).and((x: any) => !x.syncedAt)
      .modify((rec: any) => {
        rec.unidadeLocalId = newUnidadeId
        rec.storagePath = `fiscalizacoes/${newFiscId}/${newUnidadeId}/${rec.localId}.jpg`
        if (rec.cleanStoragePath) rec.cleanStoragePath = `fiscalizacoes/${newFiscId}/${newUnidadeId}/${rec.localId}_original.jpg`
      })
    // Fotos já enviadas antes da exclusão: mantém o caminho de armazenamento (o
    // arquivo pode ainda existir lá), só reaponta a referência de unidade local.
    await db.fotos_local.where('unidadeLocalId').equals(oldUnidadeId as any).and((x: any) => !!x.syncedAt)
      .modify({ unidadeLocalId: newUnidadeId } as any)

    await db.unidades.delete(oldUnidadeId as any)
    await db.unidades.put({ ...(u as any), id: newUnidadeId, fiscalizacao_id: newFiscId } as any)
  }

  // Ids antigos não existem mais em lugar nenhum (nem local, nem servidor) — descarta
  // mapeamentos e mutações que os referenciam.
  const oldIds = new Set<string>([oldFiscId, ...unidadeIdMap.keys()])
  for (const oldId of oldIds) {
    await db.id_map.where('local_id').equals(oldId as any).delete()
  }
  await db.fila_mutacoes
    .filter((m: any) => {
      const p = m?.payload || {}
      const candidateId = String(p?.id || p?.unidade_fiscalizada_id || p?.fiscalizacao_id || '')
      return oldIds.has(candidateId)
    })
    .delete()

  // Enfileira inserts frescos a partir do estado atual (já remapeado) — equivalente a
  // criar essa fiscalização do zero agora, com tudo que foi levantado offline.
  const newFisc = await db.fiscalizacoes.get(newFiscId as any)
  if (newFisc) await enqueueMutation(newFisc, 'insert', 'fiscalizacoes')

  for (const newUnidadeId of unidadeIdMap.values()) {
    const newUnidade = await db.unidades.get(newUnidadeId as any)
    if (!newUnidade) continue
    await enqueueMutation(newUnidade, 'insert', 'unidades')

    const respostas = await db.respostas.where('unidade_fiscalizada_id').equals(newUnidadeId as any).toArray()
    for (const r of respostas) await enqueueMutation(r, 'insert', 'respostas')

    const constatacoes = await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(newUnidadeId as any).toArray()
    for (const c of constatacoes) await enqueueMutation(c, 'insert', 'constatacoes_manuais')

    const recs = await db.recomendacoes.where('unidade_fiscalizada_id').equals(newUnidadeId as any).toArray()
    for (const r of recs) await enqueueMutation(r, 'insert', 'recomendacoes')

    const dets = await (db as any).determinacoes.where('unidade_fiscalizada_id').equals(newUnidadeId as any).toArray()
    for (const d of dets) await enqueueMutation(d, 'insert', 'determinacoes')

    const fotosUnidade = Array.isArray((newUnidade as any).fotos_unidade) ? (newUnidade as any).fotos_unidade : []
    if (fotosUnidade.length > 0) {
      await enqueueMutation({ unidade_fiscalizada_id: newUnidadeId, fotos_unidade: fotosUnidade }, 'update', 'fotos')
    }
  }

  return newFiscId
}

// Detecta fiscalizações excluídas no servidor por outro dispositivo e reconcilia a
// cópia local. Escopado aos IDs que já existem NESTE dispositivo (não faz mais um
// select de toda a tabela do servidor) — barato o bastante para rodar em toda
// sincronização, não só uma vez por dia.
// Retorna null quando a checagem de existência falha (rede/servidor indisponível):
// nesse caso NADA é apagado — nunca tratamos "não consegui checar" como "não existe
// mais". Uma sincronização futura bem-sucedida reconcilia normalmente.
async function pruneLocalByServerIds(): Promise<PruneResult | null> {
  const locals = await db.fiscalizacoes.toArray()
  if (locals.length === 0) return { prunedFiscalizacaoIds: [], recreatedFiscalizacoes: [] }

  const localIds = locals.map((f) => String(f.id))
  let existing: Set<string>
  try {
    existing = await fetchExistingIds('fiscalizacoes', localIds)
  } catch (err) {
    console.warn('pruneLocalByServerIds: existence check failed, skipping this pass', err)
    return null
  }

  const prunedFiscalizacaoIds: string[] = []
  const recreatedFiscalizacoes: { oldId: string; newId: string }[] = []

  for (const f of locals) {
    if (existing.has(String(f.id))) continue
    const pendingInsert = await db.fila_mutacoes.where('entity').equals('fiscalizacoes').and((m) => m.tipo === 'insert' && m.payload?.id === f.id && m.status !== 'done').first()
    if (pendingInsert) continue

    const unidadeIds = (await db.unidades.where('fiscalizacao_id').equals(f.id as any).toArray()).map((u) => String(u.id))
    if (await hasUnsyncedWorkForFiscalizacao(String(f.id), unidadeIds)) {
      const newId = await recreateFiscalizacaoLocally(f)
      recreatedFiscalizacoes.push({ oldId: String(f.id), newId })
    } else {
      await cascadeDeleteFiscalizacaoLocally(f)
      prunedFiscalizacaoIds.push(String(f.id))
    }
  }

  return { prunedFiscalizacaoIds, recreatedFiscalizacoes }
}
async function pushOne(entity: Entity, type: MutationType, payload: any) {
  const table = entityTableMap[entity]
  const resolveId = async (refEntity: Entity, localId?: UUID): Promise<UUID | undefined> => {
    if (!localId) return localId
    const map = await db.id_map.where('local_id').equals(localId).and((m) => m.entity === refEntity).first()
    return map?.server_id || localId
  }
  const doRequest = async () => {
    const ensureUnidadeServerId = async (unidadeLocalId?: UUID): Promise<UUID | undefined> => {
      if (!unidadeLocalId) return unidadeLocalId
      const candidate = await resolveId('unidades', unidadeLocalId)
      if (!candidate) return candidate
      if (candidate !== unidadeLocalId) return candidate
      try {
        const { data: exists } = await supabase.from('unidades_fiscalizadas').select('id').eq('id', candidate as any).maybeSingle()
        if (exists?.id) return candidate
      } catch {}
      const unidadeLocal = await db.unidades.get(unidadeLocalId as any)
      if (!unidadeLocal) return candidate
      await pushOne('unidades', 'insert', { ...unidadeLocal })
      const map = await db.id_map.where('local_id').equals(unidadeLocalId).and((m) => m.entity === 'unidades').first()
      return (map?.server_id as any) || candidate
    }

    if (entity === 'fotos') {
      const unidadeLocalId = payload?.unidade_fiscalizada_id
      const unidadeId = await ensureUnidadeServerId(unidadeLocalId)
      const fotosRemotas = Array.isArray(payload?.fotos_unidade) ? payload.fotos_unidade : []
      const isLocalUrl = (u: string) => /^blob:|^data:|^file:/i.test(String(u || ''))
      
      const { data: existingRow } = await supabase
        .from('unidades_fiscalizadas')
        .select('fotos_unidade')
        .eq('id', unidadeId as any)
        .maybeSingle()
      
      const existing = Array.isArray((existingRow as any)?.fotos_unidade) ? ((existingRow as any).fotos_unidade as any[]) : []
      
      const keyOf = (x: any): string => {
        const lid = typeof x?.localId === 'string' ? x.localId.trim() : ''
        if (lid) return `localId:${lid}`
        const b = typeof x?.bucket === 'string' ? x.bucket : ''
        const p = typeof x?.path === 'string' ? x.path : ''
        if (b && p) return `${b}:${p}`
        const u = typeof x?.url === 'string' ? x.url : ''
        return u ? String(u) : ''
      }

      const byKey = new Map<string, any>()
      // 1. Adicionar o que está no servidor atualmente
      for (const x of existing) {
        const k = keyOf(x)
        if (k) byKey.set(k, x)
      }
      
      // 2. Mesclar com o que veio da UI (fotos remotas mantidas/editadas)
      for (const x of fotosRemotas) {
        const k = keyOf(x)
        if (!k) continue
        const prev = byKey.get(k)
        byKey.set(k, prev ? { ...prev, ...x } : x)
      }

      // 3. Limpeza: Remover o que não existe mais no IDB local
      const localUnit = await db.unidades.get(unidadeLocalId as any)
      if (localUnit && Array.isArray(localUnit.fotos_unidade)) {
        const localKeys = new Set(localUnit.fotos_unidade.map(keyOf).filter(Boolean))
        // Também devemos manter fotos que estão no db.fotos_local (sincronizando agora)
        const localPendentes = await db.fotos_local.where('unidadeLocalId').equals(unidadeLocalId as any).toArray()
        for (const f of localPendentes) {
          if (f.storagePath) localKeys.add(`fotos_fiscalizacao:${f.storagePath}`)
        }

        for (const k of byKey.keys()) {
          if (!localKeys.has(k)) {
            byKey.delete(k)
          }
        }
      }

      const desiredKeys: string[] = []
      if (localUnit && Array.isArray(localUnit.fotos_unidade)) {
        for (const x of localUnit.fotos_unidade as any[]) {
          const u = typeof x?.url === 'string' ? String(x.url) : ''
          if (u && isLocalUrl(u)) continue
          const k = keyOf(x)
          if (k) desiredKeys.push(k)
        }
      }
      if (desiredKeys.length === 0) {
        for (const x of fotosRemotas) {
          const k = keyOf(x)
          if (k) desiredKeys.push(k)
        }
      }

      const merged: any[] = []
      for (const k of desiredKeys) {
        const v = byKey.get(k)
        if (!v) continue
        merged.push(v)
        byKey.delete(k)
      }
      for (const v of byKey.values()) merged.push(v)
      const { error } = await supabase
        .from('unidades_fiscalizadas')
        .update({ fotos_unidade: merged, updated_at: now() })
        .eq('id', unidadeId as any)
      
      if (error) throw error
      return []
    }
    if (entity === 'finalizacao_fiscalizacao') {
      const fiscalizacaoLocalId = payload?.id || payload?.fiscalizacao_id
      const fiscalizacaoId = await resolveId('fiscalizacoes', fiscalizacaoLocalId)
      const { data: result, error } = await supabase.rpc('finalizar_fiscalizacao', { p_fiscalizacao_id: fiscalizacaoId })
      if (error) throw error
      if (result && typeof result === 'object' && (result as any).success === false) {
        throw new Error(String((result as any).error || 'Falha ao finalizar fiscalização'))
      }
      // Atualiza localmente status para finalizada; numero_termo virá pelo syncDown
      const map = await db.id_map.filter((m) => m.server_id === fiscalizacaoId && m.entity === 'fiscalizacoes').first()
      const localId = map?.local_id || fiscalizacaoLocalId
      const local = await db.fiscalizacoes.get(localId as UUID)
      if (local) {
        await db.fiscalizacoes.update(localId as UUID, { ...local, status: 'finalizada', updated_at: now() })
      }
      return []
    }
    if (entity === 'reabrir_fiscalizacao' || type === 'reopen') {
      const fiscalizacaoLocalId = payload?.id || payload?.fiscalizacao_id
      const fiscalizacaoId = await resolveId('fiscalizacoes', fiscalizacaoLocalId)
      const { data: result, error } = await supabase.rpc('reabrir_fiscalizacao', { p_fiscalizacao_id: fiscalizacaoId })
      if (error) throw error
      if (result && typeof result === 'object' && (result as any).success === false) {
        throw new Error(String((result as any).error || 'Falha ao reabrir fiscalização'))
      }
      // Atualiza localmente status para em_andamento
      const map = await db.id_map.filter((m) => m.server_id === fiscalizacaoId && m.entity === 'fiscalizacoes').first()
      const localId = map?.local_id || fiscalizacaoLocalId
      const local = await db.fiscalizacoes.get(localId as UUID)
      if (local) {
        await db.fiscalizacoes.update(localId as UUID, { ...local, status: 'em_andamento', updated_at: now() })
      }
      return []
    }
    if (entity === 'finalizacao_unidade') {
      const unidadeLocalId = payload?.id || payload?.unidade_fiscalizada_id
      const unidadeId = await resolveId('unidades', unidadeLocalId)
      const updateBody = { status: 'finalizada', updated_at: now() }
      const { error } = await supabase.from(table).update(updateBody).eq('id', unidadeId)
      if (error) throw error
      return []
    }
    if (entity === 'respostas') {
      const isUuid = (v: unknown) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v || ''))
      let localResp: any = null
      try {
        if (payload?.id) {
          localResp = await db.respostas.get(payload.id as any)
        }
        if (!localResp && payload?.unidade_fiscalizada_id && payload?.item_checklist_id) {
          localResp = await db.respostas
            .where('unidade_fiscalizada_id')
            .equals(payload.unidade_fiscalizada_id as any)
            .and((r: any) => String(r?.item_checklist_id || '') === String(payload.item_checklist_id))
            .first()
        }
      } catch {}

      const mergedPayload: any = {
        ...(payload || {}),
        ...(localResp || {})
      }
      if (mergedPayload?.pergunta === null || mergedPayload?.pergunta === undefined) mergedPayload.pergunta = ''
      if (mergedPayload?.observacao === null || mergedPayload?.observacao === undefined) mergedPayload.observacao = ''
      if (mergedPayload?.gera_nc === null || mergedPayload?.gera_nc === undefined) mergedPayload.gera_nc = false

      const unidadeLocalId = payload?.unidade_fiscalizada_id
      const unidadeId = await ensureUnidadeServerId(unidadeLocalId)
      if (!unidadeId) throw new Error('Resposta inválida: unidade_fiscalizada_id ausente.')
      const itemLocalId = payload?.item_checklist_id
      const itemId = itemLocalId ? await resolveId('itens_checklist', itemLocalId) : undefined
      const normalizedItemId = isUuid(itemId) ? itemId : undefined

      let serverExistingId: string | undefined
      if (unidadeId && normalizedItemId) {
        try {
          const { data: existing } = await supabase
            .from('respostas_checklist')
            .select('id,updated_at,created_at')
            .eq('unidade_fiscalizada_id', unidadeId as any)
            .eq('item_checklist_id', normalizedItemId as any)
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (existing?.id) serverExistingId = existing.id
        } catch {}
      }

      const mapped = {
        ...(mergedPayload || {}),
        id: serverExistingId || mergedPayload?.id,
        unidade_fiscalizada_id: unidadeId,
        item_checklist_id: normalizedItemId
      }

      const safe = serializePayload(entity, type, mapped)
      const parseMissingColumn = (err: any): string | null => {
        const m = String(err?.message || '')
        const m1 = m.match(/column\s+"([^"]+)"\s+of\s+relation\s+"[^"]+"\s+does\s+not\s+exist/i)
        if (m1?.[1]) return m1[1]
        const m2 = m.match(/column\s+"([^"]+)"\s+does\s+not\s+exist/i)
        if (m2?.[1]) return m2[1]
        const m3 = m.match(/Could not find the '([^']+)' column of '[^']+' in the schema cache/i)
        if (m3?.[1]) return m3[1]
        return null
      }

      let attemptPayload: any = { ...(safe as any) }
      for (let i = 0; i < 6; i++) {
        const { data, error } = await supabase.from('respostas_checklist').upsert(attemptPayload, { onConflict: 'id' }).select()
        if (!error) return data || []
        const col = parseMissingColumn(error)
        if (!col) throw error
        delete attemptPayload[col]
      }

      const { data, error } = await supabase.from('respostas_checklist').upsert(attemptPayload, { onConflict: 'id' }).select()
      if (error) throw error
      return data || []
    }
    if (type === 'delete') {
      const deleteId = await resolveId(entity, payload?.id)
      const { error } = await supabase.from(table).delete().eq('id', deleteId)
      if (error) throw error
      return []
    }
    // insert/update via upsert
    const mergeDefined = (base: any, patch: any) => {
      const out: any = { ...(base || {}) }
      for (const [k, v] of Object.entries(patch || {})) {
        if (v !== undefined) out[k] = v
      }
      return out
    }

    let mapped: any = { ...payload }
    if (entity === 'constatacoes_manuais' && payload?.id) {
      try {
        const local = await db.constatacoes_manuais.get(payload.id as any)
        if (local) mapped = mergeDefined(payload, local as any)
      } catch {}
      if (mapped?.descricao === null || mapped?.descricao === undefined || String(mapped?.descricao || '').trim() === '') {
        throw new Error('Constatação manual inválida: descrição vazia.')
      }
    }
    if (entity === 'recomendacoes' && payload?.id) {
      try {
        const local = await db.recomendacoes.get(payload.id as any)
        if (local) mapped = mergeDefined(payload, local as any)
      } catch {}
    }
    if (entity === 'determinacoes' && payload?.id) {
      try {
        const local = await (db as any).determinacoes.get(payload.id as any)
        if (local) mapped = mergeDefined(payload, local as any)
      } catch {}
    }
    if (entity === 'unidades') {
      mapped.fiscalizacao_id = await resolveId('fiscalizacoes', payload?.fiscalizacao_id)
      mapped.tipo_unidade_id = await resolveId('tipos_unidade', payload?.tipo_unidade_id)
      if (mapped.tipo_unidade_id === 'dtr-occurrence-dummy-uuid') {
        mapped.tipo_unidade_id = null
      }
      const codigo = String(mapped?.codigo_unidade || '').trim()
      if (type === 'insert' && codigo && mapped?.fiscalizacao_id) {
        try {
          const { data: existing } = await supabase
            .from('unidades_fiscalizadas')
            .select('id,updated_at,created_at')
            .eq('fiscalizacao_id', mapped.fiscalizacao_id as any)
            .eq('codigo_unidade', codigo)
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (existing?.id) {
            const localId = payload?.id as any
            mapped.id = existing.id
            if (localId && String(localId) !== String(existing.id)) {
              await db.id_map.put({ entity: 'unidades', local_id: localId, server_id: existing.id } as any)
            }
          }
        } catch {}
      }
    }
    if (entity === 'constatacoes_manuais' || entity === 'recomendacoes' || entity === 'determinacoes') {
      mapped.unidade_fiscalizada_id = await ensureUnidadeServerId(payload?.unidade_fiscalizada_id)
    }
    if (entity === 'recomendacoes') {
      const raw = mapped?.numero_recomendacao
      if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
        mapped.numero_recomendacao = null
      } else {
        const digits = String(raw).replace(/[^\d]/g, '')
        const n = parseInt(digits, 10)
        mapped.numero_recomendacao = Number.isFinite(n) ? `R${n}` : null
      }
    }
    if (entity === 'determinacoes') {
      const raw = mapped?.numero_determinacao
      if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
        mapped.numero_determinacao = null
      } else {
        const digits = String(raw).replace(/[^\d]/g, '')
        const n = parseInt(digits, 10)
        mapped.numero_determinacao = Number.isFinite(n) ? `D${n}` : null
      }
      if (mapped?.origem === undefined) mapped.origem = payload?.origem
    }
    if (entity === 'itens_checklist') {
      mapped.tipo_unidade_id = await resolveId('tipos_unidade', payload?.tipo_unidade_id)
    }
    if (entity === 'fiscalizacoes') {
      mapped.prestador_servico_id = await resolveId('prestadores', payload?.prestador_servico_id)
      const arr = Array.isArray(payload?.servicos)
        ? payload?.servicos
        : typeof payload?.servico === 'string'
        ? payload.servico.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []
      mapped.servicos = arr
      delete (mapped as any).servico
    }
    if (entity === 'recomendacoes' && mapped?.unidade_fiscalizada_id && mapped?.numero_recomendacao) {
      try {
        const { data: existing } = await supabase
          .from('recomendacoes')
          .select('id,updated_at,created_at')
          .eq('unidade_fiscalizada_id', mapped.unidade_fiscalizada_id as any)
          .eq('numero_recomendacao', mapped.numero_recomendacao as any)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (existing?.id) {
          const localId = payload?.id as any
          mapped.id = existing.id
          if (localId && String(localId) !== String(existing.id)) {
            await db.id_map.put({ entity: 'recomendacoes', local_id: localId, server_id: existing.id } as any)
          }
        }
      } catch {}
    }
    if (entity === 'determinacoes' && mapped?.unidade_fiscalizada_id && String(mapped?.origem || '').trim() !== '') {
      try {
        const { data: existing } = await supabase
          .from('determinacoes')
          .select('id,created_at')
          .eq('unidade_fiscalizada_id', mapped.unidade_fiscalizada_id as any)
          .eq('origem', String(mapped.origem).trim() as any)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (existing?.id) {
          const localId = payload?.id as any
          mapped.id = existing.id
          if (localId && String(localId) !== String(existing.id)) {
            await db.id_map.put({ entity: 'determinacoes', local_id: localId, server_id: existing.id } as any)
          }
        }
      } catch {}
    }
    if (!mapped.id || mapped.id === payload?.id) {
      mapped.id = await resolveId(entity, payload?.id)
    }
    const safe = serializePayload(entity, type, mapped)
    if (entity === 'constatacoes_manuais') {
      const parseMissingColumn = (err: any): string | null => {
        const m = String(err?.message || '')
        const m1 = m.match(/column\s+"([^"]+)"\s+of\s+relation\s+"[^"]+"\s+does\s+not\s+exist/i)
        if (m1?.[1]) return m1[1]
        const m2 = m.match(/column\s+"([^"]+)"\s+does\s+not\s+exist/i)
        if (m2?.[1]) return m2[1]
        const m3 = m.match(/Could not find the '([^']+)' column of '[^']+' in the schema cache/i)
        if (m3?.[1]) return m3[1]
        return null
      }

      const tryUpsertWithStripping = async () => {
        let attemptPayload: any = { ...(safe as any) }
        for (let i = 0; i < 6; i++) {
          try {
            const { data, error } = await supabase.from(table).upsert(attemptPayload, { onConflict: 'id' }).select()
            if (error) throw error
            return data || []
          } catch (err: any) {
            const col = parseMissingColumn(err)
            if (!col) throw err
            if (col === 'descricao_nc') {
              throw new Error('O Supabase está com schema desatualizado para NC manual. Execute a migration 072 (descricao_nc/updated_at em constatacoes_manuais) e sincronize novamente.')
            }
            delete attemptPayload[col]
          }
        }
        const { data, error } = await supabase.from(table).upsert(attemptPayload, { onConflict: 'id' }).select()
        if (error) throw error
        return data || []
      }

      return await tryUpsertWithStripping()
    }
    const onConflictMap: Record<Entity, string | undefined> = {
      respostas: 'unidade_fiscalizada_id,item_checklist_id',
      constatacoes_manuais: 'id',
      recomendacoes: undefined,
      determinacoes: 'id',
      fiscalizacoes: 'id',
      unidades: 'id',
      itens_checklist: 'id',
      tipos_unidade: 'id',
      fotos: undefined,
      finalizacao_unidade: undefined,
      finalizacao_fiscalizacao: undefined,
      reabrir_fiscalizacao: undefined,
      prestadores: 'id',
      contratos: 'id'
    }
    const upsertOptions: any = {}
    if (onConflictMap[entity]) {
      upsertOptions.onConflict = onConflictMap[entity]
      upsertOptions.ignoreDuplicates = false
      upsertOptions.returning = 'representation'
    }
    if (entity === 'determinacoes') {
      const parseMissingColumn = (err: any): string | null => {
        const m = String(err?.message || '')
        const m1 = m.match(/column\s+"([^"]+)"\s+of\s+relation\s+"[^"]+"\s+does\s+not\s+exist/i)
        if (m1?.[1]) return m1[1]
        const m2 = m.match(/column\s+"([^"]+)"\s+does\s+not\s+exist/i)
        if (m2?.[1]) return m2[1]
        const m3 = m.match(/Could not find the '([^']+)' column of '[^']+' in the schema cache/i)
        if (m3?.[1]) return m3[1]
        return null
      }

      let attemptPayload: any = { ...(safe as any) }
      for (let i = 0; i < 6; i++) {
        const { data, error } = await supabase.from(table).upsert(attemptPayload, { onConflict: 'id' }).select()
        if (!error) return data || []
        const col = parseMissingColumn(error)
        if (!col) throw error
        delete attemptPayload[col]
      }
      const { data, error } = await supabase.from(table).upsert(attemptPayload, { onConflict: 'id' }).select()
      if (error) throw error
      return data || []
    } else if (entity === 'unidades') {
      const parseMissingColumn = (err: any): string | null => {
        const m = String(err?.message || '')
        const m1 = m.match(/column\s+"([^"]+)"\s+of\s+relation\s+"[^"]+"\s+does\s+not\s+exist/i)
        if (m1?.[1]) return m1[1]
        const m2 = m.match(/column\s+"([^"]+)"\s+does\s+not\s+exist/i)
        if (m2?.[1]) return m2[1]
        const m3 = m.match(/Could not find the '([^']+)' column of '[^']+' in the schema cache/i)
        if (m3?.[1]) return m3[1]
        return null
      }

      let attemptPayload: any = { ...(safe as any) }
      const isUpdate = type === 'update'
      for (let i = 0; i < 6; i++) {
        const query = isUpdate
          ? supabase.from(table).update(attemptPayload).eq('id', attemptPayload.id).select()
          : supabase.from(table).upsert(attemptPayload, { onConflict: 'id' }).select()
        const { data, error } = await query
        if (!error) return data || []
        const col = parseMissingColumn(error)
        if (!col) throw error
        delete attemptPayload[col]
      }
      const query = isUpdate
        ? supabase.from(table).update(attemptPayload).eq('id', attemptPayload.id).select()
        : supabase.from(table).upsert(attemptPayload, { onConflict: 'id' }).select()
      const { data, error } = await query
      if (error) throw error
      return data || []
    } else if (entity === 'recomendacoes') {
      const parseMissingColumn = (err: any): string | null => {
        const m = String(err?.message || '')
        const m1 = m.match(/column\s+"([^"]+)"\s+of\s+relation\s+"[^"]+"\s+does\s+not\s+exist/i)
        if (m1?.[1]) return m1[1]
        const m2 = m.match(/column\s+"([^"]+)"\s+does\s+not\s+exist/i)
        if (m2?.[1]) return m2[1]
        const m3 = m.match(/Could not find the '([^']+)' column of '[^']+' in the schema cache/i)
        if (m3?.[1]) return m3[1]
        return null
      }

      let attemptPayload: any = { ...(safe as any) }
      for (let i = 0; i < 6; i++) {
        const { data, error } = await supabase.from(table).upsert(attemptPayload, { onConflict: 'id' }).select()
        if (!error) return data || []
        const msg = String((error as any)?.message || '')
        const code = String((error as any)?.code || '')
        const isDup =
          code === '23505' ||
          msg.toLowerCase().includes('duplicate key value') ||
          msg.toLowerCase().includes('recomendacoes_unidade_numero_unq')
        if (isDup && attemptPayload?.unidade_fiscalizada_id && attemptPayload?.numero_recomendacao) {
          try {
            const { data: existing } = await supabase
              .from('recomendacoes')
              .select('id,updated_at,created_at')
              .eq('unidade_fiscalizada_id', attemptPayload.unidade_fiscalizada_id as any)
              .eq('numero_recomendacao', attemptPayload.numero_recomendacao as any)
              .order('updated_at', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
            if (existing?.id) {
              const updatePayload = { ...attemptPayload }
              delete (updatePayload as any).id
              const { data: upd, error: updErr } = await supabase.from(table).update(updatePayload).eq('id', existing.id as any).select()
              if (!updErr) return upd || []
            }
          } catch {}
        }
        const col = parseMissingColumn(error)
        if (!col) throw error
        delete attemptPayload[col]
      }
      const { data, error } = await supabase.from(table).upsert(attemptPayload, { onConflict: 'id' }).select()
      if (error) throw error
      return data || []
    } else if (entity === 'tipos_unidade' || entity === 'itens_checklist') {
      if (type === 'insert') {
        try {
          const { data, error } = await supabase.from(table).insert(safe).select()
          if (error) throw error
          return data || []
        } catch (err: any) {
          const status = (err as any)?.status || (err as any)?.code
          const msg = String((err as any)?.message || '')
          const isConflict = status === 409 || msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('duplicate')
          if (!isConflict) throw err
          const { data, error } = await supabase.from(table).update(safe).eq('id', safe.id as any).select()
          if (error) throw error
          return data || []
        }
      } else {
        const { data, error } = await supabase.from(table).update(safe).eq('id', safe.id as any).select()
        if (error) throw error
        return data || []
      }
    } else {
      const { data, error } = await supabase.from(table).upsert(safe, upsertOptions).select()
      if (error) throw error
      return data || []
    }
  }
  const timeoutMs = entity === 'finalizacao_fiscalizacao' ? 60000 : 15000
  const exec = () => withTimeout(doRequest, timeoutMs)
  const data = await withBackoff(exec)
  // Atualiza id_map se servidor retornou id
  if (Array.isArray(data)) {
    for (const row of data) {
      const local_id: UUID = payload?.id as UUID
      const server_id: UUID = row?.id as UUID
      if (local_id && server_id && local_id !== server_id) {
        await db.id_map.put({ local_id, server_id, entity })
      }
    }
  }
}

export async function syncUp(onProgress?: (msg: string, isError?: boolean) => void): Promise<number> {
  const log = (msg: string, isError = false) => { if (onProgress) onProgress(msg, isError) }
  const pendingAll = await db.fila_mutacoes.where('status').equals('pending').toArray()
  
  // Coleta todas as fiscalizações que têm uma mutação de reabrir
  const reabrirFiscalizacaoIds = new Set<string>()
  for (const m of pendingAll as any[]) {
    if (m.entity === 'reabrir_fiscalizacao' || m.tipo === 'reopen') {
      const fiscId = String(m.payload?.id || m.payload?.fiscalizacao_id || '')
      if (fiscId) {
        reabrirFiscalizacaoIds.add(fiscId)
      }
    }
  }
  
  const mutationPriority = (entity: Entity, tipo: MutationType): number => {
    if (entity === 'recomendacoes') {
      if (tipo === 'delete') return 0
      if (tipo === 'update') return 1
      if (tipo === 'insert') return 2
      return 3
    }
    if (tipo === 'delete') return 0
    if (tipo === 'insert') return 1
    if (tipo === 'update') return 2
    return 3
  }
  
  // Precisamos carregar as unidades para verificar quais pertencem a fiscalizações reabertas
  const unidades = await db.unidades.toArray()
  const unidadeToFiscalizacao = new Map<string, string>()
  for (const u of unidades) {
    unidadeToFiscalizacao.set(String(u.id), String(u.fiscalizacao_id))
  }
  
  const mutationsToDelete: any[] = []
  const sorted = pendingAll
    .slice()
    .filter((m: any) => {
      // Se é finalizacao_unidade ou finalizacao_fiscalizacao e a fiscalização tem uma reabrir, pula e marca para deletar
      if (m.entity === 'finalizacao_fiscalizacao') {
        const fiscId = String(m.payload?.id || m.payload?.fiscalizacao_id || '')
        if (reabrirFiscalizacaoIds.has(fiscId)) {
          mutationsToDelete.push(m.id)
          return false
        }
      }
      if (m.entity === 'finalizacao_unidade') {
        const unidadeId = String(m.payload?.id || m.payload?.unidade_fiscalizada_id || '')
        const fiscId = unidadeToFiscalizacao.get(unidadeId)
        if (fiscId && reabrirFiscalizacaoIds.has(fiscId)) {
          mutationsToDelete.push(m.id)
          return false
        }
      }
      return true
    })
    .sort((a, b) => {
      const ai = orderForSyncUp.indexOf(a.entity as Entity)
      const bi = orderForSyncUp.indexOf(b.entity as Entity)
      if (ai !== bi) return ai - bi
      const ap = mutationPriority(a.entity as Entity, a.tipo as MutationType)
      const bp = mutationPriority(b.entity as Entity, b.tipo as MutationType)
      if (ap !== bp) return ap - bp
      const at = a.created_at || ''
      const bt = b.created_at || ''
      return at.localeCompare(bt)
    })
  
  // Deleta as mutações de finalização que foram puladas
  if (mutationsToDelete.length > 0) {
    await db.fila_mutacoes.bulkDelete(mutationsToDelete)
  }
  let processed = 0
  const groupByEntity: Record<Entity, typeof sorted> = {} as any
  for (const m of sorted) {
    const k = m.entity as Entity
    const arr = groupByEntity[k] || []
    arr.push(m)
    groupByEntity[k] = arr
  }
  const limit = 50
  const runBatch = async (items: typeof sorted, entity: Entity, entityName: string) => {
    const processOne = async (m: any) => {
      try {
        await pushOne(m.entity as Entity, m.tipo as MutationType, m.payload)
        await db.fila_mutacoes.update(m.id, { status: 'done', lastError: '', nextRetryAt: undefined })
        const localId = m.payload?.id
        if (localId && (m.entity === 'fiscalizacoes' || m.entity === 'unidades')) {
          await db.pending_entities.delete(`${m.entity}:${localId}` as any)
        }
        processed++
      } catch (err: any) {
        const attempts = (m as any).attempts ? Number((m as any).attempts) + 1 : 1
        const retryable = isRetryableError(err)
        const nextRetryAt = computeNextRetryAt(attempts, retryable)
        const msg = errorInfo(err).message
        await db.fila_mutacoes.update(m.id, { status: 'error', attempts, lastError: msg, nextRetryAt })
      }
    }
    for (let i = 0; i < items.length; i += limit) {
      log(`Enviando ${entityName} (${Math.min(i + limit, items.length)} de ${items.length})...`)
      const chunk = items.slice(i, i + limit)
      if (entity === 'recomendacoes' || entity === 'reabrir_fiscalizacao' || entity === 'finalizacao_unidade' || entity === 'finalizacao_fiscalizacao') {
        for (const m of chunk) await processOne(m)
      } else {
        await Promise.all(chunk.map(processOne))
      }
    }
  }
  const syncRecomendacoesSnapshot = async (items: typeof sorted) => {
    const byUnidade = new Map<string, any[]>()
    const orphans: any[] = []
    for (const m of items) {
      const p = m?.payload || {}
      const uid = String(p?.unidade_fiscalizada_id || '').trim()
      if (uid) {
        const arr = byUnidade.get(uid) || []
        arr.push(m)
        byUnidade.set(uid, arr)
        continue
      }
      const rid = String(p?.id || '').trim()
      if (rid) {
        const local = await db.recomendacoes.get(rid as any)
        const luid = String((local as any)?.unidade_fiscalizada_id || '').trim()
        if (luid) {
          const arr = byUnidade.get(luid) || []
          arr.push(m)
          byUnidade.set(luid, arr)
          continue
        }
      }
      orphans.push(m)
    }

    const parseR = (v: any) => {
      const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : 999999
    }

    const ensureUnidadeServerIdForSnapshot = async (unidadeLocalId: string): Promise<string> => {
      const local = String(unidadeLocalId || '').trim()
      if (!local) throw new Error('unidade_fiscalizada_id ausente')
      const map = await db.id_map.where('local_id').equals(local as any).and((m) => m.entity === 'unidades').first()
      const candidate = String((map as any)?.server_id || local)
      if (candidate && candidate !== local) return candidate
      try {
        const { data: exists } = await supabase.from('unidades_fiscalizadas').select('id').eq('id', candidate as any).maybeSingle()
        if ((exists as any)?.id) return candidate
      } catch {}
      const unidadeLocal = await db.unidades.get(local as any)
      if (!unidadeLocal) return candidate
      await pushOne('unidades', 'insert', { ...unidadeLocal })
      const map2 = await db.id_map.where('local_id').equals(local as any).and((m) => m.entity === 'unidades').first()
      return String((map2 as any)?.server_id || candidate)
    }

    const setErr = async (m: any, err: any) => {
      const attempts = (m as any).attempts ? Number((m as any).attempts) + 1 : 1
      const retryable = isRetryableError(err)
      const nextRetryAt = computeNextRetryAt(attempts, retryable)
      const msg = errorInfo(err).message
      await db.fila_mutacoes.update(m.id, { status: 'error', attempts, lastError: msg, nextRetryAt })
    }

    for (const [unidadeLocalId, muts] of byUnidade.entries()) {
      log(`Sincronizando recomendações da unidade...`)
      try {
        const unidadeServerId = await ensureUnidadeServerIdForSnapshot(unidadeLocalId)
        const localList = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeLocalId as any).toArray()
        const ordered = (localList || [])
          .filter((r: any) => String(r?.descricao || '').trim() !== '')
          .slice()
          .sort((a: any, b: any) => parseR(a?.numero_recomendacao) - parseR(b?.numero_recomendacao) || String(a?.id || '').localeCompare(String(b?.id || '')))

        const payload = ordered.map((r: any, idx: number) => ({
          id: String(r.id),
          unidade_fiscalizada_id: unidadeServerId,
          numero_recomendacao: `R${idx + 1}`,
          descricao: String(r.descricao || ''),
          origem: String(r.origem || 'manual'),
          updated_at: String(r.updated_at || r.created_at || now())
        }))

        const { error: delErr } = await supabase.from('recomendacoes').delete().eq('unidade_fiscalizada_id', unidadeServerId as any)
        if (delErr) throw delErr
        if (payload.length > 0) {
          const { error: insErr } = await supabase.from('recomendacoes').insert(payload as any).select()
          if (insErr) throw insErr
        }

        for (const r of ordered) {
          const id = String((r as any)?.id || '')
          if (id) await db.id_map.put({ entity: 'recomendacoes', local_id: id as any, server_id: id as any } as any)
        }

        for (const m of muts) {
          await db.fila_mutacoes.update(m.id, { status: 'done', lastError: '', nextRetryAt: undefined })
          processed++
        }
      } catch (err: any) {
        for (const m of muts) await setErr(m, err)
      }
    }

    for (const m of orphans) {
      try {
        await pushOne(m.entity as Entity, m.tipo as MutationType, m.payload)
        await db.fila_mutacoes.update(m.id, { status: 'done', lastError: '', nextRetryAt: undefined })
        processed++
      } catch (err: any) {
        await setErr(m, err)
      }
    }
  }
  for (const entity of orderForSyncUp) {
    const items = groupByEntity[entity] || []
    if (items.length > 0) {
      if (entity === 'recomendacoes') {
        await syncRecomendacoesSnapshot(items)
      } else {
        await runBatch(items, entity, entity)
      }
    }
    if (entity === 'fiscalizacoes') {
      try {
        await repairMappedFiscalizacoesOnServer()
      } catch (err: any) {
        log(`Falha ao reparar vínculos de unidades: ${errorInfo(err).message}`, true)
      }
    }
  }
  log('Sincronizando fotos...')
  await syncFotosWithProgress((uploaded, total) => {
    log(`Sincronizando Fotos - ${uploaded}/${total}`)
  })
  const pending = await getOutboxCount()
  await db.estados_sync.put({
    id: 'global' as UUID,
    entidade: 'global',
    updated_at: now(),
    pending_count: pending
  })
  return processed
}

function selectColsForPull(entity: Entity): string {
  switch (entity) {
    case 'fiscalizacoes':
      return 'id,municipio_id,municipio_nome,prestador_servico_id,prestador_servico_nome,fiscal_nome,fiscal_email,data_inicio,data_fim,latitude_inicio,longitude_inicio,status,servicos,numero_termo,last_modified_by,last_modified_at,created_at,updated_at,tipo_modulo,rodovia'
    case 'unidades':
      return 'id,fiscalizacao_id,tipo_unidade_id,tipo_unidade_nome,nome_unidade,codigo_unidade,endereco,coordenadas,latitude,longitude,ordem,status,total_constatacoes,total_ncs,fotos_unidade,data_hora_vistoria,created_at,updated_at,rodovia,trecho,km,tipo_ocorrencia,gravidade,sentido,per,frente,nao_atendimento,prazo_dias_nc,gps_accuracy_m,km_impreciso'
    case 'respostas':
      return '*'
    case 'constatacoes_manuais':
      return '*'
    case 'prestadores':
      return '*'
    case 'contratos':
      return '*'
    default:
      return '*'
  }
}

async function pullEntity(entity: Entity, since?: string) {
  const table = entityTableMap[entity]
  const prefer = selectColsForPull(entity)
  const isLocalUrl = (u: string) => /^blob:|^data:|^file:/i.test(String(u || ''))
  const keyOfFoto = (x: any): string => {
    const lid = typeof x?.localId === 'string' ? x.localId.trim() : ''
    if (lid) return `localId:${lid}`
    const b = typeof x?.bucket === 'string' ? x.bucket : ''
    const p = typeof x?.path === 'string' ? x.path : ''
    if (b && p) return `${b}:${p}`
    const u = typeof x?.url === 'string' ? x.url : ''
    return u ? String(u) : ''
  }

  // Pre-load all ID maps once into a Map for O(1) lookups
  const maps = await db.id_map.toArray()
  const serverToLocal = new Map<string, string>()
  for (const m of maps) {
    if (m.server_id && m.local_id) {
      serverToLocal.set(`${m.entity}:${m.server_id}`, m.local_id)
    }
  }

  // Pre-load local records to avoid IndexedDB queries inside the loops
  let localUnidadesMap = new Map()
  if (entity === 'unidades') {
    const localUnidades = await db.unidades.toArray()
    localUnidadesMap = new Map(localUnidades.map(u => [u.id, u]))
  }

  let localItemsMap = new Map()
  if (entity === 'determinacoes' || entity === 'recomendacoes') {
    const dbTable = (entity === 'determinacoes') ? (db as any).determinacoes : db.recomendacoes
    const allLocal = await dbTable.toArray()
    for (const item of allLocal) {
      if (item.unidade_fiscalizada_id && item.origem) {
        const key = `${item.unidade_fiscalizada_id}:${String(item.origem).trim()}`
        localItemsMap.set(key, item)
      }
    }
  }

  const idsToDelete: any[] = []
  const idMapPuts: any[] = []

  const normalizeRows = (rawRows: any[]) => {
    const normalizedRows: any[] = []
    for (const row of rawRows) {
      const server_id = row.id as UUID
      const local_id = serverToLocal.get(`${entity}:${server_id}`) || server_id
      const normalized: any = { ...row, id: local_id }

      // Map foreign keys using cache
      if (entity === 'unidades' && normalized?.fiscalizacao_id) {
        const fkLocalId = serverToLocal.get(`fiscalizacoes:${normalized.fiscalizacao_id}`)
        if (fkLocalId) normalized.fiscalizacao_id = fkLocalId
      }
      if ((entity === 'respostas' || entity === 'constatacoes_manuais' || entity === 'recomendacoes' || entity === 'determinacoes') && normalized?.unidade_fiscalizada_id) {
        const fkLocalId = serverToLocal.get(`unidades:${normalized.unidade_fiscalizada_id}`)
        if (fkLocalId) normalized.unidade_fiscalizada_id = fkLocalId
      }

      // Deduplicate recommendations/determinations with same origin
      if ((entity === 'determinacoes' || entity === 'recomendacoes') && normalized.unidade_fiscalizada_id && normalized.origem) {
        const key = `${normalized.unidade_fiscalizada_id}:${String(normalized.origem).trim()}`
        const existingLocal = localItemsMap.get(key)
        if (existingLocal) {
          if (existingLocal.id !== normalized.id) {
            idsToDelete.push(existingLocal.id)
            idMapPuts.push({ entity, local_id: existingLocal.id, server_id: server_id })
            serverToLocal.set(`${entity}:${server_id}`, existingLocal.id)
            normalized.id = existingLocal.id
          }
        }
      }

      // Merge local unit photos if needed
      if (entity === 'unidades') {
        try {
          const existingLocal = localUnidadesMap.get(local_id)
          if (existingLocal && Array.isArray(existingLocal.fotos_unidade) && Array.isArray((normalized as any).fotos_unidade)) {
            const hasLocal = (existingLocal.fotos_unidade as any[]).some((f) => isLocalUrl(String(f?.url || '')))
            if (hasLocal) {
              const serverFotos = (normalized as any).fotos_unidade as any[]
              const serverByKey = new Map<string, any>()
              for (const sf of serverFotos) {
                const k = keyOfFoto(sf)
                if (k) serverByKey.set(k, sf)
              }
              const used = new Set<string>()
              const mergedLocal: any[] = []
              for (const lf of existingLocal.fotos_unidade as any[]) {
                const u = String(lf?.url || '')
                const k = keyOfFoto(lf)
                if (k && serverByKey.has(k)) {
                  mergedLocal.push({ ...lf, ...serverByKey.get(k) })
                  used.add(k)
                } else if (u && isLocalUrl(u)) {
                  mergedLocal.push(lf)
                } else {
                  mergedLocal.push(lf)
                }
              }
              for (const sf of serverFotos) {
                const k = keyOfFoto(sf)
                if (!k || used.has(k)) continue
                mergedLocal.push(sf)
              }
              ;(normalized as any).fotos_unidade = mergedLocal
            }
          }
        } catch {}
      }

      if (entity !== 'fotos') {
        normalizedRows.push(normalized)
      }
    }
    return normalizedRows
  }

  const doWrite = async (normalizedRows: any[]) => {
    if (idsToDelete.length > 0) {
      const dbTable = (entity === 'determinacoes') ? (db as any).determinacoes : db.recomendacoes
      await dbTable.bulkDelete(idsToDelete)
    }
    if (idMapPuts.length > 0) {
      await db.id_map.bulkPut(idMapPuts)
    }

    if (normalizedRows.length > 0) {
      switch (entity) {
        case 'fiscalizacoes':
          await db.fiscalizacoes.bulkPut(normalizedRows)
          break
        case 'unidades':
          await db.unidades.bulkPut(normalizedRows)
          break
        case 'respostas':
          await db.respostas.bulkPut(normalizedRows)
          break
        case 'constatacoes_manuais':
          await db.constatacoes_manuais.bulkPut(normalizedRows)
          break
        case 'determinacoes':
          await (db as any).determinacoes.bulkPut(normalizedRows)
          break
        case 'prestadores':
          await db.prestadores.bulkPut(normalizedRows)
          break
        case 'contratos': {
          const enrichedRows = [...normalizedRows]
          for (const c of enrichedRows) {
            if (c.kml_url) {
              try {
                // Parse storage URL sem importar a classe Repository para evitar dependência circular
                let parsed = null
                const url = c.kml_url
                if (typeof url === 'string' && url.startsWith('storage://')) {
                  const remainder = url.slice('storage://'.length)
                  const slash = remainder.indexOf('/')
                  if (slash !== -1) {
                    const bucket = remainder.slice(0, slash)
                    const path = remainder.slice(slash + 1)
                    parsed = { bucket, path }
                  }
                }
                
                if (parsed) {
                  const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path)
                  if (!error && data) {
                    const text = await data.text()
                    const pts = parseKMLKmPoints(text)
                    if (pts && pts.length > 0) {
                      c.km_points = pts
                    }
                  }
                }
              } catch (err) {
                console.error('[Sync KML Contrato]', c.id, err)
              }
            }
          }
          await db.contratos.bulkPut(enrichedRows)
          break
        }
      }
    }
  }

  if (!since) {
    const rows = await withBackoff(() => withTimeout(() => safeSelect(table, prefer), 15000))
    const normalizedRows = normalizeRows(rows)
    await doWrite(normalizedRows)
    return
  }

  const doRequest = async () => {
    const run = async (cols: string, mode: 'since' | 'created', v?: string, strategy: 'updated' | 'or' = 'updated') => {
      let q = supabase.from(table).select(cols)
      if (mode === 'since' && v) {
        q = strategy === 'or' ? q.or(`updated_at.gte.${v},created_at.gte.${v}`) : q.gte('updated_at', v)
      }
      if (mode === 'created' && v) q = q.gte('created_at', v)
      return await selectAllPages(q)
    }
    try {
      try {
        try {
          return await run(prefer, 'since', since, 'updated')
        } catch {
          return await run(prefer, 'since', since, 'or')
        }
      } catch {
        try {
          return await run('*', 'since', since, 'updated')
        } catch {
          return await run('*', 'since', since, 'or')
        }
      }
    } catch (err: any) {
      if (since) {
        try {
          return await run(prefer, 'created', since)
        } catch {
          return await run('*', 'created', since)
        }
      }
      throw err
    }
  }

  const rows: any[] = await withBackoff(() => withTimeout(doRequest, 15000))
  const normalizedRows = normalizeRows(rows)
  await doWrite(normalizedRows)
}

async function pullRecomendacoes(since?: string) {
  // Pre-load all ID maps once into a Map for O(1) lookups
  const maps = await db.id_map.toArray()
  const serverToLocal = new Map<string, string>()
  for (const m of maps) {
    if (m.server_id && m.local_id) {
      serverToLocal.set(`${m.entity}:${m.server_id}`, m.local_id)
    }
  }

  await withBackoff(() => withTimeout(async () => {
    try {
      const data = await safeSelectSince('recomendacoes', '*', since)
      if (Array.isArray(data)) {
        const normalizedRows = []
        for (const row of data) {
          const server_id = (row as any).id as UUID
          const local_id = serverToLocal.get(`recomendacoes:${server_id}`) || server_id
          const normalized: any = { ...row, id: local_id }
          if (normalized.unidade_fiscalizada_id) {
            const fkLocalId = serverToLocal.get(`unidades:${normalized.unidade_fiscalizada_id}`)
            if (fkLocalId) {
              normalized.unidade_fiscalizada_id = fkLocalId
            }
          }
          normalizedRows.push(normalized)
        }
        if (normalizedRows.length > 0) {
          await db.recomendacoes.bulkPut(normalizedRows)
        }
      }
    } catch (error: any) {
      const status = (error as any)?.status
      if (status === 400) return
      throw error
    }
  }, 15000))
}

async function repairMappedFiscalizacoesOnServer(): Promise<void> {
  const maps = await db.id_map.where('entity').equals('fiscalizacoes').toArray()
  const pairs = maps.filter((m) => m?.local_id && m?.server_id && m.local_id !== m.server_id)
  for (const m of pairs) {
    const { error } = await supabase
      .from('unidades_fiscalizadas')
      .update({ fiscalizacao_id: m.server_id as any, updated_at: now() })
      .eq('fiscalizacao_id', m.local_id as any)
    if (error) throw error
  }
}

async function pullFiscalizacaoById(fiscalizacaoId: string): Promise<void> {
  const cols = selectColsForPull('fiscalizacoes')
  const mapsArr = await db.id_map.where('entity').equals('fiscalizacoes').toArray()
  const serverToLocal = new Map<string, string>()
  const localToServer = new Map<string, string>()
  for (const m of mapsArr) {
    if (m.server_id && m.local_id) {
      serverToLocal.set(String(m.server_id), String(m.local_id))
      localToServer.set(String(m.local_id), String(m.server_id))
    }
  }
  const serverId = localToServer.get(fiscalizacaoId) || fiscalizacaoId
  const row = await withBackoff(() =>
    withTimeout(async () => {
      const { data, error } = await supabase
        .from('fiscalizacoes')
        .select(cols)
        .eq('id', serverId as any)
        .maybeSingle()
      if (error) throw error
      return data
    }, 15000)
  )
  if (row) {
    const local_id = serverToLocal.get(String((row as any).id)) || String((row as any).id)
    await db.fiscalizacoes.put({ ...(row as any), id: local_id })
  }
}

export async function syncDown(onProgress?: (msg: string, isError?: boolean) => void): Promise<void> {
  const log = (msg: string, isError = false) => { if (onProgress) onProgress(msg, isError) }
  const st = await db.estados_sync.get('global' as UUID)
  let since = st?.last_sync_at
  if (since) {
    // Subtrai 24 horas do last_sync_at para evitar perda de dados por clock skew (diferença de relógio entre dispositivos)
    const d = new Date(since)
    d.setHours(d.getHours() - 24)
    since = d.toISOString()

    const [fCount, uCount] = await Promise.all([db.fiscalizacoes.count(), db.unidades.count()])
    if ((fCount || 0) === 0 && (uCount || 0) === 0) since = undefined
  }
  log('Baixando dados base e tabelas de suporte...')
  // baixa diffs de todas as entidades em paralelo
  await Promise.all([
    pullEntity('fiscalizacoes', since),
    pullEntity('unidades', since),
    pullEntity('respostas', since),
    pullEntity('constatacoes_manuais', since),
    pullEntity('determinacoes', since),
    pullEntity('prestadores', since),
    pullEntity('contratos', since),
    pullRecomendacoes(since),
    withBackoff(() => withTimeout(async () => {
      const data = await safeSelectSince('municipios', 'id, nome', since)
      if (Array.isArray(data) && data.length > 0) {
        await db.municipios.bulkPut(data)
      }
    }, 15000)),
    withBackoff(() => withTimeout(async () => {
      const data = await safeSelectSince('tipos_unidade', 'id, nome, codigo, servicos_aplicaveis, ativo, created_at', undefined, 'or')
      if (Array.isArray(data) && data.length > 0) {
        await db.tipos_unidade.bulkPut(data)
      }
    }, 15000)),
    withBackoff(() => withTimeout(async () => {
      const data = await safeSelectSince('itens_checklist', '*', undefined, 'or')
      if (Array.isArray(data) && data.length > 0) {
        await db.itens_checklist.bulkPut(data)
      }
    }, 15000))
  ])

  log('Atualizando municípios locais...')
  const [fiscAll, munAll] = await Promise.all([
    db.fiscalizacoes.toArray(),
    db.municipios.toArray()
  ])
  const munMap = new Map(munAll.map(m => [m.id, m]))
  const fiscUpdates = []
  for (const f of fiscAll) {
    if (!f.municipio_nome && f.municipio_id) {
      const m = munMap.get(f.municipio_id)
      if (m?.nome) {
        f.municipio_nome = m.nome
        fiscUpdates.push(f)
      }
    }
  }
  if (fiscUpdates.length > 0) {
    await db.fiscalizacoes.bulkPut(fiscUpdates)
  }

  await db.estados_sync.put({
    id: 'global' as UUID,
    entidade: 'global',
    updated_at: now(),
    last_sync_at: now()
  })
}

async function hardResetLocalData(): Promise<void> {
  await db.transaction('rw', [db.municipios, db.prestadores, db.contratos, db.tipos_unidade, db.fiscalizacoes], async () => {
    await db.municipios.clear()
    await db.prestadores.clear()
    await db.contratos.clear()
    await db.tipos_unidade.clear()
    await db.fiscalizacoes.clear()
  })
  await db.transaction('rw', db.unidades, db.itens_checklist, db.respostas, db.constatacoes_manuais, async () => {
    await db.unidades.clear()
    await db.itens_checklist.clear()
    await db.respostas.clear()
    await db.constatacoes_manuais.clear()
  })
  await db.transaction('rw', [db.recomendacoes, (db as any).determinacoes, db.fotos, db.fotos_local, db.id_map], async () => {
    await db.recomendacoes.clear()
    await (db as any).determinacoes.clear()
    await db.fotos.clear()
    await db.fotos_local.clear()
    await db.id_map.clear()
  })
  await db.transaction('rw', db.pending_entities, async () => {
    await db.pending_entities.clear()
  })
  await db.transaction('rw', db.fila_mutacoes, db.estados_sync, async () => {
    await db.fila_mutacoes.clear()
    await db.estados_sync.clear()
  })
  clearAllPreviewUrls()
}

export type HardResetResult =
  | { ok: true }
  | { ok: false; reason: 'pending_mutations' | 'pending_fotos'; count: number }

// Última linha de defesa para suporte/admin: apaga TODOS os dados locais (equivalente
// a limpar os dados do navegador manualmente, mas sem derrubar o service worker).
// Nunca deve ser exposta direto num botão de uso rotineiro — recusa rodar se houver
// qualquer mutação pendente/com erro na fila de sincronização ou foto local ainda não
// enviada, a menos que `force: true` seja passado depois de o usuário confirmar
// explicitamente quantos itens seriam perdidos.
export async function requestHardReset(opts: { force?: boolean } = {}): Promise<HardResetResult> {
  if (!opts.force) {
    const pendingMutations = await db.fila_mutacoes.where('status').anyOf('pending', 'error').count()
    if (pendingMutations > 0) {
      return { ok: false, reason: 'pending_mutations', count: pendingMutations }
    }
    const pendingFotos = await db.fotos_local.filter((f: any) => !f?.syncedAt).count()
    if (pendingFotos > 0) {
      return { ok: false, reason: 'pending_fotos', count: pendingFotos }
    }
  }
  await hardResetLocalData()
  return { ok: true }
}

const isValidUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

export async function syncFotosWithProgress(onProgress?: (uploaded: number, total: number) => void): Promise<number> {
  const all = await db.fotos_local.toArray()
  // Fotos ainda com o placeholder 'novo-ponto' (ocorrência em edição, ainda não salva)
  // não podem ser sincronizadas: se subissem agora, a limpeza abaixo (fotos sincronizadas
  // com unidadeLocalId inválido) as apagaria antes do reassignLocalFotos rodar no Salvar,
  // perdendo a foto mesmo que o usuário confirme o salvamento depois.
  const unsynced = all.filter((f) => !f.syncedAt && isValidUuid(String(f.unidadeLocalId || '')))
  const total = unsynced.length
  let uploaded = 0
  onProgress?.(uploaded, total)
  const concurrency = 6
  let cursor = 0
  const nextItem = () => {
    const i = cursor
    cursor++
    return unsynced[i]
  }
  const worker = async () => {
    while (true) {
      const f = nextItem()
      if (!f) break
      const blob = f.blob instanceof Blob ? f.blob : typeof f.base64 === 'string' ? base64ToBlob(f.base64) : undefined
      if (!blob) {
        await db.fotos_local.update(f.localId as any, { lastError: 'Foto sem conteúdo', attempts: (f.attempts || 0) + 1 })
        continue
      }
      const path = f.storagePath || `fiscalizacoes/unknown/${f.unidadeLocalId}/${f.localId}.jpg`
      const doUpload = async () => {
        const { error } = await supabase.storage.from('fotos_fiscalizacao').upload(path, blob, {
          contentType: f.mimeType || 'image/jpeg',
          upsert: true
        })
        if (error) throw error
        await db.fotos_local.update(f.localId as any, {
          syncedAt: new Date().toISOString(),
          storagePath: path,
          lastError: ''
        })
      }
      try {
        await withBackoff(() => withTimeout(doUpload, 30000))
        uploaded++
        onProgress?.(uploaded, total)
      } catch (err: any) {
        const attempts = (f.attempts || 0) + 1
        const msg = String(err?.message || err || '')
        await db.fotos_local.update(f.localId as any, { attempts, lastError: msg })
      }
    }
  }
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, unsynced.length)) }, () => worker())
  await Promise.all(workers)

  // Upload das versões "limpas" (sem marca d'água) — passe independente do upload
  // principal acima: roda pra qualquer foto local com cleanBlob pendente, mesmo que a
  // foto principal já tenha sido sincronizada numa passada anterior (retry isolado, sem
  // bloquear nem se confundir com o attempts/lastError da versão com marca d'água).
  const cleanPending = (await db.fotos_local.toArray()).filter(
    (f) => f.cleanBlob instanceof Blob && !f.cleanSyncedAt && isValidUuid(String(f.unidadeLocalId || ''))
  )
  let cleanCursor = 0
  const nextCleanItem = () => {
    const i = cleanCursor
    cleanCursor++
    return cleanPending[i]
  }
  const cleanWorker = async () => {
    while (true) {
      const f = nextCleanItem()
      if (!f) break
      const cleanBlob = f.cleanBlob as Blob
      const cleanPath = f.cleanStoragePath || `fiscalizacoes/unknown/${f.unidadeLocalId}/${f.localId}_original.jpg`
      const doUploadClean = async () => {
        const { error } = await supabase.storage.from('fotos_fiscalizacao').upload(cleanPath, cleanBlob, {
          contentType: f.mimeType || 'image/jpeg',
          upsert: true
        })
        if (error) throw error
        await db.fotos_local.update(f.localId as any, {
          cleanSyncedAt: new Date().toISOString(),
          cleanStoragePath: cleanPath,
          cleanLastError: ''
        })
      }
      try {
        await withBackoff(() => withTimeout(doUploadClean, 30000))
      } catch (err: any) {
        const cleanAttempts = (f.cleanAttempts || 0) + 1
        const msg = String(err?.message || err || '')
        await db.fotos_local.update(f.localId as any, { cleanAttempts, cleanLastError: msg })
      }
    }
  }
  const cleanWorkers = Array.from({ length: Math.max(1, Math.min(concurrency, cleanPending.length)) }, () => cleanWorker())
  await Promise.all(cleanWorkers)

  const byUnidade: Record<string, { bucket: string; path: string; legenda?: string; localId?: string; cleanBucket?: string; cleanPath?: string }[]> = {}
  const syncedAll = await db.fotos_local.where('syncedAt').above('' as any).toArray()
  for (const f of syncedAll.filter((x) => !!x.storagePath)) {
    const list = byUnidade[f.unidadeLocalId] || []
    const entry: { bucket: string; path: string; legenda?: string; localId?: string; cleanBucket?: string; cleanPath?: string } = {
      bucket: 'fotos_fiscalizacao',
      path: f.storagePath!,
      legenda: f.legenda,
      localId: String((f as any).localId || '')
    }
    if (f.cleanSyncedAt && f.cleanStoragePath) {
      entry.cleanBucket = 'fotos_fiscalizacao'
      entry.cleanPath = f.cleanStoragePath
    }
    list.push(entry)
    byUnidade[f.unidadeLocalId] = list
  }
  const entries = Object.entries(byUnidade)
  const unitConcurrency = Math.min(3, Math.max(1, entries.length))
  let unitCursor = 0
  const nextUnit = () => {
    const i = unitCursor
    unitCursor++
    return entries[i]
  }
  const unitWorker = async () => {
    while (true) {
      const pair = nextUnit()
      if (!pair) break
      const [unidadeId, fotos_unidade] = pair
      if (!isValidUuid(unidadeId)) {
        // Placeholder ID (ex: 'novo-ponto') — limpa e ignora
        await db.fotos_local.where('unidadeLocalId').equals(unidadeId).delete()
        continue
      }
      const doUpdate = async () => {
        const map = await db.id_map.where('local_id').equals(unidadeId as any).and((m) => m.entity === 'unidades').first()
        const serverId = map?.server_id || unidadeId
        const { data: existingRow, error: existingErr } = await supabase
          .from('unidades_fiscalizadas')
          .select('id, fotos_unidade')
          .eq('id', serverId as any)
          .maybeSingle()
        if (existingErr) throw existingErr
        if (!existingRow) throw new Error('Unidade não encontrada no servidor ainda')
        const existing = Array.isArray((existingRow as any)?.fotos_unidade) ? ((existingRow as any).fotos_unidade as any[]) : []
        const byKey = new Map<string, any>()
        const keyOf = (x: any): string => {
          const lid = typeof x?.localId === 'string' ? x.localId.trim() : ''
          if (lid) return `localId:${lid}`
          const b = typeof x?.bucket === 'string' ? x.bucket : ''
          const p = typeof x?.path === 'string' ? x.path : ''
          if (b && p) return `${b}:${p}`
          const u = typeof x?.url === 'string' ? x.url : ''
          if (!u) return ''
          return u
        }
        const isLocalUrl = (u: string) => /^blob:|^data:|^file:/i.test(String(u || ''))
        const uploadedKeyByLocalId = new Map<string, string>()
        for (const x of fotos_unidade as any[]) {
          const lid = String(x?.localId || '').trim()
          const k = keyOf(x)
          if (lid && k) uploadedKeyByLocalId.set(lid, k)
        }
        for (const x of existing) {
          const k = keyOf(x)
          if (k) byKey.set(k, x)
        }
        for (const x of fotos_unidade as any[]) {
          const k = keyOf(x)
          if (!k) continue
          const prev = byKey.get(k)
          byKey.set(k, prev ? { ...prev, ...x } : x)
        }
        // Limpeza importante: remove do servidor fotos que não estão mais no IDB local
        // Se a unidade existe localmente, ela é a fonte da verdade para quais fotos devem existir
        const localUnitCurrent = await db.unidades.get(unidadeId as any)
        if (localUnitCurrent && Array.isArray(localUnitCurrent.fotos_unidade)) {
          const localKeys = new Set(localUnitCurrent.fotos_unidade.map(keyOf).filter(Boolean))
          // Mantém apenas as fotos que estão na lista local ou que acabaram de ser sincronizadas
          for (const k of byKey.keys()) {
            if (!localKeys.has(k) && !(fotos_unidade as any[]).some((fx: any) => keyOf(fx) === k)) {
               byKey.delete(k)
            }
          }
        }

        const desiredKeys: string[] = []
        if (localUnitCurrent && Array.isArray((localUnitCurrent as any).fotos_unidade)) {
          for (const it of (localUnitCurrent as any).fotos_unidade as any[]) {
            const u = typeof it?.url === 'string' ? String(it.url) : ''
            const lid = String(it?.localId || '').trim()
            if (u && isLocalUrl(u) && lid && uploadedKeyByLocalId.has(lid)) {
              desiredKeys.push(String(uploadedKeyByLocalId.get(lid)))
              continue
            }
            if (u && isLocalUrl(u)) continue
            const k = keyOf(it)
            if (k) desiredKeys.push(k)
          }
        }
        if (desiredKeys.length === 0) {
          for (const x of existing) {
            const k = keyOf(x)
            if (k) desiredKeys.push(k)
          }
        }

        const merged: any[] = []
        for (const k of desiredKeys) {
          const v = byKey.get(k)
          if (!v) continue
          merged.push(v)
          byKey.delete(k)
        }
        for (const v of byKey.values()) merged.push(v)
        const { error } = await supabase
          .from('unidades_fiscalizadas')
          .update({ fotos_unidade: merged, updated_at: new Date().toISOString() })
          .eq('id', serverId as any)
        if (error) throw error

        // Atualiza a unidade local preservando placeholders locais (ordem da UI),
        // substituindo os locais que já foram enviados pelo objeto remoto correspondente.
        const localUnit = await db.unidades.get(unidadeId as any)
        if (localUnit && Array.isArray((localUnit as any).fotos_unidade)) {
          const remoteByKey = new Map<string, any>()
          for (const x of merged) {
            const k = keyOf(x)
            if (k) remoteByKey.set(k, x)
          }
          const usedRemote = new Set<string>()
          const nextLocal: any[] = []
          for (const it of (localUnit as any).fotos_unidade as any[]) {
            const u = typeof it?.url === 'string' ? String(it.url) : ''
            const lid = String(it?.localId || '').trim()
            if (u && isLocalUrl(u) && lid && uploadedKeyByLocalId.has(lid)) {
              const k = String(uploadedKeyByLocalId.get(lid))
              const v = remoteByKey.get(k)
              if (v) {
                nextLocal.push(v)
                usedRemote.add(k)
                continue
              }
            }
            if (u && isLocalUrl(u)) {
              nextLocal.push(it)
              continue
            }
            const k = keyOf(it)
            const v = k ? remoteByKey.get(k) : null
            if (k && v) {
              nextLocal.push(v)
              usedRemote.add(k)
            } else if (k) {
              nextLocal.push(it)
            }
          }
          for (const x of merged) {
            const k = keyOf(x)
            if (!k) continue
            if (usedRemote.has(k)) continue
            nextLocal.push(x)
          }
          await db.unidades.update(unidadeId as any, { fotos_unidade: nextLocal })
        } else if (localUnit) {
          await db.unidades.update(unidadeId as any, { fotos_unidade: merged })
        }
      }
      try {
        await withBackoff(() => withTimeout(doUpdate, 15000))
        const deletables = await db.fotos_local
          .where('unidadeLocalId')
          .equals(unidadeId as any)
          .and((x) => !!x.syncedAt && !!x.storagePath)
          .toArray()
        if (deletables.length > 0) {
          revokeManyPreviewUrls(deletables.map((d: any) => String(d?.localId || '')).filter(Boolean))
          await db.fotos_local.bulkDelete(deletables.map((d) => d.localId as any))
        }
      } catch (err) {
        console.error(`Erro ao atualizar fotos da unidade ${unidadeId}:`, err)
      }
    }
  }
  await Promise.all(Array.from({ length: unitConcurrency }, () => unitWorker()))
  return uploaded
}

async function reachability(): Promise<boolean> {
  try {
    const base = (import.meta as any).env?.VITE_SUPABASE_URL || ''
    const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
    if (!base) return false
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8000)
    const apikeyParam = key ? `?apikey=${encodeURIComponent(String(key))}` : ''
    const urls = [`${base}/auth/v1/health${apikeyParam}`, `${base}/rest/v1/${apikeyParam}`]
    for (const url of urls) {
      try {
        const resp = await fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl.signal })
        clearTimeout(t)
        return !!resp
      } catch {
      }
    }
    clearTimeout(t)
    return false
  } catch {
    return false
  }
}

async function authRefresh(): Promise<void> {
  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    const session = sessionRes.session
    if (session) {
      const expiresAt = session.expires_at || 0
      const nowSeconds = Math.floor(Date.now() / 1000)
      // Se a sessão atual ainda for válida por mais de 5 minutos (300s), não faz chamada de rede desnecessária
      if (expiresAt - nowSeconds > 300) {
        return
      }
      
      const refresh_token = session.refresh_token
      if (refresh_token) {
        await supabase.auth.refreshSession({ refresh_token })
        return
      }
    }
    await supabase.auth.getUser()
  } catch {
    // ignora, motor de sync tentará mesmo assim
  }
}

async function repairOutboxRespostasMissingId(): Promise<void> {
  const [pendingOrError, unknownStatus] = await Promise.all([
    db.fila_mutacoes.where('status').anyOf('pending', 'error').toArray(),
    db.fila_mutacoes.filter((m: any) => !m?.status).toArray()
  ])
  const all = [...(pendingOrError || []), ...(unknownStatus || [])]
  const targets = all.filter((m: any) => String(m?.entity || '') === 'respostas' && !(m?.payload?.id))
  for (const m of targets) {
    try {
      const p: any = m?.payload || {}
      const unidadeId = p?.unidade_fiscalizada_id
      const itemId = p?.item_checklist_id
      let local: any = null
      if (unidadeId && itemId) {
        local = await db.respostas
          .where('unidade_fiscalizada_id')
          .equals(unidadeId as any)
          .and((r: any) => String(r?.item_checklist_id || '') === String(itemId))
          .first()
      }
      if (!local && unidadeId && p?.pergunta) {
        const perg = String(p.pergunta || '').trim()
        if (perg) {
          local = await db.respostas
            .where('unidade_fiscalizada_id')
            .equals(unidadeId as any)
            .and((r: any) => String(r?.pergunta || '').trim() === perg)
            .first()
        }
      }
      if (local?.id) {
        const nextPayload = { ...p, id: local.id, item_checklist_id: p?.item_checklist_id ?? local.item_checklist_id }
        await db.fila_mutacoes.update(m.id as any, { payload: nextPayload })
      }
    } catch {}
  }
}

// Entidades cujo alvo dá pra checar localmente. 'fotos' e 'finalizacao_unidade' não
// têm um id de linha próprio — seu payload referencia a própria unidade, então a
// checagem de existência usa a unidade como alvo.
const OUTBOX_ORPHAN_CHECKABLE_ENTITIES = new Set([
  'unidades', 'respostas', 'constatacoes_manuais', 'recomendacoes', 'determinacoes',
  'fotos', 'finalizacao_unidade', 'fiscalizacoes', 'finalizacao_fiscalizacao', 'reabrir_fiscalizacao'
])

async function pruneOutboxOrphans(): Promise<number> {
  const [pendingOrError, unknownStatus] = await Promise.all([
    db.fila_mutacoes.where('status').anyOf('pending', 'error').toArray(),
    db.fila_mutacoes.filter((m: any) => !m?.status).toArray()
  ])
  const all = [...(pendingOrError || []), ...(unknownStatus || [])]
  const deletables: UUID[] = []

  const existsIn = async (entity: string, id: any): Promise<boolean> => {
    try {
      if (!id) return false
      if (entity === 'unidades' || entity === 'fotos' || entity === 'finalizacao_unidade') return !!(await db.unidades.get(id as any))
      if (entity === 'respostas') return !!(await db.respostas.get(id as any))
      if (entity === 'constatacoes_manuais') return !!(await db.constatacoes_manuais.get(id as any))
      if (entity === 'recomendacoes') return !!(await db.recomendacoes.get(id as any))
      if (entity === 'determinacoes') return !!(await (db as any).determinacoes.get(id as any))
      if (entity === 'fiscalizacoes' || entity === 'finalizacao_fiscalizacao' || entity === 'reabrir_fiscalizacao') return !!(await db.fiscalizacoes.get(id as any))
      return true
    } catch {
      return true
    }
  }

  for (const m of all as any[]) {
    const entity = String(m?.entity || '')
    const tipo = String(m?.tipo || '')
    // Mutações 'delete' legitimamente têm como alvo algo que já não existe mais
    // localmente (é o objetivo delas) — nunca purgar com base nessa checagem.
    // 'finalize'/'reopen', ao contrário, referenciam uma unidade/fiscalização que
    // pode ter sido apagada em cascata por outro dispositivo — nesse caso são lixo
    // e devem ser purgadas como qualquer outra mutação órfã.
    if (tipo === 'delete') continue
    if (!OUTBOX_ORPHAN_CHECKABLE_ENTITIES.has(entity)) continue
    const pid = entity === 'fotos' ? (m?.payload?.id || m?.payload?.unidade_fiscalizada_id) : m?.payload?.id
    if (!pid) continue
    const ok = await existsIn(entity, pid)
    if (!ok) deletables.push(m.id as UUID)
  }
  if (deletables.length > 0) {
    await db.fila_mutacoes.bulkDelete(deletables as any)
  }
  return deletables.length
}

async function runFullSyncInternal(onProgress?: (msg: string, isError?: boolean) => void): Promise<{ outbox: number; lastSyncAt?: string; deletedRemotely?: { removedCount: number; recreatedCount: number } }> {
  const log = (msg: string, isError = false) => { if (onProgress) onProgress(msg, isError) }
  
  log('Verificando conexão com o servidor...')
  
  const sessionRes = await supabase.auth.getSession().catch(() => null)
  const session = sessionRes?.data?.session
  const expiresAt = session?.expires_at || 0
  const nowSeconds = Math.floor(Date.now() / 1000)
  const hasValidSession = session && (expiresAt - nowSeconds > 300)

  if (!hasValidSession) {
    const ok = await withTimeout(() => reachability(), 5000)
    if (!ok) {
      log('Servidor indisponível. Verifique a conexão.', true)
      throw new Error('Servidor indisponível. Verifique a URL do Supabase ou sua conexão.')
    }
    try {
      log('Atualizando sessão...')
      await withTimeout(() => authRefresh(), 15000)
    } catch (err: any) {
      if (String(err?.message || '').includes('Timeout')) {
        log('Timeout na autenticação.', true)
        throw new Error('Timeout na etapa de autenticação')
      }
      log('Erro na autenticação.', true)
      throw err
    }
  }
  
  log('Reprocessando erros anteriores...')
  await retryOutboxErrors(true)

  // Checagem de exclusões remotas: escopada aos IDs locais (fetchExistingIds), então
  // é barata o bastante pra rodar em toda sincronização — sem gate de 24h. Se a
  // checagem falhar (rede/servidor), pruneResult vem null e nada é apagado.
  let pruneResult: Awaited<ReturnType<typeof pruneLocalByServerIds>> = null
  try {
    log('Verificando fiscalizações excluídas em outros dispositivos...')
    pruneResult = await withTimeout(() => pruneLocalByServerIds(), 15000)
  } catch {}
  try {
    const st = await db.estados_sync.get('global' as UUID)
    await db.estados_sync.put({
      ...(st as any),
      id: 'global' as UUID,
      entidade: 'global',
      updated_at: now(),
      last_prune_at: now()
    } as any)
  } catch {}

  log('Enfileirando dados pendentes...')
  await ensureBaseEntitiesEnqueued()

  try {
    log('Otimizando fila de sincronização...')
    await compactOutbox()
  } catch {}

  try {
    await repairOutboxRespostasMissingId()
  } catch {}
  try {
    await pruneOutboxOrphans()
  } catch {}

  log('Enviando dados (Sync Up)...')
  await syncUp(onProgress)

  log('Baixando dados (Sync Down)...')
  await syncDown(onProgress)

  log('Sincronização finalizada.')
  const pending = await getOutboxCount()
  const { lastSyncAt } = await getLastSync()

  const result: { outbox: number; lastSyncAt?: string; deletedRemotely?: { removedCount: number; recreatedCount: number } } = { outbox: pending, lastSyncAt }
  if (pruneResult) {
    const removedCount = pruneResult.prunedFiscalizacaoIds.length
    const recreatedCount = pruneResult.recreatedFiscalizacoes.length
    if (removedCount > 0 || recreatedCount > 0) {
      result.deletedRemotely = { removedCount, recreatedCount }
      if (removedCount > 0) {
        log(`${removedCount} fiscalização(ões) foram excluídas em outro dispositivo e removidas localmente.`)
      }
      if (recreatedCount > 0) {
        log(`${recreatedCount} fiscalização(ões) excluídas em outro dispositivo tinham alterações salvas offline aqui — foram preservadas como nova(s) fiscalização(ões).`)
      }
    }
  }
  return result
}

export async function syncUpForFiscalizacao(
  fiscalizacaoId: string,
  onProgress?: (progress: SyncProgress) => void
): Promise<{ outbox: number }> {
  const emit = (message: string, current: number, total: number, isError = false) =>
    onProgress?.({ message, current, total, isError })

  // Auth / connectivity check
  const sessionRes = await supabase.auth.getSession().catch(() => null)
  const session = sessionRes?.data?.session
  const expiresAt = session?.expires_at || 0
  const nowSeconds = Math.floor(Date.now() / 1000)
  const hasValidSession = session && expiresAt - nowSeconds > 300

  if (!hasValidSession) {
    emit('Verificando conexão...', 0, 0)
    const ok = await withTimeout(() => reachability(), 5000)
    if (!ok) throw new Error('Servidor indisponível. Verifique a conexão.')
    emit('Atualizando sessão...', 0, 0)
    await withTimeout(() => authRefresh(), 15000)
  }

  emit('Preparando envio...', 0, 0)
  await retryOutboxErrors(true)
  try { await ensureBaseEntitiesEnqueued() } catch {}
  try { await compactOutbox() } catch {}
  try { await repairOutboxRespostasMissingId() } catch {}
  try { await pruneOutboxOrphans() } catch {}

  // Checagem pontual: essa fiscalização específica ainda existe no servidor? Isso
  // fecha exatamente o caso relatado — "continuar" uma fiscalização offline que outro
  // dispositivo já excluiu — antes de gastar uma tentativa de push que bateria numa
  // violação de chave estrangeira (pai inexistente) e ficaria reentrando.
  try {
    const existsRemotely = await fetchExistingIds('fiscalizacoes', [fiscalizacaoId])
    if (!existsRemotely.has(fiscalizacaoId)) {
      const pendingInsert = await db.fila_mutacoes
        .where('entity').equals('fiscalizacoes')
        .and((m) => m.tipo === 'insert' && m.payload?.id === fiscalizacaoId && m.status !== 'done')
        .first()
      if (!pendingInsert) {
        const localFisc = await db.fiscalizacoes.get(fiscalizacaoId as any)
        if (localFisc) {
          const localUnidadeIds = (await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId as any).toArray()).map((u) => String(u.id))
          if (await hasUnsyncedWorkForFiscalizacao(fiscalizacaoId, localUnidadeIds)) {
            emit('Fiscalização excluída em outro dispositivo — preservando alterações offline como nova fiscalização...', 0, 0, true)
            await recreateFiscalizacaoLocally(localFisc)
          } else {
            emit('Fiscalização excluída em outro dispositivo — removendo localmente...', 0, 0, true)
            await cascadeDeleteFiscalizacaoLocally(localFisc)
          }
          const pendingAfterPrune = await getOutboxCount()
          return { outbox: pendingAfterPrune }
        }
      }
    }
  } catch {
    // Falha ao checar existência: segue o fluxo normal — nunca assume exclusão
    // com base numa checagem que não completou.
  }

  // Identify units for this fiscalização
  const unidades = await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId as any).toArray()
  const unidadeIds = new Set<string>(unidades.map((u: any) => String(u?.id || '')).filter(Boolean))
  const unidadeToFisc = new Map<string, string>()
  for (const u of unidades) unidadeToFisc.set(String(u.id), fiscalizacaoId)

  const isFiscMutation = (m: any): boolean => {
    const entity = String(m?.entity || '')
    const p = m?.payload || {}
    const pid = String(p?.id || '')
    const pfisc = String(p?.fiscalizacao_id || '')
    if (['fiscalizacoes', 'finalizacao_fiscalizacao', 'reabrir_fiscalizacao'].includes(entity))
      return pid === fiscalizacaoId || pfisc === fiscalizacaoId
    if (['unidades', 'finalizacao_unidade'].includes(entity)) {
      if (pfisc === fiscalizacaoId) return true
      const uid = pid || String(p?.unidade_fiscalizada_id || '')
      return unidadeIds.has(uid)
    }
    if (['respostas', 'constatacoes_manuais', 'recomendacoes', 'determinacoes', 'fotos'].includes(entity))
      return unidadeIds.has(String(p?.unidade_fiscalizada_id || ''))
    return false
  }

  const allPending = await db.fila_mutacoes.where('status').equals('pending').toArray()
  const depEntities = new Set(['prestadores', 'contratos', 'tipos_unidade', 'itens_checklist'])
  const depMuts = allPending.filter((m: any) => depEntities.has(String(m?.entity || '')))
  const fiscMuts = allPending.filter((m: any) => isFiscMutation(m))

  // Detect reopen mutations so we can drop stale finalizations
  const reabrirFiscIds = new Set<string>()
  for (const m of fiscMuts as any[]) {
    if (m.entity === 'reabrir_fiscalizacao' || m.tipo === 'reopen') {
      const fid = String(m.payload?.id || m.payload?.fiscalizacao_id || '')
      if (fid) reabrirFiscIds.add(fid)
    }
  }

  const staleIds: any[] = []
  const combined = [...depMuts, ...fiscMuts].filter((m: any) => {
    if (m.entity === 'finalizacao_fiscalizacao') {
      const fid = String(m.payload?.id || m.payload?.fiscalizacao_id || '')
      if (reabrirFiscIds.has(fid)) { staleIds.push(m.id); return false }
    }
    if (m.entity === 'finalizacao_unidade') {
      const uid = String(m.payload?.id || m.payload?.unidade_fiscalizada_id || '')
      const fid = unidadeToFisc.get(uid)
      if (fid && reabrirFiscIds.has(fid)) { staleIds.push(m.id); return false }
    }
    return true
  })
  if (staleIds.length > 0) await db.fila_mutacoes.bulkDelete(staleIds)

  const sorted = combined.slice().sort((a, b) => {
    const ai = orderForSyncUp.indexOf(a.entity as Entity)
    const bi = orderForSyncUp.indexOf(b.entity as Entity)
    const an = ai === -1 ? 999 : ai
    const bn = bi === -1 ? 999 : bi
    if (an !== bn) return an - bn
    return (a.created_at || '').localeCompare(b.created_at || '')
  })

  const totalMuts = sorted.length
  const pendingFotosCount = await db.fotos_local.filter((f: any) => !f?.syncedAt).count()
  const grandTotal = totalMuts + pendingFotosCount
  let grandCurrent = 0

  emit(`Enviando dados (0/${totalMuts > 0 ? totalMuts : '?'})...`, grandCurrent, grandTotal)

  const processOne = async (m: any) => {
    try {
      await pushOne(m.entity as Entity, m.tipo as MutationType, m.payload)
      await db.fila_mutacoes.update(m.id, { status: 'done', lastError: '', nextRetryAt: undefined })
    } catch (err: any) {
      const attempts = ((m as any).attempts || 0) + 1
      const retryable = isRetryableError(err)
      const nextRetryAt = computeNextRetryAt(attempts, retryable)
      await db.fila_mutacoes.update(m.id, { status: 'error', attempts, lastError: errorInfo(err).message, nextRetryAt })
    }
    grandCurrent++
    emit(`Enviando dados (${grandCurrent}/${totalMuts})...`, grandCurrent, grandTotal)
  }

  const BATCH = 10
  const recMuts = sorted.filter((m: any) => String(m?.entity) === 'recomendacoes')
  const otherMuts = sorted.filter((m: any) => String(m?.entity) !== 'recomendacoes')

  for (let i = 0; i < otherMuts.length; i += BATCH) {
    await Promise.all(otherMuts.slice(i, i + BATCH).map(processOne))
  }
  for (const m of recMuts) await processOne(m)

  if (pendingFotosCount > 0) {
    emit(`Fotos (0/${pendingFotosCount})...`, grandCurrent, grandTotal)
    const fotosUploaded = await syncFotosWithProgress((uploaded, fotoTotal) => {
      emit(`Fotos (${uploaded}/${fotoTotal})...`, totalMuts + uploaded, totalMuts + fotoTotal)
    })
    grandCurrent = totalMuts + fotosUploaded
  }

  emit('Atualizando dados...', grandCurrent, grandTotal)
  try { await pullFiscalizacaoById(fiscalizacaoId) } catch {}

  const pending = await getOutboxCount()
  await db.estados_sync.put({
    id: 'global' as UUID,
    entidade: 'global',
    updated_at: now(),
    pending_count: pending
  })

  emit('Concluído!', grandTotal, grandTotal)
  return { outbox: pending }
}

type RunFullSyncResult = { outbox: number; lastSyncAt?: string; deletedRemotely?: { removedCount: number; recreatedCount: number } }

const progressListeners = new Set<(msg: string, isError?: boolean) => void>()
let currentSyncPromise: Promise<RunFullSyncResult> | null = null

export async function runFullSync(onProgress?: (msg: string, isError?: boolean) => void): Promise<RunFullSyncResult> {
  if (onProgress) {
    progressListeners.add(onProgress)
  }

  if (currentSyncPromise) {
    return currentSyncPromise
  }

  currentSyncPromise = (async () => {
    const notifyListeners = (msg: string, isError = false) => {
      for (const listener of progressListeners) {
        try {
          listener(msg, isError)
        } catch (e) {
          console.error('Error in sync progress listener:', e)
        }
      }
    }

    try {
      return await runFullSyncInternal(notifyListeners)
    } finally {
      currentSyncPromise = null
    }
  })()

  return currentSyncPromise.finally(() => {
    if (onProgress) {
      progressListeners.delete(onProgress)
    }
  })
}
