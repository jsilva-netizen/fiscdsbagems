import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import CaterfLayout from '@/components/caterf/CaterfLayout';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';

const DTR_MODULOS = ['rodovias_dtr', 'transportes_dtr', 'fiscal_dtr'];

function MetricCard({ title, value, icon: Icon, iconBg, iconColor, to, badge }) {
  const inner = (
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
  return to ? <Link to={to}>{inner}</Link> : inner;
}

async function fetchCaterfData() {
  const { data, error } = await supabase
    .from('fiscalizacoes')
    .select('id, status, tipo_modulo');
  if (error) throw error;
  const dtr = (data || []).filter(f => DTR_MODULOS.includes(f.tipo_modulo));
  return {
    total: dtr.length,
    emAndamento: dtr.filter(f => f.status === 'em_andamento').length,
    finalizadas: dtr.filter(f => f.status === 'finalizada').length,
  };
}

export default function CaterfDashboard() {
  const { data: d, isLoading, isError, error } = useQuery({
    queryKey: ['caterf-dashboard'],
    queryFn: fetchCaterfData,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const val = (v) => isLoading ? '—' : String(v ?? 0);

  return (
    <CaterfLayout>
      <div className="bg-slate-50 min-h-full">
        <div className="px-4 sm:px-8 pb-12 pt-8">
          <div className="mx-auto max-w-6xl space-y-8">

            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Centro de acompanhamento regulatório — CATERF/DTR/AGEMS
                </p>
              </div>
              <Link to={createPageUrl('NovaFiscalizacaoDTR')}>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow gap-1.5">
                  <Plus className="h-4 w-4" />
                  Nova Fiscalização
                </Button>
              </Link>
            </div>

            {isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Falha ao carregar: {String(error?.message ?? error)}
              </div>
            )}

            {/* Fiscalização */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Fiscalizações Rodoviárias
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <MetricCard
                  title="Total de fiscalizações"
                  value={val(d?.total)}
                  icon={ClipboardCheck}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-700"
                  to={createPageUrl('FiscalizacoesDTR')}
                  badge="Total"
                />
                <MetricCard
                  title="Em andamento"
                  value={val(d?.emAndamento)}
                  icon={Clock}
                  iconBg="bg-sky-50"
                  iconColor="text-sky-700"
                  to={createPageUrl('FiscalizacoesDTR')}
                />
                <MetricCard
                  title="Finalizadas"
                  value={val(d?.finalizadas)}
                  icon={CheckCircle2}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-700"
                  to={createPageUrl('FiscalizacoesDTR')}
                />
              </div>
            </section>

          </div>
        </div>
      </div>
    </CaterfLayout>
  );
}
