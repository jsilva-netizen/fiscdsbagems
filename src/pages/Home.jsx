import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useModulo } from '@/hooks/useModulo';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminShell from '@/components/layout/AdminShell';
import {
  Plus, ClipboardCheck, Clock, CheckCircle2, AlertTriangle,
  MapPin, Calendar, ChevronRight,
} from 'lucide-react';

const DTR_MODULOS = ['rodovias_dtr', 'transportes_dtr', 'fiscal_dtr'];

export default function Home() {
    const { user } = useAuth();
    const { isDSB, isDTR, isAdmin, camaraTecnica, tipoModulo, modulosFiltro } = useModulo();

    const nomeCompleto = user?.full_name || user?.user_metadata?.full_name || user?.email || '';
    const primeiroNome = nomeCompleto.split(' ')[0].split('@')[0];

    const { data: todasFiscalizacoes = [] } = useQuery({
        queryKey: ['home-fiscalizacoes'],
        queryFn: () => Repository.listFiscalizacoes(200),
    });

    // O total_constatacoes/total_ncs da própria fiscalização só é gravado na finalização
    // (RPC finalizar_fiscalizacao) e nem sempre reflete a realidade. A fonte confiável é
    // somar por unidade vistoriada, que é atualizada a cada vistoria (ver ExecutarFiscalizacao.jsx).
    const fiscalizacaoIds = todasFiscalizacoes.map((f) => f.id);
    const { data: totaisPorFiscalizacao = {} } = useQuery({
        queryKey: ['home-totais-fiscalizacao', fiscalizacaoIds.join(',')],
        queryFn: () => Repository.getTotaisPorFiscalizacao(fiscalizacaoIds),
        enabled: fiscalizacaoIds.length > 0,
    });

    // Admin vê tudo (modulosFiltro = []). Quem tem câmara técnica atribuída vê só as
    // fiscalizações daquela câmara; demais usuários (sem câmara específica) veem todos
    // os módulos da própria diretoria.
    const fiscalizacoesFiltro = (!isAdmin && camaraTecnica) ? [tipoModulo] : modulosFiltro;
    const fiscalizacoes = fiscalizacoesFiltro.length
        ? todasFiscalizacoes.filter((f) => fiscalizacoesFiltro.includes(f.tipo_modulo))
        : todasFiscalizacoes;

    const total = fiscalizacoes.length;
    const emAndamento = fiscalizacoes.filter((f) => f.status === 'em_andamento').length;
    const finalizadas = fiscalizacoes.filter((f) => f.status === 'finalizada').length;
    const ncs = fiscalizacoes.reduce((soma, f) => soma + (totaisPorFiscalizacao[f.id]?.total_ncs || 0), 0);
    const ultimas = fiscalizacoes.slice(0, 5);

    const listaPageDestino = isDSB ? 'Fiscalizacoes' : 'FiscalizacoesDTR';
    const novaFiscalizacaoDestino = isDSB ? 'NovaFiscalizacao' : isDTR ? 'NovaFiscalizacaoDTR' : null;

    const STATS = [
        { label: 'Total', desc: 'fiscalizações', value: total, icon: ClipboardCheck, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
        { label: 'Em andamento', desc: 'ativas', value: emAndamento, icon: Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
        { label: 'Finalizadas', desc: 'completas', value: finalizadas, icon: CheckCircle2, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
        { label: 'NCs', desc: 'registradas', value: ncs, icon: AlertTriangle, iconBg: 'bg-rose-50', iconColor: 'text-rose-600' },
    ];

    return (
        <AdminShell title="Início">
            <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

                {/* Cartão de boas-vindas */}
                <div className="bg-gradient-to-br from-[#0066B3] to-[#004A8F] rounded-2xl p-6 sm:p-7 text-white shadow-md">
                    <h1 className="text-xl sm:text-2xl font-bold">Bem-vindo(a) de volta, {primeiroNome}</h1>
                    <p className="text-blue-200 text-sm mt-1.5 max-w-xl">
                        Gerencie suas fiscalizações, registre não-conformidades e acompanhe os indicadores do SIFIS.
                    </p>
                    {novaFiscalizacaoDestino && (
                        <Link to={createPageUrl(novaFiscalizacaoDestino)} className="inline-block mt-4">
                            <span className="inline-flex items-center gap-2 bg-white text-[#0066B3] font-semibold text-sm rounded-xl px-4 py-2.5 shadow hover:bg-blue-50 transition-colors">
                                <Plus className="h-4 w-4" />
                                Nova Fiscalização
                            </span>
                        </Link>
                    )}
                </div>

                {/* Estatísticas */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {STATS.map((s) => (
                        <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5">
                            <div className="flex items-start justify-between">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
                                <div className={`w-9 h-9 ${s.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                                    <s.icon className={`h-4 w-4 ${s.iconColor}`} />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-900 mt-2">{s.value}</p>
                            <p className="text-xs text-gray-400">{s.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Últimas Fiscalizações */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-base font-bold text-gray-900">Últimas Fiscalizações</h2>
                        <Link to={createPageUrl(listaPageDestino)} className="text-sm font-semibold text-[#0066B3] hover:underline flex items-center gap-1">
                            Ver todas <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    {ultimas.length === 0 ? (
                        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-400">
                            <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-medium">Nenhuma fiscalização ainda</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {ultimas.map((fisc) => {
                                const isFinished = fisc.status === 'finalizada';
                                const isDtrFisc = DTR_MODULOS.includes(fisc.tipo_modulo);
                                const detalhePage = isDtrFisc ? 'ExecutarFiscalizacaoDTR' : 'ExecutarFiscalizacao';
                                const localLabel = isDtrFisc
                                    ? (fisc.rodovia || 'Rodovia indefinida')
                                    : (fisc.municipio_nome || 'Sem município');
                                const { total_constatacoes = 0, total_ncs = 0 } = totaisPorFiscalizacao[fisc.id] || {};
                                return (
                                    <Link
                                        key={fisc.id}
                                        to={createPageUrl(detalhePage) + `?id=${fisc.id}`}
                                        className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-gray-800 flex items-center gap-1.5 text-sm">
                                                    <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                    {localLabel}
                                                </h3>
                                                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${isFinished ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                                                    {isFinished ? 'Finalizada' : 'Em andamento'}
                                                </span>
                                                {fisc.servicos?.slice(0, 1).map((s) => (
                                                    <span key={s} className="text-[10px] font-semibold rounded-full px-2 py-0.5 bg-indigo-50 text-indigo-700">{s}</span>
                                                ))}
                                            </div>
                                            {fisc.data_inicio && (
                                                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {format(new Date(fisc.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 flex-shrink-0 text-right">
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{total_constatacoes}</p>
                                                <p className="text-[10px] text-gray-400">Constatações</p>
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${total_ncs > 0 ? 'text-rose-600' : 'text-gray-800'}`}>{total_ncs}</p>
                                                <p className="text-[10px] text-gray-400">NCs</p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-300" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AdminShell>
    );
}
