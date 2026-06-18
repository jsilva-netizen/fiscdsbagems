import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  ClipboardList,
  FileText,
  FolderOpen,
  GitMerge,
  Hourglass,
  TimerOff,
  TriangleAlert,
  Clock,
} from 'lucide-react';
import CatersLayout from '@/components/caters/CatersLayout';
import { fetchDashboardData, fetchAlertsData } from '@/lib/caters/dashboard';
import { formatIsoDateHuman } from '@/lib/caters/dates';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';

async function fetchCatersTNs() {
  const { data, error } = await supabase
    .from('termos_notificacao')
    .select('id, status, camara_tecnica');
  if (error) throw error;
  return (data || []).filter(t => t.camara_tecnica === 'CATERS');
}

function MetricCard({ title, value, icon: Icon, iconBg, iconColor, badge }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {badge ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-emerald-700">
            {badge}
          </span>
        ) : null}
      </div>
      <div>
        <div className="text-3xl font-extrabold tracking-tight text-slate-900">{value}</div>
        <div className="mt-1 text-xs font-semibold leading-tight text-slate-500">{title}</div>
      </div>
    </div>
  );
}

export default function CatersDashboard() {
  const dashQ = useQuery({
    queryKey: ['caters-dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const alertsQ = useQuery({
    queryKey: ['caters-alerts'],
    queryFn: fetchAlertsData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const alertCount = useMemo(() => {
    const d = alertsQ.data;
    if (!d) return 0;
    return d.awaitingAnalysis.length + d.overdueResponses.length + d.overdueRecommendations.length;
  }, [alertsQ.data]);

  const tnQ = useQuery({
    queryKey: ['caters-tns'],
    queryFn: fetchCatersTNs,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

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
    <CatersLayout alertCount={alertCount}>
      <div className="bg-slate-50 min-h-full">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">
                Centro de acompanhamento regulatório — CATERS/DSB/AGEMS
              </p>
            </div>

            {dashQ.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Falha ao carregar: {String(dashQ.error?.message ?? dashQ.error)}
              </div>
            )}

            {/* Termos de Notificação — CATERS */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Termos de Notificação
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                  <div className="mb-3"><div className="rounded-lg p-2 bg-teal-50 w-fit"><FileText className="h-5 w-5 text-teal-700" /></div></div>
                  <div><div className="text-3xl font-extrabold tracking-tight text-slate-900">{tnVal(tnData.length)}</div><div className="mt-1 text-xs font-semibold text-slate-500">Total de TNs</div></div>
                </div>
                <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                  <div className="mb-3"><div className="rounded-lg p-2 bg-blue-50 w-fit"><Clock className="h-5 w-5 text-blue-700" /></div></div>
                  <div><div className="text-3xl font-extrabold tracking-tight text-slate-900">{tnVal(tnAguardandoResposta)}</div><div className="mt-1 text-xs font-semibold text-slate-500">Aguardando resposta</div></div>
                </div>
                <div className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm ${tnPrazoVencido > 0 ? 'border-red-200' : 'border-slate-200/70'}`}>
                  <div className="mb-3"><div className="rounded-lg p-2 bg-red-50 w-fit"><TimerOff className="h-5 w-5 text-red-700" /></div></div>
                  <div><div className={`text-3xl font-extrabold tracking-tight ${tnPrazoVencido > 0 ? 'text-red-600' : 'text-slate-900'}`}>{tnVal(tnPrazoVencido)}</div><div className="mt-1 text-xs font-semibold text-slate-500">Prazo vencido</div></div>
                </div>
                <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                  <div className="mb-3"><div className="rounded-lg p-2 bg-amber-50 w-fit"><GitMerge className="h-5 w-5 text-amber-700" /></div></div>
                  <div><div className="text-3xl font-extrabold tracking-tight text-slate-900">{tnVal(tnRespondido)}</div><div className="mt-1 text-xs font-semibold text-slate-500">Respondidos</div></div>
                </div>
                <div className="flex flex-col justify-between rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                  <div className="mb-3"><div className="rounded-lg p-2 bg-orange-50 w-fit"><TriangleAlert className="h-5 w-5 text-orange-700" /></div></div>
                  <div><div className="text-3xl font-extrabold tracking-tight text-slate-900">{tnVal(tnPendenteTN + tnAguardandoAssinatura)}</div><div className="mt-1 text-xs font-semibold text-slate-500">Pendente de emissão</div></div>
                </div>
              </div>
            </section>

            {/* Métricas — Processos CATERS */}
            <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
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

            {/* Listas */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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

              {/* Respostas atrasadas */}
              <section className="rounded-2xl bg-slate-100 p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    Respostas atrasadas
                    {(d?.counts.overdueResponses ?? 0) > 0 && (
                      <span className="h-2 w-2 rounded-full bg-red-600" />
                    )}
                  </div>
                  <Link
                    to={createPageUrl('CatersAvisos')}
                    className="text-sm font-bold text-emerald-700 hover:underline"
                  >
                    Ver todos
                  </Link>
                </div>

                {loading ? (
                  <div className="rounded-xl bg-white p-5 text-sm text-slate-500">Carregando…</div>
                ) : !d?.lists.overdueResponses.length ? (
                  <div className="rounded-xl bg-white p-5 text-sm text-slate-500">Nenhuma resposta atrasada.</div>
                ) : (
                  <div className="space-y-2">
                    {d.lists.overdueResponses.map((p) => (
                      <Link
                        key={p.id}
                        to={`${createPageUrl('CatersProcessoDetalhe')}?id=${p.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white p-4 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <TriangleAlert className="h-4 w-4 shrink-0 text-red-500" />
                          <span className="truncate text-sm font-bold text-slate-900">
                            {p.process_number} · {p.municipality}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-tight text-red-700">
                          {Math.abs(p.days)}d atraso
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </CatersLayout>
  );
}
