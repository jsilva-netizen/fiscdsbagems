import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';

export async function enqueueCatesaAiJob(termoId) {
  const data = await invokeEdgeFunction('catesa_ai_enqueue', { termo_id: termoId });
  if (!data?.job_id) throw new Error('Falha ao criar job de IA.');
  return data.job_id;
}

export async function fetchCatesaAiJobStatus(jobId) {
  return invokeEdgeFunction('catesa_ai_status', { job_id: jobId });
}

export async function markCatesaAiJobReviewed(jobId, userId) {
  const { error } = await supabase
    .from('catesa_ai_jobs')
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: userId })
    .eq('id', jobId);
  if (error) throw error;
}

const ACTIVE_STATUSES = new Set(['queued', 'processing']);
const MAX_WAIT_MS = 90000;

// Faz polling de um job de IA da CATESA até ele chegar a 'done' ou 'error'.
// Uso: const { job, error } = useCatesaAiJob(jobId);
export function useCatesaAiJob(jobId) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    setJob(null);
    setError(null);
    if (!jobId) return undefined;

    const startedAt = Date.now();
    let intervalId;
    const poll = async () => {
      try {
        const data = await fetchCatesaAiJobStatus(jobId);
        if (stoppedRef.current) return;
        if (data?.status === 'not_found') {
          stoppedRef.current = true;
          clearInterval(intervalId);
          setError('Job não encontrado.');
          return;
        }
        setJob(data);
        if (!ACTIVE_STATUSES.has(data?.status)) {
          stoppedRef.current = true;
          clearInterval(intervalId);
          if (data?.status === 'error') setError(data?.error_message || 'Falha na análise por IA.');
          return;
        }
        if (Date.now() - startedAt > MAX_WAIT_MS) {
          stoppedRef.current = true;
          clearInterval(intervalId);
          setError('A análise está demorando muito mais que o esperado. Verifique se as edge functions de IA foram implantadas e se a GEMINI_API_KEY está configurada.');
        }
      } catch (err) {
        if (stoppedRef.current) return;
        setError(err?.message || 'Erro ao consultar status da análise.');
      }
    };

    poll();
    intervalId = window.setInterval(poll, 3000);
    return () => {
      stoppedRef.current = true;
      clearInterval(intervalId);
    };
  }, [jobId]);

  return { job, error };
}
