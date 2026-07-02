import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  FileWarning,
  FolderOpen,
  Hourglass,
  Loader2,
  Search,
  TimerOff,
  TriangleAlert,
} from 'lucide-react';
import CatersLayout from '@/components/caters/CatersLayout';
import { fetchAlertsData } from '@/lib/caters/dashboard';
import { fetchNotificationReads, markNotificationsRead } from '@/lib/caters/notificationReads';
import { formatIsoDateHuman } from '@/lib/caters/dates';
import { formatRecommendationPriority } from '@/lib/caters/recommendations';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

function makeKeys(alerts) {
  const keys = [];
  for (const p of alerts.overdueResponses) {
    keys.push(`overdue_response:${p.id}:${p.response_due_at}`);
  }
  for (const p of alerts.awaitingAnalysis) {
    keys.push(`awaiting_analysis:${p.id}`);
  }
  for (const r of alerts.overdueRecommendations) {
    keys.push(`overdue_recommendation:${r.id}:${r.promised_due_at ?? ''}`);
  }
  return keys;
}

export default function CatersAvisos() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const alertsQ = useQuery({
    queryKey: ['caters-alerts'],
    queryFn: fetchAlertsData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const keys = alertsQ.data ? makeKeys(alertsQ.data) : [];

  const readsQ = useQuery({
    queryKey: ['caters-notification-reads', user?.id, keys],
    queryFn: () => fetchNotificationReads({ userId: user.id, keys }),
    enabled: !!user?.id && keys.length > 0,
    staleTime: 60_000,
  });

  const readSet = new Set((readsQ.data ?? []).map((r) => r.key));
  const unreadCount = keys.reduce((acc, k) => acc + (readSet.has(k) ? 0 : 1), 0);

  const markAllMut = useMutation({
    mutationFn: () => markNotificationsRead({ userId: user.id, keys }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caters-notification-reads', user?.id] }),
  });

  const markOneMut = useMutation({
    mutationFn: (key) => markNotificationsRead({ userId: user.id, keys: [key] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caters-notification-reads', user?.id] }),
  });

  const alertCount = useMemo(() => {
    const d = alertsQ.data;
    if (!d) return 0;
    return d.awaitingAnalysis.length + d.overdueResponses.length + d.overdueRecommendations.length;
  }, [alertsQ.data]);

  const d = alertsQ.data;

  const overdueUnread = d ? d.overdueResponses.reduce((acc, p) => {
    const key = `overdue_response:${p.id}:${p.response_due_at}`;
    return acc + (readSet.has(key) ? 0 : 1);
  }, 0) : 0;

  const overdueRecUnread = d ? d.overdueRecommendations.reduce((acc, r) => {
    const key = `overdue_recommendation:${r.id}:${r.promised_due_at ?? ''}`;
    return acc + (readSet.has(key) ? 0 : 1);
  }, 0) : 0;

  const awaitingUnread = d ? d.awaitingAnalysis.reduce((acc, p) => {
    const key = `awaiting_analysis:${p.id}`;
    return acc + (readSet.has(key) ? 0 : 1);
  }, 0) : 0;

  if (alertsQ.isLoading) {
    return (
      <CatersLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </CatersLayout>
    );
  }

  return (
    <CatersLayout>
      <div className="min-h-full bg-slate-50">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-6xl space-y-8">

            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50">
                  <Bell className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Avisos</h1>
                  <p className="text-sm text-slate-500">
                    {unreadCount > 0 ? `${unreadCount} não lido${unreadCount !== 1 ? 's' : ''}` : 'Tudo lido'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => markAllMut.mutate()}
                disabled={markAllMut.isPending || keys.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {markAllMut.isPending ? 'Marcando…' : 'Marcar tudo como lido'}
              </Button>
            </div>

            {alertsQ.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Erro ao carregar alertas: {String(alertsQ.error?.message)}
              </div>
            )}

            {/* ── Respostas atrasadas ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">Respostas atrasadas</h2>
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">{overdueUnread}</span>
              </div>

              {!d?.overdueResponses.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-50 shadow-sm">
                    <TimerOff className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="font-semibold text-slate-900">Nenhuma resposta atrasada.</div>
                  <div className="mt-1 text-sm text-slate-500">Acompanhe aqui quando algum prazo expirar.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {d.overdueResponses.map((p) => {
                    const key = `overdue_response:${p.id}:${p.response_due_at}`;
                    const isRead = readSet.has(key);
                    return (
                      <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex gap-4">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50">
                            <TimerOff className="h-5 w-5 text-red-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">
                              <Link to={`${createPageUrl('CatersProcessoDetalhe')}?id=${p.id}`}
                                className="underline underline-offset-4 decoration-slate-300/60 hover:decoration-slate-400">
                                Processo {p.process_number}
                              </Link>
                              {' '}— Prazo expirado
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              Município: <span className="font-semibold">{p.municipality}</span>. Prazo: {formatIsoDateHuman(p.response_due_at)} ({Math.abs(p.days)}d atraso).
                            </div>
                          </div>
                        </div>
                        <button type="button"
                          className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-bold transition-colors ${
                            isRead ? 'border-slate-200 text-slate-400' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                          }`}
                          onClick={() => markOneMut.mutate(key)}
                          disabled={markOneMut.isPending || isRead}>
                          {isRead ? 'Lido' : 'Marcar lido'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Recomendações vencidas ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">Recomendações vencidas</h2>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">{overdueRecUnread}</span>
              </div>

              {!d?.overdueRecommendations.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-50 shadow-sm">
                    <FileWarning className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="font-semibold text-slate-900">Nenhuma recomendação vencida.</div>
                  <div className="mt-1 text-sm text-slate-500">As pendências dentro do prazo aparecem na página de recomendações.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {d.overdueRecommendations.map((r) => {
                    const key = `overdue_recommendation:${r.id}:${r.promised_due_at ?? ''}`;
                    const isRead = readSet.has(key);
                    return (
                      <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex gap-4">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-50">
                            <FileWarning className="h-5 w-5 text-indigo-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">{r.description}</div>
                            <div className="mt-1 text-sm text-slate-600">
                              Processo:{' '}
                              <Link to={`${createPageUrl('CatersProcessoDetalhe')}?id=${r.process_id}&tab=recomendacoes`}
                                className="font-semibold text-indigo-700 underline underline-offset-4 decoration-indigo-300/50">
                                {r.process_number ?? '—'}
                              </Link>
                              {r.municipality ? ` · ${r.municipality}` : ''}
                              {' '}· Prazo: {r.promised_due_at ? formatIsoDateHuman(r.promised_due_at) : '—'}
                              {' '}({Math.abs(r.days)}d atraso)
                            </div>
                          </div>
                        </div>
                        <button type="button"
                          className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-bold transition-colors ${
                            isRead ? 'border-slate-200 text-slate-400' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                          }`}
                          onClick={() => markOneMut.mutate(key)}
                          disabled={markOneMut.isPending || isRead}>
                          {isRead ? 'Lido' : 'Marcar lido'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ── Aguardando análise ── */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900">Aguardando análise</h2>
                <span className="rounded-full bg-slate-200/60 px-2.5 py-0.5 text-xs font-bold text-slate-600">{awaitingUnread}</span>
              </div>

              {!d?.awaitingAnalysis.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-100 p-10 text-center">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm">
                    <Search className="h-7 w-7 text-slate-400" />
                  </div>
                  <div className="font-semibold text-slate-900">Nenhum item aguardando análise.</div>
                  <div className="mt-1 text-sm text-slate-500">Todos os processos foram revisados ou estão com prazos regulares.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {d.awaitingAnalysis.map((p) => {
                    const key = `awaiting_analysis:${p.id}`;
                    const isRead = readSet.has(key);
                    return (
                      <div key={key} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex gap-4">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100">
                            <Search className="h-5 w-5 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">
                              <Link to={`${createPageUrl('CatersProcessoDetalhe')}?id=${p.id}`}
                                className="underline underline-offset-4 decoration-slate-300/60 hover:decoration-slate-400">
                                Processo {p.process_number}
                              </Link>
                              {' '}· {p.municipality}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">Status: aguardando análise desde {formatIsoDateHuman(p.created_at)}.</div>
                          </div>
                        </div>
                        <button type="button"
                          className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-bold transition-colors ${
                            isRead ? 'border-slate-200 text-slate-400' : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                          }`}
                          onClick={() => markOneMut.mutate(key)}
                          disabled={markOneMut.isPending || isRead}>
                          {isRead ? 'Lido' : 'Marcar lido'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {alertCount === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300/60 bg-emerald-50/30 py-16 text-center">
                <div className="mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-100">
                  <Bell className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="font-semibold text-emerald-700">Tudo em dia!</p>
                <p className="mt-1 text-sm text-slate-500">Nenhum alerta pendente no momento.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </CatersLayout>
  );
}
