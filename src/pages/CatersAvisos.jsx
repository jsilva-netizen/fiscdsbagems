import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  ClipboardList,
  FolderOpen,
  Hourglass,
  Loader2,
  TriangleAlert,
} from 'lucide-react';
import CatersLayout from '@/components/caters/CatersLayout';
import { fetchAlertsData } from '@/lib/caters/dashboard';
import { formatIsoDateHuman } from '@/lib/caters/dates';
import { formatRecommendationPriority } from '@/lib/caters/recommendations';
import { createPageUrl } from '@/utils';

function SectionHeader({ icon: Icon, title, count, urgent }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid h-8 w-8 place-items-center rounded-lg ${urgent ? 'bg-red-50' : 'bg-amber-50'}`}>
        <Icon className={`h-4 w-4 ${urgent ? 'text-red-600' : 'text-amber-600'}`} />
      </div>
      <div>
        <div className="font-bold text-slate-900">{title}</div>
        <div className="text-xs text-slate-500">{count} item{count !== 1 ? 'ns' : ''}</div>
      </div>
    </div>
  );
}

export default function CatersAvisos() {
  const alertsQ = useQuery({
    queryKey: ['caters-alerts'],
    queryFn: fetchAlertsData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const alertCount = useMemo(() => {
    const d = alertsQ.data;
    if (!d) return 0;
    return d.awaitingAnalysis.length + d.overdueResponses.length + d.overdueRecommendations.length;
  }, [alertsQ.data]);

  const d = alertsQ.data;

  if (alertsQ.isLoading) {
    return (
      <CatersLayout alertCount={0}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </CatersLayout>
    );
  }

  return (
    <CatersLayout alertCount={alertCount}>
      <div className="min-h-full bg-slate-50">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-4xl space-y-8">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50">
                <Bell className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Avisos</h1>
                <p className="text-sm text-slate-500">
                  {alertCount > 0
                    ? `${alertCount} ite${alertCount !== 1 ? 'ns' : 'm'} requer${alertCount !== 1 ? 'em' : ''} atenção`
                    : 'Nenhum alerta pendente'}
                </p>
              </div>
            </div>

            {alertsQ.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Erro ao carregar alertas: {String(alertsQ.error?.message)}
              </div>
            )}

            {/* Respostas atrasadas */}
            <section className="space-y-3">
              <SectionHeader
                icon={TriangleAlert}
                title="Respostas de titulares atrasadas"
                count={d?.overdueResponses.length ?? 0}
                urgent
              />
              {!d?.overdueResponses.length ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                  Nenhuma resposta atrasada.
                </div>
              ) : (
                <div className="space-y-2">
                  {d.overdueResponses.map((p) => (
                    <Link
                      key={p.id}
                      to={`${createPageUrl('CatersProcessoDetalhe')}?id=${p.id}`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/60 bg-white p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <TriangleAlert className="h-4 w-4 shrink-0 text-red-500" />
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {p.process_number} · {p.municipality}
                          </div>
                          <div className="text-xs text-slate-500">
                            Prazo era: {formatIsoDateHuman(p.response_due_at)}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold uppercase tracking-tight text-red-700">
                        {Math.abs(p.days)}d atraso
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Recomendações vencidas */}
            <section className="space-y-3">
              <SectionHeader
                icon={ClipboardList}
                title="Recomendações vencidas"
                count={d?.overdueRecommendations.length ?? 0}
                urgent
              />
              {!d?.overdueRecommendations.length ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                  Nenhuma recomendação vencida.
                </div>
              ) : (
                <div className="space-y-2">
                  {d.overdueRecommendations.map((r) => (
                    <Link
                      key={r.id}
                      to={`${createPageUrl('CatersProcessoDetalhe')}?id=${r.process_id}&tab=recomendacoes`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/60 bg-white p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-red-700">
                            Vencida
                          </span>
                          {r.priority && (
                            <span className="text-[10px] font-semibold text-slate-500">
                              {formatRecommendationPriority(r.priority)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 truncate text-sm text-slate-800">{r.description}</div>
                        {r.process_number && (
                          <div className="text-xs text-slate-500">
                            Processo: {r.process_number}
                            {r.municipality ? ` · ${r.municipality}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right text-xs text-slate-500">
                        <div className="font-bold text-red-600">{Math.abs(r.days)}d atraso</div>
                        <div>Prazo: {formatIsoDateHuman(r.promised_due_at)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Aguardando análise */}
            <section className="space-y-3">
              <SectionHeader
                icon={Hourglass}
                title="Processos aguardando análise"
                count={d?.awaitingAnalysis.length ?? 0}
              />
              {!d?.awaitingAnalysis.length ? (
                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
                  Nenhum processo aguardando análise.
                </div>
              ) : (
                <div className="space-y-2">
                  {d.awaitingAnalysis.map((p) => (
                    <Link
                      key={p.id}
                      to={`${createPageUrl('CatersProcessoDetalhe')}?id=${p.id}`}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/60 bg-white p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-50">
                          <FolderOpen className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {p.process_number} · {p.municipality}
                          </div>
                          <div className="text-xs text-slate-500">
                            Criado em: {formatIsoDateHuman(p.created_at)}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                        Aguardando
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {alertCount === 0 && !alertsQ.isLoading && !alertsQ.isError && (
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
