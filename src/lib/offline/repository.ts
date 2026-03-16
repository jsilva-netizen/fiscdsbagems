import { db, Foto, Fiscalizacao, Unidade, ItemChecklist, RespostaChecklist, ConstatacaoManual, OfflineFoto } from './db'
import { enqueueMutation } from './syncEngine'
import { compressFileToBase64, MAX_PHOTOS_PER_UNIDADE, MAX_PHOTO_BYTES } from './image'
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
  legenda: f.legenda || '',
  mimeType: f.mimeType,
  width: typeof f.width === 'number' ? f.width : undefined,
  height: typeof f.height === 'number' ? f.height : undefined
})

export const Repository = {
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
    return items.sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  },
  
  async listItensChecklistAll(): Promise<ItemChecklist[]> {
    const items = await db.itens_checklist.toArray()
    return items.slice().sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
  },
  
  async createItemChecklist(data: Omit<ItemChecklist, 'id'>): Promise<string> {
    const id = uid()
    const item = { ...data, id, created_at: now() }
    await db.itens_checklist.add(item as any)
    await enqueueMutation(item, 'insert', 'itens_checklist')
    return id
  },
  
  async updateItemChecklist(id: string, changes: Partial<ItemChecklist>): Promise<void> {
    const cur = await db.itens_checklist.get(id as any)
    if (cur) {
      const next = { ...cur, ...changes }
      await db.itens_checklist.update(id as any, next)
      await enqueueMutation({ id, ...changes }, 'update', 'itens_checklist')
    }
  },
  
  async deleteItemChecklist(id: string): Promise<void> {
    await db.itens_checklist.delete(id as any)
    await enqueueMutation({ id }, 'delete', 'itens_checklist')
  },

  async listRecomendacoesByUnidade(unidadeId: string): Promise<import('./db').Recomendacao[]> {
    const list = await db.recomendacoes.where('unidade_fiscalizada_id').equals(unidadeId).toArray()
    return list.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
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
  
  async updateRespostaDeterminacaoOnline(id: string, changes: any): Promise<any> {
    const { data, error } = await supabase.from('respostas_determinacao').update(changes).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  
  async createRespostaDeterminacaoOnline(payload: any): Promise<any> {
    const { data, error } = await supabase.from('respostas_determinacao').insert(payload).select().single()
    if (error) throw error
    return data
  },
  
  async gerarNumeroAutoOnline(): Promise<string> {
    const { data, error } = await supabase.rpc('gerar_numero_auto')
    if (error) throw error
    return String(data)
  },
  
  async createAutoInfracaoOnline(payload: any): Promise<void> {
    const { error } = await supabase.from('autos_infracao').insert(payload)
    if (error) throw error
  },
  
  async updateAutoInfracaoOnlineStatus(id: string, status: string): Promise<void> {
    const { error } = await supabase.from('autos_infracao').update({ status }).eq('id', id)
    if (error) throw error
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
  
  async createJulgamentoOnline(payload: any): Promise<any> {
    const { data, error } = await supabase.from('julgamentos').insert(payload).select().single()
    if (error) throw error
    return data
  },
  
  async uploadEvidenciaDeterminacao(file: File, determinacaoId: string): Promise<{ url: string; nome: string; tipo: string; tamanho: number; data_upload: string; path: string }> {
    const bucket = 'evidencias-determinacoes'
    const nomeOriginal = file?.name || 'arquivo'
    const ext = nomeOriginal.includes('.') ? nomeOriginal.split('.').pop() : ''
    const ts = Date.now()
    const rand = Math.random().toString(36).slice(2, 8)
    const path = `${determinacaoId}/${ts}-${rand}${ext ? '.' + ext : ''}`
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type })
    if (upErr) throw upErr
    const { data: pub } = await supabase.storage.from(bucket).getPublicUrl(path)
    const meta = { url: pub?.publicUrl || '', nome: nomeOriginal, tipo: file.type || 'application/octet-stream', tamanho: file.size || 0, data_upload: new Date().toISOString(), path }
    return meta
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
      await db.respostas.update(existing.id, {
        ...existing,
        ...data
      })
      await enqueueMutation(
        {
          id: existing.id,
          unidade_fiscalizada_id: unidadeId,
          item_checklist_id: itemId,
          ...data
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
        ...data
      })
      await enqueueMutation(
        {
          id: newId,
          unidade_fiscalizada_id: unidadeId,
          item_checklist_id: itemId,
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

  async updateUnidadeFotos(unidadeId: string, fotos: Partial<Foto>[]): Promise<void> {
    const unidade = await db.unidades.get(unidadeId)
    const normalized = fotos.map(normalizeFoto)
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
    await enqueueMutation({ unidade_fiscalizada_id: unidadeId, fotos_unidade: normalized }, 'update', 'fotos')
  },

  async addLocalFotoFromFile(unidadeId: string, file: File): Promise<OfflineFoto> {
    const count = await db.fotos_local.where('unidadeLocalId').equals(unidadeId).count()
    if (count >= MAX_PHOTOS_PER_UNIDADE) {
      throw new Error(`Limite máximo de ${MAX_PHOTOS_PER_UNIDADE} fotos por unidade atingido`)
    }
    const processed = await compressFileToBase64(file)
    if (processed.byteLength > MAX_PHOTO_BYTES) {
      throw new Error(`Foto após compressão excede ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)}MB`)
    }
    const localId = uid()
    const unidade = await db.unidades.get(unidadeId as any)
    const fiscalizacaoLocalId = unidade?.fiscalizacao_id || 'unknown'
    const storagePath = `fiscalizacoes/${fiscalizacaoLocalId}/${unidadeId}/${localId}.jpg`
    const item: OfflineFoto = {
      localId,
      unidadeLocalId: unidadeId,
      base64: processed.base64,
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
    return item
  },

  async listLocalFotos(unidadeId: string): Promise<OfflineFoto[]> {
    return db.fotos_local.where('unidadeLocalId').equals(unidadeId).toArray()
  },

  async updateLocalFotoLegenda(localId: string, legenda: string): Promise<void> {
    const item = await db.fotos_local.get(localId as any)
    if (item) {
      await db.fotos_local.update(localId as any, { ...item, legenda })
    }
  },

  async deleteLocalFoto(localId: string): Promise<void> {
    await db.fotos_local.delete(localId as any)
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
    await db.constatacoes_manuais.update(id, changes)
    await enqueueMutation({ id, ...changes }, 'update', 'constatacoes_manuais')
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
  }
}
