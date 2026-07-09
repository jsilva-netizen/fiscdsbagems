import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';

export async function enqueueCatersAiJob(payload) {
  const data = await invokeEdgeFunction('caters_ai_enqueue', payload);
  if (!data?.job_id) throw new Error('Falha ao criar job de IA.');
  return data.job_id;
}

export async function fetchCatersAiJobStatus(jobId) {
  return invokeEdgeFunction('caters_ai_status', { job_id: jobId });
}

export async function markCatersAiJobReviewed(jobId, userId) {
  const { error } = await supabase
    .from('caters_ai_jobs')
    .update({ reviewed_at: new Date().toISOString(), reviewed_by: userId })
    .eq('id', jobId);
  if (error) throw error;
}

const ACTIVE_STATUSES = new Set(['queued', 'processing']);

// Faz polling de um job de IA do CATERS até ele chegar a 'done' ou 'error'.
// Uso: const { job, error } = useCatersAiJob(jobId);
export function useCatersAiJob(jobId) {
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    setJob(null);
    setError(null);
    if (!jobId) return undefined;

    let intervalId;
    const poll = async () => {
      try {
        const data = await fetchCatersAiJobStatus(jobId);
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
