import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.97.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-jwt',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

// Extrai {bucket, path} de uma referência de evidência em qualquer formato
// usado no projeto: string (storage:// ou URL pública/assinada) ou {bucket,path}/{url}.
function resolveEvidenceRef(ev: any): { bucket: string; path: string } | null {
  const parseUrl = (raw: string) => {
    if (!raw) return null
    if (raw.startsWith('storage://')) {
      const remainder = raw.slice('storage://'.length)
      const slash = remainder.indexOf('/')
      if (slash === -1) return null
      return { bucket: remainder.slice(0, slash), path: remainder.slice(slash + 1).split('?')[0] }
    }
    const markers = ['/storage/v1/object/public/', '/storage/v1/object/sign/']
    for (const marker of markers) {
      const idx = raw.indexOf(marker)
      if (idx === -1) continue
      const remainder = raw.slice(idx + marker.length)
      const slash = remainder.indexOf('/')
      if (slash === -1) continue
      return { bucket: remainder.slice(0, slash), path: remainder.slice(slash + 1).split('?')[0] }
    }
    return null
  }
  if (!ev) return null
  if (typeof ev === 'string') return parseUrl(ev.trim())
  if (ev?.bucket && ev?.path) return { bucket: String(ev.bucket), path: String(ev.path) }
  if (typeof ev?.url === 'string') return parseUrl(ev.url.trim())
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !anonKey || !serviceKey) return jsonResponse({ error: 'server_misconfigured' }, 500)

  let payload: any = {}
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  const extractBearer = (v: string) => {
    const m = /^Bearer\s+(.+)$/i.exec(String(v || '').trim())
    return m?.[1] ? String(m[1]).trim() : ''
  }

  const decodeJwtPayload = (token: string) => {
    try {
      const parts = String(token || '').split('.')
      if (parts.length < 2) return null
      const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4))
      const json = atob(b64 + pad)
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  const isProbablyUserAccessToken = (token: string) => {
    const p: any = decodeJwtPayload(token)
    if (!p) return false
    if (p?.role && String(p.role).toLowerCase() === 'anon') return false
    if (!p?.sub) return false
    return true
  }

  const tokenFromAuth = extractBearer(req.headers.get('Authorization') || '')
  const tokenFromPayload = String(payload?.jwt || req.headers.get('x-user-jwt') || '')
  const jwt = (isProbablyUserAccessToken(tokenFromAuth) ? tokenFromAuth : '') || (isProbablyUserAccessToken(tokenFromPayload) ? tokenFromPayload : '')
  if (!jwt) return jsonResponse({ error: 'unauthorized' }, 401)

  const termoId = String(payload?.termo_id || '')
  if (!termoId) return jsonResponse({ error: 'missing_termo_id' }, 400)

  const userClient = createClient(supabaseUrl, anonKey)
  const adminClient = createClient(supabaseUrl, serviceKey)

  const userRes = await userClient.auth.getUser(jwt)
  const user = userRes.data.user
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401)

  // Espelha public.can_access_camara('catesa') — a adminClient (service role)
  // ignora RLS, então validamos manualmente com os mesmos critérios.
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, ativo, camara_tecnica_id')
    .eq('id', user.id)
    .maybeSingle()
  const isActive = profile?.ativo === true
  const role = profile?.role
  const camara = profile?.camara_tecnica_id
  const canAccessCatesa = isActive && (role === 'admin' || (['coordenador', 'fiscal'].includes(role) && (!camara || camara === 'catesa')))
  if (!canAccessCatesa) return jsonResponse({ error: 'forbidden' }, 403)

  const { data: termo } = await adminClient
    .from('termos_notificacao')
    .select('id, fiscalizacao_id')
    .eq('id', termoId)
    .maybeSingle()
  if (!termo) return jsonResponse({ error: 'termo_not_found' }, 404)

  const { data: unidades } = termo.fiscalizacao_id
    ? await adminClient.from('unidades_fiscalizadas').select('id').eq('fiscalizacao_id', termo.fiscalizacao_id)
    : { data: [] }
  const unidadeIds = (unidades || []).map((u: any) => u.id)

  const { data: determinacoes } = unidadeIds.length
    ? await adminClient.from('determinacoes').select('id, descricao, prazo, numero_determinacao').in('unidade_fiscalizada_id', unidadeIds)
    : { data: [] }

  const determinacaoIds = (determinacoes || []).map((d: any) => d.id)
  const { data: respostasDet } = determinacaoIds.length
    ? await adminClient
        .from('respostas_determinacao')
        .select('determinacao_id, manifestacao_prestador, descricao_atendimento, status, dentro_prazo, evidencias, data_resposta')
        .in('determinacao_id', determinacaoIds)
    : { data: [] }

  const respostaByDeterminacao = new Map<string, any>()
  for (const r of respostasDet || []) {
    const cur = respostaByDeterminacao.get(r.determinacao_id)
    if (!cur || new Date(r.data_resposta) > new Date(cur.data_resposta)) {
      respostaByDeterminacao.set(r.determinacao_id, r)
    }
  }

  const enrichedDeterminacoes = (determinacoes || []).map((d: any) => {
    const resp = respostaByDeterminacao.get(d.id)
    const evidenceRefs: { bucket: string; path: string }[] = []
    const seen = new Set<string>()
    for (const ev of Array.isArray(resp?.evidencias) ? resp.evidencias : []) {
      const ref = resolveEvidenceRef(ev)
      if (!ref) continue
      const key = `${ref.bucket}:${ref.path}`
      if (seen.has(key)) continue
      seen.add(key)
      evidenceRefs.push(ref)
    }
    return {
      id: d.id,
      numero_determinacao: d.numero_determinacao || null,
      descricao: d.descricao,
      prazo: d.prazo,
      resposta_manifestacao_prestador: resp?.manifestacao_prestador || null,
      resposta_descricao_atendimento: resp?.descricao_atendimento || null,
      resposta_status: resp?.status || null,
      resposta_dentro_prazo: resp?.dentro_prazo ?? null,
      evidence_refs: evidenceRefs
    }
  })

  if (enrichedDeterminacoes.length === 0) {
    return jsonResponse({ error: 'no_determinacoes_found' }, 409)
  }

  const inputText = JSON.stringify({ determinacoes: enrichedDeterminacoes })

  const { data: jobRow, error: jobErr } = await adminClient
    .from('catesa_ai_jobs')
    .insert({
      termo_id: termoId,
      input_text: inputText,
      status: 'queued',
      requested_by: user.id
    })
    .select('id')
    .single()
  if (jobErr) return jsonResponse({ error: 'job_create_failed', details: jobErr.message }, 500)

  // IMPORTANTE: sem waitUntil, o runtime derruba a function assim que a
  // resposta abaixo é enviada, matando esse fetch em voo antes de sair —
  // o job fica preso em 'queued' pra sempre. waitUntil mantém a tarefa viva
  // em segundo plano depois da resposta.
  const kickWorker = fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/catesa_ai_worker`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
      'apikey': serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ job_id: jobRow.id })
  }).catch(() => {})
  try {
    // @ts-ignore - EdgeRuntime é um global da Supabase, não existe nos tipos padrão do Deno
    EdgeRuntime.waitUntil(kickWorker)
  } catch {}

  return jsonResponse({ job_id: jobRow.id })
})
