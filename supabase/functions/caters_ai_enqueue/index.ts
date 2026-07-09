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

  const jobType = String(payload?.job_type || '')
  if (jobType !== 'extract_pdf' && jobType !== 'match_response_pdf' && jobType !== 'analyze_response') {
    return jsonResponse({ error: 'invalid_job_type' }, 400)
  }

  const processId = String(payload?.process_id || '')
  if (!processId) return jsonResponse({ error: 'missing_process_id' }, 400)

  if (jobType === 'extract_pdf' || jobType === 'match_response_pdf') {
    if (!payload?.storage_bucket || !payload?.storage_path) {
      return jsonResponse({ error: 'missing_storage_reference' }, 400)
    }
  }

  const userClient = createClient(supabaseUrl, anonKey)
  const adminClient = createClient(supabaseUrl, serviceKey)

  const userRes = await userClient.auth.getUser(jwt)
  const user = userRes.data.user
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401)

  // Espelha a checagem feita por public.is_caters_user() no banco, já que a
  // adminClient (service role) ignora RLS e precisamos validar manualmente.
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role, ativo, camara_tecnica_id')
    .eq('id', user.id)
    .maybeSingle()
  const isActive = profile?.ativo === true
  const isCatersUser = isActive && (profile?.role === 'admin' || profile?.camara_tecnica_id === 'caters')
  if (!isCatersUser) return jsonResponse({ error: 'forbidden' }, 403)

  const { data: processRow } = await adminClient
    .from('caters_processes')
    .select('id')
    .eq('id', processId)
    .maybeSingle()
  if (!processRow) return jsonResponse({ error: 'process_not_found' }, 404)

  // Extrai {bucket, path} de uma referência de evidência em qualquer formato
  // usado no projeto: string (storage:// ou URL pública/assinada), {bucket,path}
  // ou {url}. Espelha Repository.parseStorageUrl / evidenciaKey do frontend.
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

  let inputText: string | null = null
  if (jobType === 'match_response_pdf') {
    // O PDF é o ofício de resposta do município a recomendações JÁ
    // CADASTRADAS — o worker precisa da lista atual pra casar cada trecho do
    // documento com o recommendation_id certo, em vez de inventar recomendações novas.
    const { data: existingRecs } = await adminClient
      .from('caters_recommendations')
      .select('id, item_code, description')
      .eq('process_id', processId)
    inputText = JSON.stringify({ existing_recommendations: existingRecs || [] })
  }
  if (jobType === 'analyze_response') {
    const { data: recs } = await adminClient
      .from('caters_recommendations')
      .select('id, description, titular_response, evidence_url, determinacao_id')
      .eq('process_id', processId)
    const { data: muniResp } = await adminClient
      .from('caters_municipality_responses')
      .select('notes')
      .eq('process_id', processId)
      .maybeSingle()

    const determinacaoIds = [...new Set((recs || []).map((r: any) => r.determinacao_id).filter(Boolean))]

    const [{ data: determinacoes }, { data: respostasDet }] = determinacaoIds.length
      ? await Promise.all([
          adminClient.from('determinacoes').select('id, descricao, prazo').in('id', determinacaoIds),
          adminClient
            .from('respostas_determinacao')
            .select('determinacao_id, manifestacao_prestador, descricao_atendimento, status, dentro_prazo, evidencias, data_resposta')
            .in('determinacao_id', determinacaoIds)
        ])
      : [{ data: [] }, { data: [] }]

    const determinacaoById = new Map((determinacoes || []).map((d: any) => [d.id, d]))
    // Se houver mais de uma resposta pra mesma determinação, fica com a mais recente.
    const respostaByDeterminacao = new Map<string, any>()
    for (const r of respostasDet || []) {
      const cur = respostaByDeterminacao.get(r.determinacao_id)
      if (!cur || new Date(r.data_resposta) > new Date(cur.data_resposta)) {
        respostaByDeterminacao.set(r.determinacao_id, r)
      }
    }

    const enrichedRecs = (recs || []).map((r: any) => {
      const det = r.determinacao_id ? determinacaoById.get(r.determinacao_id) : null
      const resp = r.determinacao_id ? respostaByDeterminacao.get(r.determinacao_id) : null

      const evidenceRefs: { bucket: string; path: string }[] = []
      const seen = new Set<string>()
      const addRef = (ev: any) => {
        const ref = resolveEvidenceRef(ev)
        if (!ref) return
        const key = `${ref.bucket}:${ref.path}`
        if (seen.has(key)) return
        seen.add(key)
        evidenceRefs.push(ref)
      }
      if (r.evidence_url) addRef(r.evidence_url)
      for (const ev of Array.isArray(resp?.evidencias) ? resp.evidencias : []) addRef(ev)

      return {
        id: r.id,
        description: r.description,
        titular_response: r.titular_response,
        determinacao_descricao: det?.descricao || null,
        determinacao_prazo: det?.prazo || null,
        resposta_manifestacao_prestador: resp?.manifestacao_prestador || null,
        resposta_descricao_atendimento: resp?.descricao_atendimento || null,
        resposta_status: resp?.status || null,
        resposta_dentro_prazo: resp?.dentro_prazo ?? null,
        evidence_refs: evidenceRefs
      }
    })

    inputText = JSON.stringify({
      recommendations: enrichedRecs,
      municipality_response_notes: muniResp?.notes || null
    })
  }

  const { data: jobRow, error: jobErr } = await adminClient
    .from('caters_ai_jobs')
    .insert({
      job_type: jobType,
      process_id: processId,
      storage_bucket: (jobType === 'extract_pdf' || jobType === 'match_response_pdf') ? String(payload.storage_bucket) : null,
      storage_path: (jobType === 'extract_pdf' || jobType === 'match_response_pdf') ? String(payload.storage_path) : null,
      input_text: inputText,
      status: 'queued',
      requested_by: user.id
    })
    .select('id')
    .single()
  if (jobErr) return jsonResponse({ error: 'job_create_failed', details: jobErr.message }, 500)

  // Dispara o worker diretamente por fetch (fire-and-forget) em vez de uma
  // RPC de "kick" — mais simples e auto-contido do que o padrão usado em
  // relatorios_enqueue, cuja RPC de disparo nunca chegou a ser versionada.
  // IMPORTANTE: sem waitUntil, o runtime derruba a function assim que a
  // resposta abaixo é enviada, matando esse fetch em voo antes de sair —
  // o job fica preso em 'queued' pra sempre. waitUntil mantém a tarefa viva
  // em segundo plano depois da resposta.
  const kickWorker = fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/caters_ai_worker`, {
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
