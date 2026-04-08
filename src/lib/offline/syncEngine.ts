import { db, UUID } from './db'
import { supabase } from '@/lib/supabase'
import { base64ToBlob } from './image'

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
  | 'finalizacao_fiscalizacao'
  | 'reabrir_fiscalizacao'
  | 'prestadores'

type MutationType = 'insert' | 'update' | 'delete' | 'finalize' | 'reopen'

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
  finalizacao_fiscalizacao: 'fiscalizacoes',
  reabrir_fiscalizacao: 'fiscalizacoes'
  ,
  prestadores: 'prestadores_servico'
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
        'prestador_servico_id',
        'servicos',
        'status',
        'data_inicio',
        'data_fim',
        'numero_termo',
        'fiscal_email',
        'created_at',
        'updated_at'
      ])
    case 'unidades':
      // fotos_unidade é tratada separadamente em 'fotos'
      return pick(payload, [
        'id',
        'fiscalizacao_id',
        'tipo_unidade_id',
        'status',
        'codigo_unidade',
        'nome_unidade',
        'endereco',
        'latitude',
        'longitude',
        'data_hora_vistoria',
        'created_at',
        'updated_at'
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
        'created_at'
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
        'updated_at'
      ])
    default:
      return payload
  }
}

const orderForSyncUp: Entity[] = [
  'prestadores',
  'tipos_unidade',
  'itens_checklist',
  'fiscalizacoes',
  'unidades',
  'respostas',
  'constatacoes_manuais',
  'recomendacoes',
  'fotos',
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
  const message = String(err?.message || err || '')
  return { status, code, message }
}

function isRetryableError(err: any): boolean {
  const { status, code, message } = errorInfo(err)
  const msg = message.toLowerCase()
  if (status === 401 || status === 403) return true
  if (status === 408 || status === 409 || status === 429) return true
  if (typeof status === 'number' && status >= 500) return true
  if (code && ['ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND'].includes(code)) return true
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

export async function getSyncPendingForFiscalizacao(fiscalizacaoId: UUID): Promise<{ outboxCount: number; fotosCount: number }> {
  if (!fiscalizacaoId) return { outboxCount: 0, fotosCount: 0 }
  const unidades = await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId as any).toArray()
  const unidadeIds = new Set<string>(unidades.map((u: any) => String(u?.id || '')).filter(Boolean))

  const [pendingOrError, unknownStatus] = await Promise.all([
    db.fila_mutacoes.where('status').anyOf('pending', 'error').toArray(),
    db.fila_mutacoes.filter((m: any) => !m?.status).toArray()
  ])
  const all = [...(pendingOrError || []), ...(unknownStatus || [])]

  const matchesFiscalizacao = (m: any): boolean => {
    const entity = String(m?.entity || '')
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

  const outboxCount = all.reduce((acc, m) => acc + (matchesFiscalizacao(m) ? 1 : 0), 0)

  const fotosCount = await db.fotos_local
    .filter((f: any) => !f?.syncedAt && unidadeIds.has(String(f?.unidadeLocalId || '')))
    .count()

  return { outboxCount, fotosCount }
}

export async function getLastSync(): Promise<{ lastSyncAt?: string }> {
  const st = await db.estados_sync.get('global' as UUID)
  return { lastSyncAt: st?.last_sync_at }
}

async function compactOutbox(): Promise<number> {
  const pending = await db.fila_mutacoes.where('status').equals('pending').toArray()
  if (!Array.isArray(pending) || pending.length < 2) return 0
  const keepByKey = new Map<string, { id: UUID; ts: number }>()
  const deletables: UUID[] = []
  for (const m of pending) {
    const entity = String((m as any)?.entity || '')
    const pid = (m as any)?.payload?.id
    if (!entity || typeof pid !== 'string' || !pid) continue
    const key = `${entity}:${pid}`
    const ts = Number.isFinite(Date.parse((m as any)?.created_at || '')) ? Date.parse((m as any).created_at) : 0
    const prev = keepByKey.get(key)
    if (!prev) {
      keepByKey.set(key, { id: (m as any).id as UUID, ts })
      continue
    }
    if (ts >= prev.ts) {
      deletables.push(prev.id)
      keepByKey.set(key, { id: (m as any).id as UUID, ts })
    } else {
      deletables.push((m as any).id as UUID)
    }
  }
  if (deletables.length === 0) return 0
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

async function retryOutboxErrors(): Promise<void> {
  const errs = await db.fila_mutacoes.where('status').equals('error').toArray()
  const nowIso = now()
  for (const e of errs) {
    const nextRetryAt = (e as any).nextRetryAt as string | undefined
    if (!nextRetryAt || nextRetryAt <= nowIso) {
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

async function pruneLocalByServerIds(): Promise<void> {
  const { data: fiscRows, error: fiscErr } = await supabase.from('fiscalizacoes').select('id')
  if (fiscErr) throw fiscErr
  const serverFisc = new Set<string>((fiscRows || []).map((r: any) => r.id))
  const locals = await db.fiscalizacoes.toArray()
  for (const f of locals) {
    const pendingInsert = await db.fila_mutacoes.where('entity').equals('fiscalizacoes').and((m) => m.tipo === 'insert' && m.payload?.id === f.id && m.status !== 'done').first()
    if (!serverFisc.has(f.id) && !pendingInsert) {
      const unidadesLocal = await db.unidades.where('fiscalizacao_id').equals(f.id as any).toArray()
      for (const u of unidadesLocal) {
        const respostas = await db.respostas.where('unidade_fiscalizada_id').equals(u.id as any).toArray()
        for (const r of respostas) {
          await db.respostas.delete(r.id as any)
        }
        const constatacoes = await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(u.id as any).toArray()
        for (const c of constatacoes) {
          await db.constatacoes_manuais.delete(c.id as any)
        }
        const fotos = await db.fotos.where('unidade_fiscalizada_id').equals(u.id as any).toArray()
        for (const ft of fotos) {
          await db.fotos.delete((ft as any).id)
        }
        await db.unidades.delete(u.id as any)
      }
      const pendingMut = await db.fila_mutacoes.where('entity').equals('fiscalizacoes').and((m) => m.payload?.id === f.id).toArray()
      if (pendingMut.length > 0) {
        await db.fila_mutacoes.bulkDelete(pendingMut.map((m) => m.id as any))
      }
      await db.fiscalizacoes.delete(f.id as any)
    }
  }
}
async function pushOne(entity: Entity, type: MutationType, payload: any) {
  const table = entityTableMap[entity]
  const resolveId = async (refEntity: Entity, localId?: UUID): Promise<UUID | undefined> => {
    if (!localId) return localId
    const map = await db.id_map.where('local_id').equals(localId).and((m) => m.entity === refEntity).first()
    return map?.server_id || localId
  }
  const doRequest = async () => {
    if (entity === 'fotos') {
      const unidadeLocalId = payload?.unidade_fiscalizada_id
      const unidadeId = await resolveId('unidades', unidadeLocalId)
      const fotos_unidade = payload?.fotos_unidade || []
      const { error } = await supabase.from(table).update({ fotos_unidade, updated_at: now() }).eq('id', unidadeId)
      if (error) throw error
      return []
    }
    if (entity === 'finalizacao_fiscalizacao') {
      const fiscalizacaoLocalId = payload?.id || payload?.fiscalizacao_id
      const fiscalizacaoId = await resolveId('fiscalizacoes', fiscalizacaoLocalId)
      const { data: result, error } = await supabase.rpc('finalizar_fiscalizacao', { p_fiscalizacao_id: fiscalizacaoId })
      if (error) throw error
      // Atualiza localmente status para finalizada; numero_termo virá pelo syncDown
      const map = await db.id_map.where('server_id').equals(fiscalizacaoId as UUID).and((m) => m.entity === 'fiscalizacoes').first()
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
      const { error } = await supabase.rpc('reabrir_fiscalizacao', { p_fiscalizacao_id: fiscalizacaoId })
      if (error) throw error
      // Atualiza localmente status para em_andamento
      const map = await db.id_map.where('server_id').equals(fiscalizacaoId as UUID).and((m) => m.entity === 'fiscalizacoes').first()
      const localId = map?.local_id || fiscalizacaoLocalId
      const local = await db.fiscalizacoes.get(localId as UUID)
      if (local) {
        await db.fiscalizacoes.update(localId as UUID, { ...local, status: 'em_andamento', updated_at: now() })
      }
      return []
    }
    if (entity === 'finalizacao_unidade' || type === 'finalize') {
      const unidadeLocalId = payload?.id || payload?.unidade_fiscalizada_id
      const unidadeId = await resolveId('unidades', unidadeLocalId)
      const updateBody = { status: 'finalizada', updated_at: now() }
      const { error } = await supabase.from(table).update(updateBody).eq('id', unidadeId)
      if (error) throw error
      return []
    }
    if (type === 'delete') {
      const deleteId = await resolveId(entity, payload?.id)
      const { error } = await supabase.from(table).delete().eq('id', deleteId)
      if (error) throw error
      return []
    }
    // insert/update via upsert
    const mapped = { ...payload }
    if (entity === 'unidades') {
      mapped.fiscalizacao_id = await resolveId('fiscalizacoes', payload?.fiscalizacao_id)
      mapped.tipo_unidade_id = await resolveId('tipos_unidade', payload?.tipo_unidade_id)
    }
    if (entity === 'respostas' || entity === 'constatacoes_manuais' || entity === 'recomendacoes') {
      mapped.unidade_fiscalizada_id = await resolveId('unidades', payload?.unidade_fiscalizada_id)
    }
    if (entity === 'recomendacoes') {
      const raw = mapped?.numero_recomendacao
      if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
        mapped.numero_recomendacao = null
      } else {
        mapped.numero_recomendacao = typeof raw === 'string' ? raw : String(raw)
      }
      // garantir FK da unidade: se não existir no servidor, empurra a unidade primeiro
      const unidadeLocalId = payload?.unidade_fiscalizada_id as UUID
      const unidadeServerId = mapped.unidade_fiscalizada_id as UUID
      if (unidadeLocalId && unidadeServerId === unidadeLocalId) {
        const { data: exists } = await supabase.from('unidades_fiscalizadas').select('id').eq('id', unidadeServerId).maybeSingle()
        if (!exists) {
          const unidadeLocal = await db.unidades.get(unidadeLocalId)
          if (unidadeLocal) {
            const ensure = { ...unidadeLocal }
            await pushOne('unidades', 'insert', ensure)
            const map = await db.id_map.where('local_id').equals(unidadeLocalId).and((m) => m.entity === 'unidades').first()
            if (map?.server_id) {
              mapped.unidade_fiscalizada_id = map.server_id
            }
          }
        }
      }
    }
    if (entity === 'respostas') {
      mapped.item_checklist_id = await resolveId('itens_checklist', payload?.item_checklist_id)
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
    mapped.id = await resolveId(entity, payload?.id)
    const safe = serializePayload(entity, type, mapped)
    const onConflictMap: Record<Entity, string | undefined> = {
      respostas: undefined,
      constatacoes_manuais: 'id',
      recomendacoes: undefined,
      fiscalizacoes: 'id',
      unidades: 'id',
      itens_checklist: 'id',
      tipos_unidade: 'id',
      fotos: undefined,
      finalizacao_unidade: undefined,
      finalizacao_fiscalizacao: undefined,
      reabrir_fiscalizacao: undefined,
      prestadores: 'id'
    }
    const upsertOptions: any = {}
    if (onConflictMap[entity]) {
      upsertOptions.onConflict = onConflictMap[entity]
      upsertOptions.ignoreDuplicates = false
      upsertOptions.returning = 'representation'
    }
    if (entity === 'recomendacoes') {
      if (type === 'insert') {
        const { data, error } = await supabase.from(table).insert(safe).select()
        if (error) throw error
        return data || []
      } else {
        const { data, error } = await supabase.from(table).update(safe).eq('id', safe.id as any).select()
        if (error) throw error
        return data || []
      }
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
    } else if (entity === 'unidades' && type === 'update') {
      const { data, error } = await supabase.from(table).update(safe).eq('id', safe.id as any).select()
      if (error) throw error
      return data || []
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
  const sorted = pendingAll
    .slice()
    .sort((a, b) => {
      const ai = orderForSyncUp.indexOf(a.entity as Entity)
      const bi = orderForSyncUp.indexOf(b.entity as Entity)
      if (ai !== bi) return ai - bi
      const at = a.created_at || ''
      const bt = b.created_at || ''
      return at.localeCompare(bt)
    })
  let processed = 0
  const groupByEntity: Record<Entity, typeof sorted> = {} as any
  for (const m of sorted) {
    const k = m.entity as Entity
    const arr = groupByEntity[k] || []
    arr.push(m)
    groupByEntity[k] = arr
  }
  const limit = 50
  const runBatch = async (items: typeof sorted, entityName: string) => {
    for (let i = 0; i < items.length; i += limit) {
      log(`Enviando ${entityName} (${Math.min(i + limit, items.length)} de ${items.length})...`)
      const chunk = items.slice(i, i + limit)
      await Promise.all(
        chunk.map(async (m) => {
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
        })
      )
    }
  }
  for (const entity of orderForSyncUp) {
    const items = groupByEntity[entity] || []
    if (items.length > 0) {
      await runBatch(items, entity)
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
      return 'id,municipio_id,municipio_nome,prestador_servico_id,prestador_servico_nome,fiscal_nome,fiscal_email,data_inicio,data_fim,latitude_inicio,longitude_inicio,status,servicos,numero_termo,created_at,updated_at'
    case 'unidades':
      return 'id,fiscalizacao_id,tipo_unidade_id,tipo_unidade_nome,nome_unidade,codigo_unidade,endereco,latitude,longitude,status,total_constatacoes,total_ncs,fotos_unidade,data_hora_vistoria,created_at,updated_at'
    case 'respostas':
      return '*'
    case 'constatacoes_manuais':
      return '*'
    default:
      return '*'
  }
}

async function pullEntity(entity: Entity, since?: string) {
  const table = entityTableMap[entity]
  const prefer = selectColsForPull(entity)
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
  // aplica dedup por id_map
  for (const row of rows) {
    const server_id = row.id as UUID
    const map = await db.id_map.where('server_id').equals(server_id).and((m) => m.entity === entity).first()
    const local_id = map?.local_id || server_id
    const normalized: any = { ...row, id: local_id }
    if (entity === 'unidades' && normalized?.fiscalizacao_id) {
      const fkMap = await db.id_map.where('server_id').equals(normalized.fiscalizacao_id as any).and((m) => m.entity === 'fiscalizacoes').first()
      if (fkMap?.local_id) normalized.fiscalizacao_id = fkMap.local_id
    }
    if ((entity === 'respostas' || entity === 'constatacoes_manuais' || entity === 'recomendacoes') && normalized?.unidade_fiscalizada_id) {
      const fkMap = await db.id_map.where('server_id').equals(normalized.unidade_fiscalizada_id as any).and((m) => m.entity === 'unidades').first()
      if (fkMap?.local_id) normalized.unidade_fiscalizada_id = fkMap.local_id
    }
    switch (entity) {
      case 'fiscalizacoes':
        await db.fiscalizacoes.put(normalized)
        break
      case 'unidades':
        await db.unidades.put(normalized)
        break
      case 'respostas':
        await db.respostas.put(normalized)
        break
      case 'constatacoes_manuais':
        await db.constatacoes_manuais.put(normalized)
        break
      case 'fotos':
        // servidor não tem tabela fotos; se vier via unidade, já coberto
        break
      default:
        break
    }
  }
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
  log('Baixando dados base...')
  // baixa diffs das entidades solicitadas em paralelo
  await Promise.all([
    pullEntity('fiscalizacoes', since),
    pullEntity('unidades', since),
    pullEntity('respostas', since),
    pullEntity('constatacoes_manuais', since)
  ])
  // itens_checklist e recomendacoes: tabelas adicionais
  log('Baixando municípios...')
  await withBackoff(() => withTimeout(async () => {
    const data = await safeSelectSince('municipios', 'id, nome', since)
    if (Array.isArray(data)) {
      for (const row of data) {
        await db.municipios.put(row as any)
      }
    }
  }, 15000))
  const fiscAll = await db.fiscalizacoes.toArray()
  for (const f of fiscAll) {
    if (!f.municipio_nome && f.municipio_id) {
      const m = await db.municipios.get(f.municipio_id as any)
      if (m?.nome) {
        await db.fiscalizacoes.update(f.id as UUID, { ...f, municipio_nome: m.nome })
      }
    }
  }
  log('Baixando tipos de unidade...')
  await withBackoff(() => withTimeout(async () => {
    const data = await safeSelectSince('tipos_unidade', 'id, nome, codigo, servicos_aplicaveis, ativo, created_at', undefined, 'or')
    if (Array.isArray(data)) {
      for (const row of data) {
        await db.tipos_unidade.put(row as any)
      }
    }
  }, 15000))
  log('Baixando prestadores...')
  await withBackoff(() => withTimeout(async () => {
    const data = await safeSelectSince('prestadores_servico', 'id, nome', since)
    if (Array.isArray(data)) {
      for (const row of data) {
        await db.prestadores.put(row as any)
      }
    }
  }, 15000))
  log('Baixando checklist...')
  await withBackoff(() => withTimeout(async () => {
    const data = await safeSelectSince(
      'itens_checklist',
      '*',
      undefined,
      'or'
    )
    if (Array.isArray(data)) {
      for (const row of data) {
        await db.itens_checklist.put(row as any)
      }
    }
  }, 15000))
  log('Baixando recomendações...')
  await withBackoff(() => withTimeout(async () => {
    try {
      const data = await safeSelectSince(
        'recomendacoes',
        '*',
        since
      )
      if (Array.isArray(data)) {
        for (const row of data) {
          const server_id = (row as any).id as UUID
          const map = await db.id_map.where('server_id').equals(server_id).first()
          const local_id = map?.local_id || server_id
          await db.recomendacoes.put({ ...(row as any), id: local_id })
        }
      }
    } catch (error: any) {
      const status = (error as any)?.status
      if (status === 400) return []
      throw error
    }
  }, 15000))
  await db.estados_sync.put({
    id: 'global' as UUID,
    entidade: 'global',
    updated_at: now(),
    last_sync_at: now()
  })
}

async function hardResetLocalData(): Promise<void> {
  await db.transaction('rw', db.municipios, db.prestadores, db.tipos_unidade, db.fiscalizacoes, async () => {
    await db.municipios.clear()
    await db.prestadores.clear()
    await db.tipos_unidade.clear()
    await db.fiscalizacoes.clear()
  })
  await db.transaction('rw', db.unidades, db.itens_checklist, db.respostas, db.constatacoes_manuais, async () => {
    await db.unidades.clear()
    await db.itens_checklist.clear()
    await db.respostas.clear()
    await db.constatacoes_manuais.clear()
  })
  await db.transaction('rw', db.recomendacoes, db.fotos, db.fotos_local, db.id_map, async () => {
    await db.recomendacoes.clear()
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
}

export async function syncFotosWithProgress(onProgress?: (uploaded: number, total: number) => void): Promise<number> {
  const all = await db.fotos_local.toArray()
  const unsynced = all.filter((f) => !f.syncedAt)
  const total = unsynced.length
  let uploaded = 0
  onProgress?.(uploaded, total)
  const cpu = typeof navigator !== 'undefined' && typeof (navigator as any).hardwareConcurrency === 'number' ? Number((navigator as any).hardwareConcurrency) : 4
  const concurrency = Math.max(2, Math.min(6, Math.ceil(cpu / 3)))
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
  const byUnidade: Record<string, { bucket: string; path: string; legenda?: string }[]> = {}
  const syncedAll = await db.fotos_local.where('syncedAt').above('' as any).toArray()
  for (const f of syncedAll.filter((x) => !!x.storagePath)) {
    const list = byUnidade[f.unidadeLocalId] || []
    list.push({ bucket: 'fotos_fiscalizacao', path: f.storagePath!, legenda: f.legenda })
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
          const b = typeof x?.bucket === 'string' ? x.bucket : ''
          const p = typeof x?.path === 'string' ? x.path : ''
          if (b && p) return `${b}:${p}`
          const u = typeof x?.url === 'string' ? x.url : ''
          if (!u) return ''
          return u
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
        const merged = Array.from(byKey.values())
        const { error } = await supabase
          .from('unidades_fiscalizadas')
          .update({ fotos_unidade: merged, updated_at: new Date().toISOString() })
          .eq('id', serverId as any)
        if (error) throw error

        // Atualiza a unidade localmente para que as fotos apareçam imediatamente,
        // sem depender do syncDown (que poderia falhar ou pular)
        const localUnit = await db.unidades.get(unidadeId as any)
        if (localUnit) {
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
    const t = setTimeout(() => ctrl.abort(), 3000)
    const resp = await fetch(`${base}/auth/v1/health`, {
      method: 'GET',
      cache: 'no-store',
      headers: key ? { apikey: key } : {},
      signal: ctrl.signal
    })
    clearTimeout(t)
    return !!resp && resp.ok
  } catch {
    return false
  }
}

async function authRefresh(): Promise<void> {
  try {
    const { data: sessionRes } = await supabase.auth.getSession()
    const refresh_token = sessionRes.session?.refresh_token
    if (refresh_token) {
      await supabase.auth.refreshSession({ refresh_token })
    } else {
      await supabase.auth.getUser()
    }
  } catch {
    // ignora, motor de sync tentará mesmo assim
  }
}

export async function runFullSync(onProgress?: (msg: string, isError?: boolean) => void): Promise<{ outbox: number; lastSyncAt?: string }> {
  const log = (msg: string, isError = false) => { if (onProgress) onProgress(msg, isError) }
  
  log('Verificando conexão com o servidor...')
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
  
  log('Reprocessando erros anteriores...')
  await retryOutboxErrors()
  try {
    const st = await db.estados_sync.get('global' as UUID)
    const lastPruneAt = (st as any)?.last_prune_at as string | undefined
    const shouldPrune = !lastPruneAt || (Number.isFinite(Date.parse(lastPruneAt)) && Date.now() - Date.parse(lastPruneAt) > 24 * 60 * 60 * 1000)
    if (shouldPrune) {
      try {
        log('Limpando dados antigos...')
        await withTimeout(() => pruneLocalByServerIds(), 30000)
        await db.estados_sync.put({
          ...(st as any),
          id: 'global' as UUID,
          entidade: 'global',
          updated_at: now(),
          last_prune_at: now()
        } as any)
      } catch {}
    }
  } catch {}
  
  log('Enfileirando dados pendentes...')
  await ensureBaseEntitiesEnqueued()

  try {
    log('Otimizando fila de sincronização...')
    await compactOutbox()
  } catch {}
  
  log('Enviando dados (Sync Up)...')
  await syncUp(onProgress)
  
  log('Baixando dados (Sync Down)...')
  await syncDown(onProgress)
  
  log('Sincronização finalizada.')
  const pending = await getOutboxCount()
  const { lastSyncAt } = await getLastSync()
  return { outbox: pending, lastSyncAt }
}
