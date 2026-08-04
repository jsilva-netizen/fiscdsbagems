import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, FolderOpen, Loader2, Search, X } from 'lucide-react';
import AdminShell from '@/components/layout/AdminShell';
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
    <AdminShell title="CATERS" subtitle="Câmara Técnica de Resíduos Sólidos">
      <div className="min-h-full bg-gray-50">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
              <h1 className="text-xs font-bold uppercase tracking-wider text-gray-400">Recomendações</h1>
              {totalOverdue > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
                  {totalOverdue} vencida{totalOverdue !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Busca */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
                  className="rounded-lg p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {summariesQ.isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : summariesQ.isError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                Erro: {String(summariesQ.error?.message)}
              </div>
            ) : !summaries.length ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white py-16 text-center">
                <ClipboardList className="mb-3 h-10 w-10 text-gray-300" />
                <p className="font-medium text-gray-500">
                  {search ? 'Nenhum resultado para esta busca.' : 'Nenhuma recomendação cadastrada ainda.'}
                </p>
                {search && (
                  <p className="mt-1 text-sm text-gray-400">
                    Tente buscar por outro número de processo ou município.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Processo</th>
                      <th className="px-5 py-3 text-left">Município</th>
                      <th className="px-5 py-3 text-center">No prazo</th>
                      <th className="px-5 py-3 text-center">Vencidas</th>
                      <th className="px-5 py-3 text-center">Total aberto</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summaries.map((s) => {
                      const total = s.recommendations_on_time + s.recommendations_overdue;
                      const pct = total > 0 ? Math.round((s.recommendations_on_time / total) * 100) : 0;
                      return (
                        <tr key={s.process_id} className="group hover:bg-gray-50">
                          <td className="px-5 py-3.5 font-medium text-gray-900">{s.process_number}</td>
                          <td className="px-5 py-3.5 text-gray-600">{s.municipality}</td>
                          <td className="px-5 py-3.5 text-center">
                            {s.recommendations_on_time > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {s.recommendations_on_time}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {s.recommendations_overdue > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                {s.recommendations_overdue}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold text-gray-700">{total}</span>
                              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className={`h-full rounded-full ${s.recommendations_overdue > 0 ? 'bg-rose-400' : 'bg-emerald-500'}`}
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
    </AdminShell>
  );
}
