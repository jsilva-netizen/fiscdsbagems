import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.97.0'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-worker-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function mm2pt(mm: number) {
  return mm * 2.834645669
}

async function withTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    const promise = fn()
    return await promise
  } finally {
    clearTimeout(timer)
    ctrl.abort()
  }
}

async function fetchArrayBuffer(url: string, ms: number): Promise<ArrayBuffer> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const resp = await fetch(url, { signal: ctrl.signal })
    if (!resp.ok) throw new Error(`Falha ao baixar imagem: ${resp.status}`)
    return await resp.arrayBuffer()
  } finally {
    clearTimeout(t)
  }
}

async function fetchArrayBufferRange(url: string, ms: number, maxBytes: number): Promise<ArrayBuffer> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const end = Math.max(0, Math.floor(maxBytes) - 1)
    const resp = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        Range: `bytes=0-${end}`
      }
    })
    if (!resp.ok) throw new Error(`Falha ao baixar imagem: ${resp.status}`)
    return await resp.arrayBuffer()
  } catch {
    return await fetchArrayBuffer(url, ms)
  } finally {
    clearTimeout(t)
  }
}

function wrapText(text: string, maxWidth: number, font: any, size: number): string[] {
  const raw = String(text || '').replace(/\r/g, '').trim()
  if (!raw) return ['-']
  const paragraphs = raw.split('\n')
  const lines: string[] = []
  for (const p of paragraphs) {
    const words = p.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push('')
      continue
    }
    let current = words[0]
    for (let i = 1; i < words.length; i++) {
      const next = `${current} ${words[i]}`
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next
      } else {
        lines.push(current)
        current = words[i]
      }
    }
    lines.push(current)
  }
  return lines
}

async function updateJob(adminClient: any, jobId: string, patch: Record<string, unknown>) {
  const { error } = await adminClient
    .from('relatorios_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) throw new Error(error.message)
}

async function claimJobs(adminClient: any, limit: number, specificJobId?: string) {
  const STALE_AFTER_MINUTES = 5
  try {
    const { data, error } = await adminClient.rpc('claim_relatorios_jobs', {
      p_limit: Math.max(1, Math.min(limit, 10)),
      p_job_id: specificJobId ?? null,
      p_stale_minutes: STALE_AFTER_MINUTES
    })
    if (!error && Array.isArray(data)) return data
  } catch {}

  const cutoffIso = new Date(Date.now() - STALE_AFTER_MINUTES * 60_000).toISOString()
  const claimed: any[] = []
  if (specificJobId) {
    const { data: row } = await adminClient.from('relatorios_jobs').select('*').eq('id', specificJobId).maybeSingle()
    if (!row) return claimed
    const isQueued = row.status === 'queued'
    const isStaleProcessing = row.status === 'processing' && row.updated_at && String(row.updated_at) < cutoffIso
    if (!isQueued && !isStaleProcessing) return claimed
    let updReq = adminClient
      .from('relatorios_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString(), error_message: null })
      .eq('id', specificJobId)
      .eq('status', row.status)
    if (isStaleProcessing) updReq = updReq.lt('updated_at', cutoffIso)
    const { data: upd } = await updReq.select('*').maybeSingle()
    if (upd) claimed.push(upd)
    return claimed
  }

  const { data: candidates } = await adminClient
    .from('relatorios_jobs')
    .select('*')
    .or(`status.eq.queued,and(status.eq.processing,updated_at.lt.${cutoffIso})`)
    .order('created_at', { ascending: true })
    .limit(Math.max(1, Math.min(limit * 5, 50)))

  for (const c of candidates || []) {
    if (claimed.length >= limit) break
    let updReq = adminClient
      .from('relatorios_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString(), error_message: null })
      .eq('id', c.id)
      .eq('status', c.status)
    if (c.status === 'processing') updReq = updReq.lt('updated_at', cutoffIso)
    const { data: upd } = await updReq.select('*').maybeSingle()
    if (upd) claimed.push(upd)
  }
  return claimed
}

async function generatePdfForJob(adminClient: any, job: any) {
  const { data: fisc, error: fiscErr } = await adminClient.from('fiscalizacoes').select('*').eq('id', job.fiscalizacao_id).maybeSingle()
  if (fiscErr) throw new Error(fiscErr.message)
  if (!fisc) throw new Error('Fiscalização não encontrada')

  let municipioNome = String(fisc.municipio_nome || '')
  if (!municipioNome && fisc.municipio_id) {
    try {
      const { data: mun } = await adminClient.from('municipios').select('nome').eq('id', fisc.municipio_id).maybeSingle()
      municipioNome = String(mun?.nome || '')
    } catch {}
  }

  let prestadorNome = String(fisc.prestador_servico_nome || '')
  if (!prestadorNome && fisc.prestador_servico_id) {
    try {
      const { data: pres } = await adminClient.from('prestadores_servico').select('nome').eq('id', fisc.prestador_servico_id).maybeSingle()
      prestadorNome = String(pres?.nome || '')
    } catch {}
  }

  let unidades: any[] | null = null
  try {
    const { data: u1, error: uErr1 } = await adminClient
      .from('unidades_fiscalizadas')
      .select('*')
      .eq('fiscalizacao_id', job.fiscalizacao_id)
      .order('ordem', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
    if (uErr1) throw new Error(uErr1.message)
    unidades = u1
  } catch {
    const { data: u2, error: uErr2 } = await adminClient
      .from('unidades_fiscalizadas')
      .select('*')
      .eq('fiscalizacao_id', job.fiscalizacao_id)
      .order('created_at', { ascending: true })
    if (uErr2) throw new Error(uErr2.message)
    unidades = u2
  }
  if (!Array.isArray(unidades) || unidades.length === 0) {
    throw new Error('Nenhuma unidade encontrada para esta fiscalização. Sincronize todas as unidades e tente novamente.')
  }

  // Garantia de consistência: recalcula NC/D/R e totais por unidade antes de gerar o PDF.
  // Isso evita relatório "antigo" quando houve edição/reabertura e apenas os dados base (respostas/constatações manuais)
  // foram sincronizados.
  let recalculoErr: string | null = null
  for (let i = 0; i < unidades.length; i++) {
    const u: any = unidades[i]
    try {
      await adminClient.rpc('gerar_ncs_unidade', {
        unidade_fiscalizada_id: u.id,
        p_fotos: (u as any).fotos_unidade ?? null,
        p_finalizar: false
      })
    } catch (err: any) {
      if (!recalculoErr) recalculoErr = String(err?.message || err || 'Falha ao recalcular NC/D/R')
    }
    try {
      await adminClient
        .from('relatorios_jobs')
        .update({ progress_unidades: i + 1 })
        .eq('id', job.id)
    } catch {}
  }
  if (recalculoErr) {
    throw new Error(`Falha ao recalcular NC/D/R antes do relatório: ${recalculoErr}`)
  }

  const unidadeIds = (unidades || []).map((u: any) => u.id)
  const [respsRes, manRes, ncsRes, detRes, recRes] = await Promise.all([
    unidadeIds.length
      ? adminClient.from('respostas_checklist').select('*').in('unidade_fiscalizada_id', unidadeIds)
      : Promise.resolve({ data: [] }),
    unidadeIds.length
      ? adminClient.from('constatacoes_manuais').select('*').in('unidade_fiscalizada_id', unidadeIds)
      : Promise.resolve({ data: [] }),
    unidadeIds.length
      ? adminClient.from('nao_conformidades').select('*').in('unidade_fiscalizada_id', unidadeIds)
      : Promise.resolve({ data: [] }),
    unidadeIds.length ? adminClient.from('determinacoes').select('*').in('unidade_fiscalizada_id', unidadeIds) : Promise.resolve({ data: [] }),
    unidadeIds.length ? adminClient.from('recomendacoes').select('*').in('unidade_fiscalizada_id', unidadeIds) : Promise.resolve({ data: [] })
  ])

  const todasRespostas: any[] = Array.isArray(respsRes.data) ? respsRes.data : []
  const todasConstatacoesManuais: any[] = Array.isArray(manRes.data) ? manRes.data : []
  const todasNcs: any[] = Array.isArray(ncsRes.data) ? ncsRes.data : []
  const todasDeterminacoes: any[] = Array.isArray(detRes.data) ? detRes.data : []
  const todasRecomendacoes: any[] = Array.isArray(recRes.data) ? recRes.data : []

  const parseNumeroConstatacao = (valor: unknown) => {
    const n = parseInt(String(valor || '').replace(/[^\d]/g, ''), 10)
    return Number.isFinite(n) ? n : 9999
  }

  const hasText = (v: unknown) => String(v ?? '').trim() !== ''

  const decimalToDms = (value: number, positiveRef: string, negativeRef: string) => {
    const ref = value >= 0 ? positiveRef : negativeRef
    const abs = Math.abs(value)
    let deg = Math.floor(abs)
    let minFloat = (abs - deg) * 60
    let min = Math.floor(minFloat)
    let sec = (minFloat - min) * 60

    sec = Math.round(sec * 100) / 100
    if (sec >= 60) {
      sec = 0
      min += 1
    }
    if (min >= 60) {
      min = 0
      deg += 1
    }

    let secTxt = sec.toFixed(2)
    if (sec < 10) secTxt = `0${secTxt}`
    return `${deg}° ${min}' ${secTxt}" ${ref}`
  }

  const formatCoordsDms = (lat: number, lon: number) => {
    const latTxt = decimalToDms(lat, 'N', 'S')
    const lonTxt = decimalToDms(lon, 'E', 'W')
    return `${latTxt}, ${lonTxt}`
  }

  const tryParseDecimalCoordsPair = (text: string): { lat: number; lon: number } | null => {
    const nums = String(text || '').match(/-?\d+(?:\.\d+)?/g) || []
    if (nums.length < 2) return null
    const lat = Number(nums[0])
    const lon = Number(nums[1])
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
    return { lat, lon }
  }

  const normalizeResposta = (v: unknown) => {
    const s = String(v ?? '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
    return s
  }

  const isRespostaConstatacao = (r: any) => {
    const n = normalizeResposta(r?.resposta)
    return (n === 'SIM' || n === 'NAO') && hasText(r?.pergunta)
  }

  const canonicalNumeroRecomendacao = (v: unknown) => {
    const digits = String(v ?? '').replace(/[^\d]/g, '')
    const n = parseInt(digits, 10)
    return Number.isFinite(n) ? `R${n}` : ''
  }
  const canonicalNumeroDeterminacao = (v: unknown) => {
    const digits = String(v ?? '').replace(/[^\d]/g, '')
    const n = parseInt(digits, 10)
    return Number.isFinite(n) ? `D${n}` : ''
  }

  const dedupeRespostasChecklist = (rows: any[]) => {
    const primary = new Map<string, any>()
    const alias = new Map<string, string>()

    const timeOf = (x: any) => Date.parse(String(x?.updated_at || x?.created_at || 0)) || 0
    const isNc = (x: any) => x?.gera_nc === true

    const keysOf = (r: any) => {
      const out: string[] = []
      if (r?.item_checklist_id) out.push(`item:${String(r.item_checklist_id)}`)
      if (r?.pergunta) out.push(`pergunta:${String(r.pergunta)}`)
      if (r?.numero_constatacao) out.push(`num:${String(r.numero_constatacao)}`)
      if (r?.id) out.push(`id:${String(r.id)}`)
      return out
    }

    const resolvePrimaryKey = (k: string) => alias.get(k) || (primary.has(k) ? k : undefined)

    for (const r of rows || []) {
      const keys = keysOf(r)
      let pk: string | undefined
      for (const k of keys) {
        const found = resolvePrimaryKey(k)
        if (found) {
          pk = found
          break
        }
      }
      if (!pk) pk = keys[0]
      if (!pk) continue

      const prev = primary.get(pk)
      if (!prev) {
        primary.set(pk, r)
      } else {
        const prevTime = timeOf(prev)
        const nextTime = timeOf(r)
        if (nextTime > prevTime || (nextTime === prevTime && isNc(r) && !isNc(prev))) {
          primary.set(pk, r)
        }
      }

      for (const k of keys) alias.set(k, pk)
    }

    return Array.from(primary.values())
  }

  const respostasByUnidade = new Map<string, any[]>()
  for (const u of unidades || []) {
    const raw = todasRespostas.filter((r) => r.unidade_fiscalizada_id === u.id)
    respostasByUnidade.set(String(u.id), dedupeRespostasChecklist(raw))
  }

  const mapeamentosNumeracao: any[] = []
  const contadores = { constatacoes: 0, ncs: 0, determinacoes: 0, recomendacoes: 0 }

  for (let idx = 0; idx < (unidades || []).length; idx++) {
    const u = unidades[idx]
    const respostas = respostasByUnidade.get(String(u.id)) || []
    const ncs = todasNcs.filter((n) => n.unidade_fiscalizada_id === u.id)
    const determinacoes = todasDeterminacoes.filter((d) => d.unidade_fiscalizada_id === u.id)
    const recomendacoes = (todasRecomendacoes || []).filter((r) => r.unidade_fiscalizada_id === u.id)
    const manuais = todasConstatacoesManuais.filter((m) => m.unidade_fiscalizada_id === u.id && hasText(m?.descricao))

    const mapeamentoUnidade: any = { constatacoes: {}, ncs: {}, determinacoes: {}, recomendacoes: {}, ncNumeroByOrigem: {} }

    const constItensOrdenados = [
      ...respostas
        .filter((r) => isRespostaConstatacao(r))
        .map((r) => ({ id: r.id, numero_constatacao: r.numero_constatacao, created_at: r.created_at })),
      ...manuais.map((m) => ({ id: m.id, numero_constatacao: m.numero_constatacao, created_at: m.created_at }))
    ].sort((a, b) => {
      const numA = parseNumeroConstatacao(a.numero_constatacao)
      const numB = parseNumeroConstatacao(b.numero_constatacao)
      if (numA !== numB) return numA - numB
      const createdA = a.created_at || ''
      const createdB = b.created_at || ''
      if (createdA !== createdB) return String(createdA).localeCompare(String(createdB))
      return String(a.id).localeCompare(String(b.id))
    })
    for (const c of constItensOrdenados) {
      contadores.constatacoes++
      mapeamentoUnidade.constatacoes[c.id] = contadores.constatacoes
    }

    const ncsOrd = [...ncs].sort((a, b) => {
      const respA = respostas.find((r) => r.id === a.resposta_checklist_id)
      const respB = respostas.find((r) => r.id === b.resposta_checklist_id)
      const manualA = manuais.find((cm) => !a.resposta_checklist_id && a.descricao && cm.numero_constatacao && String(a.descricao).includes(String(cm.numero_constatacao)))
      const manualB = manuais.find((cm) => !b.resposta_checklist_id && b.descricao && cm.numero_constatacao && String(b.descricao).includes(String(cm.numero_constatacao)))
      const ordConstA = respA ? mapeamentoUnidade.constatacoes[respA.id] : manualA ? mapeamentoUnidade.constatacoes[manualA.id] : 9999
      const ordConstB = respB ? mapeamentoUnidade.constatacoes[respB.id] : manualB ? mapeamentoUnidade.constatacoes[manualB.id] : 9999
      return (ordConstA ?? 9999) - (ordConstB ?? 9999)
    })
    for (const nc of ncsOrd) {
      contadores.ncs++
      mapeamentoUnidade.ncs[nc.id] = contadores.ncs
      try {
        let origemNc: string | null = null
        if (nc.resposta_checklist_id) {
          const resp = respostas.find((r) => r.id === nc.resposta_checklist_id)
          if (resp?.item_checklist_id) origemNc = `checklist:${String(resp.item_checklist_id)}`
        } else {
          const manual = manuais.find((cm) => nc.descricao && cm.numero_constatacao && String(nc.descricao).includes(String(cm.numero_constatacao)))
          if (manual?.id) origemNc = `manual_constatacao:${String(manual.id)}`
        }
        if (origemNc) mapeamentoUnidade.ncNumeroByOrigem[origemNc] = contadores.ncs
      } catch {}
    }

    const detsOrd = [...determinacoes].sort((a, b) => {
      const origA = String((a as any)?.origem || '').trim()
      const origB = String((b as any)?.origem || '').trim()
      const ordA = (mapeamentoUnidade as any)?.ncNumeroByOrigem?.[origA] ?? 9999
      const ordB = (mapeamentoUnidade as any)?.ncNumeroByOrigem?.[origB] ?? 9999
      if (ordA !== ordB) return ordA - ordB
      const numA = parseInt(canonicalNumeroDeterminacao(a?.numero_determinacao).replace('D', '') || '999', 10)
      const numB = parseInt(canonicalNumeroDeterminacao(b?.numero_determinacao).replace('D', '') || '999', 10)
      if (numA !== numB) return numA - numB
      const createdA = String(a?.created_at || '')
      const createdB = String(b?.created_at || '')
      if (createdA !== createdB) return createdA.localeCompare(createdB)
      return String(a?.id || '').localeCompare(String(b?.id || ''))
    })
    for (const det of detsOrd) {
      contadores.determinacoes++
      mapeamentoUnidade.determinacoes[det.id] = contadores.determinacoes
    }

    const recsBase = [...recomendacoes].sort((a, b) => {
      const numA = parseInt(canonicalNumeroRecomendacao(a?.numero_recomendacao).replace('R', '') || '999', 10)
      const numB = parseInt(canonicalNumeroRecomendacao(b?.numero_recomendacao).replace('R', '') || '999', 10)
      return numA - numB
    })
    for (let recIdx = 0; recIdx < recsBase.length; recIdx++) {
      const rec = recsBase[recIdx]
      contadores.recomendacoes++
      mapeamentoUnidade.recomendacoes[rec.id] = contadores.recomendacoes
    }

    mapeamentosNumeracao.push(mapeamentoUnidade)
  }

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageSize: [number, number] = [mm2pt(210), mm2pt(297)]
  const pageWidth = pageSize[0]
  const pageHeight = pageSize[1]

  const rgb255 = (r: number, g: number, b: number) => rgb(r / 255, g / 255, b / 255)
  const margin = mm2pt(10)
  const firstPageTopPadding = mm2pt(25)
  const topMargin = mm2pt(35)
  const bottomMargin = mm2pt(25)
  const tableWidth = pageWidth - 2 * margin
  const rowHeight = mm2pt(7)

  let page = pdfDoc.addPage(pageSize)
  let yPos = topMargin

  const addPage = () => {
    page = pdfDoc.addPage(pageSize)
    yPos = topMargin
  }

  const drawRectTop = (x: number, yTop: number, w: number, h: number, fill?: any, border = false) => {
    page.drawRectangle({
      x,
      y: pageHeight - yTop - h,
      width: w,
      height: h,
      color: fill || undefined,
      borderColor: border ? rgb255(0, 0, 0) : undefined,
      borderWidth: border ? 1 : 0
    })
  }

  const drawTextAt = (t: string, x: number, yBaselineTop: number, size: number, opts?: { bold?: boolean; color?: any }) => {
    const chosen = opts?.bold ? fontBold : font
    page.drawText(String(t || ''), {
      x,
      y: pageHeight - yBaselineTop,
      size,
      font: chosen,
      color: opts?.color || rgb255(0, 0, 0)
    })
  }

  const drawTextCenteredAt = (t: string, xCenter: number, yBaselineTop: number, size: number, opts?: { bold?: boolean; color?: any }) => {
    const chosen = opts?.bold ? fontBold : font
    const w = chosen.widthOfTextAtSize(String(t || ''), size)
    drawTextAt(t, xCenter - w / 2, yBaselineTop, size, opts)
  }

  const drawCell = (text: string, x: number, yTop: number, w: number, h: number, bold = false, center = false, fillColor: number[] | null = null) => {
    const fill = fillColor ? rgb255(fillColor[0], fillColor[1], fillColor[2]) : undefined
    drawRectTop(x, yTop, w, h, fill, false)
    drawRectTop(x, yTop, w, h, undefined, true)
    const size = 9
    const textY = yTop + h / 2 + mm2pt(1.5)
    const chosen = bold ? fontBold : font
    const t = String(text || '')
    if (center) {
      const tw = chosen.widthOfTextAtSize(t, size)
      drawTextAt(t, x + w / 2 - tw / 2, textY, size, { bold })
    } else {
      drawTextAt(t, x + mm2pt(2), textY, size, { bold })
    }
  }

  const formatDateTimeBR = (val: any) => {
    if (!val) return ''
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return ''
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = String(d.getFullYear())
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`
  }

  drawRectTop(0, firstPageTopPadding, pageWidth, mm2pt(40), rgb255(25, 75, 145), false)
  const titulo = fisc.numero_termo ? `TERMO DE VISTORIA AGEMS/DSB Nº ${fisc.numero_termo}` : 'RELATÓRIO DE FISCALIZAÇÃO'
  drawTextCenteredAt(titulo, pageWidth / 2, firstPageTopPadding + mm2pt(15), 20, { bold: true, color: rgb255(255, 255, 255) })
  drawTextCenteredAt(municipioNome, pageWidth / 2, firstPageTopPadding + mm2pt(25), 11, { color: rgb255(255, 255, 255) })
  const servicosList = Array.isArray(fisc.servicos)
    ? fisc.servicos
    : typeof fisc.servico === 'string'
      ? String(fisc.servico)
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean)
      : []
  if (servicosList.length > 0) drawTextCenteredAt(servicosList.join(', '), pageWidth / 2, firstPageTopPadding + mm2pt(33), 11, { color: rgb255(255, 255, 255) })

  yPos = firstPageTopPadding + mm2pt(45)
  drawTextAt('INFORMAÇÕES DA FISCALIZAÇÃO', margin, yPos, 12, { bold: true })
  yPos += mm2pt(7)
  drawTextAt(`Município: ${municipioNome}`, margin + mm2pt(2), yPos, 10)
  yPos += mm2pt(6)
  drawTextAt(`Prestador de Serviços: ${prestadorNome || '-'}`, margin + mm2pt(2), yPos, 10)
  yPos += mm2pt(6)
  const servicoLabel = Array.isArray(fisc.servicos) && fisc.servicos.length > 1 ? 'Serviços' : 'Serviço'
  drawTextAt(`${servicoLabel}: ${Array.isArray(fisc.servicos) ? fisc.servicos.join(', ') : servicosList.join(', ')}`, margin + mm2pt(2), yPos, 10)
  yPos += mm2pt(6)
  if (fisc.data_inicio) {
    drawTextAt(`Data Início: ${formatDateTimeBR(fisc.data_inicio)}`, margin + mm2pt(2), yPos, 10)
    yPos += mm2pt(6)
  }
  if (fisc.data_fim) {
    drawTextAt(`Data Fim: ${formatDateTimeBR(fisc.data_fim)}`, margin + mm2pt(2), yPos, 10)
    yPos += mm2pt(6)
  }
  if (fisc.fiscal_nome) {
    drawTextAt(`Fiscal: ${fisc.fiscal_nome}`, margin + mm2pt(2), yPos, 10)
    yPos += mm2pt(6)
  }
  yPos += mm2pt(14)

  drawRectTop(margin, yPos, tableWidth, mm2pt(8), rgb255(25, 75, 145), false)
  drawRectTop(margin, yPos, tableWidth, mm2pt(8), undefined, true)
  drawTextAt('RESUMO EXECUTIVO', margin + mm2pt(2), yPos + mm2pt(5.5), 12, { bold: true, color: rgb255(255, 255, 255) })
  yPos += mm2pt(14)

  let totalConstatacoesChecklist = 0
  for (const u of unidades || []) {
    const rs = respostasByUnidade.get(String(u.id)) || []
    totalConstatacoesChecklist += rs.filter((r) => isRespostaConstatacao(r)).length
  }
  const totalConstatacoes = totalConstatacoesChecklist + todasConstatacoesManuais.filter((m) => hasText(m?.descricao)).length
  const totalRecomendacoes = (todasRecomendacoes || []).length
  drawTextAt(`• Unidades Vistoriadas: ${(unidades || []).length}`, margin + mm2pt(2), yPos, 10)
  yPos += mm2pt(6)
  drawTextAt(`• Total de Constatações: ${totalConstatacoes}`, margin + mm2pt(2), yPos, 10)
  yPos += mm2pt(6)
  drawTextAt(`• Total de Não Conformidades: ${todasNcs.length}`, margin + mm2pt(2), yPos, 10)
  yPos += mm2pt(6)
  drawTextAt(`• Total de Recomendações: ${totalRecomendacoes}`, margin + mm2pt(2), yPos, 10)
  yPos += mm2pt(6)
  drawTextAt(`• Total de Determinações: ${todasDeterminacoes.length}`, margin + mm2pt(2), yPos, 10)

  let offsetGlobalFiguras = 0
  let processedFotos = 0
  const PHOTO_PREP_CONCURRENCY = 4
  const PHOTO_CHUNK_SIZE = 8
  const PROGRESS_UPDATE_EVERY_FOTOS = 10
  const PROGRESS_UPDATE_MIN_INTERVAL_MS = 1500
  let lastFotosProgressAt = 0
  let lastFotosProgressValue = 0

  const mapWithConcurrency = async <T, R>(items: T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> => {
    const results: R[] = new Array(items.length)
    let nextIndex = 0
    const runOne = async () => {
      while (true) {
        const i = nextIndex
        nextIndex++
        if (i >= items.length) return
        results[i] = await mapper(items[i], i)
      }
    }
    const workers = new Array(Math.max(1, Math.min(limit, items.length))).fill(0).map(() => runOne())
    await Promise.all(workers)
    return results
  }

  const maybeUpdateFotosProgress = async (force = false) => {
    const now = Date.now()
    const diff = processedFotos - lastFotosProgressValue
    if (!force && diff < PROGRESS_UPDATE_EVERY_FOTOS && now - lastFotosProgressAt < PROGRESS_UPDATE_MIN_INTERVAL_MS) return
    lastFotosProgressAt = now
    lastFotosProgressValue = processedFotos
    await updateJob(adminClient, job.id, { progress_fotos: processedFotos })
  }

  const parseStorageUrl = (url: string) => {
    const raw = String(url || '').trim()
    if (!raw) return null
    if (raw.startsWith('storage://')) {
      const remainder = raw.slice('storage://'.length)
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
    let idx = raw.indexOf(publicMarker)
    if (idx !== -1) marker = publicMarker
    else {
      idx = raw.indexOf(signMarker)
      if (idx !== -1) marker = signMarker
    }
    if (!marker) return null
    const remainder = raw.slice(idx + marker.length)
    const slash = remainder.indexOf('/')
    if (slash === -1) return null
    const bucket = remainder.slice(0, slash)
    let path = remainder.slice(slash + 1)
    const q = path.indexOf('?')
    if (q !== -1) path = path.slice(0, q)
    if (!bucket || !path) return null
    return { bucket, path }
  }

  const resolveToSignedUrl = async (input: unknown, expiresInSeconds = 60 * 60) => {
    if (!input) return ''
    if (typeof input === 'object') {
      const anyObj: any = input as any
      if (anyObj.bucket && anyObj.path) {
        const { data, error } = await adminClient.storage.from(String(anyObj.bucket)).createSignedUrl(String(anyObj.path), expiresInSeconds)
        if (error) return ''
        return String(data?.signedUrl || '')
      }
      if (typeof anyObj.url === 'string') return await resolveToSignedUrl(anyObj.url, expiresInSeconds)
    }
    if (typeof input === 'string') {
      const raw = input.trim()
      if (!raw) return ''
      if (raw.startsWith('data:')) return raw
      const parsed = parseStorageUrl(raw)
      if (!parsed) return raw
      const { data, error } = await adminClient.storage.from(parsed.bucket).createSignedUrl(parsed.path, expiresInSeconds)
      if (error) return ''
      return String(data?.signedUrl || '')
    }
    return ''
  }

  const preparePhotoBytes = async (fotoInput: unknown) => {
    const fotoUrl = await resolveToSignedUrl(fotoInput)
    if (!fotoUrl) return null
    try {
      const buf = await fetchArrayBuffer(fotoUrl, 25000)
      return new Uint8Array(buf)
    } catch {
      return null
    }
  }

  const preparePhotoHeadBytes = async (fotoInput: unknown) => {
    const fotoUrl = await resolveToSignedUrl(fotoInput)
    if (!fotoUrl) return null
    try {
      const buf = await fetchArrayBufferRange(fotoUrl, 25000, 256 * 1024)
      return new Uint8Array(buf)
    } catch {
      return null
    }
  }

  const parseExifDateTimeString = (s: string): Date | undefined => {
    const m = /^\s*(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*$/.exec(String(s || ''))
    if (!m) return undefined
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]))
    if (Number.isNaN(dt.getTime())) return undefined
    return dt
  }

  const extractCaptureFromJpegBytes = (
    jpeg: Uint8Array
  ): { latitude: number; longitude: number; takenAt?: string; latitudeRef?: 'N' | 'S'; longitudeRef?: 'E' | 'W' } | null => {
    if (!(jpeg instanceof Uint8Array) || jpeg.length < 4) return null
    if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return null

    let offset = 2
    while (offset + 4 <= jpeg.length) {
      if (jpeg[offset] !== 0xff) {
        offset++
        continue
      }
      while (offset < jpeg.length && jpeg[offset] === 0xff) offset++
      if (offset >= jpeg.length) break
      const marker = jpeg[offset++]
      if (marker === 0xd9 || marker === 0xda) break
      if (offset + 2 > jpeg.length) break
      const segLen = (jpeg[offset] << 8) | jpeg[offset + 1]
      offset += 2
      const segStart = offset
      const segEnd = segStart + segLen - 2
      if (segEnd > jpeg.length) break

      if (marker !== 0xe1 || segLen < 10) {
        offset = segEnd
        continue
      }

      const isExif =
        jpeg[segStart] === 0x45 &&
        jpeg[segStart + 1] === 0x78 &&
        jpeg[segStart + 2] === 0x69 &&
        jpeg[segStart + 3] === 0x66 &&
        jpeg[segStart + 4] === 0x00 &&
        jpeg[segStart + 5] === 0x00
      if (!isExif) {
        offset = segEnd
        continue
      }

      const tiffStart = segStart + 6
      if (tiffStart + 8 > segEnd) {
        offset = segEnd
        continue
      }

      const isLE = jpeg[tiffStart] === 0x49 && jpeg[tiffStart + 1] === 0x49
      const isBE = jpeg[tiffStart] === 0x4d && jpeg[tiffStart + 1] === 0x4d
      if (!isLE && !isBE) {
        offset = segEnd
        continue
      }

      const u16 = (p: number) => (isLE ? jpeg[p] | (jpeg[p + 1] << 8) : (jpeg[p] << 8) | jpeg[p + 1])
      const u32 = (p: number) => {
        if (isLE) return (jpeg[p] | (jpeg[p + 1] << 8) | (jpeg[p + 2] << 16) | (jpeg[p + 3] << 24)) >>> 0
        return ((jpeg[p] << 24) | (jpeg[p + 1] << 16) | (jpeg[p + 2] << 8) | jpeg[p + 3]) >>> 0
      }

      const magic = u16(tiffStart + 2)
      if (magic !== 42) {
        offset = segEnd
        continue
      }

      const ifd0Ptr = u32(tiffStart + 4)
      const ifd0Abs = tiffStart + ifd0Ptr
      if (ifd0Abs + 2 > segEnd) {
        offset = segEnd
        continue
      }

      const readAsciiTag = (ifdAbs: number, tag: number): string | undefined => {
        const countEntries = u16(ifdAbs)
        const base = ifdAbs + 2
        for (let i = 0; i < countEntries; i++) {
          const e = base + i * 12
          if (e + 12 > segEnd) break
          const t = u16(e)
          if (t !== tag) continue
          const type = u16(e + 2)
          const count = u32(e + 4)
          const valOrOff = u32(e + 8)
          if (type !== 2 || count < 1) return undefined
          const bytes = count
          const dataAbs = bytes <= 4 ? e + 8 : tiffStart + valOrOff
          if (dataAbs + bytes > segEnd) return undefined
          let out = ''
          for (let k = 0; k < bytes; k++) {
            const ch = jpeg[dataAbs + k]
            if (ch === 0) break
            out += String.fromCharCode(ch)
          }
          return out
        }
        return undefined
      }

      const readLongTag = (ifdAbs: number, tag: number): number | undefined => {
        const countEntries = u16(ifdAbs)
        const base = ifdAbs + 2
        for (let i = 0; i < countEntries; i++) {
          const e = base + i * 12
          if (e + 12 > segEnd) break
          const t = u16(e)
          if (t !== tag) continue
          const type = u16(e + 2)
          const count = u32(e + 4)
          const valOrOff = u32(e + 8)
          if (count < 1) return undefined
          if (type === 4) return valOrOff
          if (type === 3) return isLE ? (valOrOff & 0xffff) : (valOrOff >>> 16)
          return undefined
        }
        return undefined
      }

      const readRationals = (ifdAbs: number, tag: number): { num: number; den: number }[] | undefined => {
        const countEntries = u16(ifdAbs)
        const base = ifdAbs + 2
        for (let i = 0; i < countEntries; i++) {
          const e = base + i * 12
          if (e + 12 > segEnd) break
          const t = u16(e)
          if (t !== tag) continue
          const type = u16(e + 2)
          const count = u32(e + 4)
          const valOrOff = u32(e + 8)
          if (type !== 5 || count < 1) return undefined
          const dataAbs = tiffStart + valOrOff
          const bytes = count * 8
          if (dataAbs + bytes > segEnd) return undefined
          const out: { num: number; den: number }[] = []
          for (let k = 0; k < count; k++) {
            const p = dataAbs + k * 8
            out.push({ num: u32(p), den: u32(p + 4) })
          }
          return out
        }
        return undefined
      }

      const IFD0_TAG_EXIF_PTR = 0x8769
      const IFD0_TAG_GPS_PTR = 0x8825
      const IFD0_TAG_DATETIME = 0x0132
      const EXIF_TAG_DATETIME_ORIGINAL = 0x9003
      const GPS_TAG_LAT_REF = 0x0001
      const GPS_TAG_LAT = 0x0002
      const GPS_TAG_LON_REF = 0x0003
      const GPS_TAG_LON = 0x0004
      const GPS_TAG_TIME_STAMP = 0x0007
      const GPS_TAG_DATE_STAMP = 0x001d

      const exifPtr = readLongTag(ifd0Abs, IFD0_TAG_EXIF_PTR)
      const gpsPtr = readLongTag(ifd0Abs, IFD0_TAG_GPS_PTR)
      const dt0 = readAsciiTag(ifd0Abs, IFD0_TAG_DATETIME)

      let dtOriginal: string | undefined
      if (typeof exifPtr === 'number') {
        const exifAbs = tiffStart + exifPtr
        if (exifAbs + 2 <= segEnd) dtOriginal = readAsciiTag(exifAbs, EXIF_TAG_DATETIME_ORIGINAL)
      }

      let lat: number | undefined
      let lon: number | undefined
      let latRefNorm: 'N' | 'S' | undefined
      let lonRefNorm: 'E' | 'W' | undefined
      let gpsDate: string | undefined
      let gpsTime: { num: number; den: number }[] | undefined
      if (typeof gpsPtr === 'number') {
        const gpsAbs = tiffStart + gpsPtr
        if (gpsAbs + 2 <= segEnd) {
          const latRef = readAsciiTag(gpsAbs, GPS_TAG_LAT_REF)
          const lonRef = readAsciiTag(gpsAbs, GPS_TAG_LON_REF)
          const latVals = readRationals(gpsAbs, GPS_TAG_LAT)
          const lonVals = readRationals(gpsAbs, GPS_TAG_LON)
          gpsDate = readAsciiTag(gpsAbs, GPS_TAG_DATE_STAMP)
          gpsTime = readRationals(gpsAbs, GPS_TAG_TIME_STAMP)

          const normalizeLatRef = (v: unknown): 'N' | 'S' | undefined => {
            const s = String(v || '').trim().toUpperCase()
            if (s === 'N' || s === 'S') return s
            return undefined
          }
          const normalizeLonRef = (v: unknown): 'E' | 'W' | undefined => {
            const s = String(v || '').trim().toUpperCase()
            if (s === 'E' || s === 'W') return s
            return undefined
          }
          latRefNorm = normalizeLatRef(latRef)
          lonRefNorm = normalizeLonRef(lonRef)

          const toDeg = (ref: string | undefined, vals: { num: number; den: number }[] | undefined): number | undefined => {
            if (!ref || !vals || vals.length < 3) return undefined
            const d = vals[0].den ? vals[0].num / vals[0].den : NaN
            const m = vals[1].den ? vals[1].num / vals[1].den : NaN
            const s = vals[2].den ? vals[2].num / vals[2].den : NaN
            if (![d, m, s].every((x) => Number.isFinite(x))) return undefined
            let dec = d + m / 60 + s / 3600
            const r = ref.trim().toUpperCase()
            if (r === 'S' || r === 'W') dec = -dec
            return dec
          }
          lat = toDeg(latRef, latVals)
          lon = toDeg(lonRef, lonVals)
        }
      }

      let takenAt: Date | undefined = dtOriginal ? parseExifDateTimeString(dtOriginal) : undefined
      if (!takenAt && dt0) takenAt = parseExifDateTimeString(dt0)
      if (!takenAt && gpsDate && gpsTime && gpsTime.length >= 3) {
        const dm = /^(\d{4}):(\d{2}):(\d{2})$/.exec(String(gpsDate || '').trim())
        const hh = gpsTime[0].den ? gpsTime[0].num / gpsTime[0].den : NaN
        const mm = gpsTime[1].den ? gpsTime[1].num / gpsTime[1].den : NaN
        const ss = gpsTime[2].den ? gpsTime[2].num / gpsTime[2].den : NaN
        if (dm && [hh, mm, ss].every((x) => Number.isFinite(x))) {
          const dt = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Math.floor(hh), Math.floor(mm), Math.floor(ss))
          if (!Number.isNaN(dt.getTime())) takenAt = dt
        }
      }

      if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
        return {
          latitude: lat,
          longitude: lon,
          takenAt: takenAt ? takenAt.toISOString() : undefined,
          latitudeRef: latRefNorm,
          longitudeRef: lonRefNorm
        }
      }

      offset = segEnd
    }

    return null
  }

  const findFirstCaptureFromFotos = async (fotos: any[]) => {
    for (const foto of fotos || []) {
      const head = await preparePhotoHeadBytes(foto)
      if (!head) continue
      const cap = extractCaptureFromJpegBytes(head)
      if (cap) return cap
    }
    return null
  }

  const formatLegendaFigura = (numFigura: number, legendaPrincipal: string) => {
    const base = String(legendaPrincipal || '').trim()
    const terminaComExclamOuInterrog = /[!?]$/.test(base)
    const semPontosFinais = base.replace(/\.+$/, '').trim()
    const texto = semPontosFinais || 'Unidade'
    return terminaComExclamOuInterrog ? `Figura ${numFigura} – ${texto}` : `Figura ${numFigura} – ${texto}.`
  }

  for (let idx = 0; idx < (unidades || []).length; idx++) {
    const unidade = unidades[idx]
    const respostas = respostasByUnidade.get(String(unidade.id)) || []
    const ncs = todasNcs.filter((n) => n.unidade_fiscalizada_id === unidade.id)
    const determinacoes = todasDeterminacoes.filter((d) => d.unidade_fiscalizada_id === unidade.id)
    const recomendacoes = (todasRecomendacoes || []).filter((r) => r.unidade_fiscalizada_id === unidade.id)
    const constatacoesManuais = todasConstatacoesManuais.filter((m) => m.unidade_fiscalizada_id === unidade.id && hasText(m?.descricao))
    const fotosRaw = Array.isArray(unidade.fotos_unidade) ? unidade.fotos_unidade : []
    const mapeamento = mapeamentosNumeracao[idx]

    addPage()
    yPos = topMargin

    drawRectTop(margin, yPos, tableWidth, rowHeight, rgb255(189, 214, 238), false)
    drawRectTop(margin, yPos, tableWidth, rowHeight, undefined, true)
    const tituloUnidade = String(unidade.nome_unidade || unidade.tipo_unidade_nome || 'UNIDADE').toUpperCase()
    drawTextCenteredAt(tituloUnidade, pageWidth / 2, yPos + mm2pt(4.5), 11, { bold: true })
    yPos += rowHeight

    drawCell(`ID Unidade: ${unidade.codigo_unidade || unidade.nome_unidade || '-'}`, margin, yPos, tableWidth, rowHeight, true)
    yPos += rowHeight
    drawCell(`Localidade: ${municipioNome}`, margin, yPos, tableWidth, rowHeight, true)
    yPos += rowHeight
    const enderecoTxt = String((unidade as any).endereco || '').trim()
    if (enderecoTxt) {
      drawCell(`Endereço: ${enderecoTxt}`, margin, yPos, tableWidth, rowHeight, true)
      yPos += rowHeight
    }

    const firstCapture = await findFirstCaptureFromFotos(fotosRaw)
    const coordsTxt = String((unidade as any).coordenadas || '').trim()
    const coordsFinal = (() => {
      if (coordsTxt) {
        const isLikelyDms = /[°º]/.test(coordsTxt) && /[NSEW]/i.test(coordsTxt)
        if (isLikelyDms) return coordsTxt
        const parsed = tryParseDecimalCoordsPair(coordsTxt)
        if (parsed) return formatCoordsDms(parsed.lat, parsed.lon)
        return coordsTxt
      }
      if (firstCapture && Number.isFinite(firstCapture.latitude) && Number.isFinite(firstCapture.longitude)) {
        return formatCoordsDms(Number(firstCapture.latitude), Number(firstCapture.longitude))
      }
      return ''
    })()
    if (coordsFinal) {
      drawCell(`Coordenadas: ${coordsFinal}`, margin, yPos, tableWidth, rowHeight, true)
      yPos += rowHeight
    }

    const vistoriaAt = firstCapture?.takenAt
      ? formatDateTimeBR(firstCapture.takenAt)
      : unidade.data_hora_vistoria
        ? formatDateTimeBR(unidade.data_hora_vistoria)
        : '-'
    drawCell(`Data/Hora da Vistoria: ${vistoriaAt}`, margin, yPos, tableWidth, rowHeight, true)
    yPos += rowHeight

    drawCell('Constatações', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238])
    yPos += rowHeight

    const itensConstatacoes = [
      ...respostas
        .filter((r) => isRespostaConstatacao(r))
        .map((r) => ({ kind: 'checklist', id: r.id, resp: r })),
      ...constatacoesManuais.map((m) => ({ kind: 'manual', id: m.id, manual: m }))
    ].sort((a, b) => (mapeamento.constatacoes[a.id] ?? 9999) - (mapeamento.constatacoes[b.id] ?? 9999))

    if (itensConstatacoes.length > 0) {
      for (const item of itensConstatacoes) {
        const novoNum = mapeamento.constatacoes[item.id]
        if (!novoNum) continue
        const numConst = `C${novoNum}.`
        const texto =
          item.kind === 'manual'
            ? String(item.manual?.descricao || '')
            : `${String(item.resp?.pergunta || '')}${item.resp?.observacao ? ` Observação: ${item.resp.observacao}` : ''}`
        const lines = wrapText(texto, mm2pt(210 - 2 * 10 - 15), font, 9)
        const cellHeight = Math.max(rowHeight, lines.length * mm2pt(5) + mm2pt(4))

        if (yPos + cellHeight > pageHeight - bottomMargin) addPage()

        drawRectTop(margin, yPos, tableWidth, cellHeight, undefined, true)
        drawTextAt(numConst, margin + mm2pt(2), yPos + mm2pt(5), 9, { bold: true })
        let yLine = yPos + mm2pt(5)
        for (const ln of lines) {
          drawTextAt(ln, margin + mm2pt(12), yLine, 9)
          yLine += mm2pt(5)
        }
        yPos += cellHeight
      }
    } else {
      drawRectTop(margin, yPos, tableWidth, rowHeight, undefined, true)
      drawTextAt('Não se aplica.', margin + mm2pt(12), yPos + mm2pt(4.5), 9)
      yPos += rowHeight
    }

    if (yPos + rowHeight > pageHeight - bottomMargin) addPage()
    drawCell('Não Conformidades', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238])
    yPos += rowHeight

    if (ncs.length > 0) {
      const ncsSorted = [...ncs].sort((a, b) => (mapeamento.ncs[a.id] ?? 9999) - (mapeamento.ncs[b.id] ?? 9999))
      for (const nc of ncsSorted) {
        const respostaRelacionada = respostas.find((r) => r.id === nc.resposta_checklist_id)
        const constatacaoManualRelacionada = constatacoesManuais.find(
          (cm) => !nc.resposta_checklist_id && nc.descricao && cm.numero_constatacao && String(nc.descricao).includes(String(cm.numero_constatacao))
        )
        let numConstatacaoNovo = ''
        if (respostaRelacionada) numConstatacaoNovo = `C${mapeamento.constatacoes[respostaRelacionada.id]}`
        else if (constatacaoManualRelacionada) numConstatacaoNovo = `C${mapeamento.constatacoes[constatacaoManualRelacionada.id]}`

        const novoNumNC = `NC${mapeamento.ncs[nc.id]}.`
        const descricaoCompleta = numConstatacaoNovo
          ? `Constatação ${numConstatacaoNovo}: não cumprimento do ${nc.artigo_portaria || 'artigo'};`
          : String(nc.descricao || '')
        const lines = wrapText(descricaoCompleta, mm2pt(210 - 2 * 10 - 15), font, 9)
        const cellHeight = Math.max(rowHeight, lines.length * mm2pt(5) + mm2pt(4))

        if (yPos + cellHeight > pageHeight - bottomMargin) addPage()

        drawRectTop(margin, yPos, tableWidth, cellHeight, undefined, true)
        drawTextAt(novoNumNC, margin + mm2pt(2), yPos + mm2pt(5), 9, { bold: true })
        let yLine = yPos + mm2pt(5)
        for (const ln of lines) {
          drawTextAt(ln, margin + mm2pt(12), yLine, 9)
          yLine += mm2pt(5)
        }
        yPos += cellHeight
      }
    } else {
      drawRectTop(margin, yPos, tableWidth, rowHeight, undefined, true)
      drawTextAt('Não se aplica.', margin + mm2pt(12), yPos + mm2pt(4.5), 9)
      yPos += rowHeight
    }

    if (recomendacoes.length > 0) {
      const recsSorted = [...recomendacoes].sort((a, b) => (mapeamento.recomendacoes[a.id] ?? 9999) - (mapeamento.recomendacoes[b.id] ?? 9999))
      if (yPos + rowHeight > pageHeight - bottomMargin) addPage()
      drawCell('Recomendações', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238])
      yPos += rowHeight

      for (const rec of recsSorted) {
        const novoNumRec = `R${mapeamento.recomendacoes[rec.id]}.`
        const descricaoComPonto = String(rec.descricao || '').endsWith('.') ? String(rec.descricao || '') : `${String(rec.descricao || '')}.`
        const lines = wrapText(descricaoComPonto, mm2pt(210 - 2 * 10 - 15), font, 9)
        const cellHeight = Math.max(rowHeight, lines.length * mm2pt(5) + mm2pt(4))
        if (yPos + cellHeight > pageHeight - bottomMargin) addPage()
        drawRectTop(margin, yPos, tableWidth, cellHeight, undefined, true)
        drawTextAt(novoNumRec, margin + mm2pt(2), yPos + mm2pt(5), 9, { bold: true })
        let yLine = yPos + mm2pt(5)
        for (const ln of lines) {
          drawTextAt(ln, margin + mm2pt(12), yLine, 9)
          yLine += mm2pt(5)
        }
        yPos += cellHeight
      }
    }

    if (yPos + rowHeight > pageHeight - bottomMargin) addPage()
    drawCell('Determinações', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238])
    yPos += rowHeight

    if (determinacoes.length > 0) {
      const detsSorted = [...determinacoes].sort((a, b) => (mapeamento.determinacoes[a.id] ?? 9999) - (mapeamento.determinacoes[b.id] ?? 9999))

      for (const det of detsSorted) {
        const novoNumDet = `D${mapeamento.determinacoes[det.id]}.`
        let texto = String(det.descricao || '')
        const origem = String((det as any)?.origem || '').trim()
        const ncNum = origem && mapeamento?.ncNumeroByOrigem ? (mapeamento.ncNumeroByOrigem[origem] as any) : null
        if (ncNum) {
          const novoNumNC = `NC${ncNum}`
          texto = texto.replace(/NC\?/g, novoNumNC).replace(/NC\d+/g, novoNumNC)
        }
        if (!texto.trim().endsWith('.')) texto = `${texto.trim()}.`
        const prazoDias = Number((det as any)?.prazo_dias)
        if (!texto.includes('Prazo:') && Number.isFinite(prazoDias) && prazoDias > 0) texto = `${texto} Prazo: ${prazoDias} dias.`

        const lines = wrapText(texto, mm2pt(210 - 2 * 10 - 15), font, 9)
        const cellHeight = Math.max(rowHeight, lines.length * mm2pt(5) + mm2pt(4))
        if (yPos + cellHeight > pageHeight - bottomMargin) addPage()
        drawRectTop(margin, yPos, tableWidth, cellHeight, undefined, true)
        drawTextAt(novoNumDet, margin + mm2pt(2), yPos + mm2pt(5), 9, { bold: true })
        let yLine = yPos + mm2pt(5)
        for (const ln of lines) {
          drawTextAt(ln, margin + mm2pt(12), yLine, 9)
          yLine += mm2pt(5)
        }
        yPos += cellHeight
      }
    } else {
      drawRectTop(margin, yPos, tableWidth, rowHeight, undefined, true)
      drawTextAt('Não se aplica.', margin + mm2pt(12), yPos + mm2pt(4.5), 9)
      yPos += rowHeight
    }

    if (fotosRaw.length > 0) {
      if (yPos + rowHeight > pageHeight - bottomMargin) addPage()
      drawCell('Registros Fotográficos', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238])
      yPos += rowHeight

      const cellPadding = mm2pt(2)
      const imgCellWidth = (tableWidth - cellPadding) / 2
      const imgWidth = imgCellWidth - mm2pt(4)
      const imgHeight = mm2pt(70)
      const captionHeight = mm2pt(8)
      const totalCellHeight = imgHeight + captionHeight

      const embedAnyImage = async (bytes: Uint8Array) => {
        try {
          return await pdfDoc.embedJpg(bytes)
        } catch {
          try {
            return await pdfDoc.embedPng(bytes)
          } catch {
            return null
          }
        }
      }

      const fotosOk: any[] = []
      for (let chunkStart = 0; chunkStart < fotosRaw.length; chunkStart += PHOTO_CHUNK_SIZE) {
        const chunk = fotosRaw.slice(chunkStart, chunkStart + PHOTO_CHUNK_SIZE)
        const prepared = await mapWithConcurrency(chunk, PHOTO_PREP_CONCURRENCY, async (foto, innerIdx) => {
          const legenda = typeof foto === 'object' ? String(foto?.legenda || '') : ''
          const bytes = await preparePhotoBytes(foto)
          return { bytes, legenda, innerIdx }
        })

        for (const p of prepared) {
          if (p?.bytes) fotosOk.push(p)
        }

        processedFotos += chunk.length
        await maybeUpdateFotosProgress()
      }

      for (let i = 0; i < fotosOk.length; i += 2) {
        if (yPos + totalCellHeight + mm2pt(10) > pageHeight - bottomMargin) addPage()
        const leftX = margin
        const rightX = margin + imgCellWidth

        drawRectTop(leftX, yPos, imgCellWidth, totalCellHeight, undefined, true)
        if (fotosOk[i]?.bytes) {
          try {
            const embedded = await embedAnyImage(fotosOk[i].bytes)
            if (!embedded) throw new Error('Formato de imagem não suportado')
            page.drawImage(embedded, {
              x: leftX + mm2pt(2),
              y: pageHeight - (yPos + mm2pt(2) + imgHeight),
              width: imgWidth,
              height: imgHeight
            })
            const numFigura = offsetGlobalFiguras + i + 1
            const fallbackNome = unidade.nome_unidade || unidade.tipo_unidade_nome || 'Unidade'
            const legendaPrincipal = fotosOk[i].legenda && String(fotosOk[i].legenda).trim() ? String(fotosOk[i].legenda).trim() : String(fallbackNome)
            const legenda = formatLegendaFigura(numFigura, legendaPrincipal)
            const lines = wrapText(legenda, imgCellWidth - mm2pt(4), font, 7)
            let yLine = yPos + imgHeight + mm2pt(5)
            for (const ln of lines) {
              drawTextCenteredAt(ln, leftX + imgCellWidth / 2, yLine, 7)
              yLine += mm2pt(3)
            }
          } catch {}
        }

        drawRectTop(rightX, yPos, imgCellWidth, totalCellHeight, undefined, true)
        if (fotosOk[i + 1]?.bytes) {
          try {
            const embedded = await embedAnyImage(fotosOk[i + 1].bytes)
            if (!embedded) throw new Error('Formato de imagem não suportado')
            page.drawImage(embedded, {
              x: rightX + mm2pt(2),
              y: pageHeight - (yPos + mm2pt(2) + imgHeight),
              width: imgWidth,
              height: imgHeight
            })
            const numFigura = offsetGlobalFiguras + i + 2
            const fallbackNome = unidade.nome_unidade || unidade.tipo_unidade_nome || 'Unidade'
            const legendaPrincipal =
              fotosOk[i + 1].legenda && String(fotosOk[i + 1].legenda).trim() ? String(fotosOk[i + 1].legenda).trim() : String(fallbackNome)
            const legenda = formatLegendaFigura(numFigura, legendaPrincipal)
            const lines = wrapText(legenda, imgCellWidth - mm2pt(4), font, 7)
            let yLine = yPos + imgHeight + mm2pt(5)
            for (const ln of lines) {
              drawTextCenteredAt(ln, rightX + imgCellWidth / 2, yLine, 7)
              yLine += mm2pt(3)
            }
          } catch {}
        }

        yPos += totalCellHeight
      }

      offsetGlobalFiguras += fotosOk.length
    }

    await maybeUpdateFotosProgress(true)
    await updateJob(adminClient, job.id, { progress_unidades: idx + 1 })
  }

  const pages = pdfDoc.getPages()
  const totalPages = pages.length
  const footerSize = 8
  const footerPaddingY = mm2pt(6)
  for (let i = 0; i < totalPages; i++) {
    const page = pages[i]
    const label = `Página ${i + 1} de ${totalPages}`
    const textW = font.widthOfTextAtSize(label, footerSize)
    const x = pageWidth - margin - textW
    const y = footerPaddingY
    page.drawText(label, { x, y, size: footerSize, font, color: rgb(0.35, 0.35, 0.35) })
  }

  return await pdfDoc.save()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !anonKey || !serviceKey) return jsonResponse({ error: 'server_misconfigured' }, 500)

  const workerSecretEnv = Deno.env.get('RELATORIOS_WORKER_SECRET') || ''
  const workerSecretHeader = req.headers.get('x-worker-secret') || ''
  if (workerSecretEnv) {
    if (workerSecretHeader !== workerSecretEnv) return jsonResponse({ error: 'forbidden' }, 403)
  } else {
    const authHeader = req.headers.get('Authorization') || ''
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const adminClient = createClient(supabaseUrl, serviceKey)
    const userRes = await userClient.auth.getUser()
    const user = userRes.data.user
    if (!user) return jsonResponse({ error: 'unauthorized' }, 401)
    const { data: profile } = await adminClient.from('profiles').select('role, ativo').eq('id', user.id).maybeSingle()
    const isAdmin = profile?.ativo === true && profile?.role === 'admin'
    if (!isAdmin) return jsonResponse({ error: 'forbidden' }, 403)
  }

  let payload: any = {}
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  const limit = Number(payload?.limit || 1)
  const job_id = payload?.job_id ? String(payload.job_id) : undefined

  const adminClient = createClient(supabaseUrl, serviceKey)
  const claimed = await claimJobs(adminClient, Math.max(1, Math.min(limit, 10)), job_id)
  if (!claimed.length) return jsonResponse({ processed: 0 })

  let processed = 0
  for (const job of claimed) {
    try {
      await updateJob(adminClient, job.id, { status: 'processing', error_message: null })
      const pdfBytes = await generatePdfForJob(adminClient, job)

      const storage_path = `fiscalizacoes/${job.fiscalizacao_id}/${job.id}.pdf`
      const { error: upErr } = await adminClient.storage.from('relatorios_fiscalizacao').upload(storage_path, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })
      if (upErr) throw new Error(upErr.message)

      await updateJob(adminClient, job.id, { status: 'done', storage_path })
      processed++
    } catch (err: any) {
      try {
        await updateJob(adminClient, job.id, { status: 'error', error_message: String(err?.message || err || '') })
      } catch {}
    }
  }

  return jsonResponse({ processed })
})
