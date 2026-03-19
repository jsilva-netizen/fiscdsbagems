import { supabase } from '@/lib/supabase'
import { db } from '@/lib/offline/db'

const parseStorageRef = (input) => {
  if (!input) return null
  if (typeof input === 'object') {
    if (input.bucket && input.path) return { bucket: input.bucket, path: input.path }
    if (typeof input.url === 'string') return parseStorageRef(input.url)
  }
  if (typeof input !== 'string') return null
  const url = input
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
}

const removePathsByBucket = async (items) => {
  const byBucket = {}
  for (const it of items) {
    if (!it) continue
    const parsed = parseStorageRef(it)
    if (!parsed) continue
    byBucket[parsed.bucket] = byBucket[parsed.bucket] || new Set()
    byBucket[parsed.bucket].add(parsed.path)
  }
  for (const [bucket, pathsSet] of Object.entries(byBucket)) {
    const paths = Array.from(pathsSet)
    if (paths.length === 0) continue
    await supabase.storage.from(bucket).remove(paths.map((p) => p))
  }
}

const safeRemovePathsByBucket = async (items) => {
  try {
    await removePathsByBucket(items)
  } catch {}
}

export const deleteUnidadeComImagens = async (unidadeId) => {
  const { data: unidade } = await supabase
    .from('unidades_fiscalizadas')
    .select('id,fiscalizacao_id,fotos_unidade')
    .eq('id', unidadeId)
    .maybeSingle()
  const fotos = Array.isArray(unidade?.fotos_unidade) ? unidade.fotos_unidade : []
  await safeRemovePathsByBucket(fotos)
  const { error } = await supabase.from('unidades_fiscalizadas').delete().eq('id', unidadeId)
  if (error) throw error
}

export const deleteFiscalizacaoComImagens = async (fiscalizacaoId) => {
  const mapLocal = await db.id_map.where('local_id').equals(fiscalizacaoId).and((m) => m.entity === 'fiscalizacoes').first()
  const mapServer = await db.id_map.where('server_id').equals(fiscalizacaoId).and((m) => m.entity === 'fiscalizacoes').first()
  const serverId = mapLocal?.server_id || fiscalizacaoId
  const localId = mapLocal?.local_id || mapServer?.local_id || fiscalizacaoId

  // Remover relatório gerado (se existir) do Storage
  try {
    const { data: jobs } = await supabase.from('relatorios_jobs').select('id,storage_path').eq('fiscalizacao_id', serverId)
    const paths = []
    for (const j of jobs || []) {
      if (j?.storage_path) paths.push(j.storage_path)
      else if (j?.id) paths.push(`fiscalizacoes/${serverId}/${j.id}.pdf`)
    }
    const uniq = Array.from(new Set(paths.filter(Boolean)))
    if (uniq.length > 0) {
      await supabase.storage.from('relatorios_fiscalizacao').remove(uniq)
    }
    if ((jobs || []).length > 0) {
      await supabase.from('relatorios_jobs').delete().eq('fiscalizacao_id', serverId)
    }
  } catch {}

  // Remover arquivos ligados aos Termos de Notificação desta fiscalização
  try {
    const { data: termos } = await supabase
      .from('termos_notificacao')
      .select('id,arquivo_url,arquivo_protocolo_url,arquivos_resposta')
      .eq('fiscalizacao_id', serverId)
    const anexos = []
    for (const t of termos || []) {
      if (t.arquivo_url) anexos.push(t.arquivo_url)
      if (t.arquivo_protocolo_url) anexos.push(t.arquivo_protocolo_url)
      const resp = Array.isArray(t.arquivos_resposta) ? t.arquivos_resposta : []
      for (const arq of resp) {
        if (typeof arq === 'string') anexos.push(arq)
        else if (arq?.url) anexos.push(arq.url)
      }
    }
    await safeRemovePathsByBucket(anexos)
    if ((termos || []).length > 0) {
      await supabase.from('termos_notificacao').delete().eq('fiscalizacao_id', serverId)
    }
  } catch {}

  const { data: unidades } = await supabase
    .from('unidades_fiscalizadas')
    .select('id,fotos_unidade')
    .eq('fiscalizacao_id', serverId)
  const fotos = []
  const unidadeIds = []
  for (const u of unidades || []) {
    if (u?.id) unidadeIds.push(u.id)
    if (Array.isArray(u?.fotos_unidade)) {
      fotos.push(...u.fotos_unidade)
    }
  }
  await safeRemovePathsByBucket(fotos)

  // Remover fotos ligadas a NCs (se houver) desta fiscalização
  try {
    if (unidadeIds.length > 0) {
      const { data: ncs } = await supabase.from('nao_conformidades').select('id,fotos').in('unidade_fiscalizada_id', unidadeIds)
      const ncFotos = []
      for (const nc of ncs || []) {
        const arr = Array.isArray(nc?.fotos) ? nc.fotos : []
        for (const f of arr) {
          if (f) ncFotos.push(f)
        }
      }
      await safeRemovePathsByBucket(ncFotos)
    }
  } catch {}

  const { error: delFiscErr } = await supabase.from('fiscalizacoes').delete().eq('id', serverId)
  if (delFiscErr) throw delFiscErr
  // limpeza local para refletir imediatamente na UI
  await db.transaction('rw', db.unidades, db.fiscalizacoes, async () => {
    const unidadesLocal = await db.unidades.where('fiscalizacao_id').equals(localId).toArray()
    for (const u of unidadesLocal) {
      await db.unidades.delete(u.id)
    }
    await db.fiscalizacoes.delete(localId)
  })
}

export const deleteTermoNotificacaoComDependencias = async (termoId) => {
  const { data: termo, error: termoErr } = await supabase
    .from('termos_notificacao')
    .select('id,fiscalizacao_id,prestador_servico_id,arquivo_url,arquivo_rfp_url,arquivo_tn_prestador_url,arquivo_protocolo_url,arquivo_oficio_protocolo,arquivo_oficio_resposta,arquivos_resposta')
    .eq('id', termoId)
    .maybeSingle()
  if (termoErr) throw termoErr
  if (!termo) return

  const anexos = []
  if (termo.arquivo_url) anexos.push(termo.arquivo_url)
  if (termo.arquivo_rfp_url) anexos.push(termo.arquivo_rfp_url)
  if (termo.arquivo_tn_prestador_url) anexos.push(termo.arquivo_tn_prestador_url)
  if (termo.arquivo_protocolo_url) anexos.push(termo.arquivo_protocolo_url)
  if (termo.arquivo_oficio_protocolo) anexos.push(termo.arquivo_oficio_protocolo)
  if (termo.arquivo_oficio_resposta) anexos.push(termo.arquivo_oficio_resposta)
  const resp = Array.isArray(termo.arquivos_resposta) ? termo.arquivos_resposta : []
  for (const arq of resp) {
    if (typeof arq === 'string') anexos.push(arq)
    else if (arq?.url) anexos.push(arq.url)
  }
  await safeRemovePathsByBucket(anexos)

  const { data: unidades, error: unidadesErr } = await supabase
    .from('unidades_fiscalizadas')
    .select('id')
    .eq('fiscalizacao_id', termo.fiscalizacao_id)
  if (unidadesErr) throw unidadesErr
  const unidadeIds = (unidades || []).map((u) => u.id).filter(Boolean)
  if (unidadeIds.length > 0) {
    const { data: dets, error: detErr } = await supabase
      .from('determinacoes')
      .select('id')
      .in('unidade_fiscalizada_id', unidadeIds)
    if (detErr) throw detErr
    const detIds = Array.from(new Set((dets || []).map((d) => d.id).filter(Boolean)))
    try {
      for (const detId of detIds) {
        let offset = 0
        while (true) {
          const { data: files, error: listErr } = await supabase.storage
            .from('evidencias-determinacoes')
            .list(detId, { limit: 1000, offset })
          if (listErr) break
          const paths = (files || [])
            .filter((f) => f?.name)
            .map((f) => `${detId}/${f.name}`)
          if (paths.length > 0) {
            await supabase.storage.from('evidencias-determinacoes').remove(paths)
          }
          if (!files || files.length < 1000) break
          offset += 1000
        }
      }
    } catch {}
  }
  const { error: respDetErr } = await supabase
    .from('respostas_determinacao')
    .delete()
    .eq('fiscalizacao_id', termo.fiscalizacao_id)
    .eq('prestador_servico_id', termo.prestador_servico_id)
  if (respDetErr) throw respDetErr

  const { data: autos, error: autosErr } = await supabase
    .from('autos_infracao')
    .select('id,arquivo_url,arquivo_protocolo_oficio,arquivo_protocolo_ai_recebido,arquivo_defesa_oficio,arquivo_defesa')
    .eq('fiscalizacao_id', termo.fiscalizacao_id)
    .eq('prestador_servico_id', termo.prestador_servico_id)
  if (autosErr) throw autosErr
  const autoIds = []
  const autoArquivos = []
  for (const a of autos || []) {
    if (a?.id) autoIds.push(a.id)
    if (a?.arquivo_url) autoArquivos.push(a.arquivo_url)
    if (a?.arquivo_protocolo_oficio) autoArquivos.push(a.arquivo_protocolo_oficio)
    if (a?.arquivo_protocolo_ai_recebido) autoArquivos.push(a.arquivo_protocolo_ai_recebido)
    if (a?.arquivo_defesa_oficio) autoArquivos.push(a.arquivo_defesa_oficio)
    if (a?.arquivo_defesa) autoArquivos.push(a.arquivo_defesa)
  }
  await safeRemovePathsByBucket(autoArquivos)
  if (autoIds.length > 0) {
    const { data: manifs } = await supabase.from('manifestacoes_auto').select('arquivo_url').in('auto_infracao_id', autoIds)
    const arqs = []
    for (const m of manifs || []) {
      if (m?.arquivo_url) arqs.push(m.arquivo_url)
    }
    await safeRemovePathsByBucket(arqs)
    const { error: delManifsErr } = await supabase.from('manifestacoes_auto').delete().in('auto_infracao_id', autoIds)
    if (delManifsErr) throw delManifsErr
    const { error: delParecErr } = await supabase.from('pareceres_tecnicos').delete().in('auto_id', autoIds)
    if (delParecErr) throw delParecErr
    const { error: delJulgErr } = await supabase.from('julgamentos').delete().in('auto_id', autoIds)
    if (delJulgErr) throw delJulgErr
    const { error: delAutosErr } = await supabase.from('autos_infracao').delete().in('id', autoIds)
    if (delAutosErr) throw delAutosErr
  }

  const { error: delTermoErr } = await supabase.from('termos_notificacao').delete().eq('id', termoId)
  if (delTermoErr) throw delTermoErr
}
