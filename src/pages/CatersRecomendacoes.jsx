import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, FolderOpen, Loader2, Search, X } from 'lucide-react';
import CatersLayout from '@/components/caters/CatersLayout';
import { fetchRecommendationSummariesByProcess } from '@/lib/caters/recommendations';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';

export default function CatersRecomendacoes() {
  const [search, setSearch] = useState('');

  const summariesQ = useQuery({
    queryKey: ['caters-rec-summaries'],
    queryFn: fetchRecommendationSummariesByProcess,
    staleTime: 30_000,
  });

  const summaries = useMemo(() => {
    const list = summariesQ.data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.process_number.toLowerCase().includes(q) ||
        s.municipality.toLowerCase().includes(q)
    );
  }, [summariesQ.data, search]);

  const totalOverdue = useMemo(
    () => (summariesQ.data ?? []).reduce((acc, s) => acc + s.recommendations_overdue, 0),
    [summariesQ.data]
  );

  return (
    <CatersLayout>
      <div className="min-h-full bg-slate-50">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50">
                <ClipboardList className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Recomendações</h1>
                <p className="text-sm text-slate-500">
                  Visão geral por processo
                  {totalOverdue > 0 && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                      {totalOverdue} vencida{totalOverdue !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Busca */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Filtrar por processo ou município…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="rounded-lg p-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {summariesQ.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : summariesQ.isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Erro: {String(summariesQ.error?.message)}
              </div>
            ) : !summaries.length ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/60 bg-white py-16 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-500">
                  {search ? 'Nenhum resultado para esta busca.' : 'Nenhuma recomendação cadastrada ainda.'}
                </p>
                {search && (
                  <p className="mt-1 text-sm text-slate-400">
                    Tente buscar por outro número de processo ou município.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Processo</th>
                      <th className="px-5 py-3 text-left">Município</th>
                      <th className="px-5 py-3 text-center">No prazo</th>
                      <th className="px-5 py-3 text-center">Vencidas</th>
                      <th className="px-5 py-3 text-center">Total aberto</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summaries.map((s) => {
                      const total = s.recommendations_on_time + s.recommendations_overdue;
                      const pct = total > 0 ? Math.round((s.recommendations_on_time / total) * 100) : 0;
                      return (
                        <tr key={s.process_id} className="group hover:bg-slate-50">
                          <td className="px-5 py-3.5 font-medium text-slate-900">{s.process_number}</td>
                          <td className="px-5 py-3.5 text-slate-600">{s.municipality}</td>
                          <td className="px-5 py-3.5 text-center">
                            {s.recommendations_on_time > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {s.recommendations_on_time}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {s.recommendations_overdue > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                {s.recommendations_overdue}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold text-slate-700">{total}</span>
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${s.recommendations_overdue > 0 ? 'bg-red-400' : 'bg-emerald-500'}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              to={`${createPageUrl('CatersProcessoDetalhe')}?id=${s.process_id}&tab=recomendacoes`}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                              <FolderOpen className="h-3.5 w-3.5" />
                              Ver processo
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </CatersLayout>
  );
}
