import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ClipboardList,
  FileText,
  FileWarning,
  FolderOpen,
  GitMerge,
  Hourglass,
  Search,
  TimerOff,
  TriangleAlert,
  Clock,
} from 'lucide-react';
import AdminShell from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { fetchAlertsData, fetchDashboardData } from '@/lib/caters/dashboard';
import { fetchNotificationReads, markNotificationsRead } from '@/lib/caters/notificationReads';
import { formatIsoDateHuman } from '@/lib/caters/dates';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

async function fetchCatersTNs() {
  const { data, error } = await supabase
    .from('termos_notificacao')
    .select('id, status, camara_tecnica');
  if (error) throw error;
  return (data || []).filter(t => t.camara_tecnica === 'CATERS');
}

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

function MetricCard({ title, value, icon: Icon, iconBg, iconColor, badge }) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-200/70 bg-white p-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className={`rounded-md p-1.5 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        {badge ? (
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tight text-emerald-700">
            {badge}
          </span>
        ) : null}
      </div>
      <div>
        <div className="text-xl font-extrabold tracking-tight text-slate-900">{value}</div>
        <div className="mt-0.5 text-[11px] font-semibold leading-tight text-slate-500">{title}</div>
      </div>
    </div>
  );
}

export default function CatersDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const dashQ = useQuery({
    queryKey: ['caters-dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const tnQ = useQuery({
    queryKey: ['caters-tns'],
    queryFn: fetchCatersTNs,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const alertsQ = useQuery({
    queryKey: ['caters-alerts'],
    queryFn: fetchAlertsData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const alertsData = alertsQ.data;
  const keys = alertsData ? makeKeys(alertsData) : [];

  const readsQ = useQuery({
    queryKey: ['caters-notification-reads', user?.id, keys],
    queryFn: () => fetchNotificationReads({ userId: user.id, keys }),
    enabled: !!user?.id && keys.length > 0,
    staleTime: 60_000,
  });

  const readSet = new Set((readsQ.data ?? []).map((r) => r.key));

  const markAllMut = useMutation({
    mutationFn: () => markNotificationsRead({ userId: user.id, keys }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caters-notification-reads', user?.id] }),
  });

  const markOneMut = useMutation({
    mutationFn: (key) => markNotificationsRead({ userId: user.id, keys: [key] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caters-notification-reads', user?.id] }),
  });

  const alertCount = useMemo(() => {
    if (!alertsData) return 0;
    return alertsData.awaitingAnalysis.length + alertsData.overdueResponses.length + alertsData.overdueRecommendations.length;
  }, [alertsData]);

  const overdueUnread = alertsData ? alertsData.overdueResponses.reduce((acc, p) => {
    const key = `overdue_response:${p.id}:${p.response_due_at}`;
    return acc + (readSet.has(key) ? 0 : 1);
  }, 0) : 0;

  const overdueRecUnread = alertsData ? alertsData.overdueRecommendations.reduce((acc, r) => {
    const key = `overdue_recommendation:${r.id}:${r.promised_due_at ?? ''}`;
    return acc + (readSet.has(key) ? 0 : 1);
  }, 0) : 0;

  const awaitingUnread = alertsData ? alertsData.awaitingAnalysis.reduce((acc, p) => {
    const key = `awaiting_analysis:${p.id}`;
    return acc + (readSet.has(key) ? 0 : 1);
  }, 0) : 0;

  const d = dashQ.data;
  const loading = dashQ.isLoading;
  const val = (v) => (loading ? '—' : String(v ?? 0));

  const tnData = tnQ.data ?? [];
  const tnVal = (v) => (tnQ.isLoading ? '—' : String(v ?? 0));
  const tnPendenteTN = tnData.filter(t => t.status === 'pendente_tn').length;
  const tnAguardandoAssinatura = tnData.filter(t => t.status === 'aguardando_assinatura_prestador').length;
  const tnAguardandoResposta = tnData.filter(t => t.status === 'aguardando_resposta').length;
  const tnPrazoVencido = tnData.filter(t => t.status === 'prazo_vencido').length;
  const tnRespondido = tnData.filter(t => t.status === 'respondido').length;

  return (
    <AdminShell title="CATERS" subtitle="Câmara Técnica de Resíduos Sólidos">
      <div className="bg-slate-50 min-h-full">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {dashQ.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Falha ao carregar: {String(dashQ.error?.message ?? dashQ.error)}
              </div>
            )}

            {alertsQ.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Erro ao carregar alertas: {String(alertsQ.error?.message)}
              </div>
            )}

            {/* Termos de Notificação — CATERS */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Termos de Notificação
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="flex flex-col justify-between rounded-lg border border-slate-200/70 bg-white p-3 shadow-sm">
                  <div className="mb-2"><div className="rounded-md p-1.5 bg-teal-50 w-fit"><FileText className="h-4 w-4 text-teal-700" /></div></div>
                  <div><div className="text-xl font-extrabold tracking-tight text-slate-900">{tnVal(tnData.length)}</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Total de TNs</div></div>
                </div>
                <div className="flex flex-col justify-between rounded-lg border border-slate-200/70 bg-white p-3 shadow-sm">
                  <div className="mb-2"><div className="rounded-md p-1.5 bg-blue-50 w-fit"><Clock className="h-4 w-4 text-blue-700" /></div></div>
                  <div><div className="text-xl font-extrabold tracking-tight text-slate-900">{tnVal(tnAguardandoResposta)}</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Aguardando resposta</div></div>
                </div>
                <div className={`flex flex-col justify-between rounded-lg border bg-white p-3 shadow-sm ${tnPrazoVencido > 0 ? 'border-red-200' : 'border-slate-200/70'}`}>
                  <div className="mb-2"><div className="rounded-md p-1.5 bg-red-50 w-fit"><TimerOff className="h-4 w-4 text-red-700" /></div></div>
                  <div><div className={`text-xl font-extrabold tracking-tight ${tnPrazoVencido > 0 ? 'text-red-600' : 'text-slate-900'}`}>{tnVal(tnPrazoVencido)}</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Prazo vencido</div></div>
                </div>
                <div className="flex flex-col justify-between rounded-lg border border-slate-200/70 bg-white p-3 shadow-sm">
                  <div className="mb-2"><div className="rounded-md p-1.5 bg-amber-50 w-fit"><GitMerge className="h-4 w-4 text-amber-700" /></div></div>
                  <div><div className="text-xl font-extrabold tracking-tight text-slate-900">{tnVal(tnRespondido)}</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Respondidos</div></div>
                </div>
                <div className="flex flex-col justify-between rounded-lg border border-slate-200/70 bg-white p-3 shadow-sm">
                  <div className="mb-2"><div className="rounded-md p-1.5 bg-orange-50 w-fit"><TriangleAlert className="h-4 w-4 text-orange-700" /></div></div>
                  <div><div className="text-xl font-extrabold tracking-tight text-slate-900">{tnVal(tnPendenteTN + tnAguardandoAssinatura)}</div><div className="mt-0.5 text-[11px] font-semibold text-slate-500">Pendente de emissão</div></div>
                </div>
              </div>
            </section>

            {/* Métricas — Processos CATERS */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <MetricCard
                title="Processos em acompanhamento"
                value={val(d?.counts.followUpProcesses)}
                icon={BarChart3}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-700"
                badge="Global"
              />
              <MetricCard
                title="Prazos de resposta atrasados"
                value={val(d?.counts.overdueResponses)}
                icon={TimerOff}
                iconBg="bg-red-50"
                iconColor="text-red-700"
              />
              <MetricCard
                title="Aguardando análise"
                value={val(d?.counts.awaitingAnalysis)}
                icon={Hourglass}
                iconBg="bg-amber-50"
                iconColor="text-amber-700"
              />
              <MetricCard
                title="Recomendações vencidas"
                value={val(d?.counts.overdueRecommendations)}
                icon={ClipboardList}
                iconBg="bg-red-50"
                iconColor="text-red-700"
              />
              <MetricCard
                title="Processos ativos"
                value={val(d?.counts.activeProcesses)}
                icon={FolderOpen}
                iconBg="bg-slate-100"
                iconColor="text-slate-700"
              />
            </section>

            {/* Processos em acompanhamento */}
            <section className="rounded-2xl bg-slate-100 p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  Processos em acompanhamento
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    {val(d?.counts.followUpProcesses)}
                  </span>
                </div>
                <Link
                  to={createPageUrl('CatersProcessos')}
                  className="text-sm font-bold text-emerald-700 hover:underline"
                >
                  Ver todos
                </Link>
              </div>

              {loading ? (
                <div className="rounded-xl bg-white p-5 text-sm text-slate-500">Carregando…</div>
              ) : !d?.lists.followUpProcesses.length ? (
                <div className="rounded-xl bg-white p-5 text-sm text-slate-500">Nenhum processo em acompanhamento.</div>
              ) : (
                <div className="space-y-3">
                  {d.lists.followUpProcesses.map((p) => (
                    <Link
                      key={p.id}
                      to={`${createPageUrl('CatersProcessoDetalhe')}?id=${p.id}`}
                      className="group flex items-center justify-between gap-4 rounded-xl bg-white p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100">
                          <FolderOpen className="h-4 w-4 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                            {p.process_number} · {p.municipality}
                          </div>
                          <div className="text-xs text-slate-500">
                            Criado em: {formatIsoDateHuman(p.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-emerald-700">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {p.recommendations_on_time} no prazo
                        </span>
                        {p.recommendations_overdue > 0 && (
                          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-red-700">
                            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                            {p.recommendations_overdue} vencida{p.recommendations_overdue > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* ── Avisos ── */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Avisos</h2>
              <Button
                onClick={() => markAllMut.mutate()}
                disabled={markAllMut.isPending || keys.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {markAllMut.isPending ? 'Marcando…' : 'Marcar tudo como lido'}
              </Button>
            </div>

            {/* Respostas atrasadas */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900">Respostas atrasadas</h3>
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700">{overdueUnread}</span>
              </div>

              {alertsQ.isLoading ? (
                <div className="rounded-xl bg-white p-5 text-sm text-slate-500">Carregando…</div>
              ) : !alertsData?.overdueResponses.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-50 shadow-sm">
                    <TimerOff className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="font-semibold text-slate-900">Nenhuma resposta atrasada.</div>
                  <div className="mt-1 text-sm text-slate-500">Acompanhe aqui quando algum prazo expirar.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertsData.overdueResponses.map((p) => {
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

            {/* Recomendações vencidas */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900">Recomendações vencidas</h3>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">{overdueRecUnread}</span>
              </div>

              {alertsQ.isLoading ? (
                <div className="rounded-xl bg-white p-5 text-sm text-slate-500">Carregando…</div>
              ) : !alertsData?.overdueRecommendations.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-slate-50 shadow-sm">
                    <FileWarning className="h-6 w-6 text-slate-400" />
                  </div>
                  <div className="font-semibold text-slate-900">Nenhuma recomendação vencida.</div>
                  <div className="mt-1 text-sm text-slate-500">As pendências dentro do prazo aparecem na página de recomendações.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertsData.overdueRecommendations.map((r) => {
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

            {/* Aguardando análise */}
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-900">Aguardando análise</h3>
                <span className="rounded-full bg-slate-200/60 px-2.5 py-0.5 text-xs font-bold text-slate-600">{awaitingUnread}</span>
              </div>

              {alertsQ.isLoading ? (
                <div className="rounded-xl bg-white p-5 text-sm text-slate-500">Carregando…</div>
              ) : !alertsData?.awaitingAnalysis.length ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-100 p-10 text-center">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-white shadow-sm">
                    <Search className="h-7 w-7 text-slate-400" />
                  </div>
                  <div className="font-semibold text-slate-900">Nenhum item aguardando análise.</div>
                  <div className="mt-1 text-sm text-slate-500">Todos os processos foram revisados ou estão com prazos regulares.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertsData.awaitingAnalysis.map((p) => {
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

            {alertCount === 0 && !alertsQ.isLoading && (
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
    </AdminShell>
  );
}
