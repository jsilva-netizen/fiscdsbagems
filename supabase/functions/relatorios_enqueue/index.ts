import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.97.0'

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

  const jwt = String(payload?.jwt || req.headers.get('x-user-jwt') || '')
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
    .select('id, created_by, fiscal_email')
    .eq('id', fiscalizacao_id)
    .maybeSingle()
  if (!fiscRow) return jsonResponse({ error: 'fiscalizacao_not_found' }, 404)

  const userEmail = String(user.email || '').trim().toLowerCase()
  const fiscalEmail = String(fiscRow.fiscal_email || '').trim().toLowerCase()
  const isOwnerById = fiscRow.created_by === user.id
  const isOwnerByEmail = !!userEmail && !!fiscalEmail && userEmail === fiscalEmail
  if (!isAdmin && !isOwnerById && !isOwnerByEmail) return jsonResponse({ error: 'forbidden' }, 403)

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
