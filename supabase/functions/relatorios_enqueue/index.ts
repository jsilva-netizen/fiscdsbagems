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

  const fiscalizacao_id = String(payload?.fiscalizacao_id || '')
  if (!fiscalizacao_id) return jsonResponse({ error: 'missing_fiscalizacao_id' }, 400)

  const userClient = createClient(supabaseUrl, anonKey)
  const adminClient = createClient(supabaseUrl, serviceKey)

  const userRes = await userClient.auth.getUser(jwt)
  const user = userRes.data.user
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401)

  const { data: profile } = await adminClient.from('profiles').select('role, ativo').eq('id', user.id).maybeSingle()
  const isActive = profile?.ativo === true
  const isAdmin = isActive && profile?.role === 'admin'
  if (!isActive) return jsonResponse({ error: 'forbidden' }, 403)

  const { data: fiscRow } = await adminClient
    .from('fiscalizacoes')
    .select('id, created_by, fiscal_email, tipo_modulo')
    .eq('id', fiscalizacao_id)
    .maybeSingle()
  if (!fiscRow) return jsonResponse({ error: 'fiscalizacao_not_found' }, 404)

  const userEmail = String(user.email || '').trim().toLowerCase()
  const fiscalEmail = String(fiscRow.fiscal_email || '').trim().toLowerCase()
  const isOwnerById = fiscRow.created_by === user.id
  const isOwnerByEmail = !!userEmail && !!fiscalEmail && userEmail === fiscalEmail
  const isFiscal = isActive && profile?.role === 'fiscal'
  const isCoordenador = isActive && profile?.role === 'coordenador'
  const hasAccess = isAdmin || isFiscal || isCoordenador || isOwnerById || isOwnerByEmail
  if (!hasAccess) return jsonResponse({ error: 'forbidden' }, 403)

  // Garante que todas as NCs, Determinações e totais estejam atualizados antes de gerar o relatório.
  // Isso é essencial se o usuário editou a fiscalização após reabri-la.
  try {
    const { error: finErr } = await adminClient.rpc('finalizar_fiscalizacao', { p_fiscalizacao_id: fiscalizacao_id })
    if (finErr) console.error('Erro ao garantir finalização/NCs:', finErr)
  } catch (err) {
    console.error('Falha ao chamar finalizar_fiscalizacao:', err)
  }

  const tipoModulo = String(fiscRow?.tipo_modulo || '')
  const isDtr = tipoModulo.startsWith('rodovias') || tipoModulo.startsWith('terminais') || tipoModulo.includes('dtr')

  if (!isDtr) {
    const { data: unidadeProbe, error: unidadeErr } = await adminClient
      .from('unidades_fiscalizadas')
      .select('id')
      .eq('fiscalizacao_id', fiscalizacao_id)
      .limit(1)
    if (unidadeErr) return jsonResponse({ error: 'unidades_check_failed', details: unidadeErr.message }, 500)
    if (!Array.isArray(unidadeProbe) || unidadeProbe.length === 0) {
      return jsonResponse(
        { error: 'Nenhuma unidade encontrada para esta fiscalização. Sincronize todas as unidades e tente novamente.', code: 'no_unidades' },
        409
      )
    }
  }

  const { data: jobRow, error: jobErr } = await adminClient
    .from('relatorios_jobs')
    .insert({
      fiscalizacao_id,
      requested_by: user.id,
      status: 'queued',
      progress_unidades: 0,
      progress_fotos: 0
    })
    .select('id')
    .single()
  if (jobErr) return jsonResponse({ error: 'job_create_failed', details: jobErr.message }, 500)

  try {
    await adminClient.rpc('kick_relatorios_worker', { p_job_id: jobRow.id })
  } catch {}

  return jsonResponse({ job_id: jobRow.id })
})
