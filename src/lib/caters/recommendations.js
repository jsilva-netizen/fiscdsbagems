import { supabase } from '@/lib/supabase';
import { daysFromToday } from './dates';

export function deriveRecommendationStatus({ promised_due_at, fulfilled_at, current_status }) {
  if (fulfilled_at) return 'cumprido';
  if (!promised_due_at) {
    if (current_status === 'em_andamento') return 'em_andamento';
    return 'pendente';
  }
  const days = daysFromToday(promised_due_at);
  if (days === null) return 'pendente';
  if (days < 0) return 'vencido';
  if (current_status === 'em_andamento') return 'em_andamento';
  return 'pendente';
}

export function formatRecommendationPriority(priority) {
  const map = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
  return map[priority] ?? priority;
}

export function formatRecommendationStatus(status) {
  const map = { pendente: 'Pendente', em_andamento: 'Em andamento', vencido: 'Vencido', cumprido: 'Cumprido' };
  return map[status] ?? status;
}

const SELECT_FIELDS =
  'id,process_id,item_code,description,category,priority,promised_due_at,status,fulfilled_at,titular_response,evidence_url,notes,created_at,updated_at';

export async function fetchRecommendationsByProcess(processId) {
  const { data, error } = await supabase
    .from('caters_recommendations')
    .select(SELECT_FIELDS)
    .eq('process_id', processId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRecommendation(input) {
  const status = deriveRecommendationStatus({
    promised_due_at: input.promised_due_at ?? null,
    fulfilled_at: null,
    current_status: input.status ?? null,
  });
  const { data, error } = await supabase
    .from('caters_recommendations')
    .insert({ ...input, status })
    .select(SELECT_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecommendation(id, input) {
  const patch = { ...input };
  if (patch.status === undefined && (patch.promised_due_at !== undefined || patch.fulfilled_at !== undefined)) {
    patch.status = deriveRecommendationStatus({
      promised_due_at: patch.promised_due_at ?? null,
      fulfilled_at: patch.fulfilled_at ?? null,
      current_status: null,
    });
  }
  const { data, error } = await supabase
    .from('caters_recommendations')
    .update(patch)
    .eq('id', id)
    .select(SELECT_FIELDS)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRecommendation(id) {
  const { error } = await supabase.from('caters_recommendations').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRecommendationSummariesByProcess() {
  const { data: procs, error: procErr } = await supabase
    .from('caters_processes')
    .select('id,process_number,municipality,created_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (procErr) throw procErr;
  const procsById = new Map((procs ?? []).map((p) => [p.id, p]));

  const { data: recs, error: recErr } = await supabase
    .from('caters_recommendations')
    .select('id,process_id,promised_due_at,fulfilled_at,status')
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

  return Array.from(counts.entries())
    .map(([process_id, c]) => {
      const p = procsById.get(process_id);
      return {
        process_id,
        process_number: p?.process_number ?? '—',
        municipality: p?.municipality ?? '—',
        recommendations_on_time: c.onTime,
        recommendations_overdue: c.overdue,
      };
    })
    .sort((a, b) =>
      (b.recommendations_overdue - a.recommendations_overdue) ||
      (b.recommendations_on_time - a.recommendations_on_time) ||
      a.process_number.localeCompare(b.process_number)
    );
}
