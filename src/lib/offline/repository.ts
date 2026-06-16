import { db, Foto, Fiscalizacao, Unidade, ItemChecklist, RespostaChecklist, ConstatacaoManual, OfflineFoto, Contrato } from './db'
import { enqueueMutation } from './syncEngine'
import { compressFileToBlob, MAX_DIMENSION, JPEG_QUALITY, MAX_PHOTOS_PER_UNIDADE, MAX_PHOTO_BYTES } from './image'
import { getOrCreatePreviewUrl, revokePreviewUrl } from './photoPreviewCache'
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
  height: typeof f.height === 'number' ? f.height : undefined,
  localId: typeof (f as any)?.localId === 'string' ? String((f as any).localId) : undefined
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

const localFotoPreviewUrl = (f: OfflineFoto): string => {
  return getOrCreatePreviewUrl(f.localId, f.blob as any, (f as any).base64 as any, (f as any).url as any)
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const formatDateBR = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
const formatTimeBR = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`

const canonicalNumeroRecomendacao = (v: any): string => {
  const digits = String(v ?? '').replace(/[^\d]/g, '')
  const n = parseInt(digits, 10)
  return Number.isFinite(n) ? `R${n}` : ''
}

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
  
  async listPrestadores(diretoriaId?: string): Promise<{ id: string; nome: string }[]> {
    let list = await db.prestadores.toArray()
    const SERVICES_BY_DIRETORIA: Record<string, string[]> = {
      dsb: ['Abastecimento de Água', 'Esgotamento Sanitário', 'Limpeza Urbana', 'Manejo de Resíduos Sólidos', 'Drenagem Urbana'],
      dtr: ['Rodovias'],
      dge: ['Energia Elétrica', 'Gás Canalizado', 'Iluminação Pública']
    }
    if (diretoriaId && SERVICES_BY_DIRETORIA[diretoriaId]) {
      const allowed = SERVICES_BY_DIRETORIA[diretoriaId]
      list = list.filter((p: any) => 
        Array.isArray(p.tipo_servico) && p.tipo_servico.some((s: string) => allowed.includes(s))
      )
    }
    return list.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  },
  
  async listPrestadoresFull(diretoriaId?: string): Promise<any[]> {
    let list = await db.prestadores.toArray()
    const SERVICES_BY_DIRETORIA: Record<string, string[]> = {
      dsb: ['Abastecimento de Água', 'Esgotamento Sanitário', 'Limpeza Urbana', 'Manejo de Resíduos Sólidos', 'Drenagem Urbana'],
      dtr: ['Rodovias'],
      dge: ['Energia Elétrica', 'Gás Canalizado', 'Iluminação Pública']
    }
    if (diretoriaId && SERVICES_BY_DIRETORIA[diretoriaId]) {
      const allowed = SERVICES_BY_DIRETORIA[diretoriaId]
      list = list.filter((p: any) => 
        Array.isArray(p.tipo_servico) && p.tipo_servico.some((s: string) => allowed.includes(s))
      )
    }
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
  
  async listContratos(): Promise<Contrato[]> {
    const list = await db.contratos.toArray()
    return list.slice().sort((a, b) => (a.numero_contrato || '').localeCompare(b.numero_contrato || '', 'pt-BR'))
  },

  async getContratoById(id: string): Promise<Contrato | null> {
    const row = await db.contratos.get(id as any)
    return row || null
  },

  async createContrato(data: any): Promise<string> {
    const id = uid()
    const item = { id, ...data, created_at: now(), updated_at: now() }
    await db.contratos.add(item as any)
    await enqueueMutation(item, 'insert', 'contratos')
    return id
  },

  async updateContrato(id: string, changes: any): Promise<void> {
    const cur = await db.contratos.get(id as any)
    if (cur) {
      const next = { ...cur, ...changes, updated_at: now() }
      await db.contratos.update(id as any, next)
      await enqueueMutation({ id, ...changes }, 'update', 'contratos')
    }
  },

  async deleteContrato(id: string): Promise<void> {
    await db.contratos.delete(id as any)
    await enqueueMutation({ id }, 'delete', 'contratos')
  },

  // --- Tipos de Ocorrência DTR ---

  async listTiposOcorrenciaDTR(rodovia?: string | null): Promise<import('./db').TipoOcorrenciaDTR[]> {
    const local = await db.tipos_ocorrencia_dtr.filter(t => t.ativo !== false).toArray()
    const byRodovia = (list: import('./db').TipoOcorrenciaDTR[]) => {
      if (!rodovia) return list
      return list.filter(t => {
        if (!t.rodovia) return true
        return t.rodovia.split('/').map(r => r.trim()).includes(rodovia)
      })
    }
    if (local.length > 0) return byRodovia(local).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))

    // Fallback: buscar do Supabase e armazenar localmente
    try {
      const { data, error } = await supabase
        .from('tipos_ocorrencia_dtr')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error || !data) return []
      await db.tipos_ocorrencia_dtr.bulkPut(data as any)
      return byRodovia(data as any)
    } catch {
      return []
    }
  },

  async syncTiposOcorrenciaDTR(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('tipos_ocorrencia_dtr')
        .select('*')
        .order('nome')
      if (error || !data) return 0
      await db.tipos_ocorrencia_dtr.clear()
      await db.tipos_ocorrencia_dtr.bulkPut(data as any)
      return data.length
    } catch {
      return 0
    }
  },

  async upsertTiposOcorrenciaDTR(tipos: Array<{ nome: string; gera_nc: boolean; item_contrato?: string; nao_atendimento?: string; prazo_dias_padrao?: number; descricao?: string; observacoes?: string; rodovia?: string | null }>): Promise<void> {
    if (!tipos || tipos.length === 0) return

    const rows = tipos.map(t => ({
      id: uid(),
      nome: (t.nome || '').trim(),
      gera_nc: !!t.gera_nc,
      item_contrato: t.item_contrato || null,
      nao_atendimento: t.nao_atendimento || null,
      prazo_dias_padrao: t.prazo_dias_padrao ? Number(t.prazo_dias_padrao) : null,
      descricao: t.descricao || null,
      observacoes: t.observacoes || null,
      rodovia: t.rodovia || null,
      ativo: true,
      created_at: now(),
      updated_at: now()
    })).filter(r => r.nome)

    // Limpar e reinserir no Supabase
    const { error: delErr } = await supabase.from('tipos_ocorrencia_dtr').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (delErr) throw new Error('Falha ao limpar tipos antigos: ' + delErr.message)

    const { error: insErr } = await supabase.from('tipos_ocorrencia_dtr').insert(rows)
    if (insErr) throw new Error('Falha ao inserir tipos: ' + insErr.message)

    // Sincronizar localmente
    await db.tipos_ocorrencia_dtr.clear()
    await db.tipos_ocorrencia_dtr.bulkPut(rows as any)
  },

  // --- KML por Contrato/Rodovia ---

  async uploadKMLForContrato(contratoId: string, kmlText: string, rodoviaName: string): Promise<string> {
    const path = `${rodoviaName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${contratoId.substring(0, 8)}.kml`
    const blob = new Blob([kmlText], { type: 'application/vnd.google-earth.kml+xml' })
    const { error: upErr } = await supabase.storage.from('kml-rodovias').upload(path, blob, { upsert: true })
    if (upErr) throw new Error('Falha ao enviar KML: ' + upErr.message)

    const kmlUrl = `storage://kml-rodovias/${path}`

    const cur = await db.contratos.get(contratoId as any)
    if (cur) {
      await db.contratos.update(contratoId as any, { ...cur, kml_url: kmlUrl, updated_at: now() })
    }

    const { error: updErr } = await supabase.from('contratos').update({ kml_url: kmlUrl }).eq('id', contratoId)
    if (updErr) throw new Error('Falha ao salvar URL do KML no contrato: ' + updErr.message)

    return kmlUrl
  },

  async downloadKMLForRodovia(rodovia: string): Promise<string | null> {
    try {
      const contratos = await db.contratos.where('rodovia').equals(rodovia).toArray()
      const contrato = contratos[0]
      if (!contrato?.kml_url) return null

      const parsed = Repository.parseStorageUrl(contrato.kml_url)
      if (!parsed) return null

      const { data, error } = await supabase.storage.from(parsed.bucket).download(parsed.path)
      if (error || !data) return null

      return await data.text()
    } catch {
      return null
    }
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
  
  async createFiscalizacao(data: Partial<Fiscalizacao> & { municipio_id?: string; prestador_servico_id?: string; servicos?: string[]; fiscal_email?: string; fiscal_nome?: string; latitude_inicio?: number; longitude_inicio?: number; tipo_modulo?: string; rodovia?: string }): Promise<Fiscalizacao> {
    const id = uid()
    const muni = data.municipio_id ? await db.municipios.get(data.municipio_id as any) : null
    const prest = data.prestador_servico_id ? await db.prestadores.get(data.prestador_servico_id as any) : null
    
    const item: Fiscalizacao = {
      id,
      municipio_id: data.municipio_id,
      municipio_nome: muni?.nome || undefined,
      prestador_servico_id: data.prestador_servico_id,
      prestador_servico_nome: prest?.nome || undefined,
      servico: Array.isArray(data.servicos) ? data.servicos.join(', ') : data.servico,
      status: data.status || 'em_andamento',
      data_inicio: now(),
      fiscal_email: data.fiscal_email,
      fiscal_nome: data.fiscal_nome,
      tipo_modulo: data.tipo_modulo || 'saneamento_dsb',
      rodovia: data.rodovia || undefined,
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
    const ord = (x: any) => {
      const n = Number(x?.ordem)
      return Number.isFinite(n) && n > 0 ? n : 999999
    }
    return all
      .slice()
      .sort(
        (a: any, b: any) =>
          ord(a) - ord(b) ||
          String(a?.created_at || '').localeCompare(String(b?.created_at || '')) ||
          String(a?.id || '').localeCompare(String(b?.id || ''))
      )
      .slice(0, limit)
  },

  async reorderUnidades(fiscalizacaoId: string, orderedUnidadeIds: string[]): Promise<void> {
    if (!fiscalizacaoId) return
    const ids = (Array.isArray(orderedUnidadeIds) ? orderedUnidadeIds : []).map((x) => String(x || '')).filter(Boolean)
    if (ids.length === 0) return
    const unidades = await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId).toArray()
    const byId = new Map<string, any>()
    for (const u of unidades as any[]) byId.set(String((u as any)?.id || ''), u)
    const nowIso = now()
    await db.transaction('rw', db.unidades, db.fila_mutacoes, db.estados_sync, async () => {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]
        const u = byId.get(id)
        if (!u) continue
        const nextOrdem = i + 1
        if (Number((u as any)?.ordem) !== nextOrdem) {
          await db.unidades.update(id as any, { ...(u as any), ordem: nextOrdem, updated_at: nowIso } as any)
          await enqueueMutation({ id, ordem: nextOrdem, updated_at: nowIso }, 'update', 'unidades')
        }
      }
    })
  },
  
  async createUnidade(data: { fiscalizacao_id: string; tipo_unidade_id: string; codigo_unidade?: string; nome_unidade?: string; endereco?: string; latitude?: number | null; longitude?: number | null; data_hora_vistoria?: string; rodovia?: string; trecho?: string; km?: string; sentido?: string; per?: string; frente?: string; tipo_ocorrencia?: string; gravidade?: string; nao_atendimento?: string; prazo_dias_nc?: number | null }): Promise<Unidade> {
    const id = uid()
    const all = await db.unidades.where('fiscalizacao_id').equals(data.fiscalizacao_id).toArray()
    const maxOrdem = (all || []).reduce((acc: number, u: any) => Math.max(acc, Number(u?.ordem) || 0), 0)
    const item: Unidade = {
      id,
      fiscalizacao_id: data.fiscalizacao_id,
      tipo_unidade_id: data.tipo_unidade_id,
      codigo_unidade: data.codigo_unidade || '',
      nome_unidade: data.nome_unidade || '',
      ordem: maxOrdem + 1,
      status: 'em_andamento',
      endereco: data.endereco || '',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      data_hora_vistoria: data.data_hora_vistoria || now(),
      rodovia: data.rodovia || undefined,
      trecho: data.trecho || undefined,
      km: data.km || undefined,
      sentido: data.sentido || undefined,
      per: data.per || undefined,
      frente: data.frente || undefined,
      tipo_ocorrencia: data.tipo_ocorrencia || undefined,
      gravidade: data.gravidade || undefined,
      nao_atendimento: data.nao_atendimento || undefined,
      prazo_dias_nc: data.prazo_dias_nc ?? null,
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
    const parseR = (v: any) => {
      const n = parseInt(canonicalNumeroRecomendacao(v).replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : 999999
    }
    return (list || []).sort((a: any, b: any) => {
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
      numero_recomendacao: null,
      descricao,
      origem,
      created_at: now(),
      updated_at: now()
    }
    await db.recomendacoes.add(item as any)
    await enqueueMutation(item, 'insert', 'recomendacoes')
    await Repository.recomputeRecomendacoesNumeracao(unidadeId)
  },

  async removeRecomendacao(id: string): Promise<void> {
    const cur = await db.recomendacoes.get(id as any)
    const unidadeId = cur?.unidade_fiscalizada_id
    await db.recomendacoes.delete(id as any)
    await enqueueMutation({ id, unidade_fiscalizada_id: unidadeId }, 'delete', 'recomendacoes')
    if (unidadeId) {
      await Repository.recomputeRecomendacoesNumeracao(unidadeId)
    }
  },

  async updateRecomendacao(id: string, changes: Partial<import('./db').Recomendacao>): Promise<void> {
    const cur = await db.recomendacoes.get(id as any)
    if (!cur) return
    const unidadeId = cur?.unidade_fiscalizada_id
    if (!unidadeId) return
    const next = { ...cur, ...changes, updated_at: now() }
    await db.recomendacoes.update(id as any, next as any)
    await enqueueMutation(next, 'update', 'recomendacoes')
  },

  async recomputeRecomendacoesNumeracao(unidadeId: string): Promise<void> {
    if (!unidadeId) return
    const list = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()

    const parseR = (v: any) => {
      const n = parseInt(canonicalNumeroRecomendacao(v).replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : null
    }

    const timeOf = (r: any) => {
      const iso = String(r?.created_at || r?.updated_at || '')
      const t = Date.parse(iso)
      return Number.isFinite(t) ? t : 0
    }

    const itens = (list || [])
      .filter((r: any) => String(r?.descricao || '').trim() !== '')
      .map((r: any) => ({ r, id: r.id, k: parseR(r?.numero_recomendacao), t: timeOf(r) }))
      .sort((a, b) => {
        if (a.k !== null && b.k !== null && a.k !== b.k) return a.k - b.k
        if (a.k !== null && b.k === null) return -1
        if (a.k === null && b.k !== null) return 1
        if (a.t !== b.t) return a.t - b.t
        return String(a.id).localeCompare(String(b.id))
      })

    for (const it of itens) {
      const r = it.r
      if (r?.numero_recomendacao) {
        await db.recomendacoes.update(r.id as any, { ...r, numero_recomendacao: null, updated_at: now() } as any)
        await enqueueMutation({ id: r.id, unidade_fiscalizada_id: unidadeId, numero_recomendacao: null, updated_at: now() }, 'update', 'recomendacoes')
      }
    }

    for (let i = 0; i < itens.length; i++) {
      const desired = `R${i + 1}`
      const r = itens[i].r
      await db.recomendacoes.update(r.id as any, { ...r, numero_recomendacao: desired, updated_at: now() } as any)
      await enqueueMutation(
        { id: r.id, unidade_fiscalizada_id: unidadeId, numero_recomendacao: desired, updated_at: now() },
        'update',
        'recomendacoes'
      )
    }
  },

  async reorderRecomendacoes(unidadeId: string, orderedIds: string[]): Promise<void> {
    if (!unidadeId) return
    const ids = (Array.isArray(orderedIds) ? orderedIds : []).filter(Boolean)
    const rows = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const byId = new Map((rows || []).map((r: any) => [String(r.id), r]))
    const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean) as any[]
    for (const r of rows || []) {
      if (!ids.includes(String((r as any).id))) ordered.push(r as any)
    }

    for (const r of ordered) {
      if ((r as any)?.numero_recomendacao) {
        await db.recomendacoes.update((r as any).id, { ...(r as any), numero_recomendacao: null, updated_at: now() } as any)
        await enqueueMutation(
          { id: (r as any).id, unidade_fiscalizada_id: unidadeId, numero_recomendacao: null, updated_at: now() },
          'update',
          'recomendacoes'
        )
      }
    }

    for (let i = 0; i < ordered.length; i++) {
      const r = ordered[i] as any
      const desired = `R${i + 1}`
      await db.recomendacoes.update(r.id, { ...r, numero_recomendacao: desired, updated_at: now() } as any)
      await enqueueMutation({ id: r.id, unidade_fiscalizada_id: unidadeId, numero_recomendacao: desired, updated_at: now() }, 'update', 'recomendacoes')
    }
  },

  async syncRecomendacoesFromChecklist(
    unidadeId: string,
    itensChecklist: any[],
    respostasAtuais: any[]
  ): Promise<void> {
    if (!unidadeId) return
    const itens = Array.isArray(itensChecklist) ? itensChecklist : []
    const respostas = Array.isArray(respostasAtuais) ? respostasAtuais : []

    const byItem = new Map<string, any>()
    for (const r of respostas) {
      const itemId = String(r?.item_checklist_id || '')
      if (itemId) byItem.set(itemId, r)
    }

    const list = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const byOrigem = new Map<string, any>()
    for (const r of list || []) {
      const o = String((r as any)?.origem || '').trim()
      if (o) byOrigem.set(o, r)
    }

    const shouldHaveRec = (item: any, resp: any): { ok: boolean; desc?: string } => {
      const r = String(resp?.resposta || '').toUpperCase()
      const geraNc = !!item?.gera_nc
      const temDet = String(item?.texto_determinacao || '').trim() !== ''
      const recTxt = String(item?.texto_recomendacao || '').trim()
      if (r !== 'NAO' && r !== 'NÃO') return { ok: false }
      if (!geraNc) return { ok: false }
      if (temDet) return { ok: false }
      if (!recTxt) return { ok: false }
      return { ok: true, desc: recTxt }
    }

    const adds: any[] = []
    const deletes: any[] = []

    for (const item of itens) {
      const itemId = String(item?.id || '').trim()
      if (!itemId) continue
      const origem = `checklist:${itemId}`
      const resp = byItem.get(itemId)
      const s = shouldHaveRec(item, resp)
      const existing = byOrigem.get(origem)
      if (s.ok) {
        if (!existing) {
          const id = uid()
          adds.push({
            id,
            unidade_fiscalizada_id: unidadeId,
            numero_recomendacao: null,
            descricao: String(s.desc || ''),
            origem,
            created_at: now(),
            updated_at: now()
          })
        }
      } else {
        if (existing) {
          deletes.push(existing)
        }
      }
    }

    for (const r of deletes) {
      await db.recomendacoes.delete((r as any).id)
      await enqueueMutation({ id: (r as any).id, unidade_fiscalizada_id: unidadeId }, 'delete', 'recomendacoes')
    }
    for (const r of adds) {
      await db.recomendacoes.add(r as any)
      await enqueueMutation(r, 'insert', 'recomendacoes')
    }

    if (adds.length > 0 || deletes.length > 0) {
      await Repository.recomputeRecomendacoesNumeracao(unidadeId)
    }
  },

  async syncRecomendacaoFromChecklistItem(unidadeId: string, item: any, resposta: any): Promise<void> {
    if (!unidadeId) return
    const itemId = String(item?.id || '').trim()
    if (!itemId) return
    const origem = `checklist:${itemId}`

    const r = String(resposta?.resposta || '').toUpperCase()
    const geraNc = !!item?.gera_nc
    const temDet = String(item?.texto_determinacao || '').trim() !== ''
    const recTxt = String(item?.texto_recomendacao || '').trim()
    const should = (r === 'NAO' || r === 'NÃO') && geraNc && !temDet && recTxt !== ''

    const list = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const existing = (list || []).find((x: any) => String(x?.origem || '').trim() === origem)

    if (should) {
      if (!existing) {
        const id = uid()
        const row = {
          id,
          unidade_fiscalizada_id: unidadeId,
          numero_recomendacao: null,
          descricao: recTxt,
          origem,
          created_at: now(),
          updated_at: now()
        }
        await db.recomendacoes.add(row as any)
        await enqueueMutation(row, 'insert', 'recomendacoes')
        await Repository.recomputeRecomendacoesNumeracao(unidadeId)
      }
      return
    }

    if (existing) {
      await db.recomendacoes.delete((existing as any).id)
      await enqueueMutation({ id: (existing as any).id, unidade_fiscalizada_id: unidadeId }, 'delete', 'recomendacoes')
      await Repository.recomputeRecomendacoesNumeracao(unidadeId)
    }
  },
  
  async countDeterminacoesByUnidade(unidadeId: string): Promise<number> {
    if (!unidadeId) return 0
    return db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId).count()
  },

  async upsertDeterminacaoByOrigem(
    unidadeId: string,
    origem: string,
    descricao?: string | null,
    prazoDias?: number | null
  ): Promise<void> {
    if (!unidadeId) return
    const origemFinal = String(origem || '').trim()
    if (!origemFinal) return
    const list = await db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const existing = (list || []).find((x: any) => String(x?.origem || '').trim() === origemFinal)
    const descRaw = String(descricao || '').trim()
    const lowerDesc = descRaw.toLowerCase()
    const alreadyPrefixed = lowerDesc.startsWith('para sanar') || lowerDesc.startsWith('sanar')
    const desc = descRaw && !alreadyPrefixed ? `Sanar NC?. ${descRaw}` : descRaw
    const prazo = prazoDias !== undefined && prazoDias !== null ? Number(prazoDias) : null
    const prazoOk = Number.isFinite(prazo as any) && (prazo as any) > 0 ? (prazo as any) : null
    const dataLimite = prazoOk ? new Date(Date.now() + prazoOk * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null

    if (!desc) {
      if (existing) {
        await db.determinacoes.delete((existing as any).id)
        await enqueueMutation({ id: (existing as any).id, unidade_fiscalizada_id: unidadeId }, 'delete', 'determinacoes' as any)
        await Repository.recomputeDeterminacoesNumeracao(unidadeId)
      }
      return
    }

    if (existing) {
      const next = {
        ...(existing as any),
        descricao: desc,
        prazo_dias: prazoOk ?? (existing as any)?.prazo_dias ?? null,
        data_limite: prazoOk ? dataLimite : (existing as any)?.data_limite ?? null,
        status: String((existing as any)?.status || '').trim() || 'pendente',
        updated_at: now()
      }
      await db.determinacoes.update((existing as any).id, next as any)
      await enqueueMutation(next, 'update', 'determinacoes' as any)
      await Repository.recomputeDeterminacoesNumeracao(unidadeId)
      return
    }

    const id = uid()
    const row = {
      id,
      unidade_fiscalizada_id: unidadeId,
      numero_determinacao: null,
      descricao: desc,
      prazo_dias: prazoOk,
      data_limite: dataLimite,
      status: 'pendente',
      origem: origemFinal,
      created_at: now(),
      updated_at: now()
    }
    await db.determinacoes.add(row as any)
    await enqueueMutation(row, 'insert', 'determinacoes' as any)
    await Repository.recomputeDeterminacoesNumeracao(unidadeId)
  },

  async listDeterminacoesByUnidade(unidadeId: string): Promise<any[]> {
    if (!unidadeId) return []
    const list = await db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const parseD = (v: any) => {
      const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : 999999
    }
    const timeOf = (x: any) => {
      const iso = String(x?.updated_at || x?.created_at || '')
      const t = Date.parse(iso)
      return Number.isFinite(t) ? t : 0
    }
    const keyOf = (d: any) => {
      const nc = String((d as any)?.nao_conformidade_id || '').trim()
      if (nc) return `nc:${nc}`
      const orig = String((d as any)?.origem || '').trim()
      if (orig) return `orig:${orig}`
      return `id:${String((d as any)?.id || '')}`
    }
    const chosen = new Map<string, any>()
    for (const d of list || []) {
      if (String(d?.descricao || '').trim() === '') continue
      const k = keyOf(d)
      const prev = chosen.get(k)
      if (!prev) {
        chosen.set(k, d)
      } else {
        const a = timeOf(prev)
        const b = timeOf(d)
        if (b > a) chosen.set(k, d)
      }
    }
    return Array.from(chosen.values()).sort(
      (a: any, b: any) => parseD(a?.numero_determinacao) - parseD(b?.numero_determinacao) || timeOf(b) - timeOf(a) || String(a?.id || '').localeCompare(String(b?.id || ''))
    )
  },

  async addDeterminacao(unidadeId: string, descricao: string, origem: string = 'manual'): Promise<void> {
    if (!unidadeId) return
    const desc = String(descricao || '').trim()
    if (!desc) return
    const id = uid()
    const origemFinal = String(origem || '').trim() === '' || String(origem || '').trim() === 'manual' ? `manual:${id}` : String(origem).trim()
    const row = {
      id,
      unidade_fiscalizada_id: unidadeId,
      numero_determinacao: null,
      descricao: desc,
      prazo_dias: null,
      data_limite: null,
      status: 'pendente',
      origem: origemFinal,
      created_at: now(),
      updated_at: now()
    }
    await db.determinacoes.add(row as any)
    await enqueueMutation(row, 'insert', 'determinacoes' as any)
    await Repository.recomputeDeterminacoesNumeracao(unidadeId)
  },

  async removeDeterminacao(id: string): Promise<void> {
    const cur = await db.determinacoes.get(id as any)
    const unidadeId = (cur as any)?.unidade_fiscalizada_id
    await db.determinacoes.delete(id as any)
    await enqueueMutation({ id, unidade_fiscalizada_id: unidadeId }, 'delete', 'determinacoes' as any)
    if (unidadeId) await Repository.recomputeDeterminacoesNumeracao(unidadeId)
  },

  async updateDeterminacao(id: string, changes: any): Promise<void> {
    const cur = await db.determinacoes.get(id as any)
    if (!cur) return
    const unidadeId = (cur as any)?.unidade_fiscalizada_id
    if (!unidadeId) return
    const next = { ...(cur as any), ...(changes || {}), updated_at: now() }
    await db.determinacoes.update(id as any, next as any)
    await enqueueMutation(next, 'update', 'determinacoes' as any)
  },

  async recomputeDeterminacoesNumeracao(unidadeId: string): Promise<void> {
    if (!unidadeId) return
    const [list, respostas, manuais] = await Promise.all([
      db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray(),
      db.respostas.where('unidade_fiscalizada_id').equals(unidadeId).toArray(),
      db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    ])
    const parseD = (v: any) => {
      const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : null
    }
    const parseC = (v: any) => {
      const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : 999999
    }
    const timeOf = (r: any) => {
      const iso = String(r?.created_at || r?.updated_at || '')
      const t = Date.parse(iso)
      return Number.isFinite(t) ? t : 0
    }
    const numConstByOrigem = new Map<string, number>()
    for (const r of respostas || []) {
      const itemId = String((r as any)?.item_checklist_id || '').trim()
      if (!itemId) continue
      numConstByOrigem.set(`checklist:${itemId}`, parseC((r as any)?.numero_constatacao))
    }
    for (const m of manuais || []) {
      const id = String((m as any)?.id || '').trim()
      if (!id) continue
      numConstByOrigem.set(`manual_constatacao:${id}`, parseC((m as any)?.numero_constatacao))
    }
    const itens = (list || [])
      .filter((d: any) => String(d?.descricao || '').trim() !== '')
      .map((d: any) => {
        const origem = String(d?.origem || '').trim()
        const cOrd = numConstByOrigem.get(origem) ?? 999999
        return { d, id: d.id, cOrd, k: parseD(d?.numero_determinacao), t: timeOf(d) }
      })
      .sort((a, b) => {
        if (a.cOrd !== b.cOrd) return a.cOrd - b.cOrd
        if (a.k !== null && b.k !== null && a.k !== b.k) return a.k - b.k
        if (a.k !== null && b.k === null) return -1
        if (a.k === null && b.k !== null) return 1
        if (a.t !== b.t) return a.t - b.t
        return String(a.id).localeCompare(String(b.id))
      })

    for (const it of itens) {
      const d = it.d
      if (d?.numero_determinacao) {
        await db.determinacoes.update(d.id as any, { ...d, numero_determinacao: null, updated_at: now() } as any)
        await enqueueMutation({ id: d.id, unidade_fiscalizada_id: unidadeId, numero_determinacao: null, updated_at: now() }, 'update', 'determinacoes' as any)
      }
    }

    for (let i = 0; i < itens.length; i++) {
      const desired = `D${i + 1}`
      const d = itens[i].d
      await db.determinacoes.update(d.id as any, { ...d, numero_determinacao: desired, updated_at: now() } as any)
      await enqueueMutation({ id: d.id, unidade_fiscalizada_id: unidadeId, numero_determinacao: desired, updated_at: now() }, 'update', 'determinacoes' as any)
    }
  },

  async reorderDeterminacoes(unidadeId: string, orderedIds: string[]): Promise<void> {
    if (!unidadeId) return
    const ids = (Array.isArray(orderedIds) ? orderedIds : []).filter(Boolean)
    const rows = await db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const byId = new Map((rows || []).map((r: any) => [String(r.id), r]))
    const ordered = ids.map((id) => byId.get(String(id))).filter(Boolean) as any[]
    for (const r of rows || []) {
      if (!ids.includes(String((r as any).id))) ordered.push(r as any)
    }
    for (const d of ordered) {
      if ((d as any)?.numero_determinacao) {
        await db.determinacoes.update((d as any).id, { ...(d as any), numero_determinacao: null, updated_at: now() } as any)
        await enqueueMutation({ id: (d as any).id, unidade_fiscalizada_id: unidadeId, numero_determinacao: null, updated_at: now() }, 'update', 'determinacoes' as any)
      }
    }
    for (let i = 0; i < ordered.length; i++) {
      const d = ordered[i] as any
      const desired = `D${i + 1}`
      await db.determinacoes.update(d.id, { ...d, numero_determinacao: desired, updated_at: now() } as any)
      await enqueueMutation({ id: d.id, unidade_fiscalizada_id: unidadeId, numero_determinacao: desired, updated_at: now() }, 'update', 'determinacoes' as any)
    }
  },

  async syncDeterminacoesFromChecklist(unidadeId: string, itensChecklist: any[], respostasAtuais: any[]): Promise<void> {
    if (!unidadeId) return
    const itens = Array.isArray(itensChecklist) ? itensChecklist : []
    const respostas = Array.isArray(respostasAtuais) ? respostasAtuais : []
    const byItem = new Map<string, any>()
    for (const r of respostas) {
      const itemId = String(r?.item_checklist_id || '')
      if (itemId) byItem.set(itemId, r)
    }
    const list = await db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const byOrigem = new Map<string, any>()
    for (const d of list || []) {
      const o = String((d as any)?.origem || '').trim()
      if (o) byOrigem.set(o, d)
    }
    const shouldHaveDet = (item: any, resp: any): { ok: boolean; desc?: string; prazo?: number | null } => {
      const r = String(resp?.resposta || '').toUpperCase()
      const geraNc = !!item?.gera_nc
      const detTxt = String(item?.texto_determinacao || '').trim()
      const prazo = item?.prazo_dias !== undefined && item?.prazo_dias !== null ? Number(item?.prazo_dias) : null
      if (r !== 'NAO' && r !== 'NÃO') return { ok: false }
      if (!geraNc) return { ok: false }
      if (!detTxt) return { ok: false }
      const lower = detTxt.toLowerCase()
      const desc = lower.startsWith('para sanar') || lower.startsWith('sanar') ? detTxt : `Sanar NC?. ${detTxt}`
      return { ok: true, desc, prazo: Number.isFinite(prazo as any) ? (prazo as any) : null }
    }
    const adds: any[] = []
    const deletes: any[] = []
    for (const item of itens) {
      const itemId = String(item?.id || '').trim()
      if (!itemId) continue
      const origem = `checklist:${itemId}`
      const resp = byItem.get(itemId)
      const s = shouldHaveDet(item, resp)
      const existing = byOrigem.get(origem)
      if (s.ok) {
        if (!existing) {
          const id = uid()
          const prazoDias = s.prazo ?? null
          adds.push({
            id,
            unidade_fiscalizada_id: unidadeId,
            numero_determinacao: null,
            descricao: String(s.desc || ''),
            prazo_dias: prazoDias,
            data_limite: prazoDias ? new Date(Date.now() + prazoDias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null,
            status: 'pendente',
            origem,
            created_at: now(),
            updated_at: now()
          })
        }
      } else {
        if (existing) deletes.push(existing)
      }
    }
    for (const d of deletes) {
      await db.determinacoes.delete((d as any).id)
      await enqueueMutation({ id: (d as any).id, unidade_fiscalizada_id: unidadeId }, 'delete', 'determinacoes' as any)
    }
    for (const d of adds) {
      await db.determinacoes.add(d as any)
      await enqueueMutation(d, 'insert', 'determinacoes' as any)
    }
    if (adds.length > 0 || deletes.length > 0) {
      await Repository.recomputeDeterminacoesNumeracao(unidadeId)
    }
  },

  async syncDeterminacaoFromChecklistItem(unidadeId: string, item: any, resposta: any): Promise<void> {
    if (!unidadeId) return
    const itemId = String(item?.id || '').trim()
    if (!itemId) return
    const origem = `checklist:${itemId}`
    const r = String(resposta?.resposta || '').toUpperCase()
    const geraNc = !!item?.gera_nc
    const detTxt = String(item?.texto_determinacao || '').trim()
    const prazo = item?.prazo_dias !== undefined && item?.prazo_dias !== null ? Number(item?.prazo_dias) : null
    const should = (r === 'NAO' || r === 'NÃO') && geraNc && detTxt !== ''
    const list = await db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const existing = (list || []).find((x: any) => String(x?.origem || '').trim() === origem)
    if (should) {
      if (!existing) {
        const id = uid()
        const prazoDias = Number.isFinite(prazo as any) ? (prazo as any) : null
        const lower = detTxt.toLowerCase()
        const desc = lower.startsWith('para sanar') || lower.startsWith('sanar') ? detTxt : `Sanar NC?. ${detTxt}`
        const row = {
          id,
          unidade_fiscalizada_id: unidadeId,
          numero_determinacao: null,
          descricao: desc,
          prazo_dias: prazoDias,
          data_limite: prazoDias ? new Date(Date.now() + prazoDias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null,
          status: 'pendente',
          origem,
          created_at: now(),
          updated_at: now()
        }
        await db.determinacoes.add(row as any)
        await enqueueMutation(row, 'insert', 'determinacoes' as any)
        await Repository.recomputeDeterminacoesNumeracao(unidadeId)
      }
      return
    }
    if (existing) {
      await db.determinacoes.delete((existing as any).id)
      await enqueueMutation({ id: (existing as any).id, unidade_fiscalizada_id: unidadeId }, 'delete', 'determinacoes' as any)
      await Repository.recomputeDeterminacoesNumeracao(unidadeId)
    }
  },

  async upsertDeterminacaoFromManualConstatacao(
    unidadeId: string,
    constatacaoId: string,
    enabled: boolean,
    descricao?: string | null
  ): Promise<void> {
    if (!unidadeId) return
    if (!constatacaoId) return
    const origem = `manual_constatacao:${String(constatacaoId)}`
    await Repository.upsertDeterminacaoByOrigem(unidadeId, origem, enabled ? descricao : null, 30)
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

    const parseC = (v: any) => {
      const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10)
      return Number.isFinite(n) ? n : null
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
      ...respostas.filter(isConstResposta).map((r) => ({ kind: 'checklist', r, id: r.id, k: parseC(r?.numero_constatacao), t: timeOf(r) })),
      ...manuais.map((m) => ({ kind: 'manual', m, id: m.id, k: parseC(m?.numero_constatacao), t: manualTimeOf(m) }))
    ].sort((a, b) => {
      if (a.k !== null && b.k !== null && a.k !== b.k) return a.k - b.k
      if (a.k !== null && b.k === null) return -1
      if (a.k === null && b.k !== null) return 1
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
    await Repository.recomputeDeterminacoesNumeracao(unidadeId)
  },

  async reorderConstatacoes(
    unidadeId: string,
    ordered: Array<{ kind: 'checklist' | 'manual'; id: string }>
  ): Promise<void> {
    if (!unidadeId) return
    const input = Array.isArray(ordered) ? ordered : []
    if (input.length === 0) return

    const respostasAll = await db.respostas.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const byRespId = new Map((respostasAll || []).map((r: any) => [String(r.id), r]))
    const manuaisAll = await db.constatacoes_manuais.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const byManId = new Map((manuaisAll || []).map((m: any) => [String(m.id), m]))

    for (let i = 0; i < input.length; i++) {
      const desired = `C${i + 1}`
      const it = input[i]
      if (it.kind === 'checklist') {
        const r: any = byRespId.get(String(it.id))
        if (!r) continue
        if (r?.numero_constatacao !== desired) {
          await db.respostas.update(r.id as any, { ...r, numero_constatacao: desired, updated_at: now() } as any)
          await enqueueMutation(
            { id: r.id, unidade_fiscalizada_id: unidadeId, item_checklist_id: r.item_checklist_id, numero_constatacao: desired, updated_at: now() },
            'update',
            'respostas'
          )
        }
      } else {
        const m: any = byManId.get(String(it.id))
        if (!m) continue
        if (m?.numero_constatacao !== desired) {
          await db.constatacoes_manuais.update(m.id as any, { ...m, numero_constatacao: desired, updated_at: now() } as any)
          await enqueueMutation({ id: m.id, unidade_fiscalizada_id: unidadeId, numero_constatacao: desired, updated_at: now() }, 'update', 'constatacoes_manuais')
        }
      }
    }
    await Repository.recomputeDeterminacoesNumeracao(unidadeId)
  },

  async updateUnidadeFotos(unidadeId: string, fotos: Partial<Foto>[]): Promise<void> {
    const unidade = await db.unidades.get(unidadeId)
    const input = Array.isArray(fotos) ? fotos : []
    const normalizedAll = input
      .map((f) => {
        const anyF: any = f as any
        const bucket = typeof anyF.bucket === 'string' ? String(anyF.bucket) : ''
        const path = typeof anyF.path === 'string' ? String(anyF.path) : ''
        if (bucket && path) {
          return normalizeFoto({ ...f, url: toStorageUrl(bucket, path), bucket, path })
        }
        const url = String(anyF.url || '')
        if (!url) return null
        if (isLocalUrl(url)) return normalizeFoto({ ...f, url })
        const parsed = Repository.parseStorageUrl(url)
        if (parsed) {
          return normalizeFoto({ ...f, url: toStorageUrl(parsed.bucket, parsed.path), bucket: parsed.bucket, path: parsed.path })
        }
        return normalizeFoto(f)
      })
      .filter(Boolean) as any
    const normalizedRemote = (normalizedAll || []).filter((f: any) => {
      const url = String(f?.url || '')
      return !!url && !isLocalUrl(url)
    }) as any
    if (unidade) {
      await db.unidades.update(unidadeId, {
        ...unidade,
        fotos_unidade: normalizedAll,
        updated_at: now()
      })
    }
    const old = await db.fotos.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    for (const f of old) {
      await db.fotos.delete((f as any).id)
    }
    for (const f of normalizedRemote) {
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
    await enqueueMutation({ unidade_fiscalizada_id: unidadeId, fotos_unidade: normalizedRemote }, 'update', 'fotos')
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

    // Lookup fiscalização upfront — needed for watermark logic in both GPS branches
    let fiscTipoModulo = ''
    let municipioNome = ''
    let codigoUnidade = String(unidade?.codigo_unidade || '').trim()
    if (!codigoUnidade) codigoUnidade = String(unidade?.nome_unidade || '').trim()
    if (!codigoUnidade) codigoUnidade = 'SEM CÓDIGO'
    if (unidade?.fiscalizacao_id) {
      const fisc = await db.fiscalizacoes.get(unidade.fiscalizacao_id as any)
      fiscTipoModulo = String(fisc?.tipo_modulo || '')
      municipioNome = String(fisc?.municipio_nome || '').trim()
      if (!municipioNome && fisc?.municipio_id) {
        const m = await db.municipios.get(fisc.municipio_id as any)
        municipioNome = String(m?.nome || '').trim()
      }
    }
    if (!municipioNome) municipioNome = 'SEM MUNICÍPIO'
    const isDtrFisc = ['rodovias_dtr', 'transportes_dtr', 'fiscal_dtr'].includes(fiscTipoModulo)

    let processed: Awaited<ReturnType<typeof compressFileToBlob>>
    if (hasCapture) {
      const takenAt = capture!.takenAt ? new Date(capture!.takenAt) : file.lastModified ? new Date(file.lastModified) : new Date()
      const exifData = { latitude: capture!.latitude, longitude: capture!.longitude, takenAt }
      const coordsText = `${capture!.latitude.toFixed(6)}, ${capture!.longitude.toFixed(6)}`
      if (isDtrFisc) {
        // DTR: data/hora + coordenadas, sem código/município
        const watermarkLines = [`${formatDateBR(takenAt)} ${formatTimeBR(takenAt)}`, coordsText]
        processed = await compressFileToBlob(file, MAX_DIMENSION, JPEG_QUALITY, { watermarkLines, exif: exifData })
      } else {
        const watermarkLines = [`${codigoUnidade}, ${municipioNome} - MS`, `${formatDateBR(takenAt)} ${formatTimeBR(takenAt)}`, coordsText]
        processed = await compressFileToBlob(file, MAX_DIMENSION, JPEG_QUALITY, { watermarkLines, exif: exifData })
      }
    } else {
      if (isDtrFisc) {
        // DTR sem GPS: apenas data/hora
        const takenAt = file.lastModified ? new Date(file.lastModified) : new Date()
        processed = await compressFileToBlob(file, MAX_DIMENSION, JPEG_QUALITY, {
          watermarkLines: [`${formatDateBR(takenAt)} ${formatTimeBR(takenAt)}`]
        })
      } else {
        processed = await compressFileToBlob(file, MAX_DIMENSION, JPEG_QUALITY)
      }
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

  async reassignLocalFotos(fromId: string, toId: string): Promise<void> {
    await db.fotos_local.where('unidadeLocalId').equals(fromId).modify({ unidadeLocalId: toId })
  },

  async updateLocalFotoLegenda(localId: string, legenda: string): Promise<void> {
    const item = await db.fotos_local.get(localId as any)
    if (item) {
      await db.fotos_local.update(localId as any, { ...item, legenda })
    }
  },

  async deleteLocalFoto(localId: string): Promise<void> {
    await db.fotos_local.delete(localId as any)
    revokePreviewUrl(localId)
  },

  async markLocalFotoSynced(localId: string, publicUrl: string): Promise<void> {
    const item = await db.fotos_local.get(localId as any)
    if (item) {
      await db.fotos_local.update(localId as any, { ...item, url: publicUrl, syncedAt: now(), lastError: '' })
    }
  },

  async removeUnidade(unidadeId: string): Promise<void> {
    await db.transaction('rw', [db.unidades, db.constatacoes_manuais, db.respostas, db.fotos, db.determinacoes], async () => {
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
      const dets = await db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
      for (const d of dets) {
        await db.determinacoes.delete((d as any).id)
      }
      await db.unidades.delete(unidadeId)
    })
    await enqueueMutation({ id: unidadeId }, 'delete', 'unidades')
  },

  async removeConstatacaoManual(id: string): Promise<void> {
    const cur = await db.constatacoes_manuais.get(id as any)
    const unidadeId = (cur as any)?.unidade_fiscalizada_id
    await db.constatacoes_manuais.delete(id)
    await enqueueMutation({ id }, 'delete', 'constatacoes_manuais')
    if (unidadeId) {
      const dets = await db.determinacoes.where('unidade_fiscalizada_id').equals(unidadeId as any).toArray()
      const origemDet = `manual_constatacao:${String(id)}`
      const existingDet = (dets || []).find((x: any) => String(x?.origem || '').trim() === origemDet)
      if (existingDet) {
        await db.determinacoes.delete((existingDet as any).id)
        await enqueueMutation({ id: (existingDet as any).id, unidade_fiscalizada_id: unidadeId }, 'delete', 'determinacoes' as any)
        await Repository.recomputeDeterminacoesNumeracao(unidadeId)
      }
      const list = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId as any).toArray()
      const origem = `manual_constatacao:${String(id)}`
      const existing = (list || []).find((x: any) => String(x?.origem || '').trim() === origem)
      if (existing) {
        await db.recomendacoes.delete((existing as any).id)
        await enqueueMutation({ id: (existing as any).id, unidade_fiscalizada_id: unidadeId }, 'delete', 'recomendacoes')
        await Repository.recomputeRecomendacoesNumeracao(unidadeId)
      }
    }
  },

  async updateConstatacaoManual(id: string, changes: Partial<ConstatacaoManual>): Promise<void> {
    const cur = await db.constatacoes_manuais.get(id as any);
    const cleaned: any = {};
    const entries = changes ? Object.keys(changes as any) : [];
    for (const k of entries) {
      const v = (changes as any)[k];
      if (v !== undefined) cleaned[k] = v;
    }
    const next = { ...(cur as any), ...cleaned, updated_at: now() };
    await db.constatacoes_manuais.update(id, next);
    await enqueueMutation(
      {
        id,
        unidade_fiscalizada_id: (cur as any)?.unidade_fiscalizada_id,
        ...cleaned,
        updated_at: now()
      },
      'update',
      'constatacoes_manuais'
    );
  },

  async upsertRecomendacaoFromManualConstatacao(
    unidadeId: string,
    constatacaoId: string,
    enabled: boolean,
    descricao?: string | null
  ): Promise<void> {
    if (!unidadeId) return
    if (!constatacaoId) return
    const origem = `manual_constatacao:${String(constatacaoId)}`
    const list = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    const existing = (list || []).find((x: any) => String(x?.origem || '').trim() === origem)
    if (!enabled) {
      if (existing) {
        await db.recomendacoes.delete((existing as any).id)
        await enqueueMutation({ id: (existing as any).id, unidade_fiscalizada_id: unidadeId }, 'delete', 'recomendacoes')
        await Repository.recomputeRecomendacoesNumeracao(unidadeId)
      }
      return
    }
    const desc = String(descricao || '').trim()
    if (!desc) return
    if (existing) {
      await db.recomendacoes.update((existing as any).id, { ...(existing as any), descricao: desc, updated_at: now() } as any)
      await enqueueMutation({ id: (existing as any).id, unidade_fiscalizada_id: unidadeId, descricao: desc, updated_at: now() }, 'update', 'recomendacoes')
      await Repository.recomputeRecomendacoesNumeracao(unidadeId)
      return
    }
    const id2 = uid()
    const row = {
      id: id2,
      unidade_fiscalizada_id: unidadeId,
      numero_recomendacao: null,
      descricao: desc,
      origem,
      created_at: now(),
      updated_at: now()
    }
    await db.recomendacoes.add(row as any)
    await enqueueMutation(row, 'insert', 'recomendacoes')
    await Repository.recomputeRecomendacoesNumeracao(unidadeId)
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

  async updateUnidadeNome(unidadeId: string, nome_unidade: string): Promise<void> {
    const u = await db.unidades.get(unidadeId)
    if (u) {
      await db.unidades.update(unidadeId, { ...u, nome_unidade, updated_at: now() })
    }
    await enqueueMutation({ id: unidadeId, nome_unidade, updated_at: now() }, 'update', 'unidades')
  },

  async updateUnidadeEndereco(unidadeId: string, endereco: string): Promise<void> {
    const u = await db.unidades.get(unidadeId)
    if (u) {
      await db.unidades.update(unidadeId, { ...u, endereco, updated_at: now() })
    }
    await enqueueMutation({ id: unidadeId, endereco, updated_at: now() }, 'update', 'unidades')
  },

  async updateUnidadeCoordenadas(unidadeId: string, coordenadas: string): Promise<void> {
    const u = await db.unidades.get(unidadeId)
    if (u) {
      await db.unidades.update(unidadeId, { ...u, coordenadas, updated_at: now() })
    }
    await enqueueMutation({ id: unidadeId, coordenadas, updated_at: now() }, 'update', 'unidades')
  },

  async updateUnidadeDTR(unidadeId: string, changes: { rodovia?: string; trecho?: string; km?: string; sentido?: string; tipo_ocorrencia?: string; latitude?: number | null; longitude?: number | null; status?: string; gravidade?: string; endereco?: string }): Promise<void> {
    const u = await db.unidades.get(unidadeId)
    if (u) {
      await db.unidades.update(unidadeId, { ...u, ...changes, updated_at: now() })
    }
    await enqueueMutation({ id: unidadeId, ...changes, updated_at: now() }, 'update', 'unidades')
  },
  
  async finalizarFiscalizacao(fiscalizacaoId: string): Promise<void> {
    // Atualiza localmente o status das unidades para 'finalizada'
    // NÃO enfileira finalizacao_unidade pois a RPC finalizar_fiscalizacao
    // já finaliza todas as unidades internamente via gerar_ncs_unidade(..., true).
    // Enfileirar ambas causava deadlock no PostgreSQL.
    const unidades = await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId).toArray()
    for (const u of unidades) {
      if (u.status !== 'finalizada') {
        await db.unidades.update(u.id, { ...u, status: 'finalizada', updated_at: now() })
      }
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

    // CRÍTICO: Limpar todas as mutações antigas de finalização da fila local
    // (finalizacao_fiscalizacao e finalizacao_unidade) para evitar que o sync
    // replay essas mutações e re-finalize a fiscalização automaticamente
    const unidades = await db.unidades.where('fiscalizacao_id').equals(fiscalizacaoId).toArray()
    const unidadeIds = new Set(unidades.map((u) => String(u.id)))

    const toDelete: any[] = []
    const allPending = await db.fila_mutacoes.where('status').anyOf('pending', 'error').toArray()
    for (const m of allPending as any[]) {
      const entity = String(m?.entity || '')
      const pid = String(m?.payload?.id || '')
      // Remove mutações de finalização da fiscalização
      if (entity === 'finalizacao_fiscalizacao' && pid === fiscalizacaoId) {
        toDelete.push(m.id)
        continue
      }
      // Remove mutações de finalização de unidades desta fiscalização
      if (entity === 'finalizacao_unidade' && unidadeIds.has(pid)) {
        toDelete.push(m.id)
        continue
      }
    }
    if (toDelete.length > 0) {
      await db.fila_mutacoes.bulkDelete(toDelete)
    }

    // Redefine o status de todas as unidades para 'em_andamento' LOCALMENTE
    // (não enfileirar mutações - a RPC fará isso no servidor!)
    for (const u of unidades) {
      await db.unidades.update(u.id, { ...u, status: 'em_andamento', updated_at: now() })
    }
    await enqueueMutation({ id: fiscalizacaoId, status: 'em_andamento', data_fim: null }, 'reopen' as any, 'reabrir_fiscalizacao' as any)
  }
}
