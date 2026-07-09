import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2.97.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-jwt',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
}

// Ajustar aqui quando o Google trocar o nome/limite do modelo gratuito.
const GEMINI_MODEL = 'gemini-2.0-flash'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function updateJob(adminClient: any, jobId: string, patch: Record<string, unknown>) {
  const { error } = await adminClient
    .from('caters_ai_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) throw new Error(error.message)
}

async function claimJobs(adminClient: any, limit: number, specificJobId?: string) {
  const { data, error } = await adminClient.rpc('claim_caters_ai_jobs', {
    p_limit: Math.max(1, Math.min(limit, 10)),
    p_job_id: specificJobId ?? null,
    p_stale_minutes: 5
  })
  if (error) throw new Error(error.message)
  return Array.isArray(data) ? data : []
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const RECOMMENDATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    item_code: { type: 'STRING' },
    description: { type: 'STRING' },
    category: { type: 'STRING' },
    priority: { type: 'STRING', enum: ['baixa', 'media', 'alta', 'critica'] },
    promised_due_at: { type: 'STRING', description: 'Data YYYY-MM-DD, se identificável no documento' }
  },
  required: ['description']
}

const EXTRACT_PDF_SCHEMA = {
  type: 'OBJECT',
  properties: {
    process: {
      type: 'OBJECT',
      properties: {
        process_number: { type: 'STRING' },
        municipality: { type: 'STRING' },
        object: { type: 'STRING' },
        fatal_date: { type: 'STRING', description: 'Data YYYY-MM-DD, se identificável' }
      }
    },
    recommendations: { type: 'ARRAY', items: RECOMMENDATION_SCHEMA },
    confidence_notes: { type: 'STRING', description: 'Observações sobre campos incertos ou não encontrados no PDF' }
  },
  required: ['recommendations']
}

const ANALYZE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', enum: ['adequate', 'needs_revision'] },
    rationale: { type: 'STRING' },
    per_recommendation: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          recommendation_id: { type: 'STRING' },
          verdict: { type: 'STRING', enum: ['adequate', 'needs_revision'] },
          rationale: { type: 'STRING' }
        },
        required: ['recommendation_id', 'verdict', 'rationale']
      }
    }
  },
  required: ['verdict', 'rationale']
}

class GeminiRateLimitError extends Error {}

async function callGemini(parts: any[], responseSchema: unknown): Promise<any> {
  const apiKey = Deno.env.get('GEMINI_API_KEY') || ''
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema
        }
      })
    }
  )

  if (res.status === 429) throw new GeminiRateLimitError('rate_limited')
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 500)}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Resposta vazia do Gemini')
  return JSON.parse(text)
}

async function processExtractPdf(adminClient: any, job: any) {
  const { data: signed, error: signErr } = await adminClient.storage
    .from(job.storage_bucket)
    .createSignedUrl(job.storage_path, 300)
  if (signErr) throw new Error(`Falha ao assinar URL do PDF: ${signErr.message}`)

  const pdfRes = await fetch(signed.signedUrl)
  if (!pdfRes.ok) throw new Error(`Falha ao baixar PDF: ${pdfRes.status}`)
  const pdfBuf = await pdfRes.arrayBuffer()
  const base64 = arrayBufferToBase64(pdfBuf)

  const prompt =
    'Você é um assistente de uma agência reguladora brasileira. Leia o PDF anexado ' +
    '(um relatório de fiscalização, ofício ou termo de notificação) e extraia: ' +
    'dados do processo (número, município, objeto, data fatal se houver) e a lista ' +
    'de recomendações/determinações endereçadas ao município ou prestador, cada uma ' +
    'com descrição, código do item (se houver), categoria, prioridade e prazo prometido ' +
    '(se identificável). Se um campo não estiver claro no documento, deixe-o de fora ' +
    'em vez de inventar. Registre em confidence_notes qualquer incerteza relevante.'

  const result = await callGemini(
    [{ inline_data: { mime_type: 'application/pdf', data: base64 } }, { text: prompt }],
    EXTRACT_PDF_SCHEMA
  )
  await updateJob(adminClient, job.id, { status: 'done', result_json: result })
}

async function processAnalyzeResponse(adminClient: any, job: any) {
  const input = job.input_text ? JSON.parse(job.input_text) : { recommendations: [], municipality_response_notes: null }

  const prompt =
    'Você é um assistente de uma agência reguladora brasileira analisando se a resposta ' +
    'de um município/prestador atende adequadamente às recomendações de uma fiscalização. ' +
    'Para cada recomendação (campo "description"), compare com a resposta correspondente ' +
    '(campo "titular_response") e com as observações gerais da resposta municipal ' +
    '(municipality_response_notes). Dê um veredito por recomendação ("adequate" ou ' +
    '"needs_revision") com justificativa curta, e um veredito geral. Use o "id" de cada ' +
    'recomendação como recommendation_id.\n\n' +
    `Dados:\n${JSON.stringify(input)}`

  const result = await callGemini([{ text: prompt }], ANALYZE_RESPONSE_SCHEMA)
  await updateJob(adminClient, job.id, { status: 'done', result_json: result })
}

async function handleJob(adminClient: any, job: any) {
  try {
    if (job.job_type === 'extract_pdf') {
      await processExtractPdf(adminClient, job)
    } else if (job.job_type === 'analyze_response') {
      await processAnalyzeResponse(adminClient, job)
    } else {
      await updateJob(adminClient, job.id, { status: 'error', error_message: 'job_type desconhecido' })
    }
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      // Volta pra fila em vez de marcar como erro definitivo — o próximo
      // ciclo do worker (ou o polling do frontend, que reenfileira via
      // updated_at) tenta de novo depois da janela de "stale".
      await updateJob(adminClient, job.id, { status: 'queued' })
      return
    }
    await updateJob(adminClient, job.id, { status: 'error', error_message: err?.message || String(err) })
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceKey) return jsonResponse({ error: 'server_misconfigured' }, 500)

  let payload: any = {}
  try {
    payload = await req.json()
  } catch {
    payload = {}
  }

  const adminClient = createClient(supabaseUrl, serviceKey)
  const specificJobId = payload?.job_id ? String(payload.job_id) : undefined

  let jobs: any[] = []
  try {
    jobs = await claimJobs(adminClient, specificJobId ? 1 : 5, specificJobId)
  } catch (err: any) {
    return jsonResponse({ error: 'claim_failed', details: err?.message }, 500)
  }

  for (const job of jobs) {
    await handleJob(adminClient, job)
  }

  return jsonResponse({ processed: jobs.length })
})
