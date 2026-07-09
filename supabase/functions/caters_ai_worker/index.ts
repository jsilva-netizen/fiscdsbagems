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

// extract_pdf: lê o Relatório de Fiscalização (documento fundador do
// processo) e cadastra TODAS as recomendações encontradas — recomendações
// novas, não casamento com nada existente.
const EXTRACT_PDF_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recommendations: {
      type: 'ARRAY',
      description: 'Todas as recomendações/determinações endereçadas ao município ou prestador encontradas no relatório.',
      items: {
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
    },
    confidence_notes: { type: 'STRING', description: 'Observações sobre campos incertos ou não encontrados no relatório' }
  },
  required: ['recommendations']
}

// match_response_pdf: lê o Ofício de Resposta do município e casa cada
// trecho com uma recomendação JÁ CADASTRADA (por id) — não cria nada novo.
const MATCH_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    matches: {
      type: 'ARRAY',
      description: 'Uma entrada por recomendação já cadastrada que o documento efetivamente aborda.',
      items: {
        type: 'OBJECT',
        properties: {
          recommendation_id: { type: 'STRING' },
          titular_response: { type: 'STRING', description: 'Resumo da ação relatada pelo município para essa recomendação' },
          promised_due_at: { type: 'STRING', description: 'Novo prazo mencionado no documento, formato YYYY-MM-DD, se houver' },
          status_suggestion: { type: 'STRING', enum: ['pendente', 'em_andamento', 'vencido', 'cumprido'] }
        },
        required: ['recommendation_id', 'titular_response']
      }
    },
    unmatched_notes: {
      type: 'STRING',
      description: 'Conteúdo relevante do documento que não corresponde a nenhuma recomendação cadastrada'
    },
    confidence_notes: { type: 'STRING', description: 'Observações sobre campos incertos ou trechos ambíguos do PDF' }
  },
  required: ['matches']
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
          rationale: { type: 'STRING' },
          evidence_reviewed: { type: 'BOOLEAN', description: 'true se evidências anexadas foram de fato examinadas' }
        },
        required: ['recommendation_id', 'verdict', 'rationale']
      }
    }
  },
  required: ['verdict', 'rationale']
}

// Máximos para conter tamanho/custo da requisição — evidências além disso
// ficam só citadas por texto (nome do arquivo), sem serem anexadas ao Gemini.
const MAX_EVIDENCE_TOTAL = 6
const MAX_EVIDENCE_PER_RECOMMENDATION = 2

function guessMimeFromPath(path: string): string | null {
  const ext = String(path || '').split('.').pop()?.toLowerCase()
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'pdf') return 'application/pdf'
  return null
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
      console.warn(`caters_ai_worker: Gemini 429 (tentativa ${attempt + 1}/${RATE_LIMIT_RETRY_DELAYS_MS.length + 1})`, lastRateLimitBody.slice(0, 800))
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

async function fetchPdfAsBase64(adminClient: any, job: any): Promise<string> {
  const { data: signed, error: signErr } = await adminClient.storage
    .from(job.storage_bucket)
    .createSignedUrl(job.storage_path, 300)
  if (signErr) throw new Error(`Falha ao assinar URL do PDF: ${signErr.message}`)

  const pdfRes = await fetch(signed.signedUrl)
  if (!pdfRes.ok) throw new Error(`Falha ao baixar PDF: ${pdfRes.status}`)
  const pdfBuf = await pdfRes.arrayBuffer()
  return arrayBufferToBase64(pdfBuf)
}

async function processExtractPdf(adminClient: any, job: any) {
  const base64 = await fetchPdfAsBase64(adminClient, job)

  const prompt =
    'Você é um assistente de uma agência reguladora brasileira. Leia o Relatório de ' +
    'Fiscalização em PDF anexado e extraia TODAS as recomendações/determinações ' +
    'endereçadas ao município ou prestador, cada uma com descrição, código do item (se ' +
    'houver), categoria, prioridade e prazo prometido (se identificável). Não pule ' +
    'nenhuma recomendação encontrada no documento. Se um campo não estiver claro, deixe-o ' +
    'de fora em vez de inventar. Registre em confidence_notes qualquer incerteza relevante.'

  const result = await callGemini(
    [{ inline_data: { mime_type: 'application/pdf', data: base64 } }, { text: prompt }],
    EXTRACT_PDF_SCHEMA
  )
  await updateJob(adminClient, job.id, { status: 'done', result_json: result })
}

async function processMatchResponsePdf(adminClient: any, job: any) {
  const base64 = await fetchPdfAsBase64(adminClient, job)

  const input = job.input_text ? JSON.parse(job.input_text) : { existing_recommendations: [] }
  const existingRecs = Array.isArray(input.existing_recommendations) ? input.existing_recommendations : []

  const prompt =
    'Você é um assistente de uma agência reguladora brasileira. O PDF anexado é o ' +
    'ofício de resposta de um município/prestador a recomendações que JÁ ESTÃO ' +
    'CADASTRADAS no sistema (lista abaixo, com id, item_code e description). Leia o ' +
    'documento e, para cada recomendação da lista que ele efetivamente aborda, extraia ' +
    'um resumo da ação relatada (titular_response) e, se houver, um novo prazo ' +
    'mencionado (promised_due_at) e uma sugestão de status (status_suggestion). Use o ' +
    '"id" de cada recomendação da lista como recommendation_id — não invente ids nem ' +
    'crie recomendações novas. Se um trecho do documento não corresponder a nenhuma ' +
    'recomendação da lista, resuma-o em unmatched_notes em vez de forçar uma ' +
    'correspondência. Registre em confidence_notes qualquer ambiguidade relevante.\n\n' +
    `Recomendações cadastradas:\n${JSON.stringify(existingRecs)}`

  const result = await callGemini(
    [{ inline_data: { mime_type: 'application/pdf', data: base64 } }, { text: prompt }],
    MATCH_RESPONSE_SCHEMA
  )
  await updateJob(adminClient, job.id, { status: 'done', result_json: result })
}

async function processAnalyzeResponse(adminClient: any, job: any) {
  const input = job.input_text ? JSON.parse(job.input_text) : { recommendations: [], municipality_response_notes: null }
  const recommendations = Array.isArray(input.recommendations) ? input.recommendations : []

  const introText =
    'Você é um assistente de uma agência reguladora brasileira analisando se a resposta ' +
    'de um prestador/município atende adequadamente às determinações/recomendações de uma ' +
    'fiscalização. Para cada recomendação, compare três coisas: (1) o que foi determinado ' +
    '— campo "determinacao_descricao" quando existir (a exigência original e mais autoritativa), ' +
    'caindo para "description" quando não houver determinação vinculada; (2) o que o prestador ' +
    'respondeu — "resposta_manifestacao_prestador"/"resposta_descricao_atendimento" (resposta ' +
    'oficial registrada) e "titular_response" (campo legado, se preenchido); e (3) as evidências ' +
    'anexadas, fornecidas a seguir como imagens/PDFs rotulados com o id da recomendação — verifique ' +
    'se elas de fato comprovam o que a resposta alega, e não apenas se existem. Considere também ' +
    '"resposta_status" e "resposta_dentro_prazo". Se a resposta afirma algo que a evidência não ' +
    'sustenta (ou não há evidência anexada para uma alegação que dependeria dela), marque ' +
    '"needs_revision" e explique o motivo. Marque evidence_reviewed=true apenas na recomendação ' +
    'cuja(s) evidência(s) anexada(s) você efetivamente examinou nas imagens/PDFs fornecidos. Dê um ' +
    'veredito por recomendação e um veredito geral. Use o "id" de cada recomendação como ' +
    'recommendation_id.\n\n' +
    `Dados das recomendações (sem as evidências, anexadas separadamente abaixo):\n${JSON.stringify(
      recommendations.map(({ evidence_refs, ...rest }: any) => rest)
    )}\n\n` +
    `Observações gerais da resposta municipal: ${input.municipality_response_notes || '(nenhuma)'}`

  const parts: any[] = [{ text: introText }]
  let evidenceCount = 0
  for (const rec of recommendations) {
    const refs = Array.isArray(rec.evidence_refs) ? rec.evidence_refs.slice(0, MAX_EVIDENCE_PER_RECOMMENDATION) : []
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
        parts.push({ text: `Evidência anexada à recomendação ${rec.id}:` })
        parts.push({ inline_data: { mime_type: mime, data: arrayBufferToBase64(buf) } })
        evidenceCount++
      } catch {
        // Evidência individual inacessível não deve derrubar a análise inteira.
      }
    }
    if (evidenceCount >= MAX_EVIDENCE_TOTAL) break
  }

  const result = await callGemini(parts, ANALYZE_RESPONSE_SCHEMA)
  await updateJob(adminClient, job.id, { status: 'done', result_json: result })
}

async function handleJob(adminClient: any, job: any) {
  console.log(`caters_ai_worker: processando job ${job.id} (${job.job_type})`)
  try {
    if (job.job_type === 'extract_pdf') {
      await processExtractPdf(adminClient, job)
    } else if (job.job_type === 'match_response_pdf') {
      await processMatchResponsePdf(adminClient, job)
    } else if (job.job_type === 'analyze_response') {
      await processAnalyzeResponse(adminClient, job)
    } else {
      await updateJob(adminClient, job.id, { status: 'error', error_message: 'job_type desconhecido' })
    }
    console.log(`caters_ai_worker: job ${job.id} concluído`)
  } catch (err) {
    if (err instanceof GeminiRateLimitError) {
      // callGemini já tentou de novo com backoff antes de chegar aqui — não
      // existe nenhum mecanismo separado que reprocesse um job 'queued'
      // sozinho, então esgotado o retry isso já é uma falha de verdade.
      console.error(`caters_ai_worker: job ${job.id} excedeu limite de taxa do Gemini após retries`, err.message)
      await updateJob(adminClient, job.id, {
        status: 'error',
        error_message: 'Limite de requisições do Gemini excedido (mesmo após retry). Tente novamente em alguns minutos.'
      })
      return
    }
    console.error(`caters_ai_worker: job ${job.id} falhou`, err)
    await updateJob(adminClient, job.id, { status: 'error', error_message: err?.message || String(err) })
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (!supabaseUrl || !serviceKey) {
    console.error('caters_ai_worker: server_misconfigured — SUPABASE_URL/SERVICE_ROLE_KEY ausentes')
    return jsonResponse({ error: 'server_misconfigured' }, 500)
  }
  if (!Deno.env.get('GEMINI_API_KEY')) {
    console.error('caters_ai_worker: GEMINI_API_KEY ausente')
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
    console.error('caters_ai_worker: claim_failed', err)
    return jsonResponse({ error: 'claim_failed', details: err?.message }, 500)
  }

  console.log(`caters_ai_worker: ${jobs.length} job(s) reclamado(s)${specificJobId ? ` (job_id=${specificJobId})` : ''}`)

  for (const job of jobs) {
    await handleJob(adminClient, job)
  }

  return jsonResponse({ processed: jobs.length })
})
