import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FileWarning,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
  TimerOff,
} from 'lucide-react';
import CatesaLayout from '@/components/camaras/CatesaLayout';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';

function MetricCard({ title, value, icon: Icon, iconBg, iconColor, to, badge, alert }) {
  const inner = (
    <div className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${alert ? 'border-red-200' : 'border-slate-200/70'}`}>
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
        <div className={`text-3xl font-extrabold tracking-tight ${alert ? 'text-red-600' : 'text-slate-900'}`}>{value}</div>
        <div className="mt-1 text-xs font-semibold leading-tight text-slate-500">{title}</div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

async function fetchCatesaData() {
  const now = new Date().toISOString();

  const [termosRes, autosRes] = await Promise.all([
    supabase
      .from('termos_notificacao')
      .select('id, status, prazo_resposta, data_recebimento_resposta, camara_tecnica')
      .eq('camara_tecnica', 'CATESA'),
    supabase
      .from('autos_infracao')
      .select('id, status, camara_tecnica_id')
      .eq('camara_tecnica_id', 'catesa'),
  ]);

  const termos = termosRes.data || [];
  const autos = autosRes.data || [];

  const tnTotal = termos.length;
  const tnPendenteTN = termos.filter(t => t.status === 'pendente_tn').length;
  const tnAguardandoAssinatura = termos.filter(t => t.status === 'aguardando_assinatura_prestador').length;
  const tnAguardandoResposta = termos.filter(t => t.status === 'aguardando_resposta').length;
  const tnPrazoVencido = termos.filter(t => t.status === 'prazo_vencido').length;
  const tnRespondido = termos.filter(t => t.status === 'respondido').length;

  const aiTotal = autos.length;
  const aiGerado = autos.filter(a => a.status === 'gerado').length;
  const aiEnviado = autos.filter(a => a.status === 'enviado').length;
  const aiEmAnalise = autos.filter(a => a.status === 'em_analise').length;
  const aiFinalizado = autos.filter(a => a.status === 'finalizado').length;

  return {
    tnTotal, tnPendenteTN, tnAguardandoAssinatura, tnAguardandoResposta, tnPrazoVencido, tnRespondido,
    aiTotal, aiGerado, aiEnviado, aiEmAnalise, aiFinalizado,
  };
}

export default function CatesaDashboard() {
  const { data: d, isLoading, isError, error } = useQuery({
    queryKey: ['catesa-dashboard'],
    queryFn: fetchCatesaData,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const val = (v) => isLoading ? '—' : String(v ?? 0);

  return (
    <CatesaLayout>
      <div className="bg-slate-50 min-h-full">
        <div className="px-4 sm:px-8 pb-12 pt-8">
          <div className="mx-auto max-w-7xl space-y-8">

            {/* Header */}
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500">
                Centro de acompanhamento regulatório — CATESA/DSB/AGEMS
              </p>
            </div>

            {isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Falha ao carregar: {String(error?.message ?? error)}
              </div>
            )}

            {/* Termos de Notificação */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Termos de Notificação
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <MetricCard
                  title="Total de TNs emitidos"
                  value={val(d?.tnTotal)}
                  icon={FileText}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-700"
                  to={createPageUrl('GerenciarTermos')}
                  badge="Total"
                />
                <MetricCard
                  title="Aguardando resposta"
                  value={val(d?.tnAguardandoResposta)}
                  icon={Clock}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-700"
                  to={createPageUrl('GerenciarTermos')}
                />
                <MetricCard
                  title="Prazo vencido"
                  value={val(d?.tnPrazoVencido)}
                  icon={TimerOff}
                  iconBg="bg-red-50"
                  iconColor="text-red-700"
                  to={createPageUrl('GerenciarTermos')}
                  alert={!!d?.tnPrazoVencido}
                />
                <MetricCard
                  title="Respondidos (AM pendente)"
                  value={val(d?.tnRespondido)}
                  icon={GitMerge}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-700"
                  to={createPageUrl('AnaliseManifestacao')}
                />
                <MetricCard
                  title="Pendente de emissão"
                  value={val((d?.tnPendenteTN ?? 0) + (d?.tnAguardandoAssinatura ?? 0))}
                  icon={AlertTriangle}
                  iconBg="bg-orange-50"
                  iconColor="text-orange-700"
                  to={createPageUrl('GerenciarTermos')}
                />
              </div>
            </section>

            {/* Autos de Infração */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Autos de Infração
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard
                  title="Total de AIs"
                  value={val(d?.aiTotal)}
                  icon={FileWarning}
                  iconBg="bg-orange-50"
                  iconColor="text-orange-700"
                  to={createPageUrl('GestaoAutos')}
                  badge="Total"
                />
                <MetricCard
                  title="Gerados (pendente remessa)"
                  value={val(d?.aiGerado)}
                  icon={AlertTriangle}
                  iconBg="bg-red-50"
                  iconColor="text-red-700"
                  to={createPageUrl('GestaoAutos')}
                  alert={!!d?.aiGerado}
                />
                <MetricCard
                  title="Enviados / Em análise"
                  value={val((d?.aiEnviado ?? 0) + (d?.aiEmAnalise ?? 0))}
                  icon={Clock}
                  iconBg="bg-blue-50"
                  iconColor="text-blue-700"
                  to={createPageUrl('GestaoAutos')}
                />
                <MetricCard
                  title="Finalizados"
                  value={val(d?.aiFinalizado)}
                  icon={CheckCircle2}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-700"
                  to={createPageUrl('GestaoAutos')}
                />
              </div>
            </section>

          </div>
        </div>
      </div>
    </CatesaLayout>
  );
}
