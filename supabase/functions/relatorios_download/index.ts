import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.97.0'
import { PDFDocument } from 'https://esm.sh/pdf-lib@1.17.1'

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

// Relatórios divididos em várias partes (para caber no limite de 50MB por objeto do
// Storage no plano Free) são remontados aqui, sob demanda, a cada download. O PDF final
// unificado só existe na memória desta invocação — nunca é gravado no Storage, então o
// limite de 50MB nunca se aplica a ele.
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
  if (!job_id) return jsonResponse({ error: 'missing_job_id' }, 400)

  const userClient = createClient(supabaseUrl, anonKey)
  const adminClient = createClient(supabaseUrl, serviceKey)

  const userRes = await userClient.auth.getUser(jwt)
  const user = userRes.data.user
  if (!user) return jsonResponse({ error: 'unauthorized' }, 401)

  const { data: profile } = await adminClient.from('profiles').select('role, ativo').eq('id', user.id).maybeSingle()
  if (profile?.ativo !== true) return jsonResponse({ error: 'forbidden' }, 403)

  const { data: job, error: jobErr } = await adminClient
    .from('relatorios_jobs')
    .select('id, fiscalizacao_id, status, storage_path, parts_count')
    .eq('id', job_id)
    .maybeSingle()
  if (jobErr) return jsonResponse({ error: 'job_fetch_failed', details: jobErr.message }, 500)
  if (!job || job.status !== 'done' || !job.storage_path) return jsonResponse({ error: 'job_not_found' }, 404)

  const partsCount = Math.max(1, Number(job.parts_count || 1))
  const basePath = `fiscalizacoes/${job.fiscalizacao_id}`
  const partName = (index: number) => (partsCount <= 1 ? 'latest.pdf' : `latest_part${index + 1}.pdf`)

  try {
    const merged = await PDFDocument.create()
    for (let i = 0; i < partsCount; i++) {
      const path = `${basePath}/${partName(i)}`
      const { data, error } = await adminClient.storage.from('relatorios_fiscalizacao').download(path)
      if (error || !data) throw new Error(`Falha ao baixar parte ${i + 1}/${partsCount}: ${error?.message || 'não encontrada'}`)
      const bytes = new Uint8Array(await data.arrayBuffer())
      const part = await PDFDocument.load(bytes)
      const pages = await merged.copyPages(part, part.getPageIndices())
      for (const p of pages) merged.addPage(p)
    }
    const mergedBytes = await merged.save()

    return new Response(mergedBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="relatorio-${job.fiscalizacao_id}.pdf"`
      }
    })
  } catch (err: any) {
    return jsonResponse({ error: 'merge_failed', details: String(err?.message || err || '') }, 500)
  }
})
