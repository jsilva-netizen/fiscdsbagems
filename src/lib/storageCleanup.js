import { supabase } from '@/lib/supabase'
import { db } from '@/lib/offline/db'

const parsePublicUrl = (url) => {
  if (typeof url !== 'string') return null
  const marker = '/storage/v1/object/public/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const remainder = url.slice(idx + marker.length)
  const slash = remainder.indexOf('/')
  if (slash === -1) return null
  const bucket = remainder.slice(0, slash)
  const path = remainder.slice(slash + 1)
  if (!bucket || !path) return null
  return { bucket, path }
}

const removePathsByBucket = async (items) => {
  const byBucket = {}
  for (const it of items) {
    if (!it) continue
    const parsed = parsePublicUrl(typeof it === 'string' ? it : it.url)
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

export const deleteUnidadeComImagens = async (unidadeId) => {
  const { data: unidade } = await supabase
    .from('unidades_fiscalizadas')
    .select('id,fiscalizacao_id,fotos_unidade')
    .eq('id', unidadeId)
    .maybeSingle()
  const fotos = Array.isArray(unidade?.fotos_unidade) ? unidade.fotos_unidade : []
  await removePathsByBucket(fotos)
  await supabase.from('unidades_fiscalizadas').delete().eq('id', unidadeId)
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
    await removePathsByBucket(anexos)
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
  await removePathsByBucket(fotos)

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
      await removePathsByBucket(ncFotos)
    }
  } catch {}

  await supabase.from('fiscalizacoes').delete().eq('id', serverId)
  // limpeza local para refletir imediatamente na UI
  await db.transaction('rw', db.unidades, db.fiscalizacoes, async () => {
    const unidadesLocal = await db.unidades.where('fiscalizacao_id').equals(localId).toArray()
    for (const u of unidadesLocal) {
      await db.unidades.delete(u.id)
    }
    await db.fiscalizacoes.delete(localId)
  })
}
