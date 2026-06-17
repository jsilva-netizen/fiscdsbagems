import { supabase } from '@/lib/supabase';
import { deriveRecommendationStatus } from './recommendations';
import { addDaysToIsoDate } from './dates';

export function formatProcessStatus(status) {
  const map = {
    aguardando_analise: 'Aguardando análise',
    em_analise: 'Em análise',
    respondido: 'Respondido',
    no_prazo: 'No prazo',
    critico: 'Crítico',
    atrasado: 'Resposta atrasada',
    encerrado: 'Encerrado',
  };
  return map[status] ?? status;
}

export function computeResponseDueAt(p) {
  return p.titular_response_due_at
    ?? (p.ar_received_at ? addDaysToIsoDate(p.ar_received_at, 30) : null)
    ?? (p.report_sent_at ? addDaysToIsoDate(p.report_sent_at, 30) : null);
}

const LIST_FIELDS =
  'id,process_number,municipality,object,status,ar_sent_at,ar_received_at,ar_tracking_code,ar_protocol_number,report_sent_at,technician_name,titular_response_due_at,created_at,updated_at';
const DETAIL_FIELDS = '*';

export async function fetchProcesses({ search, municipality, status } = {}) {
  let q = supabase
    .from('caters_processes')
    .select(LIST_FIELDS)
    .order('created_at', { ascending: false });

  if (search?.trim()) q = q.ilike('process_number', `%${search.trim()}%`);
  if (municipality?.trim()) q = q.ilike('municipality', `%${municipality.trim()}%`);
  if (status) q = q.eq('status', status);

  const { data, error } = await q;
  if (error) throw error;
  const processes = data ?? [];
  if (!processes.length) return processes;

  const ids = processes.map((p) => p.id);
  const { data: recs, error: recErr } = await supabase
    .from('caters_recommendations')
    .select('process_id,promised_due_at,fulfilled_at,status')
    .in('process_id', ids)
    .limit(5000);
  if (recErr) throw recErr;

  const counts = new Map();
  for (const r of (recs ?? [])) {
    const computed = deriveRecommendationStatus({
      promised_due_at: r.promised_due_at,
      fulfilled_at: r.fulfilled_at,
      current_status: r.status,
    });
    if (computed === 'cumprido') continue;
    const c = counts.get(r.process_id) ?? { overdue: 0, onTime: 0 };
    if (computed === 'vencido') c.overdue += 1; else c.onTime += 1;
    counts.set(r.process_id, c);
  }

  return processes.map((p) => {
    const c = counts.get(p.id) ?? { overdue: 0, onTime: 0 };
    return { ...p, recommendations_overdue: c.overdue, recommendations_on_time: c.onTime };
  });
}

export async function fetchProcessById(processId) {
  const { data, error } = await supabase
    .from('caters_processes')
    .select(DETAIL_FIELDS)
    .eq('id', processId)
    .single();
  if (error) throw error;
  return data;
}

export async function createProcess(input) {
  const { data, error } = await supabase
    .from('caters_processes')
    .insert(input)
    .select(DETAIL_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateProcess(processId, input) {
  const { data, error } = await supabase
    .from('caters_processes')
    .update(input)
    .eq('id', processId)
    .select(DETAIL_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProcess(processId) {
  const { error } = await supabase.from('caters_processes').delete().eq('id', processId);
  if (error) throw error;
}

export async function fetchFiscalizacoesParaVincular() {
  const { data, error } = await supabase
    .from('caters_fiscalizacoes_disponiveis')
    .select('*')
    .order('data_fim', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function importFromFiscalizacao(fiscalizacaoId, catersProcessId, prazoDias = 30) {
  const { data, error } = await supabase.rpc('caters_import_from_fiscalizacao', {
    p_fiscalizacao_id: fiscalizacaoId,
    p_caters_process_id: catersProcessId,
    p_prazo_dias: prazoDias,
  });
  if (error) throw error;
  return data; // número de itens importados
}
