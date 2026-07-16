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

  const job_id = String(payload?.job_id || '')
  const fiscalizacao_id = String(payload?.fiscalizacao_id || '')
  if (!job_id && !fiscalizacao_id) return jsonResponse({ error: 'missing_job_id' }, 400)

  const userClient = createClient(supabaseUrl, anonKey)
  const adminClient = createClient(supabaseUrl, serviceKey)

  const userRes = await userClient.auth.getUser(jwt)
  const user = userRes.data.user
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401)

  const { data: profile } = await adminClient.from('profiles').select('role, ativo').eq('id', user.id).maybeSingle()

  const selectCols = 'id, fiscalizacao_id, requested_by, status, progress_unidades, progress_fotos, error_message, storage_path, parts_count, created_at, updated_at'
  const { data: job, error: jobErr } = job_id
    ? await adminClient
        .from('relatorios_jobs')
        .select(selectCols)
        .eq('id', job_id)
        .maybeSingle()
    : await adminClient
        .from('relatorios_jobs')
        .select(selectCols)
        .eq('fiscalizacao_id', fiscalizacao_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
  if (jobErr) return jsonResponse({ error: 'job_fetch_failed', details: jobErr.message }, 500)
  if (!job) return jsonResponse({ status: 'not_found' }, 200)

  if (profile?.ativo !== true) return jsonResponse({ error: 'forbidden' }, 403)

  const partsCount = Number(job.parts_count || 1)

  // Relatórios divididos em múltiplas partes (para caber no limite de 50MB do Storage no
  // plano Free) não têm um único objeto pra assinar. Nesse caso devolvemos uma signed_url
  // por parte — o app baixa e junta tudo num único PDF no navegador, mostrando o progresso
  // pro usuário em vez de deixar a montagem inteira "escondida" numa function.
  let signed_url: string | undefined
  let part_urls: string[] | undefined
  if (job.status === 'done' && job.storage_path && partsCount <= 1) {
    const { data, error } = await adminClient.storage.from('relatorios_fiscalizacao').createSignedUrl(job.storage_path, 3600)
    if (error) return jsonResponse({ error: 'signed_url_failed', details: error.message }, 500)
    signed_url = data.signedUrl
  } else if (job.status === 'done' && partsCount > 1) {
    const basePath = `fiscalizacoes/${job.fiscalizacao_id}`
    const urls: string[] = []
    for (let i = 0; i < partsCount; i++) {
      const path = `${basePath}/latest_part${i + 1}.pdf`
      const { data, error } = await adminClient.storage.from('relatorios_fiscalizacao').createSignedUrl(path, 3600)
      if (error) return jsonResponse({ error: 'signed_url_failed', details: error.message }, 500)
      urls.push(data.signedUrl)
    }
    part_urls = urls
  }

  return jsonResponse({
    id: job.id,
    fiscalizacao_id: job.fiscalizacao_id,
    status: job.status,
    progress_unidades: job.progress_unidades,
    progress_fotos: job.progress_fotos,
    error_message: job.error_message,
    storage_path: job.storage_path,
    parts_count: partsCount,
    signed_url,
    part_urls
  })
})
