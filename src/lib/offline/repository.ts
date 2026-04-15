import { db, Foto, Fiscalizacao, Unidade, ItemChecklist, RespostaChecklist, ConstatacaoManual, OfflineFoto } from './db'
import { enqueueMutation } from './syncEngine'
import { compressFileToBlob, MAX_DIMENSION, JPEG_QUALITY, MAX_PHOTOS_PER_UNIDADE, MAX_PHOTO_BYTES } from './image'
import { supabase } from '@/lib/supabase'

const now = () => new Date().toISOString()
function withTimeout<T>(fn: () => Promise<T>, timeoutMs = 12000): Promise<T> {
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
const uid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // RFC4122 v4 fallback
  const s = []
  const hex = '0123456789abcdef'
  for (let i = 0; i < 36; i++) s[i] = hex.substr(Math.floor(Math.random() * 16), 1)
  s[14] = '4'
  // set 8, 9, A, or B at 19th char
  const rnd = Math.floor(Math.random() * 4)
  s[19] = hex.substr((rnd + 8), 1)
  s[8] = s[13] = s[18] = s[23] = '-'
  return s.join('')
}

const normalizeFoto = (f: Partial<Foto>): Foto => ({
  url: String(f.url || ''),
  bucket: typeof (f as any)?.bucket === 'string' ? String((f as any).bucket) : undefined,
  path: typeof (f as any)?.path === 'string' ? String((f as any).path) : undefined,
  legenda: f.legenda || '',
  mimeType: f.mimeType,
  width: typeof f.width === 'number' ? f.width : undefined,
  height: typeof f.height === 'number' ? f.height : undefined
})

const isLocalUrl = (url: string): boolean => {
  const u = String(url || '')
  if (!u) return true
  return (
    u.startsWith('blob:') ||
    u.startsWith('data:') ||
    u.startsWith('file:') ||
    u.startsWith('filesystem:') ||
    u.startsWith('capacitor:')
  )
}

const toStorageUrl = (bucket: string, path: string): string => {
  if (!bucket || !path) return ''
  return `storage://${bucket}/${path}`
}

const localFotoUrlCache = new Map<string, string>()
const localFotoPreviewUrl = (f: OfflineFoto): string => {
  if (f.url) return f.url
  const cached = localFotoUrlCache.get(f.localId)
  if (cached) return cached
  if (f.blob instanceof Blob) {
    const u = URL.createObjectURL(f.blob)
    localFotoUrlCache.set(f.localId, u)
    return u
  }
  if (typeof f.base64 === 'string' && f.base64.trim() !== '') return f.base64
  return ''
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatDateBR = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
const formatTimeBR = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`

export const Repository = {
  parseStorageUrl(url: string): { bucket: string; path: string } | null {
    if (typeof url !== 'string' || !url) return null
    if (url.startsWith('storage://')) {
      const remainder = url.slice('storage://'.length)
      const slash = remainder.indexOf('/')
      if (slash === -1) return null
      const bucket = remainder.slice(0, slash)
      let path = remainder.slice(slash + 1)
      const q = path.indexOf('?')
      if (q !== -1) path = path.slice(0, q)
      if (!bucket || !path) return null
      return { bucket, path }
    }
    const publicMarker = '/storage/v1/object/public/'
    const signMarker = '/storage/v1/object/sign/'
    let marker = ''
    let idx = url.indexOf(publicMarker)
    if (idx !== -1) marker = publicMarker
    else {
      idx = url.indexOf(signMarker)
      if (idx !== -1) marker = signMarker
    }
    if (!marker) return null
    const remainder = url.slice(idx + marker.length)
    const slash = remainder.indexOf('/')
    if (slash === -1) return null
    const bucket = remainder.slice(0, slash)
    let path = remainder.slice(slash + 1)
    const q = path.indexOf('?')
    if (q !== -1) path = path.slice(0, q)
    if (!bucket || !path) return null
    return { bucket, path }
  },

  async createSignedUrl(bucket: string, path: string, expiresInSeconds = 60 * 30): Promise<string> {
    if (!bucket || !path) throw new Error('Bucket ou path inválidos')
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresInSeconds)
    if (error) throw error
    return data?.signedUrl || ''
  },

  async getSignedUrlFromAny(input: any, expiresInSeconds = 60 * 30): Promise<string> {
    if (!input) return ''
    if (typeof input === 'string') {
      const parsed = Repository.parseStorageUrl(input)
      if (!parsed) return input
      return Repository.createSignedUrl(parsed.bucket, parsed.path, expiresInSeconds)
    }
    const bucket = input?.bucket
    const path = input?.path
    if (bucket && path) {
      return Repository.createSignedUrl(bucket, path, expiresInSeconds)
    }
    const url = input?.url
    const parsed = Repository.parseStorageUrl(url)
    if (!parsed) return url || ''
    return Repository.createSignedUrl(parsed.bucket, parsed.path, expiresInSeconds)
  },

  async getSignedUrlFromBucket(bucket: string, urlOrPath: any, expiresInSeconds = 60 * 30): Promise<string> {
    if (!urlOrPath) return ''
    if (typeof urlOrPath === 'string') {
      const parsed = Repository.parseStorageUrl(urlOrPath)
      if (parsed) return Repository.createSignedUrl(parsed.bucket, parsed.path, expiresInSeconds)
      return Repository.createSignedUrl(bucket, urlOrPath, expiresInSeconds)
    }
    if (urlOrPath?.bucket && urlOrPath?.path) {
      return Repository.createSignedUrl(urlOrPath.bucket, urlOrPath.path, expiresInSeconds)
    }
    if (typeof urlOrPath?.url === 'string') {
      const parsed = Repository.parseStorageUrl(urlOrPath.url)
      if (parsed) return Repository.createSignedUrl(parsed.bucket, parsed.path, expiresInSeconds)
    }
    if (typeof urlOrPath?.path === 'string') {
      return Repository.createSignedUrl(bucket, urlOrPath.path, expiresInSeconds)
    }
    return ''
  },

  async listMunicipios(): Promise<{ id: string; nome: string }[]> {
    const list = await db.municipios.toArray()
    return list.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  },
  
  async listPrestadores(): Promise<{ id: string; nome: string }[]> {
    const list = await db.prestadores.toArray()
    return list.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  },
  
  async listPrestadoresFull(): Promise<any[]> {
    const list = await db.prestadores.toArray()
    return list.slice().sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
  },
  
  async getPrestadorById(id: string): Promise<any | null> {
    const row = await db.prestadores.get(id as any)
    return row || null
  },
  
  async createPrestador(data: any): Promise<string> {
    const id = uid()
    const item = { id, ...data, created_at: now(), updated_at: now() }
    await db.prestadores.add(item as any)
    await enqueueMutation(item, 'insert', 'prestadores')
    return id
  },
  
  async updatePrestador(id: string, changes: any): Promise<void> {
    const cur = await db.prestadores.get(id as any)
    if (cur) {
      const next = { ...cur, ...changes, updated_at: now() }
      await db.prestadores.update(id as any, next)
      await enqueueMutation({ id, ...changes }, 'update', 'prestadores')
    }
  },
  
  async deletePrestador(id: string): Promise<void> {
    await db.prestadores.delete(id as any)
    await enqueueMutation({ id }, 'delete', 'prestadores')
  },
  
  async listTiposUnidade(): Promise<{ id: string; nome: string; codigo?: string; servicos_aplicaveis?: string[]; ativo?: boolean }[]> {
    const list = await db.tipos_unidade.toArray()
    return list.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  },
  
  async createTipoUnidade(data: { nome: string; codigo?: string; servicos_aplicaveis?: string[]; ativo?: boolean }): Promise<{ id: string }> {
    const id = uid()
    const item = { id, nome: data.nome, codigo: data.codigo || '', servicos_aplicaveis: data.servicos_aplicaveis || [], ativo: data.ativo !== false, created_at: now(), updated_at: now() }
    await db.tipos_unidade.add(item as any)
    await enqueueMutation(item, 'insert', 'tipos_unidade')
    return { id }
  },
  
  async updateTipoUnidade(id: string, changes: Partial<{ nome: string; codigo?: string; servicos_aplicaveis?: string[]; ativo?: boolean }>): Promise<void> {
    const cur = await db.tipos_unidade.get(id as any)
    if (cur) {
      const next = { ...cur, ...changes, updated_at: now() }
      await db.tipos_unidade.update(id as any, next)
      await enqueueMutation({ id, ...changes }, 'update', 'tipos_unidade')
    }
  },
  
  async deleteTipoUnidade(id: string): Promise<void> {
    await db.tipos_unidade.delete(id as any)
    await enqueueMutation({ id }, 'delete', 'tipos_unidade')
  },
  
  async listFiscalizacoes(limit = 100): Promise<Fiscalizacao[]> {
    const all = await db.fiscalizacoes.toArray()
    return all.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, limit)
  },
  
  async listFiscalizacoesByPrestador(prestadorId: string, limit = 500): Promise<Fiscalizacao[]> {
    const all = await db.fiscalizacoes.where('prestador_servico_id').equals(prestadorId as any).toArray()
    return all.slice().sort((a, b) => (b.data_inicio || '').localeCompare(a.data_inicio || '')).slice(0, limit)
  },
  
  async createFiscalizacao(data: Partial<Fiscalizacao> & { municipio_id: string; prestador_servico_id?: string; servicos?: string[]; fiscal_email?: string; fiscal_nome?: string; latitude_inicio?: number; longitude_inicio?: number }): Promise<Fiscalizacao> {
    const id = uid()
    const item: Fiscalizacao = {
      id,
      municipio_id: data.municipio_id,
      municipio_nome: undefined,
      prestador_servico_id: data.prestador_servico_id,
      servico: Array.isArray(data.servicos) ? data.servicos.join(', ') : data.servico,
      status: data.status || 'em_andamento',
      data_inicio: now(),
      fiscal_email: data.fiscal_email,
      created_at: now(),
      updated_at: now(),
      numero_termo: ''
    }
    await withTimeout(() => db.fiscalizacoes.add(item))
    await db.pending_entities.put({
      id: `fiscalizacoes:${id}` as any,
      entity: 'fiscalizacoes',
      local_id: id,
      created_at: now()
    } as any)
    enqueueMutation(item, 'insert', 'fiscalizacoes').catch(() => {})
    return item
  },
  
  async getFiscalizacaoById(id: string): Promise<Fiscalizacao | null> {
    const row = await db.fiscalizacoes.get(id)
    return row || null
  },

  async listUnidadesByFiscalizacao(fiscalizacaoId: string, limit = 50): Promise<Unidade[]> {
    const all = await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId).toArray()
    return all.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, limit)
  },
  
  async createUnidade(data: { fiscalizacao_id: string; tipo_unidade_id: string; codigo_unidade?: string; nome_unidade?: string; endereco?: string; latitude?: number | null; longitude?: number | null; data_hora_vistoria?: string }): Promise<Unidade> {
    const id = uid()
    const item: Unidade & { endereco?: string; latitude?: number | null; longitude?: number | null; data_hora_vistoria?: string } = {
      id,
      fiscalizacao_id: data.fiscalizacao_id,
      tipo_unidade_id: data.tipo_unidade_id,
      codigo_unidade: data.codigo_unidade || '',
      nome_unidade: data.nome_unidade || '',
      status: 'em_andamento',
      endereco: data.endereco || '',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      data_hora_vistoria: data.data_hora_vistoria || now(),
      created_at: now(),
      updated_at: now()
    }
    // propriedades locais não indexadas podem ser adicionadas
    await withTimeout(() => db.unidades.add(item as any))
    await db.pending_entities.put({
      id: `unidades:${id}` as any,
      entity: 'unidades',
      local_id: id,
      created_at: now()
    } as any)
    enqueueMutation(item, 'insert', 'unidades').catch(() => {})
    return item
  },
  
  async listUnidadesAll(limit = 500): Promise<Unidade[]> {
    const all = await db.unidades.toArray()
    return all.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, limit)
  },

  async getUnidadeById(id: string): Promise<Unidade | null> {
    const row = await db.unidades.get(id)
    return row || null
  },

  async getItensChecklist(tipo_unidade_id: string): Promise<ItemChecklist[]> {
    const items = await db.itens_checklist.where('tipo_unidade_id').equals(tipo_unidade_id).toArray()
    const norm = (s: any) => String(s || '').trim().toLowerCase()
    const keyOf = (it: any) => {
      const ord = Number(it?.ordem) || 0
      if (ord > 0) return `o:${ord}`
      const p = norm(it?.pergunta)
      return p ? `p:${p}` : `id:${String(it?.id || '')}`
    }
    const pickTime = (it: any) => String(it?.created_at || it?.updated_at || '')
    const byKey = new Map<string, any>()
    for (const it of items || []) {
      const k = keyOf(it)
      const prev = byKey.get(k)
      if (!prev) {
        byKey.set(k, it)
        continue
      }
      if (pickTime(it) >= pickTime(prev)) byKey.set(k, it)
    }
    const list = Array.from(byKey.values()).filter((it: any) => it?.ativo !== false)
    return list.sort((a: any, b: any) => {
      const ao = Number(a?.ordem) || 0
      const bo = Number(b?.ordem) || 0
      if (ao !== bo) return ao - bo
      return pickTime(a).localeCompare(pickTime(b))
    })
  },

  async getItensChecklistForUnidade(tipo_unidade_id: string, asOfIso?: string, preferItemIds?: string[]): Promise<ItemChecklist[]> {
    const items = await db.itens_checklist.where('tipo_unidade_id').equals(tipo_unidade_id).toArray()
    const cutoff = asOfIso ? String(asOfIso) : ''
    const prefer = new Set<string>(Array.isArray(preferItemIds) ? preferItemIds.filter(Boolean).map((x) => String(x)) : [])
    const norm = (s: any) => String(s || '').trim().toLowerCase()
    const keyOf = (it: any) => {
      const ord = Number(it?.ordem) || 0
      if (ord > 0) return `o:${ord}`
      const p = norm(it?.pergunta)
      return p ? `p:${p}` : `id:${String(it?.id || '')}`
    }
    const pickTime = (it: any) => String(it?.created_at || it?.updated_at || '')
    const byKey = new Map<string, any>()
    for (const it of items || []) {
      const t = pickTime(it)
      if (cutoff && t && t > cutoff) continue
      const k = keyOf(it)
      const prev = byKey.get(k)
      if (!prev) {
        byKey.set(k, it)
        continue
      }
      const prevPref = prefer.has(String(prev?.id || ''))
      const itPref = prefer.has(String(it?.id || ''))
      if (itPref && !prevPref) {
        byKey.set(k, it)
        continue
      }
      if (prevPref && !itPref) continue
      if (pickTime(it) >= pickTime(prev)) byKey.set(k, it)
    }
    const list = Array.from(byKey.values()).filter((it: any) => it?.ativo !== false)
    return list.sort((a: any, b: any) => {
      const ao = Number(a?.ordem) || 0
      const bo = Number(b?.ordem) || 0
      if (ao !== bo) return ao - bo
      return pickTime(a).localeCompare(pickTime(b))
    })
  },
  
  async listItensChecklistAll(): Promise<ItemChecklist[]> {
    const items = await db.itens_checklist.toArray()
    return items.slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  },
  
  async createItemChecklist(data: Omit<ItemChecklist, 'id'>): Promise<string> {
    const id = uid()
    const item = { ...data, id, created_at: now(), updated_at: now() }
    await db.itens_checklist.add(item as any)
    await enqueueMutation(item, 'insert', 'itens_checklist')
    return id
  },
  
  async updateItemChecklist(id: string, changes: Partial<ItemChecklist>): Promise<void> {
    const cur = await db.itens_checklist.get(id as any)
    if (cur) {
      const next = { ...cur, ...changes, updated_at: now() }
      await db.itens_checklist.update(id as any, next)
      await enqueueMutation({ id, ...changes, updated_at: now() }, 'update', 'itens_checklist')
    }
  },
  
  async deleteItemChecklist(id: string): Promise<void> {
    await db.itens_checklist.delete(id as any)
    await enqueueMutation({ id }, 'delete', 'itens_checklist')
  },

  async listRecomendacoesByUnidade(unidadeId: string): Promise<import('./db').Recomendacao[]> {
    const list = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const timeOf = (r: any) => Date.parse(String(r?.updated_at || r?.created_at || 0)) || 0
    const keyOf = (r: any) => {
      const num = String(r?.numero_recomendacao || '').trim()
      if (num) return `num:${num}`
      const desc = String(r?.descricao || '').trim()
      const origem = String(r?.origem || '').trim()
      return `desc:${origem}:${desc}`
    }
    const bestByKey = new Map<string, any>()
    for (const r of list || []) {
      const k = keyOf(r)
      const prev = bestByKey.get(k)
      if (!prev) bestByKey.set(k, r)
      else {
        const pt = timeOf(prev)
        const nt = timeOf(r)
        if (nt > pt || (nt === pt && String(r?.id || '') > String(prev?.id || ''))) bestByKey.set(k, r)
      }
    }
    const parseR = (v: any) => {
      const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : 999999
    }
    return Array.from(bestByKey.values()).sort((a: any, b: any) => {
      const na = parseR(a?.numero_recomendacao)
      const nb = parseR(b?.numero_recomendacao)
      if (na !== nb) return na - nb
      const ta = timeOf(a)
      const tb = timeOf(b)
      if (ta !== tb) return ta - tb
      return String(a?.id || '').localeCompare(String(b?.id || ''))
    })
  },
  
  async countRecomendacoesByUnidade(unidadeId: string): Promise<number> {
    return db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId).count()
  },
  
  async addRecomendacao(unidadeId: string, descricao: string, numero?: string, origem: string = 'manual'): Promise<void> {
    const id = uid()
    const item = {
      id,
      unidade_fiscalizada_id: unidadeId,
      numero_recomendacao: numero,
      descricao,
      origem,
      created_at: now(),
      updated_at: now()
    }
    await db.recomendacoes.add(item as any)
    await enqueueMutation(item, 'insert', 'recomendacoes')
  },

  async removeRecomendacao(id: string): Promise<void> {
    await db.recomendacoes.delete(id as any)
    await enqueueMutation({ id }, 'delete', 'recomendacoes')
  },

  async updateRecomendacao(id: string, changes: Partial<import('./db').Recomendacao>): Promise<void> {
    const cur = await db.recomendacoes.get(id as any)
    if (!cur) return
    const next = { ...cur, ...changes, updated_at: now() }
    await db.recomendacoes.update(id as any, next as any)
    await enqueueMutation({ id, ...changes, updated_at: next.updated_at }, 'update', 'recomendacoes')
  },
  
  async countDeterminacoesByUnidade(unidadeId: string): Promise<number> {
    const list = await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    return list.filter(c => !!c.texto_determinacao && c.texto_determinacao.trim() !== '').length
  },
  
  async countNCsByUnidade(unidadeId: string): Promise<number> {
    const respostas = await db.respostas.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const manuais = await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const rNc = respostas.filter(r => r.gera_nc).length
    const mNc = manuais.filter(m => m.gera_nc).length
    return rNc + mNc
  },
  
  async listTermosNotificacaoOnline(): Promise<any[]> {
    const { data, error } = await supabase.from('termos_notificacao').select('*')
    if (error) throw error
    return data || []
  },
  
  async listTermosNotificacaoByPrestador(prestadorId: string): Promise<any[]> {
    if (!prestadorId) return []
    const { data, error } = await supabase
      .from('termos_notificacao')
      .select('*')
      .eq('prestador_servico_id', prestadorId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },
  
  async getTermoNotificacaoByIdOnline(id: string): Promise<any | null> {
    const { data, error } = await supabase.from('termos_notificacao').select('*').eq('id', id).single()
    if (error) throw error
    return data || null
  },

  async updateTermoNotificacaoOnline(id: string, changes: any): Promise<any> {
    const { data, error } = await supabase.from('termos_notificacao').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  
  async listDeterminacoesOnlineByUnidades(unidadeIds: string[]): Promise<any[]> {
    if (!Array.isArray(unidadeIds) || unidadeIds.length === 0) return []
    const { data, error } = await supabase.from('determinacoes').select('*').in('unidade_fiscalizada_id', unidadeIds)
    if (error) throw error
    return data || []
  },
  
  async listUnidadesFiscalizacaoOnline(fiscalizacaoId: string): Promise<any[]> {
    if (!fiscalizacaoId) return []
    const { data, error } = await supabase
      .from('unidades_fiscalizadas')
      .select('*')
      .eq('fiscalizacao_id', fiscalizacaoId)
      .order('created_at')
    if (error) throw error
    return data || []
  },
  
  async listDeterminacoesOnlineAll(): Promise<any[]> {
    const { data, error } = await supabase.from('determinacoes').select('*')
    if (error) throw error
    return data || []
  },
  
  async listRespostasDeterminacaoOnlineByDeterminacoes(determinacaoIds: string[]): Promise<any[]> {
    if (!Array.isArray(determinacaoIds) || determinacaoIds.length === 0) return []
    const { data, error } = await supabase.from('respostas_determinacao').select('*').in('determinacao_id', determinacaoIds)
    if (error) throw error
    return data || []
  },
  
  async listRespostasDeterminacaoOnlineAll(): Promise<any[]> {
    const { data, error } = await supabase.from('respostas_determinacao').select('*')
    if (error) throw error
    return data || []
  },
  
  async listAutosInfracaoOnlineAll(): Promise<any[]> {
    const { data, error } = await supabase.from('autos_infracao').select('*')
    if (error) throw error
    return data || []
  },
  
  async deleteAutoInfracaoOnline(id: string): Promise<void> {
    const { error } = await supabase.from('autos_infracao').delete().eq('id', id)
    if (error) throw error
  },
  
  async listNaoConformidadesOnlineAll(): Promise<any[]> {
    const { data, error } = await supabase.from('nao_conformidades').select('*')
    if (error) throw error
    return data || []
  },

  async listNaoConformidadesOnlineByUnidades(unidadeIds: string[]): Promise<any[]> {
    if (!Array.isArray(unidadeIds) || unidadeIds.length === 0) return []
    const { data, error } = await supabase.from('nao_conformidades').select('*').in('unidade_fiscalizada_id', unidadeIds)
    if (error) throw error
    return data || []
  },

  async listRespostasChecklistOnlineByIds(ids: string[]): Promise<any[]> {
    if (!Array.isArray(ids) || ids.length === 0) return []
    const { data, error } = await supabase.from('respostas_checklist').select('*').in('id', ids)
    if (error) throw error
    return data || []
  },
  
  async updateRespostaDeterminacaoOnline(id: string, changes: any): Promise<any> {
    const { data, error } = await supabase.from('respostas_determinacao').update(changes).eq('id', id).select().single()
    if (!error) return data
    const msg = String((error as any)?.message || '').toLowerCase()
    const mentionsMissingColumn =
      msg.includes('could not find') || msg.includes('does not exist') || msg.includes('column')
    if (mentionsMissingColumn && msg.includes('evidencias')) {
      const next = { ...(changes || {}) }
      delete (next as any).evidencias
      const retry = await supabase.from('respostas_determinacao').update(next).eq('id', id).select().single()
      if (retry.error) throw retry.error
      return retry.data
    }
    throw error
  },
  
  async createRespostaDeterminacaoOnline(payload: any): Promise<any> {
    const { data, error } = await supabase.from('respostas_determinacao').insert(payload).select().single()
    if (!error) return data
    const msg = String((error as any)?.message || '').toLowerCase()
    const mentionsMissingColumn =
      msg.includes('could not find') || msg.includes('does not exist') || msg.includes('column')
    if (mentionsMissingColumn && msg.includes('evidencias')) {
      const next = { ...(payload || {}) }
      delete (next as any).evidencias
      const retry = await supabase.from('respostas_determinacao').insert(next).select().single()
      if (retry.error) throw retry.error
      return retry.data
    }
    throw error
  },
  
  async gerarNumeroAutoOnline(): Promise<string> {
    const { data, error } = await supabase.rpc('gerar_numero_auto')
    if (error) throw error
    return String(data)
  },

  async gerarNumeroAmOnline(): Promise<string> {
    const { data, error } = await supabase.rpc('gerar_numero_am')
    if (error) throw error
    return String(data)
  },
  
  async createAutoInfracaoOnline(payload: any): Promise<void> {
    const { error } = await supabase.from('autos_infracao').insert(payload)
    if (error) throw error
  },

  async updateAutoInfracaoOnline(id: string, changes: any): Promise<any> {
    const { data, error } = await supabase.from('autos_infracao').update(changes).eq('id', id).select().maybeSingle()
    if (error) {
      const msg = String((error as any)?.message || '').toLowerCase()
      const mentionsSingleCoercion =
        msg.includes('cannot coerce') ||
        msg.includes('json object requested') ||
        msg.includes('multiple (or no) rows returned')
      if (mentionsSingleCoercion) {
        const retry = await supabase.from('autos_infracao').update(changes).eq('id', id)
        if (retry.error) throw retry.error
        return null
      }
      throw error
    }
    return data
  },
  
  async updateAutoInfracaoOnlineStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase.from('autos_infracao').update({ status }).eq('id', id)
    if (error) throw error
  },

  async listAutosInfracaoOnlineByFiscalizacao(fiscalizacaoId: string): Promise<any[]> {
    if (!fiscalizacaoId) return []
    const { data, error } = await supabase.from('autos_infracao').select('*').eq('fiscalizacao_id', fiscalizacaoId)
    if (error) throw error
    return data || []
  },

  async listAutosInfracaoOnlineByDeterminacoes(determinacaoIds: string[]): Promise<any[]> {
    if (!Array.isArray(determinacaoIds) || determinacaoIds.length === 0) return []
    const { data, error } = await supabase.from('autos_infracao').select('*').in('determinacao_id', determinacaoIds)
    if (error) throw error
    return data || []
  },
  
  async listPareceresTecnicosOnlineAll(): Promise<any[]> {
    const { data, error } = await supabase.from('pareceres_tecnicos').select('*')
    if (error) throw error
    return data || []
  },
  
  async listJulgamentosOnlineAll(): Promise<any[]> {
    const { data, error } = await supabase.from('julgamentos').select('*')
    if (error) throw error
    return data || []
  },
  
  async createParecerTecnicoOnline(payload: any): Promise<any> {
    const { data, error } = await supabase.from('pareceres_tecnicos').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async updateParecerTecnicoOnline(id: string, changes: any): Promise<any> {
    const { data, error } = await supabase.from('pareceres_tecnicos').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async upsertParecerTecnicoForAuto(autoId: string, payload: any): Promise<any> {
    if (!autoId) throw new Error('autoId obrigatório')
    const { data: existing, error: selErr } = await supabase.from('pareceres_tecnicos').select('*').eq('auto_id', autoId).maybeSingle()
    if (selErr) throw selErr
    if (existing?.id) {
      return Repository.updateParecerTecnicoOnline(existing.id, payload)
    }
    return Repository.createParecerTecnicoOnline({ ...payload, auto_id: autoId })
  },

  async listRemessasAIOnlineAll(): Promise<any[]> {
    const { data, error } = await supabase.from('remessas_ai').select('*').order('criada_em', { ascending: false })
    if (error) throw error
    return data || []
  },

  async listRemessasAIOnlineByPrestador(prestadorId: string): Promise<any[]> {
    if (!prestadorId) return []
    const { data, error } = await supabase.from('remessas_ai').select('*').eq('prestador_servico_id', prestadorId).order('criada_em', { ascending: false })
    if (error) throw error
    return data || []
  },

  async createRemessaAIOnline(payload: any): Promise<any> {
    const { data, error } = await supabase.from('remessas_ai').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async updateRemessaAIOnline(id: string, changes: any): Promise<any> {
    const { data, error } = await supabase.from('remessas_ai').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },

  async addRemessaAIItem(remessaId: string, autoId: string): Promise<any> {
    const { data, error } = await supabase.from('remessas_ai_itens').insert({ remessa_ai_id: remessaId, auto_infracao_id: autoId }).select().single()
    if (error) throw error
    return data
  },

  async listRemessaAIItens(remessaId: string): Promise<any[]> {
    if (!remessaId) return []
    const { data, error } = await supabase
      .from('remessas_ai_itens')
      .select('*, autos_infracao(*)')
      .eq('remessa_ai_id', remessaId)
    if (error) throw error
    return data || []
  },
  
  async createJulgamentoOnline(payload: any): Promise<any> {
    const { data, error } = await supabase.from('julgamentos').insert(payload).select().single()
    if (error) throw error
    return data
  },
  
  async uploadEvidenciaDeterminacao(file: File, determinacaoId: string): Promise<{ url: string; nome: string; tipo: string; tamanho: number; data_upload: string; path: string; bucket: string }> {
    const bucket = 'evidencias-determinacoes'
    const nomeOriginal = file?.name || 'arquivo'
    const ext = nomeOriginal.includes('.') ? nomeOriginal.split('.').pop() : ''
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const path = `${determinacaoId}/${ts}-${rand}${ext ? '.' + ext : ''}`
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type })
    if (upErr) throw upErr
    const meta = { url: '', nome: nomeOriginal, tipo: file.type || 'application/octet-stream', tamanho: file.size || 0, data_upload: new Date().toISOString(), path, bucket }
    return meta
  },

  async uploadAssinaturaTermo(file: File, termoId: string): Promise<{ url: string; nome: string; tipo: string; tamanho: number; data_upload: string; path: string; bucket: string }> {
    const bucket = 'evidencias-determinacoes'
    const nomeOriginal = file?.name || 'assinatura.png'
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const path = `assinaturas/${termoId}/${ts}-${rand}.png`
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type || 'image/png' })
    if (upErr) throw upErr
    const meta = { url: '', nome: nomeOriginal, tipo: file.type || 'image/png', tamanho: file.size || 0, data_upload: new Date().toISOString(), path, bucket }
    return meta
  },

  async uploadTermoNotificacaoFile(
    file: File,
    termoId: string,
    kind: 'tn_agems' | 'rfp_agems' | 'tn_prestador' | 'termo_envio' | 'am_assinada'
  ): Promise<{ url: string; nome: string; tipo: string; tamanho: number; data_upload: string; path: string; bucket: string }> {
    const nomeOriginal = file?.name || 'arquivo.pdf'
    const ext = nomeOriginal.includes('.') ? (nomeOriginal.split('.').pop() || '').toLowerCase() : ''
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const baseExt = ext && ext.length <= 6 ? ext : 'pdf'
    const path = `termos_notificacao/${kind}/${termoId}/${ts}-${rand}.${baseExt}`
    const candidates = [
      'termos-notificacao',
      'termos_notificacao',
      'documentos-termos',
      'documentos_termos',
      'documentos-termo',
      'documentos',
      'arquivos'
    ]

    let lastErr: any = null
    for (const bucket of candidates) {
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: false,
        contentType: file?.type || 'application/pdf'
      })
      if (!error) {
        return {
          url: '',
          nome: nomeOriginal,
          tipo: file?.type || 'application/pdf',
          tamanho: file?.size || 0,
          data_upload: new Date().toISOString(),
          path,
          bucket
        }
      }
      lastErr = error
      const msg = String(error?.message || '').toLowerCase()
      const status = (error as any)?.statusCode
      const isBucketMissing = msg.includes('bucket not found') || status === 404
      const isNotAllowed = msg.includes('row-level security') || msg.includes('unauthorized') || status === 401 || status === 403
      if (isBucketMissing || isNotAllowed) continue
      throw error
    }
    throw lastErr || new Error('Falha ao enviar arquivo do termo')
  },

  async uploadDocumentoAutos(
    file: File,
    path: string
  ): Promise<{ url: string; nome: string; tipo: string; tamanho: number; data_upload: string; path: string; bucket: string }> {
    const bucket = 'documentos-autos'
    const nomeOriginal = file?.name || 'arquivo.pdf'
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file?.type || 'application/pdf' })
    if (upErr) throw upErr
    return { url: '', nome: nomeOriginal, tipo: file?.type || 'application/pdf', tamanho: file?.size || 0, data_upload: new Date().toISOString(), path, bucket }
  },

  async appendArquivoRespostaTermoOnline(termoId: string, meta: any): Promise<any> {
    const { data: termo, error: getErr } = await supabase.from('termos_notificacao').select('arquivos_resposta').eq('id', termoId).maybeSingle()
    if (getErr) throw getErr
    const cur = Array.isArray(termo?.arquivos_resposta) ? termo.arquivos_resposta : []
    const next = [...cur.filter((x: any) => x?.path !== meta?.path), meta]
    const { data, error } = await supabase.from('termos_notificacao').update({ arquivos_resposta: next, updated_at: new Date().toISOString() }).eq('id', termoId).select().single()
    if (error) throw error
    return data
  },
  
  async finalizeTNResponses(termoId: string, receivedAt?: string): Promise<any> {
    const { data: termo, error: getErr } = await supabase.from('termos_notificacao').select('*').eq('id', termoId).maybeSingle()
    if (getErr) throw getErr
    if (!termo) throw new Error('Termo não encontrado')
    const data_recebimento_resposta = receivedAt || new Date().toISOString().slice(0, 10)
    const prazo = termo?.data_maxima_resposta
    const recebida_no_prazo = prazo ? new Date(data_recebimento_resposta) <= new Date(prazo) : true
    const { data, error } = await supabase
      .from('termos_notificacao')
      .update({ data_recebimento_resposta, recebida_no_prazo, status: 'respondido', updated_at: new Date().toISOString() })
      .eq('id', termoId)
      .select()
      .single()
    if (error) throw error
    return data
  },
  
  async getProfileByIdOnline(id: string): Promise<any | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data || null
  },

  listRespostasByUnidade: async (unidadeId: string): Promise<RespostaChecklist[]> => {
    const list = await db.respostas.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    return list.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
  },

  async saveResposta(unidadeId: string, itemId: string, data: Partial<RespostaChecklist>): Promise<void> {
    const existing = await db.respostas
      .where('unidade_fiscalizada_id')
      .equals(unidadeId)
      .and(r => r.item_checklist_id === itemId)
      .first()
    if (existing?.id) {
      const updated = {
        ...existing,
        ...data,
        updated_at: now()
      }
      await db.respostas.update(existing.id, {
        ...updated
      })
      await enqueueMutation(
        {
          id: existing.id,
          unidade_fiscalizada_id: unidadeId,
          item_checklist_id: itemId,
          ...updated
        },
        'update',
        'respostas'
      )
    } else {
      const newId = uid()
      await db.respostas.add({
        id: newId,
        unidade_fiscalizada_id: unidadeId,
        item_checklist_id: itemId,
        created_at: now(),
        updated_at: now(),
        ...data
      })
      await enqueueMutation(
        {
          id: newId,
          unidade_fiscalizada_id: unidadeId,
          item_checklist_id: itemId,
          updated_at: now(),
          ...data
        },
        'insert',
        'respostas'
      )
    }
  },

  async countRespostasComPergunta(unidadeId: string): Promise<number> {
    const list = await db.respostas.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    return list.filter(r => !!r.pergunta && r.pergunta.trim() !== '').length
  },

  async countConstatacoesManuais(unidadeId: string): Promise<number> {
    return db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(unidadeId).count()
  },

  async addConstatacaoManual(unidadeId: string, payload: Omit<ConstatacaoManual, 'id' | 'created_at'>): Promise<ConstatacaoManual> {
    const item: ConstatacaoManual = {
      id: uid(),
      unidade_fiscalizada_id: unidadeId,
      created_at: now(),
      updated_at: now(),
      ...payload
    }
    await db.constatacoes_manuais.add(item)
    await enqueueMutation(item, 'insert', 'constatacoes_manuais')
    return item
  },

  async listConstatacoesManuais(unidadeId: string): Promise<ConstatacaoManual[]> {
    const list = await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    return list.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  },

  async getConstatacaoManualById(id: string): Promise<ConstatacaoManual | null> {
    const row = await db.constatacoes_manuais.get(id as any)
    return (row as any) || null
  },

  async recomputeConstatacoesNumeracao(unidadeId: string): Promise<void> {
    if (!unidadeId) return
    const [respostasAll, manuais] = await Promise.all([
      db.respostas.where('unidade_fiscalizada_id').equals(unidadeId).toArray(),
      db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    ])

    const isConstResposta = (r: any) => {
      const resp = String(r?.resposta || '').toUpperCase()
      const pergunta = String(r?.pergunta || '').trim()
      return (resp === 'SIM' || resp === 'NAO' || resp === 'NÃO') && pergunta !== ''
    }

    const timeOf = (r: any) => {
      const iso = String(r?.created_at || r?.updated_at || '')
      const t = Date.parse(iso)
      return Number.isFinite(t) ? t : 0
    }

    const manualTimeOf = (m: any) => {
      const t = timeOf(m)
      if (t > 0) return t
      const ord = Number(m?.ordem)
      if (Number.isFinite(ord) && ord > 0) {
        if (ord > 10_000_000_000) return ord
        return ord * 1000
      }
      return 0
    }

    const respostas = respostasAll || []
    for (const r of respostas) {
      if (!isConstResposta(r) && r?.numero_constatacao) {
        await db.respostas.update(r.id as any, { ...r, numero_constatacao: null, updated_at: now() } as any)
        await enqueueMutation(
          { id: r.id, unidade_fiscalizada_id: unidadeId, item_checklist_id: r.item_checklist_id, numero_constatacao: null, updated_at: now() },
          'update',
          'respostas'
        )
      }
    }

    const itens: any[] = [
      ...respostas.filter(isConstResposta).map((r) => ({ kind: 'checklist', r, id: r.id, t: timeOf(r) })),
      ...manuais.map((m) => ({ kind: 'manual', m, id: m.id, t: manualTimeOf(m) }))
    ].sort((a, b) => {
      if (a.t !== b.t) return a.t - b.t
      if (a.kind !== b.kind) return a.kind === 'checklist' ? -1 : 1
      return String(a.id).localeCompare(String(b.id))
    })

    for (let i = 0; i < itens.length; i++) {
      const desired = `C${i + 1}`
      const item = itens[i]
      if (item.kind === 'checklist') {
        const r = item.r
        if (r?.numero_constatacao !== desired) {
          await db.respostas.update(r.id as any, { ...r, numero_constatacao: desired, updated_at: now() } as any)
          await enqueueMutation(
            {
              id: r.id,
              unidade_fiscalizada_id: unidadeId,
              item_checklist_id: r.item_checklist_id,
              numero_constatacao: desired,
              updated_at: now()
            },
            'update',
            'respostas'
          )
        }
      } else {
        const m = item.m
        if (m?.numero_constatacao !== desired) {
          await db.constatacoes_manuais.update(m.id as any, { ...m, numero_constatacao: desired, updated_at: now() } as any)
          await enqueueMutation(
            { id: m.id, unidade_fiscalizada_id: unidadeId, numero_constatacao: desired, updated_at: now() },
            'update',
            'constatacoes_manuais'
          )
        }
      }
    }
  },

  async updateUnidadeFotos(unidadeId: string, fotos: Partial<Foto>[]): Promise<void> {
    const unidade = await db.unidades.get(unidadeId)
    const input = Array.isArray(fotos) ? fotos : []
    const normalized = input
      .map((f) => {
        const anyF: any = f as any
        const bucket = typeof anyF.bucket === 'string' ? String(anyF.bucket) : ''
        const path = typeof anyF.path === 'string' ? String(anyF.path) : ''
        if (bucket && path) {
          return normalizeFoto({ ...f, url: toStorageUrl(bucket, path), bucket, path })
        }
        const url = String(anyF.url || '')
        if (!url) return null
        if (isLocalUrl(url)) return null
        const parsed = Repository.parseStorageUrl(url)
        if (parsed) {
          return normalizeFoto({ ...f, url: toStorageUrl(parsed.bucket, parsed.path), bucket: parsed.bucket, path: parsed.path })
        }
        return normalizeFoto(f)
      })
      .filter(Boolean) as any
    if (unidade) {
      await db.unidades.update(unidadeId, {
        ...unidade,
        fotos_unidade: normalized,
        updated_at: now()
      })
    }
    const old = await db.fotos.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    for (const f of old) {
      await db.fotos.delete((f as any).id)
    }
    for (const f of normalized) {
      await db.fotos.add({
        id: uid(),
        unidade_fiscalizada_id: unidadeId,
        url: f.url,
        legenda: f.legenda,
        mimeType: f.mimeType,
        width: f.width,
        height: f.height,
        created_at: now()
      } as any)
    }
    // Sempre enfileira a mutação de atualização da lista de fotos (fotos remotas que sobraram)
    // Se houver fotos locais novas, elas serão adicionadas à lista pelo syncFotos do motor de sincronia
    await enqueueMutation({ unidade_fiscalizada_id: unidadeId, fotos_unidade: normalized }, 'update', 'fotos')
  },

  async addLocalFotoFromFile(
    unidadeId: string,
    file: File,
    capture?: { latitude: number; longitude: number; takenAt?: string }
  ): Promise<OfflineFoto & { previewUrl: string }> {
    const count = await db.fotos_local.where('unidadeLocalId').equals(unidadeId).count()
    if (count >= MAX_PHOTOS_PER_UNIDADE) {
      throw new Error(`Limite máximo de ${MAX_PHOTOS_PER_UNIDADE} fotos por unidade atingido`)
    }
    const unidade = await db.unidades.get(unidadeId as any)
    const fiscalizacaoLocalId = unidade?.fiscalizacao_id || 'unknown'
    const hasCapture =
      capture &&
      typeof capture.latitude === 'number' &&
      Number.isFinite(capture.latitude) &&
      typeof capture.longitude === 'number' &&
      Number.isFinite(capture.longitude)

    let processed: Awaited<ReturnType<typeof compressFileToBlob>>
    if (hasCapture) {
      let codigoUnidade = String(unidade?.codigo_unidade || '').trim()
      if (!codigoUnidade) codigoUnidade = String(unidade?.nome_unidade || '').trim()
      if (!codigoUnidade) codigoUnidade = 'SEM CÓDIGO'
      let municipioNome = ''
      if (unidade?.fiscalizacao_id) {
        const fisc = await db.fiscalizacoes.get(unidade.fiscalizacao_id as any)
        municipioNome = String(fisc?.municipio_nome || '').trim()
        if (!municipioNome && fisc?.municipio_id) {
          const m = await db.municipios.get(fisc.municipio_id as any)
          municipioNome = String(m?.nome || '').trim()
        }
      }
      if (!municipioNome) municipioNome = 'SEM MUNICÍPIO'
      const takenAt = capture.takenAt ? new Date(capture.takenAt) : file.lastModified ? new Date(file.lastModified) : new Date()
      const coordsText = `${capture.latitude.toFixed(6)}, ${capture.longitude.toFixed(6)}`
      const watermarkLines = [`${codigoUnidade}, ${municipioNome} - MS`, `${formatDateBR(takenAt)} ${formatTimeBR(takenAt)}`, coordsText]
      processed = await compressFileToBlob(file, MAX_DIMENSION, JPEG_QUALITY, {
        watermarkLines,
        exif: { latitude: capture.latitude, longitude: capture.longitude, takenAt }
      })
    } else {
      processed = await compressFileToBlob(file, MAX_DIMENSION, JPEG_QUALITY)
    }
    if (processed.byteLength > MAX_PHOTO_BYTES) {
      throw new Error(`Foto após compressão excede ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)}MB`)
    }
    const localId = uid()
    const storagePath = `fiscalizacoes/${fiscalizacaoLocalId}/${unidadeId}/${localId}.jpg`
    const item: OfflineFoto = {
      localId,
      unidadeLocalId: unidadeId,
      blob: processed.blob,
      legenda: '',
      mimeType: processed.mimeType,
      width: processed.width,
      height: processed.height,
      storagePath,
      attempts: 0,
      lastError: '',
      created_at: now()
    }
    await db.fotos_local.add(item)
    const previewUrl = localFotoPreviewUrl(item)
    return { ...item, previewUrl }
  },

  async listLocalFotos(unidadeId: string): Promise<OfflineFoto[]> {
    const list = await db.fotos_local.where('unidadeLocalId').equals(unidadeId).toArray()
    return list.map((f) => ({ ...f, url: localFotoPreviewUrl(f) } as any))
  },

  async updateLocalFotoLegenda(localId: string, legenda: string): Promise<void> {
    const item = await db.fotos_local.get(localId as any)
    if (item) {
      await db.fotos_local.update(localId as any, { ...item, legenda })
    }
  },

  async deleteLocalFoto(localId: string): Promise<void> {
    await db.fotos_local.delete(localId as any)
    const u = localFotoUrlCache.get(localId)
    if (u) {
      URL.revokeObjectURL(u)
      localFotoUrlCache.delete(localId)
    }
  },

  async markLocalFotoSynced(localId: string, publicUrl: string): Promise<void> {
    const item = await db.fotos_local.get(localId as any)
    if (item) {
      await db.fotos_local.update(localId as any, { ...item, url: publicUrl, syncedAt: now(), lastError: '' })
    }
  },

  async removeUnidade(unidadeId: string): Promise<void> {
    await db.transaction('rw', db.unidades, db.constatacoes_manuais, db.respostas, db.fotos, async () => {
      const fotos = await db.fotos.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
      for (const f of fotos) {
        await db.fotos.delete((f as any).id)
      }
      const respostas = await db.respostas.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
      for (const r of respostas) {
        await db.respostas.delete(r.id)
      }
      const constatacoes = await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
      for (const c of constatacoes) {
        await db.constatacoes_manuais.delete(c.id)
      }
      await db.unidades.delete(unidadeId)
    })
    await enqueueMutation({ id: unidadeId }, 'delete', 'unidades')
  },

  async removeConstatacaoManual(id: string): Promise<void> {
    await db.constatacoes_manuais.delete(id)
    await enqueueMutation({ id }, 'delete', 'constatacoes_manuais')
  },

  async updateConstatacaoManual(id: string, changes: Partial<ConstatacaoManual>): Promise<void> {
    const cur = await db.constatacoes_manuais.get(id as any)
    const cleaned: any = {}
    for (const [k, v] of Object.entries(changes || {})) {
      if (v !== undefined) cleaned[k] = v
    }
    const next = { ...(cur as any), ...cleaned, updated_at: now() }
    await db.constatacoes_manuais.update(id, next)
    await enqueueMutation(
      {
        id,
        unidade_fiscalizada_id: (cur as any)?.unidade_fiscalizada_id,
        ...cleaned,
        updated_at: now()
      },
      'update',
      'constatacoes_manuais'
    )
  },

  async updateUnidadeStatus(unidadeId: string, status: string): Promise<void> {
    const u = await db.unidades.get(unidadeId)
    if (u) {
      await db.unidades.update(unidadeId, { ...u, status, updated_at: now() })
    }
    if (status === 'finalizada') {
      await enqueueMutation({ id: unidadeId }, 'finalize', 'finalizacao_unidade')
    } else {
      await enqueueMutation({ id: unidadeId, status }, 'update', 'unidades')
    }
  },

  async updateUnidadeCodigo(unidadeId: string, codigo_unidade: string): Promise<void> {
    const u = await db.unidades.get(unidadeId)
    if (u) {
      await db.unidades.update(unidadeId, { ...u, codigo_unidade, updated_at: now() })
    }
    await enqueueMutation({ id: unidadeId, codigo_unidade, updated_at: now() }, 'update', 'unidades')
  },

  async updateUnidadeEndereco(unidadeId: string, endereco: string): Promise<void> {
    const u = await db.unidades.get(unidadeId)
    if (u) {
      await db.unidades.update(unidadeId, { ...u, endereco, updated_at: now() })
    }
    await enqueueMutation({ id: unidadeId, endereco, updated_at: now() }, 'update', 'unidades')
  },
  
  async finalizarFiscalizacao(fiscalizacaoId: string): Promise<void> {
    const unidades = await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId).toArray()
    const pendente = unidades.find((u) => u.status !== 'finalizada')
    if (pendente) {
      throw new Error(`Finalize a vistoria da unidade "${pendente.nome_unidade || pendente.tipo_unidade_nome}" antes de finalizar a fiscalização.`)
    }
    const local = await db.fiscalizacoes.get(fiscalizacaoId as any)
    if (local) {
      await db.fiscalizacoes.update(fiscalizacaoId as any, { 
        ...local, 
        status: 'finalizada', 
        numero_termo: local.numero_termo, 
        data_fim: now(), 
        updated_at: now() 
      })
    }
    await enqueueMutation({ id: fiscalizacaoId }, 'finalize', 'finalizacao_fiscalizacao')
  },

  async reabrirFiscalizacao(fiscalizacaoId: string): Promise<void> {
    const local = await db.fiscalizacoes.get(fiscalizacaoId as any)
    if (local) {
      await db.fiscalizacoes.update(fiscalizacaoId as any, { 
        ...local, 
        status: 'em_andamento', 
        data_fim: null, 
        updated_at: now() 
      })
    }
    await enqueueMutation({ id: fiscalizacaoId, status: 'em_andamento', data_fim: null }, 'reopen' as any, 'reabrir_fiscalizacao' as any)
  }
}
