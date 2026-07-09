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
    .from('catesa_ai_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', jobId)
  if (error) throw new Error(error.message)
}

async function claimJobs(adminClient: any, limit: number, specificJobId?: string) {
  const { data, error } = await adminClient.rpc('claim_catesa_ai_jobs', {
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

function guessMimeFromPath(path: string): string | null {
  const ext = String(path || '').split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'pdf') return 'application/pdf'
  return null
}

const MAX_EVIDENCE_TOTAL = 6
const MAX_EVIDENCE_PER_DETERMINACAO = 2

const ANALYZE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    verdict: { type: 'STRING', enum: ['adequate', 'needs_revision'] },
    rationale: { type: 'STRING' },
    per_determinacao: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          determinacao_id: { type: 'STRING' },
          verdict: { type: 'STRING', enum: ['adequate', 'needs_revision'] },
          rationale: { type: 'STRING' },
          evidence_reviewed: { type: 'BOOLEAN', description: 'true se evidências anexadas foram de fato examinadas' }
        },
        required: ['determinacao_id', 'verdict', 'rationale']
      }
    }
  },
  required: ['verdict', 'rationale']
}

class GeminiRateLimitError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
// Não existe nenhum mecanismo separado que reprocesse um job que ficou
// 'queued' por rate limit — o enqueue só invoca o worker uma vez, mirando
// esse job específico. Por isso o retry com backoff acontece aqui dentro,
// na mesma invocação (o enqueue já aguarda o worker terminar mesmo).
const RATE_LIMIT_RETRY_DELAYS_MS = [5000, 15000]

async function callGemini(parts: any[], responseSchema: unknown): Promise<any> {
  const apiKey = Deno.env.get('GEMINI_API_KEY') || ''
  if (!apiKey) throw new Error('GEMINI_API_KEY não configurada')

  let lastRateLimitBody = ''
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRY_DELAYS_MS.length; attempt++) {
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

    if (res.status === 429) {
      lastRateLimitBody = await res.text().catch(() => '')
      console.warn(`catesa_ai_worker: Gemini 429 (tentativa ${attempt + 1}/${RATE_LIMIT_RETRY_DELAYS_MS.length + 1})`, lastRateLimitBody.slice(0, 800))
      if (attempt < RATE_LIMIT_RETRY_DELAYS_MS.length) {
        await sleep(RATE_LIMIT_RETRY_DELAYS_MS[attempt])
        continue
      }
      throw new GeminiRateLimitError(lastRateLimitBody.slice(0, 500) || 'rate_limited')
    }
    return await parseGeminiResponse(res)
  }
  throw new GeminiRateLimitError(lastRateLimitBody.slice(0, 500) || 'rate_limited')
}

async function parseGeminiResponse(res: Response): Promise<any> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${text.slice(0, 500)}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Resposta vazia do Gemini')
  return JSON.parse(text)
}

async function processAnalyzeTermo(adminClient: any, job: any) {
  const input = job.input_text ? JSON.parse(job.input_text) : { determinacoes: [] }
  const determinacoes = Array.isArray(input.determinacoes) ? input.determinacoes : []

  const introText =
    'Você é um assistente de uma agência reguladora brasileira analisando se a resposta ' +
    'de um prestador/município atende adequadamente às determinações de uma fiscalização ' +
    '(CATESA). Para cada determinação, compare três coisas: (1) o que foi determinado — ' +
    '"descricao" e "prazo" (a exigência original); (2) o que o prestador respondeu — ' +
    '"resposta_manifestacao_prestador" e "resposta_descricao_atendimento"; e (3) as ' +
    'evidências anexadas, fornecidas a seguir como imagens/PDFs rotulados com o id da ' +
    'determinação — verifique se elas de fato comprovam o que a resposta alega, e não ' +
    'apenas se existem. Considere também "resposta_status" e "resposta_dentro_prazo". Se ' +
    'a resposta afirma algo que a evidência não sustenta (ou não há evidência anexada para ' +
    'uma alegação que dependeria dela), marque "needs_revision" e explique o motivo. Marque ' +
    'evidence_reviewed=true apenas na determinação cuja(s) evidência(s) anexada(s) você ' +
    'efetivamente examinou nas imagens/PDFs fornecidos. Dê um veredito por determinação e ' +
    'um veredito geral. Use o "id" de cada determinação como determinacao_id.\n\n' +
    `Dados das determinações (sem as evidências, anexadas separadamente abaixo):\n${JSON.stringify(
      determinacoes.map(({ evidence_refs, ...rest }: any) => rest)
    )}`

  const parts: any[] = [{ text: introText }]
  let evidenceCount = 0
  for (const det of determinacoes) {
    const refs = Array.isArray(det.evidence_refs) ? det.evidence_refs.slice(0, MAX_EVIDENCE_PER_DETERMINACAO) : []
    for (const ref of refs) {
      if (evidenceCount >= MAX_EVIDENCE_TOTAL) break
      const mime = guessMimeFromPath(ref.path)
      if (!mime) continue
      try {
        const { data: signed, error: signErr } = await adminClient.storage.from(ref.bucket).createSignedUrl(ref.path, 300)
        if (signErr || !signed?.signedUrl) continue
        const fileRes = await fetch(signed.signedUrl)
        if (!fileRes.ok) continue
        const buf = await fileRes.arrayBuffer()
        parts.push({ text: `Evidência anexada à determinação ${det.id}:` })
        parts.push({ inline_data: { mime_type: mime, data: arrayBufferToBase64(buf) } })
        evidenceCount++
      } catch {
        // Evidência individual inacessível não deve derrubar a análise inteira.
      }
    }
    if (evidenceCount >= MAX_EVIDENCE_TOTAL) break
  }

  const result = await callGemini(parts, ANALYZE_SCHEMA)
  await updateJob(adminClient, job.id, { status: 'done', result_json: result })
}

async function handleJob(adminClient: any, job: any) {
  console.log(`catesa_ai_worker: processando job ${job.id}`)
  try {
    await processAnalyzeTermo(adminClient, job)
    console.log(`catesa_ai_worker: job ${job.id} concluído`)
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      // callGemini já tentou de novo com backoff antes de chegar aqui — não
      // existe nenhum mecanismo separado que reprocesse um job 'queued'
      // sozinho, então esgotado o retry isso já é uma falha de verdade.
      console.error(`catesa_ai_worker: job ${job.id} excedeu limite de taxa do Gemini após retries`, err.message)
      await updateJob(adminClient, job.id, {
        status: 'error',
        error_message: 'Limite de requisições do Gemini excedido (mesmo após retry). Tente novamente em alguns minutos.'
      })
      return
    }
    console.error(`catesa_ai_worker: job ${job.id} falhou`, err)
    await updateJob(adminClient, job.id, { status: 'error', error_message: err?.message || String(err) })
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceKey) {
    console.error('catesa_ai_worker: server_misconfigured — SUPABASE_URL/SERVICE_ROLE_KEY ausentes')
    return jsonResponse({ error: 'server_misconfigured' }, 500)
  }
  if (!Deno.env.get('GEMINI_API_KEY')) {
    console.error('catesa_ai_worker: GEMINI_API_KEY ausente')
  }

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
    console.error('catesa_ai_worker: claim_failed', err)
    return jsonResponse({ error: 'claim_failed', details: err?.message }, 500)
  }

  console.log(`catesa_ai_worker: ${jobs.length} job(s) reclamado(s)${specificJobId ? ` (job_id=${specificJobId})` : ''}`)

  for (const job of jobs) {
    await handleJob(adminClient, job)
  }

  return jsonResponse({ processed: jobs.length })
})
