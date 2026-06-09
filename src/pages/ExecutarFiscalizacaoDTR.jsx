import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from 'react-leaflet';
import { RODOVIAS_TRACKS, snapToHighway } from '@/utils/rodoviasGeoJSON';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Plus, CheckCircle, Navigation, MapPin, Map as MapIcon, ChevronRight } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix para ícone padrão do Leaflet no build
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function ExecutarFiscalizacaoDTR() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const loc = useLocation();
    const searchParams = new URLSearchParams(loc.search);
    const fiscId = searchParams.get('id');

    const [gpsPosition, setGpsPosition] = useState(null);
    const [snappedInfo, setSnappedInfo] = useState(null);
    const [watchId, setWatchId] = useState(null);

    // 1. Carregar fiscalização
    const { data: fisc, isLoading: loadingFisc } = useQuery({
        queryKey: ['fiscalizacao', fiscId],
        queryFn: async () => await Repository.getFiscalizacaoById(fiscId),
        enabled: !!fiscId
    });

    // 2. Carregar ocorrências (unidades)
    const { data: ocorrencias = [], isLoading: loadingOcorrencias } = useQuery({
        queryKey: ['unidades', fiscId],
        queryFn: async () => await Repository.listUnidadesByFiscalizacao(fiscId),
        enabled: !!fiscId
    });

    // 3. Finalizar vistoria
    const finalizarMutation = useMutation({
        mutationFn: async () => {
            await Repository.finalizarFiscalizacao(fiscId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });
            queryClient.invalidateQueries({ queryKey: ['fiscalizacao', fiscId] });
            alert('Vistoria finalizada com sucesso!');
        },
        onError: (err) => {
            alert(err.message || 'Falha ao finalizar vistoria.');
        }
    });

    // Monitorar GPS ativo
    useEffect(() => {
        if (!navigator.geolocation) return;

        const id = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setGpsPosition([lat, lng]);

                if (fisc?.rodovia) {
                    const snapped = snapToHighway(lat, lng, fisc.rodovia);
                    setSnappedInfo(snapped);
                }
            },
            (err) => console.warn('[GPS Watcher]', err),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
        );

        setWatchId(id);

        return () => {
            if (id !== null) navigator.geolocation.clearWatch(id);
        };
    }, [fisc?.rodovia]);

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
    const rodoviaTrack = RODOVIAS_TRACKS[fisc.rodovia];
    const mapCenter = gpsPosition || (rodoviaTrack ? [rodoviaTrack.coordinates[Math.floor(rodoviaTrack.coordinates.length / 2)][1], rodoviaTrack.coordinates[Math.floor(rodoviaTrack.coordinates.length / 2)][0]] : [-20.46, -54.62]);
    
    // Converter rota para coordenadas Leaflet [Lat, Lng]
    const polylineCoords = rodoviaTrack 
        ? rodoviaTrack.coordinates.map(c => [c[1], c[0]]) 
        : [];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col justify-between">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('FiscalizacoesDTR')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full h-9 w-9">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-sm font-bold text-white flex items-center gap-1">
                                <MapIcon className="h-4 w-4 text-indigo-300" /> {fisc.rodovia}
                            </h1>
                            <p className="text-[10px] text-indigo-200">{fisc.prestador_servico_nome}</p>
                        </div>
                    </div>

                    {!isFinalized && (
                        <Button 
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 rounded-lg"
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

            {/* Map Container */}
            <div className="h-64 md:h-80 w-full relative border-b border-gray-200 shadow-md">
                <MapContainer center={mapCenter} zoom={GPS_ZOOM_LEVEL(gpsPosition)} className="h-full w-full bg-gray-100 z-0">
                    <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Desenhar Rota da Rodovia */}
                    {polylineCoords.length > 0 && (
                        <Polyline 
                            positions={polylineCoords} 
                            color="#3b82f6" 
                            weight={5} 
                            opacity={0.8}
                        />
                    )}

                    {/* Marcador GPS do Fiscal */}
                    {gpsPosition && (
                        <CircleMarker 
                            center={gpsPosition} 
                            radius={8} 
                            fillColor="#10b981" 
                            color="#ffffff" 
                            weight={2} 
                            fillOpacity={0.9}
                        >
                            <Popup className="text-slate-950 text-xs">
                                <strong>Minha posição</strong>
                                <br />
                                {gpsPosition[0].toFixed(5)}, {gpsPosition[1].toFixed(5)}
                                {snappedInfo && (
                                    <>
                                        <br />
                                        <strong>KM:</strong> {snappedInfo.km} ({snappedInfo.trecho})
                                    </>
                                )}
                            </Popup>
                        </CircleMarker>
                    )}

                    {/* Marcadores de Ocorrências Gravadas */}
                    {ocorrencias.map(oc => {
                        if (oc.latitude && oc.longitude) {
                            return (
                                <CircleMarker
                                    key={oc.id}
                                    center={[oc.latitude, oc.longitude]}
                                    radius={6}
                                    fillColor="#ef4444"
                                    color="#ffffff"
                                    weight={1.5}
                                    fillOpacity={0.9}
                                >
                                    <Popup className="text-slate-950 text-xs">
                                        <strong>Ocorrência:</strong> {oc.tipo_ocorrencia || oc.nome_unidade}
                                        <br />
                                        <strong>KM:</strong> {oc.km || '—'}
                                    </Popup>
                                </CircleMarker>
                            );
                        }
                        return null;
                    })}
                </MapContainer>

                {/* GPS Snapped overlay panel */}
                {gpsPosition && snappedInfo && snappedInfo.km && (
                    <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur border border-gray-200 p-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs z-10 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <Navigation className="h-4 w-4 text-emerald-500 rotate-45" />
                            <div>
                                <p className="text-gray-500 text-[10px]">KM Atual Resolvido</p>
                                <p className="font-bold text-gray-800 text-sm">KM {snappedInfo.km}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-[10px]">Trecho</p>
                            <p className="font-semibold text-gray-700">{snappedInfo.trecho}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* List & Add panel */}
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold text-gray-700">Ocorrências Registradas ({ocorrencias.length})</h2>
                    
                    {!isFinalized && (
                        <Link to={createPageUrl('VistoriarOcorrenciaDTR') + `?fiscId=${fisc.id}`}>
                            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs rounded-lg">
                                <Plus className="h-3.5 w-3.5 mr-1" /> Ocorrência
                            </Button>
                        </Link>
                    )}
                </div>

                {/* list of occurrences */}
                <div className="space-y-2.5 flex-1">
                    {loadingOcorrencias ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : ocorrencias.length === 0 ? (
                        <div className="text-center py-10 bg-gray-100 border border-dashed border-gray-300 rounded-2xl">
                            <MapPin className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-semibold">Nenhum ponto registrado</p>
                            <p className="text-xs text-gray-400 mt-0.5">Use o botão acima para adicionar.</p>
                        </div>
                    ) : (
                        ocorrencias.map((oc, index) => (
                            <Link 
                                key={oc.id} 
                                to={createPageUrl('VistoriarOcorrenciaDTR') + `?fiscId=${fisc.id}&id=${oc.id}`}
                                className="block active:scale-99 transition-all"
                            >
                            <Card className="bg-white border border-gray-200 hover:shadow-md hover:border-indigo-200 transition-all rounded-xl shadow-sm">
                                    <CardContent className="p-3.5 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold text-xs">
                                                #{index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-800 text-sm">
                                                    {oc.tipo_ocorrencia || 'Ponto de Inspeção'}
                                                </h4>
                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-[11px]">KM {oc.km || '—'}</span>
                                                    <span className="opacity-60">•</span>
                                                    <span className="truncate max-w-[150px]">{oc.trecho || 'Trecho Geral'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-300" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="py-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
                AGEMS — Diretoria de Transportes Rodoviários
            </div>
        </div>
    );
}

function GPS_ZOOM_LEVEL(gps) {
    return gps ? 14 : 9;
}
