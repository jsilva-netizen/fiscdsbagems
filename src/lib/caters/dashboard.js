import { supabase } from '@/lib/supabase';
import { deriveRecommendationStatus } from './recommendations';
import { daysFromToday, addDaysToIsoDate } from './dates';

function computeResponseDueAt(p) {
  return p.titular_response_due_at
    ?? (p.ar_received_at ? addDaysToIsoDate(p.ar_received_at, 30) : null)
    ?? (p.report_sent_at ? addDaysToIsoDate(p.report_sent_at, 30) : null);
}

const PROC_FIELDS =
  'id,process_number,municipality,status,ar_received_at,titular_response_due_at,report_sent_at,created_at';
const REC_FIELDS =
  'id,process_id,description,priority,promised_due_at,fulfilled_at,status,created_at';

export async function fetchDashboardData() {
  const { data: procsData, error: procErr } = await supabase
    .from('caters_processes')
    .select(PROC_FIELDS)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (procErr) throw procErr;
  const processes = procsData ?? [];

  const { data: recsData, error: recErr } = await supabase
    .from('caters_recommendations')
    .select(REC_FIELDS)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (recErr) throw recErr;
  const recommendations = recsData ?? [];
  const processesById = new Map(processes.map((p) => [p.id, p]));

  const awaitingAnalysis = processes.filter((p) => p.status === 'aguardando_analise').length;
  const activeProcesses = processes.filter((p) => p.status !== 'encerrado').length;

  const overdueResponses = [];
  for (const p of processes) {
    if (['respondido', 'encerrado', 'em_analise'].includes(p.status)) continue;
    const due = computeResponseDueAt(p);
    if (!due) continue;
    const days = daysFromToday(due);
    if (days !== null && days < 0) overdueResponses.push({ ...p, response_due_at: due, days });
  }

  const openCounts = new Map();
  for (const r of recommendations) {
    const computed = deriveRecommendationStatus({
      promised_due_at: r.promised_due_at,
      fulfilled_at: r.fulfilled_at,
      current_status: r.status,
    });
    if (computed === 'cumprido') continue;
    const c = openCounts.get(r.process_id) ?? { overdue: 0, onTime: 0 };
    if (computed === 'vencido') c.overdue += 1; else c.onTime += 1;
    openCounts.set(r.process_id, c);
  }

  const followUpProcesses = processes
    .filter((p) => p.status !== 'encerrado' && p.status !== 'aguardando_analise')
    .map((p) => {
      const c = openCounts.get(p.id) ?? { overdue: 0, onTime: 0 };
      return { ...p, recommendations_overdue: c.overdue, recommendations_on_time: c.onTime };
    })
    .filter((p) => p.recommendations_overdue + p.recommendations_on_time > 0)
    .sort(
      (a, b) =>
        (b.recommendations_overdue - a.recommendations_overdue) ||
        (b.recommendations_on_time - a.recommendations_on_time)
    );

  const overdueRecommendations = recommendations
    .map((r) => {
      const computed = deriveRecommendationStatus({
        promised_due_at: r.promised_due_at,
        fulfilled_at: r.fulfilled_at,
        current_status: r.status,
      });
      const days = r.promised_due_at ? (daysFromToday(r.promised_due_at) ?? 0) : 0;
      const p = processesById.get(r.process_id);
      return {
        ...r,
        computed_status: computed,
        days,
        process_number: p?.process_number ?? null,
        municipality: p?.municipality ?? null,
      };
    })
    .filter((r) => r.computed_status === 'vencido');

  return {
    counts: {
      overdueResponses: overdueResponses.length,
      awaitingAnalysis,
      overdueRecommendations: overdueRecommendations.length,
      activeProcesses,
      followUpProcesses: followUpProcesses.length,
    },
    lists: {
      overdueResponses: overdueResponses.slice(0, 10),
      overdueRecommendations: overdueRecommendations.slice(0, 10),
      followUpProcesses: followUpProcesses.slice(0, 10),
    },
  };
}

export async function fetchAlertsData() {
  const { data: procsData, error: procErr } = await supabase
    .from('caters_processes')
    .select(PROC_FIELDS)
    .order('created_at', { ascending: false })
    .limit(2000);
  if (procErr) throw procErr;
  const processes = procsData ?? [];

  const { data: recsData, error: recErr } = await supabase
    .from('caters_recommendations')
    .select(REC_FIELDS)
    .order('created_at', { ascending: false })
    .limit(5000);
  if (recErr) throw recErr;
  const recommendations = recsData ?? [];
  const processesById = new Map(processes.map((p) => [p.id, p]));

  const awaitingAnalysis = processes.filter(
    (p) => p.status === 'aguardando_analise' || p.status === 'dilacao_solicitada'
  );

  const overdueResponses = [];
  for (const p of processes) {
    if (['respondido', 'encerrado', 'em_analise', 'dilacao_solicitada'].includes(p.status)) continue;
    const due = computeResponseDueAt(p);
    if (!due) continue;
    const days = daysFromToday(due);
    if (days !== null && days < 0) overdueResponses.push({ ...p, response_due_at: due, days });
  }

  const overdueRecommendations = recommendations
    .map((r) => {
      const computed = deriveRecommendationStatus({
        promised_due_at: r.promised_due_at,
        fulfilled_at: r.fulfilled_at,
        current_status: r.status,
      });
      const days = r.promised_due_at ? (daysFromToday(r.promised_due_at) ?? 0) : 0;
      const p = processesById.get(r.process_id);
      return {
        ...r,
        computed_status: computed,
        days,
        process_number: p?.process_number ?? null,
        municipality: p?.municipality ?? null,
      };
    })
    .filter((r) => r.computed_status === 'vencido');

  return { awaitingAnalysis, overdueResponses, overdueRecommendations };
}
