import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { runFullSync } from '@/lib/offline/syncEngine';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, MapPin, ChevronRight, Camera } from 'lucide-react';
import RodoviaMap from '@/components/fiscalizacao/RodoviaMap';

export default function ExecutarFiscalizacaoDTR() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const loc = useLocation();
    const searchParams = new URLSearchParams(loc.search);
    const fiscId = searchParams.get('id');

    const { data: fisc, isLoading: loadingFisc } = useQuery({
        queryKey: ['fiscalizacao', fiscId],
        queryFn: async () => await Repository.getFiscalizacaoById(fiscId),
        enabled: !!fiscId
    });

    const { data: ocorrencias = [], isLoading: loadingOcorrencias } = useQuery({
        queryKey: ['unidades', fiscId],
        queryFn: async () => await Repository.listUnidadesByFiscalizacao(fiscId),
        enabled: !!fiscId
    });

    const finalizarMutation = useMutation({
        mutationFn: async () => {
            await Repository.finalizarFiscalizacao(fiscId);
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });
            queryClient.invalidateQueries({ queryKey: ['fiscalizacao', fiscId] });
            runFullSync().catch(() => {});
            navigate(createPageUrl('FiscalizacoesDTR'));
        },
        onError: (err) => {
            alert(err.message || 'Falha ao finalizar vistoria.');
        }
    });

    if (loadingFisc) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-400 gap-3">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                <p className="text-sm">Carregando dados da fiscalização...</p>
            </div>
        );
    }

    if (!fisc) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-500 p-6 text-center">
                <p className="text-rose-500 font-bold mb-2">Erro</p>
                <p className="text-sm">Fiscalização não encontrada localmente.</p>
                <Link to={createPageUrl('FiscalizacoesDTR')} className="mt-4">
                    <Button variant="outline" className="border-gray-200 rounded-xl">Voltar para Listagem</Button>
                </Link>
            </div>
        );
    }

    const isFinalized = fisc.status === 'finalizada';

    return (
        /*
         * Layout de tela cheia dividida em dois painéis:
         *   ┌─────────────────────────────┐  ← h-[70dvh] rolável
         *   │  Header + botão + lista     │
         *   ├─────────────────────────────┤
         *   │  Mapa (fixo embaixo)        │  ← h-[30dvh]
         *   └─────────────────────────────┘
         */
        <div className="h-dvh flex flex-col bg-gray-50 text-gray-800 overflow-hidden">

            {/* ── PAINEL SUPERIOR (70% de cima, scrollável) ── */}
            <div className="flex flex-col overflow-y-auto" style={{ height: '70dvh' }}>

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md flex-shrink-0">
                    <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link to={createPageUrl('FiscalizacoesDTR')}>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-9 w-9">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-sm font-bold text-white">{fisc.rodovia}</h1>
                                <p className="text-[10px] text-indigo-200">{fisc.prestador_servico_nome}</p>
                            </div>
                        </div>

                        {!isFinalized && (
                            <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm h-10 px-4 rounded-lg"
                                disabled={finalizarMutation.isPending}
                                onClick={() => {
                                    if (confirm('Tem certeza que deseja finalizar esta vistoria? Não será possível adicionar mais ocorrências.')) {
                                        finalizarMutation.mutate();
                                    }
                                }}
                            >
                                {finalizarMutation.isPending ? 'Finalizando...' : 'Finalizar'}
                            </Button>
                        )}

                        {isFinalized && (
                            <Badge className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] py-0.5 px-2">
                                Finalizada
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Botão Registrar Imagem */}
                <div className="max-w-md w-full mx-auto px-4 pt-3 pb-2 flex-shrink-0">
                    {!isFinalized ? (
                        <Link to={createPageUrl('VistoriarOcorrenciaDTR') + `?fiscId=${fisc.id}`}>
                            <Button className="w-full h-14 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl flex items-center justify-center gap-3 shadow-md">
                                <Camera className="h-5 w-5" />
                                Registrar Imagem
                            </Button>
                        </Link>
                    ) : (
                        <div className="w-full h-14 flex items-center justify-center bg-gray-100 rounded-2xl border border-dashed border-gray-300">
                            <p className="text-sm text-gray-400">Vistoria finalizada</p>
                        </div>
                    )}
                </div>

                {/* Lista de Ocorrências */}
                <div className="max-w-md w-full mx-auto px-4 pb-4 flex flex-col gap-2 flex-1">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> Ocorrências ({ocorrencias.length})
                    </h2>

                    {loadingOcorrencias ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : ocorrencias.length === 0 ? (
                        <div className="text-center py-6 bg-gray-100 border border-dashed border-gray-300 rounded-2xl">
                            <MapPin className="h-6 w-6 text-gray-300 mx-auto mb-1" />
                            <p className="text-sm text-gray-500 font-semibold">Nenhum ponto registrado</p>
                            <p className="text-xs text-gray-400 mt-0.5">Use o botão acima para adicionar.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ocorrencias.map((oc, index) => (
                                <Link
                                    key={oc.id}
                                    to={createPageUrl('VistoriarOcorrenciaDTR') + `?fiscId=${fisc.id}&id=${oc.id}`}
                                    className="block active:scale-99 transition-all"
                                >
                                    <Card className="bg-white border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-all rounded-xl shadow-sm">
                                        <CardContent className="p-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                    #{index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-gray-800 text-sm truncate">
                                                            {oc.nome_unidade || oc.tipo_ocorrencia || 'Ponto de Inspeção'}
                                                        </h4>
                                                        {oc.tipo_ocorrencia === 'nc' && (
                                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex-shrink-0">NC</span>
                                                        )}
                                                        {oc.km_impreciso && (
                                                            <span
                                                                className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex-shrink-0"
                                                                title={oc.gps_accuracy_m ? `GPS ±${Math.round(oc.gps_accuracy_m)}m no momento do registro` : 'GPS impreciso no momento do registro'}
                                                            >
                                                                KM impreciso
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[11px]">KM {oc.km || '—'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── PAINEL INFERIOR — Mapa (fixo embaixo) ── */}
            <div className="flex-shrink-0 border-t border-gray-200" style={{ height: '30dvh' }}>
                <RodoviaMap
                    rodovia={fisc.rodovia}
                    fiscId={fisc.id}
                    ocorrencias={ocorrencias}
                />
            </div>
        </div>
    );
}
